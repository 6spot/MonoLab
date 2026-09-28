package local

import (
	"monolab.local/runner/internal/host"
	"monolab.local/runner/internal/journal"
	"testing"
)

func TestSameUIDCannotSelectAnotherAttempt(t *testing.T) {
	one := journal.Start{BootID: "boot", Cgroup: "/system.slice/monolab-probe-a-one.service", Phase: "running"}
	two := journal.Start{BootID: "boot", Cgroup: "/system.slice/monolab-probe-a-two.service", Phase: "running"}
	peer := host.Peer{PID: 42, UID: 1000, Birth: "123", BootID: "boot", Cgroup: one.Cgroup}
	if !Match(peer, one) || Match(peer, two) {
		t.Fatal("UID confused ownership")
	}
	peer.BootID = "newboot"
	if Match(peer, one) {
		t.Fatal("boot reuse revived old ownership")
	}
	peer.BootID = "boot"
	one.Phase = "absent"
	if Match(peer, one) {
		t.Fatal("revoked ownership accepted")
	}
}
