package host

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	protocol "monos.local/protocol"
)

func TestFinalizationReplayPreservesExactCommit(t *testing.T) {
	root := t.TempDir()
	if _, err := git(root, "init"); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "file.txt"), []byte("before\n"), 0644); err != nil {
		t.Fatal(err)
	}
	if _, err := git(root, "add", "."); err != nil {
		t.Fatal(err)
	}
	if _, err := git(root, "commit", "-m", "base"); err != nil {
		t.Fatal(err)
	}
	base, err := git(root, "rev-parse", "HEAD")
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "file.txt"), []byte("after\n"), 0644); err != nil {
		t.Fatal(err)
	}
	one, err := finalize(root, filepath.Join(root, ".git"), "op-a", base)
	if err != nil {
		t.Fatal(err)
	}
	two, err := finalize(root, filepath.Join(root, ".git"), "op-a", base)
	if err != nil {
		t.Fatal(err)
	}
	if *one.GitCommit != *two.GitCommit || *one.GitTree != *two.GitTree {
		t.Fatal("retry changed finalization")
	}
	count, err := git(root, "rev-list", "--count", "HEAD")
	if err != nil || count != "2" {
		t.Fatalf("extra commit: %s %v", count, err)
	}
}

func TestInvalidRetainedFinalizationFailsBeforeGit(t *testing.T) {
	for _, value := range []string{`{`, `{}`, `{"parent":"--help","tree":"` + strings.Repeat("a", 40) + `","date":"2026-09-28T00:00:00Z"}`} {
		root := t.TempDir()
		if err := os.WriteFile(filepath.Join(root, "monos-finalization-op.json"), []byte(value), 0600); err != nil {
			t.Fatal(err)
		}
		if _, err := finalize("/does-not-exist", root, "op", strings.Repeat("a", 40)); err == nil || ClassifyFailure(err) != protocol.InvalidFinalization {
			t.Fatalf("invalid retained intent was not classified: %v", err)
		}
	}
}

func TestCrossOwnerTransportCloneOfFinalizedWorktree(t *testing.T) {
	root := t.TempDir()
	seed := filepath.Join(root, "seed")
	if err := os.Mkdir(seed, 0750); err != nil {
		t.Fatal(err)
	}
	if _, err := git(seed, "init"); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(seed, "file"), []byte("fixture"), 0640); err != nil {
		t.Fatal(err)
	}
	if _, err := git(seed, "add", "."); err != nil {
		t.Fatal(err)
	}
	if _, err := git(seed, "commit", "-m", "fixture"); err != nil {
		t.Fatal(err)
	}
	common, workspace, destination := filepath.Join(root, "common"), filepath.Join(root, "workspace"), filepath.Join(root, "result")
	if _, err := git(root, "clone", "--bare", "--no-local", seed, common); err != nil {
		t.Fatal(err)
	}
	if _, err := git(common, "worktree", "add", "--detach", workspace, "HEAD"); err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir(destination, 0700); err != nil {
		t.Fatal(err)
	}
	if _, err := gitEnv(destination, []string{"GIT_TEST_ASSUME_DIFFERENT_OWNER=1"}, exportCloneArgs(workspace, common, destination)...); err != nil {
		t.Fatal(err)
	}
	// Exercise upload-pack's administrative-directory entry point too. Older
	// Linux Git checks this path after resolving a linked worktree's .git file.
	metadata := filepath.Join(common, "worktrees", "workspace")
	metadataDestination := filepath.Join(root, "metadata-result")
	if err := os.Mkdir(metadataDestination, 0700); err != nil {
		t.Fatal(err)
	}
	args := exportCloneArgs(workspace, common, metadataDestination)
	args[len(args)-2] = metadata
	if _, err := gitEnv(metadataDestination, []string{"GIT_TEST_ASSUME_DIFFERENT_OWNER=1"}, args...); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(destination, "objects", "info", "alternates")); !os.IsNotExist(err) {
		t.Fatalf("clone must not share alternates: %v", err)
	}
}
