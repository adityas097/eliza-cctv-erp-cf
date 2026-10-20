// Data Importer & Cloud Migration Engine (Idempotent LocalStorage -> Cloud Postgres)
import { db } from '../store/db.js';
import { supabase, isSupabaseConfigured } from './supabase.js';

export class DataImporter {
  /**
   * Performs dry-run analysis of existing local storage data
   */
  static async dryRun(sourceState = null, targetOrgId = 'comp-eliza') {
    const state = sourceState || db.state || {};
    
    const stats = {
      targetOrgId,
      partiesCount: (state.parties || []).length,
      itemsCount: (state.items || []).length,
      employeesCount: (state.employees || []).length,
      jobsCount: (state.jobs || []).length,
      ticketsCount: (state.tickets || []).length,
      payoutsCount: (state.payouts || []).length,
      ledgerCount: (state.ledger || []).length,
      quotationsCount: (state.quotations || []).length,
      usersCount: (state.users || []).length,
      timestamp: new Date().toISOString(),
      validationWarnings: []
    };

    // Check data integrity
    (state.parties || []).forEach(p => {
      if (!p.name) stats.validationWarnings.push(`Party ${p.id} missing name`);
    });

    (state.jobs || []).forEach(j => {
      if (!j.title) stats.validationWarnings.push(`Job ${j.id} missing title`);
    });

    const isReady = stats.partiesCount > 0 && stats.itemsCount > 0;
    return {
      success: true,
      mode: 'DRY_RUN',
      isReady,
      stats,
      summary: `Analyzed ${stats.partiesCount} parties, ${stats.itemsCount} SKUs, ${stats.employeesCount} staff, ${stats.jobsCount} jobs, ${stats.ticketsCount} tickets, and ${stats.ledgerCount} ledger entries ready for upload to '${targetOrgId}'.`
    };
  }

  /**
   * Idempotent migration to Supabase cloud
   */
  static async executeMigration(sourceState = null, targetOrgId = 'comp-eliza') {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        success: false,
        error: 'Supabase credentials are not configured in environment or settings. Connect database first.'
      };
    }

    const dryRunRes = await this.dryRun(sourceState, targetOrgId);
    const state = sourceState || db.state || {};
    const report = {
      orgId: targetOrgId,
      startedAt: new Date().toISOString(),
      entitiesUploaded: {},
      errors: []
    };

    try {
      // 1. Upsert Organization
      const orgRecord = {
        id: targetOrgId,
        name: state.company?.name || 'ELIZA INFOTECH',
        tagline: state.company?.tagline || '',
        gstin: state.company?.gstin || '',
        pan: state.company?.pan || '',
        phone: state.company?.phone || '',
        email: state.company?.email || '',
        address: state.company?.address || '',
        authorized_person: state.company?.authorizedPerson || 'Aditya Sharma'
      };
      await supabase.from('organizations').upsert(orgRecord, { onConflict: 'id' });
      report.entitiesUploaded.organizations = 1;

      // 2. Batch upload parties
      const parties = (state.parties || []).map(p => ({
        id: p.id,
        org_id: targetOrgId,
        name: p.name,
        type: p.type || 'Customer',
        phone: p.phone || '',
        email: p.email || '',
        gstin: p.gstin || '',
        address: p.address || '',
        city: p.city || 'Panipat',
        balance: Number(p.balance) || 0
      }));
      if (parties.length) {
        await supabase.from('parties').upsert(parties, { onConflict: 'id,org_id' });
        report.entitiesUploaded.parties = parties.length;
      }

      // 3. Batch upload items
      const items = (state.items || []).map(item => ({
        id: item.id,
        org_id: targetOrgId,
        sku: item.sku || item.id,
        name: item.name,
        category: item.category || 'General',
        brand: item.brand || '',
        hsn: item.hsn || '8528',
        dealer_cost: Number(item.dealerPrice) || Number(item.dealerCost) || 0,
        mrp: Number(item.mrp) || 0,
        current_stock: Number(item.currentStock) || 0
      }));
      if (items.length) {
        await supabase.from('items').upsert(items, { onConflict: 'id,org_id' });
        report.entitiesUploaded.items = items.length;
      }

      report.completedAt = new Date().toISOString();
      report.success = true;
      return report;
    } catch (e) {
      report.errors.push(e.message);
      report.success = false;
      return report;
    }
  }
}
