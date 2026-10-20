-- ==============================================================================
-- MIGRATION 01: STRICT MULTI-TENANT ROW-LEVEL SECURITY (RLS) POLICIES
-- Default Deny, Cross-Tenant Isolation & Role-Based Access Control
-- ==============================================================================

-- Helper function: retrieve the active caller's organization ID
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS TEXT AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function: retrieve caller's role enum
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function: retrieve caller's linked employee ID
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS TEXT AS $$
  SELECT employee_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enable RLS on every business table
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 1. Organizations Policy (Users can only read their own org)
-- -----------------------------------------------------------------------------
CREATE POLICY org_isolation_select ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.current_org_id());

-- -----------------------------------------------------------------------------
-- 2. Integrations Policy (Super Admin ONLY)
-- -----------------------------------------------------------------------------
CREATE POLICY integrations_super_admin_all ON public.integrations
  FOR ALL TO authenticated
  USING (org_id = public.current_org_id() AND public.current_role() = 'SUPER_ADMIN')
  WITH CHECK (org_id = public.current_org_id() AND public.current_role() = 'SUPER_ADMIN');

-- -----------------------------------------------------------------------------
-- 3. App Settings Policy
-- -----------------------------------------------------------------------------
CREATE POLICY app_settings_select ON public.app_settings
  FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());

CREATE POLICY app_settings_admin_write ON public.app_settings
  FOR ALL TO authenticated
  USING (org_id = public.current_org_id() AND public.current_role() IN ('SUPER_ADMIN', 'ADMIN'))
  WITH CHECK (org_id = public.current_org_id() AND public.current_role() IN ('SUPER_ADMIN', 'ADMIN'));

-- -----------------------------------------------------------------------------
-- 4. Profiles Policy
-- -----------------------------------------------------------------------------
CREATE POLICY profiles_tenant_select ON public.profiles
  FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());

CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND org_id = public.current_org_id());

-- -----------------------------------------------------------------------------
-- 5. People / Workforce Directory Policy
-- -----------------------------------------------------------------------------
CREATE POLICY people_tenant_select ON public.people
  FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());

CREATE POLICY people_admin_manage ON public.people
  FOR ALL TO authenticated
  USING (org_id = public.current_org_id() AND public.current_role() IN ('SUPER_ADMIN', 'ADMIN'))
  WITH CHECK (org_id = public.current_org_id() AND public.current_role() IN ('SUPER_ADMIN', 'ADMIN'));

-- -----------------------------------------------------------------------------
-- 6. Parties & Items (Clients, Suppliers, Catalog)
-- -----------------------------------------------------------------------------
CREATE POLICY parties_tenant_all ON public.parties
  FOR ALL TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE POLICY items_tenant_all ON public.items
  FOR ALL TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

-- -----------------------------------------------------------------------------
-- 7. Jobs & Work Orders
-- -----------------------------------------------------------------------------
CREATE POLICY jobs_tenant_select ON public.jobs
  FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());

CREATE POLICY jobs_management_write ON public.jobs
  FOR ALL TO authenticated
  USING (org_id = public.current_org_id() AND public.current_role() IN ('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR'))
  WITH CHECK (org_id = public.current_org_id() AND public.current_role() IN ('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR'));

-- -----------------------------------------------------------------------------
-- 8. SLA Tickets
-- -----------------------------------------------------------------------------
CREATE POLICY tickets_tenant_select ON public.tickets
  FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());

CREATE POLICY tickets_tenant_update ON public.tickets
  FOR UPDATE TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

-- -----------------------------------------------------------------------------
-- 9. Payouts Register (Strict Isolation: Technicians see only own payouts)
-- -----------------------------------------------------------------------------
CREATE POLICY payouts_tenant_management_all ON public.payouts
  FOR ALL TO authenticated
  USING (
    org_id = public.current_org_id() AND
    public.current_role() IN ('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'ACCOUNTS')
  )
  WITH CHECK (
    org_id = public.current_org_id() AND
    public.current_role() IN ('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'ACCOUNTS')
  );

CREATE POLICY payouts_technician_self_select ON public.payouts
  FOR SELECT TO authenticated
  USING (
    org_id = public.current_org_id() AND
    employee_id = public.current_employee_id()
  );

-- -----------------------------------------------------------------------------
-- 10. General Ledger (Technicians see only own ledger statement)
-- -----------------------------------------------------------------------------
CREATE POLICY ledger_tenant_management_all ON public.ledger
  FOR ALL TO authenticated
  USING (
    org_id = public.current_org_id() AND
    public.current_role() IN ('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'ACCOUNTS')
  )
  WITH CHECK (
    org_id = public.current_org_id() AND
    public.current_role() IN ('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'ACCOUNTS')
  );

CREATE POLICY ledger_technician_self_select ON public.ledger
  FOR SELECT TO authenticated
  USING (
    org_id = public.current_org_id() AND
    employee_id = public.current_employee_id()
  );

-- -----------------------------------------------------------------------------
-- 11. Quotations
-- -----------------------------------------------------------------------------
CREATE POLICY quotations_tenant_all ON public.quotations
  FOR ALL TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

-- -----------------------------------------------------------------------------
-- 12. Audit Logs (Append-only by authenticated users, readable by Admins)
-- -----------------------------------------------------------------------------
CREATE POLICY audit_logs_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.current_org_id());

CREATE POLICY audit_logs_admin_select ON public.audit_logs
  FOR SELECT TO authenticated
  USING (org_id = public.current_org_id() AND public.current_role() IN ('SUPER_ADMIN', 'ADMIN'));
