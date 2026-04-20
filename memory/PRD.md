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
