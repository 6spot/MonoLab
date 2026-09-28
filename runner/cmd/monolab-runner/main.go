package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"monolab.local/runner/internal/control"
	"monolab.local/runner/internal/daemon"
	"monolab.local/runner/internal/host"
	"monolab.local/runner/internal/journal"
	"monolab.local/runner/internal/local"
	"os"
	"os/signal"
	"syscall"
)

func run() error {
	path := flag.String("config", "/etc/monolab-probe/runner.json", "private Runner configuration")
	flag.Parse()
	if os.Geteuid() == 0 {
		return fmt.Errorf("Runner must use dedicated service account")
	}
	raw, err := os.ReadFile(*path)
	if err != nil {
		return err
	}
	var config control.Config
	if err = json.Unmarshal(raw, &config); err != nil {
		return err
	}
	if config.Socket != host.Socket || config.ExecutionUID == 0 || !host.ValidID(config.RunnerID) {
		return fmt.Errorf("invalid Runner config")
	}
	db, err := journal.Open(config.Journal)
	if err != nil {
		return err
	}
	defer db.Close()
	client, err := control.New(config)
	if err != nil {
		return err
	}
	boot, err := host.BootID()
	if err != nil {
		return err
	}
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()
	service := local.Service{DB: db, Control: client, UID: config.ExecutionUID}
	d := daemon.Daemon{DB: db, Control: client, Host: host.Client{}, Boot: boot}
	errors := make(chan error, 2)
	go func() { errors <- service.Serve(ctx, config.Socket) }()
	go func() { errors <- d.Run(ctx) }()
	err = <-errors
	cancel()
	return err
}
func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
