package main

import (
	"fmt"
	protocol "monolab.local/protocol"
	"monolab.local/runner/internal/adapter"
	"monolab.local/runner/internal/host"
	"os"
)

func run() error {
	if os.Geteuid() == 0 {
		return fmt.Errorf("refusing root execution")
	}
	if len(os.Args) < 3 || !host.ValidID(os.Args[2]) {
		return fmt.Errorf("invalid worker arguments")
	}
	switch os.Args[1] {
	case "attempt":
		if len(os.Args) != 3 {
			return fmt.Errorf("invalid attempt arguments")
		}
		d, err := host.LoadDispatch(os.Args[2])
		if err != nil {
			return err
		}
		return adapter.Run(d)
	case "effect":
		if len(os.Args) < 5 || len(os.Args) > 6 {
			return fmt.Errorf("invalid effect arguments")
		}
		kind := protocol.OperationKind(os.Args[3])
		base := ""
		if kind == protocol.KindCompleteNode {
			if len(os.Args) != 6 {
				return fmt.Errorf("finalization requires system-retained base")
			}
			base = os.Args[5]
		} else if len(os.Args) != 5 {
			return fmt.Errorf("unexpected effect base")
		}
		r, err := host.GitEffect(os.Args[2], kind, os.Args[4], base)
		status := host.Status{Known: true, Result: &r}
		if err == nil && kind == protocol.KindOpenWorkspace {
			base, err = host.MaterializationBase(os.Args[2])
			status.MaterializationBase = &base
		}
		return host.WriteStatus(os.Stdout, status, err)
	}
	return fmt.Errorf("unknown worker action")
}
func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
