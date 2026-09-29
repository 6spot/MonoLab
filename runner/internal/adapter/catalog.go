package adapter

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
	"time"

	protocol "monos.local/protocol"
	"monos.local/runner/internal/host"
)

// OpenCode's fresh-cache startup may use its bundled catalog before the
// background refresh finishes. Its explicit refresh also swallows fetch errors,
// so neither exit zero nor "Models cache refreshed" establishes availability.
func verifyModel(d protocol.Dispatch, env []string, execute func(*exec.Cmd) error) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, host.Runtime, "models", "opencode", "--pure", "--refresh", "--verbose")
	cmd.Env = env
	cmd.Dir = host.Path(d.AttemptID, "scratch")
	cmd.WaitDelay = time.Second
	var output bytes.Buffer
	bounded := &BoundedWriter{W: &output, Remaining: 4 << 20}
	cmd.Stdout = bounded
	// Do not echo catalog/config diagnostics, which can include provider details.
	if err := execute(cmd); err != nil {
		return fmt.Errorf("OpenCode model catalog preflight failed")
	}
	if bounded.Truncated {
		return fmt.Errorf("OpenCode model catalog exceeds limit")
	}
	return validateCatalog(output.String())
}

type modelCost struct {
	Input  *float64 `json:"input"`
	Output *float64 `json:"output"`
	Cache  *struct {
		Read  *float64 `json:"read"`
		Write *float64 `json:"write"`
	} `json:"cache"`
	Tier     json.RawMessage `json:"tier"`
	Tiers    []*modelCost    `json:"tiers"`
	Over200K *modelCost      `json:"experimentalOver200K"`
}

func (c *modelCost) free() bool {
	zero := func(v *float64) bool { return v != nil && *v == 0 }
	if c == nil || !zero(c.Input) || !zero(c.Output) || c.Cache == nil || !zero(c.Cache.Read) || !zero(c.Cache.Write) {
		return false
	}
	for _, tier := range c.Tiers {
		if !tier.free() {
			return false
		}
	}
	return c.Over200K == nil || c.Over200K.free()
}

func validateCatalog(output string) error {
	// v1.18.30 verbose output is an unindented model ID followed by pretty JSON.
	// Match the whole header, never a substring in another model's metadata.
	marker := "\n" + host.FreeModel + "\n"
	output = "\n" + strings.ReplaceAll(output, "\r\n", "\n")
	if strings.Count(output, marker) != 1 {
		return fmt.Errorf("approved OpenCode model unavailable in Attempt catalog")
	}
	_, raw, _ := strings.Cut(output, marker)
	var model struct {
		ID           string `json:"id"`
		ProviderID   string `json:"providerID"`
		Status       string `json:"status"`
		Capabilities struct {
			Toolcall bool `json:"toolcall"`
		} `json:"capabilities"`
		Cost json.RawMessage `json:"cost"`
	}
	if err := json.NewDecoder(strings.NewReader(raw)).Decode(&model); err != nil {
		return fmt.Errorf("invalid OpenCode model catalog entry")
	}
	if model.ProviderID+"/"+model.ID != host.FreeModel || model.Status != "active" || !model.Capabilities.Toolcall {
		return fmt.Errorf("approved OpenCode model is not active and tool capable")
	}
	var cost *modelCost
	decoder := json.NewDecoder(bytes.NewReader(model.Cost))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&cost); err != nil || !cost.free() {
		return fmt.Errorf("approved OpenCode model does not have verified zero pricing")
	}
	return nil
}
