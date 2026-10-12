import type { Request } from 'express';

/**
 * The origin clients should use for absolute links. Building it from the Host
 * header means a phone on the LAN gets URLs with the PC's LAN address.
 */
export function baseUrl(request: Request, publicUrl?: string) {
  return publicUrl ?? `${request.protocol}://${request.get('host')}`;
}
