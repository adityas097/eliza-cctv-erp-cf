import {
  COMPANY_INFO,
  PRESET_USERS,
  MASTER_ITEMS,
  PROJECTS,
  CRM_LEADS,
  AMC_CONTRACTS,
  SLA_TICKETS,
  INVENTORY_ITEMS,
  TECHNICIAN_LOGS,
  INITIAL_ZONES,
  INITIAL_QUOTATION,
  INITIAL_PARTIES,
  INITIAL_SAVED_QUOTATIONS,
  INITIAL_AUDIT_LOGS
} from '../data/initialData.js';
import { db } from '../store/db.js';
import { filterByPeriod, filterAsOf } from './queryService.js';
import { periodStore } from '../store/periodStore.js';
import { calculateQuotationTotals } from './calculators.js';

const STORAGE_KEY = 'ELIZA_ERP_STORAGE_V1';

class Store {
  constructor() {
    this.listeners = new Map();
    // Listen to db notifications
    db.subscribe('change', () => {
      this.emit('state-changed', this.state);
    });
  }

  get state() {
    return db.state;
  }

  set state(val) {
    db.state = val;
  }

  loadState() {
    let state = null;
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          state = JSON.parse(saved);
        }
      }
    } catch (e) {
      console.error('Failed to parse saved state from localStorage', e);
    }

    if (!state) {
      state = {
        company: { ...COMPANY_INFO },
        users: [...PRESET_USERS],
        items: [...MASTER_ITEMS],
        projects: [...PROJECTS],
        leads: [...CRM_LEADS],
        amc: [...AMC_CONTRACTS],
        tickets: [...SLA_TICKETS],
        inventory: [...INVENTORY_ITEMS],
        techLogs: [...TECHNICIAN_LOGS],
        zones: [...INITIAL_ZONES],
        quotation: { ...INITIAL_QUOTATION },
        parties: [...INITIAL_PARTIES],
        quotations: [...INITIAL_SAVED_QUOTATIONS],
        auditLogs: [...INITIAL_AUDIT_LOGS]
      };
    } else {
      // Ensure company authorized person is updated
      if (state.company) {
        state.company.authorizedPerson = "Aditya Sharma";
      }
      // Ensure parties are initialized
      if (!state.parties || !state.parties.length) {
        state.parties = [...INITIAL_PARTIES];
      }
      // Ensure leads are initialized
      if (!state.leads || !state.leads.length) {
        state.leads = [...CRM_LEADS];
      }
      // Ensure saved quotations storage is initialized and has computed totals
      if (!state.quotations || !state.quotations.length) {
        state.quotations = [...INITIAL_SAVED_QUOTATIONS];
      }
      state.quotations.forEach(q => {
        if (!q.grandTotal && q.items && q.items.length) {
          const totals = calculateQuotationTotals(q);
          q.taxableSubtotal = totals.taxableSubtotal;
          q.cgst = totals.cgst;
          q.sgst = totals.sgst;
          q.igst = totals.igst;
          q.totalGst = totals.totalGst;
          q.grandTotal = totals.grandTotal;
        }
      });
      // Ensure active quotation has all accounting variables defaulted
      if (state.quotation) {
        if (state.quotation.gstEnabled === undefined) state.quotation.gstEnabled = true;
        if (state.quotation.gstRate === undefined) state.quotation.gstRate = 18;
        if (state.quotation.isInterstate === undefined) state.quotation.isInterstate = false;
        if (state.quotation.discountType === undefined) state.quotation.discountType = 'percent';
        if (state.quotation.discountValue === undefined) state.quotation.discountValue = 0;
        if (state.quotation.shippingCharges === undefined) state.quotation.shippingCharges = 0;
        if (state.quotation.installationCharges === undefined) state.quotation.installationCharges = 0;
        if (state.quotation.packagingCharges === undefined) state.quotation.packagingCharges = 0;
        if (state.quotation.roundOffEnabled === undefined) state.quotation.roundOffEnabled = true;
        if (state.quotation.advancePct === undefined) state.quotation.advancePct = 50;
      }
      // Ensure users have updated hierarchy and Super Admin is Aditya Sharma
      if (state.users && state.users.length) {
        const adminUser = state.users.find(u => u.roleCode === 'ADMIN' || u.id === 'usr-01' || (u.name && u.name.toLowerCase() === 'aditya sharma'));
        if (adminUser) {
          adminUser.name = "Aditya Sharma";
          adminUser.role = "Super Admin";
          adminUser.roleCode = "ADMIN";
          adminUser.email = "aditya@elizainfotech.com";
          adminUser.avatar = "AS";
          adminUser.level = 1;
          adminUser.levelName = "Level 1: Executive C-Suite";
          adminUser.department = "Executive Leadership";
          adminUser.reportsTo = null;
          adminUser.reportsToName = "Board of Directors / Apex";
        }
        // Sync enriched hierarchical fields from PRESET_USERS
        PRESET_USERS.forEach(preset => {
          const existing = state.users.find(u => u.id === preset.id);
          if (existing) {
            if (!existing.level) {
              existing.level = preset.level;
              existing.levelName = preset.levelName;
              existing.department = preset.department;
              existing.reportsTo = preset.reportsTo;
              existing.reportsToName = preset.reportsToName;
              existing.status = existing.status || 'Active';
              existing.phone = existing.phone || preset.phone;
            }
          } else {
            state.users.push({ ...preset });
          }
        });
      } else {
        state.users = [...PRESET_USERS];
      }

      // Ensure Aditya Sharma has Super Admin role in employees collection
      if (state.employees && state.employees.length) {
        const adityaEmp = state.employees.find(e => 
          (e.name && e.name.toLowerCase() === 'aditya sharma') || e.id === 'EMP-012'
        );
        if (adityaEmp) {
          adityaEmp.role = 'Super Admin';
          adityaEmp.roleCode = 'ADMIN';
          if (!adityaEmp.email) adityaEmp.email = 'aditya@elizainfotech.com';
        }
      }
    }

    return state;
  }

  saveState() {
    db._persist();
  }

  resetToFactoryDefaults() {
    db.resetFactory();
    this.state = db.state;
    this.saveState();
    this.emit('state-changed', this.state);
    this.logAction('DATABASE_RESET', 'SYSTEM', 'Factory master dataset restored to original dossier state');
  }

  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event).delete(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in subscriber for ${event}:`, e);
        }
      });
    }
    if (event !== 'state-changed') {
      this.emit('state-changed', this.state);
    }
  }

  // --- Audit Logger ---
  logAction(action, module, details) {
    let currentUser = null;
    try {
      const userJson = localStorage.getItem('ELIZA_CURRENT_USER');
      if (userJson) currentUser = JSON.parse(userJson);
    } catch (e) {}

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const newLog = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp,
      user: currentUser ? currentUser.name : 'Aditya Sharma',
      role: currentUser ? currentUser.role : 'Super Admin',
      action,
      module,
      details,
      ip: '192.168.1.' + Math.floor(10 + Math.random() * 20)
    };

    this.state.auditLogs.unshift(newLog);
    if (this.state.auditLogs.length > 500) {
      this.state.auditLogs.pop();
    }
    this.saveState();
    this.emit('audit-logged', newLog);
  }

  // --- KPI Analytics Calculations (Single Source of Truth) ---
  getKpis(customPeriod = null) {
    const period = customPeriod;

    // 1. Pipeline value (Flow: Leads created in period)
    const allLeads = this.state.leads || [];
    const leads = filterByPeriod(allLeads, 'createdAt', period, 'leads');
    const pipelineQuoted = leads.reduce((acc, lead) => acc + (Number(lead.quotedValue) || 0), 0);
    const pipelineWeighted = leads.reduce((acc, lead) => acc + ((Number(lead.quotedValue) || 0) * (Number(lead.winProb) || 0)), 0);

    // 2. Project Costing & Revenue (Flow: Projects booked in period)
    db._reconcileProjectLabour();
    const allProjects = this.state.projects || [];
    const projects = filterByPeriod(allProjects, 'orderDate', period, 'projects');
    const revenueBooked = projects.reduce((acc, p) => acc + (Number(p.quoted) || 0), 0);
    const totalHwCost = projects.reduce((acc, p) => acc + (Number(p.hardwareCost) || 0), 0);
    const totalLabCost = projects.reduce((acc, p) => acc + (Number(p.labourCost) || 0), 0);
    const totalConsCost = projects.reduce((acc, p) => acc + (Number(p.consumablesCost) || 0), 0);
    const totalCost = totalHwCost + totalLabCost + totalConsCost;
    const grossProfit = revenueBooked - totalCost;
    const grossMarginPct = revenueBooked > 0 ? (grossProfit / revenueBooked) * 100 : 0;

    // 3. Active AMC Revenue (Snapshot: Active contracts as of period.to)
    const toDate = period ? period.to : '2099-12-31';
    const fromDate = period ? period.from : '1970-01-01';
    const activeAmcRevenue = (this.state.amc || [])
      .filter(a => a.status === 'Active' && String(a.startDate || '').slice(0, 10) <= toDate && String(a.endDate || '2099-12-31').slice(0, 10) >= fromDate)
      .reduce((acc, a) => acc + (Number(a.annualFee) || 0), 0);

    // 4. Stock Reorder Alerts (Snapshot as of to)
    const reorderSKUs = (this.state.inventory || []).filter(i => (Number(i.currentStock) || 0) <= (Number(i.minReorder) || 0));

    // 5. Total Supplier Dues (Snapshot as of to)
    const supplierDues = (this.state.inventory || []).reduce((acc, i) => acc + (Number(i.outstandingDue) || 0), 0);

    // 6. Technician Payouts & Ledgers
    const allPayouts = this.state.payouts || [];
    const payouts = filterByPeriod(allPayouts, 'date', period, 'payouts');
    const techGrossPayout = payouts
      .filter(p => p.type === 'Job Earning' || p.type === 'Bonus' || p.type === 'Incentive' || p.type === 'Reimbursement' || p.type === 'Salary')
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    const techAdvances = payouts
      .filter(p => p.type === 'Advance')
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    // Snapshot: total balance due as of to
    const payoutsUpToTo = filterAsOf(allPayouts, 'date', toDate, 'payouts');
    const techBalanceDue = payoutsUpToTo
      .filter(p => p.status === 'Pending' || p.status === 'Approved' || p.status === 'Partially Paid')
      .reduce((acc, p) => acc + ((Number(p.amount) || 0) - (Number(p.paidAmount) || 0)), 0);

    const paidInPeriod = payouts
      .reduce((acc, p) => acc + (Number(p.paidAmount) || 0), 0);

    // 7. AMC Countdowns
    const urgentAmcRenewals = (this.state.amc || []).filter(a => {
      const end = String(a.endDate || '').slice(0, 10);
      return end >= fromDate && end <= toDate;
    }).length;

    const expiredAmcs = (this.state.amc || []).filter(a => {
      const end = String(a.endDate || '').slice(0, 10);
      return end < fromDate;
    }).length;

    // 8. Field Operations Jobs Metrics
    const allJobs = this.state.jobs || [];
    const openJobs = allJobs.filter(j => (j.status === 'Backlog' || j.status === 'Scheduled' || j.status === 'In Progress' || j.status === 'On Hold') && String(j.scheduledStart || '').slice(0, 10) <= toDate);
    const overdueJobs = openJobs.filter(j => {
      return j.scheduledEnd && String(j.scheduledEnd).slice(0, 10) < toDate;
    });

    const inPeriodJobs = filterByPeriod(allJobs, 'scheduledStart', period, 'jobs');
    const completedJobsInPeriod = inPeriodJobs.filter(j => j.status === 'Completed' || j.status === 'Verified');

    const activeTechIds = new Set();
    allJobs.filter(j => j.status === 'In Progress').forEach(j => {
      (j.assignees || []).forEach(a => activeTechIds.add(a.employeeId));
    });
    const totalTechsCount = (this.state.employees || []).filter(e => e.active && e.role.toLowerCase().includes('tech')).length;
    const techUtilizationPct = totalTechsCount > 0 ? Math.min(100, Math.round((activeTechIds.size / totalTechsCount) * 100)) : 0;

    // 9. Service Tickets & SLA Metrics
    const allTickets = this.state.tickets || [];
    const openTickets = allTickets.filter(t => (t.status !== 'Resolved' && t.status !== 'Closed') && String(t.loggedAt || '').slice(0, 10) <= toDate);
    const breachedTickets = allTickets.filter(t => {
      if (t.status === 'Resolved' || t.status === 'Closed') return false;
      return t.slaResolveDue && String(t.slaResolveDue).slice(0, 10) < toDate;
    });

    const inPeriodTickets = filterByPeriod(allTickets, 'loggedAt', period, 'tickets');
    const resolvedTickets = inPeriodTickets.filter(t => t.resolvedAt || t.status === 'Resolved' || t.status === 'Closed');
    const compliantTickets = resolvedTickets.filter(t => {
      if (!t.slaResolveDue || !t.resolvedAt) return true;
      return String(t.resolvedAt).slice(0, 10) <= String(t.slaResolveDue).slice(0, 10);
    });
    const slaCompliancePct = resolvedTickets.length > 0
      ? Math.round((compliantTickets.length / resolvedTickets.length) * 100)
      : 100;

    const avgResolutionHrs = resolvedTickets.length > 0
      ? (resolvedTickets.reduce((sum, t) => sum + (Number(t.resolutionHrs) || 0), 0) / resolvedTickets.length).toFixed(1)
      : '0.0';

    return {
      pipelineQuoted,
      pipelineWeighted,
      revenueBooked,
      totalCost,
      grossProfit,
      grossMarginPct,
      activeAmcRevenue,
      reorderAlertsCount: reorderSKUs.length,
      reorderSKUs,
      supplierDues,
      techGrossPayout,
      techAdvances,
      techBalanceDue,
      totalPayableToStaff: techBalanceDue,
      paidThisMonth: paidInPeriod,
      advancesOutstanding: techAdvances,
      urgentAmcRenewals,
      expiredAmcs,
      activeProjectsCount: projects.length,
      totalLeadsCount: leads.length,
      openTicketsCount: openTickets.length,
      breachedTicketsCount: breachedTickets.length,
      slaCompliancePct,
      avgResolutionHrs: Number(avgResolutionHrs),
      openJobsCount: openJobs.length,
      overdueJobsCount: overdueJobs.length,
      completedJobsThisMonthCount: completedJobsInPeriod.length,
      techUtilizationPct
    };
  }

  // --- CRM Operations ---
  addLead(lead) {
    const id = `LEAD-${100 + this.state.leads.length + 1}`;
    const newLead = {
      id,
      leadId: id,
      ...lead,
      quotedValue: Number(lead.quotedValue) || 0,
      winProb: Number(lead.winProb) || 0.1,
      estCams: Number(lead.estCams) || 1
    };
    this.state.leads.unshift(newLead);
    this.saveState();
    this.emit('leads-updated', this.state.leads);
    this.logAction('LEAD_CREATED', 'CRM', `Added new lead ${id}: ${newLead.customer} (₹${newLead.quotedValue.toLocaleString('en-IN')})`);
    return newLead;
  }

  updateLead(id, updates) {
    const idx = this.state.leads.findIndex(l => l.id === id);
    if (idx !== -1) {
      this.state.leads[idx] = { ...this.state.leads[idx], ...updates };
      this.saveState();
      this.emit('leads-updated', this.state.leads);
      this.logAction('LEAD_UPDATED', 'CRM', `Updated details for ${id} (${this.state.leads[idx].customer})`);
    }
  }

  updateLeadStage(id, newStage) {
    const lead = this.state.leads.find(l => l.id === id);
    if (lead) {
      const oldStage = lead.stage;
      lead.stage = newStage;
      // adjust win probability defaults based on stage
      const stageProbs = {
        'New Inquiry': 0.10,
        'Site Survey Scheduled': 0.30,
        'Quote Prepared': 0.50,
        'Under Negotiation': 0.75,
        'Won - Order Booked': 1.00,
        'Lost - Dropped': 0.00
      };
      if (stageProbs[newStage] !== undefined) {
        lead.winProb = stageProbs[newStage];
      }
      this.saveState();
      this.emit('leads-updated', this.state.leads);
      this.logAction('LEAD_STAGE_CHANGED', 'CRM', `Lead ${id} transitioned from '${oldStage}' to '${newStage}'`);
    }
  }

  deleteLead(id) {
    const lead = this.state.leads.find(l => l.id === id);
    this.state.leads = this.state.leads.filter(l => l.id !== id);
    this.saveState();
    this.emit('leads-updated', this.state.leads);
    this.logAction('LEAD_DELETED', 'CRM', `Removed lead ${id} (${lead ? lead.customer : ''})`);
  }

  // --- Project Operations ---
  addProject(project) {
    let nextNum = 1;
    (this.state.projects || []).forEach(p => {
      const match = (p.id || '').match(/PRJ-\d+-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) nextNum = num + 1;
      }
    });
    const id = project.id || `PRJ-2026-${String(nextNum).padStart(2, '0')}`;
    const newPrj = {
      id,
      ...project,
      quoted: Number(project.quoted) || 0,
      hardwareCost: Number(project.hardwareCost) || 0,
      labourCost: Number(project.labourCost) || 0,
      consumablesCost: Number(project.consumablesCost) || 0,
      cams: Number(project.cams) || 1
    };
    this.state.projects.unshift(newPrj);
    this.saveState();
    this.emit('projects-updated', this.state.projects);
    this.logAction('PROJECT_CREATED', 'PROJECTS', `Created project ${id}: ${newPrj.client} (Quoted: ₹${newPrj.quoted.toLocaleString('en-IN')})`);
    return newPrj;
  }

  updateProject(id, updates) {
    const idx = this.state.projects.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.state.projects[idx] = { ...this.state.projects[idx], ...updates };
      this.saveState();
      this.emit('projects-updated', this.state.projects);
      this.logAction('PROJECT_UPDATED', 'PROJECTS', `Updated financials/scope for ${id}`);
    }
  }

  deleteProject(id) {
    this.state.projects = this.state.projects.filter(p => p.id !== id);
    this.saveState();
    this.emit('projects-updated', this.state.projects);
    this.logAction('PROJECT_DELETED', 'PROJECTS', `Deleted project ${id}`);
  }

  // --- Party / Client Operations ---
  addParty(partyData) {
    const id = `PTY-${String(this.state.parties.length + 1).padStart(2, '0')}`;
    const newParty = {
      id,
      name: partyData.name,
      contactPerson: partyData.contactPerson || 'Authorized Representative',
      department: partyData.department || 'General Administration',
      site: partyData.site || partyData.address || 'Panipat / Sonipat Region',
      phone: partyData.phone || '+91 98000-00000',
      email: partyData.email || 'client@enterprise.com',
      gstin: partyData.gstin || '06AAACU0000A1Z0',
      placeOfSupply: partyData.placeOfSupply || 'Haryana (06) - Intra-State GST Supply',
      notes: partyData.notes || 'Added from Party Selector'
    };
    this.state.parties.unshift(newParty);
    this.saveState();
    this.emit('parties-updated', this.state.parties);
    this.logAction('PARTY_CREATED', 'CRM', `Added new party / client: ${newParty.name}`);
    return newParty;
  }

  updateParty(partyId, updates) {
    const idx = this.state.parties.findIndex(p => p.id === partyId);
    if (idx !== -1) {
      this.state.parties[idx] = { ...this.state.parties[idx], ...updates };
      this.saveState();
      this.emit('parties-updated', this.state.parties);
    }
  }

  deleteParty(partyId) {
    this.state.parties = this.state.parties.filter(p => p.id !== partyId);
    this.saveState();
    this.emit('parties-updated', this.state.parties);
  }

  // --- Active Quotation & BOQ Operations ---
  updateQuotation(updates) {
    this.state.quotation = { ...this.state.quotation, ...updates };
    this.saveState();
    this.emit('quotation-updated', this.state.quotation);
    this.logAction('QUOTATION_EDITED', 'QUOTATION', `Updated quotation ${this.state.quotation.refNo} header metadata`);
  }

  updateQuotationTerms(terms) {
    const cleanTerms = Array.isArray(terms) ? terms.map(t => String(t).trim()).filter(Boolean) : [];
    this.state.quotation.terms = cleanTerms;
    this.saveState();
    this.emit('quotation-updated', this.state.quotation);
    this.logAction('QUOTATION_TERMS_UPDATED', 'QUOTATION', `Updated commercial terms on active quotation ${this.state.quotation.refNo} (${cleanTerms.length} clauses)`);
    return cleanTerms;
  }


  addQuotationItem(item) {
    const sl = this.state.quotation.items.length + 1;
    const newItem = {
      sl,
      sku: item.sku || 'SKU-CUSTOM',
      desc: item.desc || item.name || 'Custom Hardware / Service Item',
      hsn: item.hsn || '85258090',
      qty: Number(item.qty) || 1,
      unit: item.unit || 'Nos',
      rate: Number(item.rate) || 0
    };
    this.state.quotation.items.push(newItem);
    this.saveState();
    this.emit('quotation-updated', this.state.quotation);
    this.logAction('BOQ_ITEM_ADDED', 'QUOTATION', `Added item to proposal: ${newItem.desc} (${newItem.sku})`);
    return newItem;
  }

  updateQuotationItem(index, updates) {
    if (this.state.quotation.items[index]) {
      this.state.quotation.items[index] = { ...this.state.quotation.items[index], ...updates };
      this.saveState();
      this.emit('quotation-updated', this.state.quotation);
    }
  }

  removeQuotationItem(index) {
    this.state.quotation.items.splice(index, 1);
    this.state.quotation.items.forEach((item, idx) => {
      item.sl = idx + 1;
    });
    this.saveState();
    this.emit('quotation-updated', this.state.quotation);
    this.logAction('BOQ_ITEM_REMOVED', 'QUOTATION', `Removed item at row ${index + 1}`);
  }

  // --- Quotation Storage & Archives Operations ---
  updateQuotationAccounting(updates = {}) {
    if (!this.state.quotation) return;
    this.state.quotation = { ...this.state.quotation, ...updates };
    this.saveState();
    this.emit('quotation-updated', this.state.quotation);
    this.logAction('QUOTATION_ACCOUNTING_UPDATED', 'QUOTATION', `Updated quotation commercial & accounting variables`);
    return this.state.quotation;
  }

  saveCurrentQuotation(meta = {}) {
    const qtn = this.state.quotation;
    const totals = calculateQuotationTotals(qtn);

    let authorName = 'Aditya Sharma';
    try {
      const currentUser = JSON.parse(localStorage.getItem('ELIZA_CURRENT_USER') || '{}');
      if (currentUser && currentUser.name) authorName = currentUser.name;
    } catch (e) {}

    // Check if quote with same refNo or id exists in storage
    const existingIdx = this.state.quotations.findIndex(q => q.refNo === qtn.refNo || (qtn.id && q.id === qtn.id));

    const quoteRecord = {
      id: qtn.id || (existingIdx !== -1 ? this.state.quotations[existingIdx].id : `QTN-${new Date().getFullYear()}-${String(this.state.quotations.length + 1).padStart(3, '0')}`),
      refNo: qtn.refNo || `EI/QUO/${new Date().getFullYear()}/001`,
      date: qtn.date || new Date().toISOString().split('T')[0],
      validityDays: Number(qtn.validityDays) || 15,
      clientName: qtn.clientName || 'General Client',
      department: qtn.department || '',
      site: qtn.site || '',
      scopeOfWork: qtn.scopeOfWork || 'CCTV Surveillance Sizing & Installation',
      govtRef: qtn.govtRef || 'Direct Commercial Bidding',
      placeOfSupply: qtn.placeOfSupply || 'Haryana (06) - Intra-State GST Supply',
      // Accounting variables
      gstEnabled: totals.gstEnabled,
      gstRate: totals.gstRate,
      isInterstate: totals.isInterstate,
      taxType: totals.isInterstate ? 'inter' : (totals.gstEnabled ? 'intra' : 'exempt'),
      discountType: totals.discountType,
      discountValue: totals.discountValue,
      overallDiscount: totals.overallDiscount,
      totalDiscount: totals.totalDiscount,
      grossSubtotal: totals.grossSubtotal,
      shippingCharges: totals.shippingCharges,
      installationCharges: totals.installationCharges,
      packagingCharges: totals.packagingCharges,
      extraCharges: totals.extraCharges,
      taxableSubtotal: totals.taxableSubtotal,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      totalGst: totals.totalGst,
      roundOffEnabled: totals.roundOffEnabled,
      roundOff: totals.roundOff,
      grandTotal: totals.grandTotal,
      advancePct: totals.advancePct,
      advanceAmount: totals.advanceAmount,
      balanceAmount: totals.balanceAmount,
      items: JSON.parse(JSON.stringify(qtn.items || [])),
      terms: qtn.terms ? [...qtn.terms] : [],
      status: meta.status || (existingIdx !== -1 ? this.state.quotations[existingIdx].status : 'Draft'),
      notes: meta.notes || '',
      createdBy: authorName,
      updatedAt: new Date().toISOString()
    };

    if (existingIdx !== -1) {
      this.state.quotations[existingIdx] = quoteRecord;
      this.logAction('QUOTATION_SAVED', 'QUOTATION', `Updated stored quotation ${quoteRecord.refNo} (${quoteRecord.clientName})`);
    } else {
      quoteRecord.createdAt = new Date().toISOString();
      this.state.quotations.unshift(quoteRecord);
      this.logAction('QUOTATION_SAVED', 'QUOTATION', `Stored quotation ${quoteRecord.refNo} in archive (${quoteRecord.clientName})`);
    }

    this.saveState();
    this.emit('quotations-updated', this.state.quotations);
    return quoteRecord;
  }

  loadQuotation(refNoOrId) {
    const quote = this.state.quotations.find(q => q.id === refNoOrId || q.refNo === refNoOrId);
    if (quote) {
      this.state.quotation = {
        id: quote.id,
        refNo: quote.refNo,
        date: quote.date,
        validityDays: quote.validityDays,
        clientName: quote.clientName,
        department: quote.department,
        site: quote.site,
        scopeOfWork: quote.scopeOfWork,
        govtRef: quote.govtRef,
        placeOfSupply: quote.placeOfSupply,
        gstEnabled: quote.gstEnabled !== undefined ? quote.gstEnabled : true,
        gstRate: quote.gstRate !== undefined ? Number(quote.gstRate) : 18,
        isInterstate: Boolean(quote.isInterstate),
        taxType: quote.taxType || (quote.isInterstate ? 'inter' : 'intra'),
        discountType: quote.discountType || 'percent',
        discountValue: Number(quote.discountValue) || 0,
        shippingCharges: Number(quote.shippingCharges) || 0,
        installationCharges: Number(quote.installationCharges) || 0,
        packagingCharges: Number(quote.packagingCharges) || 0,
        roundOffEnabled: quote.roundOffEnabled !== false,
        advancePct: quote.advancePct !== undefined ? Number(quote.advancePct) : 50,
        items: JSON.parse(JSON.stringify(quote.items)),
        terms: quote.terms ? [...quote.terms] : []
      };
      this.saveState();
      this.emit('quotation-updated', this.state.quotation);
      this.logAction('QUOTATION_LOADED', 'QUOTATION', `Loaded quotation ${quote.refNo} into active BOQ Studio`);
      return this.state.quotation;
    }
    return null;
  }

  newQuotation() {
    const newRef = `EI/QUO/${new Date().getFullYear()}/${Math.floor(250 + Math.random() * 80)}`;
    const acct = (db.state.settings && db.state.settings.accounting) ? db.state.settings.accounting : {};
    this.state.quotation = {
      id: `QTN-${new Date().getFullYear()}-${String(this.state.quotations.length + 1).padStart(3, '0')}`,
      refNo: newRef,
      date: new Date().toISOString().split('T')[0],
      validityDays: 15,
      clientName: "",
      department: "",
      site: "",
      scopeOfWork: "Supply, Installation, Testing & Commissioning of CCTV Surveillance System",
      govtRef: "Direct Commercial Bidding",
      placeOfSupply: "Haryana (06) - Intra-State GST Supply",
      gstEnabled: acct.gstEnabled !== undefined ? acct.gstEnabled : true,
      gstRate: acct.defaultGstRate !== undefined ? acct.defaultGstRate : 18,
      isInterstate: acct.defaultTaxType === 'inter',
      taxType: acct.defaultTaxType || 'intra',
      discountType: 'percent',
      discountValue: acct.defaultDiscountPct || 0,
      shippingCharges: acct.defaultShippingCharge || 0,
      installationCharges: 0,
      packagingCharges: 0,
      roundOffEnabled: acct.enableRoundOff !== false,
      advancePct: acct.defaultAdvancePct || 50,
      items: [],
      terms: (db.state.settings && db.state.settings.accounting && Array.isArray(db.state.settings.accounting.statutoryTerms) && db.state.settings.accounting.statutoryTerms.length > 0)
        ? [...db.state.settings.accounting.statutoryTerms]
        : [
          `Payment: ${acct.defaultAdvancePct || 50}% advance along with confirmed work order, balance ${100 - (acct.defaultAdvancePct || 50)}% upon installation sign-off.`,
          acct.gstEnabled !== false ? `Taxes: Goods & Services Tax (GST) charged @ ${acct.defaultGstRate || 18}% as statutory supply.` : `Taxes: Commercial supply exempt from GST under non-taxable / composite turnover schedule.`,
          "Warranty: Comprehensive 2-Year On-Site Manufacturer Warranty on CP Plus Cams, DVR/NVR & WD Hard Disks.",
          "Delivery: Complete hardware mobilization within 3-5 business days upon order confirmation.",
          "Jurisdiction: All disputes subject to Panipat, Haryana jurisdiction only."
        ]
    };
    this.saveState();
    this.emit('quotation-updated', this.state.quotation);
    this.logAction('QUOTATION_NEW', 'QUOTATION', `Initialized clean quotation draft ${newRef}`);
    return this.state.quotation;
  }

  duplicateQuotation(refNoOrId) {
    const original = this.state.quotations.find(q => q.id === refNoOrId || q.refNo === refNoOrId);
    if (original) {
      const cloneRef = `EI/QUO/${new Date().getFullYear()}/${Math.floor(250 + Math.random() * 80)}-COPY`;
      this.state.quotation = {
        ...JSON.parse(JSON.stringify(original)),
        id: `QTN-${new Date().getFullYear()}-${String(this.state.quotations.length + 1).padStart(3, '0')}`,
        refNo: cloneRef,
        date: new Date().toISOString().split('T')[0],
        status: 'Draft'
      };
      this.saveState();
      this.emit('quotation-updated', this.state.quotation);
      this.logAction('QUOTATION_CLONED', 'QUOTATION', `Cloned ${original.refNo} as new draft ${cloneRef}`);
      return this.state.quotation;
    }
    return null;
  }

  updateSavedQuotation(refNoOrId, updates) {
    const idx = this.state.quotations.findIndex(q => q.id === refNoOrId || q.refNo === refNoOrId);
    if (idx !== -1) {
      this.state.quotations[idx] = {
        ...this.state.quotations[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.saveState();
      this.emit('quotations-updated', this.state.quotations);
      this.logAction('QUOTATION_UPDATED', 'QUOTATION', `Updated quotation ${this.state.quotations[idx].refNo} metadata`);
      return this.state.quotations[idx];
    }
    return null;
  }

  deleteSavedQuotation(refNoOrId) {
    const quote = this.state.quotations.find(q => q.id === refNoOrId || q.refNo === refNoOrId);
    if (quote) {
      this.state.quotations = this.state.quotations.filter(q => q.id !== refNoOrId && q.refNo !== refNoOrId);
      this.saveState();
      this.emit('quotations-updated', this.state.quotations);
      this.logAction('QUOTATION_DELETED', 'QUOTATION', `Deleted quotation ${quote.refNo} from storage`);
    }
  }

  // --- Inventory Operations ---
  updateStock(sku, delta, reason = 'Adjustment') {
    const item = this.state.inventory.find(i => i.sku === sku);
    if (item) {
      const oldStock = item.currentStock;
      item.currentStock = Math.max(0, item.currentStock + delta);
      this.saveState();
      this.emit('inventory-updated', this.state.inventory);
      this.logAction('STOCK_ADJUSTED', 'INVENTORY', `${sku} (${item.name}): ${oldStock} -> ${item.currentStock} (${reason})`);
    }
  }

  receivePo(sku, receivedQty) {
    const item = this.state.inventory.find(i => i.sku === sku);
    if (item) {
      item.currentStock += receivedQty;
      item.pendingPoQty = Math.max(0, item.pendingPoQty - receivedQty);
      this.saveState();
      this.emit('inventory-updated', this.state.inventory);
      this.logAction('PO_RECEIVED', 'INVENTORY', `Received ${receivedQty} units of ${sku} (${item.name})`);
    }
  }

  updateDuePayment(sku, amountPaid) {
    const item = this.state.inventory.find(i => i.sku === sku);
    if (item) {
      item.outstandingDue = Math.max(0, item.outstandingDue - amountPaid);
      if (item.outstandingDue === 0) item.paymentTerms = 'Paid in Full';
      this.saveState();
      this.emit('inventory-updated', this.state.inventory);
      this.logAction('VENDOR_PAYMENT', 'INVENTORY', `Recorded vendor payment ₹${amountPaid.toLocaleString('en-IN')} for ${sku}`);
    }
  }

  addInventoryItem(item) {
    const sku = item.sku || `SKU-INV-${Date.now().toString().slice(-4)}`;
    const newItem = {
      sku,
      id: sku,
      name: item.name || 'Hardware SKU',
      category: item.category || 'Accessories & Connectors',
      currentStock: Number(item.currentStock) || 0,
      minReorder: Number(item.minReorder) || 5,
      supplier: item.supplier || 'Aditya Infotech Ltd.',
      pendingPoQty: Number(item.pendingPoQty) || 0,
      outstandingDue: Number(item.outstandingDue) || 0,
      paymentTerms: item.paymentTerms || 'Paid in Full'
    };
    this.state.inventory.unshift(newItem);
    this.saveState();
    this.emit('inventory-updated', this.state.inventory);
    this.logAction('INVENTORY_ITEM_CREATED', 'INVENTORY', `Added stock SKU ${sku}: ${newItem.name}`);
    return newItem;
  }

  updateInventoryItem(sku, updates) {
    const idx = this.state.inventory.findIndex(i => i.sku === sku || i.id === sku);
    if (idx !== -1) {
      this.state.inventory[idx] = { ...this.state.inventory[idx], ...updates };
      this.saveState();
      this.emit('inventory-updated', this.state.inventory);
      this.logAction('INVENTORY_ITEM_UPDATED', 'INVENTORY', `Updated SKU ${sku}`);
    }
  }

  deleteInventoryItem(sku) {
    this.state.inventory = this.state.inventory.filter(i => i.sku !== sku && i.id !== sku);
    this.saveState();
    this.emit('inventory-updated', this.state.inventory);
    this.logAction('INVENTORY_ITEM_DELETED', 'INVENTORY', `Removed inventory SKU ${sku}`);
  }

  // --- Technician Operations ---
  addTechLog(log) {
    const id = `TECH-LOG-${String(this.state.techLogs.length + 1).padStart(2, '0')}`;
    const newLog = {
      id,
      ...log,
      cams: Number(log.cams) || 1,
      points: Number(log.points) || 1,
      rate: Number(log.rate) || 600,
      advance: Number(log.advance) || 0
    };
    this.state.techLogs.unshift(newLog);
    this.saveState();
    this.emit('techlogs-updated', this.state.techLogs);
    this.logAction('TECH_LOG_CREATED', 'TECHNICIANS', `Logged site installation ${id} for ${newLog.techName} at ${newLog.site}`);
    return newLog;
  }

  recordTechAdvance(id, advanceAmount) {
    const log = this.state.techLogs.find(t => t.id === id);
    if (log) {
      log.advance += advanceAmount;
      this.saveState();
      this.emit('techlogs-updated', this.state.techLogs);
      this.logAction('TECH_PAYMENT', 'TECHNICIANS', `Paid advance ₹${advanceAmount.toLocaleString('en-IN')} to ${log.techName} (${id})`);
    }
  }

  updateTechStatus(id, newStatus) {
    const log = this.state.techLogs.find(t => t.id === id);
    if (log) {
      log.status = newStatus;
      this.saveState();
      this.emit('techlogs-updated', this.state.techLogs);
      this.logAction('TECH_STATUS_CHANGE', 'TECHNICIANS', `Site log ${id} status set to ${newStatus}`);
    }
  }

  updateTechLog(id, updates) {
    const idx = this.state.techLogs.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.state.techLogs[idx] = { ...this.state.techLogs[idx], ...updates };
      this.saveState();
      this.emit('techlogs-updated', this.state.techLogs);
      this.logAction('TECH_LOG_UPDATED', 'TECHNICIANS', `Updated site log ${id} for ${this.state.techLogs[idx].techName}`);
    }
  }

  deleteTechLog(id) {
    this.state.techLogs = this.state.techLogs.filter(t => t.id !== id);
    this.saveState();
    this.emit('techlogs-updated', this.state.techLogs);
    this.logAction('TECH_LOG_DELETED', 'TECHNICIANS', `Deleted installation site log ${id}`);
  }

  // --- CRM Leads Operations ---
  calcWinProb(stage) {
    const stageProbMap = {
      'New Inquiry': 0.10,
      'Site Survey Scheduled': 0.30,
      'Quote Prepared': 0.50,
      'Under Negotiation': 0.75,
      'Won - Order Booked': 1.00,
      'Lost - Dropped': 0.00
    };
    return stageProbMap[stage] !== undefined ? stageProbMap[stage] : 0.20;
  }

  addLead(leadData) {
    const id = `LEAD-${100 + this.state.leads.length + 1}`;
    const newLead = {
      id,
      leadId: id,
      ...leadData,
      estCams: Number(leadData.estCams) || 1,
      quotedValue: Number(leadData.quotedValue) || 0,
      winProb: leadData.winProb !== undefined ? Number(leadData.winProb) : this.calcWinProb(leadData.stage)
    };
    this.state.leads.unshift(newLead);
    this.saveState();
    this.emit('leads-updated', this.state.leads);
    this.logAction('LEAD_CREATED', 'CRM', `Created lead ${id} for ${newLead.customer}`);
    return newLead;
  }

  updateLead(id, updates) {
    const idx = this.state.leads.findIndex(l => l.id === id || l.leadId === id);
    if (idx !== -1) {
      if (updates.stage && updates.winProb === undefined) {
        updates.winProb = this.calcWinProb(updates.stage);
      }
      this.state.leads[idx] = { ...this.state.leads[idx], ...updates };
      this.saveState();
      this.emit('leads-updated', this.state.leads);
      this.logAction('LEAD_UPDATED', 'CRM', `Updated lead ${id} (${this.state.leads[idx].customer})`);
    }
  }

  updateLeadStage(id, newStage) {
    const lead = this.state.leads.find(l => l.id === id || l.leadId === id);
    if (lead) {
      lead.stage = newStage;
      lead.winProb = this.calcWinProb(newStage);
      this.saveState();
      this.emit('leads-updated', this.state.leads);
      this.logAction('LEAD_STAGE_CHANGED', 'CRM', `Advanced lead ${id} to ${newStage}`);
    }
  }

  deleteLead(id) {
    this.state.leads = this.state.leads.filter(l => l.id !== id && l.leadId !== id);
    this.saveState();
    this.emit('leads-updated', this.state.leads);
    this.logAction('LEAD_DELETED', 'CRM', `Deleted CRM lead ${id}`);
  }

  // --- AMC & SLA Operations ---
  addAmcContract(contract) {
    const id = `AMC-2026-${String(this.state.amc.length + 1).padStart(2, '0')}`;
    const newContract = {
      id,
      ...contract,
      cams: Number(contract.cams) || 1,
      annualFee: Number(contract.annualFee) || 0
    };
    this.state.amc.unshift(newContract);
    this.saveState();
    this.emit('amc-updated', this.state.amc);
    this.logAction('AMC_CREATED', 'AMC', `Registered new contract ${id} for ${newContract.client}`);
    return newContract;
  }

  updateAmcContract(id, updates) {
    const idx = this.state.amc.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.state.amc[idx] = { ...this.state.amc[idx], ...updates };
      this.saveState();
      this.emit('amc-updated', this.state.amc);
      this.logAction('AMC_UPDATED', 'AMC', `Updated contract terms for ${id} (${this.state.amc[idx].client})`);
    }
  }

  deleteAmcContract(id) {
    this.state.amc = this.state.amc.filter(a => a.id !== id);
    this.saveState();
    this.emit('amc-updated', this.state.amc);
    this.logAction('AMC_DELETED', 'AMC', `Deleted AMC contract ${id}`);
  }

  renewAmcContract(id, years = 1, feeIncreasePct = 0) {
    const contract = this.state.amc.find(a => a.id === id);
    if (contract) {
      const currEnd = new Date(contract.endDate);
      currEnd.setFullYear(currEnd.getFullYear() + years);
      contract.endDate = currEnd.toISOString().split('T')[0];
      contract.status = 'Active';
      if (feeIncreasePct > 0) {
        contract.annualFee = Math.round(contract.annualFee * (1 + feeIncreasePct / 100));
      }
      this.saveState();
      this.emit('amc-updated', this.state.amc);
      this.logAction('AMC_RENEWED', 'AMC', `Renewed contract ${id} (${contract.client}) until ${contract.endDate}`);
    }
  }

  addTicket(ticket) {
    const id = `TKT-${900 + this.state.tickets.length + 1}`;
    const newTicket = {
      id,
      ticketId: id,
      loggedDate: new Date().toISOString().split('T')[0],
      ...ticket,
      turnaroundHrs: Number(ticket.turnaroundHrs) || 0,
      status: ticket.status || 'Open',
      slaStatus: ticket.slaStatus || 'Within SLA'
    };
    this.state.tickets.unshift(newTicket);
    this.saveState();
    this.emit('tickets-updated', this.state.tickets);
    this.logAction('TICKET_LOGGED', 'AMC', `Logged breakdown ticket ${id} for ${newTicket.client}: ${newTicket.issue}`);
    return newTicket;
  }

  updateTicket(id, updates) {
    const idx = this.state.tickets.findIndex(t => t.id === id || t.ticketId === id);
    if (idx !== -1) {
      this.state.tickets[idx] = { ...this.state.tickets[idx], ...updates };
      this.saveState();
      this.emit('tickets-updated', this.state.tickets);
      this.logAction('TICKET_UPDATED', 'AMC', `Updated ticket ${this.state.tickets[idx].ticketId}`);
    }
  }

  deleteTicket(id) {
    this.state.tickets = this.state.tickets.filter(t => t.id !== id && t.ticketId !== id);
    this.saveState();
    this.emit('tickets-updated', this.state.tickets);
    this.logAction('TICKET_DELETED', 'AMC', `Deleted ticket ${id}`);
  }

  resolveTicket(id, resolution, turnaroundHrs) {
    const ticket = this.state.tickets.find(t => t.id === id || t.ticketId === id);
    if (ticket) {
      ticket.status = 'Resolved';
      ticket.resolution = resolution;
      ticket.turnaroundHrs = Number(turnaroundHrs) || ticket.turnaroundHrs;
      ticket.visitDate = new Date().toISOString().split('T')[0];
      this.saveState();
      this.emit('tickets-updated', this.state.tickets);
      this.logAction('TICKET_RESOLVED', 'AMC', `Resolved ticket ${ticket.ticketId}: ${resolution}`);
    }
  }

  // --- Master Items Operations ---
  addItem(item) {
    const newItem = {
      id: item.sku || `SKU-CUS-${Date.now().toString().slice(-4)}`,
      sku: item.sku || `SKU-CUS-${Date.now().toString().slice(-4)}`,
      ...item,
      dealerCost: Number(item.dealerCost) || 0,
      retailSelling: Number(item.retailSelling) || 0,
      gstRate: Number(item.gstRate) || 0.18,
      minReorder: Number(item.minReorder) || 5
    };
    this.state.items.unshift(newItem);

    // Sync to inventory if missing
    const invExists = this.state.inventory.find(i => i.sku === newItem.sku);
    if (!invExists) {
      this.state.inventory.unshift({
        sku: newItem.sku,
        name: newItem.name,
        category: newItem.category || 'Accessories & Connectors',
        currentStock: Number(item.currentStock) || 15,
        safetyMinStock: newItem.minReorder,
        pendingPoQty: 0,
        avgDealerCost: newItem.dealerCost,
        supplierName: item.brand || 'Aditya Infotech Ltd.',
        outstandingDue: 0,
        paymentTerms: '30 Days Net'
      });
      this.emit('inventory-updated', this.state.inventory);
    }

    this.saveState();
    this.emit('items-updated', this.state.items);
    this.logAction('ITEM_CREATED', 'ITEM_MASTER', `Added SKU ${newItem.sku}: ${newItem.name}`);
    return newItem;
  }

  updateItem(id, updates) {
    const idx = this.state.items.findIndex(i => i.id === id || i.sku === id);
    if (idx !== -1) {
      this.state.items[idx] = { ...this.state.items[idx], ...updates };
      this.saveState();
      this.emit('items-updated', this.state.items);
      this.logAction('ITEM_UPDATED', 'ITEM_MASTER', `Updated SKU ${this.state.items[idx].sku}`);
    }
  }

  deleteItem(id) {
    this.state.items = this.state.items.filter(i => i.id !== id && i.sku !== id);
    this.saveState();
    this.emit('items-updated', this.state.items);
    this.logAction('ITEM_DELETED', 'ITEM_MASTER', `Removed SKU ${id}`);
  }

  // --- Zone Engineering Operations ---
  updateZone(id, updates) {
    const idx = this.state.zones.findIndex(z => z.id === id);
    if (idx !== -1) {
      this.state.zones[idx] = {
        ...this.state.zones[idx],
        ...updates,
        area: updates.area !== undefined ? Number(updates.area) : this.state.zones[idx].area,
        qty: updates.qty !== undefined ? Number(updates.qty) : this.state.zones[idx].qty,
        cableMtr: updates.cableMtr !== undefined ? Number(updates.cableMtr) : this.state.zones[idx].cableMtr
      };
      this.saveState();
      this.emit('zones-updated', this.state.zones);
      this.logAction('ZONE_UPDATED', 'CALCULATOR', `Updated engineering zone ${id}: ${this.state.zones[idx].name}`);
      return this.state.zones[idx];
    }
    return null;
  }

  addZone(zone) {
    let nextNum = 1;
    (this.state.zones || []).forEach(z => {
      const match = (z.id || '').match(/Z-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) nextNum = num + 1;
      }
    });
    const id = zone.id || `Z-${String(nextNum).padStart(2, '0')}`;
    const newZone = {
      id,
      name: zone.name || 'New Coverage Zone',
      area: Number(zone.area) || 1000,
      mount: zone.mount || 'Wall Mount',
      camType: zone.camType || 'Bullet IP Camera',
      res: zone.res || 'CP Plus 4MP STQC',
      qty: Number(zone.qty) || 1,
      env: zone.env || 'Indoor',
      cableMtr: Number(zone.cableMtr) || 30,
      notes: zone.notes || 'Standard surveillance coverage zone'
    };
    this.state.zones.push(newZone);
    this.saveState();
    this.emit('zones-updated', this.state.zones);
    this.logAction('ZONE_ADDED', 'CALCULATOR', `Added engineering zone ${id}: ${newZone.name}`);
    return newZone;
  }

  duplicateZone(id) {
    const orig = this.state.zones.find(z => z.id === id);
    if (orig) {
      return this.addZone({
        ...orig,
        id: null,
        name: `${orig.name} (Copy)`
      });
    }
    return null;
  }

  deleteZone(id) {
    const orig = this.state.zones.find(z => z.id === id);
    this.state.zones = this.state.zones.filter(z => z.id !== id);
    this.saveState();
    this.emit('zones-updated', this.state.zones);
    this.logAction('ZONE_DELETED', 'CALCULATOR', `Deleted zone ${id} (${orig ? orig.name : ''})`);
  }

  resetZones() {
    this.state.zones = JSON.parse(JSON.stringify(INITIAL_ZONES));
    this.saveState();
    this.emit('zones-updated', this.state.zones);
    this.logAction('ZONES_RESET', 'CALCULATOR', 'Reset coverage zones to authentic UHBVN & Mandi seed profile');
  }

  clearAllZones() {
    this.state.zones = [];
    this.saveState();
    this.emit('zones-updated', this.state.zones);
    this.logAction('ZONES_CLEARED', 'CALCULATOR', 'Cleared all coverage zones for custom engineering design');
  }

  setZones(newZones, blueprintName = 'Custom Blueprint') {
    this.state.zones = JSON.parse(JSON.stringify(newZones));
    this.saveState();
    this.emit('zones-updated', this.state.zones);
    this.logAction('ZONES_BLUEPRINT_LOADED', 'CALCULATOR', `Loaded ${blueprintName} (${this.state.zones.length} zones)`);
  }

  // --- Hierarchical User Management Operations ---
  addUser(userData) {
    const id = `usr-${String(this.state.users.length + 1).padStart(2, '0')}`;
    const manager = this.state.users.find(u => u.id === userData.reportsTo);

    let level = Number(userData.level) || 3;
    let levelName = `Level ${level}: Technical Specialist`;
    if (level === 1) levelName = 'Level 1: Executive C-Suite';
    else if (level === 2) levelName = 'Level 2: Department Head';
    else if (level === 4) levelName = 'Level 4: Field Technician';

    const newUser = {
      id,
      username: userData.username.toLowerCase().trim(),
      password: userData.password || 'password123',
      name: userData.name,
      role: userData.role || 'Field Engineer',
      roleCode: userData.roleCode || 'TECH',
      title: userData.title || 'Technical Specialist',
      level,
      levelName,
      department: userData.department || 'Operations & Projects',
      reportsTo: userData.reportsTo || 'usr-01',
      reportsToName: manager ? `${manager.name} (${manager.role})` : 'Aditya Sharma (Managing Director)',
      email: userData.email,
      phone: userData.phone || '+91 89300-00000',
      avatar: userData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
      badgeColor: userData.badgeColor || '#6366f1',
      status: 'Active',
      companyId: db.getActiveCompanyId ? db.getActiveCompanyId() : 'comp-eliza',
      allowedModules: userData.allowedModules || ['dashboard', 'calculators', 'amc']
    };

    this.state.users.push(newUser);
    // Automatic bidirectional sync: create or link matching employee
    this.syncUserToEmployee(newUser);
    this.saveState();
    this.emit('users-updated', this.state.users);
    this.logAction('USER_HIERARCHY_ADDED', 'AUTH', `Super Admin Aditya Sharma created user ${newUser.name} (${newUser.role}) reporting to ${newUser.reportsToName}`);
    return newUser;
  }

  updateUser(userId, updates) {
    const idx = this.state.users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      if (updates.reportsTo && updates.reportsTo !== this.state.users[idx].reportsTo) {
        const mgr = this.state.users.find(u => u.id === updates.reportsTo);
        updates.reportsToName = mgr ? `${mgr.name} (${mgr.role})` : 'Board of Directors / Apex';
      }
      if (updates.level) {
        const lvl = Number(updates.level);
        if (lvl === 1) updates.levelName = 'Level 1: Executive C-Suite';
        else if (lvl === 2) updates.levelName = 'Level 2: Department Head';
        else if (lvl === 3) updates.levelName = 'Level 3: Technical Specialist';
        else if (lvl === 4) updates.levelName = 'Level 4: Field Technician';
      }
      this.state.users[idx] = { ...this.state.users[idx], ...updates };
      
      // Propagate changes to linked employee
      const updatedUser = this.state.users[idx];
      const emp = (this.state.employees || []).find(e => e.userId === updatedUser.id || e.id === updatedUser.employeeId);
      if (emp) {
        if (updates.name) emp.name = updates.name;
        if (updates.role) emp.role = updates.role;
        if (updates.email) emp.email = updates.email;
        if (updates.phone) emp.phone = updates.phone;
        if (updates.status) emp.active = updates.status === 'Active';
      }

      this.saveState();
      this.emit('users-updated', this.state.users);
      this.emit('employees-updated', this.state.employees);
      this.logAction('USER_HIERARCHY_UPDATED', 'AUTH', `Super Admin updated hierarchy for ${this.state.users[idx].name}`);
    }
  }

  toggleUserStatus(userId) {
    const user = this.state.users.find(u => u.id === userId);
    if (user && user.roleCode !== 'ADMIN') { // Super Admin cannot be deactivated
      user.status = user.status === 'Active' ? 'Suspended' : 'Active';
      const emp = (this.state.employees || []).find(e => e.userId === user.id || e.id === user.employeeId);
      if (emp) {
        emp.active = user.status === 'Active';
      }
      this.saveState();
      this.emit('users-updated', this.state.users);
      this.emit('employees-updated', this.state.employees);
      this.logAction('USER_STATUS_TOGGLED', 'AUTH', `Super Admin toggled ${user.name} status to ${user.status}`);
    }
  }

  deleteUser(userId) {
    const user = this.state.users.find(u => u.id === userId);
    if (user && user.roleCode !== 'ADMIN') {
      // Reassign any direct subordinates to Super Admin Aditya Sharma
      this.state.users.forEach(u => {
        if (u.reportsTo === userId) {
          u.reportsTo = 'usr-01';
          u.reportsToName = 'Aditya Sharma (Managing Director)';
        }
      });
      // Unlink from employee
      const emp = (this.state.employees || []).find(e => e.userId === user.id || e.id === user.employeeId);
      if (emp) {
        emp.userId = null;
      }
      this.state.users = this.state.users.filter(u => u.id !== userId);
      this.saveState();
      this.emit('users-updated', this.state.users);
      this.emit('employees-updated', this.state.employees);
      this.logAction('USER_DELETED', 'AUTH', `Super Admin removed user ${user.name} from organization`);
    }
  }

  getUserHierarchyTree() {
    const users = this.state.users;
    const root = users.find(u => u.roleCode === 'ADMIN' || !u.reportsTo) || users[0];

    const buildNode = (user) => {
      const children = users.filter(u => u.reportsTo === user.id);
      return {
        ...user,
        subordinatesCount: children.length,
        children: children.map(buildNode)
      };
    };

    return buildNode(root);
  }

  // --- Clean-Slate Reset & Backup ---
  cleanSlateReset(options = {}) {
    const res = db.cleanSlateReset(options);
    this.saveState();
    this.emit('state-changed', this.state);
    this.logAction('CLEAN_SLATE_RESET', 'SYSTEM', 'Executed Clean-Slate Reset (Kept Party & Item Masters, zeroed accounts, cleared jobs/leads/tickets/staff)');
    return res;
  }

  exportBackup() {
    return db.exportFullBackupFile();
  }

  exportFullBackup() {
    return db.exportFullBackup();
  }

  cleanPayoutsAndLedgers(companyId = null) {
    const res = db.cleanPayoutsAndLedgers(companyId);
    this.saveState();
    this.emit('payouts-updated', this.state.payouts);
    this.emit('ledger-updated', this.state.ledger);
    this.emit('state-changed', this.state);
    this.logAction('PAYOUTS_LEDGER_CLEANED', 'FINANCE', 'Cleaned all employee payouts, vouchers and ledger accounts to zero');
    return res;
  }

  // --- Employee <-> User Sync & Reconciliation ---
  getReconciliationReport() {
    return db.getEmployeeAccountReconciliation();
  }

  reconcileEmployees() {
    const res = db.executeReconciliation();
    this.saveState();
    this.emit('users-updated', this.state.users);
    this.emit('employees-updated', this.state.employees);
    this.logAction('EMPLOYEE_RECONCILED', 'AUTH', 'Reconciled and linked Employees and User Accounts');
    return res;
  }

  syncEmployeeToUser(employee, credentials) {
    const res = db.syncEmployeeToUser(employee, credentials);
    this.saveState();
    this.emit('users-updated', this.state.users);
    return res;
  }

  syncUserToEmployee(user) {
    const res = db.syncUserToEmployee(user);
    this.saveState();
    this.emit('employees-updated', this.state.employees);
    return res;
  }

  deactivateEmployee(empId) {
    const res = db.deactivateEmployee(empId);
    this.saveState();
    this.emit('employees-updated', this.state.employees);
    this.emit('users-updated', this.state.users);
    return res;
  }

  deleteEmployee(empId) {
    const res = db.deleteEmployee(empId);
    this.saveState();
    this.emit('employees-updated', this.state.employees);
    this.emit('users-updated', this.state.users);
    return res;
  }
}

export const store = new Store();
