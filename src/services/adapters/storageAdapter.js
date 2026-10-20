// Storage Adapter (Supabase Storage Buckets + Local Fallback)
import { supabase, isSupabaseConfigured } from '../supabase.js';

export class StorageAdapter {
  async upload(bucket, path, file, options = {}) { throw new Error('Not implemented'); }
  async getUrl(bucket, path, options = {}) { throw new Error('Not implemented'); }
  async delete(bucket, path) { throw new Error('Not implemented'); }
}

export class LocalStorageAdapter extends StorageAdapter {
  constructor() {
    super();
    this.virtualFiles = new Map();
  }

  async upload(bucket, path, file) {
    const key = `${bucket}/${path}`;
    const url = typeof file === 'string' ? file : URL.createObjectURL(file);
    this.virtualFiles.set(key, url);
    return { path, url };
  }

  async getUrl(bucket, path) {
    const key = `${bucket}/${path}`;
    return this.virtualFiles.get(key) || null;
  }

  async delete(bucket, path) {
    const key = `${bucket}/${path}`;
    return this.virtualFiles.delete(key);
  }
}

export class SupabaseStorageAdapter extends StorageAdapter {
  constructor() {
    super();
    this.fallback = new LocalStorageAdapter();
  }

  _isAvailable() {
    return isSupabaseConfigured() && supabase !== null;
  }

  async upload(bucket, path, file, options = {}) {
    if (!this._isAvailable()) {
      return this.fallback.upload(bucket, path, file);
    }
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
      ...options
    });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return { path: data.path, url: urlData.publicUrl };
  }

  async getUrl(bucket, path, options = {}) {
    if (!this._isAvailable()) {
      return this.fallback.getUrl(bucket, path);
    }
    if (options.signed) {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, options.expiresIn || 3600);
      if (error) throw error;
      return data.signedUrl;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async delete(bucket, path) {
    if (!this._isAvailable()) {
      return this.fallback.delete(bucket, path);
    }
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
    return true;
  }
}

export const storageAdapter = new SupabaseStorageAdapter();
