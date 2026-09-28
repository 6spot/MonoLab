# Verification — 2026-09-29

- Full Linux Node 24/PostgreSQL 17.11 DB entrypoint: 74 passing cases (72 DB + 2 pure).
- Local lint/typecheck, 70 tests, generation check, build, native module load passed.
- Linux Go race/vet passed. New helper built into a temporary check binary, not installed over any live daemon/helper.
- Actual helper discovery returned OpenCode 1.18.30 at /home/linuxbrew/.linuxbrew/bin/opencode under fixed execution account me. No model launch/login or production dispatch performed.
- Tests verify encrypted private key and safe receipts/snapshots, App JWT signature and exact read-only token permissions, malformed/oversized/provider error sanitization, service-key rotation, policy roundtrip/manual models and stale channel/backend fencing.
- GitHub calls use synthetic RSA keys and injected provider responses; live App configuration/push/merge permission remains unverified. Existing provider feasibility evidence is separate.
- New schemas preserve old ready frames. Installation observations persist but a prior incarnation is not current after reconnect. Existing launches are unchanged by configuration edits.
