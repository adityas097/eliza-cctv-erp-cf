// Privacy Policy, Terms of Service & DPDP Compliance Module
export function renderLegalPagesModule(container, activeTab = 'privacy') {
  container.innerHTML = `
    <div class="page-header" style="margin-bottom: 24px;">
      <div>
        <h1 style="font-size: 24px; font-weight: 700;">Legal & Regulatory Compliance</h1>
        <p style="color: var(--text-dim); font-size: 13px;">Statutory data privacy, enterprise SLA terms, and Digital Personal Data Protection (DPDP) compliance.</p>
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="legalTabPrivacy" class="btn ${activeTab === 'privacy' ? 'btn-primary' : 'btn-secondary'} btn-sm">Privacy Policy</button>
        <button id="legalTabTerms" class="btn ${activeTab === 'terms' ? 'btn-primary' : 'btn-secondary'} btn-sm">Terms of Service</button>
        <button id="legalTabDpdp" class="btn ${activeTab === 'dpdp' ? 'btn-primary' : 'btn-secondary'} btn-sm">DPDP India Compliance</button>
      </div>
    </div>

    <div class="table-card" style="padding: 28px; line-height: 1.7; font-size: 14px; color: var(--text-muted); max-width: 900px;">
      ${activeTab === 'privacy' ? `
        <h2 style="color: var(--text-main); font-size: 18px; margin-bottom: 12px;">Eliza Infotech Privacy Policy</h2>
        <p><strong>Effective Date:</strong> October 2026</p>
        <p>Eliza Infotech ("Company", "we", "our") respects the privacy of our enterprise clients, field personnel, and system operators across Panipat, Sonipat, and the National Capital Region. This Privacy Policy governs all data ingested, processed, and archived within the Eliza Infotech CCTV CRM & ERP system.</p>
        
        <h3 style="color: var(--text-main); font-size: 15px; margin-top: 18px; margin-bottom: 8px;">1. Information Collected</h3>
        <p>We process only client surveillance project specifications, site locations, equipment serial numbers, AMC service ticket histories, and authorized technical staff credentials necessary to fulfill security contracts.</p>

        <h3 style="color: var(--text-main); font-size: 15px; margin-top: 18px; margin-bottom: 8px;">2. Confidentiality & Security</h3>
        <p>All data is isolated per enterprise organization using PostgreSQL Row Level Security (RLS). Secret tokens and API credentials are kept in encrypted vaults and are never transmitted to unauthorized client browsers.</p>
      ` : activeTab === 'terms' ? `
        <h2 style="color: var(--text-main); font-size: 18px; margin-bottom: 12px;">Enterprise Terms of Service</h2>
        <p><strong>Effective Date:</strong> October 2026</p>
        <p>By accessing or administering the Eliza Infotech CCTV CRM & ERP application, authorized employees and clients agree to adhere to standard enterprise surveillance service levels, GST statutory compliance, and warranty guidelines.</p>

        <h3 style="color: var(--text-main); font-size: 15px; margin-top: 18px; margin-bottom: 8px;">1. System Access & Multi-Factor Security</h3>
        <p>Super Administrator and Administrator accounts must maintain Time-based One-Time Password (TOTP) two-factor authentication. Unauthorized credentials sharing or automated scraping is strictly prohibited.</p>

        <h3 style="color: var(--text-main); font-size: 15px; margin-top: 18px; margin-bottom: 8px;">2. AMC & Job Warranty Terms</h3>
        <p>Dispatched work orders, CCTV commissioning sign-offs, and AMC service tickets logged in this portal serve as binding operational audit records for commercial settlements.</p>
      ` : `
        <h2 style="color: var(--text-main); font-size: 18px; margin-bottom: 12px;">India Digital Personal Data Protection (DPDP) Act 2023 Compliance</h2>
        <p>The Eliza Infotech CCTV ERP architecture is designed in strict alignment with the statutory principles established under India's Digital Personal Data Protection Act, 2023:</p>

        <ul style="padding-left: 20px; margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">
          <li><strong>Purpose Limitation:</strong> Field technician mobile phone numbers and client premises addresses are collected solely for dispatch, CCTV maintenance, and GST billing.</li>
          <li><strong>Data Minimization:</strong> Payment instruments and unmasked secret keys are never retained in browser storage or client-side application state.</li>
          <li><strong>Storage Limitation:</strong> Audit logs and ledger records are retained in accordance with Indian commercial taxation standards (7 fiscal years) and encrypted at rest.</li>
          <li><strong>Right to Correction & Erasure:</strong> Organization Super Administrators maintain verified self-service tools in Developer Tools to update, export, or redact client contact data.</li>
        </ul>
      `}
    </div>
  `;

  document.getElementById('legalTabPrivacy')?.addEventListener('click', () => renderLegalPagesModule(container, 'privacy'));
  document.getElementById('legalTabTerms')?.addEventListener('click', () => renderLegalPagesModule(container, 'terms'));
  document.getElementById('legalTabDpdp')?.addEventListener('click', () => renderLegalPagesModule(container, 'dpdp'));
}
