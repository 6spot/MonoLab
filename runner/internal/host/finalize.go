package host

import (
	"encoding/json"
	"errors"
	"fmt"
	protocol "monos.local/protocol"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"time"
)

type finalizationIntent struct {
	Base   string `json:"base"`
	Parent string `json:"parent"`
	Tree   string `json:"tree"`
	Date   string `json:"date"`
}

var objectID = regexp.MustCompile(`^(?:[a-f0-9]{40}|[a-f0-9]{64})$`)

func validateFinalizationIntent(intent finalizationIntent) error {
	_, dateErr := time.Parse(time.RFC3339, intent.Date)
	if !objectID.MatchString(intent.Base) || !objectID.MatchString(intent.Parent) || !objectID.MatchString(intent.Tree) || dateErr != nil {
		return invalidFinalization(fmt.Errorf("invalid retained finalization intent"))
	}
	return nil
}

func requireAncestor(workspace, base, head string) error {
	_, err := git(workspace, "merge-base", "--is-ancestor", base, head)
	if err == nil {
		return nil
	}
	var exit *exec.ExitError
	if errors.As(err, &exit) && exit.ExitCode() == 1 {
		return invalidFinalization(fmt.Errorf("HEAD/parent no longer descends from system materialization base"))
	}
	return err
}

// Persist all commit inputs before commit-tree. Retrying after any Git command
// creates the same object and ref; it cannot add an extra private commit.
func finalize(workspace, common, operation, base string) (protocol.EffectResult, error) {
	path := filepath.Join(common, "monos-finalization-"+operation+".json")
	var intent finalizationIntent
	raw, err := os.ReadFile(path)
	fresh := os.IsNotExist(err)
	if !fresh {
		if err != nil {
			return protocol.EffectResult{}, err
		}
		if err = json.Unmarshal(raw, &intent); err != nil {
			return protocol.EffectResult{}, invalidFinalization(fmt.Errorf("invalid retained finalization intent: %w", err))
		}
		if err = validateFinalizationIntent(intent); err != nil {
			return protocol.EffectResult{}, err
		}
		if intent.Base != base {
			return protocol.EffectResult{}, invalidFinalization(fmt.Errorf("retained intent changed materialization base"))
		}
	}
	if !objectID.MatchString(base) {
		return protocol.EffectResult{}, invalidFinalization(fmt.Errorf("invalid system materialization base"))
	}
	head, err := git(workspace, "rev-parse", "HEAD")
	if err != nil {
		return protocol.EffectResult{}, err
	}
	if err = requireAncestor(workspace, base, head); err != nil {
		return protocol.EffectResult{}, err
	}
	if !fresh {
		if err = requireAncestor(workspace, base, intent.Parent); err != nil {
			return protocol.EffectResult{}, err
		}
	}
	if fresh {
		intent.Base, intent.Parent = base, head
		if _, err = git(workspace, "add", "--all"); err != nil {
			return protocol.EffectResult{}, err
		}
		intent.Tree, err = git(workspace, "write-tree")
		if err != nil {
			return protocol.EffectResult{}, err
		}
		intent.Date = time.Now().UTC().Format(time.RFC3339)
		raw, err = json.Marshal(intent)
		if err != nil {
			return protocol.EffectResult{}, err
		}
		file, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0640)
		if err != nil {
			return protocol.EffectResult{}, captureFailure(err)
		}
		_, err = file.Write(raw)
		if err == nil {
			err = file.Sync()
		}
		closeErr := file.Close()
		if err != nil {
			return protocol.EffectResult{}, captureFailure(err)
		}
		if closeErr != nil {
			return protocol.EffectResult{}, captureFailure(closeErr)
		}
		dir, err := os.Open(common)
		if err != nil {
			return protocol.EffectResult{}, err
		}
		err = dir.Sync()
		dir.Close()
		if err != nil {
			return protocol.EffectResult{}, captureFailure(err)
		}
	}
	if err = validateFinalizationIntent(intent); err != nil {
		return protocol.EffectResult{}, err
	}
	commit, err := gitEnv(workspace, []string{"GIT_AUTHOR_DATE=" + intent.Date, "GIT_COMMITTER_DATE=" + intent.Date}, "commit-tree", intent.Tree, "-p", intent.Parent, "-m", "monos private probe finalization "+operation)
	if err != nil {
		return protocol.EffectResult{}, err
	}
	if _, err = git(workspace, "update-ref", "refs/monos/operations/"+operation, commit); err != nil {
		return protocol.EffectResult{}, err
	}
	head, err = git(workspace, "rev-parse", "HEAD")
	if err != nil {
		return protocol.EffectResult{}, err
	}
	if head != commit {
		if _, err = git(workspace, "update-ref", "HEAD", commit, intent.Parent); err != nil {
			return protocol.EffectResult{}, err
		}
	}
	absent := true
	return protocol.EffectResult{GitCommit: &commit, GitTree: &intent.Tree, WriterAbsent: &absent}, nil
}
