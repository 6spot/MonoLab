# MonoLab

MonoLab is a personal AI cloud development workspace for a single Owner.

The core product loop is:

```text
Todo → Discussion → Execution Task → Execution Plan
     → Cloud Execution → Owner Review → Accept / Merge
```

The product is developer-first, but the execution model is intentionally generic enough to support other personal-work scenarios later.

## Core principles

- The Owner controls intent, important decisions, and final acceptance.
- AI handles semantic work: understanding, discussion, planning, implementation, diagnosis, and review.
- Programs handle deterministic orchestration: state transitions, scheduling, workspace isolation, persistence, and delivery.
- Execution continues in the cloud even when Web or Mobile clients are closed.
- Dirty process is allowed; formal state must stay clean.
- Prefer the smallest sufficient model. Do not add enterprise/team-management abstractions unless they are truly required.
- Multica is a mature implementation reference, not MonoLab's product model.

## Documentation

Start with [ARCHITECTURE.md](ARCHITECTURE.md).

Detailed modules live under [docs/](docs/README.md).
