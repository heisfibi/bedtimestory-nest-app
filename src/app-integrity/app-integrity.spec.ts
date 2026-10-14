import type { AppConfig } from '../app.config.js';
import { AppIntegrityService } from './app-integrity.service.js';
import {
  APP_TOKEN_MS,
  CHALLENGE_MS,
  appTokenIsGood,
  challengeIsGood,
  keyFrom,
  makeAppToken,
  makeChallenge,
} from './tokens.js';
import { verdictProblem, type IntegrityVerdict } from './verdict.js';

const key = keyFrom('secret');
const PACKAGE = 'com.fibigames.bedtimestories';

describe('challenges and app tokens', () => {
  it('takes back its own challenge until it runs out', () => {
    const now = Date.now();
    const challenge = makeChallenge(key, now);
    expect(challengeIsGood(key, challenge, now + 1000)).toBe(true);
    expect(challengeIsGood(key, challenge, now + CHALLENGE_MS + 1)).toBe(false);
  });

  it('turns down a challenge made up, altered, or signed with another key', () => {
    const challenge = makeChallenge(key);
    const [kind, random, expiry, signature] = challenge.split('.');
    const later = `${kind}.${random}.${Number(expiry) + 1e9}.${signature}`;
    expect(challengeIsGood(key, later)).toBe(false);
    expect(challengeIsGood(keyFrom('other'), challenge)).toBe(false);
    expect(challengeIsGood(key, 'c.x.99999999999999.abc')).toBe(false);
  });

  it('keeps app tokens and challenges apart', () => {
    const challenge = makeChallenge(key);
    const { token } = makeAppToken(key, 'reader');
    expect(appTokenIsGood(key, challenge)).toBe(false);
    expect(challengeIsGood(key, token)).toBe(false);
  });

  it('lets an app token last 12 hours', () => {
    const now = Date.now();
    const { token } = makeAppToken(key, 'reader', now);
    expect(appTokenIsGood(key, token, now + APP_TOKEN_MS - 1)).toBe(true);
    expect(appTokenIsGood(key, token, now + APP_TOKEN_MS + 1)).toBe(false);
  });
});

describe('verdicts', () => {
  const now = 1_800_000_000_000;
  const challenge = 'c.abc.1.sig';
  const good: IntegrityVerdict = {
    requestDetails: {
      requestPackageName: PACKAGE,
      requestHash: challenge,
      timestampMillis: String(now - 2000),
    },
    appIntegrity: {
      appRecognitionVerdict: 'PLAY_RECOGNIZED',
      packageName: PACKAGE,
    },
    deviceIntegrity: { deviceRecognitionVerdict: ['MEETS_DEVICE_INTEGRITY'] },
  };
  const check = (verdict: IntegrityVerdict) =>
    verdictProblem(verdict, { androidPackage: PACKAGE, challenge, now });

  it('passes our app from Play on a real device', () => {
    expect(check(good)).toBeNull();
  });

  it('turns away a copy that isn’t from Play (a sideloaded or re-signed build)', () => {
    expect(
      check({
        ...good,
        appIntegrity: {
          ...good.appIntegrity,
          appRecognitionVerdict: 'UNRECOGNIZED_VERSION',
        },
      }),
    ).toBe('app UNRECOGNIZED_VERSION');
  });

  it('turns away a verdict for another challenge, an old one, or another app', () => {
    expect(
      check({
        ...good,
        requestDetails: { ...good.requestDetails, requestHash: 'other' },
      }),
    ).toBe('asked with another challenge');
    expect(
      check({
        ...good,
        requestDetails: {
          ...good.requestDetails,
          timestampMillis: String(now - 3_600_000),
        },
      }),
    ).toBe('too old');
    expect(
      check({
        ...good,
        requestDetails: {
          ...good.requestDetails,
          requestPackageName: 'com.copy',
        },
      }),
    ).toBe('asked for by com.copy');
  });

  it('turns away a device that fails every integrity check', () => {
    expect(
      check({ ...good, deviceIntegrity: { deviceRecognitionVerdict: [] } }),
    ).toBe('device fails integrity');
  });
});

describe('the switch', () => {
  const service = (required: boolean) =>
    new AppIntegrityService({
      jwtSecret: 'secret',
      appIntegrity: {
        required,
        androidPackage: PACKAGE,
        serviceAccount: undefined,
      },
    } as AppConfig);

  it('lets everything through while it’s off', () => {
    expect(service(false).allows(undefined)).toBe(true);
  });

  it('wants a good app token while it’s on', () => {
    const on = service(true);
    expect(on.allows(undefined)).toBe(false);
    expect(on.allows('a.x.1.y')).toBe(false);
    expect(on.allows(makeAppToken(key, 'reader').token)).toBe(true);
  });
});
