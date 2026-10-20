# System Architecture & Technical Specification

**Eliza Infotech CCTV CRM & ERP System**  
*Document Version:* 2.0 (Production Release)  
*Target Infrastructure:* Cloudflare Pages (Frontend) + Supabase (Backend/Database) + Google Cloud (SSO) + Oracle Cloud (Disaster Recovery)

---

## 1. High-Level Architecture Topology

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT DEVICES                                    |
|   Desktop Chrome/Edge          Mobile iOS Safari             Android Chrome PWA   |
+-----------------------------------------------------------------------------------+
                                          |
                                          | HTTPS / TLS 1.3 (Strict CSP, HSTS, WAF)
                                          v
+-----------------------------------------------------------------------------------+
|                           CLOUDFLARE PAGES EDGE NETWORK                           |
|   - Global CDN & DDoS Protection                                                  |
|   - Security Headers (_headers): CSP, COOP, Referrer-Policy, nosniff, DENY        |
|   - Static Asset Caching (1 year immutable for hashed JS/CSS/Fonts)               |
|   - SPA Fallback Routing (/* -> /index.html 200)                                  |
+-----------------------------------------------------------------------------------+
                                          |
                      +-------------------+-------------------+
                      |                                       |
                      v                                       v
+-------------------------------------------+ +-------------------------------------+
|        SUPABASE CLOUD (MUMBAI REGION)     | |        GOOGLE CLOUD PLATFORM        |
|  - Postgres 15+ Relational Database       | |  - OAuth 2.0 Client Credentials     |
|  - Row-Level Security (RLS) Default Deny  | |  - Google Identity SSO Provider     |
|  - Supabase Auth (JWT & Session Tokens)   | +-------------------------------------+
|  - Encrypted Secrets Vault                |
|  - Edge Functions (Write-Only Secrets)    |
|  - Storage Buckets (Private Job Evidence) |
+-------------------------------------------+
                      |
                      | Automated Nightly Encrypted Dump
                      v
+-----------------------------------------------------------------------------------+
|                     ORACLE CLOUD INFRASTRUCTURE (ALWAYS FREE)                     |
|   - Off-Site Object Storage (30-day retention)                                    |
|   - Automated pg_dump verification and cold storage replication                   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Frontend Layer (Vanilla JS ES Modules + Vite)

### Design Philosophy
- **Zero Framework Bloat:** High performance and minimal footprint built with native DOM APIs, Web Components, and modular ES modules.
- **Code Splitting:** Manual chunking configured in `vite.config.js`:
  - `vendor-charts`: Chart.js core and controllers.
  - `vendor-supabase`: Supabase JavaScript client SDK.
  - `vendor-sanitizer`: DOMPurify XSS mitigation engine.
  - `index`: Core application logic, routing, and module controllers (< 250 KB gzip budget).

### Adapter Architecture
To maintain high modularity and prevent hard vendor lock-in, client views interact with clean abstract adapters:
- `DataAdapter`: Polymorphic interface with `SupabaseDataAdapter` (live production) and `LocalDataAdapter` (in-memory demo).
- `StorageAdapter`: S3-compatible cloud storage operations with presigned temporary URLs.
- `NotifyAdapter`: Toast, modal, and push notification abstraction.

---

## 3. Database Layer & Multi-Tenant Schema

### PostgreSQL Core Schemas
The database contains 13 relational entities structured for multi-tenant isolation:
1. `organizations`: Tenant companies (e.g., Eliza Infotech).
2. `app_settings`: Tenant runtime preferences and configuration.
3. `integrations`: External provider credentials stored write-only with masked display.
4. `profiles`: User account identities mapped to Supabase Auth UUIDs.
5. `people`: Unified workforce directory (employees, technicians, supervisors).
6. `parties`: CRM clients, contractors, and supply vendors.
7. `items`: Equipment master catalog (CCTV cameras, NVRs, HDDs, cables, connectors).
8. `jobs`: Field installation work orders, points counts, and checklists.
9. `tickets`: AMC and breakdown service requests with SLA clocks.
10. `ledger`: Double-entry accounting transaction entries.
11. `payouts`: Piece-rate technician earnings and wage settlements.
12. `quotations`: Sizing specifications and GST BOQ documents.
13. `audit_logs`: Tamper-evident forensic security event stream.

---

## 4. Multi-Tenant Row Level Security (RLS)

Every table has Row-Level Security activated with a mandatory default-deny stance:
```sql
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
```

### Isolation Invariants
1. **Tenant Separation:** All queries filter by `org_id = current_user_org_id()`.
2. **Technician Privacy:** Field technicians can only view job sheets where they are assigned, and their own payout ledgers. They are blocked from viewing company-wide revenue, vendor margins, or other technicians' compensation.
3. **Admin Exclusivity:** Developer tools and integration secret management endpoints return HTTP 403 Forbidden for all non-Super-Admin roles.

---

## 5. Security Model: Write-Only Secrets Vault

```
[Browser Super Admin] --(Write Secret)--> [Supabase Edge Function]
                                                   |
                                                   v
                                       [Encrypted Vault / Secrets]
                                                   |
[Browser UI] <--(••••last4, Status ✓)-------------+
```
- Plaintext secrets (service-role keys, OAuth client secrets, SMTP passwords) are never returned in any REST API response.
- Browser UI only receives the sanitized mask `••••last4`, configuration status (`Configured`), and the rotation timestamp.
