# Taplo - Product Requirements Document

## Product
**Taplo** — SaaS candidate nurturing tool for recruiters. Keeps candidates warm through personalised follow-up emails.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI + Phosphor Icons
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **AI**: Emergent LLM Key (GPT-5.2) via emergentintegrations library
- **Auth**: JWT (bcrypt hashing, httpOnly cookies)

## User Personas
1. **Recruiters** (primary) — manage candidate pipeline, generate follow-ups
2. **Admin** — full access, seeded on startup

## Core Requirements
- Dark UI with Coral (#F97B5C) + Blue (#4E9BE8) branding
- Fonts: Sora (headings) + DM Sans (body)
- Landing page with waitlist signup
- Candidate pipeline grouped by: Silver Medallist, Not Ready Yet, Pipeline, Offer Declined
- AI follow-up message generator (opens mailto: link)
- Warmth indicator per candidate
- Daily digest view
- GDPR consent toggle

## What's Been Implemented (2026-04-14)
- [x] Landing page with waitlist form, Hero, Problem, How it Works, Features, Footer
- [x] Auth system (register, login, logout, me, refresh)
- [x] Admin seeding on startup
- [x] Candidate CRUD (create, list, get, update, delete)
- [x] Pipeline view with tab filtering (All, Silver Medallist, Not Ready Yet, Pipeline, Offer Declined)
- [x] Add Candidate dialog with group/reason selectors, GDPR consent toggle
- [x] AI follow-up message generation (GPT-5.2 via Emergent LLM key)
- [x] Follow Up dialog with copy + mailto: send
- [x] Warmth scoring (Hot/Warm/Cool/Cold based on last contact)
- [x] Follow-up schedule calculation per group
- [x] Daily Digest page (due today, going cold, stats)
- [x] Stats page (total, groups, warmth distribution)
- [x] Sidebar navigation
- [x] Protected routes with auth context
- [x] **Teamtailor Integration** (2026-04-14)
  - Full API client (EU region: api.teamtailor.com)
  - Connect/disconnect with API key validation
  - Full sync: candidates, jobs, stages, job-applications, custom fields
  - Paginated JSON:API parsing
  - Auto-sync on dashboard load (when connected, every 1 hour)
  - Manual sync button
  - Import selected TT candidates into Taplo pipeline with group/reason
  - GDPR consent filtering (only candidates with consent are importable)
  - "Already imported" tracking to prevent duplicates
  - Teamtailor settings page with connection status, sync results, candidate/jobs browser
  - TT badge on imported candidate cards
  - "Import from TT" button on Pipeline page (when connected)

## Bug Fixes
- [x] **LinkedIn empty-email duplication bug** (2026-04-20) — `POST /api/extension/push-candidate` now skips the email dedup check when the incoming email is blank. Previously every LinkedIn push (no email exposed) matched the first empty-email candidate and overwrote it. Candidates with email are still deduped per-user as before. Verified with backend curl tests.

## Feature: Fixed Role Categories (2026-04-20)
- 13 predefined role categories replacing free-text roles: Backend Developer, Frontend Developer, Fullstack Developer, Architect, Infrastructure, DevOps, Data, Automation, Manufacturing, Sales, Manager, Project Leader/Manager, Economic.
- Chrome Extension (V1 DOM + V2 AI): "Role" text input replaced with a required Role Category `<select>`. Users pick the category instead of the extension auto-filling it. Push validation blocks submit until a category is chosen.
- Dashboard `All Roles` filter lists all 13 categories (merged with any legacy free-text roles for backwards compatibility).
- Add/Edit Candidate dialogs now use the same category dropdown; Edit dialog preserves any legacy free-text role via a "(legacy)" option so old records stay editable.
- Pipeline search now also matches `notes` content (so searching "Python" surfaces candidates whose notes contain programming languages). Placeholder updated to "Search name, role, email, or notes…".
- Shared constant at `frontend/src/constants/roleCategories.js`.

## Feature: Team Members / Workspaces (2026-05-03)
- Email-invite team flow powered by Resend. Owner sends invite → recipient clicks link → sets name+password → joins workspace as `member`.
- Roles: `owner` (creator of the workspace) + `member`. Single-tier permissions.
- Candidates are now scoped to a `workspace_id`. All workspace members see the full pool. Edit/Delete is restricted to the original creator (HTTP 403 otherwise).
- Each teammate has their own Chrome Extension key; pushes go into the shared workspace pool with `created_by`/`created_by_name`.
- Only the owner can invite, resend, cancel, or remove teammates. Owner cannot remove themselves or another owner.
- Backend changes: `users.workspace_id` + `users.team_role`, `candidates.workspace_id` + `candidates.created_by_name`, new `invitations` collection. Startup migration backfills legacy users (workspace_id = own _id, team_role = "owner") and legacy candidates (workspace_id from creator).
- `/auth/me`, `/auth/login`, `/auth/register` now return `team_role` and `workspace_id`.
- New endpoints: `GET/POST /api/team/members|invite|invitations`, `POST/DELETE /api/team/invitations/{id}/resend|delete`, `DELETE /api/team/members/{id}`, public `GET/POST /api/invitations/{token}|/accept`.
- Frontend: new `/dashboard/team` page (owner sees invite form + pending invites + remove member; member sees roster only) and public `/invite/:token` accept page. CandidateCard hides Edit/Delete and shows "by {teammate name}" for cards that aren't yours.
- Auth precedence reversed: `Authorization: Bearer` now wins over the access_token cookie (avoids stale-cookie identity confusion).
- Tests: `/app/backend/tests/test_team_workspace.py` — 28/28 passing.

## Prioritized Backlog
### P0 (Next)
- Gmail/Outlook integration for actual email sending
- Daily digest email delivery

### P1
- Gmail/Outlook integration for actual email sending
- Daily digest email delivery
- Candidate search & filtering improvements
- Bulk candidate actions

### P2
- Pricing page with Stripe integration (Starter/Growth/Agency tiers)
- Team management (multi-seat)
- Activity log per candidate
- Email open/reply tracking
- Export candidate data
