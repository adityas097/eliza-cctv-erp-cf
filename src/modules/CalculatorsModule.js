// System Engineering & Infrastructure Sizing Suite Module
import { store } from '../services/store.js';
import { calculateSystemMetrics } from '../services/calculators.js';

// Pre-engineered Blueprints for fast site deployment
export const BLUEPRINT_PRESETS = {
  uhbvn: {
    name: '🏛️ UHBVN Substation Division Blueprint (8 Zones)',
    desc: 'Government Substation, 33kV Yard, Cash Counter & Material Stores',
    zones: [
      { id: "Z-01", name: "Main Entry Gate & Vehicle Inward Lane", area: 2800, mount: "Pole Mount", camType: "Bullet IP Camera", res: "CP Plus 4MP STQC", qty: 2, env: "Outdoor", cableMtr: 65, notes: "4mm Lens, ANPR entry lane, ColorVu 24/7 night vision F1.0" },
      { id: "Z-02", name: "33kV Substation Yard & Transformer Bay", area: 8500, mount: "Pole Mount", camType: "Bullet IP Camera", res: "CP Plus 4MP STQC", qty: 2, env: "Outdoor", cableMtr: 85, notes: "4mm Lens, yard perimeter inspection & high-voltage safety zone" },
      { id: "Z-03", name: "Central Consumer Billing Hall & Cash Counters", area: 3500, mount: "Ceiling Mount", camType: "Dome IP Camera", res: "CP Plus 2.4MP Color+Mic", qty: 1, env: "Indoor", cableMtr: 35, notes: "2.8mm Lens, wide FOV with integrated mic for transaction recording" },
      { id: "Z-04", name: "Executive Engineer (XEN) Chamber & Office", area: 1200, mount: "Ceiling Mount", camType: "Dome IP Camera", res: "CP Plus 2.4MP Color+Mic", qty: 1, env: "Indoor", cableMtr: 25, notes: "2.8mm Lens, executive chamber overview & visitor monitoring" },
      { id: "Z-05", name: "SDO & Assistant Engineer Technical Wing", area: 2200, mount: "Ceiling Mount", camType: "Dome IP Camera", res: "CP Plus 2.4MP Color+Mic", qty: 1, env: "Indoor", cableMtr: 30, notes: "2.8mm Lens, corridor mode, staff workspace surveillance" },
      { id: "Z-06", name: "Division Material Stores & Heavy Cable Yard", area: 6500, mount: "Wall Mount", camType: "Bullet IP Camera", res: "CP Plus 4MP STQC", qty: 1, env: "Outdoor", cableMtr: 55, notes: "4mm Lens, transformer spares, conductor rolls & inventory bay" },
      { id: "Z-07", name: "Public Grievance Counter & Waiting Area", area: 1800, mount: "Ceiling Mount", camType: "Dome IP Camera", res: "CP Plus 2.4MP Color+Mic", qty: 1, env: "Indoor", cableMtr: 25, notes: "2.8mm Lens, waiting lounge crowd flow & complaint desk audio" },
      { id: "Z-08", name: "Perimeter Left Boundary & DG Genset Bay", area: 4500, mount: "Corner Pole", camType: "Bullet IP Camera", res: "CP Plus 4MP STQC", qty: 1, env: "Outdoor", cableMtr: 70, notes: "4mm Lens, boundary tripwire intrusion detection & DG unit view" }
    ]
  },
  mandi: {
    name: '🌾 APMC Mandi Yard & Agro Logistics Complex (6 Zones)',
    desc: 'Grain Market Weighbridge, Covered Sheds & Cold Storage',
    zones: [
      { id: "Z-01", name: "Main Inward Weighbridge & Security Gate", area: 3200, mount: "Pole Mount", camType: "Bullet IP Camera", res: "CP Plus 4MP STQC", qty: 2, env: "Outdoor", cableMtr: 70, notes: "4mm Lens, ANPR truck registration plate capture & barrier control" },
      { id: "Z-02", name: "Covered Auction Shed 1 & Grain Cleaning Bays", area: 12000, mount: "Wall Mount", camType: "Bullet IP Camera", res: "CP Plus 4MP STQC", qty: 3, env: "High-Dust / Mandi Yard", cableMtr: 90, notes: "4mm Lens, dust-sealed IP67 overview for grain unloading & auctioneers" },
      { id: "Z-03", name: "Cold Storage Chamber Loading Dock", area: 4000, mount: "Ceiling Mount", camType: "Dome IP Camera", res: "CP Plus 4MP STQC", qty: 2, env: "Cold Storage Sub-Zero", cableMtr: 50, notes: "2.8mm Wide FOV anti-fogging lens for temperature controlled dock" },
      { id: "Z-04", name: "APMC Mandi Secretary & Accounts Cash Hall", area: 2500, mount: "Ceiling Mount", camType: "Dome IP Camera", res: "CP Plus 2.4MP Color+Mic", qty: 2, env: "Indoor", cableMtr: 30, notes: "2.8mm Audio-recording transaction counter & cash disbursement safe" },
      { id: "Z-05", name: "Farmer Rest House & Public Amenities", area: 3000, mount: "Ceiling Mount", camType: "Dome IP Camera", res: "CP Plus 2.4MP Color+Mic", qty: 1, env: "Indoor", cableMtr: 40, notes: "2.8mm Corridor and rest area public crowd safety overview" },
      { id: "Z-06", name: "West Boundary Perimeter & Outward Truck Gate", area: 7500, mount: "Corner Pole", camType: "Bullet IP Camera", res: "CP Plus 4MP STQC", qty: 2, env: "Outdoor", cableMtr: 110, notes: "6mm Long distance perimeter fence & vehicle outbound exit lane" }
    ]
  },
  corporate: {
    name: '🏢 Corporate Commercial Tower & Office Complex (6 Zones)',
    desc: 'Access Turnstiles, Conference Rooms, Server Room & Parking',
    zones: [
      { id: "Z-01", name: "Main Reception, Turnstiles & Visitor Desk", area: 2400, mount: "Ceiling Mount", camType: "Dome IP Camera", res: "5MP Super HD AI", qty: 2, env: "Indoor", cableMtr: 35, notes: "Face detection, visitor access badge verification & turnstile corridor" },
      { id: "Z-02", name: "Open Workspace Floor 3 & Collaborative Hub", area: 6500, mount: "Ceiling Mount", camType: "Dome IP Camera", res: "CP Plus 2.4MP Color+Mic", qty: 4, env: "Indoor", cableMtr: 45, notes: "2.8mm Wide angle 106° FOV ceiling overview for workstation bays" },
      { id: "Z-03", name: "Server Room & NOC Critical Infrastructure", area: 900, mount: "Wall Mount", camType: "Dome IP Camera", res: "5MP Super HD AI", qty: 2, env: "Server Room / NOC", cableMtr: 25, notes: "Rack access monitoring, thermal sensors & tamper detection" },
      { id: "Z-04", name: "Basement Parking B1 & EV Charging Bays", area: 9500, mount: "Wall Mount", camType: "Bullet IP Camera", res: "CP Plus 4MP STQC", qty: 3, env: "Indoor", cableMtr: 85, notes: "Low-light ColorVu 24/7 vehicle traffic & pillar blind spots" },
      { id: "Z-05", name: "Executive Boardroom & VIP Lounge", area: 1600, mount: "Ceiling Mount", camType: "Dome IP Camera", res: "CP Plus 2.4MP Color+Mic", qty: 1, env: "Indoor", cableMtr: 20, notes: "Discreet architectural dome with dual microphone pickup" },
      { id: "Z-06", name: "Loading Dock & Goods Service Lift", area: 3500, mount: "Wall Mount", camType: "Bullet IP Camera", res: "CP Plus 4MP STQC", qty: 2, env: "Outdoor", cableMtr: 60, notes: "Courier delivery bay & heavy goods elevator surveillance" }
    ]
  },
  factory: {
    name: '🏭 Industrial Factory & Logistics Facility (7 Zones)',
    desc: 'Assembly Floor, High-Tension Yard, Plating Shop & Perimeters',
    zones: [
      { id: "Z-01", name: "Factory Main Gate & Weighbridge Inward", area: 4000, mount: "Pole Mount", camType: "Bullet IP Camera", res: "CP Plus 4MP STQC", qty: 2, env: "Outdoor", cableMtr: 75, notes: "License plate ANPR, barrier boom, incoming truck driver booth" },
      { id: "Z-02", name: "Heavy Machine Shop & Production Assembly Line", area: 14000, mount: "Wall Mount", camType: "Bullet IP Camera", res: "5MP Super HD AI", qty: 4, env: "High-Dust / Mandi Yard", cableMtr: 95, notes: "Overhead crane runway, CNC machining line & safety helmet detection" },
      { id: "Z-03", name: "Raw Material Warehouse & Conductor Yard", area: 8000, mount: "Wall Mount", camType: "Bullet IP Camera", res: "CP Plus 4MP STQC", qty: 3, env: "Outdoor", cableMtr: 80, notes: "Heavy copper conductor rolls & raw sheet metal pallet racking" },
      { id: "Z-04", name: "High-Tension Substation Yard & DG Power Plant", area: 6000, mount: "Corner Pole", camType: "Bullet IP Camera", res: "CP Plus 4MP STQC", qty: 2, env: "High-Voltage Yard", cableMtr: 90, notes: "Transformer bushings, HT breaker yard, automatic temperature alerts" },
      { id: "Z-05", name: "Chemical Processing & Plating Shop", area: 3500, mount: "Ceiling Mount", camType: "Dome IP Camera", res: "4K UHD Ultra HD", qty: 2, env: "Corrosive / Chemical", cableMtr: 55, notes: "Corrosion-resistant 316L housing, acid vapor proof IP68" },
      { id: "Z-06", name: "Finished Goods Shipping Bay & Dock Levelers", area: 5000, mount: "Wall Mount", camType: "Bullet IP Camera", res: "CP Plus 4MP STQC", qty: 2, env: "Outdoor", cableMtr: 65, notes: "Dispatch pallet loading into container trucks" },
      { id: "Z-07", name: "Perimeter Fence Line & Guard Watchtower", area: 12000, mount: "Mast / Tower", camType: "Bullet IP Camera", res: "5MP Super HD AI", qty: 3, env: "Outdoor", cableMtr: 120, notes: "Perimeter tripwire line crossing & intruder auto-tracking" }
    ]
  }
};

export function renderCalculatorsModule(container, onNavigate) {
  let codec = 'H.265';
  let motionDuty = 0.70;
  let retentionDays = 30;

  function showToast(message, type = 'success') {
    const existing = document.querySelector('.erp-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'erp-toast';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${type === 'success' ? '#34d399' : '#38bdf8'}" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }

  function updateView() {
    const zones = store.state.zones || [];
    const metrics = calculateSystemMetrics(zones, {
      codec,
      motionDuty,
      retentionDays
    });

    container.innerHTML = `
      <div class="calculators-module-view">
        <!-- Title Banner -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); border-radius: var(--radius-lg); padding: 22px 26px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <span class="status-pill status-instock" style="background: rgba(13, 148, 136, 0.25); color: #2dd4bf; margin-bottom: 6px;">
                ● ENGINEERING SUITE (TOOLS 01-07)
              </span>
              <h2 style="font-size: 22px; font-weight: 800; color: #fff;">
                INTELLIGENT CCTV SYSTEM ENGINEERING & INFRASTRUCTURE SIZING ENGINE
              </h2>
              <p style="font-size: 12.5px; color: #cbd5e1; margin-top: 4px;">
                Zone Coverage, Bitrate Allocation, Usable Storage Capacity, Cable Routing Slack, PoE SMPS & UPS Sizing.
              </p>
            </div>
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
              <button id="addZoneBtnTop" class="btn btn-primary btn-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                + Add Coverage Zone
              </button>
              <button id="pushToQuoteBtn" class="btn btn-success btn-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>
                Transfer Sizing to BOQ
              </button>
            </div>
          </div>
        </div>

        <!-- Section 1: Zone Coverage Planner (Tool 01) - FULLY CUSTOMIZABLE -->
        <div class="table-card" style="margin-bottom: 24px;">
          <div class="table-header-bar" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding: 16px 20px;">
            <div class="table-title-group">
              <div style="display: flex; align-items: center; gap: 10px;">
                <h3 style="font-size: 15px; font-weight: 700; margin: 0;">SECTION 1: ZONE-BY-ZONE CAMERA & COVERAGE PLANNER (TOOL 01)</h3>
                <span class="status-pill status-instock" style="font-size: 10.5px; font-weight: 700; padding: 2px 8px;">FULLY CUSTOMIZABLE</span>
              </div>
              <p style="font-size: 12px; color: var(--text-muted); margin-top: 3px;">
                Design custom site surveillance zones, configure camera models, adjust quantities inline, or switch pre-engineered templates.
              </p>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <span class="status-pill status-progress" style="font-weight: 600;">${zones.length} Zones</span>
              <span class="status-pill status-primary" style="font-weight: 600;">${metrics.totalCams} Cams</span>
              <span class="status-pill status-instock" style="font-weight: 600;">${metrics.totalArea.toLocaleString('en-IN')} sq ft</span>

              <!-- Blueprint Template Selector -->
              <div style="position: relative; display: inline-block;">
                <button id="blueprintToggleBtn" class="btn btn-secondary btn-sm" style="display: flex; align-items: center; gap: 6px;" title="Load Site Blueprint Template">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                  Blueprints
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div id="blueprintMenu" style="display: none; position: absolute; right: 0; top: calc(100% + 5px); background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); z-index: 1000; min-width: 280px; padding: 6px 0;">
                  <div style="padding: 6px 14px; font-size: 11px; text-transform: uppercase; color: var(--text-dim); font-weight: 700; letter-spacing: 0.5px; border-bottom: 1px solid var(--border-color);">
                    Pre-Engineered Site Templates
                  </div>
                  <a href="#" class="load-blueprint-item" data-key="uhbvn" style="display: block; padding: 8px 14px; font-size: 12.5px; text-decoration: none; color: var(--text-main); border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="font-weight: 600;">🏛️ UHBVN Substation Division (8 Zones)</div>
                    <div style="font-size: 11px; color: var(--text-muted);">Standard Govt UHBVN utility blueprint</div>
                  </a>
                  <a href="#" class="load-blueprint-item" data-key="mandi" style="display: block; padding: 8px 14px; font-size: 12.5px; text-decoration: none; color: var(--text-main); border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="font-weight: 600;">🌾 APMC Mandi Yard & Agro (6 Zones)</div>
                    <div style="font-size: 11px; color: var(--text-muted);">Weighbridge, grain sheds & cold storage</div>
                  </a>
                  <a href="#" class="load-blueprint-item" data-key="corporate" style="display: block; padding: 8px 14px; font-size: 12.5px; text-decoration: none; color: var(--text-main); border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="font-weight: 600;">🏢 Commercial Office Tower (6 Zones)</div>
                    <div style="font-size: 11px; color: var(--text-muted);">Turnstiles, boardrooms, NOC & parking</div>
                  </a>
                  <a href="#" class="load-blueprint-item" data-key="factory" style="display: block; padding: 8px 14px; font-size: 12.5px; text-decoration: none; color: var(--text-main);">
                    <div style="font-weight: 600;">🏭 Industrial Plant & Logistics (7 Zones)</div>
                    <div style="font-size: 11px; color: var(--text-muted);">Assembly line, heavy conductor yard & fence</div>
                  </a>
                </div>
              </div>

              <button id="addZoneBtnHeader" class="btn btn-primary btn-sm" style="display: flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Add Zone
              </button>

              <button id="resetZonesBtn" class="btn btn-secondary btn-sm" title="Reset to UHBVN Default Blueprint" style="display: flex; align-items: center; gap: 5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>
                Reset
              </button>

              <button id="clearZonesBtn" class="btn btn-secondary btn-sm" title="Clear All Zones for Greenfield Custom Design" style="color: var(--red-accent); display: flex; align-items: center; gap: 5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                Clear
              </button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="erp-table">
              <thead>
                <tr>
                  <th class="text-center" style="width: 75px;">Zone #</th>
                  <th>Zone Description & Environment</th>
                  <th class="text-right" style="width: 105px;">Area (sq ft)</th>
                  <th class="text-center" style="width: 110px;">Mounting</th>
                  <th class="text-center" style="width: 130px;">Camera Type</th>
                  <th>Resolution / Model</th>
                  <th class="text-center" style="width: 110px;">Camera Qty</th>
                  <th class="text-center" style="width: 115px;">Env</th>
                  <th class="text-right" style="width: 125px;">Est. Cable (Mtr)</th>
                  <th>Lens & FOV Engineering Notes</th>
                  <th class="text-center" style="width: 130px;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${zones.length === 0 ? `
                  <tr>
                    <td colspan="11" style="text-align: center; padding: 48px 24px;">
                      <div style="max-width: 450px; margin: 0 auto;">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--blue-accent)" stroke-width="1.5" style="margin-bottom: 12px;">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                          <circle cx="12" cy="13" r="4"></circle>
                        </svg>
                        <h4 style="font-size: 16px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">No Engineering Zones Configured</h4>
                        <p style="font-size: 12.5px; color: var(--text-muted); line-height: 1.5; margin-bottom: 18px;">
                          Start engineering a custom surveillance layout from scratch, or load a pre-engineered blueprint template to begin sizing immediately.
                        </p>
                        <div style="display: flex; gap: 10px; justify-content: center;">
                          <button id="emptyAddZoneBtn" class="btn btn-primary btn-sm">+ Add Custom Zone</button>
                          <button id="emptyLoadDefaultBtn" class="btn btn-secondary btn-sm">↺ Load UHBVN Blueprint</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ` : zones.map(z => `
                  <tr>
                    <td class="text-center" style="font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--blue-accent);">
                      <span style="background: rgba(37,99,235,0.12); padding: 2px 7px; border-radius: var(--radius-sm); border: 1px solid rgba(37,99,235,0.25);">
                        ${z.id}
                      </span>
                    </td>
                    <td style="font-weight: 600;">
                      <div style="color: var(--text-main);">${z.name}</div>
                      <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">Zone: ${z.env || 'General Area'}</div>
                    </td>
                    <td class="text-right" style="font-family: 'JetBrains Mono', monospace; font-weight: 500;">
                      ${Number(z.area).toLocaleString('en-IN')}
                    </td>
                    <td class="text-center">
                      <span class="status-pill status-progress" style="font-size: 11px; white-space: nowrap;">${z.mount}</span>
                    </td>
                    <td class="text-center" style="font-size: 12.5px;">${z.camType}</td>
                    <td>
                      <span style="color: #38bdf8; font-weight: 600; font-size: 12.5px;">${z.res}</span>
                    </td>
                    <td class="text-center">
                      <!-- Inline Stepper for Quick Sizing -->
                      <div style="display: inline-flex; align-items: center; gap: 4px; background: var(--bg-card-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 2px 4px;">
                        <button class="zone-qty-dec" data-zone-id="${z.id}" title="Decrease Cameras" style="background: none; border: none; cursor: pointer; color: var(--text-dim); font-size: 14px; font-weight: 800; padding: 0 4px; line-height: 1;">&minus;</button>
                        <span style="font-family: 'JetBrains Mono', monospace; font-weight: 800; color: #34d399; min-width: 22px; text-align: center;">${z.qty}</span>
                        <button class="zone-qty-inc" data-zone-id="${z.id}" title="Increase Cameras" style="background: none; border: none; cursor: pointer; color: var(--text-dim); font-size: 14px; font-weight: 800; padding: 0 4px; line-height: 1;">&plus;</button>
                      </div>
                    </td>
                    <td class="text-center">
                      <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.06); color: var(--text-dim); white-space: nowrap;">
                        ${z.env}
                      </span>
                    </td>
                    <td class="text-right">
                      <!-- Inline Stepper for Cable Meters -->
                      <div style="display: inline-flex; align-items: center; gap: 3px; justify-content: flex-end;">
                        <button class="zone-cable-dec" data-zone-id="${z.id}" title="Decrease Cable (-5m)" style="background: none; border: none; cursor: pointer; color: var(--text-dim); font-size: 13px; font-weight: 700; padding: 0 3px;">&minus;</button>
                        <span style="font-family: 'JetBrains Mono', monospace; font-weight: 600; min-width: 38px; text-align: right;">${z.cableMtr}m</span>
                        <button class="zone-cable-inc" data-zone-id="${z.id}" title="Increase Cable (+5m)" style="background: none; border: none; cursor: pointer; color: var(--text-dim); font-size: 13px; font-weight: 700; padding: 0 3px;">&plus;</button>
                      </div>
                    </td>
                    <td style="font-size: 12px; color: var(--text-dim); max-width: 260px;">${z.notes}</td>
                    <td class="text-center">
                      <div style="display: flex; gap: 5px; justify-content: center; align-items: center;">
                        <button class="btn btn-secondary btn-sm edit-zone-btn" data-zone-id="${z.id}" title="Edit Specifications" style="padding: 3px 7px; font-size: 11.5px; display: flex; align-items: center; gap: 3px;">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          Edit
                        </button>
                        <button class="btn btn-secondary btn-sm clone-zone-btn" data-zone-id="${z.id}" title="Clone / Duplicate Zone" style="padding: 3px 6px; color: #38bdf8;">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                        <button class="btn btn-secondary btn-sm delete-zone-btn" data-zone-id="${z.id}" title="Delete Zone" style="padding: 3px 6px; color: var(--red-accent);">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" class="text-right" style="font-weight: 700; color: var(--text-main);">TOTAL / AGGREGATE SYSTEM METRICS:</td>
                  <td class="text-right" style="font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #38bdf8;">${metrics.totalArea.toLocaleString('en-IN')} sq ft</td>
                  <td colspan="3"></td>
                  <td class="text-center" style="font-weight: 800; color: #34d399; font-size: 14px;">${metrics.totalCams} Cams</td>
                  <td></td>
                  <td class="text-right" style="font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #fbbf24;">${metrics.rawCableMtr}m</td>
                  <td colspan="2" style="font-size: 11.5px; color: var(--text-muted);">
                    Dome: ${metrics.domeCount} | Bullet: ${metrics.bulletCount} | STQC 4MP: ${metrics.stqcCount} | Density: ${metrics.coverageDensity} sq ft/cam | Gross Slack: ${metrics.grossCableMtr}m (${metrics.cableRolls} Rolls)
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Section 2: Storage & Bandwidth Engine (Tools 02 & 06) -->
        <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 20px; margin-bottom: 24px;">
          <!-- Bitrate & Codec Settings -->
          <div class="table-card" style="padding: 20px; margin-bottom: 0;">
            <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 14px;">
              Camera Bitrate & Stream Profiles (Tool 02)
            </h3>

            <div class="form-group">
              <label class="form-label">Active Recording Codec Standard</label>
              <select id="codecSelect" class="form-control">
                <option value="H.265" ${codec === 'H.265' ? 'selected' : ''}>H.265 High Efficiency Smart Codec (Recommended -50% Bandwidth)</option>
                <option value="H.264" ${codec === 'H.264' ? 'selected' : ''}>H.264 Baseline Legacy Codec</option>
              </select>
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between;">
                <label class="form-label">Motion Duty Factor (Recording Profile)</label>
                <span style="font-size: 12px; font-weight: 700; color: var(--blue-accent);">${Math.round(motionDuty * 100)}% Scheduled Motion</span>
              </div>
              <input type="range" id="motionSlider" min="0.30" max="1.0" step="0.05" value="${motionDuty}" style="width: 100%;">
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between;">
                <label class="form-label">Continuous Video Retention Period (Days)</label>
                <span style="font-size: 12px; font-weight: 700; color: #34d399;">${retentionDays} Days Archive</span>
              </div>
              <input type="range" id="retentionSlider" min="7" max="90" step="1" value="${retentionDays}" style="width: 100%;">
            </div>

            <div style="background: var(--bg-card-subtle); border-radius: var(--radius-md); padding: 14px; margin-top: 16px; border: 1px solid var(--border-color);">
              <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 6px;">
                <span style="color: var(--text-muted);">Aggregate H.264 Stream Bitrate:</span>
                <span style="font-weight: 600;">${metrics.totalBitrateH264} Mbps</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 6px;">
                <span style="color: var(--text-muted);">Aggregate H.265 Stream Bitrate:</span>
                <span style="font-weight: 700; color: #38bdf8;">${metrics.totalBitrateH265} Mbps</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 12.5px;">
                <span style="color: var(--text-muted);">Active Bitrate Load:</span>
                <span style="font-weight: 700; color: #34d399;">${metrics.activeBitrate} Mbps</span>
              </div>
            </div>
          </div>

          <!-- Dynamic Video Retention Output -->
          <div class="table-card" style="padding: 20px; margin-bottom: 0;">
            <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 14px;">
              Dynamic Video Retention & Storage Sizing Engine (Tool 06)
            </h3>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
              <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px;">
                <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">Daily Generated Video Data</div>
                <div style="font-size: 20px; font-weight: 700; color: var(--text-main); margin-top: 4px;">${metrics.dailyGb} GB/Day</div>
              </div>
              <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px;">
                <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">Raw Video Archive (${retentionDays}-Day)</div>
                <div style="font-size: 20px; font-weight: 700; color: var(--text-main); margin-top: 4px;">${metrics.rawStorageGb} GB</div>
              </div>
            </div>

            <div style="background: linear-gradient(135deg, rgba(13, 148, 136, 0.2), rgba(30, 58, 138, 0.3)); border: 1px solid rgba(13, 148, 136, 0.4); border-radius: var(--radius-lg); padding: 18px; margin-bottom: 16px;">
              <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #2dd4bf; letter-spacing: 0.5px;">
                RECOMMENDED HARD DRIVE SPECIFICATION
              </div>
              <div style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 4px 0;">
                ${metrics.recommendedHdd}
              </div>
              <div style="font-size: 12px; color: #cbd5e1;">
                Usable Capacity Required: <strong style="color: #fff;">${metrics.usableTbRequired} TB</strong> (includes 10% filesystem & RAID margin)
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-card-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px 14px;">
              <div>
                <div style="font-size: 12px; font-weight: 600; color: var(--text-main);">Remote Viewing Substream Bandwidth</div>
                <div style="font-size: 11px; color: var(--text-dim);">${metrics.totalCams} Cams &bull; Mobile & Tablet App</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 14px; font-weight: 700; color: #38bdf8;">${metrics.substreamMbps} Mbps</div>
                <div style="font-size: 10.5px; color: #34d399;">Min Dedicated Upload: ${metrics.recommendedUploadMbps} Mbps</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 3: Structured Cabling, PoE & UPS Power (Tools 03, 04, 05) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
          <!-- Structured Cabling & Power -->
          <div class="table-card" style="padding: 20px; margin-bottom: 0;">
            <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 14px;">
              Structured Cabling & SMPS Sizing (Tools 03 & 04)
            </h3>

            <div style="display: flex; flex-direction: column; gap: 10px;">
              <div style="display: flex; justify-content: space-between; font-size: 13px; padding-bottom: 6px; border-bottom: 1px solid var(--border-color);">
                <span style="color: var(--text-muted);">Total Measured Raw Distance:</span>
                <span style="font-weight: 600;">${metrics.rawCableMtr} Meters</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; padding-bottom: 6px; border-bottom: 1px solid var(--border-color);">
                <span style="color: var(--text-muted);">Conduit Drop & Routing Slack Allowance:</span>
                <span style="font-weight: 600;">15.0% Slack Buffer</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; padding-bottom: 6px; border-bottom: 1px solid var(--border-color);">
                <span style="color: var(--text-muted);">Total Gross Cable Required:</span>
                <span style="font-weight: 700; color: #38bdf8;">${metrics.grossCableMtr} Meters</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; padding-bottom: 6px; border-bottom: 1px solid var(--border-color);">
                <span style="color: var(--text-muted);">CABLE ROLLS REQUIRED (90M EACH):</span>
                <span style="font-weight: 800; color: #34d399; font-size: 15px;">${metrics.cableRolls} Rolls</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; padding-bottom: 6px; border-bottom: 1px solid var(--border-color);">
                <span style="color: var(--text-muted);">Fixed Cameras Power Load:</span>
                <span style="font-weight: 600;">${metrics.totalCamPowerWatts} Watts</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px;">
                <span style="color: var(--text-muted);">RECOMMENDED POWER SUPPLY:</span>
                <span style="font-weight: 700; color: #fbbf24;">${metrics.recommendedSmps}</span>
              </div>
            </div>
          </div>

          <!-- UPS & Recorder Sizing -->
          <div class="table-card" style="padding: 20px; margin-bottom: 0;">
            <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 14px;">
              UPS Backup & Channel Sizing (Tool 05)
            </h3>

            <div style="display: flex; flex-direction: column; gap: 10px;">
              <div style="display: flex; justify-content: space-between; font-size: 13px; padding-bottom: 6px; border-bottom: 1px solid var(--border-color);">
                <span style="color: var(--text-muted);">NVR Console & Storage Base Load:</span>
                <span style="font-weight: 600;">40.0 Watts</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; padding-bottom: 6px; border-bottom: 1px solid var(--border-color);">
                <span style="color: var(--text-muted);">Total Active System Power Load:</span>
                <span style="font-weight: 700; color: #38bdf8;">${metrics.totalSystemWatts} Watts</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; padding-bottom: 6px; border-bottom: 1px solid var(--border-color);">
                <span style="color: var(--text-muted);">Calculated Minimum UPS Capacity:</span>
                <span style="font-weight: 700;">${metrics.calculatedUpsVa} VA</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; padding-bottom: 6px; border-bottom: 1px solid var(--border-color);">
                <span style="color: var(--text-muted);">RECOMMENDED UPS BACKUP:</span>
                <span style="font-weight: 800; color: #34d399;">${metrics.recommendedUps}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; padding-bottom: 6px; border-bottom: 1px solid var(--border-color);">
                <span style="color: var(--text-muted);">Standard Recorder Channels:</span>
                <span style="font-weight: 700; color: #818cf8;">${metrics.recorderChannels} Channels</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px;">
                <span style="color: var(--text-muted);">RECOMMENDED RECORDER MODEL:</span>
                <span style="font-weight: 700; color: #fbbf24;">${metrics.recommendedRecorder}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // --- Event Listeners ---

    // Codec, Motion, Retention Controls
    document.getElementById('codecSelect')?.addEventListener('change', (e) => {
      codec = e.target.value;
      updateView();
    });

    document.getElementById('motionSlider')?.addEventListener('input', (e) => {
      motionDuty = Number(e.target.value);
      updateView();
    });

    document.getElementById('retentionSlider')?.addEventListener('input', (e) => {
      retentionDays = Number(e.target.value);
      updateView();
    });

    // Blueprint dropdown menu toggle
    const bpBtn = document.getElementById('blueprintToggleBtn');
    const bpMenu = document.getElementById('blueprintMenu');
    bpBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (bpMenu) {
        bpMenu.style.display = bpMenu.style.display === 'block' ? 'none' : 'block';
      }
    });

    document.addEventListener('click', () => {
      if (bpMenu) bpMenu.style.display = 'none';
    }, { once: true });

    // Load blueprint presets
    container.querySelectorAll('.load-blueprint-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const key = item.getAttribute('data-key');
        const bp = BLUEPRINT_PRESETS[key];
        if (bp) {
          if (confirm(`Load "${bp.name}"?\nThis will configure ${bp.zones.length} engineered zones and recalculate system metrics.`)) {
            store.setZones(bp.zones, bp.name);
            showToast(`Loaded ${bp.name}`);
            updateView();
          }
        }
      });
    });

    // Reset to defaults
    document.getElementById('resetZonesBtn')?.addEventListener('click', () => {
      if (confirm('Reset all coverage zones to authentic UHBVN default blueprint?')) {
        store.resetZones();
        showToast('Reset to default UHBVN coverage blueprint');
        updateView();
      }
    });

    // Clear all zones
    document.getElementById('clearZonesBtn')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all zones?\nYou can design a 100% custom surveillance layout from a greenfield state.')) {
        store.clearAllZones();
        showToast('Cleared all coverage zones', 'info');
        updateView();
      }
    });

    // Empty state buttons
    document.getElementById('emptyAddZoneBtn')?.addEventListener('click', () => {
      openZoneModal(null, () => updateView());
    });
    document.getElementById('emptyLoadDefaultBtn')?.addEventListener('click', () => {
      store.resetZones();
      showToast('Loaded default UHBVN blueprint');
      updateView();
    });

    // Add Zone Dialogs (Banner button & Section 1 button)
    document.getElementById('addZoneBtnTop')?.addEventListener('click', () => {
      openZoneModal(null, () => updateView());
    });
    document.getElementById('addZoneBtnHeader')?.addEventListener('click', () => {
      openZoneModal(null, () => updateView());
    });

    // Inline Quantity Steppers
    container.querySelectorAll('.zone-qty-dec').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-zone-id');
        const target = zones.find(z => z.id === id);
        if (target && target.qty > 1) {
          store.updateZone(id, { qty: target.qty - 1 });
          updateView();
        }
      });
    });

    container.querySelectorAll('.zone-qty-inc').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-zone-id');
        const target = zones.find(z => z.id === id);
        if (target) {
          store.updateZone(id, { qty: target.qty + 1 });
          updateView();
        }
      });
    });

    // Inline Cable Steppers (±5m)
    container.querySelectorAll('.zone-cable-dec').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-zone-id');
        const target = zones.find(z => z.id === id);
        if (target && target.cableMtr > 5) {
          store.updateZone(id, { cableMtr: target.cableMtr - 5 });
          updateView();
        }
      });
    });

    container.querySelectorAll('.zone-cable-inc').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-zone-id');
        const target = zones.find(z => z.id === id);
        if (target) {
          store.updateZone(id, { cableMtr: target.cableMtr + 5 });
          updateView();
        }
      });
    });

    // Edit zone handler
    container.querySelectorAll('.edit-zone-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-zone-id');
        const target = zones.find(z => z.id === id);
        if (target) {
          openZoneModal(target, () => updateView());
        }
      });
    });

    // Clone zone handler
    container.querySelectorAll('.clone-zone-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-zone-id');
        if (id) {
          const cloned = store.duplicateZone(id);
          if (cloned) {
            showToast(`Cloned zone ${id} as ${cloned.id}`);
            updateView();
          }
        }
      });
    });

    // Delete zone handler
    container.querySelectorAll('.delete-zone-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-zone-id');
        if (id) {
          if (confirm(`Are you sure you want to delete zone ${id}?`)) {
            store.deleteZone(id);
            showToast(`Deleted zone ${id}`, 'info');
            updateView();
          }
        }
      });
    });

    // Transfer Sizing to BOQ (Push to Quotation)
    document.getElementById('pushToQuoteBtn')?.addEventListener('click', () => {
      const quote = store.state.quotation;
      if (quote) {
        if (!quote.items) quote.items = [];

        // 1. Sync Camera items
        const camItems = quote.items.filter(it => (it.desc || '').toLowerCase().includes('camera') || (it.sku || '').includes('CAM'));
        if (camItems.length === 1) {
          camItems[0].qty = metrics.totalCams;
        } else if (camItems.length > 1) {
          camItems[0].qty = metrics.bulletCount || Math.ceil(metrics.totalCams / 2);
          camItems[1].qty = metrics.domeCount || Math.floor(metrics.totalCams / 2);
        } else if (metrics.totalCams > 0) {
          quote.items.push({
            sl: quote.items.length + 1,
            sku: "SKU-CAM-006",
            desc: `2.4 MP Camera Color+Mic CP Plus (Full-Color 24/7 Night Vision with Audio Pickup) - Sized for ${metrics.totalCams} Zones`,
            hsn: "85258090",
            qty: metrics.totalCams,
            unit: "Nos",
            rate: 2250.00
          });
        }

        // 2. Sync Cable
        const cableItem = quote.items.find(it => (it.desc || '').toLowerCase().includes('cable') && (it.unit || '').toLowerCase().includes('mtr'));
        if (cableItem) {
          cableItem.qty = metrics.grossCableMtr;
          cableItem.desc = `CCTV Cable 3+1 Heavy Pure Copper Shielded Video + Audio Route Cable (${metrics.grossCableMtr} Metres, ${metrics.cableRolls} Rolls)`;
        }

        // 3. Sync Connectors
        const connItem = quote.items.find(it => (it.desc || '').toLowerCase().includes('connector') || (it.desc || '').toLowerCase().includes('pvc box'));
        if (connItem) {
          connItem.qty = metrics.totalCams;
        }

        // 4. Sync HDD
        const hddItem = quote.items.find(it => (it.desc || '').toLowerCase().includes('hard disk') || (it.sku || '').includes('HDD'));
        if (hddItem) {
          hddItem.desc = `${metrics.recommendedHdd} (Dedicated 24/7 Continuous Surveillance SATA Storage - ${metrics.usableTbRequired}TB Sized Archive)`;
          if (metrics.recommendedHddSku) hddItem.sku = metrics.recommendedHddSku;
        }

        // 5. Sync SMPS
        const smpsItem = quote.items.find(it => (it.desc || '').toLowerCase().includes('power supply') || (it.sku || '').includes('PWR'));
        if (smpsItem) {
          smpsItem.desc = `${metrics.recommendedSmps} (Sized for ${metrics.totalSystemWatts}W Total Active Load)`;
        }

        // 6. Sync DVR / NVR Console
        const recItem = quote.items.find(it => (it.desc || '').toLowerCase().includes('dvr') || (it.desc || '').toLowerCase().includes('nvr') || (it.sku || '').includes('REC'));
        if (recItem) {
          recItem.desc = `${metrics.recommendedRecorder} (Sized for ${metrics.totalCams} Channels Surveillance System)`;
        }

        quote.items.forEach((it, idx) => { it.sl = idx + 1; });
        store.saveState();
        store.emit('quotation-updated', quote);
      }

      store.logAction('CALCULATOR_PUSH_BOQ', 'CALCULATOR', `Pushed sizing output (${metrics.totalCams} Cams, ${metrics.recommendedHdd}, ${metrics.grossCableMtr}m) to Quotation Generator`);
      showToast(`Transferred ${metrics.totalCams} Cameras & ${metrics.grossCableMtr}m Cable to Active BOQ!`);
      if (onNavigate) {
        onNavigate('quotation');
      }
    });
  }

  updateView();
}

/**
 * Open Comprehensive Add / Edit Zone Modal
 * @param {Object|null} zone - Existing zone to edit, or null to add new zone
 * @param {Function} onSaved - Callback on successful save
 */
function openZoneModal(zone = null, onSaved) {
  const isEdit = !!zone;
  const masterItems = (store.state.items || []).filter(item => (item.category || '').toLowerCase().includes('camera') || (item.sku || '').includes('CAM'));

  // Calculate default next ID if adding
  let nextId = 'Z-01';
  if (!isEdit) {
    let maxNum = 0;
    (store.state.zones || []).forEach(z => {
      const match = (z.id || '').match(/Z-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    nextId = `Z-${String(maxNum + 1).padStart(2, '0')}`;
  }

  const currentId = isEdit ? zone.id : nextId;
  const currentName = isEdit ? (zone.name || '') : '';
  const currentArea = isEdit ? (zone.area || 2500) : 2500;
  const currentQty = isEdit ? (zone.qty || 1) : 1;
  const currentMount = isEdit ? (zone.mount || 'Pole Mount') : 'Pole Mount';
  const currentCamType = isEdit ? (zone.camType || 'Bullet IP Camera') : 'Bullet IP Camera';
  const currentRes = isEdit ? (zone.res || 'CP Plus 4MP STQC') : 'CP Plus 4MP STQC';
  const currentEnv = isEdit ? (zone.env || 'Outdoor') : 'Outdoor';
  const currentCableMtr = isEdit ? (zone.cableMtr || 45) : 45;
  const currentNotes = isEdit ? (zone.notes || '') : '4mm Lens, 85° FOV, entry lane, ColorVu 24/7 night vision';

  // Mount options
  const mountOptions = [
    'Pole Mount',
    'Wall Mount',
    'Ceiling Mount',
    'Corner Pole',
    'Parapet / Rooftop',
    'Pendant Drop Mount',
    'Mast / Tower',
    'In-Ceiling Flush'
  ];
  if (isEdit && !mountOptions.includes(currentMount)) {
    mountOptions.push(currentMount);
  }

  // Camera Type options
  const camTypeOptions = [
    'Bullet IP Camera',
    'Dome IP Camera',
    'PTZ Speed Dome',
    'Turret / Eyeball',
    'Panoramic 360° Fisheye',
    'ANPR / License Plate Recognition',
    'Bi-Spectrum Thermal + Optical',
    'Smart Wi-Fi Edge Camera',
    'Box Camera (Varifocal)'
  ];
  if (isEdit && !camTypeOptions.includes(currentCamType)) {
    camTypeOptions.push(currentCamType);
  }

  // Resolution options
  const resOptions = [
    'CP Plus 4MP STQC',
    'CP Plus 2.4MP Color+Mic',
    '5MP Super HD',
    '4K UHD Ultra HD',
    '2MP Starlight Low-Light',
    'Hikvision 4MP DarkFighter',
    'Dahua 4MP WizSense AI'
  ];
  if (isEdit && !resOptions.includes(currentRes)) {
    resOptions.push(currentRes);
  }

  // Environment options
  const envOptions = [
    'Outdoor',
    'Indoor',
    'High-Dust / Mandi Yard',
    'High-Voltage Yard',
    'Cold Storage Sub-Zero',
    'Corrosive / Chemical',
    'Public Waiting / Cash Counter',
    'Perimeter Boundary',
    'Server Room / NOC'
  ];
  if (isEdit && !envOptions.includes(currentEnv)) {
    envOptions.push(currentEnv);
  }

  const modalHtml = `
    <div id="zoneCustomModalOverlay" class="modal-overlay" style="z-index: 10020;">
      <div class="modal-card" style="max-width: 680px;">
        <div class="modal-header">
          <div>
            <span class="status-pill status-instock" style="font-size: 10px; margin-bottom: 4px;">
              ${isEdit ? 'EDIT SPECIFICATIONS' : 'NEW COVERAGE ZONE'}
            </span>
            <h3 class="modal-title" style="margin-top: 2px;">
              ${isEdit ? `Edit Coverage Zone: ${currentId}` : 'Add Custom Coverage Zone (Tool 01)'}
            </h3>
          </div>
          <button id="closeZoneModalBtn" class="modal-close-btn">&times;</button>
        </div>
        <form id="zoneCustomForm">
          <div class="modal-body" style="padding: 20px 24px; display: flex; flex-direction: column; gap: 14px;">
            
            <!-- Row 1: Zone ID & Name -->
            <div style="display: grid; grid-template-columns: 110px 1fr; gap: 14px;">
              <div class="form-group" style="margin: 0;">
                <label class="form-label">Zone Code</label>
                <input type="text" id="modalZoneId" class="form-control" value="${currentId}" required style="font-family: 'JetBrains Mono', monospace; font-weight: 700; text-transform: uppercase;">
              </div>
              <div class="form-group" style="margin: 0;">
                <label class="form-label">Zone Description & Specific Area Location</label>
                <input type="text" id="modalZoneName" class="form-control" value="${currentName}" placeholder="e.g. 33kV Substation Yard & Transformer Bay" required>
              </div>
            </div>

            <!-- Row 2: Area & Camera Quantity -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group" style="margin: 0;">
                <label class="form-label">Monitored Area (sq ft)</label>
                <div style="position: relative;">
                  <input type="number" id="modalZoneArea" class="form-control" value="${currentArea}" min="50" max="500000" step="50" required>
                  <span style="position: absolute; right: 10px; top: 9px; font-size: 11px; color: var(--text-dim); pointer-events: none;">sq ft</span>
                </div>
              </div>
              <div class="form-group" style="margin: 0;">
                <label class="form-label">Camera Quantity</label>
                <input type="number" id="modalZoneQty" class="form-control" value="${currentQty}" min="1" max="100" required style="font-weight: 700; color: #34d399;">
              </div>
            </div>

            <!-- Master Items Fast-Catalog Autocomplete / Selection -->
            ${masterItems.length > 0 ? `
              <div class="form-group" style="margin: 0; background: var(--bg-card-subtle); border: 1px dashed var(--border-color); border-radius: var(--radius-md); padding: 10px 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <label class="form-label" style="margin: 0; font-size: 11px; text-transform: uppercase; color: #38bdf8; font-weight: 700;">
                    ⚡ Auto-Fill From Item Master Catalog:
                  </label>
                  <span style="font-size: 10.5px; color: var(--text-dim);">Syncs Resolution & Specifications</span>
                </div>
                <select id="modalMasterSkuSelect" class="form-control" style="font-size: 12.5px;">
                  <option value="">-- Choose from Master Catalog (Optional) --</option>
                  ${masterItems.map(item => `
                    <option value="${item.sku}" data-name="${item.name}" data-specs="${item.specs || ''}" data-cat="${item.category || ''}">
                      ${item.sku} &bull; ${item.name} (${item.brand || 'Eliza'})
                    </option>
                  `).join('')}
                </select>
              </div>
            ` : ''}

            <!-- Row 3: Camera Type & Resolution/Model -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group" style="margin: 0;">
                <label class="form-label">Camera Form Factor</label>
                <select id="modalZoneCamType" class="form-control">
                  ${camTypeOptions.map(opt => `
                    <option value="${opt}" ${opt === currentCamType ? 'selected' : ''}>${opt}</option>
                  `).join('')}
                  <option value="__CUSTOM__">+ Custom Camera Type...</option>
                </select>
                <input type="text" id="modalZoneCamTypeCustom" class="form-control" placeholder="Enter custom camera form factor..." style="display: none; margin-top: 6px;">
              </div>
              <div class="form-group" style="margin: 0;">
                <label class="form-label">Resolution / Sensor Model</label>
                <select id="modalZoneRes" class="form-control">
                  ${resOptions.map(opt => `
                    <option value="${opt}" ${opt === currentRes ? 'selected' : ''}>${opt}</option>
                  `).join('')}
                  <option value="__CUSTOM__">+ Custom Resolution / Model...</option>
                </select>
                <input type="text" id="modalZoneResCustom" class="form-control" placeholder="Enter custom resolution / model name..." style="display: none; margin-top: 6px;">
              </div>
            </div>

            <!-- Row 4: Mounting Type & Environment -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group" style="margin: 0;">
                <label class="form-label">Mounting Type</label>
                <select id="modalZoneMount" class="form-control">
                  ${mountOptions.map(opt => `
                    <option value="${opt}" ${opt === currentMount ? 'selected' : ''}>${opt}</option>
                  `).join('')}
                  <option value="__CUSTOM__">+ Custom Mounting...</option>
                </select>
                <input type="text" id="modalZoneMountCustom" class="form-control" placeholder="Enter custom mounting specification..." style="display: none; margin-top: 6px;">
              </div>
              <div class="form-group" style="margin: 0;">
                <label class="form-label">Operating Environment</label>
                <select id="modalZoneEnv" class="form-control">
                  ${envOptions.map(opt => `
                    <option value="${opt}" ${opt === currentEnv ? 'selected' : ''}>${opt}</option>
                  `).join('')}
                  <option value="__CUSTOM__">+ Custom Environment...</option>
                </select>
                <input type="text" id="modalZoneEnvCustom" class="form-control" placeholder="Enter custom environment profile..." style="display: none; margin-top: 6px;">
              </div>
            </div>

            <!-- Row 5: Cable Distance -->
            <div class="form-group" style="margin: 0;">
              <label class="form-label">Estimated Cable Routing Distance (Meters per Run)</label>
              <div style="position: relative;">
                <input type="number" id="modalZoneCableMtr" class="form-control" value="${currentCableMtr}" min="5" max="1000" step="5" required>
                <span style="position: absolute; right: 10px; top: 9px; font-size: 11px; color: var(--text-dim); pointer-events: none;">Meters</span>
              </div>
            </div>

            <!-- Row 6: Lens & FOV Notes -->
            <div class="form-group" style="margin: 0;">
              <label class="form-label">Lens & FOV Engineering Notes</label>
              <input type="text" id="modalZoneNotes" class="form-control" value="${currentNotes}" placeholder="e.g. 4mm Lens, 85° FOV, entry vehicle license plate capture, ColorVu 24/7 F1.0">
            </div>

            <!-- Live Engineering Contribution Preview -->
            <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
              <div style="color: var(--text-muted);">
                Estimated Contribution:
              </div>
              <div id="modalLiveContribution" style="font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #38bdf8;">
                Bitrate: ~${(currentQty * 3.4).toFixed(1)} Mbps (H.265) &bull; Power: ~${(currentQty * 6.5).toFixed(1)}W &bull; Cable: ${currentCableMtr}m
              </div>
            </div>

          </div>
          <div class="modal-footer" style="padding: 16px 24px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              ${isEdit ? `
                <button type="button" id="modalDeleteZoneBtn" class="btn btn-secondary" style="color: var(--red-accent); border-color: rgba(239, 68, 68, 0.4);">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  Delete Zone
                </button>
              ` : '<div></div>'}
            </div>
            <div style="display: flex; gap: 10px;">
              <button type="button" id="cancelZoneModalBtn" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary">
                ${isEdit ? 'Save Zone Changes' : '+ Add Coverage Zone'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const overlay = document.getElementById('zoneCustomModalOverlay');
  const close = () => overlay?.remove();

  document.getElementById('closeZoneModalBtn')?.addEventListener('click', close);
  document.getElementById('cancelZoneModalBtn')?.addEventListener('click', close);

  // Custom field helpers
  const setupCustomSelect = (selectId, customInputId) => {
    const sel = document.getElementById(selectId);
    const inp = document.getElementById(customInputId);
    sel?.addEventListener('change', () => {
      if (sel.value === '__CUSTOM__') {
        inp.style.display = 'block';
        inp.focus();
      } else {
        inp.style.display = 'none';
      }
    });
  };

  setupCustomSelect('modalZoneCamType', 'modalZoneCamTypeCustom');
  setupCustomSelect('modalZoneRes', 'modalZoneResCustom');
  setupCustomSelect('modalZoneMount', 'modalZoneMountCustom');
  setupCustomSelect('modalZoneEnv', 'modalZoneEnvCustom');

  // Master catalog selection listener
  document.getElementById('modalMasterSkuSelect')?.addEventListener('change', (e) => {
    const sku = e.target.value;
    if (sku) {
      const selected = masterItems.find(m => m.sku === sku);
      if (selected) {
        // Auto-fill resolution & model
        const resSelect = document.getElementById('modalZoneRes');
        const customRes = document.getElementById('modalZoneResCustom');
        if (resSelect) {
          let matched = false;
          for (let opt of resSelect.options) {
            if (opt.value !== '__CUSTOM__' && selected.name.toLowerCase().includes(opt.value.toLowerCase().split(' ')[0])) {
              resSelect.value = opt.value;
              matched = true;
              break;
            }
          }
          if (!matched) {
            resSelect.value = '__CUSTOM__';
            customRes.style.display = 'block';
            customRes.value = selected.name;
          } else {
            customRes.style.display = 'none';
          }
        }

        // Auto-fill camera type if indicated
        const camSelect = document.getElementById('modalZoneCamType');
        if (camSelect) {
          if (selected.name.toLowerCase().includes('dome')) camSelect.value = 'Dome IP Camera';
          else if (selected.name.toLowerCase().includes('ptz')) camSelect.value = 'PTZ Speed Dome';
          else if (selected.name.toLowerCase().includes('bullet')) camSelect.value = 'Bullet IP Camera';
        }

        // Notes
        const notesInput = document.getElementById('modalZoneNotes');
        if (notesInput && selected.specs) {
          notesInput.value = `${selected.specs} (${selected.name})`;
        }
      }
    }
  });

  // Live contribution updater
  const updateContributionPreview = () => {
    const qty = Number(document.getElementById('modalZoneQty')?.value) || 1;
    const cable = Number(document.getElementById('modalZoneCableMtr')?.value) || 30;
    const res = document.getElementById('modalZoneRes')?.value || '4MP';
    let pWatts = 6.5;
    let bH265 = 3.4;
    if (res.includes('8MP') || res.includes('4K')) { pWatts = 9.5; bH265 = 8.0; }
    else if (res.includes('5MP')) { pWatts = 7.5; bH265 = 4.2; }
    else if (res.includes('2.4MP') || res.includes('2MP')) { pWatts = 5.5; bH265 = 2.2; }

    const preview = document.getElementById('modalLiveContribution');
    if (preview) {
      preview.innerHTML = `Bitrate: ~${(qty * bH265).toFixed(1)} Mbps (H.265) &bull; Power: ~${(qty * pWatts).toFixed(1)}W &bull; Cable: ${cable}m`;
    }
  };

  document.getElementById('modalZoneQty')?.addEventListener('input', updateContributionPreview);
  document.getElementById('modalZoneCableMtr')?.addEventListener('input', updateContributionPreview);
  document.getElementById('modalZoneRes')?.addEventListener('change', updateContributionPreview);

  // Delete button inside edit modal
  if (isEdit) {
    document.getElementById('modalDeleteZoneBtn')?.addEventListener('click', () => {
      if (confirm(`Are you sure you want to delete zone ${zone.id}?`)) {
        store.deleteZone(zone.id);
        close();
        if (onSaved) onSaved();
      }
    });
  }

  // Submit Handler
  document.getElementById('zoneCustomForm')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const id = document.getElementById('modalZoneId').value.trim();
    const name = document.getElementById('modalZoneName').value.trim();
    const area = Number(document.getElementById('modalZoneArea').value);
    const qty = Number(document.getElementById('modalZoneQty').value);

    // Resolve camType
    let camType = document.getElementById('modalZoneCamType').value;
    if (camType === '__CUSTOM__') {
      camType = document.getElementById('modalZoneCamTypeCustom').value.trim() || 'Custom Camera';
    }

    // Resolve res
    let res = document.getElementById('modalZoneRes').value;
    if (res === '__CUSTOM__') {
      res = document.getElementById('modalZoneResCustom').value.trim() || 'Custom Resolution';
    }

    // Resolve mount
    let mount = document.getElementById('modalZoneMount').value;
    if (mount === '__CUSTOM__') {
      mount = document.getElementById('modalZoneMountCustom').value.trim() || 'Custom Mount';
    }

    // Resolve env
    let env = document.getElementById('modalZoneEnv').value;
    if (env === '__CUSTOM__') {
      env = document.getElementById('modalZoneEnvCustom').value.trim() || 'Custom Environment';
    }

    const cableMtr = Number(document.getElementById('modalZoneCableMtr').value);
    const notes = document.getElementById('modalZoneNotes').value.trim() || 'Standard surveillance coverage zone';

    const payload = {
      id,
      name,
      area,
      qty,
      camType,
      res,
      mount,
      env,
      cableMtr,
      notes
    };

    if (isEdit) {
      store.updateZone(zone.id, payload);
    } else {
      store.addZone(payload);
    }

    close();
    if (onSaved) onSaved();
  });
}
