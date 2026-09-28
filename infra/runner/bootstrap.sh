#!/bin/sh
# Reviewed, task-owned host bootstrap. Does not start the service or handle secrets.
set -eu
if [ "$(id -u)" != 0 ]; then echo "run as root" >&2; exit 1; fi
if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then echo "usage: bootstrap.sh ROOT_OWNED_BINARY_DIRECTORY [--check]" >&2; exit 1; fi
if [ "$#" = 2 ] && [ "$2" != --check ]; then echo "unknown option" >&2; exit 1; fi
artifacts=$1
case "$artifacts" in /*) ;; *) echo "absolute artifact directory required" >&2; exit 1;; esac
python3 - "$artifacts" <<'PY'
import grp, os, pathlib, pwd, stat, subprocess, sys
root=pathlib.Path('/var/lib/monolab-probe')
artifact=pathlib.Path(sys.argv[1])

def directory(path, owner=0, group=None, sticky=False):
    info=path.lstat()
    if not stat.S_ISDIR(info.st_mode) or info.st_uid != owner or (info.st_mode & 0o022 and not (sticky and info.st_mode & stat.S_ISVTX)):
        raise SystemExit('unsafe directory ownership/mode: '+str(path))
    if group is not None and info.st_gid != group:
        raise SystemExit('unexpected directory group: '+str(path))

def regular(path, owner=0):
    info=path.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_uid != owner or info.st_mode & 0o022:
        raise SystemExit('unsafe file ownership/mode: '+str(path))

def unit_inventory(*args):
    result=subprocess.run(['/usr/bin/systemctl',*args,'monolab-probe-*'],text=True,capture_output=True)
    # systemd 257 uses status 1 for an empty list-unit-files match. Accept only
    # that exact empty result; diagnostics or another failure remain fatal.
    empty_match=args[0]=='list-unit-files' and result.returncode==1 and not result.stdout and not result.stderr
    if not empty_match and (result.returncode!=0 or result.stderr):
        raise SystemExit('systemd inventory failed ('+args[0]+'): '+result.stderr.strip())
    return result.stdout

for path in [artifact,*artifact.parents]:
    directory(path, sticky=path != artifact)
for name in ['monolab','monolab-runner','monolab-probe-launch','monolab-probe-exec']:
    regular(artifact/name)
for base in [pathlib.Path('/usr/local/bin'),pathlib.Path('/usr/local/libexec'),root,pathlib.Path('/etc/monolab-probe'),pathlib.Path('/etc/sudoers.d'),pathlib.Path('/etc/systemd/system')]:
    for path in [base,*base.parents]:
        if not os.path.lexists(path): continue
        directory(path)
marker=root/'launch'/'installed-by-boundary-probe'
targets=['/usr/local/bin/monolab','/usr/local/libexec/monolab-runner','/usr/local/libexec/monolab-probe-launch','/usr/local/libexec/monolab-probe-exec','/etc/sudoers.d/monolab-probe','/etc/systemd/system/monolab-probe-runner.service']
if not os.path.lexists(marker):
    for path in targets+[str(root),'/etc/monolab-probe','/run/monolab-probe']:
        if os.path.lexists(path): raise SystemExit('unowned installation collision: '+path)
    for lookup,name in [(pwd.getpwnam,'monolab-probe'),(grp.getgrnam,'monolab-probe-read')]:
        try: lookup(name)
        except KeyError: pass
        else: raise SystemExit('unowned account/group collision: '+name)
    for args in [('list-units','--all','--plain','--no-legend'),('list-unit-files','--no-legend')]:
        units=unit_inventory(*args)
        if units.strip(): raise SystemExit('unowned systemd unit collision')
else:
    directory(root/'launch')
    regular(marker)
    if marker.read_text() != 'monolab-boundary-probe-v1\n':
        raise SystemExit('unrecognized installation marker')
    service=pwd.getpwnam('monolab-probe')
    group=grp.getgrnam('monolab-probe-read').gr_gid
    if service.pw_uid in (0,pwd.getpwnam('me').pw_uid) or service.pw_gid != group or service.pw_dir != str(root/'service') or service.pw_shell != '/usr/sbin/nologin':
        raise SystemExit('service identity changed')
    for name in ['launch','execution','logs']:
        directory(root/name,group=group if name=='logs' else 0)
    for name in ['service','cache','inspection','results']:
        directory(root/name,owner=service.pw_uid,group=group)
    for name in ['service','results']:
        if (root/name).stat().st_mode & 0o077: raise SystemExit('private directory became accessible')
    for path in targets: regular(pathlib.Path(path))
    if os.path.lexists('/run/monolab-probe'):
        directory(pathlib.Path('/run/monolab-probe'),owner=service.pw_uid,group=group)
    units=unit_inventory('list-units','--all','--plain','--no-legend')
    for line in units.splitlines():
        fields=line.split()
        if len(fields)<4 or fields[2] not in ('inactive','failed') or fields[0].startswith(('monolab-probe-a-','monolab-probe-o-')):
            raise SystemExit('stop/reconcile owned units before reinstalling')
PY
for executable in monolab monolab-runner monolab-probe-launch monolab-probe-exec; do
  test -f "$artifacts/$executable"
  test ! -L "$artifacts/$executable"
  test "$(stat -c %u "$artifacts/$executable")" = 0
done
test "$(id -u me)" != 0
command -v systemd-run >/dev/null
command -v git >/dev/null
# sudo is the only additional OS prerequisite for the no-argv launcher boundary.
if ! command -v sudo >/dev/null; then
  echo "Install Debian's signed sudo package before running bootstrap." >&2
  exit 1
fi
if [ "${2:-}" = --check ]; then echo "Bootstrap preflight passed; no changes made."; exit 0; fi
if ! getent group monolab-probe-read >/dev/null; then groupadd --system monolab-probe-read; fi
if ! getent passwd monolab-probe >/dev/null; then
  useradd --system --no-create-home --home-dir /var/lib/monolab-probe/service --shell /usr/sbin/nologin --gid monolab-probe-read monolab-probe
fi
test "$(id -u monolab-probe)" != 0
test "$(id -u monolab-probe)" != "$(id -u me)"
usermod --append --groups monolab-probe-read me
usermod --append --groups monolab-probe-read monolab-probe
install -d -o root -g root -m 0755 /var/lib/monolab-probe /var/lib/monolab-probe/launch /var/lib/monolab-probe/execution
install -d -o root -g monolab-probe-read -m 0750 /var/lib/monolab-probe/logs
install -d -o monolab-probe -g monolab-probe-read -m 0700 /var/lib/monolab-probe/service /var/lib/monolab-probe/results
install -d -o monolab-probe -g monolab-probe-read -m 0750 /var/lib/monolab-probe/cache /var/lib/monolab-probe/inspection
install -d -o root -g monolab-probe-read -m 0750 /etc/monolab-probe
install -d -o root -g root -m 0755 /usr/local/libexec
install -o root -g root -m 0755 "$artifacts/monolab" /usr/local/bin/monolab
install -o root -g root -m 0755 "$artifacts/monolab-runner" /usr/local/libexec/monolab-runner
install -o root -g root -m 0755 "$artifacts/monolab-probe-launch" /usr/local/libexec/monolab-probe-launch
install -o root -g root -m 0755 "$artifacts/monolab-probe-exec" /usr/local/libexec/monolab-probe-exec
sudoers=$(mktemp /etc/sudoers.d/.monolab-probe.XXXXXX)
trap 'rm -f "$sudoers"' EXIT
cat > "$sudoers" <<'POLICY'
# The execution account me receives no sudo authorization.
monolab-probe ALL=(root) NOPASSWD: /usr/local/libexec/monolab-probe-launch ""
POLICY
chmod 0440 "$sudoers"
visudo -cf "$sudoers"
mv "$sudoers" /etc/sudoers.d/monolab-probe
cat > /etc/systemd/system/monolab-probe-runner.service <<'UNIT'
[Unit]
Description=MonoLab isolated boundary probe Runner
After=network-online.target
Wants=network-online.target

[Service]
Type=exec
User=monolab-probe
Group=monolab-probe-read
ExecStart=/usr/local/libexec/monolab-runner --config /etc/monolab-probe/runner.json
RuntimeDirectory=monolab-probe
RuntimeDirectoryMode=0750
UMask=0027
Restart=on-failure
RestartSec=3
KillMode=control-group
# This service alone invokes the confined sudo helper; NoNewPrivileges would
# disable that intentional privilege transition. Agent units always enable it.

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
python3 - <<'PY'
from pathlib import Path
path=Path('/var/lib/monolab-probe/launch/installed-by-boundary-probe')
path.write_text('monolab-boundary-probe-v1\n')
PY
chmod 0600 /var/lib/monolab-probe/launch/installed-by-boundary-probe
echo "Installed confined launcher and Runner unit. Provision private config/CA/token and fixture; start explicitly after review."
