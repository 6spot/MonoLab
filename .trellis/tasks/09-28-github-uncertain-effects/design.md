# Uncertain provider response recovery

Reuse the synthetic repository and structured gh wrapper. Persist a unique test
operation marker before creating a branch/PR. Deliberately discard the successful
create response at the application boundary, then discover the PR via repository,
head branch, base and marker. Require exactly one match; no second create on
missing/ambiguous visibility. HTTP response remains audit evidence but is not read
by the recovery code. This simulates application-response loss, not a network
packet proxy or provider transaction rollback.

For merge, record accepted head and wait for required success/clean mergeability.
Issue exactly one expected-SHA merge, discard its return to the caller, and query
PR remote state until merged exact head/merge commit is proven or bounded unknown.
Never retry the mutation to learn its outcome. Count actual POST-create and PUT-
merge intents to prove one each. No production coordinator, compensation or delete.
