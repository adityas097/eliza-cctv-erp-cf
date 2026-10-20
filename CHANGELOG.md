# Changelog - Production Hardening Runbook
All notable changes to the Eliza Infotech CCTV CRM & ERP system will be documented in this file.

## [Modern Free Plan Integrations & Supabase Publishable Key] - 2026-10-20
### Added & Updated
- **Supabase Free Plan Modernization:**
  - Added `normalizeSupabaseUrl()` to auto-resolve both 20-character Project Reference IDs (`abcdefghijklmnopqrst` -> `https://abcdefghijklmnopqrst.supabase.co`) and raw URLs.
  - Added first-class support for `VITE_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`) with backward compatibility for legacy `VITE_SUPABASE_ANON_KEY` (`eyJ...`).
  - Added clear UI/docs guidance indicating where to locate the modern Publishable Key and the **Legacy API Keys** tab (`Project Settings > Data API > Legacy API Keys`).
- **Developer Tools Free-Tier Catalog Alignment:**
  - **Firebase Cloud Messaging (Spark Free Tier):** Updated configuration to FCM v1 with Web Push Certificates (VAPID key) replacing deprecated legacy server keys.
  - **Google Cloud OAuth (Free Tier):** Unlimited web authentication with updated redirect URI helper (`https://<project-ref>.supabase.co/auth/v1/callback`).
  - **Transactional Email (Resend & Brevo Free Tiers):** Supported Resend (3,000 free emails/mo) and Brevo (300 free emails/day) with clear setup guides.
  - **WhatsApp Business Cloud API (Meta Free Tier):** Documented 1,000 free customer-service conversations every month via Meta Cloud API.
  - **Oracle Cloud (Always Free Tier):** Documented 20 GB free Object Storage in Mumbai (`ap-mumbai-1`) + 2 Compute VMs for automated DR.
  - **Cloudflare Pages (Free Plan):** Documented unlimited bandwidth, DDoS protection, and automated SSL/TLS certificates.
- **Documentation & Tests:**
  - Fully updated [`docs/OWNER_SETUP_GUIDE.md`](file:///d:/CCTV%20Excel%20CRM/docs/OWNER_SETUP_GUIDE.md), [`.env.example`](file:///d:/CCTV%20Excel%20CRM/.env.example), and [DeveloperToolsModule.js](file:///d:/CCTV%20Excel%20CRM/src/modules/developer/DeveloperToolsModule.js).
  - Added unit tests in `test/developer-console.test.js` validating URL normalization and free tier metadata (138 tests passing).

## [Hotfix: Modal & Popup Viewport Centering] - 2026-10-20

### Fixed
- Fixed critical CSS bug where modal containers using `.modal-backdrop` lacked fixed viewport positioning, causing auth/sign-in popups and developer modals to render statically at the bottom of the page (`top: 1836px`) outside the visible viewport.
- Standardized universal `.modal-overlay`, `.modal-backdrop`, `.modal-backdrop.active`, and `#authModalOverlay` styles with `position: fixed !important; inset: 0 !important; z-index: 10050 !important;` and flexbox viewport centering.
- Constrained `.modal-card` and `.modal-dialog` with `max-height: 90dvh`, `margin: auto !important`, and scrollable `.modal-body` to prevent vertical clipping on mobile and small tablet screens.
- Verified live in headless Chromium browser: Sign In popup, New Organization tab, and Password Recovery tab render perfectly centered inside the viewport with clean dismissal.

## [Phase 11: Owner Setup Guide (Plain Language)] - 2026-10-20
### Added
- Authored `docs/OWNER_SETUP_GUIDE.md` designed specifically for a non-developer business owner:
  - Step 1: Click-by-click Supabase cloud creation in AWS Mumbai (`ap-south-1`) with 1-line migration deployment.
  - Step 2: Google Cloud Console OAuth 2.0 configuration with 1-click clipboard redirect URI helper and write-only secrets entry.
  - Step 3: Cloudflare Pages git connection, build parameters, environment variables, and automated SSL issuing.
  - Step 4: Super Admin first login, TOTP two-factor authentication, and 100/100 Security Center validation.
  - Step 5: Optional provider integrations (Firebase Cloud Messaging push, WhatsApp Cloud API, SMTP, Oracle DR).
  - Step 6: Monthly maintenance routines and 30-second emergency 1-click Cloudflare rollback steps.
  - Highlighted "Never Do This" security guardrails (never commit secrets, never paste keys into chat/screenshots, never disable RLS).

## [Phase 10: Final Pre-Launch Verification Checklist] - 2026-10-20
### Added
- Authored comprehensive pre-flight verification audit in `docs/LAUNCH_REPORT.md` confirming 100% green status across all 11 phases:
  - Security gates: All 13 tables RLS default-deny verified, 0 secret exposures, gitleaks clean, strict CSP/HSTS headers live.
  - Quality gates: 136 tests passing across 14 test suites, clean production build with index bundle at 232.41 kB gzip (< 250 KB budget).
  - Operations gates: Automated Oracle off-site backups with AES-256 GPG, RPO <= 24h, RTO <= 4h, DPDP legal compliance active.

## [Phase 9: CI/CD Pipeline & Cloudflare Pages Deployment] - 2026-10-20
### Added
- Created `.github/workflows/ci-deploy.yml` configuring an automated 3-stage GitHub Actions pipeline:
  1. `test-and-audit`: Dependency audit, 136-test automated suite execution, and production build verification.
  2. `deploy-staging`: Staging preview deployments for pull requests via Cloudflare Pages Action.
  3. `deploy-production`: Automatic forward-compatible Supabase migration push and production deployment from `main`.
- Created `public/_routes.json` optimizing Cloudflare Pages edge routing for static assets and client-side single-page application navigation.
- Added `test/ci-cd-deployment.test.js` validating workflow security gates, staging/production segregation, and Cloudflare configuration (136 total tests passing).

## [Phase 8: Backups & Disaster Recovery] - 2026-10-20
### Added
- Created `scripts/oracle_backup_sync.sh` implementing automated off-site database backups to Oracle Cloud Object Storage with AES-256 GPG encryption, daily/monthly rotation policies, and failure webhook alerting.
- Created `supabase/functions/database-backup/index.ts` providing automated on-demand database snapshot generation and audit log tracking.
- Formalized Disaster Recovery (DR) protocols in `docs/RUNBOOK.md` with explicit RPO <= 24h, RTO <= 4h targets, and step-by-step monthly staging restore drill instructions.
- Added `test/backup-dr.test.js` validating backup script invariants, Edge Function orchestration, and DR runbook documentation (134 total tests passing).

## [Phase 7: Production Readiness, Observability & Documentation] - 2026-10-20
### Added
- Created `src/services/errorHandler.js` implementing a global error boundary, Sentry-compatible event logging, correlation ID generation, and automatic PII/secret scrubbing.
- Added environment badge indicator in `src/components/Navbar.js` displaying active environment status (Development/Staging/Production).
- Created `src/modules/legal/LegalPagesModule.js` delivering statutory Privacy Policy, Terms of Service, and India Digital Personal Data Protection (DPDP) Act 2023 compliance.
- Injected `<meta name="robots" content="noindex, nofollow">` in `index.html` safeguarding authenticated ERP operations from search engine indexing.
- Created complete enterprise documentation suite:
  - `README.md`: System capabilities, tech stack, and developer instructions.
  - `docs/ARCHITECTURE.md`: Technical topology, adapter interfaces, and multi-tenant RLS schema.
  - `docs/RUNBOOK.md`: Incident response SLAs, Cloudflare rollback procedure, and monthly DR drill instructions.
  - `docs/SECURITY.md`: Zero-trust architecture, CSP policy, and input validation boundaries.
- Added `test/production-readiness.test.js` validating error capturing, SEO noindex enforcement, and documentation completeness (131 total tests passing).

## [Phase 6: Responsiveness, Mobile QA & PWA Support] - 2026-10-20
### Added
- Implemented full PWA suite with `public/manifest.webmanifest`, branded 192/512 maskable SVG icons in `public/icons/`, `public/offline.html`, and secure service worker `public/sw.js` with zero authenticated API caching.
- Enforced mobile viewport resilience in `index.html` with `viewport-fit=cover`, theme-color, and standalone PWA display tokens.
- Modernized CSS architecture in `src/styles/main.css` using `100dvh` units for viewport height stability, notch-safe area insets (`env(safe-area-inset-*)`), and body scroll locks (`body.sidebar-drawer-open`) during active mobile drawer states.
- Enhanced table responsiveness with sticky first columns and zero horizontal body scroll leak.
- Added touch-friendly Kanban horizontal snap-scroll (`scroll-snap-type: x mandatory`) and wired up quick-move dropdown selector on Kanban cards in `src/modules/kanban/JobBoardModule.js`.
- Prevented automatic iOS input zoom with 16px minimum font size on mobile inputs, select boxes, and textareas.
- Added ESC key handler and backdrop tap dismissal for mobile off-canvas drawer in `src/main.js` and `src/components/Navbar.js`.
- Added `test/responsive-mobile-qa.test.js` validating viewport tokens, safe-area insets, touch ergonomics, PWA manifest integrity, and service worker security (128 total tests passing).

## [Phase 5: Authentication, SSO & Sessions] - 2026-10-20
### Added
- Implemented Google Single Sign-On (`signInWithGoogle`) in `src/services/auth.js` connecting Supabase OAuth with local tenant profile reconciliation.
- Added Google SSO button, password visibility toggle (`show/hide`), and Cloudflare Turnstile bot protection badge in `src/components/AuthModal.js`.
- Implemented brute-force protection with exponential account lockout (max 5 failed attempts per 15-minute window) and dynamic attempt warnings.
- Added session security controls: 30-minute idle session timeout tracker with automatic logout and warning notifications.
- Added immediate session revocation and login block for suspended/deactivated staff members.
- Added `test/auth-sso-sessions.test.js` validating Google SSO flow, account lockout mechanisms, suspended user blocking, and password recovery (117 total tests passing).

## [Phase 4: Developer Tools & Integrations Console] - 2026-10-20
### Added
- Created `src/modules/developer/DeveloperToolsModule.js` featuring 8 apex governance consoles:
  - **Integrations Hub**: Live status cards for Supabase, Google SSO, Firebase FCM, SMTP, WhatsApp API, Cloudflare, and Oracle Disaster Recovery.
  - **Setup Wizard**: 5-step guided go-live stepper with 1-click clipboard URI copy helpers.
  - **Environment & Health**: Real-time telemetry, commit SHA (`6ba7220`), API latency, and 99.98% uptime tracking.
  - **Security Center**: Automated DPDP and security posture compliance checker with 100/100 score.
  - **Domain & CORS Helper**: Authorized redirect URIs and cross-origin helper.
  - **Backup & Disaster Recovery**: Encrypted backup export and migration dry-run engine.
  - **Feature Flags**: Dynamic tenant capabilities and maintenance mode toggles.
  - **Security Logs**: Redacted token and activity audit log.
- Created `src/services/integrationsService.js` enforcing the **Write-Only Secrets Security Model** where API secrets are masked (`••••last4`), encrypted, and never leaked back to the browser.
- Added Developer Tools nav-item to `src/components/Sidebar.js` under `ADMINISTRATION` restricted exclusively to Super Admin.
- Added strict route guard in `src/services/permissionService.js` and `src/main.js` returning 403 Access Denied for non-Super-Admin roles.
- Added `test/developer-console.test.js` covering 403 route blocking, write-only secret security, and feature flags (all 112 tests passing).

## [Phase 3: Backend, Auth & Multi-Tenant Foundation (Supabase)] - 2026-10-20
### Added
- Created versioned SQL migrations in `supabase/migrations/`:
  - `20261020000000_multi_tenant_schema.sql`: Multi-tenant organizations, profiles, people, parties, items, jobs, tickets, ledger, payouts, quotations, and audit tables with indexes.
  - `20261020000001_rls_policies.sql`: Strict RLS policies with default-deny, cross-tenant isolation, technician payout/ledger privacy, and admin-only integrations access.
  - `20261020000002_business_functions.sql`: Atomic Postgres functions `verify_field_job` and `clean_slate_reset_org`.
- Introduced clean adapter architecture in `src/services/adapters/`:
  - `dataAdapter.js`: `DataAdapter` interface with `SupabaseDataAdapter` and `LocalDataAdapter` fallback.
  - `storageAdapter.js`: `StorageAdapter` interface with `SupabaseStorageAdapter` and `LocalStorageAdapter` fallback.
  - `notifyAdapter.js`: `NotifyAdapter` interface with `InAppNotifyAdapter`.
- Created `src/services/dataImporter.js` for dry-run analysis and idempotent migration from localStorage to Supabase cloud.
- Created `test/multi-tenant-rls.test.js` covering cross-tenant boundaries, technician payout isolation, and unauthenticated denial (all 105 tests passing).

## [Phase 2: Security Hardening (Code Level)] - 2026-10-20
### Added
- Added `.env.example` documenting all client-side and server-side environment variables.
- Created `src/services/security.js` with `escapeHtml`, `sanitizeHtml` (DOMPurify with headless fallback), `maskSecret`, and `redactSensitiveData`.
- Created `src/services/validationService.js` with strict statutory rules for Email, Indian Phone, GSTIN, PAN, Dates, and Amounts.
- Created `public/_headers` (Cloudflare Pages) with Strict-Transport-Security, CSP, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, and 1-year immutable asset caching.
- Created `public/.htaccess` with HTTPS rewrite, SPA routing, and security headers for Apache/Hostinger/MilesWeb hosting.
- Configured `vite.config.js` with `build.sourcemap = false` and vendor chunk splitting (`vendor-charts`, `vendor-supabase`, `vendor-sanitizer`).
- Added `test/security-validation.test.js` with 16 comprehensive unit tests covering XSS sanitization and input validation.

### Changed
- Pinned exact production dependency versions in `package.json` and added `security:audit` script.
- Verified 0 vulnerabilities in `npm audit --omit=dev`.

## [Phase 1: Backup & Remove Legacy Excel Version] - 2026-10-20
### Added
- Created off-site legacy backup directory `D:\eliza-erp-legacy-backup\`.
- Created verified SHA256 checksums `SHA256SUMS.txt` and asset catalog `MANIFEST.txt`.
- Created verified compressed archive `legacy-excel-backup_2026-10-20.zip` (integrity confirmed via automated expansion and hash verification).
- Added `.gitignore` with strict patterns excluding `.xlsx`, `.zip`, `dossier*`, `legacy*`, and environment files.

### Removed
- Removed 10 legacy files from app root:
  - `CCTV_Business_Pro_Enterprise_ERP.xlsx`
  - `Enterprise CCTV Business ERP & Quotation System (.xlsx).pdf`
  - `Enterprise CCTV Business ERP & Quotation System.pdf`
  - `dossier_analysis.txt`
  - `dossier_analysis_utf8.txt`
  - `dossier_text.txt`
  - `extract_catalog_parties.py`
  - `generate_cctv_erp.py`
  - `generate_pdf_manual.py`
  - `parsed_docs.json`

## [Phase 0: Baseline Audit] - 2026-10-20
### Added
- Completed initial codebase inventory and baseline evaluation in `docs/AUDIT_REPORT.md`.
- Initialized git branch `release/production-hardening`.
