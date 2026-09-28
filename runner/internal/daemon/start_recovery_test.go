package daemon

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	protocol "monolab.local/protocol"
	"monolab.local/runner/internal/control"
	"monolab.local/runner/internal/host"
	"monolab.local/runner/internal/journal"
)

func TestStopBeforeStartLoadsAuthorityAndRetainsResultForReconnect(t *testing.T) {
	for _, phase := range []string{"undelivered", "prepare-failed"} {
		t.Run(phase, func(t *testing.T) {
			db := testDB(t)
			op, inventory := revokedInventory()
			inventory.SnapshotID = strings.Repeat("a", 32)
			if phase == "prepare-failed" {
				initial := inventory.Dispatches[0]
				initial.MutationAllowed = true
				if err := db.SaveStart(journal.Start{Dispatch: initial, BootID: "boot", Phase: "intent"}); err != nil {
					t.Fatal(err)
				}
			}
			server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path != "/v1/runner/inventory" {
					t.Error("unexpected recovery path", r.URL.Path)
					w.WriteHeader(http.StatusNotFound)
					return
				}
				_ = json.NewEncoder(w).Encode(inventory)
			}))
			defer server.Close()
			tombstoned := false
			effects := 0
			supervisor := functionSupervisor(func(_ context.Context, request host.Request) (host.Status, error) {
				switch request.Action {
				case "status":
					return host.Status{Known: tombstoned, BootID: "boot"}, nil
				case "tombstone":
					intent, err := db.Start(op.AttemptID)
					if err != nil || intent.Phase != "cancel_intent" || request.Dispatch == nil || request.Dispatch.MutationAllowed {
						t.Error("physical revocation preceded durable intent or retained authority")
					}
					tombstoned = true
				case "effect":
					effects++
					if !tombstoned || request.Operation == nil || request.Operation.Kind != protocol.Stop {
						t.Error("Stop proceeded before physical revocation")
					}
				default:
					t.Error("unexpected helper action", request.Action)
				}
				return host.Status{Known: true, BootID: "boot"}, nil
			})
			d := Daemon{DB: db, Host: supervisor, Boot: "boot", Control: &control.Client{Config: control.Config{Endpoint: server.URL, RunnerID: "runner"}, HTTP: server.Client()}}
			// No WSS connection: the result must be durable before sending fails.
			_ = d.effect(context.Background(), op)
			result, err := db.Effect(op.OperationID)
			if err != nil || result == nil || !result.Success || result.Result.WriterAbsent == nil || !*result.Result.WriterAbsent || effects != 1 {
				t.Fatalf("Stop result not retained: %+v, effects=%d, error=%v", result, effects, err)
			}
			_ = d.effect(context.Background(), op)
			if effects != 1 {
				t.Fatal("lost Stop acknowledgement repeated the physical effect")
			}
			late := inventory.Dispatches[0]
			late.MutationAllowed = true
			if d.start(context.Background(), late) == nil {
				t.Fatal("revoked delayed Start accepted")
			}
		})
	}
}

func TestRetainedFailedUnitRecoversWithoutNeverLaunchedTombstone(t *testing.T) {
	db := testDB(t)
	op, inventory := revokedInventory()
	initial := inventory.Dispatches[0]
	initial.MutationAllowed = true
	if err := db.SaveStart(journal.Start{Dispatch: initial, BootID: "boot", Phase: "intent"}); err != nil {
		t.Fatal(err)
	}
	// systemd's failed exec/CHDIR unit is retained, with no PID or populated cgroup.
	supervisor := &fakeSupervisor{Status: host.Status{Known: true, Exists: true, BootID: "boot"}}
	d := Daemon{DB: db, Host: supervisor, Boot: "boot", Control: &control.Client{}}
	if err := d.Reconcile(context.Background(), inventory); err != nil {
		t.Fatal(err)
	}
	_ = d.effect(context.Background(), op)
	result, err := db.Effect(op.OperationID)
	if err != nil || result == nil || !result.Success || result.Result.WriterAbsent == nil || !*result.Result.WriterAbsent {
		t.Fatalf("failed unit's verified absence did not settle Stop: %+v %v", result, err)
	}
	start, err := db.Start(op.AttemptID)
	if err != nil || start.Phase != "absent" {
		t.Fatal("failed launch ownership was replaced or lost")
	}
	for _, call := range supervisor.Calls {
		if call.Action != "status" && call.Action != "effect" {
			t.Fatal("retained failed unit used new-launch/tombstone path", call.Action)
		}
	}
	events, err := db.PendingEvents()
	if err != nil || len(events) != 1 || events[0].Kind != protocol.ProcessAbsent {
		t.Fatal("failed launch emitted a false Started event or lost absence evidence")
	}
}
