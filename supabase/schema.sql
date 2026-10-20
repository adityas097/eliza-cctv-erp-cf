-- ==============================================================================
-- ELIZA ENTERPRISE CCTV CRM & ERP - SUPABASE MULTI-TENANT SCHEMA & RLS
-- PostgreSQL Database Schema with Strict Row-Level Security (RLS)
-- ==============================================================================

-- 1. Create Companies (Workspaces)
CREATE TABLE IF NOT EXISTS public.companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT,
  gstin TEXT,
  pan TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  authorized_person TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Profiles (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id TEXT,
  username TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Technician',
  role_code TEXT NOT NULL DEFAULT 'TECH',
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Employees
CREATE TABLE IF NOT EXISTS public.employees (
  id TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL,
  pay_type TEXT DEFAULT 'PerPoint',
  default_rate NUMERIC DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  upi_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, company_id)
);

-- 4. Parties Master (Customers & Suppliers)
CREATE TABLE IF NOT EXISTS public.parties (
  id TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  gstin TEXT,
  address TEXT,
  city TEXT,
  balance NUMERIC DEFAULT 0,
  credit_limit NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, company_id)
);

-- 5. Items Master (Catalog & Inventory)
CREATE TABLE IF NOT EXISTS public.items (
  id TEXT NOT NULL,
  sku TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  dealer_cost NUMERIC DEFAULT 0,
  mrp NUMERIC DEFAULT 0,
  current_stock NUMERIC DEFAULT 0,
  min_reorder NUMERIC DEFAULT 0,
  hsn TEXT,
  brand TEXT,
  specs TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, company_id)
);

-- 6. Field Jobs
CREATE TABLE IF NOT EXISTS public.jobs (
  id TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  client_name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Scheduled',
  priority TEXT NOT NULL DEFAULT 'Medium',
  assignees JSONB DEFAULT '[]'::JSONB,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  site_address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, company_id)
);

-- 7. Service Tickets & Complaints
CREATE TABLE IF NOT EXISTS public.tickets (
  id TEXT NOT NULL,
  ticket_no TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Open',
  assigned_to TEXT,
  assigned_name TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  sla_response_due TIMESTAMPTZ,
  sla_resolve_due TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, company_id)
);

-- 8. Double-Entry Payout Ledgers
CREATE TABLE IF NOT EXISTS public.ledger (
  id TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  ref_type TEXT NOT NULL,
  ref_id TEXT,
  description TEXT NOT NULL,
  debit NUMERIC DEFAULT 0,
  credit NUMERIC DEFAULT 0,
  balance_after NUMERIC DEFAULT 0,
  PRIMARY KEY (id, company_id)
);

-- 9. Payouts Register
CREATE TABLE IF NOT EXISTS public.payouts (
  id TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  paid_amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending',
  paid_on TIMESTAMPTZ,
  payment_mode TEXT,
  reference_no TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, company_id)
);

-- 10. Quotations & BOQs
CREATE TABLE IF NOT EXISTS public.quotations (
  id TEXT NOT NULL,
  ref_no TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  items JSONB DEFAULT '[]'::JSONB,
  taxable_subtotal NUMERIC DEFAULT 0,
  total_gst NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, company_id)
);

-- ==============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- Ensures users can ONLY see and modify data belonging to their own companyId
-- ==============================================================================

-- Helper function to get current user's company_id
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS TEXT AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- Companies Policy
CREATE POLICY companies_isolation_policy ON public.companies
  FOR ALL USING (id = public.current_company_id());

-- Profiles Policy
CREATE POLICY profiles_isolation_policy ON public.profiles
  FOR ALL USING (company_id = public.current_company_id());

-- Employees Policy
CREATE POLICY employees_isolation_policy ON public.employees
  FOR ALL USING (company_id = public.current_company_id());

-- Parties Policy
CREATE POLICY parties_isolation_policy ON public.parties
  FOR ALL USING (company_id = public.current_company_id());

-- Items Policy
CREATE POLICY items_isolation_policy ON public.items
  FOR ALL USING (company_id = public.current_company_id());

-- Jobs Policy
CREATE POLICY jobs_isolation_policy ON public.jobs
  FOR ALL USING (company_id = public.current_company_id());

-- Tickets Policy
CREATE POLICY tickets_isolation_policy ON public.tickets
  FOR ALL USING (company_id = public.current_company_id());

-- Ledger Policy
CREATE POLICY ledger_isolation_policy ON public.ledger
  FOR ALL USING (company_id = public.current_company_id());

-- Payouts Policy
CREATE POLICY payouts_isolation_policy ON public.payouts
  FOR ALL USING (company_id = public.current_company_id());

-- Quotations Policy
CREATE POLICY quotations_isolation_policy ON public.quotations
  FOR ALL USING (company_id = public.current_company_id());
