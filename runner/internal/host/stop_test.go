package host

import (
	"context"
	"errors"
	"reflect"
	"testing"
	"testing/synctest"
	"time"
)

func TestStopReconcilesFrozenUnitAfterKill(t *testing.T) {
	// Real systemd 257 evidence: SIGKILL completed, but StopUnit still rejected
	// the frozen unit. Unit control errors cannot replace fresh writer evidence.
	reads := 0
	inspect := func(context.Context, string) (Status, error) {
		reads++
		return Status{Known: true, Exists: true, Populated: reads == 1, BootID: "boot"}, nil
	}
	var calls [][]string
	run := func(_ context.Context, path string, args ...string) ([]byte, error) {
		calls = append(calls, append([]string{path}, args...))
		if args[0] == "thaw" || args[0] == "stop" {
			return nil, errors.New("Cannot stop frozen unit")
		}
		return nil, nil
	}
	s, err := stopWith(context.Background(), "node-03", inspect, run)
	if err != nil || !s.Known || s.Populated || reads != 2 {
		t.Fatalf("did not reconcile killed tree: %+v, %v, reads=%d", s, err, reads)
	}
	want := [][]string{
		{"/usr/bin/systemctl", "freeze", Unit("node-03")},
		{"/usr/bin/systemctl", "kill", "--kill-whom=all", "--signal=KILL", Unit("node-03")},
		{"/usr/bin/systemctl", "thaw", Unit("node-03")},
		{"/usr/bin/systemctl", "stop", Unit("node-03")},
	}
	if !reflect.DeepEqual(calls, want) {
		t.Fatalf("changed whole-tree stop commands: got %v, want %v", calls, want)
	}
}

func TestStopWaitsForDescendantsAndConsistentStatus(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		reads := 0
		inspect := func(context.Context, string) (Status, error) {
			reads++
			switch reads {
			case 1, 2:
				// MainPID is already gone, but background writers remain.
				return Status{Known: true, Populated: true}, nil
			case 3:
				// A racing process identity read is not a successful empty inventory.
				return Status{Known: true}, errors.New("process disappeared during identity read")
			default:
				return Status{Known: true}, nil
			}
		}
		run := func(_ context.Context, _ string, args ...string) ([]byte, error) {
			if args[0] == "stop" {
				return nil, errors.New("Cannot stop frozen unit")
			}
			return nil, nil
		}
		s, err := stopWith(context.Background(), "node", inspect, run)
		if err != nil || !s.Known || s.Populated || reads != 4 {
			t.Fatalf("did not wait for verified descendant absence: %+v %v reads=%d", s, err, reads)
		}
	})
}

func TestStopHoldsUnresolvedOwnershipAndPreservesErrors(t *testing.T) {
	inventoryErr := errors.New("unit ownership mismatch")
	for _, tc := range []struct {
		name       string
		failAction string
		status     Status
		inspectErr error
	}{
		{"frozen stop with live descendants", "stop", Status{Known: true, Populated: true}, nil},
		{"thaw with live descendants", "thaw", Status{Known: true, Populated: true}, nil},
		{"freeze with live descendants", "freeze", Status{Known: true, Populated: true}, nil},
		{"kill with live descendants", "kill", Status{Known: true, Populated: true}, nil},
		{"successful commands with live descendants", "", Status{Known: true, Populated: true}, nil},
		{"missing ownership", "stop", Status{}, nil},
		{"unverified empty status", "stop", Status{Known: true}, inventoryErr},
	} {
		t.Run(tc.name, func(t *testing.T) {
			synctest.Test(t, func(t *testing.T) {
				controlErr := errors.New("systemctl control failed")
				reads := 0
				inspect := func(context.Context, string) (Status, error) {
					reads++
					if reads == 1 {
						return Status{Known: true, Populated: true}, nil
					}
					return tc.status, tc.inspectErr
				}
				run := func(_ context.Context, _ string, args ...string) ([]byte, error) {
					if args[0] == tc.failAction {
						return nil, controlErr
					}
					return nil, nil
				}
				started := time.Now()
				_, err := stopWith(context.Background(), "node", inspect, run)
				if !errors.Is(err, context.DeadlineExceeded) || reads < 2 || time.Since(started) != 2*time.Second {
					t.Fatalf("unresolved stop not bounded: %v, reads=%d, elapsed=%s", err, reads, time.Since(started))
				}
				if tc.failAction != "" && !errors.Is(err, controlErr) {
					t.Fatalf("lost control error: %v", err)
				}
				if tc.inspectErr != nil && !errors.Is(err, tc.inspectErr) {
					t.Fatalf("lost inventory error: %v", err)
				}
			})
		})
	}
}

func TestStopReconcilesExitRacingFreezeOrKill(t *testing.T) {
	for _, failAction := range []string{"freeze", "kill"} {
		t.Run(failAction, func(t *testing.T) {
			reads := 0
			inspect := func(context.Context, string) (Status, error) {
				reads++
				return Status{Known: true, Populated: reads == 1}, nil
			}
			var actions []string
			run := func(_ context.Context, _ string, args ...string) ([]byte, error) {
				actions = append(actions, args[0])
				if args[0] == failAction {
					return nil, errors.New("unit already exited")
				}
				return nil, nil
			}
			s, err := stopWith(context.Background(), "node", inspect, run)
			if err != nil || !s.Known || s.Populated || reads != 2 || actions[len(actions)-1] != failAction {
				t.Fatalf("failed to reconcile racing exit: %+v %v reads=%d actions=%v", s, err, reads, actions)
			}
		})
	}
}

func TestStopRequiresKnownOwnershipBeforeControl(t *testing.T) {
	for _, known := range []bool{false, true} {
		inspect := func(context.Context, string) (Status, error) {
			return Status{Known: known}, nil
		}
		run := func(context.Context, string, ...string) ([]byte, error) {
			t.Fatal("controlled an unknown or already empty unit")
			return nil, nil
		}
		_, err := stopWith(context.Background(), "node", inspect, run)
		if (err == nil) != known {
			t.Fatalf("unknown ownership treated as absence: known=%v err=%v", known, err)
		}
	}
}

func TestStopReconciliationHonorsCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	controlErr := errors.New("Cannot stop frozen unit")
	reads := 0
	inspect := func(context.Context, string) (Status, error) {
		reads++
		if reads == 2 {
			cancel()
		}
		return Status{Known: true, Populated: true}, nil
	}
	run := func(_ context.Context, _ string, args ...string) ([]byte, error) {
		if args[0] == "stop" {
			return nil, controlErr
		}
		return nil, nil
	}
	_, err := stopWith(ctx, "node", inspect, run)
	if !errors.Is(err, context.Canceled) || !errors.Is(err, controlErr) || reads != 2 {
		t.Fatalf("lost cancellation or unresolved error: %v reads=%d", err, reads)
	}
}
