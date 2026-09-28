//go:build !linux

package host

import (
	"fmt"
	"net"
)

type Peer struct {
	PID    int
	UID    uint32
	Birth  string
	BootID string
	Cgroup string
}

func BootID() (string, error)                { return "", fmt.Errorf("Linux required") }
func Identity(int) (Peer, error)             { return Peer{}, fmt.Errorf("Linux required") }
func SocketPeer(*net.UnixConn) (Peer, error) { return Peer{}, fmt.Errorf("Linux required") }
func Population(string) (bool, error)        { return true, fmt.Errorf("Linux required") }
