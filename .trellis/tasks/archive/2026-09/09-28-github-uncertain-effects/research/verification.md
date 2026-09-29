# Uncertain GitHub outcomes

> Product terminology and command/path examples were normalized to `monos` on
> 2026-09-29. Exact historical names and observations remain in the original Git
> revisions and unchanged raw JSON attachments; this edit is not a new test run.

The authorized synthetic repository is
the synthetic public repository recorded in Git revision `fb7c2df` at this same document path. Its historical name was not changed by the product rename.
PR #3 passed: create response discarded, exact repository/head/base/marker lookup
found one existing PR; merge response discarded, remote read confirmed merged head
bfa45e1fdb1e9f0762f13b42ca951bf3df386d35 and merge commit
9ac3353e97ed6a0cb96a80bb8e136d44cac982e4. Intent audit confirms exactly one PR-create
request and one merge request. No retry mutation or inferred success was used.

Source hash 70461a56ca8bace32602029bf423f8cdf34f7164dde590706b4acb02ae6e12b2.
Local evidence `/tmp/monos-github-uncertain-evidence-01` retains every request,
HTTP result, pre-effect identity and recovered result. Five local parser/identity
negative-control tests pass. Full reproduction and retention instructions are in
infra/github/README.md. Injection withholds a successful API return from the
application; this does not claim a network packet proxy or provider rollback.

Work checkpoint: `cef301d` (local commit; no product-source push).
