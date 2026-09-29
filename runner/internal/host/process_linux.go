//go:build linux

package host

import (
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"
	"syscall"
)

type Peer struct {
	PID    int
	UID    uint32
	Birth  string
	BootID string
	Cgroup string
}

func BootID() (string, error) {
	b, e := os.ReadFile("/proc/sys/kernel/random/boot_id")
	return strings.TrimSpace(string(b)), e
}
func Identity(pid int) (Peer, error) {
	p := Peer{PID: pid}
	var err error
	p.BootID, err = BootID()
	if err != nil {
		return p, err
	}
	data, err := os.ReadFile(fmt.Sprintf("/proc/%d/stat", pid))
	if err != nil {
		return p, err
	}
	end := strings.LastIndexByte(string(data), ')')
	if end < 0 {
		return p, fmt.Errorf("invalid process stat")
	}
	fields := strings.Fields(string(data[end+1:]))
	if len(fields) < 20 {
		return p, fmt.Errorf("short process stat")
	}
	p.Birth = fields[19]
	data, err = os.ReadFile(fmt.Sprintf("/proc/%d/cgroup", pid))
	if err != nil {
		return p, err
	}
	for _, line := range strings.Split(string(data), "\n") {
		if strings.HasPrefix(line, "0::") {
			p.Cgroup = strings.TrimPrefix(line, "0::")
		}
	}
	if p.Cgroup == "" {
		return p, fmt.Errorf("unified cgroup required")
	}
	return p, nil
}
func SocketPeer(c *net.UnixConn) (Peer, error) {
	raw, err := c.SyscallConn()
	if err != nil {
		return Peer{}, err
	}
	var cred *syscall.Ucred
	var sockErr error
	err = raw.Control(func(fd uintptr) {
		cred, sockErr = syscall.GetsockoptUcred(int(fd), syscall.SOL_SOCKET, syscall.SO_PEERCRED)
	})
	if err != nil {
		return Peer{}, err
	}
	if sockErr != nil {
		return Peer{}, sockErr
	}
	first, err := Identity(int(cred.Pid))
	if err != nil {
		return first, err
	}
	second, err := Identity(int(cred.Pid))
	if err != nil {
		return second, err
	}
	if first != second {
		return first, fmt.Errorf("process changed during attribution")
	}
	first.UID = cred.Uid
	return first, nil
}
func Population(cgroup string) (bool, error) {
	if !strings.HasPrefix(cgroup, "/system.slice/monos-probe-") || strings.Contains(cgroup, "..") {
		return true, fmt.Errorf("unowned cgroup")
	}
	raw, err := os.ReadFile("/sys/fs/cgroup" + cgroup + "/cgroup.events")
	if os.IsNotExist(err) {
		return false, nil
	}
	if err != nil {
		return true, err
	}
	for _, line := range strings.Split(string(raw), "\n") {
		fields := strings.Fields(line)
		if len(fields) == 2 && fields[0] == "populated" {
			v, e := strconv.Atoi(fields[1])
			return v != 0, e
		}
	}
	return true, fmt.Errorf("missing cgroup population")
}
