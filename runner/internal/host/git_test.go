package host

import (
	"os"
	"path/filepath"
	"testing"
)

func TestScopedGitConfigIsPrivateAndPreservesExactPaths(t *testing.T) {
	root := t.TempDir()
	scope := filepath.Join(root, "path with spaces and \"quotes\"")
	config, err := scopedGitConfig([]string{scope})
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(config)
	info, err := os.Stat(config)
	if err != nil || info.Mode().Perm() != 0600 {
		t.Fatalf("config is not private: %v %v", info, err)
	}
	actual, err := git(root, "config", "--file", config, "--get-all", "safe.directory")
	if err != nil || actual != scope {
		t.Fatalf("scope changed: %q %v", actual, err)
	}
	for _, invalid := range []string{"*", root + "/*", "relative/path", root + "\n[unsafe]"} {
		if path, err := scopedGitConfig([]string{invalid}); err == nil {
			os.Remove(path)
			t.Fatalf("accepted unsafe scope %q", invalid)
		}
	}
}
