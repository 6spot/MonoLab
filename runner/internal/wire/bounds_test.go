package wire

import (
	"encoding/json"
	protocol "monolab.local/protocol"
	"strings"
	"testing"
)

func TestUnicodeDispatchReservesEncodedFrameOverhead(t *testing.T) {
	d := protocol.Dispatch{AttemptID: "a", DispatchID: "d", RunnerID: "r", TaskID: "t", Kind: protocol.Node, ResourceID: "repo", RuntimeID: protocol.Opencode, Model: protocol.OpencodeMIMOV26FlashFree}
	base, err := json.Marshal(d)
	if err != nil {
		t.Fatal(err)
	}
	remaining := ItemLimit - len(base)
	d.Prompt = strings.Repeat("😀", remaining/4) + strings.Repeat("a", remaining%4)
	raw, err := json.Marshal(d)
	if err != nil || len(raw) != ItemLimit {
		t.Fatalf("fixture bytes %d %v", len(raw), err)
	}
	if err = Validate("Dispatch", raw); err != nil {
		t.Fatal(err)
	}
	d.Prompt += "a"
	raw, _ = json.Marshal(d)
	if err = Validate("Dispatch", raw); err == nil {
		t.Fatal("item accepted without framing margin")
	}
}
