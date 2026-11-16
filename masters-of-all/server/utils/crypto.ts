import crypto from 'crypto';
import type { ServerUserRecord } from '../db/schema';
import type { SiteSettings } from '../../src/types/index';

export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  if (!password || !salt || !storedHash) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(storedHash, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function generateSecurePassword(length = 16): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*-_+=';
  const all = upper + lower + digits + symbols;
  const targetLength = Math.max(12, length);

  const pick = (charset: string) => charset[crypto.randomInt(0, charset.length)];
  const chars: string[] = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  for (let i = chars.length; i < targetLength; i++) {
    chars.push(pick(all));
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }
  return chars.join('');
}

export function validatePasswordAgainstPolicy(
  password: string,
  policy?: SiteSettings['securityPolicy']
): { ok: true } | { ok: false; error: string } {
  const minLength = Math.max(12, policy?.minPasswordLength || 12);
  if (!password || password.length < minLength) {
    return { ok: false, error: `Password must be at least ${minLength} characters long.` };
  }
  if (policy?.requireUppercase !== false && !/[A-Z]/.test(password)) {
    return { ok: false, error: 'Password must include at least one uppercase letter.' };
  }
  if (policy?.requireNumber !== false && !/\d/.test(password)) {
    return { ok: false, error: 'Password must include at least one number.' };
  }
  if (policy?.requireSymbol !== false && !/[^A-Za-z0-9]/.test(password)) {
    return { ok: false, error: 'Password must include at least one special character.' };
  }
  return { ok: true };
}

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpCode(secretBase32: string, step: number): string {
  const key = base32Decode(secretBase32);
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = crypto.createHmac('sha1', key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codeInt =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(codeInt % 1_000_000).padStart(6, '0');
}

export function verifyTotpCode(
  secretBase32: string | undefined,
  code: string,
  lastUsedStep?: number
): { valid: boolean; step?: number } {
  if (!secretBase32) return { valid: false };
  const cleaned = code.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleaned)) return { valid: false };

  const currentStep = Math.floor(Date.now() / 1000 / 30);
  const codeBuf = Buffer.from(cleaned, 'utf-8');

  for (const offset of [-1, 0, 1]) {
    const step = currentStep + offset;
    if (lastUsedStep !== undefined && step <= lastUsedStep) continue;
    const expected = generateTotpCode(secretBase32, step);
    const expectedBuf = Buffer.from(expected, 'utf-8');
    if (codeBuf.length === expectedBuf.length && crypto.timingSafeEqual(codeBuf, expectedBuf)) {
      return { valid: true, step };
    }
  }
  return { valid: false };
}

export function generateRecoveryCodes(): { plain: string[]; hashed: string[] } {
  const plain: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < 8; i++) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
    plain.push(formatted);
    hashed.push(crypto.createHash('sha256').update(formatted).digest('hex'));
  }
  return { plain, hashed };
}

export function consumeRecoveryCode(user: ServerUserRecord, code: string): boolean {
  if (!user.recoveryCodes || user.recoveryCodes.length === 0) return false;
  const normalized = code.trim().toUpperCase();
  const candidateHash = crypto.createHash('sha256').update(normalized).digest('hex');
  const candidateBuf = Buffer.from(candidateHash, 'hex');

  const matchIdx = user.recoveryCodes.findIndex(storedHex => {
    try {
      const storedBuf = Buffer.from(storedHex, 'hex');
      return storedBuf.length === candidateBuf.length && crypto.timingSafeEqual(storedBuf, candidateBuf);
    } catch {
      return false;
    }
  });

  if (matchIdx === -1) return false;
  user.recoveryCodes.splice(matchIdx, 1);
  return true;
}

export function timingSafeTokenEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf-8');
    const bufB = Buffer.from(b, 'utf-8');
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
