package adapter

import (
	"bytes"
	"encoding/json"
	protocol "monos.local/protocol"
	"monos.local/runner/internal/host"
	"strings"
	"testing"
)

func TestLogTruncationIsVisibleExactlyOnce(t *testing.T) {
	for _, chunks := range [][]string{{"abcd", "ef", "gh"}, {"abcdef", "gh"}} {
		var output bytes.Buffer
		writer := BoundedWriter{W: &output, Remaining: 4}
		for _, chunk := range chunks {
			if n, err := writer.Write([]byte(chunk)); n != len(chunk) || err != nil {
				t.Fatalf("write: %d %v", n, err)
			}
		}
		if output.String() != "abcd"+TruncationMarker || !writer.Truncated {
			t.Fatalf("missing/duplicate truncation: %q", output.String())
		}
	}
	var exact bytes.Buffer
	writer := BoundedWriter{W: &exact, Remaining: 4}
	if _, err := writer.Write([]byte("abcd")); err != nil {
		t.Fatal(err)
	}
	if writer.Truncated || exact.String() != "abcd" {
		t.Fatal("reported truncation without dropped bytes")
	}
}

func TestOnlyExplicitFreeModelsAndUnrestrictedShell(t *testing.T) {
	cfg, err := Config(protocol.Dispatch{Kind: protocol.Node, AttemptID: "a"})
	if err != nil {
		t.Fatal(err)
	}
	var v map[string]any
	if err = json.Unmarshal([]byte(cfg), &v); err != nil {
		t.Fatal(err)
	}
	if v["model"] != host.FreeModel || v["small_model"] != host.FreeModel {
		t.Fatal("model drift")
	}
	agents := v["agent"].(map[string]any)
	for _, name := range []string{"monos-probe", "title", "summary", "compaction"} {
		if agents[name].(map[string]any)["model"] != host.FreeModel {
			t.Fatal(name)
		}
	}
	if !strings.Contains(cfg, `"bash":"allow"`) || !strings.Contains(cfg, `"external_directory":"allow"`) {
		t.Fatal("shell/path restriction introduced")
	}
	args := strings.Join(Arguments(protocol.Dispatch{AttemptID: "a"}), " ")
	if !strings.Contains(args, "--auto") || !strings.Contains(args, "--model "+host.FreeModel) {
		t.Fatal("unattended/free model invocation missing")
	}
	planner, err := Config(protocol.Dispatch{Kind: protocol.Planner, AttemptID: "p"})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(planner, `"edit":"deny"`) || !strings.Contains(planner, `"bash":"allow"`) {
		t.Fatal("Planner must retain shell while edit tool is denied")
	}
}
