// People Service - Single Source of Truth for Workforce & Identity Management
// Merges Employees and Login Accounts into one unified person record.

import { db } from '../store/db.js';
import { store } from './store.js';
import { auth } from './auth.js';
import { MockAuthAdapter } from './authAdapter.js';
import { auditService } from './auditService.js';
import { ROLES, normalizeRole, DEFAULT_PERMISSION_MATRIX } from '../config/permissions.js';
import { hashPassword } from './supabase.js';

const PEOPLE_STORAGE_KEY = 'ELIZA_PEOPLE_UNIFIED_V1';

export class PeopleService {
  constructor() {
    this.authAdapter = new MockAuthAdapter(
      () => store.state.users || [],
      () => store.saveState()
    );
    this.listeners = new Set();
    this.people = [];
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    this.people = this._loadPeople();
    if (!this.people || !this.people.length) {
      this.reconcile();
    }
    // Ensure Aditya Sharma is Super Admin in unified workforce directory
    const aditya = (this.people || []).find(p => 
      (p.fullName && p.fullName.toLowerCase() === 'aditya sharma') ||
      (p.displayName && p.displayName.toLowerCase() === 'aditya sharma') ||
      p.employeeCode === 'EMP-012' ||
      p.authUserId === 'usr-01'
    );
    if (aditya && (aditya.role !== ROLES.SUPER_ADMIN || aditya.designation === 'Supervisor')) {
      aditya.role = ROLES.SUPER_ADMIN;
      aditya.designation = 'Super Admin';
      this._persist();
    }
    this._syncLegacyCollections();
    this.initialized = true;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notify(event, data) {
    this.listeners.forEach(cb => {
      try { cb(event, data); } catch (e) { console.error('Error in peopleService listener', e); }
    });
  }

  _loadPeople() {
    try {
      const saved = localStorage.getItem(PEOPLE_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load people storage', e);
    }
    return [];
  }

  _persist() {
    try {
      localStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(this.people));
      this._syncLegacyCollections();
    } catch (e) {
      console.error('Failed to persist people storage', e);
    }
  }

  /**
   * Keep backward compatibility with db.collection('employees') and store.state.users
   * so existing modules, jobs, tickets, and ledgers work 100% seamlessly.
   */
  _syncLegacyCollections() {
    const compId = db.getActiveCompanyId ? db.getActiveCompanyId() : 'comp-eliza';

    // 1. Map people into legacy employees collection
    const legacyEmployees = this.people.map(p => ({
      id: p.employeeCode || p.id,
      personId: p.id,
      userId: p.authUserId || null,
      companyId: p.companyId || compId,
      name: p.fullName,
      email: p.email,
      phone: p.phone,
      role: p.role === ROLES.SUPER_ADMIN ? 'Super Admin' : (p.designation || p.role),
      roleCode: p.role === ROLES.SUPER_ADMIN ? 'ADMIN' : p.role,
      joinDate: p.joinDate,
      payType: p.payType,
      defaultRate: p.defaultRate,
      active: p.employmentStatus === 'ACTIVE' && p.accessStatus !== 'SUSPENDED' && p.accessStatus !== 'DEACTIVATED',
      upiId: p.upiId || '',
      canBeAssignedJobs: p.canBeAssignedJobs,
      notes: p.skills?.join(', ') || ''
    }));

    // Update db.state.employees
    if (!db.state) db.state = {};
    db.state.employees = legacyEmployees;

    // 2. Map people with login access into store.state.users
    const legacyUsers = this.people
      .filter(p => p.accessStatus !== 'NONE')
      .map(p => {
        const existingUser = (store.state.users || []).find(u => u.id === p.authUserId || (u.email && u.email.toLowerCase() === p.email.toLowerCase()));
        return {
          id: p.authUserId || `usr-${p.id}`,
          personId: p.id,
          employeeId: p.employeeCode,
          companyId: p.companyId || compId,
          username: existingUser?.username || p.email.split('@')[0],
          password: existingUser?.password || 'password123',
          name: p.displayName || p.fullName,
          email: p.email,
          phone: p.phone,
          role: p.role === ROLES.SUPER_ADMIN ? 'Super Admin' : (p.designation || p.role),
          roleCode: p.role,
          title: p.designation || p.role,
          department: p.department || 'Operations',
          status: p.accessStatus === 'ACTIVE' ? 'Active' : 'Suspended',
          avatar: p.photoUrl ? null : (p.displayName || p.fullName).split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
          badgeColor: p.badgeColor || '#3b82f6',
          allowedModules: this._getAllowedModulesForRole(p.role)
        };
      });

    store.state.users = legacyUsers;
    store.saveState();
  }

  _getAllowedModulesForRole(role) {
    const canonical = normalizeRole(role);
    if (canonical === ROLES.SUPER_ADMIN) {
      return ['dashboard', 'calculators', 'quotation', 'crm', 'projects', 'amc', 'inventory', 'technicians', 'items', 'parties', 'audit', 'settings', 'jobs', 'job-board', 'tickets', 'payouts', 'team', 'reports', 'admin-users'];
    }
    if (canonical === ROLES.ADMIN) {
      return ['dashboard', 'calculators', 'quotation', 'crm', 'projects', 'amc', 'inventory', 'technicians', 'items', 'parties', 'jobs', 'job-board', 'tickets', 'payouts', 'team', 'reports', 'settings'];
    }
    if (canonical === ROLES.SUPERVISOR) {
      return ['dashboard', 'calculators', 'projects', 'inventory', 'jobs', 'job-board', 'tickets', 'payouts', 'team', 'reports'];
    }
    if (canonical === ROLES.ACCOUNTS) {
      return ['dashboard', 'quotation', 'projects', 'inventory', 'items', 'parties', 'payouts', 'reports'];
    }
    if (canonical === ROLES.SALES_EXEC) {
      return ['dashboard', 'calculators', 'quotation', 'crm', 'items', 'parties'];
    }
    if (canonical === ROLES.TECHNICIAN) {
      return ['dashboard', 'jobs', 'job-board', 'tickets', 'payouts'];
    }
    return ['dashboard'];
  }

  /**
   * Generates next auto-increment Employee Code (EMP-0001)
   */
  getNextEmployeeCode() {
    let max = 0;
    this.people.forEach(p => {
      const match = (p.employeeCode || '').match(/EMP-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > max) max = num;
      }
    });
    return `EMP-${String(max + 1).padStart(4, '0')}`;
  }

  // -------------------------------------------------------------
  // CRUD Operations
  // -------------------------------------------------------------
  async list(filterFn = null) {
    await this.init();
    let res = [...this.people];
    if (typeof filterFn === 'function') {
      res = res.filter(filterFn);
    }
    return JSON.parse(JSON.stringify(res));
  }

  async get(id) {
    await this.init();
    if (!id) return null;
    const clean = String(id).trim().toLowerCase();
    const p = this.people.find(x => 
      (x.id && x.id.toLowerCase() === clean) || 
      (x.employeeCode && x.employeeCode.toLowerCase() === clean) || 
      (x.authUserId && x.authUserId.toLowerCase() === clean) ||
      (x.email && x.email.toLowerCase() === clean)
    );
    return p ? JSON.parse(JSON.stringify(p)) : null;
  }

  /**
   * Return people eligible for field job and service dispatch
   */
  async getActiveAssignablePeople() {
    await this.init();
    return this.people.filter(p => 
      p.employmentStatus === 'ACTIVE' &&
      p.accessStatus !== 'SUSPENDED' &&
      p.accessStatus !== 'DEACTIVATED' &&
      p.canBeAssignedJobs !== false
    );
  }

  /**
   * Create a new Person with synchronous auth identity creation
   */
  async createPerson(personData, options = {}, currentUser = null) {
    await this.init();
    const actor = currentUser || auth.getCurrentUser() || { name: 'Super Admin', role: 'Super Admin' };

    const email = (personData.email || '').trim().toLowerCase();
    const phone = (personData.phone || '').trim();

    // 1. Validation
    if (!personData.fullName || !personData.fullName.trim()) {
      throw new Error('Full Name is required.');
    }
    if (email) {
      const emailExists = this.people.some(p => p.email && p.email.toLowerCase() === email);
      if (emailExists) throw new Error(`A person with email '${email}' already exists.`);
    }

    const assignedRole = normalizeRole(personData.role || ROLES.TECHNICIAN);

    // Safeguard: Only Super Admin can create another Super Admin
    if (assignedRole === ROLES.SUPER_ADMIN && !auth.isSuperAdmin()) {
      auditService.log({
        actorName: actor.name,
        actorRole: actor.role,
        action: 'SECURITY_ESCALATION_BLOCKED',
        targetType: 'PERSON',
        targetName: personData.fullName,
        details: 'Unauthorized attempt to create a Super Admin user blocked.',
        status: 'FAILED'
      });
      throw new Error('Unauthorized: Only an existing Super Admin can create another Super Admin.');
    }

    const id = personData.id || `per_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const employeeCode = personData.employeeCode || this.getNextEmployeeCode();
    const authUserId = `usr_${id.replace('per_', '')}`;

    const newPerson = {
      id,
      authUserId: personData.accessStatus === 'NONE' ? null : authUserId,
      employeeCode,
      fullName: personData.fullName.trim(),
      displayName: personData.displayName || personData.fullName.trim(),
      email,
      phone,
      photoUrl: personData.photoUrl || null,
      role: assignedRole,
      designation: personData.designation || personData.role || 'Field Engineer',
      department: personData.department || 'Field Operations',
      reportingToId: personData.reportingToId || null,
      joinDate: personData.joinDate || new Date().toISOString().slice(0, 10),
      exitDate: null,
      accessStatus: personData.accessStatus || (options.sendInvite ? 'INVITED' : 'ACTIVE'),
      employmentStatus: personData.employmentStatus || 'ACTIVE',
      payType: personData.payType || 'PerPoint',
      defaultRate: Number(personData.defaultRate) || 600,
      canBeAssignedJobs: personData.canBeAssignedJobs !== undefined ? !!personData.canBeAssignedJobs : true,
      address: personData.address || '',
      emergencyContactName: personData.emergencyContactName || '',
      emergencyContactPhone: personData.emergencyContactPhone || '',
      upiId: personData.upiId || '',
      bankLast4: personData.bankLast4 || '',
      languages: Array.isArray(personData.languages) ? personData.languages : ['Hindi', 'English'],
      skills: Array.isArray(personData.skills) ? personData.skills : [],
      lastLoginAt: null,
      lastActiveAt: null,
      mustChangePassword: !!options.tempPassword,
      createdBy: actor.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null
    };

    // If login access enabled, create account in users list
    if (newPerson.accessStatus !== 'NONE') {
      const password = options.tempPassword || 'password123';
      const hashedPassword = await hashPassword(password);
      if (!store.state.users) store.state.users = [];
      store.state.users.push({
        id: authUserId,
        personId: id,
        employeeId: employeeCode,
        username: email ? email.split('@')[0] : employeeCode.toLowerCase(),
        password: hashedPassword,
        name: newPerson.fullName,
        email: newPerson.email,
        phone: newPerson.phone,
        role: newPerson.role === ROLES.SUPER_ADMIN ? 'Super Admin' : newPerson.designation,
        roleCode: newPerson.role,
        title: newPerson.designation,
        department: newPerson.department,
        status: newPerson.accessStatus === 'ACTIVE' ? 'Active' : 'Suspended',
        mustChangePassword: !!options.tempPassword,
        allowedModules: this._getAllowedModulesForRole(newPerson.role)
      });
      store.saveState();
    }

    this.people.unshift(newPerson);
    this._persist();

    auditService.log({
      actorName: actor.name,
      actorRole: actor.role,
      action: 'PERSON_CREATED',
      targetType: 'PERSON',
      targetId: id,
      targetName: `${newPerson.fullName} (${employeeCode})`,
      details: `Created new person profile with role ${assignedRole} and accessStatus ${newPerson.accessStatus}`
    });

    this._notify('person.created', newPerson);
    return JSON.parse(JSON.stringify(newPerson));
  }

  /**
   * Update an existing person record with automatic propagation to user accounts
   */
  async updatePerson(id, updates, currentUser = null) {
    await this.init();
    const actor = currentUser || auth.getCurrentUser() || { name: 'Super Admin', role: 'Super Admin', id: 'usr-01' };

    const idx = this.people.findIndex(p => p.id === id || p.employeeCode === id);
    if (idx === -1) throw new Error(`Person '${id}' not found.`);

    const existing = this.people[idx];
    const beforeState = JSON.parse(JSON.stringify(existing));

    // =========================================================
    // HARD SAFEGUARDS
    // =========================================================
    // 1. Cannot demote or suspend yourself
    const isSelf = (actor.id === existing.authUserId || actor.email === existing.email);
    if (isSelf) {
      if (updates.accessStatus && updates.accessStatus !== existing.accessStatus && (updates.accessStatus === 'SUSPENDED' || updates.accessStatus === 'DEACTIVATED')) {
        throw new Error('Security Safeguard: You cannot suspend or deactivate your own account.');
      }
      if (updates.role && normalizeRole(updates.role) !== existing.role) {
        throw new Error('Security Safeguard: You cannot demote or change your own role.');
      }
    }

    // 2. Cannot remove or demote the last Super Admin
    if (existing.role === ROLES.SUPER_ADMIN) {
      const superAdmins = this.people.filter(p => p.role === ROLES.SUPER_ADMIN && p.accessStatus === 'ACTIVE');
      const isDemoting = updates.role && normalizeRole(updates.role) !== ROLES.SUPER_ADMIN;
      const isSuspending = updates.accessStatus && updates.accessStatus !== 'ACTIVE';

      if ((isDemoting || isSuspending) && superAdmins.length <= 1) {
        throw new Error('Security Safeguard: Cannot demote or suspend the last active Super Admin. Maintain at least one Super Admin.');
      }
    }

    // 3. Only Super Admin can change someone to/from Super Admin
    if (updates.role) {
      const newRole = normalizeRole(updates.role);
      if ((newRole === ROLES.SUPER_ADMIN || existing.role === ROLES.SUPER_ADMIN) && !auth.isSuperAdmin()) {
        auditService.log({
          actorName: actor.name,
          actorRole: actor.role,
          action: 'SECURITY_ESCALATION_BLOCKED',
          targetType: 'PERSON',
          targetId: id,
          targetName: existing.fullName,
          details: 'Non-Super Admin attempted to modify a Super Admin role.',
          status: 'FAILED'
        });
        throw new Error('Unauthorized: Only Super Admin can modify or assign the Super Admin role.');
      }
    }

    // 4. Unique email validation if changing
    if (updates.email && updates.email.toLowerCase() !== existing.email?.toLowerCase()) {
      const cleanEmail = updates.email.trim().toLowerCase();
      const duplicate = this.people.some(p => p.id !== existing.id && p.email && p.email.toLowerCase() === cleanEmail);
      if (duplicate) throw new Error(`Email '${cleanEmail}' is already assigned to another person.`);
    }

    // Apply updates
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    if (updates.role) {
      updated.role = normalizeRole(updates.role);
    }

    // Auto-suspension if Employment Status changed to EXITED
    let warning = null;
    if (updates.employmentStatus === 'EXITED' && existing.employmentStatus !== 'EXITED') {
      if (!updates.accessStatus) {
        updated.accessStatus = 'SUSPENDED';
      }
      updated.canBeAssignedJobs = false;
      updated.exitDate = updates.exitDate || new Date().toISOString().slice(0, 10);

      // Check outstanding balance in payouts/ledgers
      const payouts = await db.collection('payouts').list();
      const empPayouts = payouts.filter(p => p.employeeId === existing.employeeCode || p.employeeId === existing.id);
      const totalEarned = empPayouts.filter(p => p.direction === 'CR').reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const totalPaid = empPayouts.reduce((s, p) => s + (Number(p.paidAmount) || 0), 0);
      const balance = totalEarned - totalPaid;

      if (balance > 0) {
        warning = `Person marked as EXITED. Note: Person has an outstanding ledger balance of ₹${balance.toLocaleString('en-IN')}. Please settle before final sign-off.`;
      }
    }

    // If accessStatus changed to SUSPENDED or DEACTIVATED, revoke active sessions
    if (updates.accessStatus === 'SUSPENDED' || updates.accessStatus === 'DEACTIVATED') {
      await this.authAdapter.revokeSessions(existing.authUserId);
    }

    this.people[idx] = updated;
    this._persist();

    // Log audit trail
    auditService.log({
      actorName: actor.name,
      actorRole: actor.role,
      action: updates.role && updates.role !== existing.role ? 'ROLE_CHANGED' : 'PERSON_UPDATED',
      targetType: 'PERSON',
      targetId: id,
      targetName: `${updated.fullName} (${updated.employeeCode})`,
      details: updates.role && updates.role !== existing.role 
        ? `Role updated from ${existing.role} to ${updated.role}`
        : `Profile updated: ${Object.keys(updates).join(', ')}`,
      before: beforeState,
      after: updated
    });

    this._notify('person.updated', updated);
    return { person: JSON.parse(JSON.stringify(updated)), warning };
  }

  /**
   * Delete Person with strict dependency check (Section 6)
   */
  async deletePerson(id, confirmationCode, currentUser = null) {
    await this.init();
    const actor = currentUser || auth.getCurrentUser() || { name: 'Super Admin', role: 'Super Admin' };

    const person = this.people.find(p => p.id === id || p.employeeCode === id);
    if (!person) throw new Error(`Person '${id}' not found.`);

    // 1. Cannot delete yourself
    if (actor.id === person.authUserId || actor.email === person.email) {
      throw new Error('Security Safeguard: You cannot delete your own account.');
    }

    // 2. Cannot delete the last Super Admin
    if (person.role === ROLES.SUPER_ADMIN) {
      const activeSuperAdmins = this.people.filter(p => p.role === ROLES.SUPER_ADMIN && p.accessStatus === 'ACTIVE');
      if (activeSuperAdmins.length <= 1) {
        throw new Error('Security Safeguard: Cannot delete the last active Super Admin.');
      }
    }

    // 3. Must verify typed confirmation code
    if ((confirmationCode || '').trim() !== person.employeeCode) {
      throw new Error(`Confirmation mismatch: Please type the exact employee code '${person.employeeCode}' to confirm.`);
    }

    // 4. Check dependencies in jobs, tickets, payouts, ledgers
    const dependencies = await this.checkPersonDependencies(person);

    if (dependencies.hasDependencies) {
      throw new Error(`Cannot hard-delete person with historical activity (${dependencies.summary}). Please use Archive / Anonymize instead to preserve financial and technical audits.`);
    }

    // If zero dependencies, execute hard delete
    this.people = this.people.filter(p => p.id !== person.id);
    if (person.authUserId) {
      await this.authAdapter.revokeSessions(person.authUserId);
      store.state.users = (store.state.users || []).filter(u => u.id !== person.authUserId);
    }
    this._persist();

    auditService.log({
      actorName: actor.name,
      actorRole: actor.role,
      action: 'PERSON_HARD_DELETED',
      targetType: 'PERSON',
      targetId: person.id,
      targetName: `${person.fullName} (${person.employeeCode})`,
      details: `Permanently removed person and auth credentials (zero dependencies verified).`
    });

    this._notify('person.deleted', { id: person.id });
    return { success: true, mode: 'HARD_DELETE' };
  }

  /**
   * Archive / Anonymize a person with dependencies (Section 6)
   */
  async archivePerson(id, confirmationCode, currentUser = null) {
    await this.init();
    const actor = currentUser || auth.getCurrentUser() || { name: 'Super Admin', role: 'Super Admin' };

    const person = this.people.find(p => p.id === id || p.employeeCode === id);
    if (!person) throw new Error(`Person '${id}' not found.`);

    if ((confirmationCode || '').trim() !== person.employeeCode) {
      throw new Error(`Confirmation mismatch: Please type '${person.employeeCode}' to confirm archive.`);
    }

    const archivedName = `Former Employee (${person.employeeCode})`;
    return this.updatePerson(person.id, {
      fullName: archivedName,
      displayName: archivedName,
      email: `archived_${person.employeeCode.toLowerCase()}@eliza.internal`,
      phone: '',
      photoUrl: null,
      accessStatus: 'DEACTIVATED',
      employmentStatus: 'EXITED',
      canBeAssignedJobs: false,
      deletedAt: new Date().toISOString()
    }, actor);
  }

  /**
   * Count dependencies across historical collections
   */
  async checkPersonDependencies(person) {
    const code = person.employeeCode;
    const pid = person.id;
    const uid = person.authUserId;

    const jobs = await db.collection('jobs').list();
    const linkedJobs = jobs.filter(j => (j.assignees || []).some(a => a.employeeId === code || a.employeeId === pid));

    const tickets = await db.collection('tickets').list();
    const linkedTickets = tickets.filter(t => t.assignedTo === code || t.assignedTo === pid || t.assignedTo === uid);

    const payouts = await db.collection('payouts').list();
    const linkedPayouts = payouts.filter(p => p.employeeId === code || p.employeeId === pid);

    const ledger = await db.collection('ledger').list();
    const linkedLedger = ledger.filter(l => l.employeeId === code || l.employeeId === pid);

    const total = linkedJobs.length + linkedTickets.length + linkedPayouts.length + linkedLedger.length;

    return {
      hasDependencies: total > 0,
      totalCount: total,
      jobsCount: linkedJobs.length,
      ticketsCount: linkedTickets.length,
      payoutsCount: linkedPayouts.length,
      ledgerCount: linkedLedger.length,
      summary: `${linkedJobs.length} Jobs, ${linkedTickets.length} Tickets, ${linkedPayouts.length} Payouts, ${linkedLedger.length} Ledger entries`
    };
  }

  // -------------------------------------------------------------
  // Reconciliation Engine (Section 2 & 3)
  // -------------------------------------------------------------
  reconcile() {
    const existingEmployees = db.state?.employees || [];
    const existingUsers = store.state?.users || [];
    const compId = db.getActiveCompanyId ? db.getActiveCompanyId() : 'comp-eliza';

    const mergedPeople = [];
    const matchedUserIds = new Set();
    const matchedEmpIds = new Set();

    // 1. Match by Email first
    existingEmployees.forEach(emp => {
      const empEmail = (emp.email || '').trim().toLowerCase();
      let matchedUser = null;

      if (empEmail) {
        matchedUser = existingUsers.find(u => u.email && u.email.toLowerCase() === empEmail);
      }

      // 2. Match by exact name if no email match
      if (!matchedUser && emp.name) {
        matchedUser = existingUsers.find(u => u.name && u.name.trim().toLowerCase() === emp.name.trim().toLowerCase());
      }

      // 3. Match by phone
      if (!matchedUser && emp.phone) {
        matchedUser = existingUsers.find(u => u.phone && u.phone.replace(/[^0-9]/g, '') === emp.phone.replace(/[^0-9]/g, ''));
      }

      if (matchedUser) {
        matchedUserIds.add(matchedUser.id);
        matchedEmpIds.add(emp.id);

        const assignedRole = normalizeRole(matchedUser.role || matchedUser.roleCode || emp.role);
        const isSuperAdminPerson = assignedRole === ROLES.SUPER_ADMIN || (emp.name && emp.name.toLowerCase() === 'aditya sharma') || (matchedUser.name && matchedUser.name.toLowerCase() === 'aditya sharma');
        const finalRole = isSuperAdminPerson ? ROLES.SUPER_ADMIN : assignedRole;
        const finalDesignation = isSuperAdminPerson 
          ? (matchedUser.title || 'Managing Director & CEO')
          : (emp.role || matchedUser.title || 'Technical Specialist');

        mergedPeople.push({
          id: `per_${emp.id.toLowerCase()}`,
          authUserId: matchedUser.id,
          employeeCode: emp.id.startsWith('EMP-') ? emp.id : `EMP-${emp.id}`,
          fullName: emp.name || matchedUser.name,
          displayName: matchedUser.name || emp.name,
          email: matchedUser.email || emp.email,
          phone: emp.phone || matchedUser.phone,
          photoUrl: null,
          role: finalRole,
          designation: finalDesignation,
          department: matchedUser.department || 'Field Operations',
          reportingToId: matchedUser.reportsTo || null,
          joinDate: emp.joinDate || '2024-01-01',
          exitDate: null,
          accessStatus: matchedUser.status === 'Suspended' ? 'SUSPENDED' : 'ACTIVE',
          employmentStatus: emp.active ? 'ACTIVE' : 'ON_LEAVE',
          payType: emp.payType || 'PerPoint',
          defaultRate: emp.defaultRate || 600,
          canBeAssignedJobs: emp.canBeAssignedJobs !== false,
          address: '',
          emergencyContactName: '',
          emergencyContactPhone: '',
          upiId: emp.upiId || '',
          bankLast4: '',
          languages: ['Hindi', 'English'],
          skills: emp.notes ? [emp.notes] : [],
          lastLoginAt: null,
          lastActiveAt: null,
          mustChangePassword: false,
          createdBy: 'Reconciliation Engine',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        // Employee without user account
        mergedPeople.push({
          id: `per_${emp.id.toLowerCase()}`,
          authUserId: null,
          employeeCode: emp.id.startsWith('EMP-') ? emp.id : `EMP-${emp.id}`,
          fullName: emp.name,
          displayName: emp.name,
          email: emp.email || '',
          phone: emp.phone || '',
          photoUrl: null,
          role: normalizeRole(emp.role),
          designation: emp.role,
          department: 'Field Operations',
          reportingToId: null,
          joinDate: emp.joinDate || '2024-01-01',
          exitDate: null,
          accessStatus: 'NONE', // No login yet
          employmentStatus: emp.active ? 'ACTIVE' : 'EXITED',
          payType: emp.payType || 'PerPoint',
          defaultRate: emp.defaultRate || 600,
          canBeAssignedJobs: emp.canBeAssignedJobs !== false,
          address: '',
          emergencyContactName: '',
          emergencyContactPhone: '',
          upiId: emp.upiId || '',
          bankLast4: '',
          languages: ['Hindi'],
          skills: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    });

    // 4. Any remaining user accounts without an employee record
    existingUsers.forEach(user => {
      if (!matchedUserIds.has(user.id)) {
        const nextCode = `EMP-${String(mergedPeople.length + 1).padStart(4, '0')}`;
        mergedPeople.push({
          id: `per_${user.id.toLowerCase()}`,
          authUserId: user.id,
          employeeCode: nextCode,
          fullName: user.name,
          displayName: user.name,
          email: user.email,
          phone: user.phone || '',
          photoUrl: null,
          role: normalizeRole(user.role || user.roleCode),
          designation: user.title || user.role,
          department: user.department || 'Management',
          reportingToId: user.reportsTo || null,
          joinDate: '2024-01-01',
          exitDate: null,
          accessStatus: user.status === 'Suspended' ? 'SUSPENDED' : 'ACTIVE',
          employmentStatus: 'ACTIVE',
          payType: 'Monthly',
          defaultRate: 0,
          canBeAssignedJobs: normalizeRole(user.roleCode || user.role) === ROLES.TECHNICIAN,
          address: '',
          emergencyContactName: '',
          emergencyContactPhone: '',
          upiId: '',
          bankLast4: '',
          languages: ['Hindi', 'English'],
          skills: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    });

    this.people = mergedPeople;
    this._persist();
    return this.getReconciliationReport();
  }

  getReconciliationReport() {
    const peopleWithoutLogin = this.people.filter(p => p.accessStatus === 'NONE' || !p.authUserId);
    const peopleSuspended = this.people.filter(p => p.accessStatus === 'SUSPENDED');
    const duplicateEmails = [];
    const emailCounts = {};

    this.people.forEach(p => {
      if (p.email) {
        const em = p.email.toLowerCase();
        emailCounts[em] = (emailCounts[em] || 0) + 1;
      }
    });
    Object.keys(emailCounts).forEach(em => {
      if (emailCounts[em] > 1) duplicateEmails.push(em);
    });

    return {
      totalPeople: this.people.length,
      activePeople: this.people.filter(p => p.employmentStatus === 'ACTIVE' && p.accessStatus === 'ACTIVE').length,
      peopleWithoutLogin,
      peopleSuspended,
      duplicateEmails,
      isFullyReconciled: duplicateEmails.length === 0,
      timestamp: new Date().toISOString()
    };
  }
}

export const peopleService = new PeopleService();
