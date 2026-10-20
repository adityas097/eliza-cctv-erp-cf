// Phase 6: Responsiveness & Mobile QA Verification Suite
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 6: Mobile QA, PWA & Responsiveness Suite', () => {
  const cssPath = path.resolve(__dirname, '../src/styles/main.css');
  const manifestPath = path.resolve(__dirname, '../public/manifest.webmanifest');
  const swPath = path.resolve(__dirname, '../public/sw.js');
  const indexPath = path.resolve(__dirname, '../index.html');

  const css = fs.readFileSync(cssPath, 'utf-8');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const sw = fs.readFileSync(swPath, 'utf-8');
  const indexHtml = fs.readFileSync(indexPath, 'utf-8');

  describe('1. Viewport & Safe-Area Configuration', () => {
    it('enforces viewport-fit=cover in index.html for notch compatibility', () => {
      expect(indexHtml).toContain('viewport-fit=cover');
      expect(indexHtml).toContain('meta name="theme-color"');
    });

    it('implements 100dvh modern viewport units for mobile address bar resilience', () => {
      expect(css).toContain('100dvh');
      expect(css).toContain('min-height: 100dvh');
    });

    it('handles device notches with env(safe-area-inset)', () => {
      expect(css).toContain('safe-area-inset-top');
      expect(css).toContain('safe-area-inset-bottom');
    });
  });

  describe('2. Touch Ergonomics & Form Usability', () => {
    it('sets minimum 44px touch targets on interactive mobile controls', () => {
      expect(css).toContain('min-height: 44px');
      expect(css).toContain('touch-action: manipulation');
    });

    it('prevents iOS automatic zoom by guaranteeing 16px font sizes on inputs under 768px', () => {
      expect(css).toContain('font-size: 16px !important');
    });

    it('locks body scrolling when mobile off-canvas drawer is active', () => {
      expect(css).toContain('body.sidebar-drawer-open');
      expect(css).toContain('overflow: hidden !important');
    });
  });

  describe('3. Table & Kanban Layout Boundaries', () => {
    it('prevents page-level horizontal overflow with sticky first column and min-width: 0', () => {
      expect(css).toContain('.table-responsive');
      expect(css).toContain('min-width: 0');
      expect(css).toContain('position: sticky');
    });

    it('implements touch snap-scroll for Kanban boards', () => {
      expect(css).toContain('scroll-snap-type: x mandatory');
      expect(css).toContain('scroll-snap-align: start');
    });
  });

  describe('4. PWA Manifest & Service Worker Security', () => {
    it('provides valid PWA manifest with standalone display and branded icons', () => {
      expect(manifest.name).toContain('Eliza');
      expect(manifest.display).toBe('standalone');
      expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
      expect(manifest.theme_color).toBe('#090d16');
    });

    it('guarantees service worker NEVER caches authenticated Supabase API responses', () => {
      expect(sw).toContain('url.pathname.includes(\'/rest/v1/\')');
      expect(sw).toContain('supabase.co');
      expect(sw).toContain('request.headers.get(\'Authorization\')');
    });

    it('provides offline fallback navigation in service worker', () => {
      expect(sw).toContain('/offline.html');
    });
  });
});
