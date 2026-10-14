import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { IntegrityVerdict } from './verdict.js';

// Asks Google to decode an integrity token the app got from Google Play, as
// the Google Cloud service account linked to the app in Play Console. No
// Google library: a signed JWT buys an access token, which decodes tokens for
// an hour.

const SCOPE = 'https://www.googleapis.com/auth/playintegrity';

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

/** The service account from PLAY_INTEGRITY_SERVICE_ACCOUNT: its JSON key, or the path to the file. */
export function readServiceAccount(value: string): ServiceAccount {
  const json = value.startsWith('{') ? value : readFileSync(value, 'utf8');
  const account = JSON.parse(json) as Partial<ServiceAccount>;
  if (!account.client_email || !account.private_key) {
    throw new Error(
      'PLAY_INTEGRITY_SERVICE_ACCOUNT has no client_email or private_key',
    );
  }
  return account as ServiceAccount;
}

export class PlayIntegrityClient {
  private access: { token: string; until: number } | null = null;

  constructor(
    private readonly account: ServiceAccount,
    private readonly androidPackage: string,
  ) {}

  async decode(integrityToken: string): Promise<IntegrityVerdict> {
    const response = await fetch(
      `https://playintegrity.googleapis.com/v1/${this.androidPackage}:decodeIntegrityToken`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${await this.accessToken()}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ integrity_token: integrityToken }),
      },
    );
    if (!response.ok) {
      throw new Error(
        `Play Integrity answered ${response.status}: ${await response.text()}`,
      );
    }
    const { tokenPayloadExternal } = (await response.json()) as {
      tokenPayloadExternal: IntegrityVerdict;
    };
    return tokenPayloadExternal;
  }

  private async accessToken() {
    if (this.access && this.access.until > Date.now()) return this.access.token;
    const tokenUri =
      this.account.token_uri ?? 'https://oauth2.googleapis.com/token';
    const now = Math.floor(Date.now() / 1000);
    const part = (value: object) =>
      Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${part({ alg: 'RS256', typ: 'JWT' })}.${part({
      iss: this.account.client_email,
      scope: SCOPE,
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    })}`;
    const signature = createSign('RSA-SHA256')
      .update(unsigned)
      .sign(this.account.private_key, 'base64url');

    const response = await fetch(tokenUri, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${unsigned}.${signature}`,
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Google sign-in answered ${response.status}: ${await response.text()}`,
      );
    }
    const { access_token, expires_in } = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };
    // A minute spare, so it's never used as it runs out.
    this.access = {
      token: access_token,
      until: Date.now() + (expires_in - 60) * 1000,
    };
    return access_token;
  }
}
