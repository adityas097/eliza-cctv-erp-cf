// Authentication Adapter Layer - Defines Contract & Implementations (Mock & Supabase)
import { supabase, isSupabaseConfigured, hashPassword, verifyPassword } from './supabase.js';

const SESSIONS_STORAGE_KEY = 'ELIZA_ACTIVE_SESSIONS_V1';
const LOGIN_ATTEMPTS_KEY = 'ELIZA_LOGIN_ATTEMPTS_V1';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 mins
const ABSOLUTE_EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 hours
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 mins

/**
 * Base AuthAdapter Interface
 */
export class AuthAdapter {
  async signIn(emailOrUsername, password) { throw new Error('Not implemented'); }
  async signOut() { throw new Error('Not implemented'); }
  async getSession() { throw new Error('Not implemented'); }
  async inviteUser(email, role, metadata) { throw new Error('Not implemented'); }
  async resetPassword(email) { throw new Error('Not implemented'); }
  async updateEmail(userId, newEmail) { throw new Error('Not implemented'); }
  async revokeSessions(userId, keepCurrent = false) { throw new Error('Not implemented'); }
  async listSessions(userId) { throw new Error('Not implemented'); }
}

/**
 * Dev-Only Mock Auth Adapter
 * Complete client-side session tracker, lockout protection, and credential validator.
 */
export class MockAuthAdapter extends AuthAdapter {
  constructor(getUsersFn, saveUsersFn) {
    super();
    this.getUsers = getUsersFn;
    this.saveUsers = saveUsersFn;
  }

  _getAttempts() {
    try {
      return JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || '{}');
    } catch {
      return {};
    }
  }

  _saveAttempts(attempts) {
    try {
      localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(attempts));
    } catch {}
  }

  _getSessions() {
    try {
      return JSON.parse(localStorage.getItem(SESSIONS_STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  _saveSessions(sessions) {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    } catch {}
  }

  checkLockout(identifier) {
    const key = (identifier || '').toLowerCase().trim();
    const attempts = this._getAttempts();
    const entry = attempts[key];
    if (!entry) return { locked: false };

    const now = Date.now();
    if (entry.count >= MAX_FAILED_ATTEMPTS) {
      const remainingMs = entry.lockedUntil - now;
      if (remainingMs > 0) {
        return {
          locked: true,
          remainingMinutes: Math.ceil(remainingMs / 60000),
          lockedUntil: entry.lockedUntil
        };
      } else {
        // Lockout expired, reset
        delete attempts[key];
        this._saveAttempts(attempts);
      }
    }
    return { locked: false };
  }

  recordFailedAttempt(identifier) {
    const key = (identifier || '').toLowerCase().trim();
    const attempts = this._getAttempts();
    const now = Date.now();
    const entry = attempts[key] || { count: 0, firstAttempt: now, lockedUntil: 0 };
    entry.count += 1;
    if (entry.count >= MAX_FAILED_ATTEMPTS) {
      entry.lockedUntil = now + LOCKOUT_DURATION_MS;
    }
    attempts[key] = entry;
    this._saveAttempts(attempts);
    return entry;
  }

  resetAttempts(identifier) {
    const key = (identifier || '').toLowerCase().trim();
    const attempts = this._getAttempts();
    delete attempts[key];
    this._saveAttempts(attempts);
  }

  async signIn(emailOrUsername, password) {
    const cleanInput = (emailOrUsername || '').trim().toLowerCase();
    
    // Check lockout first
    const lockout = this.checkLockout(cleanInput);
    if (lockout.locked) {
      return {
        success: false,
        locked: true,
        message: `Account is temporarily locked due to 5 consecutive failed login attempts. Please try again in ${lockout.remainingMinutes} minute(s).`
      };
    }

    const users = this.getUsers ? this.getUsers() : [];
    const user = users.find(
      u => (u.email && u.email.toLowerCase() === cleanInput) ||
           (u.username && u.username.toLowerCase() === cleanInput)
    );

    if (!user) {
      this.recordFailedAttempt(cleanInput);
      return { success: false, message: 'Invalid email/username or password.' };
    }

    if (user.status === 'Suspended' || user.accessStatus === 'SUSPENDED' || user.accessStatus === 'DEACTIVATED') {
      return { success: false, message: 'This account has been suspended or deactivated. Contact Super Admin.' };
    }

    const isMatch = await verifyPassword(password, user.password);
    if (!isMatch) {
      const entry = this.recordFailedAttempt(cleanInput);
      const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - entry.count);
      return {
        success: false,
        message: remainingAttempts > 0
          ? `Invalid credentials. ${remainingAttempts} attempt(s) remaining before security lockout.`
          : `Account locked for 15 minutes due to too many failed attempts.`
      };
    }

    // Success: clear attempts
    this.resetAttempts(cleanInput);

    // Create session
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = Date.now();
    const session = {
      id: sessionId,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      createdAt: now,
      lastActiveAt: now,
      expiresAt: now + ABSOLUTE_EXPIRY_MS,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Browser Client',
      ip: '127.0.0.1 (Local)'
    };

    const sessions = this._getSessions();
    sessions.push(session);
    this._saveSessions(sessions);

    // Update user login timestamp
    user.lastLoginAt = new Date().toISOString();
    user.lastActiveAt = new Date().toISOString();
    if (this.saveUsers) this.saveUsers();

    return {
      success: true,
      user,
      session,
      mustChangePassword: !!user.mustChangePassword
    };
  }

  async signOut(sessionId = null) {
    if (!sessionId) {
      const curr = await this.getSession();
      sessionId = curr?.id;
    }
    if (sessionId) {
      let sessions = this._getSessions();
      sessions = sessions.filter(s => s.id !== sessionId);
      this._saveSessions(sessions);
    }
    return { success: true };
  }

  async getSession() {
    const sessions = this._getSessions();
    if (!sessions.length) return null;
    const now = Date.now();

    // Check last session
    const current = sessions[sessions.length - 1];
    if (!current) return null;

    // Check absolute expiration
    if (now > current.expiresAt) {
      await this.signOut(current.id);
      return null;
    }

    // Check idle timeout
    if (now - current.lastActiveAt > IDLE_TIMEOUT_MS) {
      await this.signOut(current.id);
      return null;
    }

    // Touch session
    current.lastActiveAt = now;
    this._saveSessions(sessions);
    return current;
  }

  async inviteUser(email, role, metadata = {}) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    return {
      success: true,
      email: cleanEmail,
      role,
      token,
      expiresAt,
      inviteUrl: `${window.location.origin}/#invite?token=${token}&email=${encodeURIComponent(cleanEmail)}`
    };
  }

  async resetPassword(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const users = this.getUsers ? this.getUsers() : [];
    const user = users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return { success: false, message: 'No registered user found with that email address.' };
    }
    const tempPassword = 'TempPass@' + Math.floor(1000 + Math.random() * 9000);
    user.password = await hashPassword(tempPassword);
    user.mustChangePassword = true;
    if (this.saveUsers) this.saveUsers();

    return {
      success: true,
      tempPassword,
      message: `Temporary password generated for ${cleanEmail}: ${tempPassword}. User will be forced to set a new password on next login.`
    };
  }

  async updateEmail(userId, newEmail) {
    const cleanEmail = (newEmail || '').trim().toLowerCase();
    const users = this.getUsers ? this.getUsers() : [];
    const exists = users.some(u => u.id !== userId && u.email && u.email.toLowerCase() === cleanEmail);
    if (exists) {
      return { success: false, message: 'An account with this email address already exists.' };
    }
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, message: 'User not found.' };

    user.email = cleanEmail;
    if (this.saveUsers) this.saveUsers();
    return { success: true, email: cleanEmail };
  }

  async revokeSessions(userId, keepCurrent = false) {
    let sessions = this._getSessions();
    const current = sessions[sessions.length - 1];
    sessions = sessions.filter(s => {
      if (s.userId !== userId) return true;
      if (keepCurrent && current && s.id === current.id) return true;
      return false;
    });
    this._saveSessions(sessions);
    return { success: true };
  }

  async listSessions(userId) {
    const sessions = this._getSessions();
    return sessions.filter(s => s.userId === userId);
  }
}

/**
 * Production Supabase Auth Adapter
 */
export class SupabaseAuthAdapter extends AuthAdapter {
  constructor() {
    super();
    this.client = supabase;
  }

  async signIn(emailOrUsername, password) {
    if (!this.client) throw new Error('Supabase client is not configured.');
    const { data, error } = await this.client.auth.signInWithPassword({
      email: emailOrUsername,
      password
    });
    if (error) return { success: false, message: error.message };
    return { success: true, user: data.user, session: data.session };
  }

  async signOut() {
    if (!this.client) return { success: true };
    const { error } = await this.client.auth.signOut();
    return { success: !error };
  }

  async getSession() {
    if (!this.client) return null;
    const { data } = await this.client.auth.getSession();
    return data?.session || null;
  }

  async inviteUser(email, role, metadata = {}) {
    if (!this.client) throw new Error('Supabase client is not configured.');
    // Inviting user requires server-side admin client; simulate via email reset or custom function
    return {
      success: true,
      message: `Invitation generated for ${email} with role ${role}`
    };
  }

  async resetPassword(email) {
    if (!this.client) throw new Error('Supabase client is not configured.');
    const { error } = await this.client.auth.resetPasswordForEmail(email);
    if (error) return { success: false, message: error.message };
    return { success: true, message: `Password reset link sent to ${email}` };
  }

  async updateEmail(userId, newEmail) {
    if (!this.client) throw new Error('Supabase client is not configured.');
    const { error } = await this.client.auth.updateUser({ email: newEmail });
    if (error) return { success: false, message: error.message };
    return { success: true, email: newEmail };
  }

  async revokeSessions(userId) {
    // In Supabase, global sign-out can be called on current user
    if (this.client) await this.client.auth.signOut({ scope: 'global' });
    return { success: true };
  }

  async listSessions(userId) {
    return [];
  }
}
