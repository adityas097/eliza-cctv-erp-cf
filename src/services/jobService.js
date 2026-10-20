// Field Job Lifecycle, Validation, Auto-Posting & Document Generator Service
import { db } from '../store/db.js';
import { ledgerService } from './ledgerService.js';

class JobService {
  /**
   * Generates next auto-increment Job ID (e.g. JOB-2026-0016).
   */
  async getNextJobId() {
    const jobs = await db.collection('jobs').list();
    const year = new Date().getFullYear();
    const count = jobs.length + 1;
    return `JOB-${year}-${String(count).padStart(4, '0')}`;
  }

  /**
   * Checks technician schedule availability and flags conflicts.
   */
  async checkAssigneeAvailability(employeeId, scheduledStart, scheduledEnd, excludeJobId = null) {
    if (!scheduledStart || !scheduledEnd) return { available: true, conflicts: [] };

    const start = new Date(scheduledStart);
    const end = new Date(scheduledEnd);
    const dayStart = new Date(start);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(start);
    dayEnd.setHours(23, 59, 59, 999);

    const allJobs = await db.collection('jobs').list(j => {
      if (j.id === excludeJobId) return false;
      if (j.status === 'Completed' || j.status === 'Verified' || j.status === 'Cancelled') return false;
      return (j.assignees || []).some(a => a.employeeId === employeeId);
    });

    const dayJobs = allJobs.filter(j => {
      if (!j.scheduledStart) return false;
      const jStart = new Date(j.scheduledStart);
      return jStart >= dayStart && jStart <= dayEnd;
    });

    const directConflicts = dayJobs.filter(j => {
      const jStart = new Date(j.scheduledStart);
      const jEnd = new Date(j.scheduledEnd || jStart.getTime() + 4 * 60 * 60 * 1000);
      return (start < jEnd && end > jStart);
    });

    return {
      available: directConflicts.length === 0,
      dayJobCount: dayJobs.length,
      conflicts: directConflicts
    };
  }

  /**
   * Checks inventory availability for job materials.
   */
  async checkMaterialStock(materials = []) {
    const inventory = await db.collection('inventory').list();
    const shortages = [];

    materials.forEach(mat => {
      const item = inventory.find(i => i.id === mat.skuId || i.sku === mat.skuId || i.name === mat.skuName);
      if (item) {
        const available = Number(item.currentStock) || 0;
        const required = Number(mat.qty) || 0;
        if (required > available) {
          shortages.push({
            skuId: mat.skuId,
            skuName: mat.skuName || item.name,
            required,
            available,
            deficit: required - available
          });
        }
      }
    });

    return {
      hasShortages: shortages.length > 0,
      shortages
    };
  }

  /**
   * Validates status transition against business rules.
   */
  validateStatusTransition(job, newStatus) {
    if (newStatus === 'In Progress') {
      if (!job.assignees || job.assignees.length === 0) {
        return { valid: false, error: "Cannot start job: At least one assigned technician is required to move to 'In Progress'." };
      }
    }

    if (newStatus === 'Verified') {
      if (job.status !== 'Completed') {
        return { valid: false, error: "Cannot verify job directly: Job must be in 'Completed' state before Super Admin / Supervisor verification." };
      }
    }

    return { valid: true };
  }

  /**
   * Transitions job status and triggers automatic verification cascading.
   */
  async updateJobStatus(jobId, newStatus, currentUser = 'Aditya Sharma', overrideReason = '') {
    const job = await db.collection('jobs').get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    const validation = this.validateStatusTransition(job, newStatus);
    if (!validation.valid && !overrideReason) {
      throw new Error(validation.error);
    }

    const oldStatus = job.status;
    const nowIso = new Date().toISOString();
    const nowPretty = nowIso.replace('T', ' ').slice(0, 19);

    const updates = {
      status: newStatus,
      updatedAt: nowIso
    };

    if (newStatus === 'In Progress' && !job.actualStart) {
      updates.actualStart = nowIso;
    }

    if (newStatus === 'Completed' && !job.actualEnd) {
      updates.actualEnd = nowIso;
    }

    // Append activity
    const activity = [...(job.activity || [])];
    activity.push({
      timestamp: nowPretty,
      user: currentUser,
      action: `Status transitioned from '${oldStatus}' to '${newStatus}'${overrideReason ? ` (Override: ${overrideReason})` : ''}`
    });
    updates.activity = activity;

    const updatedJob = await db.collection('jobs').update(jobId, updates);

    // =========================================================
    // CASCADING EFFECTS ON "VERIFIED"
    // =========================================================
    if (newStatus === 'Verified') {
      // 1. Auto-create Job Earning payouts and post Ledger entries for all assignees
      if (job.assignees && job.assignees.length) {
        for (const assignee of job.assignees) {
          await ledgerService.postJobEarning(updatedJob, assignee);
        }
      }

      // 2. Auto-deduct materials from inventory
      if (job.materials && job.materials.length) {
        const inventory = await db.collection('inventory').list();
        for (const mat of job.materials) {
          const invItem = inventory.find(i => i.id === mat.skuId || i.sku === mat.skuId || i.name === mat.skuName);
          if (invItem) {
            const currentStock = Number(invItem.currentStock) || 0;
            const deductQty = (Number(mat.qty) || 0) - (Number(mat.returned) || 0);
            if (deductQty > 0) {
              await db.collection('inventory').update(invItem.id, {
                currentStock: Math.max(0, currentStock - deductQty)
              });
            }
          }
        }
      }

      // 3. Auto-resolve linked Ticket if present
      if (job.ticketId) {
        const ticket = await db.collection('tickets').get(job.ticketId);
        if (ticket && ticket.status !== 'Resolved' && ticket.status !== 'Closed') {
          const tktHistory = [...(ticket.history || [])];
          tktHistory.push({
            timestamp: nowPretty,
            user: currentUser,
            action: `Ticket Auto-Resolved upon verification of linked Job ${job.id}`
          });

          await db.collection('tickets').update(ticket.id, {
            status: 'Resolved',
            resolvedAt: nowIso,
            resolutionNote: `Resolved via Field Work Order ${job.id}: ${job.title}. Checklist completed and verified.`,
            history: tktHistory
          });
        }
      }

      // 4. Update linked Project Labour & Materials Cost
      if (job.projectId) {
        db._reconcileProjectLabour();
      }
    }

    // If moved to In Progress and has a ticket, sync ticket status
    if (newStatus === 'In Progress' && job.ticketId) {
      const ticket = await db.collection('tickets').get(job.ticketId);
      if (ticket && ticket.status !== 'In Progress') {
        const tktHistory = [...(ticket.history || [])];
        tktHistory.push({
          timestamp: nowPretty,
          user: currentUser,
          action: `Ticket marked In Progress via Job ${job.id}`
        });
        await db.collection('tickets').update(ticket.id, {
          status: 'In Progress',
          history: tktHistory
        });
      }
    }

    return updatedJob;
  }

  /**
   * Creates a new Job from a Service Ticket.
   */
  async createJobFromTicket(ticket, currentUser = 'Sunil Verma') {
    const nextId = await this.getNextJobId();
    const scheduledStart = new Date().toISOString();
    const scheduledEnd = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

    const newJob = {
      id: nextId,
      title: `Ticket Repair: ${ticket.issue}`,
      type: "Complaint Repair",
      clientId: ticket.clientId || "PRT-01",
      clientName: ticket.clientName || "Customer",
      siteAddress: ticket.siteAddress || "Client Site",
      mapLink: null,
      projectId: null,
      ticketId: ticket.id,
      amcId: ticket.amcId || null,
      priority: ticket.severity || "Medium",
      status: "Scheduled",
      assignees: ticket.assignedTo ? [
        { employeeId: ticket.assignedTo, role: "Lead", rate: 500, payBasis: "PerJob", units: 1 }
      ] : [],
      scheduledStart,
      scheduledEnd,
      actualStart: null,
      actualEnd: null,
      camsCount: 1,
      pointsCount: 1,
      checklist: (db.state.settings?.checklistTemplates?.["Complaint Repair"] || []).map(text => ({ text, done: false })),
      materials: [],
      notes: `Spawned automatically from Service Ticket ${ticket.id} (${ticket.channel}). Category: ${ticket.category}`,
      attachments: [],
      customerSignature: null,
      createdBy: currentUser,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activity: [
        {
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          user: currentUser,
          action: `Created Job from Service Ticket ${ticket.id}`
        }
      ]
    };

    const created = await db.collection('jobs').create(newJob);

    // Update ticket to Assigned & link Job ID
    const tktHistory = [...(ticket.history || [])];
    tktHistory.push({
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: currentUser,
      action: `Spawned Work Order ${created.id} & moved to Assigned`
    });

    await db.collection('tickets').update(ticket.id, {
      status: "Assigned",
      jobId: created.id,
      history: tktHistory
    });

    return created;
  }

  /**
   * Deletes a Job Sheet, cleanly unlinking any attached Service Ticket
   * and reconciling linked project labour costs.
   */
  async deleteJob(jobId, currentUser = 'Super Admin') {
    const job = await db.collection('jobs').get(jobId);
    if (!job) return false;

    // If linked to a ticket, detach or reset ticket status if still pending
    if (job.ticketId) {
      try {
        const ticket = await db.collection('tickets').get(job.ticketId);
        if (ticket && ticket.jobId === jobId) {
          const nowPretty = new Date().toISOString().replace('T', ' ').slice(0, 19);
          const tktHistory = [...(ticket.history || [])];
          tktHistory.push({
            timestamp: nowPretty,
            user: currentUser,
            action: `Detached from deleted Job Sheet ${jobId}`
          });
          const updateData = { jobId: null, history: tktHistory };
          if (ticket.status === 'Assigned') {
            updateData.status = 'Open';
          }
          await db.collection('tickets').update(ticket.id, updateData);
        }
      } catch (e) {
        console.warn('Could not detach ticket from deleted job:', e);
      }
    }

    // Delete job from collection
    await db.collection('jobs').delete(jobId);

    // Reconcile project labour if linked to a project
    if (job.projectId && typeof db._reconcileProjectLabour === 'function') {
      db._reconcileProjectLabour();
    }

    return true;
  }

  /**
   * Generates Printable A4 Job Card / Work Order HTML.
   */
  generatePrintableJobCard(job) {
    const company = db.state.company;
    const assigneesText = (job.assignees || []).map(a => `${a.employeeName || a.employeeId} (${a.role})`).join(', ') || 'Unassigned';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Work Order - ${job.id}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #1e293b; line-height: 1.4; font-size: 13px; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; }
          .company-name { font-size: 20px; font-weight: 800; color: #1e3a8a; }
          .doc-title { font-size: 18px; font-weight: 700; text-align: right; color: #0f172a; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 14px; }
          .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background: #f8fafc; }
          .box-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
          th { background: #f1f5f9; font-weight: 600; }
          .signatures { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
          .sig-box { border-top: 1px dashed #64748b; padding-top: 6px; text-align: center; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company-name">${company.name}</div>
            <div style="font-size: 11px; color: #64748b;">${company.tagline}</div>
            <div style="font-size: 11px;">GSTIN: ${company.gstin} | Phone: ${company.phone}</div>
          </div>
          <div>
            <div class="doc-title">FIELD WORK ORDER</div>
            <div style="font-size: 13px; font-weight: 700; color: #2563eb;">${job.id}</div>
            <div style="font-size: 11px; color: #64748b;">Type: ${job.type} | Priority: ${job.priority}</div>
          </div>
        </div>

        <div class="grid-2">
          <div class="box">
            <div class="box-title">Client & Site Location</div>
            <div style="font-weight: 700;">${job.clientName}</div>
            <div>${job.siteAddress}</div>
            ${job.mapLink ? `<div style="font-size: 11px; color: #2563eb; margin-top: 4px;">Maps Link: ${job.mapLink}</div>` : ''}
          </div>
          <div class="box">
            <div class="box-title">Job Schedule & Team Dispatch</div>
            <div><strong>Status:</strong> ${job.status}</div>
            <div><strong>Lead Technicians:</strong> ${assigneesText}</div>
            <div><strong>Points / Cameras:</strong> ${job.pointsCount || 0} Pts / ${job.camsCount || 0} Cams</div>
            <div><strong>Scheduled Window:</strong> ${job.scheduledStart ? job.scheduledStart.replace('T', ' ') : 'TBD'}</div>
          </div>
        </div>

        <div class="box" style="margin-bottom: 14px;">
          <div class="box-title">Scope of Work / Description</div>
          <div style="font-weight: 600;">${job.title}</div>
          <div style="font-size: 12px; margin-top: 4px;">${job.notes || 'No specific notes.'}</div>
        </div>

        <div style="margin-bottom: 14px;">
          <div style="font-weight: 700; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">Standard Field Quality Checklist</div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">Status</th>
                <th>Standard Operating Procedure / Check Item</th>
              </tr>
            </thead>
            <tbody>
              ${(job.checklist || []).map(ch => `
                <tr>
                  <td style="text-align: center;">${ch.done ? '✓' : '□'}</td>
                  <td>${ch.text}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${(job.materials && job.materials.length) ? `
          <div style="margin-bottom: 14px;">
            <div style="font-weight: 700; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">Authorized Material / Hardware Dispatched</div>
            <table>
              <thead>
                <tr>
                  <th>SKU / Hardware Description</th>
                  <th style="width: 80px; text-align: center;">Dispatched</th>
                  <th style="width: 80px; text-align: center;">Returned</th>
                </tr>
              </thead>
              <tbody>
                ${job.materials.map(m => `
                  <tr>
                    <td>${m.skuName || m.skuId}</td>
                    <td style="text-align: center;">${m.qty}</td>
                    <td style="text-align: center;">${m.returned || 0}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div class="signatures">
          <div class="sig-box">
            Lead Field Engineer Signature<br>
            <strong>${assigneesText}</strong>
          </div>
          <div class="sig-box">
            Customer / Site Authority Acknowledgment & Stamp<br>
            <strong>${job.clientName}</strong>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export const jobService = new JobService();
