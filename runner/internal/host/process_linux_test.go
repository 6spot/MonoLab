//go:build linux

package host

import (
	"net"
	"os"
	"path/filepath"
	"testing"
)

func TestKernelSocketPeerUsesHostProcessIdentity(t *testing.T) {
	path := filepath.Join(t.TempDir(), "peer.sock")
	listener, err := net.ListenUnix("unix", &net.UnixAddr{Name: path, Net: "unix"})
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	client, err := net.DialUnix("unix", nil, &net.UnixAddr{Name: path, Net: "unix"})
	if err != nil {
		t.Fatal(err)
	}
	defer client.Close()
	server, err := listener.AcceptUnix()
	if err != nil {
		t.Fatal(err)
	}
	defer server.Close()
	peer, err := SocketPeer(server)
	if err != nil {
		t.Fatal(err)
	}
	if peer.PID != os.Getpid() || peer.UID != uint32(os.Getuid()) || peer.Birth == "" || peer.BootID == "" || peer.Cgroup == "" {
		t.Fatalf("wrong kernel attribution: %+v", peer)
	}
}
