# Security Policy & Threat Model

**Eliza Infotech CCTV CRM & ERP System**  
*Classification:* Restricted Enterprise Security Governance  
*Compliance Target:* Zero-Trust Architecture & India Digital Personal Data Protection (DPDP) Act 2023

---

## 1. Core Security Architecture Principles

### 1. Zero Secrets in Client Code or Bundles
- Secrets (Supabase Service Role Key, Google OAuth Client Secret, SMTP Credentials, Database passwords) are **never embedded in frontend code, git history, or client bundles**.
- Client applications utilize only public/publishable tokens (`VITE_SUPABASE_ANON_KEY`, Google Client ID).
- All secret modifications are write-only from the Super Admin Developer Console.

### 2. Multi-Tenant Default-Deny Row-Level Security (RLS)
- Every PostgreSQL table enforcing tenant isolation carries an `org_id` column.
- Policies evaluate tenant tenancy via `auth.jwt() -> app_metadata -> org_id`.
- Technicians cannot view company financials, margins, or colleague compensation.

### 3. Cross-Site Scripting (XSS) Sanitization Pipeline
- All dynamic HTML strings pass through `src/services/security.js`:
  - `escapeHtml(string)`: Encodes `&`, `<`, `>`, `"`, `'`.
  - `sanitizeHtml(string)`: DOMPurify sanitization strictly permitting safe presentation tags (`<strong>`, `<em>`, `<span>`) and stripping executable scripts or inline event handlers (`onload`, `onerror`).

### 4. Input Validation Boundary
- User data entering the system is strictly validated both at the client and server layer using `src/services/validationService.js`:
  - **Phone:** Indian E.164 and 10-digit mobile (`/^[6-9]\d{9}$/`).
  - **GSTIN:** Statutory 15-character Indian format with state code and check digit (`/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/`).
  - **PAN:** 10-character alphanumeric (`/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/`).
  - **Dates & Currency:** Validated numeric ISO formats preventing NaN or negative quantities.

---

## 2. HTTP Security Headers Specification

Configured in `public/_headers` (Cloudflare Pages) and `public/.htaccess` (Hostinger/Apache fallback):

| Header | Production Directive | Purpose |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; connect-src 'self' https://*.supabase.co; frame-ancestors 'none';` | Blocks XSS, unauthorized remote script injection, and cross-site framing. |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Enforces HTTPS on all modern browsers for 1 year. |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing attacks. |
| `X-Frame-Options` | `DENY` | Completely prevents clickjacking in iframes. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Protects private internal URL path parameters from leaking. |
| `Permissions-Policy` | `camera=(self), geolocation=(self), microphone=()` | Disables unused hardware sensors; isolates camera to work-order sign-offs. |

---

## 3. Session Management & Anti-Brute-Force Controls

1. **Idle Timeout:** Automatic session invalidation after 30 minutes of inactivity.
2. **Account Lockout:** 5 consecutive failed login attempts within 15 minutes triggers an automated lockout timer.
3. **Instant Revocation:** When an employee account status is updated to `Suspended` by Super Admin, all active sessions are invalidated immediately.
4. **Mandatory 2FA:** Super Admin and Admin roles require Time-based One-Time Password (TOTP) two-factor authentication.

---

## 4. Vulnerability Disclosure & Audit Log Tampering

- Any suspected security vulnerability should be escalated directly to Aditya Sharma (Super Administrator) at `aditya@elizainfotech.com`.
- Audit logs in `audit_logs` table are append-only. No user role—including Super Admin—has SQL `UPDATE` or `DELETE` permissions on audit tables.
