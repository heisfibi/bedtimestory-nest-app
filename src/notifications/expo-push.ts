// Sends notifications through Expo's push service, which passes them on to
// Firebase Cloud Messaging (Android) and APNs (iOS). Expo needs the app's FCM
// key once (uploaded with `eas credentials`); after that a token is all it takes.
// https://docs.expo.dev/push-notifications/sending-notifications/

const SEND_URL = 'https://exp.host/--/api/v2/push/send';
// Expo takes at most this many in one request.
export const AT_A_TIME = 100;

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** The Android notification channel the app made for it. */
  channelId?: string;
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
};

/** What became of one message: sent, or why not. `gone` means the token is dead (the app was uninstalled). */
export type PushResult =
  { ok: true } | { ok: false; gone: boolean; error: string };

type Ticket =
  | { status: 'ok'; id: string }
  | { status: 'error'; message: string; details?: { error?: string } };

export const isPushToken = (token: string) =>
  /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token);

/** Sends up to AT_A_TIME messages. Throws if Expo can't be reached, or turns the whole request down. */
export async function sendPush(
  messages: PushMessage[],
  accessToken?: string,
): Promise<PushResult[]> {
  const response = await fetch(SEND_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(messages),
  });
  if (!response.ok) {
    throw new Error(
      `Expo push answered ${response.status}: ${await response.text()}`,
    );
  }
  const { data } = (await response.json()) as { data: Ticket[] };
  return messages.map((_, i): PushResult => {
    const ticket = data[i];
    if (ticket?.status === 'ok') return { ok: true };
    const error = ticket?.details?.error ?? ticket?.message ?? 'no ticket';
    return { ok: false, gone: error === 'DeviceNotRegistered', error };
  });
}
