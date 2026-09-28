# First Executable Slice

This is an implementation sequence and acceptance boundary, not another owner of domain rules. Modules 01–08 remain authoritative. Stage A is an internal usable slice of V1, not a claim that all V1 capabilities have shipped.

## Outcome

An Owner can capture an idea, discuss it, confirm and start a Task, close the browser, return to a prepared GitHub PR, request a correction, and accept the corrected result. Service/Runner restart and repeated commands must preserve that same execution and delivery lineage.

```text
Capture (no AI)
→ Discussion (durable reply and requirement state)
→ confirm exact Task preview + Start
→ Task Planner publishes one Node
→ Node opens repository, edits/tests, completes through Tool Protocol
→ system finalizes result and prepares PR
→ Owner Request Changes (Task remains REVIEW; acceptance blocked)
→ Task Planner routes feedback to Rework of the same Node (Task becomes RUNNING)
→ new activation updates the same PR
→ Owner accepts the exact result
→ expected-head merge succeeds
→ Task COMPLETED
```

## Stage A scope

| Area | Included | Deferred from this stage |
| --- | --- | --- |
| Deployment | One backend application, one relational database, one persistent Runner with a serializable authenticated service boundary; backend and Runner may share a host | Multiple Runner placement and machine migration |
| Owner access | One authenticated Owner, protected UI/API, separately authenticated Runner and scoped Attempt tools | Team/multi-tenant authorization |
| Client | Responsive Web capture, Discussion, Execution Board, Task detail/review, minimal configuration | Native mobile apps, external push/email |
| Project | Owner Context, one GitHub repository, one selected reusable Role; resource belongs to Project | Repository picker polish and multiple repositories per Project |
| Planning | Real Todo Planner and separate Task Planner sessions, one-Node Plan, existing-Node review Rework | Multi-Node graphs and interactive Replan publication |
| Runtime | One installed, Owner-authenticated CLI Adapter, one concurrent execution slot, Stop/Retry/Continue | Second real CLI and automatic cross-runtime fallback |
| Workspace | Lazy repository open, serial Task Workspace, private scratch, separate workspace directories, recoverable completion | Parallel worktrees and concurrent integration |
| Delivery | One PR per modified repository, checks/mergeability, same-PR correction, exact-head acceptance | Multi-repository partial delivery and plain-Git branch-only delivery |
| Recovery | Durable dispatch, request idempotency, process fencing, restart reconciliation, attention | Permanent Runner-disk loss recovery |

The one-Node limit is an implementation boundary, not a fixed workflow template or new Plan type. Stage A Planner receives the supported limit; validator returns a clear unsupported-plan error for larger graphs and never silently flattens dependencies. If an Agent requests Replan, persist the request and freeze correctly, then explain that this stage cannot publish a changed graph. Owner may cancel or wait for Stage B. Never pretend Rework satisfied a structural change.

The single execution slot is configuration, not a separate scheduler implementation. Discussion and Task planning share it with Node execution, so queued conversation must be visible. Owner may stop a Node to free capacity; the UI does not imply that queued Planner messages are being processed immediately.

Repository selection may initially accept one authorized GitHub repository identifier rather than implement the full picker. Installation/login of the coding CLI remains an Owner prerequisite. MonoLab's GitHub delivery integration and CLI authentication are separate concerns and separate credentials.

## Implementation order and module contracts

0. **Boundary feasibility probe.** Before broad implementation, demonstrate the intended Runner OS/isolation with a real installed CLI: authenticated tool calls, lazy workspace exposure, descendant-process termination, no delivery-credential access, and recovery after losing a start acknowledgement. Also exercise the backend/Runner transport across separate process/filesystem roots. If these do not work, revise the Adapter/isolation choice before building product modules. This probe is not a full multi-Runner implementation.
1. **Command and persistence foundation.** Implement authenticated caller scopes, request receipts, exact-content confirmation, Task control records, Node activation, event sequence, transactional dispatch, and read projections. Verify with deterministic fake Runtime and delivery adapters before starting real processes. Fakes are test fixtures, not another product Runtime.
2. **Capture and Discussion.** Persist Original Capture without model invocation. Serialize Owner messages, commit replies/requirement state atomically, restore previews on reconnect, and create/start Tasks through authenticated commands. A replayed preview confirmation resolves to the same Task.
3. **Runner and real CLI.** Probe the selected installed CLI, validate scoped tool invocation and isolation, start one Attempt, stream logs, terminate its whole process tree, and reconcile after disconnect. Fresh-session reconstruction is sufficient initially; native resume is enabled only after Adapter compatibility is verified.
4. **Task planning and workspace execution.** Publish a validated one-Node Plan, open the Project repository lazily, execute through the selected Role, finalize Git through a recoverable operation, and project REVIEW. Task Workspace contents stay private to the correct execution.
5. **GitHub delivery and review.** Automatically prepare the PR, show the exact local/remote result, accept with a result-bound receipt, and merge through the provider expected-head guard. Handle failed checks and uncertain remote responses without new Task states.
6. **Correction and recovery UI.** Route Request Changes to the same Node, invalidate old evidence, start a new activation, update the same PR, and require new acceptance. Expose Retry, Stop/Continue, Cancel, and durable attention at the relevant scope.

Implement each step through its owning modules rather than having the UI or Runner update domain tables directly. Do not build a standalone generic workflow engine before this loop works.

### Boundary payloads

| Boundary | Minimum input | Durable result |
| --- | --- | --- |
| Owner → Todo | Original Capture or message, request ID | Todo/message ID and ordered sequence |
| Planner → Todo | Source turn, reply, requirement state, optional proposal | Atomic committed reply and processed watermark |
| Owner → Task | Exact preview/Project, proposal identity, confirmation and request ID | One immutable Task plus its control record |
| Task Planner → Orchestrator | Task, current claim, one-Node graph | Immutable Plan and effective pointer |
| Orchestrator → Runner | Dispatch ID, Attempt/claim, context, selected target | Registered process ownership and ordered runtime events |
| Agent → Workspace | Authenticated execution scope, Project resource ID | Workspace ID/path and recorded Git base |
| Agent → Orchestrator | Summary, optional Artifact IDs, request ID, current activation/claim | Recoverable completion operation, then current completion evidence |
| Orchestrator → Delivery | Result manifest/version and repository delivery identity | PR preparation operation and reconciled remote identity |
| Owner → Delivery | Exact result acceptance, request ID | Accepted delivery operation, then completion on confirmed success |

## Stage A acceptance gate

Demonstrate the full flow against an Owner-designated test repository and one real installed CLI. Publishing or merging in that repository requires the corresponding test-run authorization; the design document itself is not authorization to modify a remote repository.

| Exercise | Passing evidence |
| --- | --- |
| Capture several Todos without discussing them | No Planner Attempt exists for capture alone |
| Submit two messages while Planner is busy | Ordered replies; no lost input, duplicated reply, or newer-state overwrite |
| Confirm the same preview from two clients | One Task; second confirmation returns its existing identity |
| Close/reopen browser during Node execution | Same backend execution continues; persisted state/log cursor restores |
| Kill backend after completion intent or Git integration | Recovery finishes once; no duplicated commit/integration or missing completion event |
| Stop execution with a background child process | No successor writes until the old writers are terminated/isolated |
| End Runtime without `complete_node` | BLOCKED with Retry; no false completion |
| Simulate lost PR-create or merge response | Query remote truth before retry; no duplicate PR or invented failure |
| Request Changes after REVIEW | REVIEW while routing, then RUNNING on Rework with no REPLAN_REQUIRED; same Task/Node/PR, new activation; obsolete outputs not current evidence |
| Change PR head after acceptance | Old acceptance cannot merge the changed result |
| Break provider access or required checks | Remain REVIEW with clear delivery failure and recovery action |
| Remove opaque session state before Retry | Current formal data reconstructs a usable execution context |

Use fault injection for exact crash windows and a real-process smoke run for CLI/tool/isolation compatibility. Passing only fake-adapter tests is not sufficient. Stage A does not claim the multi-repository or parallel acceptance cases in module 06 have passed.

## Stage B and V1 completion

After Stage A passes, add a second CLI Adapter and ordered fallback on the same Node, then serial multi-Node dependencies and Rework invalidation. Add confirmed Replan publication before parallel execution. Finally add isolated worktree allocation/integration and multi-repository delivery, exercising their corresponding module-06 failure scenarios.

Plain-Git delivery, the full repository picker, and broader settings/UI can follow the same established command boundaries. These are later implementation slices of the existing V1 design, not excuses to bypass an invariant in Stage A.

## Selected technology and remaining feasibility work

[Technology & Deployment](11-technology-and-deployment.md) fixes React/Vite/TypeScript Web, Fastify/Node.js backend, PostgreSQL/Drizzle, a Go Runner on Linux invoking host-installed CLIs as native processes, and HTTPS/SSE/WSS transports. These are accepted choices, not open language/framework questions.

Before broad implementation, verify PostgreSQL transaction/claim behavior, the native host process-supervision and workspace-permission design, and cross-process protocol generation/validation. Select an actually available Owner-installed host CLI and test its existing authentication, tool calls and lazy workspace access. Configure an authorized GitHub test repository and verify expected-head merge/check behavior. Choose the Owner sign-in and TLS setup before exposing the service.

Concrete tool/package versions are pinned at scaffolding time. A selected stack does not waive any feasibility or fault-recovery acceptance gate.

## Expansion guards required in Stage A

Keep the full collection cardinalities and location-independent IDs even where Stage A accepts one item. Test the control/placement boundary with two fake Runner identities and distinct filesystem roots: Auto must resolve logical Runtime IDs, an existing workspace host must prevent unsupported movement, and a delayed old dispatch must be rejected. Production deployment still uses one Runner. Do not claim these tests prove actual workspace transfer or cross-machine recovery.

A second backend worker against the same database must not double-claim an Attempt, exceed capacity, or concurrently own the same integration/delivery effect. Exercise duplicate and reordered normalized events through the versioned transport. These checks belong in Stage A because process-local shortcuts are expensive to remove later.
