// Entity Date Semantics & Basis Registry
// Defines primary and alternative date fields for each entity and classifies metrics into Flow vs Snapshot.

export const ENTITY_DATE_FIELDS = {
  leads: {
    entity: 'leads',
    label: 'Lead / Pipeline',
    defaultField: 'createdAt',
    fields: [
      { key: 'createdAt', label: 'Created Date' },
      { key: 'surveyDate', label: 'Survey Date' },
      { key: 'nextFollowUp', label: 'Next Follow-up' },
      { key: 'closedDate', label: 'Closed Date' }
    ]
  },
  quotations: {
    entity: 'quotations',
    label: 'Quotation',
    defaultField: 'date',
    fields: [
      { key: 'date', label: 'Quotation Date' },
      { key: 'validUntil', label: 'Valid-until' }
    ]
  },
  projects: {
    entity: 'projects',
    label: 'Project',
    defaultField: 'orderDate',
    fields: [
      { key: 'orderDate', label: 'Order / Booking Date', fallback: 'createdAt' },
      { key: 'handoverDate', label: 'Handover Date', fallback: 'endDate' }
    ]
  },
  jobs: {
    entity: 'jobs',
    label: 'Job Sheet',
    defaultField: 'scheduledStart',
    fields: [
      { key: 'scheduledStart', label: 'Scheduled Start' },
      { key: 'actualEnd', label: 'Actual End' },
      { key: 'verifiedDate', label: 'Verified Date' }
    ]
  },
  tickets: {
    entity: 'tickets',
    label: 'Service Ticket',
    defaultField: 'loggedAt',
    fields: [
      { key: 'loggedAt', label: 'Logged At' },
      { key: 'resolvedAt', label: 'Resolved At' }
    ]
  },
  amc: {
    entity: 'amc',
    label: 'AMC Contract',
    defaultField: 'endDate',
    fields: [
      { key: 'endDate', label: 'Renewal / End Date' },
      { key: 'startDate', label: 'Start Date' }
    ]
  },
  payouts: {
    entity: 'payouts',
    label: 'Payout',
    defaultField: 'date',
    fields: [
      { key: 'date', label: 'Payout / Earning Date' },
      { key: 'approvedOn', label: 'Approved On' },
      { key: 'paidOn', label: 'Paid On' }
    ]
  },
  ledger: {
    entity: 'ledger',
    label: 'Ledger Entry',
    defaultField: 'date',
    fields: [
      { key: 'date', label: 'Entry Date' }
    ]
  },
  purchases: {
    entity: 'purchases',
    label: 'Purchase / Supplier Due',
    defaultField: 'billDate',
    fields: [
      { key: 'billDate', label: 'Bill Date', fallback: 'date' },
      { key: 'dueDate', label: 'Due Date' }
    ]
  },
  stockMovements: {
    entity: 'stockMovements',
    label: 'Stock Movement',
    defaultField: 'date',
    fields: [
      { key: 'date', label: 'Movement Date' }
    ]
  }
};

/**
 * Metric Semantic Classification
 * FLOW: Filtered strictly by from <= recordDate <= to.
 * SNAPSHOT: Computed "As of `to`" (historical cumulative balance up to `to`), or static with a badge.
 */
export const METRIC_TYPES = {
  FLOW: 'flow',
  SNAPSHOT: 'snapshot'
};

export const METRIC_SEMANTICS = {
  // Flow Metrics
  revenueBooked: { type: METRIC_TYPES.FLOW, label: 'Revenue Booked', entity: 'projects' },
  grossProfit: { type: METRIC_TYPES.FLOW, label: 'Gross Operating Profit', entity: 'projects' },
  marginPct: { type: METRIC_TYPES.FLOW, label: 'Gross Margin %', entity: 'projects' },
  jobsCompleted: { type: METRIC_TYPES.FLOW, label: 'Jobs Completed', entity: 'jobs' },
  ticketsLogged: { type: METRIC_TYPES.FLOW, label: 'Tickets Logged', entity: 'tickets' },
  ticketsResolved: { type: METRIC_TYPES.FLOW, label: 'Tickets Resolved', entity: 'tickets' },
  payoutsPaid: { type: METRIC_TYPES.FLOW, label: 'Payouts Disbursed', entity: 'payouts' },
  leadsCreated: { type: METRIC_TYPES.FLOW, label: 'Leads Created', entity: 'leads' },
  gstCollected: { type: METRIC_TYPES.FLOW, label: 'GST Collected', entity: 'quotations' },

  // Snapshot Metrics
  stockOnHand: { type: METRIC_TYPES.SNAPSHOT, label: 'Stock On Hand', reconstructable: true },
  openTickets: { type: METRIC_TYPES.SNAPSHOT, label: 'Open Tickets', reconstructable: true },
  activeAmcs: { type: METRIC_TYPES.SNAPSHOT, label: 'Active AMCs', reconstructable: true },
  pipelineValue: { type: METRIC_TYPES.SNAPSHOT, label: 'Current Pipeline Value', reconstructable: false },
  employeeBalanceOwed: { type: METRIC_TYPES.SNAPSHOT, label: 'Employee Balance Owed', reconstructable: true },
  supplierDues: { type: METRIC_TYPES.SNAPSHOT, label: 'Supplier Dues', reconstructable: true }
};

/**
 * Gets effective date value for a record given a selected basis field.
 */
export function getRecordDate(record, fieldKey, entityType = null) {
  if (!record) return null;
  if (record[fieldKey]) return String(record[fieldKey]);

  // Check fallback if configured
  if (entityType && ENTITY_DATE_FIELDS[entityType]) {
    const fieldDef = ENTITY_DATE_FIELDS[entityType].fields.find(f => f.key === fieldKey);
    if (fieldDef && fieldDef.fallback && record[fieldDef.fallback]) {
      return String(record[fieldDef.fallback]);
    }
  }

  // Universal fallbacks
  return record.createdAt || record.date || record.scheduledStart || record.loggedAt || record.surveyDate || record.orderDate || null;
}
