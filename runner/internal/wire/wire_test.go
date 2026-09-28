package wire

import (
	"testing"
)

func TestSchemaRejectsNullUnknownAndCrossCommandPayload(t *testing.T) {
	for _, raw := range []string{`{"schema_version":1,"request_id":"r","scope_id":"t","name":"open_workspace","expected_control_version":1,"payload":{"resource_id":null}}`, `{"schema_version":1,"request_id":"r","scope_id":"t","name":"open_workspace","expected_control_version":1,"payload":{"summary":"wrong"}}`, `{"schema_version":2,"request_id":"r","scope_id":"t","name":"complete_node","expected_control_version":1,"payload":{"summary":"x"}}`, `{"schema_version":1,"type":"ready","extra":1}`, `{"schema_version":1,"type":"start","incarnation":1}`} {
		name := "CommandEnvelope"
		if len(raw) > 0 && contains(raw, `"type"`) {
			name = "Frame"
		}
		if err := Validate(name, []byte(raw)); err == nil {
			t.Fatalf("accepted %s", raw)
		}
	}
}
func contains(s, sub string) bool {
	for n := 0; n+len(sub) <= len(s); n++ {
		if s[n:n+len(sub)] == sub {
			return true
		}
	}
	return false
}
func TestCanonicalRetainsExplicitEmptyArray(t *testing.T) {
	a, _, err := Canonical(map[string]any{"payload": map[string]any{"artifact_ids": []string{}, "summary": "😀"}, "z": 1, "a": 2})
	if err != nil {
		t.Fatal(err)
	}
	want := `{"a":2,"payload":{"artifact_ids":[],"summary":"😀"},"z":1}`
	if string(a) != want {
		t.Fatalf("got %s", a)
	}
}

func TestMalformedUnicodeIsRejectedBeforeReplacement(t *testing.T) {
	for _, raw := range [][]byte{[]byte(`{"summary":"\ud800"}`), []byte(`{"summary":"\udfff"}`), append([]byte(`{"summary":"`), append([]byte{0xff}, []byte(`"}`)...)...)} {
		if _, _, err := CanonicalRaw(raw); err == nil {
			t.Fatalf("malformed unicode accepted %q", raw)
		}
	}
	if _, _, err := CanonicalRaw([]byte(`{"summary":"\ud83d\ude00"}`)); err != nil {
		t.Fatal(err)
	}
}
