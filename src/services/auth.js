// Authentication & Role-Based Access Control (RBAC) Service
import { PRESET_USERS } from '../data/initialData.js';
import { store } from './store.js';
import { db } from '../store/db.js';
import { auditService } from './auditService.js';
import { hashPassword, verifyPassword, supabase, isSupabaseConfigured } from './supabase.js';

const AUTH_USER_KEY = 'ELIZA_CURRENT_USER';
const LOGIN_ATTEMPTS_KEY = 'ELIZA_LOGIN_ATTEMPTS_V1';
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

class AuthService {
  constructor() {
    this.listeners = new Set();
    this.currentUser = this.loadUser();
    this.lastActivity = Date.now();
    this._initIdleMonitor();
  }

  loadUser() {
    try {
      const saved = localStorage.getItem(AUTH_USER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const matched = (store.state.users || []).find(u => u.id === parsed.id || (u.email && u.email === parsed.email));
        if (matched) {
          if (matched.status === 'Suspended') {
            localStorage.removeItem(AUTH_USER_KEY);
            return null;
          }
          db.setActiveCompanyId(matched.companyId || 'comp-eliza');
          return matched;
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load auth user', e);
    }
    // Default to Super Admin Aditya Sharma
    const defaultUser = (store.state.users || [])[0] || PRESET_USERS[0];
    if (defaultUser) {
      db.setActiveCompanyId(defaultUser.companyId || 'comp-eliza');
    }
    return defaultUser;
  }

  saveUser(user) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      db.setActiveCompanyId(user.companyId || 'comp-eliza');
      this.lastActivity = Date.now();
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
    this.notify();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    this.listeners.forEach(cb => {
      try {
        cb(this.currentUser);
      } catch (e) {
        console.error('Error in auth listener', e);
      }
    });
  }

  // -------------------------------------------------------------
  // Idle Session Invalidation (30 Minutes)
  // -------------------------------------------------------------
  _initIdleMonitor() {
    if (typeof window === 'undefined') return;

    const recordActivity = () => {
      this.lastActivity = Date.now();
    };

    ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
      window.addEventListener(evt, recordActivity, { passive: true });
    });

    setInterval(() => {
      if (this.currentUser && Date.now() - this.lastActivity > IDLE_TIMEOUT_MS) {
        auditService.log({
          actorName: this.currentUser.name,
          actorRole: this.currentUser.role,
          action: 'SESSION_IDLE_TIMEOUT',
          targetType: 'SESSION',
          details: 'User session automatically invalidated after 30 minutes of inactivity.'
        });
        this.logout();
        alert('Your session has timed out due to 30 minutes of inactivity. Please sign in again.');
      }
    }, 60000); // Check once per minute
  }

  // -------------------------------------------------------------
  // Rate Limiting & Account Lockout
  // -------------------------------------------------------------
  _getAttempts(identifier) {
    try {
      const all = JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || '{}');
      return all[identifier] || { count: 0, lockedUntil: null };
    } catch (e) {
      return { count: 0, lockedUntil: null };
    }
  }

  _recordFailedAttempt(identifier) {
    try {
      const all = JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || '{}');
      const cur = all[identifier] || { count: 0, lockedUntil: null };
      cur.count += 1;
      if (cur.count >= MAX_FAILED_ATTEMPTS) {
        cur.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      }
      all[identifier] = cur;
      localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(all));
      return cur;
    } catch (e) {
      return { count: 1, lockedUntil: null };
    }
  }

  _resetAttempts(identifier) {
    try {
      const all = JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || '{}');
      delete all[identifier];
      localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(all));
    } catch (e) {}
  }

  // -------------------------------------------------------------
  // Authentication Flows
  // -------------------------------------------------------------
  async login(usernameOrEmail, password) {
    const cleanInput = (usernameOrEmail || '').trim().toLowerCase();
    if (!cleanInput || !password) {
      return { success: false, message: 'Please enter both username/email and password.' };
    }

    // Check Lockout
    const attempts = this._getAttempts(cleanInput);
    if (attempts.lockedUntil && attempts.lockedUntil > Date.now()) {
      const remainingMin = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
      return {
        success: false,
        message: `Account temporarily locked due to 5 consecutive failed attempts. Please retry in ${remainingMin} minute(s).`
      };
    }

    // Check Supabase if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanInput,
          password: password
        });
        if (error) {
          console.warn('Supabase auth note:', error.message);
        }
      } catch (e) {
        console.warn('Supabase offline or not reachable', e);
      }
    }

    // Local tenant user lookup
    const user = (store.state.users || []).find(
      u => (u.username && u.username.toLowerCase() === cleanInput) ||
           (u.email && u.email.toLowerCase() === cleanInput)
    );

    if (user) {
      if (user.status === 'Suspended') {
        return { success: false, message: 'This account has been deactivated / suspended by Super Admin.' };
      }

      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        const failed = this._recordFailedAttempt(cleanInput);
        const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - failed.count);
        return {
          success: false,
          message: remaining > 0 
            ? `Invalid credentials. ${remaining} attempt(s) remaining before account lockout.`
            : 'Too many failed attempts. Account locked for 15 minutes.'
        };
      }

      this._resetAttempts(cleanInput);
      db.setActiveCompanyId(user.companyId || 'comp-eliza');
      this.saveUser(user);
      store.logAction('AUTH_LOGIN', 'AUTH', `User ${user.name} (${user.role}) logged in successfully`);
      return { success: true, user };
    }

    const failed = this._recordFailedAttempt(cleanInput);
    const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - failed.count);
    return {
      success: false,
      message: remaining > 0 
        ? `Invalid username or password. ${remaining} attempt(s) remaining before account lockout.`
        : 'Too many failed attempts. Account locked for 15 minutes.'
    };
  }

  /**
   * Google Single Sign-On (SSO) Flow
   */
  async signInWithGoogle() {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });
        if (error) throw error;
        return { success: true, data };
      } catch (e) {
        console.warn('Supabase Google OAuth fallback:', e.message);
      }
    }

    // Mock Google SSO for verified enterprise account
    const superAdmin = (store.state.users || []).find(u => u.roleCode === 'ADMIN') || PRESET_USERS[0];
    this.saveUser(superAdmin);
    store.logAction('AUTH_GOOGLE_SSO', 'AUTH', `Authenticated via Google SSO as ${superAdmin.email}`);
    return { success: true, user: superAdmin };
  }

  async signUp(companyName, name, email, password, phone = '') {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !password || !companyName || !name) {
      return { success: false, message: 'Please fill in all required fields.' };
    }

    const existing = (store.state.users || []).find(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, message: 'An account with this email already exists. Please sign in.' };
    }

    const hashedPassword = await hashPassword(password);
    const newUserId = `usr-${Date.now()}`;

    const newUser = {
      id: newUserId,
      companyId: null,
      username: cleanEmail.split('@')[0],
      password: hashedPassword,
      name: name.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      role: 'Super Admin',
      roleCode: 'ADMIN',
      title: 'Managing Director & Workspace Owner',
      level: 1,
      levelName: 'Level 1: Executive C-Suite',
      department: 'Executive Leadership',
      reportsTo: null,
      reportsToName: 'Apex Founder',
      avatar: name.trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'MD',
      badgeColor: '#3b82f6',
      status: 'Active',
      allowedModules: ["dashboard", "calculators", "quotation", "crm", "projects", "amc", "inventory", "technicians", "items", "parties", "audit", "settings", "jobs", "job-board", "tickets", "payouts", "team", "reports", "admin-users", "developer-tools"]
    };

    const company = db.createCompany({ name: companyName, email: cleanEmail, phone }, newUser);
    this.saveUser(newUser);
    store.logAction('WORKSPACE_CREATED', 'AUTH', `Created new company workspace: ${companyName} (Owner: ${name})`);
    return { success: true, user: newUser, company };
  }

  async forgotPassword(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    const user = (store.state.users || []).find(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (user) {
      user.password = await hashPassword('password123');
      store.saveState();
      return { success: true, message: `Password reset instructions initiated for ${cleanEmail}. Temporary recovery password is: password123` };
    }

    return { success: false, message: 'No registered user account found with that email address.' };
  }

  quickLoginAs(roleCode) {
    const activeCompId = db.getActiveCompanyId();
    const companyUsers = (store.state.users || []).filter(u => !u.companyId || u.companyId === activeCompId);
    const user = companyUsers.find(u => u.roleCode === roleCode) || companyUsers[0] || store.state.users[0];
    if (user) {
      this.saveUser(user);
      store.logAction('AUTH_QUICK_SWITCH', 'AUTH', `Session switched to ${user.name} (${user.role})`);
    }
    return user;
  }

  logout() {
    if (isSupabaseConfigured() && supabase) {
      try { supabase.auth.signOut(); } catch (e) {}
    }
    if (this.currentUser) {
      store.logAction('AUTH_LOGOUT', 'AUTH', `User ${this.currentUser.name} signed out`);
    }
    this.saveUser(null);
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    return !!this.currentUser;
  }

  isSuperAdmin() {
    return this.currentUser?.roleCode === 'ADMIN' || this.currentUser?.role === 'Super Admin';
  }

  hasPermission(moduleKey) {
    if (!this.currentUser) return false;
    if (this.isSuperAdmin()) return true;
    
    const target = moduleKey === 'amc' ? 'tickets' : (moduleKey === 'technicians' ? 'payouts' : (moduleKey === 'parties' ? 'items' : moduleKey));
    
    if (this.currentUser.roleCode === 'OPS' || this.currentUser.role === 'Supervisor' || this.currentUser.role === 'Operations Manager') {
      if (['jobs', 'job-board', 'tickets', 'payouts', 'team', 'dashboard', 'calculators', 'inventory', 'projects', 'reports'].includes(target)) {
        return true;
      }
    }

    if (this.currentUser.roleCode === 'ACCT' || this.currentUser.role === 'Accountant') {
      if (['dashboard', 'quotation', 'projects', 'payouts', 'inventory', 'items', 'parties', 'reports'].includes(target)) {
        return true;
      }
      return false;
    }

    if (this.currentUser.roleCode === 'TECH' || this.currentUser.role === 'Technician' || this.currentUser.role === 'Lead Field Engineer') {
      if (['jobs', 'job-board', 'tickets', 'payouts', 'dashboard'].includes(target)) {
        return true;
      }
      return false;
    }

    if (this.currentUser.roleCode === 'SALES' || this.currentUser.role === 'Sales Head') {
      if (['dashboard', 'calculators', 'quotation', 'crm', 'items', 'parties', 'reports'].includes(target)) {
        return true;
      }
      return false;
    }

    return ['dashboard', 'calculators'].includes(target);
  }
}

export const auth = new AuthService();
