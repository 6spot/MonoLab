# Synthetic GitHub feasibility

Requires an Owner-authorized GitHub account (`gh` is already authenticated).
Creates only synthetic content in `monolab-feasibility-*` repositories. Private
branch protection can require a paid plan; the first command records that failure
and can create a separate public synthetic repository to test enforcement.
It never changes an existing repository's visibility or publishes MonoLab source.

```sh
python3 -m unittest discover -s infra/github -p 'test_*.py'
python3 infra/github/probe.py --evidence /tmp/github-head-run --execute
# Use the exact synthetic repository recorded by the first run:
python3 infra/github/uncertain.py --repo OWNER/monolab-feasibility-ID-public \
  --evidence /tmp/github-recovery-run --execute
```

Evidence directories must be new. Each API request has an immutable intent and
HTTP result. Credentials remain inside `gh`; header output is parsed and discarded.
The required context is `monolab/probe`, enforced for administrators as well.
Expected-SHA testing waits for clean mergeability and successful checks first so
an unrelated 405 does not masquerade as SHA mismatch evidence.

The second command discards successful replies at the application boundary, then
finds the PR by exact repository/head/base/operation marker and confirms merge by
remote head and merge commit. Missing or ambiguous records stay unresolved;
neither mutation is automatically repeated. This is not a TCP-loss proxy test.

Keep test repositories and PRs for audit. If later cleaning up, target only the
exact recorded synthetic repository names, never wildcard-delete repositories.
No cleanup/delete or production delivery coordinator is implemented here.
