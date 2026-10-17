import crypto from "node:crypto";

function key() {
  const raw = process.env.MP_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("Falta MP_TOKEN_ENCRYPTION_KEY.");
  const value = Buffer.from(raw, "base64");
  if (value.length !== 32) throw new Error("MP_TOKEN_ENCRYPTION_KEY debe ser una clave base64 de 32 bytes.");
  return value;
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((x) => x.toString("base64")).join(".");
}

export function decryptSecret(value: string) {
  const [iv64, tag64, ciphertext64] = value.split(".");
  if (!iv64 || !tag64 || !ciphertext64) throw new Error("Secreto cifrado inválido.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(iv64, "base64"));
  decipher.setAuthTag(Buffer.from(tag64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext64, "base64")), decipher.final()]).toString("utf8");
}

export function signState(payload: string) {
  const secret = process.env.MP_OAUTH_STATE_SECRET;
  if (!secret) throw new Error("Falta MP_OAUTH_STATE_SECRET.");
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function verifyState(payload: string, signature: string) {
  const expected = signState(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
