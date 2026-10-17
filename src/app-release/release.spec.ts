import { BadRequestException } from '@nestjs/common';
import { checkRelease, compareVersions, RELEASE_VERSION } from './release.js';

const PLAY =
  'https://play.google.com/store/apps/details?id=com.fibigames.bedtimestories';

describe('compareVersions', () => {
  it('compares part by part, as numbers', () => {
    expect(compareVersions('1.2.0', '1.10.0')).toBeLessThan(0);
    expect(compareVersions('2.0', '1.99.99')).toBeGreaterThan(0);
    expect(compareVersions('1.4.2', '1.4.2')).toBe(0);
  });

  it('counts missing parts as 0 and drops a suffix', () => {
    expect(compareVersions('1.4', '1.4.0')).toBe(0);
    expect(compareVersions('1.2.0-rc1', '1.2.0')).toBe(0);
  });
});

describe('RELEASE_VERSION', () => {
  it('takes versions as people write them', () => {
    for (const ok of ['1', '1.4', '1.4.2', '1.4.2.7'])
      expect(RELEASE_VERSION.test(ok)).toBe(true);
    for (const bad of ['', 'v1.4', '1.4.', '1..4', '1.4.2-beta', '1.2.3.4.5']) {
      expect(RELEASE_VERSION.test(bad)).toBe(false);
    }
  });
});

describe('checkRelease', () => {
  const base = { version: '1.1.0', build: 3, storeUrl: PLAY, notes: [] };

  it('leaves unset fields out and tidies the notes', () => {
    expect(
      checkRelease('android', {
        ...base,
        notes: ['  New   comics ', '', 'Faster'],
      }),
    ).toEqual({
      version: '1.1.0',
      build: 3,
      storeUrl: PLAY,
      notes: ['New comics', 'Faster'],
    });
  });

  it('refuses a minimum above what the store has', () => {
    expect(() => checkRelease('android', { ...base, minimumBuild: 4 })).toThrow(
      BadRequestException,
    );
    expect(() =>
      checkRelease('android', { ...base, minimumVersion: '1.2' }),
    ).toThrow(/above the version/);
    expect(() =>
      checkRelease('android', { ...base, build: null, minimumBuild: 2 }),
    ).toThrow(/build number too/);
    expect(
      checkRelease('android', { ...base, minimumBuild: 3 }).minimumBuild,
    ).toBe(3);
  });

  it("only takes the app's own store page", () => {
    for (const bad of [
      'play.google.com/store/apps/details?id=x',
      'http://play.google.com/store/apps/details?id=x',
      'https://play.google.com.evil.example/store/apps/details?id=x',
      'https://play.google.com/store/apps/details',
      'https://apps.apple.com/app/id1',
    ]) {
      expect(() => checkRelease('android', { ...base, storeUrl: bad })).toThrow(
        BadRequestException,
      );
    }
    expect(
      checkRelease('ios', {
        ...base,
        storeUrl: 'https://apps.apple.com/app/id123',
      }).storeUrl,
    ).toBe('https://apps.apple.com/app/id123');
  });

  it('allows four "what\'s new" lines, not five', () => {
    expect(
      checkRelease('android', { ...base, notes: ['a', 'b', 'c', 'd'] }).notes,
    ).toHaveLength(4);
    expect(() =>
      checkRelease('android', { ...base, notes: ['a', 'b', 'c', 'd', 'e'] }),
    ).toThrow(/at most 4/);
  });
});
