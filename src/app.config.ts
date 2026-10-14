import { join } from 'node:path';
import { registerAs } from '@nestjs/config';

// Relative paths (media/, views/) resolve against the directory the server is
// started from, which is the project root for every npm script.
export const appConfig = registerAs('app', () => ({
  port: Number(process.env.PORT || 8000),
  database: {
    // `sqlite` exists for the e2e tests; DB_NAME is then the file path or
    // ":memory:".
    type: process.env.DB_TYPE === 'sqlite' ? 'sqlite' : 'mysql',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_NAME || 'storytime',
  } as const,
  mediaRoot: process.env.MEDIA_ROOT || join(process.cwd(), 'media'),
  // Overrides the host used in absolute URLs (files, thumbnails, pagination).
  // When unset, the URL is built from the incoming request's Host header.
  publicUrl: process.env.PUBLIC_URL?.replace(/\/+$/, '') || undefined,
  // Signs admin session tokens. Required; changing it signs everyone out.
  jwtSecret: process.env.JWT_SECRET || undefined,
  sessionTtl: process.env.SESSION_TTL || '7d',
  libreTranslateUrl:
    process.env.LIBRETRANSLATE_URL?.replace(/\/+$/, '') || undefined,
  libreTranslateApiKey: process.env.LIBRETRANSLATE_API_KEY || undefined,
  // Opens every book in the app for Google Play's reviewers (see
  // ReviewerController). Unset means no code works.
  reviewerCode: process.env.REVIEWER_CODE?.trim() || undefined,
  // Optional. Only needed once "Enhanced security for push notifications" is
  // turned on for the project at expo.dev.
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN?.trim() || undefined,
  // Google Play Integrity (see src/app-integrity): whether the app's endpoints
  // only answer our own app, installed from Google Play.
  appIntegrity: {
    required: isOn(process.env.APP_INTEGRITY_REQUIRED),
    androidPackage:
      process.env.ANDROID_PACKAGE?.trim() || 'com.fibigames.bedtimestories',
    // The Google Cloud service account's JSON key, or the path to it.
    serviceAccount:
      process.env.PLAY_INTEGRITY_SERVICE_ACCOUNT?.trim() || undefined,
    // The linked Cloud project's number: the app needs it to ask Play.
    cloudProjectNumber:
      process.env.PLAY_INTEGRITY_CLOUD_PROJECT_NUMBER?.trim() || undefined,
  },
}));

function isOn(value: string | undefined) {
  return ['1', 'true', 'yes', 'on'].includes(value?.trim().toLowerCase() ?? '');
}

export type AppConfig = ReturnType<typeof appConfig>;
