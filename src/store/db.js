// Central Data-Access Layer & LocalStorage Database Client (Single Source of Truth)
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

const STORAGE_KEY = 'ELIZA_ERP_STORAGE_V1';
const DB_VERSION_KEY = 'ELIZA_FIELD_OPS_MIGRATION_V2';

// Currency & Date Formatting Helpers
export function formatCurrency(amount, includeDecimals = false) {
  const num = Number(amount) || 0;
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0
  });
}

export function formatDate(dateInput) {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return dateInput;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return dateInput;
  }
}

export function formatDateTime(dateInput) {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return dateInput;
    const datePart = formatDate(d);
    const hrs = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${datePart} ${hrs}:${mins}`;
  } catch (e) {
    return dateInput;
  }
}

export function numberToWordsIndian(num) {
  const n = Math.floor(Number(num) || 0);
  if (n === 0) return 'Rupees Zero Only';

  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(val) {
    let str = '';
    if (val > 19) {
      str += b[Math.floor(val / 10)] + (val % 10 ? ' ' + a[val % 10] : ' ');
    } else {
      str += a[val];
    }
    return str;
  }

  let crore = Math.floor(n / 10000000);
  let lakh = Math.floor((n % 10000000) / 100000);
  let thousand = Math.floor((n % 100000) / 1000);
  let hundred = Math.floor((n % 1000) / 100);
  let rest = n % 100;

  let result = 'Rupees ';
  if (crore) result += inWords(crore) + 'Crore ';
  if (lakh) result += inWords(lakh) + 'Lakh ';
  if (thousand) result += inWords(thousand) + 'Thousand ';
  if (hundred) result += a[hundred] + 'Hundred ';
  if (rest) result += inWords(rest);

  return result.trim() + ' Only';
}

// -------------------------------------------------------------
// Realistic Seed Data Generators for Field Operations
// -------------------------------------------------------------
function generateSeedEmployees() {
  return [
    {
      id: "EMP-001",
      name: "Amit Sharma",
      role: "Senior Technician",
      phone: "+91 98120-11223",
      joinDate: "2024-03-15",
      payType: "PerPoint",
      defaultRate: 600,
      active: true,
      upiId: "amit.sharma@okaxis",
      notes: "Lead specialist in CP Plus STQC IP cameras, optical fiber splicing and rack dressing."
    },
    {
      id: "EMP-002",
      name: "Sunil Verma",
      role: "Supervisor",
      phone: "+91 94160-22334",
      joinDate: "2023-11-01",
      payType: "Monthly",
      defaultRate: 35000,
      active: true,
      upiId: "sunil.verma@sbi",
      notes: "Head of Projects & Field Operations. Manages technical dispatch and commissioning."
    },
    {
      id: "EMP-003",
      name: "Deepak Saini",
      role: "Technician",
      phone: "+91 98960-45678",
      joinDate: "2024-06-10",
      payType: "PerPoint",
      defaultRate: 600,
      active: true,
      upiId: "deepak.saini@icici",
      notes: "Field engineer for industrial cabling, PTZ alignment, and solar CCTV systems."
    },
    {
      id: "EMP-004",
      name: "Manoj Kumar",
      role: "Technician",
      phone: "+91 98124-55667",
      joinDate: "2024-08-01",
      payType: "PerPoint",
      defaultRate: 550,
      active: true,
      upiId: "manoj.cctv@paytm",
      notes: "Cabling termination, conduit layout, and power line noise isolation."
    },
    {
      id: "EMP-005",
      name: "Rajesh Dhiman",
      role: "Senior Technician",
      phone: "+91 94162-88771",
      joinDate: "2024-01-20",
      payType: "PerPoint",
      defaultRate: 650,
      active: true,
      upiId: "rajesh.dhiman@ybl",
      notes: "Complex NVR RAID storage arrays and IP subnets."
    },
    {
      id: "EMP-006",
      name: "Vikram Malik",
      role: "Technician",
      phone: "+91 99920-22334",
      joinDate: "2025-01-15",
      payType: "PerPoint",
      defaultRate: 600,
      active: true,
      upiId: "vikram.m@oksbi",
      notes: "Government utility sub-station surveillance maintenance."
    },
    {
      id: "EMP-007",
      name: "Sonu Rawat",
      role: "Helper",
      phone: "+91 98133-44552",
      joinDate: "2025-02-01",
      payType: "Daily",
      defaultRate: 500,
      active: true,
      upiId: "sonu.rawat@upi",
      notes: "Conduit pulling, ladder handling, and camera bracket mounting assistance."
    },
    {
      id: "EMP-008",
      name: "Anil Kashyap",
      role: "Helper",
      phone: "+91 94665-66778",
      joinDate: "2025-03-01",
      payType: "Daily",
      defaultRate: 500,
      active: true,
      upiId: "anil.k@upi",
      notes: "Site cleanup, cable labeling, and warehouse dispatch helper."
    },
    {
      id: "EMP-009",
      name: "Mohit Panchal",
      role: "Technician",
      phone: "+91 98966-77889",
      joinDate: "2025-04-10",
      payType: "PerJob",
      defaultRate: 1500,
      active: true,
      upiId: "mohit.panchal@hdfc",
      notes: "Quick residential Wi-Fi and 2-4 camera turnkey installations."
    },
    {
      id: "EMP-010",
      name: "Sanjay Tanwar",
      role: "Senior Technician",
      phone: "+91 98125-99881",
      joinDate: "2024-05-18",
      payType: "Monthly",
      defaultRate: 28000,
      active: true,
      upiId: "sanjay.tanwar@axis",
      notes: "AMC preventive maintenance auditor and SLA critical ticket specialist."
    },
    {
      id: "EMP-011",
      name: "Pooja Rathi",
      role: "Sales Exec",
      phone: "+91 94168-11223",
      joinDate: "2024-09-01",
      payType: "Monthly",
      defaultRate: 25000,
      active: true,
      upiId: "pooja.r@ybl",
      notes: "Commercial tenders, site surveys, and BOQ coordination."
    },
    {
      id: "EMP-012",
      name: "Aditya Sharma",
      role: "Super Admin",
      roleCode: "ADMIN",
      email: "aditya@elizainfotech.com",
      phone: "+91 89300-82398",
      joinDate: "2022-01-01",
      payType: "Monthly",
      defaultRate: 75000,
      active: true,
      upiId: "aditya@cbin",
      notes: "Managing Director & CEO. Apex governance and final project verification."
    }
  ];
}

function generateSeedJobs() {
  return [
    {
      id: "JOB-2026-0001",
      title: "10-Point CP Plus STQC Security Setup",
      type: "New Install",
      clientId: "PRT-01",
      clientName: "XEN City Division West, UHBVN, Panipat",
      siteAddress: "Old Power House Complex, Jattal Road, Panipat, Haryana",
      mapLink: "https://maps.google.com/?q=29.3909,76.9635",
      projectId: "PRJ-2026-01",
      ticketId: null,
      amcId: null,
      priority: "High",
      status: "Verified",
      assignees: [
        { employeeId: "EMP-001", role: "Lead", rate: 600, payBasis: "PerPoint", units: 10 }
      ],
      scheduledStart: "2026-04-12T09:00:00",
      scheduledEnd: "2026-04-12T18:00:00",
      actualStart: "2026-04-12T09:15:00",
      actualEnd: "2026-04-12T17:45:00",
      camsCount: 10,
      pointsCount: 10,
      checklist: [
        { text: "Route 3+1 RG-59 / Cat-6 heavy-duty cable in PVC conduit", done: true },
        { text: "Install weatherproof junction boxes at all 10 pole fixtures", done: true },
        { text: "Mount 4MP CP Plus STQC full-colour night cameras", done: true },
        { text: "Configure 16-channel NVR with static IP subnet 192.168.1.100", done: true },
        { text: "Format 2x 6TB Surveillance hard drives in RAID mirror", done: true },
        { text: "Setup mobile app remote viewing on XEN Executive iPad", done: true },
        { text: "Client handover walk-through & official verification", done: true }
      ],
      materials: [
        { skuId: "CP-CAM-4MP-STQC", skuName: "CP Plus 4MP Full HD STQC Dome", qty: 6, returned: 0 },
        { skuId: "CP-CAM-4MP-BLT", skuName: "CP Plus 4MP Bullet STQC Camera", qty: 4, returned: 0 },
        { skuId: "DLINK-CAT6-305", skuName: "D-Link Cat-6 305m Cable Roll", qty: 2, returned: 0 }
      ],
      notes: "Official substation installation verified by Super Admin Aditya Sharma.",
      attachments: [],
      customerSignature: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='40'><path d='M10,25 Q30,5 50,25 T90,20' fill='none' stroke='%2338bdf8' stroke-width='2'/></svg>",
      createdBy: "Aditya Sharma",
      createdAt: "2026-04-10T10:00:00",
      updatedAt: "2026-04-15T16:00:00",
      activity: [
        { timestamp: "2026-04-10 10:00:00", user: "Aditya Sharma", action: "Job Created & Scheduled" },
        { timestamp: "2026-04-12 17:45:00", user: "Amit Sharma", action: "Marked Completed (10 Cams, 10 Pts)" },
        { timestamp: "2026-04-15 16:00:00", user: "Aditya Sharma", action: "Verified by MD/CEO (Labour ₹6,000 posted to PRJ-2026-01)" }
      ]
    },
    {
      id: "JOB-2026-0002",
      title: "8-Camera Auction Yard Surveillance & 4TB Setup",
      type: "New Install",
      clientId: "PRT-02",
      clientName: "Market Committee Auction Charges Society",
      siteAddress: "Grain Market Complex, G.T. Road, Panipat",
      mapLink: "https://maps.google.com/?q=29.4010,76.9720",
      projectId: "PRJ-2026-02",
      ticketId: null,
      amcId: null,
      priority: "Medium",
      status: "Verified",
      assignees: [
        { employeeId: "EMP-002", role: "Lead", rate: 600, payBasis: "PerPoint", units: 8 }
      ],
      scheduledStart: "2026-04-26T09:30:00",
      scheduledEnd: "2026-04-26T17:30:00",
      actualStart: "2026-04-26T09:40:00",
      actualEnd: "2026-04-26T16:50:00",
      camsCount: 8,
      pointsCount: 8,
      checklist: [
        { text: "Mount heavy-duty steel pipe brackets on yard pillars", done: true },
        { text: "Pull armoured Cat-6 cable across shed trusses", done: true },
        { text: "Mount 8 CP Plus 2.4MP cameras with surge suppressors", done: true },
        { text: "Configure 8-Ch NVR and Seagate SkyHawk 4TB HDD", done: true },
        { text: "Demonstrate live view on 43-inch Mandi monitor", done: true }
      ],
      materials: [
        { skuId: "CP-CAM-2.4MP-IR", skuName: "CP Plus 2.4MP IR Dome", qty: 4, returned: 0 },
        { skuId: "CP-CAM-2.4MP-BLT", skuName: "CP Plus 2.4MP Bullet", qty: 4, returned: 0 }
      ],
      notes: "Gate shed auction surveillance setup certified.",
      attachments: [],
      customerSignature: null,
      createdBy: "Aditya Sharma",
      createdAt: "2026-04-24T11:00:00",
      updatedAt: "2026-04-28T15:00:00",
      activity: [
        { timestamp: "2026-04-24 11:00:00", user: "Aditya Sharma", action: "Job Created" },
        { timestamp: "2026-04-26 16:50:00", user: "Sunil Verma", action: "Marked Completed" },
        { timestamp: "2026-04-28 15:00:00", user: "Aditya Sharma", action: "Verified by MD/CEO" }
      ]
    },
    {
      id: "JOB-2026-0003",
      title: "Smart Wi-Fi S35T Residence Setup",
      type: "New Install",
      clientId: "PRT-03",
      clientName: "Sh. Ajay Jain Residence & Godown",
      siteAddress: "House No. 14, Model Town, Near Shivaji Stadium, Panipat",
      mapLink: "https://maps.google.com/?q=29.3950,76.9680",
      projectId: "PRJ-2026-03",
      ticketId: null,
      amcId: null,
      priority: "Low",
      status: "Verified",
      assignees: [
        { employeeId: "EMP-003", role: "Lead", rate: 600, payBasis: "PerPoint", units: 2 }
      ],
      scheduledStart: "2026-05-08T10:00:00",
      scheduledEnd: "2026-05-08T14:00:00",
      actualStart: "2026-05-08T10:15:00",
      actualEnd: "2026-05-08T13:30:00",
      camsCount: 2,
      pointsCount: 2,
      checklist: [
        { text: "Mount Wi-Fi PTZ smart cameras on garden porch and gate", done: true },
        { text: "Insert 128GB High Endurance MicroSD cards", done: true },
        { text: "Pair with home mesh router on 2.4GHz Wi-Fi", done: true },
        { text: "Setup motion human tracking and push notifications", done: true }
      ],
      materials: [
        { skuId: "CP-WIFI-S35T", skuName: "CP Plus Smart Wi-Fi 3MP PTZ", qty: 2, returned: 0 }
      ],
      notes: "Residential installation complete and verified.",
      attachments: [],
      customerSignature: null,
      createdBy: "Amit Sharma",
      createdAt: "2026-05-06T14:00:00",
      updatedAt: "2026-05-10T12:00:00",
      activity: [
        { timestamp: "2026-05-06 14:00:00", user: "Amit Sharma", action: "Job Created" },
        { timestamp: "2026-05-08 13:30:00", user: "Deepak Saini", action: "Marked Completed" },
        { timestamp: "2026-05-10 12:00:00", user: "Aditya Sharma", action: "Verified by MD/CEO" }
      ]
    },
    {
      id: "JOB-2026-0004",
      title: "16-Point Industrial Fiber CCTV Extension",
      type: "New Install",
      clientId: "PRT-04",
      clientName: "Panipat Handloom & Textile Cluster Hub",
      siteAddress: "Sector 29 Industrial Estate, Part-II, Panipat",
      mapLink: "https://maps.google.com/?q=29.4120,76.9950",
      projectId: "PRJ-2026-04",
      ticketId: null,
      amcId: null,
      priority: "High",
      status: "Completed",
      assignees: [
        { employeeId: "EMP-004", role: "Lead", rate: 600, payBasis: "PerPoint", units: 16 },
        { employeeId: "EMP-007", role: "Support", rate: 500, payBasis: "Daily", units: 2 }
      ],
      scheduledStart: "2026-05-20T09:00:00",
      scheduledEnd: "2026-05-22T18:00:00",
      actualStart: "2026-05-20T09:30:00",
      actualEnd: "2026-05-22T17:15:00",
      camsCount: 16,
      pointsCount: 16,
      checklist: [
        { text: "Pull 4-core optical fiber to weaving unit shed", done: true },
        { text: "Install 16 PoE IP dome and bullet cameras", done: true },
        { text: "Configure 32-Ch NVR and 16-port Gigabit PoE switch", done: true },
        { text: "Setup motion detection on raw yarn storage bays", done: true }
      ],
      materials: [
        { skuId: "CP-CAM-4MP-IP", skuName: "CP Plus 4MP IP Network Camera", qty: 16, returned: 0 }
      ],
      notes: "Awaiting final supervisor sign-off before official verification.",
      attachments: [],
      customerSignature: null,
      createdBy: "Sunil Verma",
      createdAt: "2026-05-18T10:00:00",
      updatedAt: "2026-05-22T17:30:00",
      activity: [
        { timestamp: "2026-05-18 10:00:00", user: "Sunil Verma", action: "Job Created" },
        { timestamp: "2026-05-22 17:15:00", user: "Manoj Kumar", action: "Marked Completed (Requires MD/CEO Verification)" }
      ]
    },
    {
      id: "JOB-2026-0005",
      title: "Substation Yard Feed Black Screen Repair",
      type: "Complaint Repair",
      clientId: "PRT-01",
      clientName: "XEN City Division West, UHBVN, Panipat",
      siteAddress: "Old Power House Complex, Jattal Road, Panipat",
      mapLink: "https://maps.google.com/?q=29.3909,76.9635",
      projectId: null,
      ticketId: "TKT-1001",
      amcId: "AMC-2026-05",
      priority: "Critical",
      status: "Completed",
      assignees: [
        { employeeId: "EMP-001", role: "Lead", rate: 500, payBasis: "PerJob", units: 1 }
      ],
      scheduledStart: "2026-10-20T09:00:00",
      scheduledEnd: "2026-10-20T12:00:00",
      actualStart: "2026-10-20T09:15:00",
      actualEnd: "2026-10-20T11:30:00",
      camsCount: 1,
      pointsCount: 1,
      checklist: [
        { text: "Inspect high-voltage yard junction box", done: true },
        { text: "Replace pinched BNC connector & waterproof silicone seal", done: true },
        { text: "Verify 12V 2A clean DC output at camera terminal", done: true },
        { text: "Confirm 1080p stream restored on control room monitor #2", done: true }
      ],
      materials: [
        { skuId: "BNC-DC-CONN", skuName: "Heavy-Duty Gold Plated BNC Connector", qty: 2, returned: 0 }
      ],
      notes: "Spawned from Critical Ticket TKT-1001 under Active AMC.",
      attachments: [],
      customerSignature: null,
      createdBy: "Sunil Verma",
      createdAt: "2026-10-20T08:15:00",
      updatedAt: "2026-10-20T11:30:00",
      activity: [
        { timestamp: "2026-10-20 08:15:00", user: "Sunil Verma", action: "Created from Ticket TKT-1001" },
        { timestamp: "2026-10-20 11:30:00", user: "Amit Sharma", action: "Marked Completed (Ready for Verification)" }
      ]
    },
    {
      id: "JOB-2026-0006",
      title: "Hafed Agro Cold Storage 12-Cam Expansion",
      type: "Upgrade",
      clientId: "PRT-05",
      clientName: "Hafed Agro Cold Storage Plant",
      siteAddress: "Assandh Road, Near New Grain Market, Panipat",
      mapLink: "https://maps.google.com/?q=29.4050,76.9450",
      projectId: "PRJ-2026-05",
      ticketId: null,
      amcId: null,
      priority: "High",
      status: "In Progress",
      assignees: [
        { employeeId: "EMP-001", role: "Lead", rate: 600, payBasis: "PerPoint", units: 12 },
        { employeeId: "EMP-008", role: "Support", rate: 500, payBasis: "Daily", units: 1 }
      ],
      scheduledStart: "2026-10-20T09:00:00",
      scheduledEnd: "2026-10-21T18:00:00",
      actualStart: "2026-10-20T09:30:00",
      actualEnd: null,
      camsCount: 12,
      pointsCount: 12,
      checklist: [
        { text: "Lay moisture-resistant armored cable in freezer chamber -20°C", done: true },
        { text: "Mount heated anti-fog bullet cameras on loading docks", done: true },
        { text: "Configure auxiliary NVR on industrial rack", done: false },
        { text: "Integrate with plant weighbridge software", done: false }
      ],
      materials: [
        { skuId: "CP-CAM-4MP-HEATED", skuName: "CP Plus Heated Anti-Fog Bullet", qty: 6, returned: 0 }
      ],
      notes: "Chamber wiring completed; NVR configuration in progress.",
      attachments: [],
      customerSignature: null,
      createdBy: "Sunil Verma",
      createdAt: "2026-10-18T12:00:00",
      updatedAt: "2026-10-20T10:00:00",
      activity: [
        { timestamp: "2026-10-18 12:00:00", user: "Sunil Verma", action: "Job Created & Assigned" },
        { timestamp: "2026-10-20 09:30:00", user: "Amit Sharma", action: "Clocked In Progress on Site" }
      ]
    },
    {
      id: "JOB-2026-0007",
      title: "DVR Alert Buzzer & HDD Replacement",
      type: "Complaint Repair",
      clientId: "PRT-02",
      clientName: "Market Committee Auction Charges Society",
      siteAddress: "Grain Market Gate #1, G.T. Road, Panipat",
      mapLink: "https://maps.google.com/?q=29.4010,76.9720",
      projectId: null,
      ticketId: "TKT-1002",
      amcId: "AMC-2026-02",
      priority: "Critical",
      status: "In Progress",
      assignees: [
        { employeeId: "EMP-002", role: "Lead", rate: 600, payBasis: "PerJob", units: 1 }
      ],
      scheduledStart: "2026-10-20T10:00:00",
      scheduledEnd: "2026-10-20T13:00:00",
      actualStart: "2026-10-20T10:15:00",
      actualEnd: null,
      camsCount: 0,
      pointsCount: 1,
      checklist: [
        { text: "Diagnose SMART drive health and SATA data bus", done: true },
        { text: "Replace faulty SATA 6Gb/s data cable", done: true },
        { text: "Run full bad sector surface scan", done: false },
        { text: "Verify buzzer mute and normal continuous recording", done: false }
      ],
      materials: [
        { skuId: "SATA-LEAD-6G", skuName: "Shielded Locking SATA Cable", qty: 1, returned: 0 }
      ],
      notes: "Critical buzzer fault at main mandi entrance gate.",
      attachments: [],
      customerSignature: null,
      createdBy: "Aditya Sharma",
      createdAt: "2026-10-20T08:30:00",
      updatedAt: "2026-10-20T10:15:00",
      activity: [
        { timestamp: "2026-10-20 08:30:00", user: "Aditya Sharma", action: "Created from Critical Ticket TKT-1002" },
        { timestamp: "2026-10-20 10:15:00", user: "Sunil Verma", action: "Arrived at Gate #1 & Started Diagnosis" }
      ]
    },
    {
      id: "JOB-2026-0008",
      title: "Quarterly Preventive Maintenance Q4-2026",
      type: "AMC Visit",
      clientId: "PRT-05",
      clientName: "SDO Sub-Division No. 1, UHBVN, Panipat",
      siteAddress: "Gohana Road Power Grid Complex, Panipat",
      mapLink: "https://maps.google.com/?q=29.3850,76.9550",
      projectId: null,
      ticketId: null,
      amcId: "AMC-2026-05",
      priority: "Medium",
      status: "In Progress",
      assignees: [
        { employeeId: "EMP-006", role: "Lead", rate: 800, payBasis: "PerJob", units: 1 }
      ],
      scheduledStart: "2026-10-20T11:00:00",
      scheduledEnd: "2026-10-20T16:00:00",
      actualStart: "2026-10-20T11:15:00",
      actualEnd: null,
      camsCount: 8,
      pointsCount: 8,
      checklist: [
        { text: "Clean all 8 camera glass domes with optical solution", done: true },
        { text: "Check SMPS DC voltage output under peak IR load", done: true },
        { text: "Test NVR recording retention (last 30 days intact)", done: false },
        { text: "Check UPS battery backup runtime test", done: false }
      ],
      materials: [],
      notes: "Automated quarterly PM visit generated by AMC engine.",
      attachments: [],
      customerSignature: null,
      createdBy: "AMC Engine",
      createdAt: "2026-10-15T09:00:00",
      updatedAt: "2026-10-20T11:15:00",
      activity: [
        { timestamp: "2026-10-15 09:00:00", user: "AMC Engine", action: "Auto-Generated PM Job (7-day rule)" },
        { timestamp: "2026-10-20 11:15:00", user: "Vikram Malik", action: "Started Quarterly PM Service" }
      ]
    },
    {
      id: "JOB-2026-0009",
      title: "Model Town Commercial Arcade CCTV Setup",
      type: "New Install",
      clientId: "PRT-06",
      clientName: "Model Town Commercial Shopping Arcade",
      siteAddress: "Near Main Market Fountain, Model Town, Panipat",
      mapLink: "https://maps.google.com/?q=29.3980,76.9690",
      projectId: null,
      ticketId: null,
      amcId: null,
      priority: "High",
      status: "Scheduled",
      assignees: [
        { employeeId: "EMP-003", role: "Lead", rate: 600, payBasis: "PerPoint", units: 12 },
        { employeeId: "EMP-007", role: "Support", rate: 500, payBasis: "Daily", units: 1 }
      ],
      scheduledStart: "2026-10-22T09:00:00",
      scheduledEnd: "2026-10-22T18:00:00",
      actualStart: null,
      actualEnd: null,
      camsCount: 12,
      pointsCount: 12,
      checklist: [
        { text: "Check arcade shopkeeper approvals for corridor cabling", done: false },
        { text: "Mount 8 indoor dome cameras and 4 outdoor bullet cameras", done: false },
        { text: "Terminate Cat-6 with high-grade RJ-45 jacks", done: false },
        { text: "Lock NVR inside 4U wall-mount server cabinet", done: false }
      ],
      materials: [
        { skuId: "CP-CAM-4MP-STQC", skuName: "CP Plus 4MP STQC Dome", qty: 8, returned: 0 },
        { skuId: "CP-CAM-4MP-BLT", skuName: "CP Plus 4MP STQC Bullet", qty: 4, returned: 0 }
      ],
      notes: "Client requested clean concealed white PVC casing in shopping corridors.",
      attachments: [],
      customerSignature: null,
      createdBy: "Aditya Sharma",
      createdAt: "2026-10-19T15:00:00",
      updatedAt: "2026-10-19T15:00:00",
      activity: [
        { timestamp: "2026-10-19 15:00:00", user: "Aditya Sharma", action: "Job Created & Dispatched for Oct 22" }
      ]
    },
    {
      id: "JOB-2026-0010",
      title: "Night Vision IR LED Replacement",
      type: "Complaint Repair",
      clientId: "PRT-04",
      clientName: "Panipat Handloom Cluster Hub",
      siteAddress: "Sector 29 Industrial Area, Panipat",
      mapLink: "https://maps.google.com/?q=29.4120,76.9950",
      projectId: null,
      ticketId: "TKT-1003",
      amcId: null,
      priority: "Medium",
      status: "Scheduled",
      assignees: [
        { employeeId: "EMP-005", role: "Lead", rate: 500, payBasis: "PerJob", units: 1 }
      ],
      scheduledStart: "2026-10-21T10:00:00",
      scheduledEnd: "2026-10-21T13:00:00",
      actualStart: null,
      actualEnd: null,
      camsCount: 1,
      pointsCount: 1,
      checklist: [
        { text: "Inspect 12V 2A auxiliary power supply line", done: false },
        { text: "Replace defective IR LED array board or complete bullet unit", done: false },
        { text: "Test night illumination at 30-meter perimeter", done: false }
      ],
      materials: [],
      notes: "Ticket TKT-1003 complaint repair scheduled for tomorrow morning.",
      attachments: [],
      customerSignature: null,
      createdBy: "Sunil Verma",
      createdAt: "2026-10-20T09:00:00",
      updatedAt: "2026-10-20T09:00:00",
      activity: [
        { timestamp: "2026-10-20 09:00:00", user: "Sunil Verma", action: "Created from Ticket TKT-1003" }
      ]
    },
    {
      id: "JOB-2026-0011",
      title: "Sugar Mills Heavy Industrial CCTV Health Audit",
      type: "Survey",
      clientId: "PRT-07",
      clientName: "Karnal Central Co-op Sugar Mills Complex",
      siteAddress: "Karnal Road, Near Toll Plaza, Karnal / Panipat Border",
      mapLink: "https://maps.google.com/?q=29.4500,76.9800",
      projectId: null,
      ticketId: null,
      amcId: "AMC-2026-07",
      priority: "Low",
      status: "Scheduled",
      assignees: [
        { employeeId: "EMP-002", role: "Lead", rate: 1000, payBasis: "PerJob", units: 1 }
      ],
      scheduledStart: "2026-10-23T10:00:00",
      scheduledEnd: "2026-10-23T15:00:00",
      actualStart: null,
      actualEnd: null,
      camsCount: 20,
      pointsCount: 20,
      checklist: [
        { text: "Survey high-dust crusher and boiler camera housing", done: false },
        { text: "Measure optical fiber attenuation on 1.2km main run", done: false },
        { text: "Document non-comprehensive component wear-and-tear", done: false }
      ],
      materials: [],
      notes: "Pre-crushing season surveillance readiness survey.",
      attachments: [],
      customerSignature: null,
      createdBy: "Aditya Sharma",
      createdAt: "2026-10-19T16:30:00",
      updatedAt: "2026-10-19T16:30:00",
      activity: [
        { timestamp: "2026-10-19 16:30:00", user: "Aditya Sharma", action: "Scheduled Audit Visit" }
      ]
    },
    {
      id: "JOB-2026-0012",
      title: "Agricultural Mandi Fiber Link Re-Routing",
      type: "Re-routing",
      clientId: "PRT-02",
      clientName: "Market Committee Auction Charges Society",
      siteAddress: "North Gate Construction Zone, Mandi, Panipat",
      mapLink: "https://maps.google.com/?q=29.4010,76.9720",
      projectId: null,
      ticketId: null,
      amcId: null,
      priority: "Medium",
      status: "On Hold",
      assignees: [
        { employeeId: "EMP-004", role: "Lead", rate: 600, payBasis: "PerPoint", units: 4 }
      ],
      scheduledStart: "2026-10-17T09:00:00",
      scheduledEnd: "2026-10-17T17:00:00",
      actualStart: "2026-10-17T09:30:00",
      actualEnd: null,
      camsCount: 4,
      pointsCount: 4,
      checklist: [
        { text: "Excavate trench away from municipal road widening works", done: true },
        { text: "Pull 25mm HDPE duct with warning tape", done: false },
        { text: "Re-splice fiber at joint enclosure #3", done: false }
      ],
      materials: [],
      notes: "On Hold: Mandi road contractor requested 3 days to finish curb laying.",
      attachments: [],
      customerSignature: null,
      createdBy: "Sunil Verma",
      createdAt: "2026-10-16T11:00:00",
      updatedAt: "2026-10-17T11:30:00",
      activity: [
        { timestamp: "2026-10-16 11:00:00", user: "Sunil Verma", action: "Job Created" },
        { timestamp: "2026-10-17 11:30:00", user: "Manoj Kumar", action: "Marked On Hold (Site excavation clash with PWD roadwork)" }
      ]
    },
    {
      id: "JOB-2026-0013",
      title: "Adarsh Model School Campus Camera Relocation",
      type: "Re-routing",
      clientId: "PRT-08",
      clientName: "Adarsh Senior Secondary Model School",
      siteAddress: "Sanoli Road, Panipat",
      mapLink: "https://maps.google.com/?q=29.3910,76.9850",
      projectId: null,
      ticketId: null,
      amcId: "AMC-2026-08",
      priority: "Low",
      status: "On Hold",
      assignees: [
        { employeeId: "EMP-009", role: "Lead", rate: 1200, payBasis: "PerJob", units: 1 }
      ],
      scheduledStart: "2026-10-19T10:00:00",
      scheduledEnd: "2026-10-19T16:00:00",
      actualStart: "2026-10-19T10:15:00",
      actualEnd: null,
      camsCount: 2,
      pointsCount: 2,
      checklist: [
        { text: "Dismount corridor cameras due to classroom painting", done: true },
        { text: "Re-mount and focus on completion of paint work", done: false }
      ],
      materials: [],
      notes: "On Hold: School principal requested delay till ongoing mid-term exams conclude.",
      attachments: [],
      customerSignature: null,
      createdBy: "Aditya Sharma",
      createdAt: "2026-10-18T14:00:00",
      updatedAt: "2026-10-19T11:00:00",
      activity: [
        { timestamp: "2026-10-18 14:00:00", user: "Aditya Sharma", action: "Job Created" },
        { timestamp: "2026-10-19 11:00:00", user: "Mohit Panchal", action: "Marked On Hold (Mid-term exam silence requested)" }
      ]
    },
    {
      id: "JOB-2026-0014",
      title: "Woolen Blanket Dyeing Mill 8-Cam Expansion",
      type: "New Install",
      clientId: "PRT-09",
      clientName: "Jattal Road Blanket & Woolen Dyeing Mills",
      siteAddress: "Near Radha-Krishna School, Jattal Road, Panipat",
      mapLink: "https://maps.google.com/?q=29.3900,76.9580",
      projectId: null,
      ticketId: null,
      amcId: null,
      priority: "Medium",
      status: "Backlog",
      assignees: [],
      scheduledStart: null,
      scheduledEnd: null,
      actualStart: null,
      actualEnd: null,
      camsCount: 8,
      pointsCount: 8,
      checklist: [
        { text: "Survey chemical steam vents to avoid corrosive exposure", done: false },
        { text: "Mount IP67 corrosion-proof cameras in dye processing shed", done: false },
        { text: "Connect to central administration PC monitor", done: false }
      ],
      materials: [
        { skuId: "CP-CAM-4MP-STQC", skuName: "CP Plus 4MP STQC Dome", qty: 4, returned: 0 },
        { skuId: "CP-CAM-4MP-BLT", skuName: "CP Plus 4MP STQC Bullet", qty: 4, returned: 0 }
      ],
      notes: "Won from CRM Lead LEAD-107. Ready for scheduling upon advance receipt.",
      attachments: [],
      customerSignature: null,
      createdBy: "Amit Sharma",
      createdAt: "2026-10-19T17:00:00",
      updatedAt: "2026-10-19T17:00:00",
      activity: [
        { timestamp: "2026-10-19 17:00:00", user: "Amit Sharma", action: "Job Converted from CRM Won Opportunity" }
      ]
    },
    {
      id: "JOB-2026-0015",
      title: "Container Freight Terminal Perimeter Pole Lighting Check",
      type: "Survey",
      clientId: "PRT-10",
      clientName: "G.T. Road Container Freight Terminal",
      siteAddress: "NH-44 KM 89 Milestone, Panipat",
      mapLink: "https://maps.google.com/?q=29.4300,76.9850",
      projectId: null,
      ticketId: null,
      amcId: null,
      priority: "Low",
      status: "Backlog",
      assignees: [],
      scheduledStart: null,
      scheduledEnd: null,
      actualStart: null,
      actualEnd: null,
      camsCount: 14,
      pointsCount: 14,
      checklist: [
        { text: "Measure pole height and lightning arrester grounding", done: false },
        { text: "Test solar battery bank voltage stability", done: false }
      ],
      materials: [],
      notes: "Inquiry phase survey for long-distance perimeter wireless CCTV bridge.",
      attachments: [],
      customerSignature: null,
      createdBy: "Sunil Verma",
      createdAt: "2026-10-20T08:00:00",
      updatedAt: "2026-10-20T08:00:00",
      activity: [
        { timestamp: "2026-10-20 08:00:00", user: "Sunil Verma", action: "Created in Backlog" }
      ]
    }
  ];
}

function generateSeedTickets() {
  const now = new Date();
  const iso = d => d.toISOString();

  // Breached ticket: Critical logged 8 hours ago (SLA resolve due was 4h ago!)
  const breachedTime = new Date(now.getTime() - 8 * 60 * 60 * 1000);
  const breachedResolveDue = new Date(breachedTime.getTime() + 4 * 60 * 60 * 1000);

  // Critical ticket logged today
  const tkt1Time = new Date(now.getTime() - 2.5 * 60 * 60 * 1000);
  const tkt1RespDue = new Date(tkt1Time.getTime() + 1 * 60 * 60 * 1000);
  const tkt1ResDue = new Date(tkt1Time.getTime() + 4 * 60 * 60 * 1000);

  return [
    {
      id: "TKT-1001",
      clientId: "PRT-01",
      clientName: "XEN City Division West, UHBVN, Panipat",
      amcId: "AMC-2026-05",
      channel: "Phone",
      issue: "Cam #2 Substation yard feed black screen / no video signal",
      category: "Cabling",
      severity: "Critical",
      status: "In Progress",
      loggedAt: iso(tkt1Time),
      firstResponseAt: iso(new Date(tkt1Time.getTime() + 15 * 60 * 1000)),
      resolvedAt: null,
      slaResponseDue: iso(tkt1RespDue),
      slaResolveDue: iso(tkt1ResDue),
      jobId: "JOB-2026-0005",
      assignedTo: "EMP-001",
      assignedName: "Amit Sharma",
      resolutionNote: "",
      csat: null,
      pausedMs: 0,
      history: [
        { timestamp: formatDateTime(tkt1Time), user: "Sunil Verma", action: "Ticket Logged via Phone" },
        { timestamp: formatDateTime(new Date(tkt1Time.getTime() + 15 * 60 * 1000)), user: "Sunil Verma", action: "Assigned to Amit Sharma & Spawned JOB-2026-0005" }
      ]
    },
    {
      id: "TKT-1002",
      clientId: "PRT-02",
      clientName: "Market Committee Auction Charges Society",
      amcId: "AMC-2026-02",
      channel: "WhatsApp",
      issue: "DVR buzzer continuous alert tone at gate #1; recording halted",
      category: "Storage",
      severity: "Critical",
      status: "In Progress",
      loggedAt: iso(new Date(now.getTime() - 1.5 * 60 * 60 * 1000)),
      firstResponseAt: iso(new Date(now.getTime() - 1.2 * 60 * 60 * 1000)),
      resolvedAt: null,
      slaResponseDue: iso(new Date(now.getTime() - 0.5 * 60 * 60 * 1000)),
      slaResolveDue: iso(new Date(now.getTime() + 2.5 * 60 * 60 * 1000)),
      jobId: "JOB-2026-0007",
      assignedTo: "EMP-002",
      assignedName: "Sunil Verma",
      resolutionNote: "",
      csat: null,
      pausedMs: 0,
      history: [
        { timestamp: formatDateTime(new Date(now.getTime() - 1.5 * 60 * 60 * 1000)), user: "Aditya Sharma", action: "Ticket Logged via WhatsApp" }
      ]
    },
    {
      id: "TKT-1003",
      clientId: "PRT-04",
      clientName: "Panipat Handloom Cluster Hub",
      amcId: null,
      channel: "Email",
      issue: "Perimeter Bullet IR LED night illumination dead after thunderstorm",
      category: "Camera",
      severity: "Medium",
      status: "Assigned",
      loggedAt: iso(new Date(now.getTime() - 3 * 60 * 60 * 1000)),
      firstResponseAt: iso(new Date(now.getTime() - 2.5 * 60 * 60 * 1000)),
      resolvedAt: null,
      slaResponseDue: iso(new Date(now.getTime() + 1 * 60 * 60 * 1000)),
      slaResolveDue: iso(new Date(now.getTime() + 21 * 60 * 60 * 1000)),
      jobId: "JOB-2026-0010",
      assignedTo: "EMP-005",
      assignedName: "Rajesh Dhiman",
      resolutionNote: "",
      csat: null,
      pausedMs: 0,
      history: [
        { timestamp: formatDateTime(new Date(now.getTime() - 3 * 60 * 60 * 1000)), user: "Sunil Verma", action: "Logged & Assigned" }
      ]
    },
    {
      id: "TKT-1004",
      clientId: "PRT-05",
      clientName: "Hafed Agro Cold Storage Plant",
      amcId: null,
      channel: "Portal",
      issue: "Mobile app device status showing offline on factory Wi-Fi",
      category: "Network",
      severity: "High",
      status: "Open",
      loggedAt: iso(new Date(now.getTime() - 1 * 60 * 60 * 1000)),
      firstResponseAt: null,
      slaResponseDue: iso(new Date(now.getTime() + 1 * 60 * 60 * 1000)),
      slaResolveDue: iso(new Date(now.getTime() + 11 * 60 * 60 * 1000)),
      jobId: null,
      assignedTo: null,
      assignedName: null,
      resolutionNote: "",
      csat: null,
      pausedMs: 0,
      history: [
        { timestamp: formatDateTime(new Date(now.getTime() - 1 * 60 * 60 * 1000)), user: "Portal Client", action: "Logged via Client Web Portal" }
      ]
    },
    {
      id: "TKT-1005",
      clientId: "PRT-08",
      clientName: "Adarsh Senior Secondary Model School",
      amcId: "AMC-2026-08",
      channel: "Phone",
      issue: "Camera #7 corridor feed jumping frames; cable connector loose",
      category: "Cabling",
      severity: "Low",
      status: "Waiting Client",
      loggedAt: iso(new Date(now.getTime() - 12 * 60 * 60 * 1000)),
      firstResponseAt: iso(new Date(now.getTime() - 11 * 60 * 60 * 1000)),
      resolvedAt: null,
      slaResponseDue: iso(new Date(now.getTime() - 4 * 60 * 60 * 1000)),
      slaResolveDue: iso(new Date(now.getTime() + 36 * 60 * 60 * 1000)),
      jobId: null,
      assignedTo: "EMP-009",
      assignedName: "Mohit Panchal",
      resolutionNote: "",
      csat: null,
      pausedMs: 14400000,
      history: [
        { timestamp: formatDateTime(new Date(now.getTime() - 12 * 60 * 60 * 1000)), user: "Sunil Verma", action: "Logged Ticket" },
        { timestamp: formatDateTime(new Date(now.getTime() - 6 * 60 * 60 * 1000)), user: "Mohit Panchal", action: "Paused clock: Waiting for client permission during examination" }
      ]
    },
    {
      id: "TKT-1006",
      clientId: "PRT-03",
      clientName: "Sh. Ajay Jain (Commercial & Retail Site)",
      amcId: null,
      channel: "Walk-in",
      issue: "Smart Wi-Fi SD card recording playback error on mobile app",
      category: "Config",
      severity: "Low",
      status: "Waiting Client",
      loggedAt: iso(new Date(now.getTime() - 18 * 60 * 60 * 1000)),
      firstResponseAt: iso(new Date(now.getTime() - 17 * 60 * 60 * 1000)),
      resolvedAt: null,
      slaResponseDue: iso(new Date(now.getTime() - 10 * 60 * 60 * 1000)),
      slaResolveDue: iso(new Date(now.getTime() + 30 * 60 * 60 * 1000)),
      jobId: null,
      assignedTo: "EMP-003",
      assignedName: "Deepak Saini",
      resolutionNote: "",
      csat: null,
      pausedMs: 7200000,
      history: [
        { timestamp: formatDateTime(new Date(now.getTime() - 18 * 60 * 60 * 1000)), user: "Amit Sharma", action: "Logged Walk-in Ticket" }
      ]
    },
    {
      // Breached ticket 1: Critical fault breached by 4 hours!
      id: "TKT-1007",
      clientId: "PRT-07",
      clientName: "Karnal Central Co-op Sugar Mills Complex",
      amcId: "AMC-2026-07",
      channel: "Phone",
      issue: "Main Weighbridge camera offline; sugarcane truck weighing halted",
      category: "Power/SMPS",
      severity: "Critical",
      status: "Open",
      loggedAt: iso(breachedTime),
      firstResponseAt: iso(new Date(breachedTime.getTime() + 30 * 60 * 1000)),
      resolvedAt: null,
      slaResponseDue: iso(new Date(breachedTime.getTime() + 1 * 60 * 60 * 1000)),
      slaResolveDue: iso(breachedResolveDue),
      jobId: null,
      assignedTo: "EMP-002",
      assignedName: "Sunil Verma",
      resolutionNote: "",
      csat: null,
      pausedMs: 0,
      history: [
        { timestamp: formatDateTime(breachedTime), user: "Aditya Sharma", action: "Ticket Logged: CRITICAL WEIGHBRIDGE HALTED" }
      ]
    },
    {
      // Breached ticket 2: High severity breached by 8 hours
      id: "TKT-1008",
      clientId: "PRT-09",
      clientName: "Jattal Road Blanket & Woolen Dyeing Mills",
      amcId: null,
      channel: "Phone",
      issue: "Corrosive chemical steam damaged optical transceiver at shed #4",
      category: "Network",
      severity: "High",
      status: "Assigned",
      loggedAt: iso(new Date(now.getTime() - 26 * 60 * 60 * 1000)),
      firstResponseAt: iso(new Date(now.getTime() - 24 * 60 * 60 * 1000)),
      resolvedAt: null,
      slaResponseDue: iso(new Date(now.getTime() - 24 * 60 * 60 * 1000)),
      slaResolveDue: iso(new Date(now.getTime() - 14 * 60 * 60 * 1000)),
      jobId: null,
      assignedTo: "EMP-001",
      assignedName: "Amit Sharma",
      resolutionNote: "",
      csat: null,
      pausedMs: 0,
      history: [
        { timestamp: formatDateTime(new Date(now.getTime() - 26 * 60 * 60 * 1000)), user: "Sunil Verma", action: "Logged & Flagged SLA Breached" }
      ]
    },
    {
      id: "TKT-1009",
      clientId: "PRT-01",
      clientName: "XEN City Division West, UHBVN, Panipat",
      amcId: "AMC-2026-05",
      channel: "Phone",
      issue: "Cam #5 pole junction water ingress during monsoon downpour",
      category: "Camera",
      severity: "High",
      status: "Resolved",
      loggedAt: "2026-08-04T09:00:00",
      firstResponseAt: "2026-08-04T09:30:00",
      resolvedAt: "2026-08-04T11:30:00",
      slaResponseDue: "2026-08-04T11:00:00",
      slaResolveDue: "2026-08-04T21:00:00",
      jobId: null,
      assignedTo: "EMP-001",
      assignedName: "Amit Sharma",
      resolutionNote: "Replaced pinched BNC connector & waterproof junction seal; tested watertight.",
      csat: 5,
      pausedMs: 0,
      history: [
        { timestamp: "04-Aug-2026 09:00", user: "Sunil Verma", action: "Ticket Logged" },
        { timestamp: "04-Aug-2026 11:30", user: "Amit Sharma", action: "Resolved within 2.5h (CSAT 5/5)" }
      ]
    },
    {
      id: "TKT-1010",
      clientId: "PRT-02",
      clientName: "Market Committee Auction Charges Society",
      amcId: "AMC-2026-02",
      channel: "WhatsApp",
      issue: "NVR password lockout after wrong pin entry by night chowkidar",
      category: "Config",
      severity: "Medium",
      status: "Resolved",
      loggedAt: "2026-08-11T14:00:00",
      firstResponseAt: "2026-08-11T14:20:00",
      resolvedAt: "2026-08-11T17:30:00",
      slaResponseDue: "2026-08-11T18:00:00",
      slaResolveDue: "2026-08-12T14:00:00",
      jobId: null,
      assignedTo: "EMP-002",
      assignedName: "Sunil Verma",
      resolutionNote: "Reset via super password recovery QR; updated security question.",
      csat: 5,
      pausedMs: 0,
      history: [
        { timestamp: "11-Aug-2026 14:00", user: "Sunil Verma", action: "Logged & Resolved via QR Recovery" }
      ]
    },
    {
      id: "TKT-1011",
      clientId: "PRT-06",
      clientName: "Model Town Commercial Shopping Arcade",
      amcId: null,
      channel: "Phone",
      issue: "12V 10A Master Centralized Power Supply tripped circuit breaker",
      category: "Power/SMPS",
      severity: "High",
      status: "Resolved",
      loggedAt: "2026-09-02T10:00:00",
      firstResponseAt: "2026-09-02T10:45:00",
      resolvedAt: "2026-09-02T14:15:00",
      slaResponseDue: "2026-09-02T12:00:00",
      slaResolveDue: "2026-09-02T22:00:00",
      jobId: null,
      assignedTo: "EMP-003",
      assignedName: "Deepak Saini",
      resolutionNote: "Replaced internal cooling fan and glass fuse; calibrated clean 12.2V DC output.",
      csat: 4,
      pausedMs: 0,
      history: [
        { timestamp: "02-Sep-2026 10:00", user: "Sunil Verma", action: "Logged & Fixed by Deepak Saini" }
      ]
    },
    {
      id: "TKT-1012",
      clientId: "PRT-05",
      clientName: "Hafed Agro Cold Storage Plant",
      amcId: null,
      channel: "Portal",
      issue: "Camera #11 frost accumulation on glass lens inside cold room",
      category: "Camera",
      severity: "Medium",
      status: "Closed",
      loggedAt: "2026-09-15T09:00:00",
      firstResponseAt: "2026-09-15T09:40:00",
      resolvedAt: "2026-09-15T15:00:00",
      slaResponseDue: "2026-09-15T13:00:00",
      slaResolveDue: "2026-09-16T09:00:00",
      jobId: null,
      assignedTo: "EMP-001",
      assignedName: "Amit Sharma",
      resolutionNote: "Replaced standard housing with built-in heated optical dome enclosure.",
      csat: 5,
      pausedMs: 0,
      history: [
        { timestamp: "15-Sep-2026 09:00", user: "Sunil Verma", action: "Resolved & Closed" }
      ]
    }
  ];
}

function generateSeedPayoutsAndLedgers() {
  const payouts = [
    {
      id: "PAY-1001",
      employeeId: "EMP-001",
      employeeName: "Amit Sharma",
      jobId: "JOB-2026-0001",
      date: "2026-04-15",
      type: "Job Earning",
      amount: 6000,
      direction: "CR",
      status: "Paid",
      paidAmount: 6000,
      mode: "UPI",
      reference: "UPI/410294827101",
      paidOn: "2026-04-18",
      remarks: "10 Points CP Plus STQC Installation at XEN UHBVN Substation",
      approvedBy: "Aditya Sharma"
    },
    {
      id: "PAY-1002",
      employeeId: "EMP-001",
      employeeName: "Amit Sharma",
      jobId: null,
      date: "2026-04-10",
      type: "Advance",
      amount: 3000,
      direction: "DR",
      status: "Paid",
      paidAmount: 3000,
      mode: "Cash",
      reference: "CASH/VCH-401",
      paidOn: "2026-04-10",
      remarks: "Field fuel and conveyance advance for substation layout survey",
      approvedBy: "Aditya Sharma"
    },
    {
      id: "PAY-1003",
      employeeId: "EMP-002",
      employeeName: "Sunil Verma",
      jobId: "JOB-2026-0002",
      date: "2026-04-28",
      type: "Job Earning",
      amount: 4800,
      direction: "CR",
      status: "Paid",
      paidAmount: 4800,
      mode: "Bank",
      reference: "NEFT/CBIN94820184",
      paidOn: "2026-04-30",
      remarks: "8 Camera Surveillance commissioning at Market Committee Mandi",
      approvedBy: "Aditya Sharma"
    },
    {
      id: "PAY-1004",
      employeeId: "EMP-002",
      employeeName: "Sunil Verma",
      jobId: null,
      date: "2026-04-25",
      type: "Advance",
      amount: 2000,
      direction: "DR",
      status: "Paid",
      paidAmount: 2000,
      mode: "UPI",
      reference: "UPI/411928374022",
      paidOn: "2026-04-25",
      remarks: "Emergency hardware pickup conveyance advance",
      approvedBy: "Aditya Sharma"
    },
    {
      id: "PAY-1005",
      employeeId: "EMP-003",
      employeeName: "Deepak Saini",
      jobId: "JOB-2026-0003",
      date: "2026-05-10",
      type: "Job Earning",
      amount: 1200,
      direction: "CR",
      status: "Paid",
      paidAmount: 1200,
      mode: "UPI",
      reference: "UPI/512938472911",
      paidOn: "2026-05-12",
      remarks: "2 Smart Wi-Fi PTZ installations at Sh. Ajay Jain residence",
      approvedBy: "Aditya Sharma"
    },
    {
      id: "PAY-1006",
      employeeId: "EMP-004",
      employeeName: "Manoj Kumar",
      jobId: "JOB-2026-0004",
      date: "2026-05-22",
      type: "Job Earning",
      amount: 9600,
      direction: "CR",
      status: "Partially Paid",
      paidAmount: 5000,
      mode: "Bank",
      reference: "NEFT/CBIN51928374",
      paidOn: "2026-05-25",
      remarks: "16-Point Industrial Fiber Extension at Panipat Handloom Cluster Hub (₹5,000 disbursed, ₹4,600 balance pending)",
      approvedBy: "Aditya Sharma"
    },
    {
      id: "PAY-1007",
      employeeId: "EMP-004",
      employeeName: "Manoj Kumar",
      jobId: null,
      date: "2026-05-20",
      type: "Advance",
      amount: 4500,
      direction: "DR",
      status: "Paid",
      paidAmount: 4500,
      mode: "Cash",
      reference: "CASH/VCH-512",
      paidOn: "2026-05-20",
      remarks: "Cable pulling helper wage advance",
      approvedBy: "Sunil Verma"
    },
    {
      id: "PAY-1008",
      employeeId: "EMP-001",
      employeeName: "Amit Sharma",
      jobId: "JOB-2026-0005",
      date: "2026-10-20",
      type: "Job Earning",
      amount: 500,
      direction: "CR",
      status: "Pending",
      paidAmount: 0,
      mode: null,
      reference: null,
      paidOn: null,
      remarks: "Substation yard BNC repair under Active AMC",
      approvedBy: null
    },
    {
      id: "PAY-1009",
      employeeId: "EMP-001",
      employeeName: "Amit Sharma",
      jobId: null,
      date: "2026-10-15",
      type: "Bonus",
      amount: 1500,
      direction: "CR",
      status: "Approved",
      paidAmount: 0,
      mode: null,
      reference: null,
      paidOn: null,
      remarks: "Zero-defect cabling bonus for Q3 government utility tenders",
      approvedBy: "Aditya Sharma"
    },
    {
      id: "PAY-1010",
      employeeId: "EMP-003",
      employeeName: "Deepak Saini",
      jobId: null,
      date: "2026-10-18",
      type: "Incentive",
      amount: 800,
      direction: "CR",
      status: "Approved",
      paidAmount: 0,
      mode: null,
      reference: null,
      paidOn: null,
      remarks: "On-time completion of residential Wi-Fi PTZ installations",
      approvedBy: "Aditya Sharma"
    },
    {
      id: "PAY-1011",
      employeeId: "EMP-006",
      employeeName: "Vikram Malik",
      jobId: null,
      date: "2026-10-19",
      type: "Reimbursement",
      amount: 650,
      direction: "CR",
      status: "Approved",
      paidAmount: 0,
      mode: null,
      reference: null,
      paidOn: null,
      remarks: "Emergency conduit PVC saddle and drill bit hardware purchase",
      approvedBy: "Sunil Verma"
    },
    {
      id: "PAY-1012",
      employeeId: "EMP-005",
      employeeName: "Rajesh Dhiman",
      jobId: null,
      date: "2026-10-16",
      type: "Penalty",
      amount: 400,
      direction: "DR",
      status: "Approved",
      paidAmount: 0,
      mode: null,
      reference: null,
      paidOn: null,
      remarks: "Late arrival for scheduled site inspection without prior manager intimation",
      approvedBy: "Aditya Sharma"
    },
    {
      id: "PAY-1013",
      employeeId: "EMP-007",
      employeeName: "Sonu Rawat",
      jobId: "JOB-2026-0004",
      date: "2026-05-22",
      type: "Job Earning",
      amount: 1000,
      direction: "CR",
      status: "Paid",
      paidAmount: 1000,
      mode: "Cash",
      reference: "CASH/VCH-518",
      paidOn: "2026-05-22",
      remarks: "2 Days helper wages for heavy industrial cabling",
      approvedBy: "Sunil Verma"
    },
    {
      id: "PAY-1014",
      employeeId: "EMP-004",
      employeeName: "Manoj Kumar",
      jobId: null,
      date: "2026-06-15",
      type: "Deduction",
      amount: 500,
      direction: "DR",
      status: "On Hold",
      paidAmount: 0,
      mode: null,
      reference: null,
      paidOn: null,
      remarks: "Damaged RJ-45 crimper replacement deduction (under review)",
      approvedBy: null
    }
  ];

  // Auto-generate consistent ledger entries from payouts
  const rawEvents = [];

  payouts.forEach((pay, idx) => {
    const empId = pay.employeeId;

    if (pay.type === 'Job Earning' || pay.type === 'Bonus' || pay.type === 'Incentive' || pay.type === 'Reimbursement' || pay.type === 'Salary') {
      // Credit to employee (company owes employee)
      rawEvents.push({
        id: `LED-${1000 + idx + 1}`,
        employeeId: empId,
        date: pay.date,
        refType: "Payout",
        refId: pay.id,
        narration: `${pay.type}: ${pay.remarks}`,
        debit: 0,
        credit: pay.amount
      });
    }

    if (pay.paidAmount > 0) {
      // Debit to employee (payment disbursed by company)
      rawEvents.push({
        id: `LED-${2000 + idx + 1}`,
        employeeId: empId,
        date: pay.paidOn || pay.date,
        refType: "Payout",
        refId: pay.id,
        narration: `Disbursed via ${pay.mode || 'Cash'} (Ref: ${pay.reference || 'VOUCHER'})`,
        debit: pay.paidAmount,
        credit: 0
      });
    }

    if (pay.type === 'Advance' && pay.paidAmount === 0) {
      // Direct advance debit
      rawEvents.push({
        id: `LED-${3000 + idx + 1}`,
        employeeId: empId,
        date: pay.date,
        refType: "Adjustment",
        refId: pay.id,
        narration: `Advance Drawn: ${pay.remarks}`,
        debit: pay.amount,
        credit: 0
      });
    }

    if (pay.type === 'Penalty' || pay.type === 'Deduction') {
      rawEvents.push({
        id: `LED-${4000 + idx + 1}`,
        employeeId: empId,
        date: pay.date,
        refType: "Adjustment",
        refId: pay.id,
        narration: `${pay.type}: ${pay.remarks}`,
        debit: pay.amount,
        credit: 0
      });
    }
  });

  // Sort rawEvents by date ascending to ensure chronological continuity
  rawEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Compute strictly chronological running balance per employee
  const ledgers = [];
  const empBalances = {};

  rawEvents.forEach(evt => {
    const empId = evt.employeeId;
    if (!empBalances[empId]) empBalances[empId] = 0;
    empBalances[empId] += (evt.credit - evt.debit);
    evt.balanceAfter = empBalances[empId];
    ledgers.push(evt);
  });

  return { payouts, ledgers };
}

// -------------------------------------------------------------
// Database Client Class
// -------------------------------------------------------------
class DatabaseClient {
  constructor() {
    this.listeners = new Map();
    this.state = this._loadInitialState();
    this._runMigrations();
  }

  _loadInitialState() {
    let savedState = null;
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) savedState = JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to parse storage, reinitializing', e);
    }

    if (!savedState) {
      savedState = {
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
        auditLogs: [...INITIAL_AUDIT_LOGS],
        employees: [],
        jobs: [],
        payouts: [],
        settings: {
          accounting: {
            gstEnabled: true,
            defaultGstRate: 18,
            defaultTaxType: 'intra',
            defaultDiscountPct: 0,
            enableRoundOff: true,
            defaultInstallationRatePerCam: 600,
            defaultShippingCharge: 0,
            enableAdvancePayment: true,
            defaultAdvancePct: 50,
            taxExemptDeclaration: "Commercial supply exempt from GST under Composition / Non-taxable turnover schedule.",
            statutoryGstTerms: "Goods & Services Tax (GST) charged @ 18% (9% CGST + 9% SGST) as statutory intra-state supply."
          }
        }
      };
    }

    return savedState;
  }

  _runMigrations() {
    const isMigrated = typeof localStorage !== 'undefined' ? localStorage.getItem(DB_VERSION_KEY) : null;

    // If new field collections do not exist or are empty, seed them
    if (!isMigrated || !this.state.employees || !this.state.employees.length) {
      this.state.employees = generateSeedEmployees();
      this.state.jobs = generateSeedJobs();
      this.state.tickets = generateSeedTickets();
      const { payouts, ledgers } = generateSeedPayoutsAndLedgers();
      this.state.payouts = payouts;
      this.state.ledger = ledgers;

      this.state.settings = {
        slaMatrix: {
          Critical: { responseHrs: 1, resolveHrs: 4 },
          High: { responseHrs: 2, resolveHrs: 12 },
          Medium: { responseHrs: 4, resolveHrs: 24 },
          Low: { responseHrs: 8, resolveHrs: 48 }
        },
        businessHours: {
          start: "09:00",
          end: "19:00",
          workingDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
          pauseOnWaitingClient: true
        },
        payoutRules: {
          onTimeBonusPct: 5,
          slaBreachPenaltyPct: 10,
          advanceAutoRecoveryPct: 20
        },
        checklistTemplates: {
          "New Install": [
            "Route 3+1 RG-59 / Cat-6 heavy-duty cable in PVC conduit",
            "Install weatherproof junction boxes at all fixture points",
            "Mount dome & bullet cameras with surge suppressors",
            "Configure NVR/DVR IP subnet, gateway & DNS",
            "Format surveillance hard drives (RAID / mirror check)",
            "Setup mobile app cloud remote viewing (P2P)",
            "Client handover walk-through & sign-off demo"
          ],
          "Upgrade": [
            "Audit existing cabling and coaxial attenuation",
            "Replace legacy analog cameras with HD / IP STQC units",
            "Upgrade DVR to hybrid 4K NVR with H.265+ compression",
            "Label and dress all cabinet patch cords"
          ],
          "AMC Visit": [
            "Clean all optical camera glass lenses and dome covers",
            "Check 12V SMPS power supply voltage under full IR load",
            "Verify NVR recording continuity for last 30 days",
            "Check UPS battery backup runtime and inverter load"
          ],
          "Complaint Repair": [
            "Inspect site wiring and identify signal interruption",
            "Replace faulty connector / patch cord / power channel",
            "Confirm live feed restored and test camera angle",
            "Obtain client signature on service resolution"
          ],
          "Survey": [
            "Conduct perimeter site walk & take GPS layout markers",
            "Document camera height, lighting and field of view",
            "Calculate cable distance, power requirements & BOQ"
          ],
          "Re-routing": [
            "Dismount cameras safely from construction / renovation zone",
            "Pull cable along new protected routing conduits",
            "Re-mount, terminate and align cameras to desired zone"
          ]
        }
      };

      if (!this.state.settings.accounting) {
        this.state.settings.accounting = {
          gstEnabled: true,
          defaultGstRate: 18,
          defaultTaxType: 'intra',
          defaultDiscountPct: 0,
          enableRoundOff: true,
          defaultInstallationRatePerCam: 600,
          defaultShippingCharge: 0,
          enableAdvancePayment: true,
          defaultAdvancePct: 50,
          taxExemptDeclaration: "Commercial supply exempt from GST under Composition / Non-taxable turnover schedule.",
          statutoryGstTerms: "Goods & Services Tax (GST) charged @ 18% (9% CGST + 9% SGST) as statutory intra-state supply."
        };
      }

      // Reconcile Project Labour Costs (Single Source of Truth: SUM of Job Earning Payouts)
      this._reconcileProjectLabour();

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(DB_VERSION_KEY, 'true');
      }
      this._persist();
    }

    // Stamp existing data with Eliza Infotech companyId
    const stampCompany = (arr, id = 'comp-eliza') => {
      if (Array.isArray(arr)) {
        arr.forEach(it => {
          if (!it.companyId) it.companyId = id;
        });
      }
    };

    stampCompany(this.state.parties);
    stampCompany(this.state.items);
    stampCompany(this.state.inventory);
    stampCompany(this.state.projects);
    stampCompany(this.state.leads);
    stampCompany(this.state.amc);
    stampCompany(this.state.tickets);
    stampCompany(this.state.techLogs);
    stampCompany(this.state.quotations);
    stampCompany(this.state.employees);
    stampCompany(this.state.jobs);
    stampCompany(this.state.payouts);
    stampCompany(this.state.ledger);
    stampCompany(this.state.users);

    // Ensure Aditya Sharma has Super Admin role in employees collection and user accounts
    if (Array.isArray(this.state.employees)) {
      const adityaEmp = this.state.employees.find(e => 
        (e.name && e.name.toLowerCase() === 'aditya sharma') || e.id === 'EMP-012'
      );
      if (adityaEmp) {
        adityaEmp.role = 'Super Admin';
        adityaEmp.roleCode = 'ADMIN';
        if (!adityaEmp.email) adityaEmp.email = 'aditya@elizainfotech.com';
      }
    }
    if (Array.isArray(this.state.users)) {
      const adityaUser = this.state.users.find(u => 
        (u.name && u.name.toLowerCase() === 'aditya sharma') || u.id === 'usr-01'
      );
      if (adityaUser) {
        adityaUser.role = 'Super Admin';
        adityaUser.roleCode = 'ADMIN';
      }
    }
  }

  _reconcileProjectLabour() {
    if (!this.state.projects || !this.state.payouts) return;
    this.state.projects.forEach(prj => {
      // Find all Job Earning payouts linked to this project via their jobs
      const linkedJobIds = this.state.jobs
        .filter(j => j.projectId === prj.id)
        .map(j => j.id);

      const totalLabour = this.state.payouts
        .filter(p => linkedJobIds.includes(p.jobId) && p.type === 'Job Earning')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      if (totalLabour > 0) {
        prj.labourCost = totalLabour;
      }
    });
  }

  _persist() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      }
    } catch (e) {
      console.error('Failed to write storage to localStorage', e);
    }
  }

  // -------------------------------------------------------------
  // Multi-Tenant Company Workspace Scoping
  // -------------------------------------------------------------
  getActiveCompanyId() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('ELIZA_ACTIVE_COMPANY_ID');
      if (saved) return saved;
    }
    return this.state.activeCompanyId || 'comp-eliza';
  }

  setActiveCompanyId(companyId) {
    if (!companyId) return;
    this.state.activeCompanyId = companyId;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ELIZA_ACTIVE_COMPANY_ID', companyId);
    }
    this._persist();
    this._notify('company-changed', { companyId });
  }

  getCompanies() {
    if (!this.state.companies || !this.state.companies.length) {
      this.state.companies = [
        {
          id: 'comp-eliza',
          name: 'ELIZA INFOTECH',
          tagline: 'CCTV Surveillance & Networking Infrastructure',
          gstin: '06HHQPS1919L1ZJ',
          phone: '+91 89300-82398',
          email: 'info@elizainfotech.com',
          ownerId: 'usr-01',
          createdAt: '2026-01-01T00:00:00.000Z'
        }
      ];
      this._persist();
    }
    return this.state.companies;
  }

  createCompany(companyData, ownerUser) {
    const companyId = `comp-${Date.now().toString(36)}`;
    const newCompany = {
      id: companyId,
      name: companyData.name || 'New CCTV Enterprise',
      tagline: companyData.tagline || 'Surveillance & Security Solutions',
      phone: companyData.phone || '',
      email: companyData.email || '',
      gstin: companyData.gstin || '',
      address: companyData.address || '',
      ownerId: ownerUser.id,
      createdAt: new Date().toISOString()
    };

    if (!this.state.companies) {
      this.state.companies = [];
    }
    this.state.companies.push(newCompany);

    // Link owner to this company
    ownerUser.companyId = companyId;
    const empId = `EMP-001`;
    ownerUser.employeeId = empId;

    const ownerEmp = {
      id: empId,
      companyId: companyId,
      userId: ownerUser.id,
      name: ownerUser.name,
      email: ownerUser.email,
      phone: ownerUser.phone || '',
      role: 'Managing Director & CEO',
      roleCode: 'ADMIN',
      payType: 'Monthly',
      defaultRate: 0,
      active: true,
      upiId: '',
      notes: 'Company Founder & Workspace Owner'
    };

    this.state.employees = this.state.employees || [];
    this.state.employees.push(ownerEmp);

    this.state.users = this.state.users || [];
    const existingIdx = this.state.users.findIndex(u => u.id === ownerUser.id);
    if (existingIdx !== -1) {
      this.state.users[existingIdx] = ownerUser;
    } else {
      this.state.users.push(ownerUser);
    }

    this.setActiveCompanyId(companyId);
    this._persist();
    this._notify('companies', { action: 'create', record: newCompany });
    return newCompany;
  }

  // -------------------------------------------------------------
  // Async-Style Reactive Collection API (Tenant Scoped)
  // -------------------------------------------------------------
  collection(name) {
    if (!this.state[name]) {
      this.state[name] = [];
    }

    const self = this;
    return {
      async list(filterFn = null) {
        let items = self.state[name] || [];
        const compId = self.getActiveCompanyId();
        // Strictly scoped to current active company workspace
        items = items.filter(it => (it.companyId || 'comp-eliza') === compId);
        if (typeof filterFn === 'function') {
          items = items.filter(filterFn);
        }
        return JSON.parse(JSON.stringify(items));
      },

      async get(id) {
        const compId = self.getActiveCompanyId();
        const item = (self.state[name] || []).find(x => x.id === id && ((x.companyId || 'comp-eliza') === compId));
        return item ? JSON.parse(JSON.stringify(item)) : null;
      },

      async create(record) {
        const newRecord = { ...record };
        if (!newRecord.companyId) {
          newRecord.companyId = self.getActiveCompanyId();
        }
        if (!newRecord.id) {
          const prefix = name.substring(0, 3).toUpperCase();
          newRecord.id = `${prefix}-${Date.now().toString().slice(-4)}`;
        }
        if (!newRecord.createdAt) {
          newRecord.createdAt = new Date().toISOString();
        }
        self.state[name].unshift(newRecord);
        self._reconcileProjectLabour();
        self._persist();
        self._notify(name, { action: 'create', record: newRecord });
        return JSON.parse(JSON.stringify(newRecord));
      },

      async update(id, updates) {
        const compId = self.getActiveCompanyId();
        const idx = (self.state[name] || []).findIndex(x => x.id === id && (!x.companyId || x.companyId === compId));
        if (idx !== -1) {
          self.state[name][idx] = {
            ...self.state[name][idx],
            ...updates,
            updatedAt: new Date().toISOString()
          };
          self._reconcileProjectLabour();
          self._persist();
          self._notify(name, { action: 'update', id, record: self.state[name][idx] });
          return JSON.parse(JSON.stringify(self.state[name][idx]));
        }
        return null;
      },

      async remove(id) {
        const compId = self.getActiveCompanyId();
        const beforeLen = (self.state[name] || []).length;
        self.state[name] = (self.state[name] || []).filter(x => !(x.id === id && (!x.companyId || x.companyId === compId)));
        if (self.state[name].length !== beforeLen) {
          self._reconcileProjectLabour();
          self._persist();
          self._notify(name, { action: 'remove', id });
          return true;
        }
        return false;
      },

      async delete(id) {
        return this.remove(id);
      },

      subscribe(callback) {
        return self.subscribe(name, callback);
      }
    };
  }

  // Top-Level Shorthands
  async get(collectionName, id) {
    return this.collection(collectionName).get(id);
  }

  async list(collectionName, filterFn = null) {
    return this.collection(collectionName).list(filterFn);
  }

  async create(collectionName, record) {
    return this.collection(collectionName).create(record);
  }

  async update(collectionName, id, updates) {
    return this.collection(collectionName).update(id, updates);
  }

  async remove(collectionName, id) {
    return this.collection(collectionName).remove(id);
  }

  subscribe(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(callback);
    return () => this.listeners.get(eventName).delete(callback);
  }

  _notify(eventName, data) {
    if (this.listeners.has(eventName)) {
      this.listeners.get(eventName).forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in subscriber for ${eventName}:`, e);
        }
      });
    }
    // Global change event
    if (this.listeners.has('change')) {
      this.listeners.get('change').forEach(cb => {
        try { cb({ collection: eventName, ...data }); } catch (e) {}
      });
    }
  }

  // -------------------------------------------------------------
  // Full Backup & Export Functionality (Task 3 / Backup requirement)
  // -------------------------------------------------------------
  exportBackup() {
    return JSON.stringify(this.state, null, 2);
  }

  exportFullBackup() {
    return {
      app: 'ELIZA_ENTERPRISE_ERP',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      activeCompanyId: this.getActiveCompanyId(),
      state: JSON.parse(JSON.stringify(this.state))
    };
  }

  exportFullBackupFile() {
    const backupObj = this.exportFullBackup();
    const jsonStr = JSON.stringify(backupObj, null, 2);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ELIZA_ERP_PRE_RESET_BACKUP', jsonStr);
    }
    if (typeof document !== 'undefined') {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `eliza_cctv_erp_full_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    return backupObj;
  }

  importBackup(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      const payload = parsed.state || parsed;
      if (payload.company && payload.users && payload.items) {
        this.state = payload;
        this._persist();
        this._notify('restore', { timestamp: new Date().toISOString() });
        return { success: true };
      }
      return { success: false, error: "Invalid backup structure" };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // -------------------------------------------------------------
  // Clean-Slate Reset (One-Time Versioned Migration - Task 2)
  // -------------------------------------------------------------
  cleanSlateReset(options = {}) {
    // 1. Mandatory Pre-Reset Backup Capture
    const backup = this.exportFullBackup();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ELIZA_ERP_PRE_RESET_BACKUP', JSON.stringify(backup));
    }

    const currentCompId = this.getActiveCompanyId();

    // 2. KEEP Party masters, RESET accounts/balances to 0
    if (this.state.parties) {
      this.state.parties = this.state.parties.map(p => {
        if (p.companyId && p.companyId !== currentCompId) return p;
        return {
          ...p,
          balance: 0,
          openingBalance: 0,
          transactions: []
        };
      });
    }

    // 3. KEEP Inventory item masters, RESET outstanding dues to 0
    if (this.state.inventory) {
      this.state.inventory = this.state.inventory.map(inv => {
        if (inv.companyId && inv.companyId !== currentCompId) return inv;
        return {
          ...inv,
          outstandingDue: 0
        };
      });
    }

    // 4. RESET TO ZERO / DELETE: all jobs, leads, tickets, payouts, ledger, quotations, projects
    this.state.jobs = (this.state.jobs || []).filter(j => j.companyId && j.companyId !== currentCompId);
    this.state.leads = (this.state.leads || []).filter(l => l.companyId && l.companyId !== currentCompId);
    this.state.tickets = (this.state.tickets || []).filter(t => t.companyId && t.companyId !== currentCompId);
    this.state.payouts = (this.state.payouts || []).filter(p => p.companyId && p.companyId !== currentCompId);
    this.state.ledger = (this.state.ledger || []).filter(l => l.companyId && l.companyId !== currentCompId);
    this.state.projects = (this.state.projects || []).filter(p => p.companyId && p.companyId !== currentCompId);
    this.state.quotations = (this.state.quotations || []).filter(q => q.companyId && q.companyId !== currentCompId);
    this.state.techLogs = (this.state.techLogs || []).filter(tl => tl.companyId && tl.companyId !== currentCompId);
    this.state.amc = (this.state.amc || []).filter(a => a.companyId && a.companyId !== currentCompId);

    // 5. DELETE all employees except Owner record
    const ownerUser = (this.state.users || []).find(u => u.roleCode === 'ADMIN' && (!u.companyId || u.companyId === currentCompId)) || this.state.users[0];
    const ownerEmp = {
      id: 'EMP-001',
      companyId: currentCompId,
      userId: ownerUser?.id || 'usr-01',
      name: ownerUser?.name || 'Aditya Sharma',
      email: ownerUser?.email || 'aditya@elizainfotech.com',
      phone: ownerUser?.phone || '+91 89300-82398',
      role: 'Managing Director & CEO',
      roleCode: 'ADMIN',
      payType: 'Monthly',
      defaultRate: 0,
      active: true,
      upiId: 'aditya.sharma@okaxis',
      notes: 'Company Founder, Managing Director & System Owner'
    };

    this.state.employees = [
      ...(this.state.employees || []).filter(e => e.companyId && e.companyId !== currentCompId),
      ownerEmp
    ];

    if (ownerUser) {
      ownerUser.employeeId = 'EMP-001';
      ownerUser.companyId = currentCompId;
      this.state.users = [
        ...(this.state.users || []).filter(u => u.companyId && u.companyId !== currentCompId),
        ownerUser
      ];
    }

    // 6. Set versioned migration flag
    this.state.settings = this.state.settings || {};
    this.state.settings.resetV1Done = true;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ELIZA_RESET_V1_DONE', 'true');
    }

    this._persist();
    this._notify('reset', { timestamp: new Date().toISOString() });
    return { success: true, backup };
  }

  // -------------------------------------------------------------
  // Clean Payouts and Ledger Accounts
  // -------------------------------------------------------------
  cleanPayoutsAndLedgers(companyId = null) {
    const targetCompId = companyId || this.getActiveCompanyId();

    // 1. Clear payout vouchers for this company
    this.state.payouts = (this.state.payouts || []).filter(p => p.companyId && p.companyId !== targetCompId);

    // 2. Clear employee double-entry ledgers for this company
    this.state.ledger = (this.state.ledger || []).filter(l => l.companyId && l.companyId !== targetCompId);

    // 3. Reset party account balances and transactions for this company
    if (this.state.parties) {
      this.state.parties = this.state.parties.map(p => {
        if (p.companyId && p.companyId !== targetCompId) return p;
        return {
          ...p,
          balance: 0,
          openingBalance: 0,
          transactions: []
        };
      });
    }

    // 4. Reset inventory outstanding supplier dues for this company
    if (this.state.inventory) {
      this.state.inventory = this.state.inventory.map(inv => {
        if (inv.companyId && inv.companyId !== targetCompId) return inv;
        return {
          ...inv,
          outstandingDue: 0
        };
      });
    }

    // 5. Clear tech logs
    this.state.techLogs = (this.state.techLogs || []).filter(tl => tl.companyId && tl.companyId !== targetCompId);

    // 6. Reset project labour cost (which is derived from payouts)
    if (this.state.projects) {
      this.state.projects.forEach(prj => {
        if (!prj.companyId || prj.companyId === targetCompId) {
          prj.labourCost = 0;
        }
      });
    }

    this._persist();
    this._notify('payouts', { action: 'clean', targetCompId });
    this._notify('ledger', { action: 'clean', targetCompId });
    this._notify('change', { timestamp: new Date().toISOString() });
    return { success: true };
  }

  // -------------------------------------------------------------
  // Employee <-> User Account Synchronization (Task 4)
  // -------------------------------------------------------------
  syncEmployeeToUser(employee, credentials = null) {
    if (!employee) return null;
    const compId = employee.companyId || this.getActiveCompanyId();
    let user = (this.state.users || []).find(u => u.employeeId === employee.id || (employee.userId && u.id === employee.userId) || (u.email && u.email.toLowerCase() === (employee.email || '').toLowerCase()));

    if (user) {
      user.employeeId = employee.id;
      user.name = employee.name;
      user.email = employee.email || user.email;
      user.phone = employee.phone || user.phone;
      user.role = employee.role;
      user.status = employee.active ? 'Active' : 'Suspended';
      employee.userId = user.id;
    } else if (credentials && credentials.username) {
      const newUserId = `usr-${Date.now().toString(36)}`;
      user = {
        id: newUserId,
        companyId: compId,
        employeeId: employee.id,
        username: credentials.username.toLowerCase().trim(),
        password: credentials.password || 'password123',
        name: employee.name,
        role: employee.role,
        roleCode: employee.roleCode || 'TECH',
        title: employee.role,
        level: 3,
        email: employee.email || `${credentials.username}@elizainfotech.com`,
        phone: employee.phone || '',
        avatar: employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
        badgeColor: '#10b981',
        status: employee.active ? 'Active' : 'Suspended',
        allowedModules: ['dashboard', 'jobs', 'job-board', 'tickets', 'payouts']
      };
      this.state.users.push(user);
      employee.userId = newUserId;
    }
    this._persist();
    return user;
  }

  syncUserToEmployee(user) {
    if (!user) return null;
    const compId = user.companyId || this.getActiveCompanyId();
    let emp = (this.state.employees || []).find(e => e.userId === user.id || (user.employeeId && e.id === user.employeeId) || (e.email && e.email.toLowerCase() === (user.email || '').toLowerCase()));

    if (emp) {
      emp.userId = user.id;
      emp.name = user.name;
      emp.email = user.email;
      emp.phone = user.phone || emp.phone;
      emp.role = user.role;
      emp.active = user.status === 'Active';
      user.employeeId = emp.id;
    } else {
      const nextEmpNum = (this.state.employees || []).length + 1;
      const newEmpId = `EMP-${String(nextEmpNum).padStart(3, '0')}`;
      emp = {
        id: newEmpId,
        companyId: compId,
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        roleCode: user.roleCode || 'TECH',
        payType: 'Monthly',
        defaultRate: 0,
        active: user.status === 'Active',
        notes: `Auto-linked from User Account ${user.username}`
      };
      this.state.employees.push(emp);
      user.employeeId = newEmpId;
    }
    this._persist();
    return emp;
  }

  deactivateEmployee(empId) {
    const emp = (this.state.employees || []).find(e => e.id === empId);
    if (emp) {
      emp.active = false;
      const user = (this.state.users || []).find(u => u.employeeId === emp.id || u.id === emp.userId);
      if (user) {
        user.status = 'Suspended';
      }
      this._persist();
      this._notify('employees', { action: 'update', id: empId, record: emp });
      return true;
    }
    return false;
  }

  deleteEmployee(empId) {
    const emp = (this.state.employees || []).find(e => e.id === empId);
    if (emp) {
      const user = (this.state.users || []).find(u => u.employeeId === emp.id || u.id === emp.userId);
      if (user) {
        user.employeeId = null;
        user.status = 'Suspended';
      }
      this.state.employees = this.state.employees.filter(e => e.id !== empId);
      this._persist();
      this._notify('employees', { action: 'remove', id: empId });
      return true;
    }
    return false;
  }

  getEmployeeAccountReconciliation() {
    const compId = this.getActiveCompanyId();
    const employees = (this.state.employees || []).filter(e => !e.companyId || e.companyId === compId);
    const users = (this.state.users || []).filter(u => !u.companyId || u.companyId === compId);

    const accountsWithoutEmployees = users.filter(u => !u.employeeId && !employees.some(e => e.userId === u.id || (e.email && e.email.toLowerCase() === (u.email || '').toLowerCase())));
    const employeesWithoutAccounts = employees.filter(e => !e.userId && !users.some(u => u.employeeId === e.id || (u.email && u.email.toLowerCase() === (e.email || '').toLowerCase())));
    const linkedPairs = employees.filter(e => e.userId || users.some(u => u.employeeId === e.id));

    return {
      accountsWithoutEmployees,
      employeesWithoutAccounts,
      linkedPairs,
      totalEmployees: employees.length,
      totalUsers: users.length,
      isFullyReconciled: accountsWithoutEmployees.length === 0 && employeesWithoutAccounts.length === 0
    };
  }

  executeReconciliation() {
    const compId = this.getActiveCompanyId();
    const employees = (this.state.employees || []).filter(e => !e.companyId || e.companyId === compId);
    const users = (this.state.users || []).filter(u => !u.companyId || u.companyId === compId);

    // 1. Link matching emails or names
    users.forEach(u => {
      const match = employees.find(e => (e.email && u.email && e.email.toLowerCase() === u.email.toLowerCase()) || e.name.toLowerCase() === u.name.toLowerCase());
      if (match) {
        u.employeeId = match.id;
        match.userId = u.id;
        match.companyId = compId;
        u.companyId = compId;
        if (u.roleCode === 'ADMIN' || u.role === 'Super Admin') {
          match.role = 'Super Admin';
          match.roleCode = 'ADMIN';
        }
      }
    });

    // 2. Create missing employees for remaining users
    users.filter(u => !u.employeeId).forEach(u => {
      this.syncUserToEmployee(u);
    });

    this._persist();
    return this.getEmployeeAccountReconciliation();
  }

  resetFactory() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(DB_VERSION_KEY);
      localStorage.removeItem('ELIZA_RESET_V1_DONE');
      localStorage.removeItem('ELIZA_ACTIVE_COMPANY_ID');
    }
    this.state = this._loadInitialState();
    this.state.activeCompanyId = 'comp-eliza';
    this._runMigrations();
    this._notify('reset', { timestamp: new Date().toISOString() });
  }

  resetStorage() {
    this.resetFactory();
  }
}

export const db = new DatabaseClient();
