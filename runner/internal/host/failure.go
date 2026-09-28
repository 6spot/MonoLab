package host

import (
	"encoding/json"
	"errors"
	"io"
	"syscall"

	protocol "monolab.local/protocol"
)

// EffectError preserves a classified host failure across the helper boundary.
type EffectError struct {
	Kind  protocol.FailureKind
	Cause error
}

func (e *EffectError) Error() string { return e.Cause.Error() }
func (e *EffectError) Unwrap() error { return e.Cause }
func ClassifyFailure(err error) protocol.FailureKind {
	var effect *EffectError
	if errors.As(err, &effect) {
		return effect.Kind
	}
	return protocol.Recoverable
}
func captureFailure(err error) error {
	if errors.Is(err, syscall.ENOSPC) || errors.Is(err, syscall.EDQUOT) {
		return &EffectError{Kind: protocol.CaptureHardLimit, Cause: err}
	}
	return err
}
func invalidFinalization(err error) error {
	return &EffectError{Kind: protocol.InvalidFinalization, Cause: err}
}

// Both unprivileged workers and the root helper use this non-secret response.
// A well-formed error response exits successfully so its type is not lost in stderr.
func WriteStatus(w io.Writer, status Status, err error) error {
	if err != nil {
		kind := ClassifyFailure(err)
		status.Error, status.FailureKind = err.Error(), &kind
	}
	return json.NewEncoder(w).Encode(status)
}
func statusError(status Status) error {
	if status.Error == "" {
		return nil
	}
	kind := protocol.Recoverable
	if status.FailureKind != nil {
		switch *status.FailureKind {
		case protocol.Recoverable, protocol.CaptureHardLimit, protocol.InvalidFinalization:
			kind = *status.FailureKind
		}
	}
	return &EffectError{Kind: kind, Cause: errors.New(status.Error)}
}
