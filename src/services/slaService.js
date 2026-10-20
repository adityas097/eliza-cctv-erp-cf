// SLA Matrix, Business Hours Calculator & Ticket Compliance Engine
import { db } from '../store/db.js';

class SlaService {
  /**
   * Retrieves active SLA matrix config.
   */
  getSlaMatrix() {
    return db.state.settings?.slaMatrix || {
      Critical: { responseHrs: 1, resolveHrs: 4 },
      High: { responseHrs: 2, resolveHrs: 12 },
      Medium: { responseHrs: 4, resolveHrs: 24 },
      Low: { responseHrs: 8, resolveHrs: 48 }
    };
  }

  /**
   * Retrieves business hours configuration.
   */
  getBusinessHoursConfig() {
    return db.state.settings?.businessHours || {
      start: "09:00",
      end: "19:00",
      workingDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
      pauseOnWaitingClient: true
    };
  }

  /**
   * Suggests smart ticket severity based on issue text and category.
   */
  suggestSeverity(issueText = '', category = '') {
    const text = (issueText + ' ' + category).toLowerCase();

    // Critical triggers: loss of live feed, buzzer alarm, power trip, storage drive dead, security halt
    const criticalPatterns = [
      'no video', 'black screen', 'buzzer', 'beeping', 'trip', 'tripped', 'dead',
      'smoke', 'smell', 'hdd fail', 'corrupt', 'offline', 'weighbridge', 'all cameras down',
      'substation', 'fire', 'theft', 'break-in'
    ];

    for (const pat of criticalPatterns) {
      if (text.includes(pat)) return 'Critical';
    }

    // High triggers: remote app down, power supply issue, night vision dead
    const highPatterns = ['night vision', 'ir led', 'mobile app', 'remote', 'recording', 'smps', 'poe', 'water'];
    for (const pat of highPatterns) {
      if (text.includes(pat)) return 'High';
    }

    // Medium triggers: angle shift, blurry, jittery, cable loose
    const mediumPatterns = ['blurry', 'focus', 'angle', 'loose', 'jumping', 'glitch', 'password', 'login'];
    for (const pat of mediumPatterns) {
      if (text.includes(pat)) return 'Medium';
    }

    return 'Low';
  }

  /**
   * Calculates SLA response and resolve due dates from a start time.
   * Takes business hours into account if enabled.
   */
  calculateDueDates(startDateInput, severity = 'Medium') {
    const start = new Date(startDateInput || new Date());
    const matrix = this.getSlaMatrix();
    const config = matrix[severity] || matrix['Medium'];
    const bizHours = this.getBusinessHoursConfig();

    const responseDue = this._addBusinessHours(start, config.responseHrs, bizHours);
    const resolveDue = this._addBusinessHours(start, config.resolveHrs, bizHours);

    return {
      slaResponseDue: responseDue.toISOString(),
      slaResolveDue: resolveDue.toISOString()
    };
  }

  /**
   * Alias for calculateDueDates with (severity, startDateInput) signature.
   */
  calculateDueTimes(severity = 'Medium', startDateInput = new Date()) {
    return this.calculateDueDates(startDateInput, severity);
  }

  /**
   * Adds operational hours taking working schedule into account.
   */
  _addBusinessHours(startDate, hoursToAdd, bizHours) {
    let current = new Date(startDate);
    let remainingMinutes = hoursToAdd * 60;

    const [startH, startM] = (bizHours.start || "09:00").split(':').map(Number);
    const [endH, endM] = (bizHours.end || "19:00").split(':').map(Number);
    const workingDays = bizHours.workingDays || [1, 2, 3, 4, 5, 6];

    while (remainingMinutes > 0) {
      const dayOfWeek = current.getDay();
      const isWorkingDay = workingDays.includes(dayOfWeek);

      const dayStart = new Date(current);
      dayStart.setHours(startH, startM, 0, 0);

      const dayEnd = new Date(current);
      dayEnd.setHours(endH, endM, 0, 0);

      if (!isWorkingDay || current >= dayEnd) {
        // Roll over to next day start
        current.setDate(current.getDate() + 1);
        current.setHours(startH, startM, 0, 0);
        continue;
      }

      if (current < dayStart) {
        current = new Date(dayStart);
      }

      const availableMinutesToday = (dayEnd - current) / (1000 * 60);

      if (remainingMinutes <= availableMinutesToday) {
        current = new Date(current.getTime() + remainingMinutes * 60 * 1000);
        remainingMinutes = 0;
      } else {
        remainingMinutes -= availableMinutesToday;
        current.setDate(current.getDate() + 1);
        current.setHours(startH, startM, 0, 0);
      }
    }

    return current;
  }

  /**
   * Live countdown and status timer calculator for a ticket.
   */
  computeTicketSlaStatus(ticket) {
    const now = new Date();
    const isWaitingClient = ticket.status === 'Waiting Client';
    const isResolved = ticket.status === 'Resolved' || ticket.status === 'Closed';

    const loggedAt = new Date(ticket.loggedAt);
    const resolveDue = new Date(ticket.slaResolveDue);
    const totalAllocatedMs = resolveDue - loggedAt;

    let resolveLeftMs = 0;
    if (isResolved) {
      resolveLeftMs = ticket.resolvedAt ? (resolveDue - new Date(ticket.resolvedAt)) : 0;
    } else {
      resolveLeftMs = resolveDue - now + (ticket.pausedMs || 0);
    }

    const pctRemaining = totalAllocatedMs > 0 ? (resolveLeftMs / totalAllocatedMs) * 100 : 0;
    const isBreached = resolveLeftMs < 0;

    let badgeClass = 'sla-green';
    let statusText = 'Normal';

    if (isResolved) {
      badgeClass = isBreached ? 'sla-breached' : 'sla-resolved';
      statusText = isBreached ? 'Resolved (Breached)' : 'Resolved (Within SLA)';
    } else if (isWaitingClient) {
      badgeClass = 'sla-paused';
      statusText = 'Clock Paused';
    } else if (isBreached) {
      badgeClass = 'sla-breached sla-pulsing';
      statusText = 'SLA BREACHED';
    } else if (pctRemaining <= 15) {
      badgeClass = 'sla-red';
      statusText = 'Critical Risk';
    } else if (pctRemaining <= 50) {
      badgeClass = 'sla-amber';
      statusText = 'Attention Needed';
    }

    // Format human readable countdown
    const absLeft = Math.abs(resolveLeftMs);
    const hrs = Math.floor(absLeft / (1000 * 60 * 60));
    const mins = Math.floor((absLeft % (1000 * 60 * 60)) / (1000 * 60));
    const timeFormatted = isBreached
      ? `-${hrs}h ${mins}m overdue`
      : `${hrs}h ${mins}m left`;

    return {
      resolveLeftMs,
      pctRemaining: Math.max(0, Math.min(100, pctRemaining)),
      isBreached,
      isResolved,
      isWaitingClient,
      badgeClass,
      statusText,
      timeFormatted
    };
  }

  /**
   * Computes comprehensive SLA compliance metrics and report dataset.
   */
  async getSlaReport() {
    const tickets = await db.collection('tickets').list();
    const totalTickets = tickets.length;
    const resolvedTickets = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed');

    let withinSlaCount = 0;
    let breachedCount = 0;

    const breachesByTech = {};
    const breachesByCategory = {};
    const clientTickets = {};

    tickets.forEach(t => {
      const status = this.computeTicketSlaStatus(t);
      if (status.isBreached) {
        breachedCount++;
        const tech = t.assignedName || 'Unassigned';
        breachesByTech[tech] = (breachesByTech[tech] || 0) + 1;

        const cat = t.category || 'Other';
        breachesByCategory[cat] = (breachesByCategory[cat] || 0) + 1;
      } else {
        withinSlaCount++;
      }

      // Track repeat-fault clients
      const client = t.clientName || 'General';
      clientTickets[client] = (clientTickets[client] || 0) + 1;
    });

    const compliancePct = totalTickets > 0 ? Math.round((withinSlaCount / totalTickets) * 100) : 100;

    // Average resolution time
    let totalResolveHrs = 0;
    resolvedTickets.forEach(t => {
      const start = new Date(t.loggedAt);
      const end = new Date(t.resolvedAt || t.updatedAt);
      totalResolveHrs += (end - start) / (1000 * 60 * 60);
    });
    const avgResolutionHrs = resolvedTickets.length > 0
      ? (totalResolveHrs / resolvedTickets.length).toFixed(1)
      : '0.0';

    // Repeat fault clients (more than 1 ticket)
    const repeatClients = Object.entries(clientTickets)
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([client, count]) => ({ client, count }));

    return {
      totalTickets,
      resolvedCount: resolvedTickets.length,
      withinSlaCount,
      breachedCount,
      compliancePct,
      avgResolutionHrs,
      breachesByTech,
      breachesByCategory,
      repeatClients
    };
  }
}

export const slaService = new SlaService();
