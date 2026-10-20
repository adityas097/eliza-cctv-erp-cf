// Authentication & Multi-Tenant Company Workspace Modal (Google SSO, Lockout Guard & Turnstile)
import { auth } from '../services/auth.js';
import { store } from '../services/store.js';
import { db } from '../store/db.js';
import { integrationsService } from '../services/integrationsService.js';
import { openProfileDrawer } from '../modules/profile/MyProfileModule.js';

export function openAuthModal(onClose, onLoginSuccess) {
  const existing = document.getElementById('authModalOverlay');
  if (existing) existing.remove();

  let activeTab = 'signin'; // 'signin' | 'signup' | 'forgot'
  let showPassword = false;
  const currentUser = auth.getCurrentUser();
  const companies = db.getCompanies();
  const activeCompanyId = db.getActiveCompanyId();
  const currentCompany = companies.find(c => c.id === activeCompanyId) || companies[0];
  const featureFlags = integrationsService.getFeatureFlags();

  function renderModalContent() {
    const activeCompId = db.getActiveCompanyId();
    const companyUsers = (store.state.users || []).filter(u => !u.companyId || u.companyId === activeCompId);

    const overlay = document.getElementById('authModalOverlay');
    if (!overlay) return;

    overlay.querySelector('.modal-card').innerHTML = `
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="brand-logo-icon" style="width: 36px; height: 36px; font-size: 15px;">E</div>
          <div>
            <h3 class="modal-title">Workspace Access & SSO Portal</h3>
            <p style="font-size: 11.5px; color: var(--text-dim); margin: 0;">
              Active Workspace: <strong style="color: #38bdf8;">${currentCompany?.name || 'ELIZA INFOTECH'}</strong>
            </p>
          </div>
        </div>
        <button id="closeAuthModalBtn" class="modal-close-btn">&times;</button>
      </div>

      <!-- Tab Switcher -->
      <div style="display: flex; border-bottom: 1px solid var(--border-color); background: var(--bg-card-subtle);">
        <button id="tabSignInBtn" class="btn" style="flex: 1; border-radius: 0; border: none; padding: 12px; font-weight: 700; font-size: 13px; background: ${activeTab === 'signin' ? 'var(--bg-card)' : 'transparent'}; color: ${activeTab === 'signin' ? '#38bdf8' : 'var(--text-muted)'}; border-bottom: 2px solid ${activeTab === 'signin' ? '#38bdf8' : 'transparent'};">
          Sign In
        </button>
        <button id="tabSignUpBtn" class="btn" style="flex: 1; border-radius: 0; border: none; padding: 12px; font-weight: 700; font-size: 13px; background: ${activeTab === 'signup' ? 'var(--bg-card)' : 'transparent'}; color: ${activeTab === 'signup' ? '#38bdf8' : 'var(--text-muted)'}; border-bottom: 2px solid ${activeTab === 'signup' ? '#38bdf8' : 'transparent'};">
          + New Organization
        </button>
        <button id="tabForgotBtn" class="btn" style="flex: 1; border-radius: 0; border: none; padding: 12px; font-weight: 700; font-size: 13px; background: ${activeTab === 'forgot' ? 'var(--bg-card)' : 'transparent'}; color: ${activeTab === 'forgot' ? '#38bdf8' : 'var(--text-muted)'}; border-bottom: 2px solid ${activeTab === 'forgot' ? '#38bdf8' : 'transparent'};">
          Password Recovery
        </button>
      </div>

      <div class="modal-body" style="padding: 20px 24px;">
        ${activeTab === 'signin' ? `
          <!-- Currently Signed In Info -->
          ${currentUser ? `
            <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div class="user-avatar-circle" style="width: 44px; height: 44px; font-size: 16px; background: ${currentUser.badgeColor || '#2563eb'};">
                  ${currentUser.avatar || 'AS'}
                </div>
                <div>
                  <h4 style="font-size: 14.5px; font-weight: 700; color: var(--text-main); margin: 0;">${currentUser.name}</h4>
                  <div style="display: flex; align-items: center; gap: 8px; margin-top: 2px;">
                    <span class="status-pill status-progress" style="font-size: 10.5px;">${currentUser.role}</span>
                    <span style="font-size: 11px; color: var(--text-muted);">${currentUser.email}</span>
                  </div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <button id="quickEditProfileBtn" class="btn btn-primary btn-sm">Profile</button>
                <button id="logoutBtn" class="btn btn-secondary btn-sm" style="color: var(--red-accent);">Sign Out</button>
              </div>
            </div>
          ` : ''}

          <!-- Google SSO Primary Button -->
          <div style="margin-bottom: 18px;">
            <button id="btnGoogleSsoLogin" class="btn btn-secondary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 10px; font-size: 13.5px; font-weight: 700; background: var(--bg-card); border: 1px solid var(--border-color);">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continue with Google Single Sign-On</span>
            </button>
            <div style="display: flex; align-items: center; margin: 16px 0; color: var(--text-dim); font-size: 11px;">
              <div style="flex: 1; height: 1px; background: var(--border-color);"></div>
              <span style="padding: 0 10px; text-transform: uppercase;">or sign in with password</span>
              <div style="flex: 1; height: 1px; background: var(--border-color);"></div>
            </div>
          </div>

          <!-- Sign In Form with Show/Hide Password Toggle -->
          <form id="customLoginForm" autocomplete="on">
            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label" style="font-size: 11.5px; font-weight: 600;">Work Email or Username</label>
              <input type="text" id="loginUsername" class="form-control" placeholder="e.g. aditya@elizainfotech.com" required autocomplete="username">
            </div>
            <div class="form-group" style="margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <label class="form-label" style="font-size: 11.5px; font-weight: 600; margin: 0;">Password</label>
                <button type="button" id="togglePasswordVisibilityBtn" style="background: none; border: none; font-size: 11px; color: #38bdf8; cursor: pointer; padding: 0;">
                  ${showPassword ? 'Hide Password' : 'Show Password'}
                </button>
              </div>
              <input type="${showPassword ? 'text' : 'password'}" id="loginPassword" class="form-control" placeholder="Enter your credentials" required autocomplete="current-password">
            </div>

            <!-- Cloudflare Turnstile Badge -->
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px; padding: 6px 10px; background: var(--bg-card-subtle); border-radius: 6px; font-size: 11px; color: var(--text-dim);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              <span>Protected by Cloudflare Turnstile bot verification & rate limiting</span>
            </div>

            <div id="loginErrorMsg" style="display: none; color: #ef4444; font-size: 12px; margin-bottom: 12px; padding: 8px 12px; background: rgba(239,68,68,0.1); border-radius: 6px;"></div>
            <button type="submit" id="submitLoginBtn" class="btn btn-primary" style="width: 100%; font-weight: 700;">Sign In to Enterprise Workspace</button>
          </form>
        ` : activeTab === 'signup' ? `
          <!-- Sign Up / New Organization -->
          ${!featureFlags.selfRegistration ? `
            <div style="padding: 24px; text-align: center; background: var(--bg-card-subtle); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
              <div style="width: 44px; height: 44px; border-radius: 50%; background: rgba(245, 158, 11, 0.15); color: #f59e0b; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg>
              </div>
              <h4 style="font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">Registration is Invite-Only</h4>
              <p style="font-size: 12px; color: var(--text-muted); line-height: 1.6; margin-bottom: 16px;">
                By default, this enterprise CCTV instance is closed to public signups. Please contact your company Super Admin for an onboarding invite link, or enable self-registration via Developer Tools.
              </p>
              <button id="backToSignInFromInviteBtn" class="btn btn-primary btn-sm">Return to Sign In</button>
            </div>
          ` : `
            <form id="createCompanyForm">
              <div class="form-group" style="margin-bottom: 12px;">
                <label class="form-label">Enterprise / Business Name *</label>
                <input type="text" id="signupCompanyName" class="form-control" placeholder="e.g. Apex Surveillance Pvt Ltd" required>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                <div class="form-group" style="margin: 0;">
                  <label class="form-label">Owner Full Name *</label>
                  <input type="text" id="signupOwnerName" class="form-control" placeholder="Managing Director Name" required>
                </div>
                <div class="form-group" style="margin: 0;">
                  <label class="form-label">Contact Phone</label>
                  <input type="text" id="signupPhone" class="form-control" placeholder="+91 98000-00000">
                </div>
              </div>
              <div class="form-group" style="margin-bottom: 12px;">
                <label class="form-label">Corporate Email Address *</label>
                <input type="email" id="signupEmail" class="form-control" placeholder="owner@company.com" required>
              </div>
              <div class="form-group" style="margin-bottom: 16px;">
                <label class="form-label">Password *</label>
                <input type="password" id="signupPassword" class="form-control" placeholder="Minimum 6 characters" minlength="6" required>
              </div>
              <div id="signupErrorMsg" style="display: none; color: #ef4444; font-size: 12px; margin-bottom: 12px; padding: 8px 12px; background: rgba(239,68,68,0.1); border-radius: 6px;"></div>
              <button type="submit" class="btn btn-primary" style="width: 100%;">Register Tenant & Become Super Admin</button>
            </form>
          `}
        ` : `
          <!-- Forgot Password -->
          <form id="forgotPasswordForm">
            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label">Registered Corporate Email Address</label>
              <input type="email" id="forgotEmail" class="form-control" placeholder="e.g. aditya@elizainfotech.com" required>
            </div>
            <div id="forgotMsg" style="display: none; font-size: 12px; margin-bottom: 14px; padding: 10px 12px; border-radius: 6px;"></div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">Dispatch Password Reset Instructions</button>
          </form>
        `}
      </div>
    `;

    bindModalEvents();
  }

  function bindModalEvents() {
    const overlay = document.getElementById('authModalOverlay');
    if (!overlay) return;

    // Close
    document.getElementById('closeAuthModalBtn')?.addEventListener('click', () => {
      overlay.remove();
      if (onClose) onClose();
    });

    // Tab buttons
    document.getElementById('tabSignInBtn')?.addEventListener('click', () => { activeTab = 'signin'; renderModalContent(); });
    document.getElementById('tabSignUpBtn')?.addEventListener('click', () => { activeTab = 'signup'; renderModalContent(); });
    document.getElementById('tabForgotBtn')?.addEventListener('click', () => { activeTab = 'forgot'; renderModalContent(); });
    document.getElementById('backToSignInFromInviteBtn')?.addEventListener('click', () => { activeTab = 'signin'; renderModalContent(); });

    // Show/hide password
    document.getElementById('togglePasswordVisibilityBtn')?.addEventListener('click', () => {
      showPassword = !showPassword;
      renderModalContent();
    });

    // Google SSO
    document.getElementById('btnGoogleSsoLogin')?.addEventListener('click', async () => {
      const res = await auth.signInWithGoogle();
      if (res.success) {
        overlay.remove();
        if (onLoginSuccess) onLoginSuccess(res.user);
      }
    });

    // Quick profile drawer
    document.getElementById('quickEditProfileBtn')?.addEventListener('click', () => {
      openProfileDrawer(currentUser);
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      auth.logout();
      renderModalContent();
    });

    // Custom login form
    document.getElementById('customLoginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('loginUsername')?.value;
      const pass = document.getElementById('loginPassword')?.value;
      const errorDiv = document.getElementById('loginErrorMsg');

      const res = await auth.login(username, pass);
      if (res.success) {
        overlay.remove();
        if (onLoginSuccess) onLoginSuccess(res.user);
      } else {
        if (errorDiv) {
          errorDiv.style.display = 'block';
          errorDiv.textContent = res.message || 'Login failed';
        }
      }
    });

    // Create Company
    document.getElementById('createCompanyForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const compName = document.getElementById('signupCompanyName')?.value;
      const ownerName = document.getElementById('signupOwnerName')?.value;
      const phone = document.getElementById('signupPhone')?.value;
      const email = document.getElementById('signupEmail')?.value;
      const pass = document.getElementById('signupPassword')?.value;
      const errorDiv = document.getElementById('signupErrorMsg');

      const res = await auth.signUp(compName, ownerName, email, pass, phone);
      if (res.success) {
        overlay.remove();
        if (onLoginSuccess) onLoginSuccess(res.user);
      } else {
        if (errorDiv) {
          errorDiv.style.display = 'block';
          errorDiv.textContent = res.message || 'Registration failed';
        }
      }
    });

    // Forgot Password
    document.getElementById('forgotPasswordForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('forgotEmail')?.value;
      const msgDiv = document.getElementById('forgotMsg');

      const res = await auth.forgotPassword(email);
      if (msgDiv) {
        msgDiv.style.display = 'block';
        msgDiv.style.background = res.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
        msgDiv.style.color = res.success ? '#10b981' : '#ef4444';
        msgDiv.textContent = res.message;
      }
    });
  }

  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = 'authModalOverlay';
  overlay.className = 'modal-overlay modal-backdrop active';
  overlay.style.zIndex = '10050';
  overlay.innerHTML = `<div class="modal-card" style="max-width: 500px; width: 100%;"></div>`;
  document.body.appendChild(overlay);

  renderModalContent();
}
