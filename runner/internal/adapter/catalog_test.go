package adapter

import (
	"errors"
	"io"
	"os/exec"
	"reflect"
	"strings"
	"testing"

	protocol "monolab.local/protocol"
	"monolab.local/runner/internal/host"
)

const freeCost = `{"input":0,"output":0,"cache":{"read":0,"write":0}}`

func catalog(cost string) string {
	return "Models cache refreshed\n" + host.FreeModel + "\n" +
		`{"id":"longcat-2.5-preview-free","providerID":"opencode","status":"active","capabilities":{"toolcall":true},"cost":` + cost + "}\n"
}

func TestCatalogRequiresExactAvailableFreeToolModel(t *testing.T) {
	for name, output := range map[string]string{
		"valid":               catalog(freeCost),
		"tiers":               catalog(`{"input":0,"output":0,"cache":{"read":0,"write":0},"tiers":[{"input":0,"output":0,"cache":{"read":0,"write":0},"tier":{"type":"context","size":200000}}]}`),
		"other entry follows": catalog(freeCost) + "opencode/other\n{}\n",
	} {
		t.Run(name, func(t *testing.T) {
			if err := validateCatalog(output); err != nil {
				t.Fatal(err)
			}
		})
	}
	for name, output := range map[string]string{
		"refresh message only": "Models cache refreshed\n",
		"missing model":        "opencode/mimo-v2.5-free\n{}\n",
		"wrong metadata":       strings.Replace(catalog(freeCost), `"providerID":"opencode"`, `"providerID":"other"`, 1),
		"deprecated":           strings.Replace(catalog(freeCost), `"active"`, `"deprecated"`, 1),
		"no tools":             strings.Replace(catalog(freeCost), `"toolcall":true`, `"toolcall":false`, 1),
		"missing cost":         catalog(`{}`),
		"null cost":            catalog(`null`),
		"missing cache read":   catalog(`{"input":0,"output":0,"cache":{"write":0}}`),
		"null price":           catalog(`{"input":null,"output":0,"cache":{"read":0,"write":0}}`),
		"paid input":           catalog(strings.Replace(freeCost, `"input":0`, `"input":1`, 1)),
		"paid output":          catalog(strings.Replace(freeCost, `"output":0`, `"output":1`, 1)),
		"paid cache":           catalog(strings.Replace(freeCost, `"read":0`, `"read":1`, 1)),
		"unknown price":        catalog(`{"input":0,"output":0,"cache":{"read":0,"write":0},"new_fee":1}`),
		"paid tier":            catalog(`{"input":0,"output":0,"cache":{"read":0,"write":0},"tiers":[{"input":1,"output":0,"cache":{"read":0,"write":0}}]}`),
		"paid large context":   catalog(`{"input":0,"output":0,"cache":{"read":0,"write":0},"experimentalOver200K":{"input":1,"output":0,"cache":{"read":0,"write":0}}}`),
		"duplicate entry":      catalog(freeCost) + catalog(freeCost),
		"invalid JSON":         host.FreeModel + "\n{",
	} {
		t.Run(name, func(t *testing.T) {
			if err := validateCatalog(output); err == nil {
				t.Fatal("unverified model accepted")
			}
		})
	}
}

func TestCatalogPreflightRunsInActualAttemptContext(t *testing.T) {
	d := protocol.Dispatch{AttemptID: "catalog-test", Kind: protocol.Node, RuntimeID: protocol.Opencode, Model: host.FreeModel}
	var commands []*exec.Cmd
	err := run(d, func(cmd *exec.Cmd) error {
		commands = append(commands, cmd)
		if len(commands) == 1 {
			if !reflect.DeepEqual(cmd.Args[1:], []string{"models", "opencode", "--pure", "--refresh", "--verbose"}) {
				t.Fatal(cmd.Args)
			}
			_, err := io.WriteString(cmd.Stdout, catalog(freeCost))
			return err
		}
		return nil
	})
	if err != nil || len(commands) != 2 {
		t.Fatalf("commands=%d err=%v", len(commands), err)
	}
	if commands[0].Path != commands[1].Path || commands[0].Dir != commands[1].Dir || !reflect.DeepEqual(commands[0].Env, commands[1].Env) {
		t.Fatal("catalog verified outside actual runtime context")
	}
}

func TestFailedCatalogNeverRunsModel(t *testing.T) {
	d := protocol.Dispatch{AttemptID: "catalog-test", Kind: protocol.Node, RuntimeID: protocol.Opencode, Model: host.FreeModel}
	for _, failure := range []string{"unavailable", "command", "overflow"} {
		t.Run(failure, func(t *testing.T) {
			calls := 0
			err := run(d, func(cmd *exec.Cmd) error {
				calls++
				if calls != 1 {
					t.Fatal("model invoked after failed catalog verification")
				}
				if failure == "command" {
					return errors.New("private diagnostic must not escape")
				}
				output := "Models cache refreshed\n"
				if failure == "overflow" {
					output = catalog(freeCost) + strings.Repeat("x", (4<<20)+1)
				}
				_, err := io.WriteString(cmd.Stdout, output)
				return err
			})
			if calls != 1 || err == nil || strings.Contains(err.Error(), "private diagnostic") {
				t.Fatalf("calls=%d err=%v", calls, err)
			}
		})
	}
}
