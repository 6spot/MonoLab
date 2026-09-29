#!/bin/sh
set -eu
# Run from repository root with Go 1.26+ and a C compiler (SQLite).
destination=${1:-./artifacts/runner}
mkdir -p "$destination"
destination=$(cd "$destination" && pwd)
cd runner
for executable in monos monos-runner monos-probe-launch monos-probe-exec; do
  CGO_ENABLED=1 go build -trimpath -o "$destination/$executable" "./cmd/$executable"
done
