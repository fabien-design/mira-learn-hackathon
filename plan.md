Plan — Group A Mira Mentors (end-to-end)

 Context

 Group A scope from group-a-mentor/BRIEF.md (must-have, LinkedIn ingestion excluded) needs to be implemented end-to-end on top of the existing scaffolding:

 - 8-step candidacy tunnel /mentors/apply/step-{1..7} + /me/application
 - Admin backoffice /admin/applications + /admin/applications/{id} with per-class validation
 - Public directory /mentors + /mentors/{slug}
 - Backend FastAPI with JSend everywhere, JWT auth (Supabase JWKS), Alembic migration 0003+ for any schema delta
 - LLM: OpenRouter for prod, Ollama (llama3.2) for local dev — single client picking by env var
 - CV PDF parsing via pypdf, files stored on local disk under backend/uploads/
 - Makefile at group-a-mentor/ orchestrating Postgres + backend + frontend

 Existing state (already done in repo): models for all 10 entities, partial schemas, step-1 page (inline styles, will be refactored to Tailwind), mentor_application_service.create_draft/update_step1/review_application, admin list/detail/review endpoints, classes CRUD, revenue simulation, skills read, public mentors
 list/detail. Missing: submit flow + state transitions cascade, CV import endpoints + parsing, AI suggestions service + endpoints, application skills CRUD, profile creation on validate, slug generator, step pages 2-7 + /me/application, admin UI pages, public directory UI pages, Makefile target up/down/..., Ollama client
 switch.

 User decisions:
 - Server PATCH per step (no localStorage)
 - Local disk CV upload + pypdf
 - LinkedIn card: disabled with "Bientôt" tag
 - LLM: env var LLM_PROVIDER (ollama|openrouter), OLLAMA_BASE_URL, model llama3.2
 - Slug: slugify(first-last) + numeric suffix on conflict
 - /mentors server-side filters via query params
 - Tailwind v4 + tokens for new pages, refactor step-1 to match
 - No tests
 - make up: trap-based bash, background pids, prefixed logs
 - Admin: per-class decision UI in detail page
 - AI suggestions: LLM JSON output using declared skills + skill_demand_aggregate
 - Submit: cascades application + linked draft classes to submitted

 Critical files

 Backend (existing, to extend):
 - group-a-mentor/backend/app/services/mentor_application_service.py — extend with update_profile, submit, profile creation on validate, slug helper
 - group-a-mentor/backend/app/api/v1/endpoints/mentor_applications.py — add PATCH /me/profile, /me/links, POST /me/submit, DELETE /me
 - group-a-mentor/backend/app/api/v1/endpoints/admin_applications.py — extend review to handle per-class decisions
 - group-a-mentor/backend/app/api/v1/endpoints/mira_classes.py — already has CRUD + revenue, OK
 - group-a-mentor/backend/app/api/v1/router.py — wire new routers
 - group-a-mentor/backend/app/integrations/openrouter.py — refactor into llm_client.py with provider switch
 - group-a-mentor/backend/app/core/config.py — add LLM_PROVIDER, OLLAMA_BASE_URL, OLLAMA_MODEL, UPLOAD_DIR
 - group-a-mentor/backend/main.py — mount /uploads static

 Backend (new):
 - app/services/cv_import_service.py — upload + pypdf + LLM extraction job
 - app/services/ai_suggestion_service.py — generate via LLM, adopt, reject
 - app/services/mentor_profile_service.py — slug generation, create-on-validate
 - app/services/application_skill_service.py — CRUD application skills
 - app/api/v1/endpoints/cv_imports.py
 - app/api/v1/endpoints/ai_suggestions.py
 - app/api/v1/endpoints/application_skills.py
 - app/api/v1/endpoints/uploads.py (POST multipart for PDF)
 - requirements.txt add: pypdf, python-multipart, python-slugify

 Frontend (existing, to refactor/extend):
 - web/app/mentors/apply/step-1/page.tsx — refactor to Tailwind
 - web/app/mentors/apply/layout.tsx — extend with WizardProgress + WizardFooter shared shell
 - web/lib/api-client.ts — add postForm helper for multipart

 Frontend (new pages):
 - app/mentors/apply/step-{2..7}/page.tsx
 - app/(authenticated)/me/application/page.tsx
 - app/mentors/page.tsx (public directory, SSR with filters)
 - app/mentors/[slug]/page.tsx (public mentor detail)
 - app/admin/applications/page.tsx
 - app/admin/applications/[id]/page.tsx
 - components/wizard/WizardProgress.tsx, WizardFooter.tsx, WizardShell.tsx
 - components/mira-ai/SuggestionsPanel.tsx, CoachSidebar.tsx
 - components/ui/Chip.tsx, Avatar.tsx, Skeleton.tsx, Input.tsx, Textarea.tsx

 Repo root for Group A:
 - group-a-mentor/Makefile — up/down/backend/web/db/migrate/reset-db/install
 - group-a-mentor/backend/alembic/versions/0003_*.py only if a schema delta is needed (none planned — all contracts already covered by 0001)

 Reused utilities (do not duplicate):
 - app/core/responses.success_response/fail_response/error_response (JSend)
 - app/core/auth.require_auth/require_role
 - app/core/exceptions.ConflictError/NotFoundError/ValidationError
 - app/core/db.get_db
 - lib/api-client.apiClient (FE)
 - hooks/useAuth (FE)
 - app/globals.css tokens (--primary, --background, --foreground, font vars)

 Phases

 Phase 1 — Backend foundations (LLM client, uploads, config)

 1. Add deps to requirements.txt: pypdf, python-multipart, python-slugify.
 2. Extend Settings with LLM_PROVIDER, OLLAMA_BASE_URL, OLLAMA_MODEL, UPLOAD_DIR, OPENROUTER_BASE_URL.
 3. Refactor app/integrations/openrouter.py → app/integrations/llm_client.py:
   - LLMClient.complete(messages, model=None, response_format=None) dispatches by settings.LLM_PROVIDER
   - Both providers expose OpenAI-compatible chat completions API (Ollama at ${OLLAMA_BASE_URL}/v1/chat/completions)
   - Keep singleton llm_client
 4. Mount /uploads static dir in main.py. Ensure dir created at startup.
 5. Update .env.example with new vars (no real keys).

 Verify: uvicorn main:app --reload boots, curl /v1/health OK, swagger lists routes.

 Phase 2 — Application service: full state machine + skills + profile

 1. Service: update_profile (bio, journey, transmission_pitch, motivation, linkedin/instagram/website) — only if status=draft. Identity already locked by absence of update_step1 after submit.
 2. Service: submit(user_id):
   - Validates: identity fields non-empty, at least 1 mira_class linked in draft with skills_taught non-empty, ≥1 application_skill row
   - Transitions mentor_application.status: draft→submitted, sets submitted_at
   - Transitions all linked mira_class.status: draft→submitted, sets submitted_at
   - JSend success, returns updated application
 3. Service: delete_my_draft (soft delete, only if status=draft).
 4. New mentor_profile_service.py:
   - generate_unique_slug(db, first, last) — uses python-slugify, query for conflicts, suffix -N
   - create_from_application(db, application) — creates mentor_profile row + copies mentor_application_skill → mentor_profile_skill with top 3 expert/advanced as primary
 5. Extend review_application: on validated, call mentor_profile_service.create_from_application AND respect per-class admin decisions (new param class_decisions: list[{class_id, decision, rejection_reason?}]); flip approved classes to validated_draft, set validated_at; rejected classes go to rejected with reason.
 6. New application_skill_service.py: list_for_user, set_all (PUT semantics replacing all rows), add, remove.
 7. Endpoints in mentor_applications.py:
   - PATCH /me/profile (step 3.2 fields)
   - POST /me/submit
   - DELETE /me
 8. New application_skills.py: GET/PUT/POST/DELETE /v1/mentors/applications/me/skills.

 Verify: Create draft → patch step1 → patch profile → put skills → create class → POST submit → fetch /me shows status=submitted. All return JSend.

 Phase 3 — CV import + LLM extraction

 1. app/api/v1/endpoints/cv_imports.py:
   - POST /v1/mentors/applications/me/cv-imports — multipart/form-data with file (PDF) OR JSON {source_type:"manual_paste", raw_text}. Saves PDF to UPLOAD_DIR/{id}.pdf, sets file_url=/uploads/{id}.pdf, status uploaded. For manual_paste, stores raw_text. Returns import.
   - GET /v1/mentors/applications/me/cv-imports — list.
   - GET /v1/mentors/applications/me/cv-imports/{id} — poll.
   - POST /v1/mentors/applications/me/cv-imports/{id}/extract — synchronous in hackathon: reads PDF via pypdf (if pdf) → builds prompt → calls llm_client.complete(response_format={"type":"json_object"}) → parses to {experiences:[], skills:[]} → sets extracted_*_raw, status extracted, extracted_at, llm_model_used. Sync to
 avoid background-job complexity for the hackathon (BRIEF says "asynchrone" but contract allows internal endpoint; we keep API contract but call the worker route inline).
   - PATCH /v1/mentors/applications/me/cv-imports/{id}/validate — body MentorCVImportValidate, copies into validated_experiences/skills, status validated. Also pushes into mentor_application.bio (append) + mentor_application.professional_journey (replace) + mentor_application_skill rows (upsert,
 validated_via_cv_import=True).
 2. Service cv_import_service.py holds the logic. LLM prompt strictly instructs JSON shape matching ExtractedExperience/ExtractedSkill + the list of known skill slugs from the DB.

 Verify: curl -F file=@cv.pdf .../cv-imports returns id. POST .../extract populates extracted_*. PATCH validate flips status + prefills application.

 Phase 4 — AI class suggestions

 1. ai_suggestion_service.py:
   - generate(db, application, count, exclude_ids) — gather declared skills (with names) + top gap rows from skill_demand_aggregate (ordered by gap_score DESC, limit 10) → prompt → llm_client.complete(response_format=json_object) → parse list of {title, description, skill_ids,
 outline:[{position,title,estimated_duration_hours}], total_hours, format, justification} → compute skill_demand_score (sum of students_wanting_count for the skills) and skill_offer_gap_score (sum of gap_score) → insert MiraClassAISuggestion rows status proposed.
   - adopt(db, suggestion, user) — create MiraClass row (status draft, ai_assisted=True, source_suggestion_id=suggestion.id), insert mira_class_module_outline rows from suggested_outline, set suggestion status=adopted, adopted_into_class_id. Return class.
   - reject(db, suggestion, reason) — status rejected, rejected_reason, rejected_at.
 2. app/api/v1/endpoints/ai_suggestions.py exposes the 5 routes per contract.
 3. Wire module_outline model is already declared; add a quick mira_class_module_outline_service helper for the insert.

 Verify: POST /class-suggestions/generate returns 3 suggestions. POST /{id}/adopt returns new mira_class with outline rows in DB.

 Phase 5 — Frontend wizard shell + step-1 refactor

 1. Create components/wizard/:
   - WizardShell (header, container, progress bar, footer slot)
   - WizardProgress (7 steps, active+done states using bg-[var(--primary)])
   - WizardFooter (back/continue, draft-saved indicator)
 2. Create components/ui/: Chip, Avatar (gradient initials), Skeleton, Input, Textarea. All Tailwind w/ tokens.
 3. Refactor app/mentors/apply/step-1/page.tsx to use shell + Tailwind classes referencing var(--primary), var(--background), var(--foreground), fonts. Behavior unchanged.
 4. Shared client lib/wizard-state.ts exposing useApplication() hook that fetches /v1/mentors/applications/me once and exposes a refresh callback. Steps PATCH on Continue.

 Verify: npm run build passes. npm run dev, login, step-1 renders, fill+continue persists and lands on step-2 (placeholder).

 Phase 6 — Steps 2 → 7

 - Step 2 /mentors/apply/step-2: 3 cards (LinkedIn disabled w/ "Bientôt" pill, CV PDF, Manuel). On select CV PDF → opens file input + uploads → polls extract → routes to step-3 with cv_import_id. Manuel → straight to step-3.
 - Step 3.1 inline within step-3 page: if ?cv_import_id=X, show skeleton "Mira analyse ton profil…" while polling status until extracted, then preview extracted experiences/skills with edit-and-confirm UI → PATCH validate → state ready to render step-3.2.
 - Step 3.2 /mentors/apply/step-3: form bio short (headline 1-liner used as headline), bio long, transmission_pitch, motivation, professional_journey editor (list add/remove), skills picker (autocomplete via /v1/skills?search=), linkedin/instagram/website inputs. PATCH /me/profile + PUT /me/skills on Continue.
 - Step 4 /mentors/apply/step-4: Hit POST /class-suggestions/generate if none exist. Render 3 cards from GET /class-suggestions?status=proposed. Adopt → POST adopt → store class_id in router state. Reject → POST reject + regenerate. Bottom "Proposer la mienne" → POST /me/classes minimal then go step-5.
 - Step 5 /mentors/apply/step-5: For the adopted class id (kept in URL ?class_id=), form total_hours_collective, total_hours_individual, total_hours, rythm_pattern (radio), format_envisaged (radio), target_cities (chips multi-select). PATCH /me/classes/{id}.
 - Step 6 /mentors/apply/step-6: 3 inputs (rate_collective_cents, rate_individual_cents, capacity). On any change POST /v1/mentors/revenue-simulation (debounced) → render gross / fee 25% / net. On Continue, PATCH recommended_price_per_hour_*_cents on the class.
 - Step 7 /mentors/apply/step-7: récap summary cards (read application + class + skills), 2 mandatory checkboxes (conditions, sincerity), POST /me/submit → push /me/application.

 Verify: full demo flow with Emma test user end-to-end ends with status=submitted page.

 Phase 7 — /me/application status page

 - Fetch /v1/mentors/applications/me. Render status badge + decision_reason if rejected. If status=draft/submitted: edit links per step (identity disabled if not draft after submit). If in_review/validated/rejected: read-only.

 Verify: navigate to /me/application for each test persona, status panel reflects DB state.

 Phase 8 — Admin backoffice UI

 - /admin/applications page: SSR-able list, filter chips by status (submitted|in_review|validated|rejected), table rows w/ name/skills/submitted_at/status badge, link to detail.
 - /admin/applications/[id]: full read of application + linked classes (via GET /v1/admin/mentors/applications/{id}/classes). Per-class decision controls (validate/reject + reason). Global decision footer: validate / in_review / reject + global reason. POST /v1/admin/mentors/applications/{id}/review with body {decision,
 decision_reason, class_decisions:[...]}.
 - Backend already lists/details; extend body schema to accept class_decisions.

 Verify: login as admin@hackathon.test, see Emma's submitted application, validate → mentor_profile row created with slug emma-rossi, classes flip to validated_draft.

 Phase 9 — Public directory + mentor detail

 - /mentors SSR page: hero recrutement copy from template, filter form (skill_id select fed by /v1/skills, sort dropdown, search input) → reflected in URL query params, fetch /v1/mentors?.... Grid of MentorCard components using Avatar + chips for primary skills + rating + classes_given.
 - /mentors/[slug] SSR page: fetch /v1/mentors/{slug} and /v1/mentors/{slug}/classes. Render hero (display_name, headline, avatar), bio, journey timeline, social links, proposed classes section. Empty state when no class published yet.

 Verify: anonymous browsing of /mentors shows seeded profiles; click into Antoine Martin shows his classes.

 Phase 10 — Makefile + final polish

 group-a-mentor/Makefile targets:

 .PHONY: up down backend web db migrate reset-db install

 up:
        @docker compose up -d
        @mkdir -p logs
        @( cd backend && . .venv/bin/activate && uvicorn main:app --reload --port 8000 2>&1 | sed 's/^/[backend] /' ) & echo $$! > .pids.backend
        @( cd web && npm run dev 2>&1 | sed 's/^/[web]     /' ) & echo $$! > .pids.web
        @trap 'kill $$(cat .pids.backend) $$(cat .pids.web) 2>/dev/null; rm -f .pids.*; docker compose stop' INT TERM; wait

 down:
        -@kill $$(cat .pids.backend 2>/dev/null) $$(cat .pids.web 2>/dev/null) 2>/dev/null; rm -f .pids.*
        docker compose down

 backend:
        cd backend && . .venv/bin/activate && uvicorn main:app --reload --port 8000

 web:
        cd web && npm run dev

 db:
        docker compose up -d postgres

 migrate:
        cd backend && . .venv/bin/activate && alembic upgrade head

 reset-db:
        docker compose down -v && docker compose up -d && sleep 3 && $(MAKE) migrate

 install:
        cd backend && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt -r requirements-dev.txt
        cd web && npm install

 Polish pass: ensure no any in TS, no hardcoded hex outside globals.css, all responses JSend, atomic conventional commits per phase, no Claude attribution in commits/PR.

 Verification (end-to-end)

 1. cd group-a-mentor && make install && make reset-db && make up — services boot, logs prefixed.
 2. curl http://localhost:8000/v1/health → JSend success.
 3. docker exec pg-hackathon-group-a psql -U postgres -c "\d mentor_application" — schema unchanged.
 4. Browser: login as emma.rossi@hackathon.test → walk steps 1→7 (CV upload, AI suggestions, format, revenu, submit). Expect /me/application status=submitted.
 5. Browser: login admin@hackathon.test → /admin/applications shows Emma submitted → open detail → validate (1 class validate, 1 reject) → POST review returns 200.
 6. Browser anonymous: /mentors lists Emma's profile with slug emma-rossi. /mentors/emma-rossi shows class. Class status in DB = validated_draft.
 7. npm run build (web) and python -m compileall app (backend) — zero errors.
 8. grep -RIn "Claude" group-a-mentor should not match commits/PR templates.

 Out of scope this run

 - LinkedIn URL ingestion path
 - Stripe / payment
 - Email notifications
 - Mentor self-service profile editor beyond what exists
 - nice-to-have items from BRIEF
 - Test suite