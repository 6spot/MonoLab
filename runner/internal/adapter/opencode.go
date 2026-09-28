package adapter

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	protocol "monolab.local/protocol"
	"monolab.local/runner/internal/host"
)

// Policy order is significant to OpenCode; this struct keeps '*' first.
type permissions struct {
	All       string          `json:"*"`
	Read      string          `json:"read"`
	Glob      string          `json:"glob"`
	Grep      string          `json:"grep"`
	Bash      string          `json:"bash"`
	Edit      string          `json:"edit"`
	External  json.RawMessage `json:"external_directory"`
	Question  string          `json:"question"`
	Task      string          `json:"task"`
	Skill     string          `json:"skill"`
	LSP       string          `json:"lsp"`
	Webfetch  string          `json:"webfetch"`
	Websearch string          `json:"websearch"`
	PlanEnter string          `json:"plan_enter"`
	PlanExit  string          `json:"plan_exit"`
}

func Config(d protocol.Dispatch) (string, error) {
	edit := "deny"
	if d.Kind == protocol.Node {
		edit = "allow"
	}
	external := `"allow"`
	// Only interactive questions, unreviewed skill/subagent delegation and role
	// switching are excluded from this single-runtime, explicitly free probe.
	perms := permissions{"allow", "allow", "allow", "allow", "allow", edit, json.RawMessage(external), "deny", "deny", "deny", "allow", "allow", "allow", "deny", "deny"}
	fixed := map[string]any{"model": host.FreeModel}
	cfg := map[string]any{"model": host.FreeModel, "small_model": host.FreeModel, "share": "disabled", "snapshot": false, "autoupdate": false, "shell": "/bin/bash", "agent": map[string]any{
		"monolab-probe": map[string]any{"mode": "primary", "model": host.FreeModel, "permission": perms, "prompt": "Use native bash to invoke /usr/local/bin/monolab for formal MonoLab actions. Run monolab --help to discover commands. Natural-language output is never a formal state transition. Do not start background services or subagents."}, "title": fixed, "summary": fixed, "compaction": fixed}}
	raw, err := json.Marshal(cfg)
	return string(raw), err
}
func Environment(d protocol.Dispatch) ([]string, error) {
	config, err := Config(d)
	if err != nil {
		return nil, err
	}
	base := host.AttemptRoot(d.AttemptID)
	return []string{"HOME=/home/me", "PWD=" + host.Path(d.AttemptID, "scratch"), "USER=me", "LOGNAME=me", "PATH=/usr/local/bin:/home/linuxbrew/.linuxbrew/bin:/usr/bin:/bin", "LANG=C.UTF-8", "SHELL=/bin/bash", "TMPDIR=" + filepath.Join(base, "tmp"), "XDG_DATA_HOME=" + filepath.Join(base, "data"), "XDG_CACHE_HOME=" + filepath.Join(base, "cache"), "XDG_CONFIG_HOME=" + filepath.Join(base, "config"), "XDG_STATE_HOME=" + filepath.Join(base, "state"), "MONOLAB_SOCKET=" + host.Socket, "OPENCODE_CONFIG_CONTENT=" + config, "OPENCODE_DISABLE_PROJECT_CONFIG=1", "OPENCODE_DISABLE_AUTOUPDATE=1", "OPENCODE_DISABLE_LSP_DOWNLOAD=1", "OPENCODE_DISABLE_EXTERNAL_SKILLS=1", "OPENCODE_DISABLE_CLAUDE_CODE=1"}, nil
}

// BoundedWriter preserves partial output but bounds retained logs per Attempt.
type BoundedWriter struct {
	W         io.Writer
	Remaining int64
	Truncated bool
}

const TruncationMarker = "\n[MonoLab log truncated: retention limit reached]\n"

func (w *BoundedWriter) truncate() error {
	if w.Truncated {
		return nil
	}
	w.Truncated = true
	n, err := io.WriteString(w.W, TruncationMarker)
	if err == nil && n != len(TruncationMarker) {
		err = io.ErrShortWrite
	}
	return err
}

func (w *BoundedWriter) Write(p []byte) (int, error) {
	n := len(p)
	if n == 0 {
		return 0, nil
	}
	if w.Remaining <= 0 {
		return n, w.truncate()
	}
	slice := p
	if int64(len(slice)) > w.Remaining {
		slice = slice[:w.Remaining]
	}
	written, err := w.W.Write(slice)
	w.Remaining -= int64(written)
	if err != nil {
		return written, err
	}
	if written != len(slice) {
		return written, io.ErrShortWrite
	}
	if written < n {
		if err := w.truncate(); err != nil {
			return written, err
		}
	}
	return n, nil
}
func Run(d protocol.Dispatch) error {
	return run(d, func(cmd *exec.Cmd) error { return cmd.Run() })
}

func run(d protocol.Dispatch, execute func(*exec.Cmd) error) error {
	if d.RuntimeID != protocol.Opencode || string(d.Model) != host.FreeModel {
		return fmt.Errorf("unapproved runtime/model")
	}
	env, err := Environment(d)
	if err != nil {
		return err
	}
	if err = verifyModel(d, env, execute); err != nil {
		return err
	}
	cmd := exec.Command(host.Runtime, Arguments(d)...)
	cmd.Env = env
	cmd.Dir = host.Path(d.AttemptID, "scratch")
	cmd.Stdin = strings.NewReader(d.Prompt)
	cmd.Stdout = &BoundedWriter{W: os.Stdout, Remaining: 4 << 20}
	cmd.Stderr = &BoundedWriter{W: os.Stderr, Remaining: 1 << 20}
	return execute(cmd)
}

func Arguments(d protocol.Dispatch) []string {
	return []string{"run", "--pure", "--auto", "--format", "json", "--model", host.FreeModel, "--agent", "monolab-probe", "--dir", host.Path(d.AttemptID, "scratch")}
}
