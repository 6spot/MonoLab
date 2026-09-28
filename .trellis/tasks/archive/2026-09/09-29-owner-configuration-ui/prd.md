# Protected Owner configuration UI

## Goal
The Owner can sign in and configure Projects/repositories, reusable Roles, execution targets and GitHub access through a responsive same-origin interface.

## Requirements
- Password login, session restoration, logout and expired-session handling use secure server cookies. Credentials never enter URL or browser persistent storage.
- Projects support create/edit/archive/restore, Owner context, direct Role selection, Git remotes/defaults and authorized GitHub repository selection. Stable IDs/remotes are visibly retained when editing.
- Reusable Roles support instructions, description, hide/restore and optional execution policy. Global/Planner policies allow complete ordered targets and manual model IDs; show actual Runner/installation observations separately from readiness.
- GitHub editor accepts write-only private key and preserves it when omitted. Show safe fingerprint/configuration state and actionable repository-access failures.
- Preserve local drafts across section/record switches. Version conflicts require explicit reload/review; transport uncertainty retains exact command/request ID and exposes recovery. Never optimistically claim persisted success or silently overwrite newer settings.
- Native form labels/validation, keyboard controls, status/error announcements and mobile layout. Secret drafts remain memory-only and clear on logout/success.
- Build and serve the SPA with the existing HTTPS backend; no separate production origin or duplicate schema authority.

## Acceptance
- [x] Browser can sign in, create/edit a Role and Project/repository, set policies/provider metadata, reload persisted data and sign out.
- [x] Auth errors, stale version, lost reply, duplicate submit and per-record draft switches preserve server authority and user input.
- [x] Responsive/keyboard UI and compiled same-origin serving pass browser checks; protocol/database regressions remain green.

## Boundaries and authorization
Owner authorized all routine design/implementation decisions and sequential execution without sub-agents. This leaf owns login/configuration UI, serving and browser-safe schema validation; no Task board/chat, DAG, Runtime install/login, remote publishing or fabricated readiness indicators.
