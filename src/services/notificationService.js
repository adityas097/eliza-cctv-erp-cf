// Real-Time Notification & Operational Alert Service
import { db } from '../store/db.js';
import { slaService } from './slaService.js';

class NotificationService {
  constructor() {
    this.readNotificationIds = new Set(JSON.parse(localStorage.getItem('ELIZA_READ_NOTIFS') || '[]'));
  }

  /**
   * Evaluates active operational alerts across all Field Operations domains.
   */
  async getActiveAlerts() {
    const alerts = [];
    const now = new Date();

    // 1. SLA At-Risk / Breached Tickets
    const tickets = await db.collection('tickets').list(t => t.status !== 'Resolved' && t.status !== 'Closed');
    tickets.forEach(t => {
      const sla = slaService.computeTicketSlaStatus(t);
      if (sla.isBreached) {
        alerts.push({
          id: `NOTIF-SLA-BREACH-${t.id}`,
          severity: 'critical',
          category: 'SLA Breach',
          title: `SLA Breached: ${t.id}`,
          message: `${t.clientName} - ${t.issue} (${sla.timeFormatted})`,
          targetModule: 'tickets',
          targetId: t.id,
          timestamp: t.loggedAt
        });
      } else if (sla.pctRemaining <= 15) {
        alerts.push({
          id: `NOTIF-SLA-RISK-${t.id}`,
          severity: 'warning',
          category: 'SLA At Risk',
          title: `Critical SLA Risk: ${t.id}`,
          message: `${t.clientName} has less than 15% SLA time remaining (${sla.timeFormatted})`,
          targetModule: 'tickets',
          targetId: t.id,
          timestamp: t.loggedAt
        });
      }
    });

    // 2. Unassigned Jobs > 2 hours old
    const backlogJobs = await db.collection('jobs').list(j => j.status === 'Backlog' || (j.status === 'Scheduled' && (!j.assignees || !j.assignees.length)));
    backlogJobs.forEach(j => {
      const created = new Date(j.createdAt || now);
      const hoursAgo = (now - created) / (1000 * 60 * 60);
      if (hoursAgo >= 2) {
        alerts.push({
          id: `NOTIF-JOB-UNASSIGNED-${j.id}`,
          severity: 'warning',
          category: 'Job Unassigned',
          title: `Job Awaiting Technician: ${j.id}`,
          message: `${j.clientName} - ${j.title} created ${Math.floor(hoursAgo)}h ago without an assigned technician`,
          targetModule: 'jobs',
          targetId: j.id,
          timestamp: j.createdAt
        });
      }
    });

    // 3. Overdue Jobs
    const activeJobs = await db.collection('jobs').list(j => j.status === 'Scheduled' || j.status === 'In Progress');
    activeJobs.forEach(j => {
      if (j.scheduledEnd && new Date(j.scheduledEnd) < now) {
        alerts.push({
          id: `NOTIF-JOB-OVERDUE-${j.id}`,
          severity: 'danger',
          category: 'Job Overdue',
          title: `Job Overdue: ${j.id}`,
          message: `${j.clientName} - Scheduled completion window passed`,
          targetModule: 'jobs',
          targetId: j.id,
          timestamp: j.scheduledEnd
        });
      }
    });

    // 4. Payouts Pending Approval > 7 days
    const pendingPayouts = await db.collection('payouts').list(p => p.status === 'Pending');
    pendingPayouts.forEach(p => {
      const pDate = new Date(p.date || now);
      const daysAgo = Math.floor((now - pDate) / (1000 * 60 * 60 * 24));
      if (daysAgo >= 7) {
        alerts.push({
          id: `NOTIF-PAYOUT-PENDING-${p.id}`,
          severity: 'warning',
          category: 'Payout Pending',
          title: `Payout Pending Approval: ${p.id}`,
          message: `₹${p.amount.toLocaleString('en-IN')} for ${p.employeeName} pending for ${daysAgo} days`,
          targetModule: 'payouts',
          targetId: p.id,
          timestamp: p.date
        });
      }
    });

    // 5. Urgent AMC Renewals (within 30 days)
    const amcs = await db.collection('amc').list(a => a.status === 'Active');
    amcs.forEach(a => {
      const end = new Date(a.endDate);
      const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 30 && daysLeft > 0) {
        alerts.push({
          id: `NOTIF-AMC-RENEWAL-${a.id}`,
          severity: daysLeft <= 7 ? 'danger' : 'warning',
          category: 'AMC Expiring',
          title: `AMC Expiring in ${daysLeft} Days: ${a.id}`,
          message: `${a.client} (${a.type}) contract ends ${a.endDate}`,
          targetModule: 'tickets',
          targetId: a.id,
          timestamp: a.endDate
        });
      }
    });

    // Filter unread
    return alerts.map(a => ({
      ...a,
      isRead: this.readNotificationIds.has(a.id)
    }));
  }

  getUnreadCount(alerts) {
    return alerts.filter(a => !a.isRead).length;
  }

  markAsRead(id) {
    this.readNotificationIds.add(id);
    localStorage.setItem('ELIZA_READ_NOTIFS', JSON.stringify([...this.readNotificationIds]));
  }

  clearAll(alerts) {
    alerts.forEach(a => this.readNotificationIds.add(a.id));
    localStorage.setItem('ELIZA_READ_NOTIFS', JSON.stringify([...this.readNotificationIds]));
  }
}

export const notificationService = new NotificationService();
