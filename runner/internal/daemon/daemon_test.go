package daemon

import (
	"context"
	"errors"
	protocol "monolab.local/protocol"
	"monolab.local/runner/internal/control"
	"monolab.local/runner/internal/host"
	"monolab.local/runner/internal/journal"
	"os"
	"path/filepath"
	"testing"
)

type fakeSupervisor struct {
	Status host.Status
	Err    error
	Calls  []host.Request
}

func TestOnlyTypedCaptureFailureIsBlocking(t *testing.T) {
	for _, test := range []struct {
		name string
		err  error
		kind protocol.FailureKind
	}{{"transient", errors.New("permission or IO needs repair"), protocol.Recoverable}, {"capture", &host.EffectError{Kind: protocol.CaptureHardLimit, Cause: errors.New("storage limit")}, protocol.CaptureHardLimit}, {"invalid-result", &host.EffectError{Kind: protocol.InvalidFinalization, Cause: errors.New("recorded identity mismatch")}, protocol.InvalidFinalization}} {
		t.Run(test.name, func(t *testing.T) {
			db := testDB(t)
			dispatch := protocol.Dispatch{AttemptID: "a", DispatchID: "d"}
			if err := db.SaveStart(journal.Start{Dispatch: dispatch, Phase: "running"}); err != nil {
				t.Fatal(err)
			}
			daemon := Daemon{DB: db, Host: &fakeSupervisor{Err: test.err}, Control: &control.Client{}}
			_ = daemon.effect(context.Background(), protocol.Operation{SchemaVersion: 1, OperationID: "o", AttemptID: "a", DispatchID: "d", RequestID: "r", Kind: protocol.KindCompleteNode, ResourceID: "repo", State: protocol.StateAdmitted})
			result, err := db.Effect("o")
			if err != nil || result == nil || result.Success || result.FailureKind == nil || *result.FailureKind != test.kind {
				t.Fatalf("classification %+v %v", result, err)
			}
			start, _ := db.Start("a")
			if start.Phase != "running" {
				t.Fatal("failure released unresolved ownership")
			}
		})
	}
}

func (f *fakeSupervisor) Call(_ context.Context, r host.Request) (host.Status, error) {
	f.Calls = append(f.Calls, r)
	return f.Status, f.Err
}
func testDB(t *testing.T) *journal.DB {
	t.Helper()
	dir := t.TempDir()
	os.Chmod(dir, 0700)
	db, err := journal.Open(filepath.Join(dir, "journal.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}
func TestDuplicateStartNeverSpawnsAgain(t *testing.T) {
	db := testDB(t)
	dispatch := protocol.Dispatch{AttemptID: "a", DispatchID: "d"}
	if err := db.SaveStart(journal.Start{Dispatch: dispatch, Phase: "running", BootID: "boot", Cgroup: "/system.slice/monolab-probe-a-a.service"}); err != nil {
		t.Fatal(err)
	}
	supervisor := &fakeSupervisor{}
	daemon := Daemon{DB: db, Host: supervisor, Control: &control.Client{}, Boot: "boot"}
	_ = daemon.start(context.Background(), dispatch)
	if len(supervisor.Calls) != 0 {
		t.Fatal("duplicate spawn")
	}
	events, err := db.PendingEvents()
	if err != nil || len(events) != 1 || events[0].Kind != protocol.Started {
		t.Fatal("lost acknowledgement not retained")
	}
}
func TestReconcileBootChangeDoesNotReviveOldOwnership(t *testing.T) {
	db := testDB(t)
	dispatch := protocol.Dispatch{AttemptID: "a", DispatchID: "d", MutationAllowed: true}
	if err := db.SaveStart(journal.Start{Dispatch: dispatch, Phase: "running", BootID: "old", Cgroup: "/system.slice/monolab-probe-a-a.service"}); err != nil {
		t.Fatal(err)
	}
	supervisor := &fakeSupervisor{Status: host.Status{Known: true, BootID: "new", Populated: false}}
	daemon := Daemon{DB: db, Host: supervisor, Boot: "new"}
	if err := daemon.Reconcile(context.Background(), protocol.RunnerInventory{Dispatches: []protocol.Dispatch{dispatch}}); err != nil {
		t.Fatal(err)
	}
	s, err := db.Start("a")
	if err != nil || s.Phase != "absent" {
		t.Fatal("old ownership revived")
	}
	events, err := db.PendingEvents()
	if err != nil || len(events) != 1 || events[0].Kind != protocol.ProcessAbsent {
		t.Fatal("reconciled absence not queued before ready")
	}
}
func TestUnmatchedLiveOwnershipBlocksReady(t *testing.T) {
	db := testDB(t)
	if err := db.SaveStart(journal.Start{Dispatch: protocol.Dispatch{AttemptID: "a", DispatchID: "d"}, Phase: "running", BootID: "boot"}); err != nil {
		t.Fatal(err)
	}
	daemon := Daemon{DB: db, Host: &fakeSupervisor{Status: host.Status{Known: true, BootID: "boot", Populated: true, Cgroup: "/system.slice/monolab-probe-a-a.service"}}}
	if err := daemon.Reconcile(context.Background(), protocol.RunnerInventory{}); err == nil {
		t.Fatal("unknown live writer released")
	}
	s, _ := db.Start("a")
	if s.Phase != "running" {
		t.Fatal("uncertain claim released")
	}
}

func TestReusedPIDCannotReviveOwnership(t *testing.T) {
	db := testDB(t)
	dispatch := protocol.Dispatch{AttemptID: "a", DispatchID: "d", MutationAllowed: true}
	s := journal.Start{Dispatch: dispatch, BootID: "boot", PID: 42, Birth: "old", Cgroup: "/system.slice/monolab-probe-a-a.service", Phase: "running"}
	if err := db.SaveStart(s); err != nil {
		t.Fatal(err)
	}
	daemon := Daemon{DB: db, Host: &fakeSupervisor{Status: host.Status{Known: true, BootID: "boot", PID: 42, Birth: "new", Cgroup: s.Cgroup, Populated: true}}}
	if err := daemon.Reconcile(context.Background(), protocol.RunnerInventory{Dispatches: []protocol.Dispatch{dispatch}}); err == nil {
		t.Fatal("PID reuse accepted")
	}
}

func TestMissingManifestDoesNotReleaseClaim(t *testing.T) {
	db := testDB(t)
	dispatch := protocol.Dispatch{AttemptID: "a", DispatchID: "d", MutationAllowed: true}
	if err := db.SaveStart(journal.Start{Dispatch: dispatch, Phase: "running", BootID: "boot"}); err != nil {
		t.Fatal(err)
	}
	daemon := Daemon{DB: db, Host: &fakeSupervisor{Status: host.Status{Known: false}}}
	if err := daemon.Reconcile(context.Background(), protocol.RunnerInventory{Dispatches: []protocol.Dispatch{dispatch}}); err == nil {
		t.Fatal("missing manifest treated as absence")
	}
	s, _ := db.Start("a")
	if s.Phase != "running" {
		t.Fatal("unknown writer released")
	}
}
