import { compareVersions, VERSION } from './versions.js';

describe('compareVersions', () => {
  it('compares part by part, as numbers', () => {
    expect(compareVersions('1.2.0', '1.10.0')).toBeLessThan(0);
    expect(compareVersions('2.0', '1.99.99')).toBeGreaterThan(0);
    expect(compareVersions('1.4.2', '1.4.2')).toBe(0);
  });

  it('counts missing parts as 0', () => {
    expect(compareVersions('1.4', '1.4.0')).toBe(0);
    expect(compareVersions('1', '1.0.1')).toBeLessThan(0);
  });
});

describe('VERSION', () => {
  it('takes versions as people write them', () => {
    for (const ok of ['1', '1.4', '1.4.2', '1.4.2.7', '10.0.0']) {
      expect(VERSION.test(ok)).toBe(true);
    }
    for (const bad of ['', 'v1.4', '1.4.', '1..4', '1.4.2-beta', '1.2.3.4.5']) {
      expect(VERSION.test(bad)).toBe(false);
    }
  });
});
