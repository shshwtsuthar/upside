import crypto from 'crypto';

// --- Configuration ---
const ALGORITHM = 'aes-256-gcm'; // Recommended algorithm for authenticated encryption
const IV_LENGTH = 16; // Initialization Vector length for GCM (12 is also common, but 16 is safe)
const AUTH_TAG_LENGTH = 16; // GCM Authentication Tag length
const KEY_BYTE_LENGTH = 32; // AES-256 requires a 32-byte key
const ENCODING = 'hex'; // How we represent the encrypted data, IV, and auth tag as strings
const INPUT_ENCODING = 'utf8'; // Encoding of the plaintext token

// --- Environment Variable Check ---
const encryptionKeyHex = process.env.UP_TOKEN_ENCRYPTION_KEY;

if (!encryptionKeyHex) {
  throw new Error('FATAL: UP_TOKEN_ENCRYPTION_KEY environment variable is not set.');
}

// Convert the hex key from .env into a Buffer
const KEY = Buffer.from(encryptionKeyHex, 'hex');

if (KEY.length !== KEY_BYTE_LENGTH) {
  throw new Error(
    `FATAL: Invalid UP_TOKEN_ENCRYPTION_KEY length. Expected ${KEY_BYTE_LENGTH * 2} hex characters (${KEY_BYTE_LENGTH} bytes), but got ${encryptionKeyHex.length} characters (${KEY.length} bytes).`
  );
}

// --- Type Definition for Encrypted Data ---
export interface EncryptedData {
  iv: string;             // Initialization Vector (hex encoded)
  encryptedToken: string; // The encrypted data (hex encoded)
  authTag: string;        // GCM Authentication Tag (hex encoded)
}

// --- Encryption Function ---
/**
 * Encrypts a plaintext token using AES-256-GCM.
 * @param token The plaintext string to encrypt.
 * @returns An object containing the hex-encoded IV, encrypted token, and auth tag.
 * @throws Throws an error if encryption fails.
 */
export function encryptToken(token: string): EncryptedData {
  try {
    // 1. Generate a random Initialization Vector (IV) for each encryption
    const iv = crypto.randomBytes(IV_LENGTH);

    // 2. Create the AES-GCM cipher instance with the key and IV
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

    // 3. Encrypt the token (update + final)
    // Input is utf8, output is hex
    let encrypted = cipher.update(token, INPUT_ENCODING, ENCODING);
    encrypted += cipher.final(ENCODING);

    // 4. Get the Authentication Tag (important for GCM)
    const authTag = cipher.getAuthTag();

    // 5. Return the IV, encrypted data, and auth tag, all hex encoded
    return {
      iv: iv.toString(ENCODING),
      encryptedToken: encrypted,
      authTag: authTag.toString(ENCODING),
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    // Re-throw or handle as appropriate for your application
    throw new Error('Failed to encrypt token.');
  }
}

// --- Decryption Function ---
/**
 * Decrypts data previously encrypted with encryptToken using AES-256-GCM.
 * @param encryptedData An object containing the hex-encoded IV, encrypted token, and auth tag.
 * @returns The original plaintext string, or null if decryption fails (e.g., bad key, tampered data).
 */
export function decryptToken(encryptedData: EncryptedData): string | null {
  try {
    // 1. Convert hex-encoded IV and auth tag back to Buffers
    const iv = Buffer.from(encryptedData.iv, ENCODING);
    const authTag = Buffer.from(encryptedData.authTag, ENCODING);

    // 2. Create the AES-GCM decipher instance with the key and IV
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);

    // 3. Set the Authentication Tag (critical step for GCM verification)
    // If the auth tag doesn't match, setAuthTag will throw an error
    decipher.setAuthTag(authTag);

    // 4. Decrypt the token (update + final)
    // Input is hex, output is utf8
    let decrypted = decipher.update(encryptedData.encryptedToken, ENCODING, INPUT_ENCODING);
    decrypted += decipher.final(INPUT_ENCODING);

    // 5. Return the original plaintext token
    return decrypted;
  } catch (error: any) {
    // Decryption can fail due to various reasons (e.g., incorrect key, modified ciphertext/IV/authTag)
    // Log the specific error server-side for debugging, but return null to the caller.
    console.error('Decryption failed:', error.message || error);
    // Example specific check: GCM auth tag mismatch error
    // if (error.message.includes('Unsupported state or unable to authenticate data')) {
    //   console.error('Decryption failed: Authentication tag mismatch. Data may have been tampered with.');
    // }
    return null; // Indicate failure to the caller
  }
}