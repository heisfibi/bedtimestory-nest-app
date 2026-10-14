// Google Play's integrity verdict, as decodeIntegrityToken returns it, and
// what makes it good enough here.
// https://developer.android.com/google/play/integrity/verdicts

export type IntegrityVerdict = {
  requestDetails?: {
    requestPackageName?: string;
    /** What the app asked with: our challenge. */
    requestHash?: string;
    timestampMillis?: string;
  };
  appIntegrity?: {
    /** PLAY_RECOGNIZED: this app, signed by us, as Google Play delivers it. */
    appRecognitionVerdict?: string;
    packageName?: string;
    versionCode?: string;
  };
  deviceIntegrity?: {
    /** MEETS_BASIC_INTEGRITY, MEETS_DEVICE_INTEGRITY, MEETS_STRONG_INTEGRITY, MEETS_VIRTUAL_INTEGRITY… */
    deviceRecognitionVerdict?: string[];
  };
  accountDetails?: { appLicensingVerdict?: string };
};

/** How old a verdict may be when it reaches the server. */
const FRESH_MS = 10 * 60 * 1000;

/**
 * Null if the verdict says this is our app, unmodified and from Google Play,
 * on a real Android device (rooted ones that still pass the basic check
 * included), asked for with `challenge`; otherwise why not.
 */
export function verdictProblem(
  verdict: IntegrityVerdict,
  expected: { androidPackage: string; challenge: string; now?: number },
): string | null {
  const now = expected.now ?? Date.now();
  const request = verdict.requestDetails;
  if (request?.requestPackageName !== expected.androidPackage) {
    return `asked for by ${request?.requestPackageName ?? 'nobody'}`;
  }
  if (request.requestHash !== expected.challenge) {
    return 'asked with another challenge';
  }
  const at = Number(request.timestampMillis);
  if (!Number.isFinite(at) || Math.abs(now - at) > FRESH_MS) {
    return 'too old';
  }
  const app = verdict.appIntegrity;
  if (app?.appRecognitionVerdict !== 'PLAY_RECOGNIZED') {
    return `app ${app?.appRecognitionVerdict ?? 'not judged'}`;
  }
  if (app.packageName !== expected.androidPackage) {
    return `app is ${app.packageName}`;
  }
  const device = verdict.deviceIntegrity?.deviceRecognitionVerdict ?? [];
  if (!device.some((label) => label.startsWith('MEETS_'))) {
    return 'device fails integrity';
  }
  return null;
}
