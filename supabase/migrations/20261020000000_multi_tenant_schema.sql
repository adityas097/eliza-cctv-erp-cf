-- ==============================================================================
-- MIGRATION 00: MULTI-TENANT ENTERPRISE SCHEMA (ORGANIZATIONS, PROFILES, AUDIT)
-- Eliza Infotech Enterprise CCTV CRM & ERP System
-- ==============================================================================

-- 1. Organizations / Companies
CREATE TABLE IF NOT EXISTS public.organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT,
  gstin TEXT,
  pan TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  authorized_person TEXT,
  bank_name TEXT,
  account_no TEXT,
  ifsc_code TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backward compatibility alias
CREATE OR REPLACE VIEW public.companies AS SELECT * FROM public.organizations;

-- 2. App Settings & Tenant Preferences
CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::JSONB,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Integrations Configuration (Vault / Safe Config)
CREATE TABLE IF NOT EXISTS public.integrations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_key TEXT NOT NULL, -- 'supabase', 'google_sso', 'firebase', 'smtp', 'whatsapp'
  status TEXT NOT NULL DEFAULT 'NOT_CONFIGURED', -- 'CONFIGURED', 'NOT_CONFIGURED', 'ERROR'
  public_config JSONB DEFAULT '{}'::JSONB,
  encrypted_secret_ref TEXT, -- Reference ID to vault secret (NEVER raw secret)
  last_tested_at TIMESTAMPTZ,
  last_test_result JSONB,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Profiles (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id TEXT,
  username TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'TECHNICIAN',
  role_code TEXT NOT NULL DEFAULT 'TECH',
  designation TEXT,
  department TEXT DEFAULT 'Operations',
  status TEXT NOT NULL DEFAULT 'Active',
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Unified People / Workforce Directory
CREATE TABLE IF NOT EXISTS public.people (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  employee_code TEXT NOT NULL,
  full_name TEXT NOT NULL,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'TECHNICIAN',
  designation TEXT,
  department TEXT DEFAULT 'Field Operations',
  pay_type TEXT DEFAULT 'PerPoint',
  default_rate NUMERIC DEFAULT 600,
  access_status TEXT NOT NULL DEFAULT 'ACTIVE',
  employment_status TEXT NOT NULL DEFAULT 'ACTIVE',
  can_be_assigned_jobs BOOLEAN DEFAULT TRUE,
  upi_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Parties Master (Clients & Suppliers)
CREATE TABLE IF NOT EXISTS public.parties (
  id TEXT NOT NULL,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'Customer', 'Supplier', 'Wholesale'
  phone TEXT,
  email TEXT,
  gstin TEXT,
  pan TEXT,
  address TEXT,
  city TEXT DEFAULT 'Panipat',
  state TEXT DEFAULT 'Haryana',
  balance NUMERIC DEFAULT 0,
  credit_limit NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, org_id)
);

-- 7. Inventory & Item Master
CREATE TABLE IF NOT EXISTS public.items (
  id TEXT NOT NULL,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT,
  hsn TEXT DEFAULT '8528',
  dealer_cost NUMERIC DEFAULT 0,
  mrp NUMERIC DEFAULT 0,
  current_stock NUMERIC DEFAULT 0,
  min_reorder NUMERIC DEFAULT 5,
  specs TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, org_id)
);

-- 8. Field Jobs & Work Orders
CREATE TABLE IF NOT EXISTS public.jobs (
  id TEXT NOT NULL,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  client_id TEXT,
  client_name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'New Install', 'Upgrade', 'AMC Visit', 'Complaint Repair', 'Survey'
  status TEXT NOT NULL DEFAULT 'Scheduled', -- 'Scheduled', 'In Progress', 'Completed', 'Verified', 'Cancelled'
  priority TEXT NOT NULL DEFAULT 'Medium',
  assignees JSONB DEFAULT '[]'::JSONB,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  site_address TEXT,
  map_link TEXT,
  project_id TEXT,
  ticket_id TEXT,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, org_id)
);

-- 9. Service Complaints & SLA Tickets
CREATE TABLE IF NOT EXISTS public.tickets (
  id TEXT NOT NULL,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ticket_no TEXT NOT NULL,
  client_name TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'Medium', -- 'Critical', 'High', 'Medium', 'Low'
  status TEXT NOT NULL DEFAULT 'Open', -- 'Open', 'Assigned', 'In Progress', 'Resolved', 'Closed'
  assigned_to TEXT,
  assigned_name TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  sla_response_due TIMESTAMPTZ,
  sla_resolve_due TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  job_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, org_id)
);

-- 10. Double-Entry General Ledger
CREATE TABLE IF NOT EXISTS public.ledger (
  id TEXT NOT NULL,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  ref_type TEXT NOT NULL, -- 'JOB_EARNING', 'PAYOUT', 'ADVANCE', 'DEDUCTION'
  ref_id TEXT,
  description TEXT NOT NULL,
  debit NUMERIC DEFAULT 0,
  credit NUMERIC DEFAULT 0,
  balance_after NUMERIC DEFAULT 0,
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, org_id)
);

-- 11. Payouts Register
CREATE TABLE IF NOT EXISTS public.payouts (
  id TEXT NOT NULL,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'Job Earning', 'Bonus', 'Advance', 'Deduction', 'Salary'
  amount NUMERIC NOT NULL,
  paid_amount NUMERIC DEFAULT 0,
  direction TEXT NOT NULL DEFAULT 'CR', -- 'CR' (Owed to Staff), 'DR' (Paid out / deducted)
  status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Paid', 'On Hold'
  job_id TEXT,
  paid_on TIMESTAMPTZ,
  payment_mode TEXT,
  reference_no TEXT,
  remarks TEXT,
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, org_id)
);

-- 12. Quotations & BOQ Engineering
CREATE TABLE IF NOT EXISTS public.quotations (
  id TEXT NOT NULL,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ref_no TEXT NOT NULL,
  client_id TEXT,
  client_name TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  items JSONB DEFAULT '[]'::JSONB,
  taxable_subtotal NUMERIC DEFAULT 0,
  total_gst NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Draft',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, org_id)
);

-- 13. System Audit Log (Immutable)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance & tenant isolation queries
CREATE INDEX IF NOT EXISTS idx_profiles_org ON public.profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_people_org ON public.people(org_id);
CREATE INDEX IF NOT EXISTS idx_parties_org ON public.parties(org_id);
CREATE INDEX IF NOT EXISTS idx_items_org ON public.items(org_id);
CREATE INDEX IF NOT EXISTS idx_jobs_org ON public.jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_tickets_org ON public.tickets(org_id);
CREATE INDEX IF NOT EXISTS idx_ledger_org_emp ON public.ledger(org_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_payouts_org_emp ON public.payouts(org_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_quotations_org ON public.quotations(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs(org_id);
