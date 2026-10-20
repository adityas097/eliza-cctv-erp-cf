// Vitest Test Suite for Section 1 Zone Customization & Calculator Metrics
import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '../src/services/store.js';
import { calculateSystemMetrics } from '../src/services/calculators.js';
import { BLUEPRINT_PRESETS } from '../src/modules/CalculatorsModule.js';

describe('Tool 01: Zone-by-Zone Camera & Coverage Planner Customization', () => {
  beforeEach(() => {
    store.resetZones();
  });

  it('should reset zones to the 8 default UHBVN blueprint zones', () => {
    expect(store.state.zones.length).toBe(8);
    expect(store.state.zones[0].id).toBe('Z-01');
    expect(store.state.zones[0].name).toContain('Main Entry Gate');
  });

  it('should allow adding a fully custom zone with custom ID and specifications', () => {
    const customZone = {
      id: 'CUSTOM-01',
      name: 'North Perimeter High-Mast Tower',
      area: 15000,
      mount: 'Mast / Tower',
      camType: 'PTZ Speed Dome',
      res: '4K UHD Ultra HD',
      qty: 2,
      env: 'Outdoor',
      cableMtr: 120,
      notes: '360 degree optical zoom patrol'
    };

    const added = store.addZone(customZone);
    expect(added.id).toBe('CUSTOM-01');
    expect(added.area).toBe(15000);
    expect(added.qty).toBe(2);
    expect(added.mount).toBe('Mast / Tower');
    expect(store.state.zones.find(z => z.id === 'CUSTOM-01')).toBeDefined();
  });

  it('should auto-generate sequential Z-XX ID if no ID is specified', () => {
    const newZone = store.addZone({
      name: 'Server Room Vault',
      area: 800,
      qty: 1
    });

    expect(newZone.id).toBe('Z-09');
  });

  it('should allow editing any existing zone parameters', () => {
    const updated = store.updateZone('Z-01', {
      name: 'Renovated Gate 1 Lane',
      area: 3500,
      qty: 4,
      cableMtr: 90,
      res: '5MP Super HD',
      notes: 'Upgraded with AI facial recognition'
    });

    expect(updated).not.toBeNull();
    expect(updated.name).toBe('Renovated Gate 1 Lane');
    expect(updated.area).toBe(3500);
    expect(updated.qty).toBe(4);
    expect(updated.cableMtr).toBe(90);
    expect(updated.res).toBe('5MP Super HD');
  });

  it('should clone an existing zone with a new unique ID and copy label', () => {
    const initialCount = store.state.zones.length;
    const cloned = store.duplicateZone('Z-02');

    expect(cloned).not.toBeNull();
    expect(store.state.zones.length).toBe(initialCount + 1);
    expect(cloned.name).toContain('(Copy)');
    expect(cloned.mount).toBe(store.state.zones.find(z => z.id === 'Z-02').mount);
  });

  it('should delete a zone and update count', () => {
    const initialCount = store.state.zones.length;
    store.deleteZone('Z-03');

    expect(store.state.zones.length).toBe(initialCount - 1);
    expect(store.state.zones.find(z => z.id === 'Z-03')).toBeUndefined();
  });

  it('should clear all zones for greenfield custom site planning', () => {
    store.clearAllZones();
    expect(store.state.zones.length).toBe(0);

    const metrics = calculateSystemMetrics(store.state.zones);
    expect(metrics.totalCams).toBe(0);
    expect(metrics.totalArea).toBe(0);
    expect(metrics.rawCableMtr).toBe(0);
  });

  it('should load pre-engineered blueprints seamlessly', () => {
    const mandiBlueprint = BLUEPRINT_PRESETS.mandi;
    store.setZones(mandiBlueprint.zones, mandiBlueprint.name);

    expect(store.state.zones.length).toBe(6);
    expect(store.state.zones[0].name).toContain('Weighbridge');

    const metrics = calculateSystemMetrics(store.state.zones);
    expect(metrics.totalCams).toBeGreaterThan(0);
    expect(metrics.totalArea).toBeGreaterThan(10000);
  });

  it('should recalculate bitrates, storage and power dynamically based on zone resolutions', () => {
    store.clearAllZones();
    store.addZone({
      id: 'TEST-4K',
      qty: 4,
      res: '4K UHD Ultra HD',
      cableMtr: 100,
      area: 4000
    });

    const metrics = calculateSystemMetrics(store.state.zones, { codec: 'H.265' });
    expect(metrics.totalCams).toBe(4);
    // 4K has 8.0 Mbps H.265 per cam => 32.0 Mbps
    expect(metrics.activeBitrate).toBe(32);
    expect(metrics.totalCamPowerWatts).toBe(38); // 9.5W * 4
    expect(metrics.grossCableMtr).toBe(115); // 100 * 1.15
  });
});
