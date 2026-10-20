# Baseline Audit Report - Eliza Infotech CCTV CRM & ERP
**Date:** 2026-10-20  
**Repository Branch:** `release/production-hardening`  
**Application Stack:** Vite 6.0, Vanilla ES Modules, Chart.js 4.5, Supabase JS Client 2.118, Vitest 5.0.5

---

## 1. Executive Summary & Inventory
This audit evaluates the codebase to establish a baseline before production hardening, legacy asset removal, Supabase multi-tenant backend integration, Developer Tools console, and Cloudflare Pages deployment.

### File Inventory & Classification Table

| File / Path | Size | Classification | Rationale & Evidence |
|---|---|---|---|
| `CCTV_Business_Pro_Enterprise_ERP.xlsx` | 43.7 KB | **Legacy Artifact** | Standalone spreadsheet model. Verified 0 imports/fetches in `/src`. Target for Phase 1 archive. |
| `Enterprise CCTV Business ERP & Quotation System (.xlsx).pdf` | 92.0 KB | **Legacy Document** | Manual documentation PDF. Not referenced in code. Target for Phase 1 archive. |
| `Enterprise CCTV Business ERP & Quotation System.pdf` | 92.0 KB | **Legacy Document** | Duplicate manual PDF. Not referenced in code. Target for Phase 1 archive. |
| `dossier_analysis.txt` | 49.1 KB | **Legacy Offline Data** | Text analysis of Panipat/Sonipat tenders; all seed records migrated into `initialData.js`. Target for Phase 1 archive. |
| `dossier_analysis_utf8.txt` | 24.7 KB | **Legacy Offline Data** | UTF-8 conversion of dossier analysis. Target for Phase 1 archive. |
| `dossier_text.txt` | 62.1 KB | **Legacy Offline Data** | Raw text extracts. Target for Phase 1 archive. |
| `extract_catalog_parties.py` | 2.0 KB | **Legacy Python Script** | Offline parser used during prototype data extraction. Target for Phase 1 archive. |
| `generate_cctv_erp.py` | 98.0 KB | **Legacy Python Script** | OpenPyXL workbook generator. Target for Phase 1 archive. |
| `generate_pdf_manual.py` | 0 B | **Legacy Python Script** | Empty/scratch PDF generator. Target for Phase 1 archive. |
| `parsed_docs.json` | 76.6 KB | **Legacy Offline Data** | Extracted JSON dump. Verified all party/catalog items exist in `src/data/initialData.js` and `src/store/db.js`. Zero frontend imports. Target for Phase 1 archive. |
| `index.html` | 1.4 KB | **Used by running app** | Vite HTML shell, meta headers, Google Fonts preconnects, mount target `#app`. |
| `package.json` | 389 B | **Used by running app** | Package metadata, build/test scripts, production and dev dependencies. |
| `package-lock.json` | 49.3 KB | **Used by running app** | NPM dependency lockfile. |
| `vitest.config.js` | 156 B | **Used by running app** | Automated test runner configuration. |
| `src/` (All modules) | ~550 KB | **Used by running app** | Core ERP UI, services, data layers, styles, and stores. |
| `test/` (7 test files) | ~70 KB | **Used by running app** | 83 passing automated unit/integration tests. |
| `supabase/schema.sql` | 7.5 KB | **Used by running app** | Baseline SQL DDL definitions for multi-tenant ERP migration. |

---

## 2. Runtime & Security Baseline

### Dependency Audit (`npm audit`)
- **Status:** PASS
- **Vulnerabilities:** 0 vulnerabilities detected (`found 0 vulnerabilities`).

### Bundle Size Baseline (`npm run build`)
```
dist/index.html                     1.52 kB │ gzip:   0.79 kB
dist/assets/index-CH52ve67.css     33.24 kB │ gzip:   6.74 kB
dist/assets/index-D-_n-EMO.js   1,463.95 kB │ gzip: 348.44 kB (single unchunked bundle)
```
- **Observations:** Bundle size is currently 1.46 MB uncompressed (348 KB gzip). Chart.js and heavy modules are bundled synchronously into a single chunk. Code-splitting and lazy loading will be applied in Phase 6.

### LocalStorage Keys in Current Use
1. `ELIZA_CCTV_STORE_V1` - Main ERP state (company info, items, projects, quotations, leads, inventory).
2. `ELIZA_PERIOD_FILTER_V1` - Global date range and period picker state.
3. `ELIZA_DB_MIGRATED_V1` - Database seed version flag.
4. `ELIZA_ACTIVE_COMPANY_ID` - Current active tenant identifier.
5. `ELIZA_ERP_PRE_RESET_BACKUP` - Mandatory pre-wipe automated safety snapshot.
6. `ELIZA_RESET_V1_DONE` - Clean-slate migration completion flag.
7. `ELIZA_CURRENT_USER` - Authenticated user session profile.
8. `ELIZA_CUSTOM_PERMISSIONS_V1` - Dynamic RBAC matrix overrides.
9. `ELIZA_PEOPLE_UNIFIED_V1` - Single source of truth workforce directory.
10. `ELIZA_READ_NOTIFS` - Notification read tracking IDs.
11. `ELIZA_LOGIN_ATTEMPTS_V1` - Local rate limiter and account lockout ledger.
12. `ELIZA_SESSIONS_V1` - Mock active session registry.
13. `theme` - Light / Dark UI mode preference.

### Auth & RBAC Checkpoints
- **Service Layer:** `src/services/auth.js` (`getCurrentUser()`, `isSuperAdmin()`, `hasPermission()`, `quickLoginAs()`, `login()`, `logout()`).
- **Permission Matrix:** `src/config/permissions.js` defines 8 roles: `SUPER_ADMIN`, `ADMIN`, `SUPERVISOR`, `ACCOUNTS`, `SALES_EXEC`, `TECHNICIAN`, `HELPER`, `VIEWER`.
- **Dynamic RBAC Evaluation:** `src/services/permissionService.js` (`can()`, `togglePermission()`).
- **Hard Security Safeguards:** `src/services/peopleService.js` blocks self-demotion, self-suspension, non-admin role escalation, and deletion of the last Super Admin.
- **UI Gating:** `src/components/Sidebar.js` filters modules according to `auth.hasPermission()`. `src/modules/admin-users/AdminUsersModule.js` is restricted strictly to Super Admin.
- **Workflow Constraints:** `src/services/jobService.js` prevents technician direct verification; `src/services/ledgerService.js` enforces Super Admin / Supervisor payment authorization.

---

## 3. Identified Technical Debt & Risks
1. **Unchunked Bundle:** Large initial JS bundle (>1.4 MB) impacts low-bandwidth mobile initial load.
2. **Third-party Font Dependency:** `index.html` loads fonts from `fonts.googleapis.com` and `fonts.gstatic.com`. Needs self-hosting for strict CSP compliance.
3. **Local-only Storage:** App relies on `localStorage` adapters; ready for Supabase multi-tenant cloud persistence via `dataAdapter`.
4. **Secrets in Memory / Dev Code:** Verified zero hardcoded production API secrets in repository; environment configuration will be strictly managed via `.env` and Phase 4 console.
