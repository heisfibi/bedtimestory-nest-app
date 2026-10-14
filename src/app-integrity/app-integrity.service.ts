import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { appConfig, type AppConfig } from '../app.config.js';
import {
  PlayIntegrityClient,
  readServiceAccount,
} from './play-integrity-client.js';
import {
  appTokenIsGood,
  challengeIsGood,
  keyFrom,
  makeAppToken,
  makeChallenge,
} from './tokens.js';
import { verdictProblem } from './verdict.js';

/**
 * Whether a request comes from our own app, installed from Google Play.
 *
 * The app asks for a challenge, has Google Play judge it (Play Integrity
 * standard request, with the challenge as the request hash), and sends the
 * verdict here. Google decodes it; if it's our app, unmodified and from Play,
 * the app gets an app token for its requests (AppIntegrityGuard), good for
 * 12 hours. Only enforced while APP_INTEGRITY_REQUIRED is true.
 */
@Injectable()
export class AppIntegrityService {
  private readonly logger = new Logger(AppIntegrityService.name);
  private readonly key: Buffer;
  private readonly client: PlayIntegrityClient | null;
  // Challenges already used, until they'd have run out anyway: a verdict counts once.
  private readonly used = new Map<string, number>();

  constructor(@Inject(appConfig.KEY) private readonly config: AppConfig) {
    const { jwtSecret, appIntegrity } = config;
    // Without the server's secret, a key of its own: app tokens then last as long as the process.
    this.key = keyFrom(jwtSecret ?? randomBytes(32).toString('hex'));
    let client: PlayIntegrityClient | null = null;
    if (appIntegrity.serviceAccount) {
      try {
        client = new PlayIntegrityClient(
          readServiceAccount(appIntegrity.serviceAccount),
          appIntegrity.androidPackage,
        );
      } catch (error) {
        this.logger.error(`PLAY_INTEGRITY_SERVICE_ACCOUNT: ${String(error)}`);
      }
    }
    this.client = client;
    if (
      appIntegrity.required &&
      (!client || !appIntegrity.cloudProjectNumber)
    ) {
      this.logger.error(
        'APP_INTEGRITY_REQUIRED is on but PLAY_INTEGRITY_SERVICE_ACCOUNT or PLAY_INTEGRITY_CLOUD_PROJECT_NUMBER is missing: the app will be turned away',
      );
    }
  }

  get required() {
    return this.config.appIntegrity.required;
  }

  get cloudProjectNumber() {
    return this.config.appIntegrity.cloudProjectNumber ?? null;
  }

  challenge() {
    return makeChallenge(this.key);
  }

  /** Checks Play's verdict on a challenge; if it's good, the app token to send from now on. */
  async verify(challenge: string, integrityToken: string, readerId: string) {
    const now = Date.now();
    for (const [used, until] of this.used)
      if (until < now) this.used.delete(used);
    if (
      !challengeIsGood(this.key, challenge, now) ||
      this.used.has(challenge)
    ) {
      throw new ForbiddenException('That challenge is used up or out of date');
    }
    if (!this.client) {
      throw new ServiceUnavailableException('App checks are not set up');
    }
    this.used.set(challenge, now + 10 * 60 * 1000);

    let verdict;
    try {
      verdict = await this.client.decode(integrityToken);
    } catch (error) {
      this.logger.warn(`Decoding an integrity token failed: ${String(error)}`);
      throw new ForbiddenException('This app could not be verified');
    }
    const problem = verdictProblem(verdict, {
      androidPackage: this.config.appIntegrity.androidPackage,
      challenge,
      now,
    });
    if (problem) {
      this.logger.warn(`Turned away an app (${readerId}): ${problem}`);
      throw new ForbiddenException(
        `This app could not be verified: ${problem}`,
      );
    }
    const { token, expiresAt } = makeAppToken(this.key, readerId, now);
    return { token, expires_at: new Date(expiresAt).toISOString() };
  }

  /** Whether a request may have the app's endpoints: always, unless checks are on; then only with a good app token. */
  allows(appToken: string | undefined) {
    return !this.required || (!!appToken && appTokenIsGood(this.key, appToken));
  }
}
