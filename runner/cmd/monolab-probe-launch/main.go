package main

import (
	"context"
	"fmt"
	"monolab.local/runner/internal/host"
	"os"
	"time"
)

func main() {
	if len(os.Args) != 1 {
		fmt.Fprintln(os.Stderr, "helper accepts no arguments")
		os.Exit(1)
	}
	req, err := host.DecodeRequest(os.Stdin)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	status, err := host.Handle(ctx, req)
	if err = host.WriteStatus(os.Stdout, status, err); err != nil {
		os.Exit(1)
	}
}
