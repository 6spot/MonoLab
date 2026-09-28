// Package host implements the task-confined privileged launch boundary.
package host

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"

	protocol "monolab.local/protocol"
)

const Root = "/var/lib/monolab-probe"
const Socket = "/run/monolab-probe/command.sock"
const Helper = "/usr/local/libexec/monolab-probe-launch"
const Worker = "/usr/local/libexec/monolab-probe-exec"
const CLI = "/usr/local/bin/monolab"
const Runtime = "/home/linuxbrew/.linuxbrew/bin/opencode"
const FreeModel = "opencode/mimo-v2.6-flash-free"

var idPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{1,128}$`)

func ValidID(id string) bool       { return idPattern.MatchString(id) }
func Unit(id string) string        { return "monolab-probe-a-" + id + ".service" }
func AttemptRoot(id string) string { return filepath.Join(Root, "execution", id) }
func Path(id, name string) string  { return filepath.Join(AttemptRoot(id), name) }

type Request struct {
	Action    string              `json:"action"`
	AttemptID string              `json:"attempt_id"`
	Dispatch  *protocol.Dispatch  `json:"dispatch,omitempty"`
	Operation *protocol.Operation `json:"operation,omitempty"`
}
type Status struct {
	Known               bool                   `json:"known"`
	Exists              bool                   `json:"exists"`
	Populated           bool                   `json:"populated"`
	BootID              string                 `json:"boot_id"`
	PID                 int                    `json:"pid"`
	Birth               string                 `json:"birth"`
	Cgroup              string                 `json:"cgroup"`
	Error               string                 `json:"error,omitempty"`
	FailureKind         *protocol.FailureKind  `json:"failure_kind,omitempty"`
	Result              *protocol.EffectResult `json:"result,omitempty"`
	MaterializationBase *string                `json:"materialization_base,omitempty"`
}
type Supervisor interface {
	Call(context.Context, Request) (Status, error)
}
type Client struct{}

func (Client) Call(ctx context.Context, r Request) (Status, error) {
	raw, err := json.Marshal(r)
	if err != nil {
		return Status{}, err
	}
	cmd := exec.CommandContext(ctx, "/usr/bin/sudo", "-n", Helper)
	cmd.Stdin = bytes.NewReader(raw)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	out, err := cmd.Output()
	if err != nil {
		return Status{}, fmt.Errorf("constrained helper failed: %s", strings.TrimSpace(stderr.String()))
	}
	var status Status
	if err = json.Unmarshal(out, &status); err != nil {
		return status, err
	}
	if status.Error != "" {
		return status, statusError(status)
	}
	return status, nil
}
