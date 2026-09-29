package host

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

type materialization struct {
	Base     string `json:"base"`
	Complete bool   `json:"complete"`
}

func materializationPath(common string) string {
	return filepath.Join(common, "monos-materialization.json")
}

func readMaterialization(common string) (materialization, error) {
	var record materialization
	raw, err := os.ReadFile(materializationPath(common))
	if err != nil {
		return record, err
	}
	if err = json.Unmarshal(raw, &record); err != nil {
		return record, err
	}
	if !record.Complete || !objectID.MatchString(record.Base) {
		return record, fmt.Errorf("incomplete materialization requires recovery")
	}
	return record, nil
}

func MaterializationBase(id string) (string, error) {
	if !ValidID(id) {
		return "", fmt.Errorf("invalid Attempt")
	}
	record, err := readMaterialization(Path(id, "common"))
	return record.Base, err
}

func materialize(workspace, common, cache string) error {
	if _, err := readMaterialization(common); err == nil {
		return nil
	} else if !os.IsNotExist(err) {
		return err
	}
	// Existing Git data without its retained base is recovery evidence, never
	// permission to adopt its current HEAD as a new trusted starting point.
	if _, err := os.Stat(filepath.Join(common, "HEAD")); err == nil {
		return fmt.Errorf("repository lacks retained materialization base")
	} else if !os.IsNotExist(err) {
		return err
	}
	if _, err := os.Lstat(filepath.Join(workspace, ".git")); err == nil {
		return fmt.Errorf("workspace predates materialization ownership")
	} else if !os.IsNotExist(err) {
		return err
	}
	if _, err := git(common, "clone", "--bare", "--no-local", cache, common); err != nil {
		return err
	}
	base, err := git(common, "rev-parse", "HEAD")
	if err != nil {
		return err
	}
	source, err := git(cache, "rev-parse", "HEAD")
	if err != nil {
		return err
	}
	if base != source || !objectID.MatchString(base) {
		return fmt.Errorf("source changed during materialization")
	}
	record := materialization{Base: base}
	if err = saveRecord(materializationPath(common), record); err != nil {
		return err
	}
	if _, err = git(common, "--git-dir="+common, "worktree", "add", "--detach", workspace, base); err != nil {
		return err
	}
	head, err := git(workspace, "rev-parse", "HEAD")
	if err != nil {
		return err
	}
	if head != base {
		return fmt.Errorf("materialized HEAD differs from retained base")
	}
	record.Complete = true
	return saveRecord(materializationPath(common), record)
}
