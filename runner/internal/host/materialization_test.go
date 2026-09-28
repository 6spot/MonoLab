package host

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	protocol "monolab.local/protocol"
)

func fixtureRepository(t *testing.T) (string, string) {
	t.Helper()
	root := t.TempDir()
	if _, err := git(root, "init"); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "file"), []byte("original"), 0640); err != nil {
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
	return root, base
}

func TestMaterializationReplayPreservesFirstBase(t *testing.T) {
	cache, base := fixtureRepository(t)
	root := t.TempDir()
	common, workspace := filepath.Join(root, "common"), filepath.Join(root, "workspace")
	for _, dir := range []string{common, workspace} {
		if err := os.Mkdir(dir, 0750); err != nil {
			t.Fatal(err)
		}
	}
	if err := materialize(workspace, common, cache); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(workspace, "file"), []byte("Agent work"), 0640); err != nil {
		t.Fatal(err)
	}
	if _, err := git(workspace, "commit", "-am", "Agent commit"); err != nil {
		t.Fatal(err)
	}
	head, err := git(workspace, "rev-parse", "HEAD")
	if err != nil {
		t.Fatal(err)
	}
	if err := materialize(workspace, common, cache); err != nil {
		t.Fatal(err)
	}
	record, err := readMaterialization(common)
	if err != nil || record.Base != base || record.Base == head {
		t.Fatalf("base replaced by Agent HEAD: %+v %v", record, err)
	}
	if _, err := finalize(workspace, common, "completion", base); err != nil {
		t.Fatal(err)
	}
	if err := os.Remove(materializationPath(common)); err != nil {
		t.Fatal(err)
	}
	if err := materialize(workspace, common, cache); err == nil {
		t.Fatal("adopted existing repository after base loss")
	}
	if _, err := os.Stat(materializationPath(common)); !os.IsNotExist(err) {
		t.Fatal("reconstructed missing ownership record")
	}
}

func TestFinalizationRejectsHistoryOutsideMaterializationBase(t *testing.T) {
	for _, scenario := range []string{"orphan-head", "head-before-base", "orphan-intent-parent"} {
		t.Run(scenario, func(t *testing.T) {
			root, original := fixtureRepository(t)
			base := original
			if _, err := git(root, "commit", "--allow-empty", "-m", "later"); err != nil {
				t.Fatal(err)
			}
			if scenario == "head-before-base" {
				var err error
				base, err = git(root, "rev-parse", "HEAD")
				if err != nil {
					t.Fatal(err)
				}
				if _, err = git(root, "reset", "--hard", original); err != nil {
					t.Fatal(err)
				}
			} else {
				tree, err := git(root, "rev-parse", "HEAD^{tree}")
				if err != nil {
					t.Fatal(err)
				}
				orphan, err := git(root, "commit-tree", tree, "-m", "unrelated")
				if err != nil {
					t.Fatal(err)
				}
				if scenario == "orphan-head" {
					if _, err = git(root, "update-ref", "HEAD", orphan); err != nil {
						t.Fatal(err)
					}
				} else {
					raw, err := json.Marshal(finalizationIntent{Base: base, Parent: orphan, Tree: tree, Date: "2026-09-28T00:00:00Z"})
					if err != nil {
						t.Fatal(err)
					}
					if err = os.WriteFile(filepath.Join(root, ".git", "monolab-finalization-op.json"), raw, 0600); err != nil {
						t.Fatal(err)
					}
				}
			}
			before, err := git(root, "rev-parse", "HEAD")
			if err != nil {
				t.Fatal(err)
			}
			if _, err = finalize(root, filepath.Join(root, ".git"), "op", base); err == nil || ClassifyFailure(err) != protocol.InvalidFinalization {
				t.Fatalf("wrong lineage result: %v", err)
			}
			after, err := git(root, "rev-parse", "HEAD")
			if err != nil || after != before {
				t.Fatal("changed rejected work")
			}
		})
	}
}

func TestMissingAncestorObjectRemainsRecoverable(t *testing.T) {
	root, base := fixtureRepository(t)
	if err := requireAncestor(root, strings.Repeat("a", 40), base); err == nil || ClassifyFailure(err) != protocol.Recoverable {
		t.Fatalf("missing object misclassified: %v", err)
	}
}
