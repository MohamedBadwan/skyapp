import { createHash, randomBytes } from 'crypto';
import { INVITATION_TTL_DAYS } from './mailer';

export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createInvitation(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = randomBytes(32).toString('hex');
  return {
    token,
    tokenHash: hashInvitationToken(token),
    expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000),
  };
}

export function isInvitationUsable(
  invitation: { tokenHash?: string; expiresAt?: Date; acceptedAt?: Date },
  now = new Date(),
): boolean {
  return Boolean(
    invitation.tokenHash
      && invitation.expiresAt
      && invitation.expiresAt > now
      && !invitation.acceptedAt,
  );
}
