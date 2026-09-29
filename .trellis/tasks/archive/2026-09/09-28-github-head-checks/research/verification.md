# GitHub required checks and expected head

> Product terminology and command/path examples were normalized to `monos` on
> 2026-09-29. Exact historical names and observations remain in the original Git
> revisions and unchanged raw JSON attachments; this edit is not a new test run.

Owner authorized a new dedicated repository and all described synthetic effects.
Created private `6spot/monos-feasibility-20260928-160020`. GitHub returned 403
when configuring required branch checks on this private repository. Created a
separate synthetic-only public repository with suffix `-public`; protection then
succeeded with enforced `monos/probe` status context. No existing repository was
made public and no monos source was uploaded.

PR #1 verified pending/failure denial and successful exact-head merge, but its
initial stale-head attempt returned transient 405 `Base branch was modified`.
That result was retained as failed SHA-isolation evidence. The harness now waits
for current-head success and clean mergeability before testing the stale SHA.
PR #2 passed all eleven assertions: old SHA 409, still-open unchanged current head,
pending/failure 405 with open PR, success 200 and actual merged current SHA.

Local evidence: `/tmp/monos-github-head-evidence-01` and `-02` retain each request
intent, HTTP result and final source hash. Old accepted SHA for passing run:
535e0845a9d16df34692f85a33ed629fda309efc; merged PR head:
b4d28feed394b5a5ef5b7eb93aadbc5befb6cd3c. Invalid synthetic credential returned
401 while authenticated fixture read succeeded. Anonymous read returned 403;
that is recorded as unavailable, not misclassified as missing/private visibility.

Three local parser/SHA regressions pass. Reproduction uses infra/github/probe.py
with --execute and a fresh evidence directory; --repo can reuse only a marked
synthetic fixture. Repositories/branches/merged PRs are retained for inspection.
This clears the bounded provider experiment, not production delivery orchestration.

Work checkpoint: `cef301d` (local commit; no product-source push).
