# Reuse and Dependency Review

Source: [dependency policy](../../../docs/11-technology-and-deployment.md).

## Search before adding

Use `rg` to find the existing command, schema, component, error category or configuration. The same fact belongs to one canonical owner; generated TS/Go types share a schema, not copied handwritten definitions.

Extract shared code when callers share a stable contract and must evolve together. Two coincidentally equal values do not justify an abstraction.

## Dependency questions

- Does the platform or an existing dependency already solve this?
- What concrete requirement justifies the package now?
- What runtime/transitive cost, maintenance and version burden does it add?
- Can it remain a development-only tool?
- Would avoiding it require rebuilding security, accessibility or a complex parser?
- Is the lockfile change limited and reviewable?

For UI, use only needed shadcn Base UI components. Avoid a second primitive family, full component suite or unused form/state/animation stack. Inspect generated component source rather than assuming it is dependency-free.

## Boundaries to preserve

Do not merge Agent semantics with deterministic orchestration, Task with Todo, Node with Attempt, local capture with publication checks, or message processing with execution completion just to share a helper.

Keep domain-specific behavior at its owner. Avoid generic event buses/workflow engines/configurable plugin layers until actual repeated needs justify them.
