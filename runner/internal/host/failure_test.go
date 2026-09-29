package host

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"syscall"
	"testing"

	protocol "monos.local/protocol"
)

func TestEffectFailureSurvivesBothJSONBoundaries(t *testing.T) {
	for _, tc := range []struct {
		err  error
		kind protocol.FailureKind
	}{
		{captureFailure(&os.PathError{Op: "write", Path: "intent", Err: syscall.ENOSPC}), protocol.CaptureHardLimit},
		{captureFailure(fmt.Errorf("sync: %w", syscall.EDQUOT)), protocol.CaptureHardLimit},
		{invalidFinalization(errors.New("tree mismatch")), protocol.InvalidFinalization},
		{captureFailure(syscall.EACCES), protocol.Recoverable},
		{errors.New("generic git failure"), protocol.Recoverable},
	} {
		err := tc.err
		for range 2 {
			var response bytes.Buffer
			if e := WriteStatus(&response, Status{Known: true}, err); e != nil {
				t.Fatal(e)
			}
			var status Status
			if e := json.Unmarshal(response.Bytes(), &status); e != nil {
				t.Fatal(e)
			}
			err = statusError(status)
			if err == nil || ClassifyFailure(err) != tc.kind {
				t.Fatalf("failure type lost: %s %v", response.Bytes(), err)
			}
		}
	}
}
