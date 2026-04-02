import { PrismaClient } from "@prisma/client";

function getEncryptionKey(): string {
  const key = process.env.PGCRYPTO_KEY;
  if (!key) {
    throw new Error("PGCRYPTO_KEY environment variable is not set");
  }
  return key;
}

/**
 * Encrypt a plaintext value using pgcrypto pgp_sym_encrypt.
 * Returns base64-encoded ciphertext suitable for storage in TEXT columns.
 */
export async function encryptPii(
  prisma: PrismaClient,
  plaintext: string,
): Promise<string> {
  const key = getEncryptionKey();
  const result = await prisma.$queryRawUnsafe<[{ encrypt_pii: string }]>(
    `SELECT encrypt_pii($1, $2) as encrypt_pii`,
    plaintext,
    key,
  );
  return result[0].encrypt_pii;
}

/**
 * Decrypt a base64-encoded ciphertext using pgcrypto pgp_sym_decrypt.
 * Returns the original plaintext.
 */
export async function decryptPii(
  prisma: PrismaClient,
  ciphertext: string,
): Promise<string> {
  const key = getEncryptionKey();
  const result = await prisma.$queryRawUnsafe<[{ decrypt_pii: string }]>(
    `SELECT decrypt_pii($1, $2) as decrypt_pii`,
    ciphertext,
    key,
  );
  return result[0].decrypt_pii;
}
