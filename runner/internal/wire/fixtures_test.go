package wire

import (
	"encoding/json"
	"os"
	"testing"
)

func TestSharedSchemaFixtures(t *testing.T) {
	raw, err := os.ReadFile("../../../packages/protocol/fixtures/validation.json")
	if err != nil {
		t.Fatal(err)
	}
	var cases []struct {
		Name   string
		Schema string
		Valid  bool
		Value  json.RawMessage
	}
	if err = json.Unmarshal(raw, &cases); err != nil {
		t.Fatal(err)
	}
	for _, c := range cases {
		t.Run(c.Name, func(t *testing.T) {
			err := Validate(c.Schema, c.Value)
			if (err == nil) != c.Valid {
				t.Fatalf("valid=%v error=%v", c.Valid, err)
			}
		})
	}
}
func TestSharedCanonicalFixtures(t *testing.T) {
	raw, err := os.ReadFile("../../../packages/protocol/fixtures/canonicalization.json")
	if err != nil {
		t.Fatal(err)
	}
	var cases []struct {
		Name      string
		Input     any
		Canonical string
	}
	if err = json.Unmarshal(raw, &cases); err != nil {
		t.Fatal(err)
	}
	for _, c := range cases {
		t.Run(c.Name, func(t *testing.T) {
			raw, _, err := Canonical(c.Input)
			if err != nil || string(raw) != c.Canonical {
				t.Fatalf("got %s error=%v", raw, err)
			}
		})
	}
}
