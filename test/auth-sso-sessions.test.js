// Authentication, SSO, Sessions & Account Lockout Tests
import { describe, it, expect, beforeEach } from 'vitest';
import { auth } from '../src/services/auth.js';
import { store } from '../src/services/store.js';
import { db } from '../src/store/db.js';

describe('Phase 5: Authentication, SSO & Session Hardening Suite', () => {
  beforeEach(() => {
    db.resetFactory();
  });

  describe('1. Google Single Sign-On (SSO)', () => {
    it('successfully signs in via Google SSO and updates current user session', async () => {
      const res = await auth.signInWithGoogle();
      expect(res.success).toBe(true);
      expect(res.user).toBeDefined();
      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.getCurrentUser()?.email).toContain('@');
    });
  });

  describe('2. Brute-Force Rate Limiting & Account Lockout', () => {
    it('triggers temporary lockout after 5 consecutive failed login attempts', async () => {
      const targetUser = 'test_lockout_user@eliza.in';

      // 4 consecutive bad attempts
      for (let i = 0; i < 4; i++) {
        const res = await auth.login(targetUser, 'wrong_pass');
        expect(res.success).toBe(false);
        expect(res.message).toContain('attempt(s) remaining');
      }

      // 5th bad attempt -> lockout
      const res5 = await auth.login(targetUser, 'wrong_pass');
      expect(res5.success).toBe(false);
      expect(res5.message).toContain('locked');

      // Subsequent attempt is blocked by lockout timer
      const res6 = await auth.login(targetUser, 'wrong_pass');
      expect(res6.success).toBe(false);
      expect(res6.message).toContain('Account temporarily locked');
    });
  });

  describe('3. Suspended User Session Revocation', () => {
    it('blocks suspended accounts from logging in', async () => {
      const suspendedUser = {
        id: 'usr-suspended-test',
        username: 'suspended_user',
        email: 'suspended@eliza.in',
        password: 'password123',
        status: 'Suspended',
        role: 'Technician',
        roleCode: 'TECH'
      };
      if (!store.state.users) store.state.users = [];
      store.state.users.push(suspendedUser);

      const res = await auth.login('suspended@eliza.in', 'password123');
      expect(res.success).toBe(false);
      expect(res.message).toContain('suspended');
    });
  });

  describe('4. Password Recovery', () => {
    it('initiates recovery instructions for valid registered emails', async () => {
      const res = await auth.forgotPassword('aditya@elizainfotech.com');
      expect(res.success).toBe(true);
      expect(res.message).toContain('Password reset instructions initiated');
    });

    it('rejects password recovery for non-existent emails', async () => {
      const res = await auth.forgotPassword('unknown_person_99@test.com');
      expect(res.success).toBe(false);
      expect(res.message).toContain('No registered user account found');
    });
  });
});
