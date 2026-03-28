import { createHash, randomBytes } from "crypto";

export function generateRawToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createToken(): string {
  return generateRawToken();
}

export function createTokenValue(): string {
  return generateRawToken();
}

export function createTokenHash(token: string): string {
  return hashToken(token);
}

export function staffInviteExpiry(daysValid = 7): Date {
  const safeDays = Number.isFinite(daysValid) ? Math.max(1, Math.min(30, daysValid)) : 7;
  return new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000);
}
