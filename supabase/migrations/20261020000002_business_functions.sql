-- ==============================================================================
-- MIGRATION 02: ATOMIC POSTGRES BUSINESS FUNCTIONS & TRANSACTIONS
-- Eliza Infotech Enterprise CCTV CRM & ERP System
-- ==============================================================================

-- 1. Atomic Job Verification & Multi-Entity Propagation Function
CREATE OR REPLACE FUNCTION public.verify_field_job(
  p_job_id TEXT,
  p_verifier_name TEXT,
  p_org_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_job RECORD;
  v_assignee JSONB;
  v_emp_id TEXT;
  v_rate NUMERIC;
  v_payout_id TEXT;
  v_ledger_id TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_processed_count INT := 0;
BEGIN
  -- 1. Fetch and lock job record
  SELECT * INTO v_job FROM public.jobs
  WHERE id = p_job_id AND org_id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job % not found in organization %', p_job_id, p_org_id;
  END IF;

  IF v_job.status = 'Verified' THEN
    RAISE EXCEPTION 'Job % is already verified.', p_job_id;
  END IF;

  -- 2. Mark job as Verified
  UPDATE public.jobs
  SET status = 'Verified',
      verified_by = p_verifier_name,
      verified_at = v_now,
      updated_at = v_now
  WHERE id = p_job_id AND org_id = p_org_id;

  -- 3. Iterate through assignees and post earnings & ledger entries
  FOR v_assignee IN SELECT * FROM jsonb_array_elements(v_job.assignees)
  LOOP
    v_emp_id := v_assignee->>'employeeId';
    v_rate := COALESCE((v_assignee->>'rate')::NUMERIC, 600);

    IF v_emp_id IS NOT NULL AND v_rate > 0 THEN
      v_payout_id := 'PAY-' || TO_CHAR(v_now, 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 6);
      v_ledger_id := 'LED-' || TO_CHAR(v_now, 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 6);

      -- Insert Job Earning Credit
      INSERT INTO public.payouts (
        id, org_id, employee_id, type, amount, paid_amount, direction, status, job_id, remarks, approved_by, created_at, updated_at
      ) VALUES (
        v_payout_id, p_org_id, v_emp_id, 'Job Earning', v_rate, 0, 'CR', 'Approved', p_job_id,
        'Earnings for job: ' || v_job.title, p_verifier_name, v_now, v_now
      );

      -- Post to double-entry ledger
      INSERT INTO public.ledger (
        id, org_id, employee_id, date, ref_type, ref_id, description, debit, credit, balance_after, approved_by, created_at
      ) VALUES (
        v_ledger_id, p_org_id, v_emp_id, v_now, 'JOB_EARNING', v_payout_id,
        'Labour Credit: ' || v_job.title || ' (' || p_job_id || ')', 0, v_rate, v_rate, p_verifier_name, v_now
      );

      v_processed_count := v_processed_count + 1;
    END IF;
  END LOOP;

  -- 4. Close linked ticket if present
  IF v_job.ticket_id IS NOT NULL THEN
    UPDATE public.tickets
    SET status = 'Resolved',
        resolved_at = v_now,
        updated_at = v_now
    WHERE id = v_job.ticket_id AND org_id = p_org_id AND status != 'Resolved';
  END IF;

  -- 5. Audit log entry
  INSERT INTO public.audit_logs (
    org_id, actor_id, actor_name, actor_role, action, target_type, target_id, details
  ) VALUES (
    p_org_id, 'SYS', p_verifier_name, 'SUPER_ADMIN', 'JOB_VERIFIED_ATOMIC', 'JOB', p_job_id,
    'Verified job and posted ' || v_processed_count || ' employee payout & ledger entries.'
  );

  RETURN jsonb_build_object(
    'success', true,
    'jobId', p_job_id,
    'status', 'Verified',
    'verifiedBy', p_verifier_name,
    'assigneesProcessed', v_processed_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Clean-Slate Reset Organization (Keeps Masters, Wipes Transactional State)
CREATE OR REPLACE FUNCTION public.clean_slate_reset_org(
  p_org_id TEXT,
  p_actor_name TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- 1. Reset party balances to 0
  UPDATE public.parties
  SET balance = 0,
      updated_at = v_now
  WHERE org_id = p_org_id;

  -- 2. Delete transactional records for this organization only
  DELETE FROM public.jobs WHERE org_id = p_org_id;
  DELETE FROM public.tickets WHERE org_id = p_org_id;
  DELETE FROM public.payouts WHERE org_id = p_org_id;
  DELETE FROM public.ledger WHERE org_id = p_org_id;
  DELETE FROM public.quotations WHERE org_id = p_org_id;

  -- 3. Delete non-admin people
  DELETE FROM public.people
  WHERE org_id = p_org_id AND role NOT IN ('SUPER_ADMIN', 'ADMIN');

  -- 4. Audit Log
  INSERT INTO public.audit_logs (
    org_id, actor_id, actor_name, actor_role, action, target_type, details
  ) VALUES (
    p_org_id, 'SYS', p_actor_name, 'SUPER_ADMIN', 'CLEAN_SLATE_RESET', 'ORGANIZATION',
    'Reset organization transactional state while preserving client and catalog masters.'
  );

  RETURN jsonb_build_object(
    'success', true,
    'orgId', p_org_id,
    'resetCompletedAt', v_now
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
