# Eliza Infotech CCTV CRM & ERP System

Enterprise Cloud CRM & ERP platform engineered for commercial CCTV design, surveillance project estimation, GST BOQ generation, technician dispatch, SLA service tickets, technician piece-rate payouts, and fiscal double-entry accounting across Haryana (Panipat & Sonipat operations).

---

## 🚀 Key Highlights & Architecture

- **Frontend:** Pure Vanilla JavaScript (ES Modules) bundled via Vite with manual vendor chunking.
- **Visual Analytics:** Chart.js 4.5.1 with responsive auto-scaling canvas wrappers.
- **Backend & Database:** Supabase (PostgreSQL 15+) with Row-Level Security (RLS) default-deny tenant isolation.
- **Hosting & Edge:** Cloudflare Pages with immutable asset caching, Strict CSP, HSTS, and WAF rules.
- **Mobile First & PWA:** Installable Progressive Web App with 100dvh viewport support, touch snap-scroll Kanban, and offline fallback.
- **Zero-Secret Client Security:** Write-Only secrets vault model where external provider API keys never touch browser localStorage or JS runtime memory.

---

## 🛡️ Role-Based Access Control (RBAC)

| Role | Role Code | Scope & Capabilities |
|---|---|---|
| **Super Admin** | `ADMIN` | Full apex platform authority: Integrations, User Governance, Tenant Onboarding, Audit Logs, DR Backups. |
| **Admin** | `ADMIN` | Commercial operations, project approvals, inventory adjustments, fiscal ledger management. |
| **Supervisor** | `OPS` | Field team dispatch, job verification, technician assignments, SLA monitoring. |
| **Accounts** | `ACC` | Vendor invoices, customer billing, technician payout processing, GST reporting. |
| **Sales** | `SALES` | Quotations, BOQ sizing, CRM lead pipeline, client party master records. |
| **Technician** | `TECH` | Assigned job sheets, mobile digital checklists, piece-rate payout ledger visibility. |
| **Viewer** | `VIEW` | Read-only analytics dashboard and inventory stock review. |

---

## 📦 Getting Started

### Local Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run automated test suites (128+ tests)
npm test

# Run security audit on production dependencies
npm run security:audit

# Build production bundle
npm run build
```

---

## 📚 Technical Documentation Index

- **System Architecture & Data Flows:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Incident Response & Operational Runbook:** [`docs/RUNBOOK.md`](docs/RUNBOOK.md)
- **Security Policy & Threat Model:** [`docs/SECURITY.md`](docs/SECURITY.md)
- **Baseline Audit Report:** [`docs/AUDIT_REPORT.md`](docs/AUDIT_REPORT.md)
- **Production Pre-Launch Verification:** [`docs/LAUNCH_REPORT.md`](docs/LAUNCH_REPORT.md)
- **Owner Click-by-Click Setup Guide:** [`docs/OWNER_SETUP_GUIDE.md`](docs/OWNER_SETUP_GUIDE.md)

---

## ⚖️ License & Confidentiality
Proprietary software developed exclusively for **Eliza Infotech** (Panipat & Sonipat, Haryana). All rights reserved.
