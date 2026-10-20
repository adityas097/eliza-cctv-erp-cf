// Data Adapter Interface & Implementations (Supabase Cloud + Local Fallback)
import { db } from '../../store/db.js';
import { supabase, isSupabaseConfigured } from '../supabase.js';

export class DataAdapter {
  async list(collection, filter = null, options = {}) { throw new Error('Not implemented'); }
  async get(collection, id) { throw new Error('Not implemented'); }
  async create(collection, record) { throw new Error('Not implemented'); }
  async update(collection, id, updates) { throw new Error('Not implemented'); }
  async delete(collection, id) { throw new Error('Not implemented'); }
}

/**
 * Local Data Adapter (Fast in-memory & localStorage fallback for development/demo)
 */
export class LocalDataAdapter extends DataAdapter {
  async list(collection, filter = null, options = {}) {
    let items = await db.collection(collection).list();
    if (typeof filter === 'function') {
      items = items.filter(filter);
    }
    return JSON.parse(JSON.stringify(items));
  }

  async get(collection, id) {
    const item = await db.collection(collection).get(id);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  async create(collection, record) {
    const created = await db.collection(collection).create(record);
    return JSON.parse(JSON.stringify(created));
  }

  async update(collection, id, updates) {
    const updated = await db.collection(collection).update(id, updates);
    return JSON.parse(JSON.stringify(updated));
  }

  async delete(collection, id) {
    return await db.collection(collection).delete(id);
  }
}

/**
 * Supabase Cloud Data Adapter (Production multi-tenant backend with RLS)
 */
export class SupabaseDataAdapter extends DataAdapter {
  constructor() {
    super();
    this.localFallback = new LocalDataAdapter();
  }

  _isAvailable() {
    return isSupabaseConfigured() && supabase !== null;
  }

  async list(collection, filter = null, options = {}) {
    if (!this._isAvailable()) {
      return this.localFallback.list(collection, filter, options);
    }

    try {
      let query = supabase.from(collection).select(options.select || '*');
      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending ?? true });
      }
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      let res = data || [];
      if (typeof filter === 'function') {
        res = res.filter(filter);
      }
      return res;
    } catch (e) {
      console.warn(`Supabase query failed on '${collection}', using local adapter:`, e.message);
      return this.localFallback.list(collection, filter, options);
    }
  }

  async get(collection, id) {
    if (!this._isAvailable()) {
      return this.localFallback.get(collection, id);
    }

    try {
      const { data, error } = await supabase.from(collection).select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn(`Supabase get failed on '${collection}', using local adapter:`, e.message);
      return this.localFallback.get(collection, id);
    }
  }

  async create(collection, record) {
    if (!this._isAvailable()) {
      return this.localFallback.create(collection, record);
    }

    try {
      const { data, error } = await supabase.from(collection).insert(record).select().single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn(`Supabase create failed on '${collection}', using local adapter:`, e.message);
      return this.localFallback.create(collection, record);
    }
  }

  async update(collection, id, updates) {
    if (!this._isAvailable()) {
      return this.localFallback.update(collection, id, updates);
    }

    try {
      const { data, error } = await supabase.from(collection).update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn(`Supabase update failed on '${collection}', using local adapter:`, e.message);
      return this.localFallback.update(collection, id, updates);
    }
  }

  async delete(collection, id) {
    if (!this._isAvailable()) {
      return this.localFallback.delete(collection, id);
    }

    try {
      const { error } = await supabase.from(collection).delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn(`Supabase delete failed on '${collection}', using local adapter:`, e.message);
      return this.localFallback.delete(collection, id);
    }
  }
}

// Global active data adapter instance
export const dataAdapter = new SupabaseDataAdapter();
