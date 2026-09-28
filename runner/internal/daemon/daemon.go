package daemon

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"sync"
	"time"

	protocol "monolab.local/protocol"
	"monolab.local/runner/internal/control"
	"monolab.local/runner/internal/host"
	"monolab.local/runner/internal/journal"
)

type Daemon struct {
	DB      *journal.DB
	Control *control.Client
	Host    host.Supervisor
	Boot    string
	mu      sync.Mutex
	queueMu sync.Mutex
	queued  map[string]bool
	workers sync.WaitGroup
}

func (d *Daemon) InstalledRuntimes(ctx context.Context) []protocol.RuntimeInstallation {
	status, err := d.Host.Call(ctx, host.Request{Action: "discover"})
	if err != nil {
		return []protocol.RuntimeInstallation{{RuntimeID: "opencode", Executable: host.Runtime, Availability: "unavailable", SupportsModel: true, SupportsThinking: false, ModelIDS: []string{}}}
	}
	return status.Runtimes
}

func (d *Daemon) event(ctx context.Context, start journal.Start, kind protocol.RuntimeEventKind, text string) error {
	e, err := d.DB.Event(protocol.RuntimeEvent{AttemptID: start.Dispatch.AttemptID, DispatchID: start.Dispatch.DispatchID, StreamID: "runtime", Kind: kind, Text: text, BootID: &d.Boot})
	if err != nil {
		return err
	}
	return d.Control.Send(ctx, protocol.Frame{Type: protocol.Event, Event: &e})
}
func (d *Daemon) Reconcile(ctx context.Context, inventory protocol.RunnerInventory) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	known := map[string]protocol.Dispatch{}
	for _, dispatch := range inventory.Dispatches {
		known[dispatch.AttemptID] = dispatch
	}
	starts, err := d.DB.Starts()
	if err != nil {
		return err
	}
	for _, s := range starts {
		remote, exists := known[s.Dispatch.AttemptID]
		if s.Phase == "cancel_intent" {
			if exists && (remote.DispatchID != s.Dispatch.DispatchID || remote.MutationAllowed) {
				return fmt.Errorf("revocation lineage changed")
			}
			var err error
			s, err = d.confirmNeverLaunched(ctx, s)
			if err != nil {
				return err
			}
		}
		status, err := d.Host.Call(ctx, host.Request{Action: "status", AttemptID: s.Dispatch.AttemptID})
		if err != nil {
			return fmt.Errorf("retained ownership requires recovery: %w", err)
		}
		if !status.Known {
			if s.Phase == "intent" && exists && !remote.MutationAllowed {
				var stop *protocol.Operation
				for _, operation := range inventory.Operations {
					if operation.AttemptID == s.Dispatch.AttemptID && operation.DispatchID == s.Dispatch.DispatchID && operation.Kind == protocol.Stop {
						copy := operation
						stop = &copy
						break
					}
				}
				if stop == nil {
					return fmt.Errorf("revoked start intent has no admitted Stop")
				}
				s, err = d.unstartedRevocation(ctx, *stop, inventory)
				if err != nil {
					return err
				}
				status, err = d.Host.Call(ctx, host.Request{Action: "status", AttemptID: s.Dispatch.AttemptID})
				if err != nil {
					return err
				}
			}
			if !status.Known {
				return fmt.Errorf("retained launch manifest unavailable; ownership unresolved")
			}
		}
		if !exists && status.Populated {
			return fmt.Errorf("live local ownership absent from backend inventory")
		}
		if exists && remote.DispatchID != s.Dispatch.DispatchID {
			return fmt.Errorf("dispatch lineage mismatch")
		}
		if exists && !remote.MutationAllowed && status.Populated {
			status, err = d.Host.Call(ctx, host.Request{Action: "stop", AttemptID: s.Dispatch.AttemptID})
			if err != nil {
				return err
			}
		}
		if status.Populated {
			if status.BootID != s.BootID || status.Cgroup == "" {
				return fmt.Errorf("ambiguous retained process")
			}
			if s.Cgroup != "" && s.Cgroup != status.Cgroup {
				return fmt.Errorf("retained cgroup changed")
			}
			if s.PID > 0 && status.PID > 0 && (s.PID != status.PID || s.Birth != status.Birth) {
				return fmt.Errorf("retained process birth changed")
			}
			s.PID = status.PID
			s.Birth = status.Birth
			s.Cgroup = status.Cgroup
			s.Phase = "running"
		} else {
			if s.Phase != "absent" && s.Phase != "revoked" {
				if _, err = d.DB.Event(protocol.RuntimeEvent{AttemptID: s.Dispatch.AttemptID, DispatchID: s.Dispatch.DispatchID, StreamID: "runtime", Kind: protocol.ProcessAbsent, Text: "reconciled verified whole-tree absence", BootID: &d.Boot}); err != nil {
					return err
				}
			}
			if s.Phase != "revoked" {
				s.Phase = "absent"
			}
		}
		if err = d.DB.SaveStart(s); err != nil {
			return err
		}
	}
	return nil
}

// The backend repeats unacknowledged frames. Keep at most one queued job per
// durable identity and a bounded queue; dropped deliveries will be redelivered.
func (d *Daemon) enqueue(ctx context.Context, key string, work func() error) bool {
	d.queueMu.Lock()
	if d.queued == nil {
		d.queued = map[string]bool{}
	}
	if d.queued[key] || len(d.queued) >= 64 {
		d.queueMu.Unlock()
		return false
	}
	d.queued[key] = true
	d.workers.Add(1)
	d.queueMu.Unlock()
	go func() {
		defer d.workers.Done()
		defer func() { d.queueMu.Lock(); delete(d.queued, key); d.queueMu.Unlock() }()
		d.mu.Lock()
		defer d.mu.Unlock()
		if ctx.Err() != nil {
			return
		}
		if err := work(); err != nil {
			log.Printf("control work requires recovery: %s", err)
		}
	}()
	return true
}
func (d *Daemon) Frame(ctx context.Context, frame protocol.Frame) {
	switch frame.Type {
	case protocol.EventACK:
		if frame.AttemptID != nil && frame.StreamID != nil && frame.Sequence != nil {
			if err := d.DB.Ack(*frame.AttemptID, *frame.StreamID, *frame.Sequence); err != nil {
				log.Print("event acknowledgement persistence failed")
			}
		}
	case protocol.Start:
		if frame.Dispatch != nil {
			d.enqueue(ctx, "start:"+frame.Dispatch.DispatchID, func() error { return d.start(ctx, *frame.Dispatch) })
		}
	case protocol.Effect:
		if frame.Operation != nil {
			d.enqueue(ctx, "effect:"+frame.Operation.OperationID, func() error { return d.effect(ctx, *frame.Operation) })
		}
	}
}
func (d *Daemon) start(ctx context.Context, dispatch protocol.Dispatch) error {
	retained, err := d.DB.Start(dispatch.AttemptID)
	if err == nil {
		if retained.Dispatch.DispatchID != dispatch.DispatchID {
			return fmt.Errorf("conflicting dispatch")
		}
		if retained.Phase == "revoked" || retained.Phase == "cancel_intent" {
			return fmt.Errorf("dispatch revoked before launch")
		}
		if retained.Phase == "running" {
			return d.event(ctx, retained, protocol.Started, "retained supervised process")
		}
		if retained.Phase == "absent" {
			return d.event(ctx, retained, protocol.ProcessAbsent, "verified absent retained process")
		}
		return fmt.Errorf("unresolved prior start intent")
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	if _, err = d.Control.Authorize(ctx, dispatch.DispatchID); err != nil {
		return err
	}
	retained = journal.Start{Dispatch: dispatch, BootID: d.Boot, Phase: "intent"}
	if err = d.DB.SaveStart(retained); err != nil {
		return err
	}
	status, err := d.Host.Call(ctx, host.Request{Action: "start", AttemptID: dispatch.AttemptID, Dispatch: &dispatch})
	if err != nil {
		return err
	}
	if !status.Known || status.BootID != d.Boot {
		return fmt.Errorf("unknown launch ownership")
	}
	retained.PID = status.PID
	retained.Birth = status.Birth
	retained.Cgroup = status.Cgroup
	retained.Phase = "running"
	if !status.Populated {
		retained.Phase = "absent"
	}
	if err = d.DB.SaveStart(retained); err != nil {
		return err
	}
	if err = d.event(ctx, retained, protocol.Started, "supervised runtime launch"); err != nil {
		return err
	}
	if retained.Phase == "absent" {
		return d.event(ctx, retained, protocol.ProcessAbsent, "verified no live descendants")
	}
	return nil
}
func (d *Daemon) effect(ctx context.Context, op protocol.Operation) error {
	if err := d.DB.BeginEffect(op); err != nil {
		return err
	}
	old, err := d.DB.Effect(op.OperationID)
	if err != nil {
		return err
	}
	if old != nil && old.Success {
		return d.Control.Send(ctx, protocol.Frame{Type: protocol.TypeOperationResult, OperationResult: old})
	}
	s, err := d.DB.Start(op.AttemptID)
	if (errors.Is(err, sql.ErrNoRows) || err == nil && s.Phase == "intent") && op.Kind == protocol.Stop {
		needsTombstone := errors.Is(err, sql.ErrNoRows)
		if !needsTombstone {
			var status host.Status
			status, err = d.Host.Call(ctx, host.Request{Action: "status", AttemptID: s.Dispatch.AttemptID})
			if err != nil {
				return err
			}
			needsTombstone = !status.Known
		}
		if needsTombstone {
			var inventory protocol.RunnerInventory
			inventory, err = d.Control.Inventory(ctx)
			if err == nil {
				s, err = d.unstartedRevocation(ctx, op, inventory)
			}
		}
	}
	if err != nil {
		return err
	}
	if s.Phase == "cancel_intent" && op.Kind == protocol.Stop {
		s, err = d.confirmNeverLaunched(ctx, s)
		if err != nil {
			return err
		}
	}
	if s.Dispatch.DispatchID != op.DispatchID {
		return fmt.Errorf("effect ownership mismatch")
	}
	result := protocol.OperationResult{AttemptID: op.AttemptID, OperationID: op.OperationID}
	var status host.Status
	if op.Kind == protocol.KindInspectRepository {
		var snapshot protocol.EffectResult
		snapshot, err = host.Inspect(op.AttemptID)
		status = host.Status{Known: true, Result: &snapshot}
	} else {
		status, err = d.Host.Call(ctx, host.Request{Action: "effect", AttemptID: op.AttemptID, Operation: &op})
	}
	if err == nil && op.Kind == protocol.KindCompleteNode && status.Result != nil && status.Result.GitCommit != nil && status.Result.GitTree != nil {
		err = host.Export(op.AttemptID, op.OperationID, *status.Result.GitCommit, *status.Result.GitTree)
	}
	if err == nil && !status.Known {
		err = fmt.Errorf("effect ownership unresolved")
	}
	if err == nil && (op.Kind == protocol.Stop || op.Kind == protocol.KindCompleteNode) && status.Populated {
		err = fmt.Errorf("writer absence unresolved")
	}
	if err == nil && op.Kind == protocol.KindCompleteNode && (status.Result == nil || status.Result.GitCommit == nil || status.Result.GitTree == nil) {
		err = fmt.Errorf("missing finalized Git evidence")
	}
	if err != nil {
		message := "host effect unresolved; retained for recovery"
		kind := host.ClassifyFailure(err)
		switch kind {
		case protocol.CaptureHardLimit:
			message = "local capture storage limit; preserve workspace and repair before retry"
		case protocol.InvalidFinalization:
			message = "finalized result violates recorded Git identity; preserve data for reconciliation"
		}
		result.Result.Message = &message
		result.FailureKind = &kind
	} else {
		result.Success = true
		if status.Result != nil {
			result.Result = *status.Result
		}
		if op.Kind == protocol.Stop || op.Kind == protocol.KindCompleteNode {
			absent := !status.Populated
			result.Result.WriterAbsent = &absent
			if s.Phase != "revoked" {
				s.Phase = "absent"
			}
			if err = d.DB.SaveStart(s); err != nil {
				return err
			}
		}
	}
	if err = d.DB.FinishEffect(result); err != nil {
		return err
	}
	return d.Control.Send(ctx, protocol.Frame{Type: protocol.TypeOperationResult, OperationResult: &result})
}

func (d *Daemon) unstartedRevocation(ctx context.Context, op protocol.Operation, inventory protocol.RunnerInventory) (journal.Start, error) {
	if op.Kind != protocol.Stop {
		return journal.Start{}, fmt.Errorf("only Stop can settle a never-launched Attempt")
	}
	var dispatch *protocol.Dispatch
	var operationFound bool
	for _, candidate := range inventory.Dispatches {
		if candidate.AttemptID == op.AttemptID {
			copy := candidate
			dispatch = &copy
		}
	}
	for _, candidate := range inventory.Operations {
		if candidate.OperationID == op.OperationID && candidate.AttemptID == op.AttemptID && candidate.DispatchID == op.DispatchID && candidate.RequestID == op.RequestID && candidate.ResourceID == op.ResourceID && candidate.Kind == protocol.Stop {
			operationFound = true
		}
	}
	if dispatch == nil || dispatch.DispatchID != op.DispatchID || dispatch.MutationAllowed || dispatch.ProcessReleased || !operationFound {
		return journal.Start{}, fmt.Errorf("missing authoritative unstarted revocation")
	}
	old, err := d.DB.Start(op.AttemptID)
	if err == nil {
		expected := old.Dispatch
		expected.MutationAllowed = false
		expected.ProcessReleased = dispatch.ProcessReleased
		if old.Phase != "intent" || !reflect.DeepEqual(expected, *dispatch) {
			return journal.Start{}, fmt.Errorf("revocation collides with retained start")
		}
	} else if !errors.Is(err, sql.ErrNoRows) {
		return journal.Start{}, err
	}
	s := journal.Start{Dispatch: *dispatch, BootID: d.Boot, Phase: "cancel_intent"}
	if err := d.DB.SaveStart(s); err != nil {
		return s, err
	}
	return d.confirmNeverLaunched(ctx, s)
}
func (d *Daemon) confirmNeverLaunched(ctx context.Context, s journal.Start) (journal.Start, error) {
	if s.Phase != "cancel_intent" || s.Dispatch.MutationAllowed {
		return s, fmt.Errorf("invalid retained revocation")
	}
	status, err := d.Host.Call(ctx, host.Request{Action: "tombstone", AttemptID: s.Dispatch.AttemptID, Dispatch: &s.Dispatch})
	if err != nil {
		return s, err
	}
	if !status.Known || status.Exists || status.Populated || status.BootID != d.Boot {
		return s, fmt.Errorf("never-launched absence not established")
	}
	s.Phase = "revoked"
	s.BootID = status.BootID
	if err = d.DB.SaveStart(s); err != nil {
		return s, err
	}
	return s, nil
}
func (d *Daemon) Tick(ctx context.Context) {
	if !d.mu.TryLock() {
		return
	}
	defer d.mu.Unlock()
	pending, err := d.DB.PendingEvents()
	if err != nil {
		log.Print("journal event recovery failed")
		return
	}
	for _, event := range pending {
		if d.Control.Send(ctx, protocol.Frame{Type: protocol.Event, Event: &event}) != nil {
			return
		}
	}
	starts, err := d.DB.Starts()
	if err != nil {
		return
	}
	for _, s := range starts {
		for _, stream := range []string{"stdout", "stderr"} {
			offset, e := d.DB.LogOffset(s.Dispatch.AttemptID, stream)
			if e != nil {
				continue
			}
			p := filepath.Join(host.Root, "logs", s.Dispatch.AttemptID+"."+stream)
			file, e := os.Open(p)
			if e != nil {
				continue
			}
			_, e = file.Seek(offset, io.SeekStart)
			buf := make([]byte, 32768)
			n, _ := file.Read(buf)
			file.Close()
			if e == nil && n > 0 {
				kind := protocol.Output
				text := strings.ToValidUTF8(string(buf[:n]), "?")
				if stream == "stderr" && strings.Contains(text, "permission requested:") {
					kind = protocol.Attention
				}
				event, err := d.DB.LogEvent(protocol.RuntimeEvent{AttemptID: s.Dispatch.AttemptID, DispatchID: s.Dispatch.DispatchID, StreamID: stream, Kind: kind, Text: text, BootID: &d.Boot}, offset, offset+int64(n))
				if err == nil {
					_ = d.Control.Send(ctx, protocol.Frame{Type: protocol.Event, Event: &event})
				}
			}
		}
		if s.Phase == "running" {
			status, e := d.Host.Call(ctx, host.Request{Action: "status", AttemptID: s.Dispatch.AttemptID})
			if e != nil {
				continue
			}
			if !status.Populated && status.Known {
				if _, err = d.DB.Event(protocol.RuntimeEvent{AttemptID: s.Dispatch.AttemptID, DispatchID: s.Dispatch.DispatchID, StreamID: "runtime", Kind: protocol.ProcessAbsent, Text: "verified whole-tree absence", BootID: &d.Boot}); err != nil {
					continue
				}
				s.Phase = "absent"
				if d.DB.SaveStart(s) == nil {
					_ = d.event(ctx, s, protocol.Exited, "runtime process exited; formal completion is independent")
				}
			}
		}
	}
}
func (d *Daemon) Run(ctx context.Context) error {
	for {
		if ctx.Err() != nil {
			return nil
		}
		err := d.Control.Run(ctx, d.Boot, d)
		if ctx.Err() != nil {
			return nil
		}
		log.Printf("control reconnect required: %s", err)
		select {
		case <-ctx.Done():
			return nil
		case <-time.After(2 * time.Second):
		}
	}
}
