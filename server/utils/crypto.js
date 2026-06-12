import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

const getEncryptionKey = () => {
  const rawKey = process.env.ENCRYPTION_KEY;
  if (!rawKey) {
    // Development/testing fallback key (32 bytes)
    return Buffer.from('8f2f4c9c104443bc9195b058a5e8211b8f2f4c9c104443bc9195b058a5e8211b', 'hex');
  }
  if (rawKey.length === 64) {
    return Buffer.from(rawKey, 'hex');
  }
  return crypto.createHash('sha256').update(rawKey).digest();
};

/**
 * Encrypts cleartext using AES-256-GCM and formats as "ivHex:tagHex:cipherHex"
 * @param {string} text - text to encrypt
 * @returns {string|null}
 */
export const encrypt = (text) => {
  if (!text) return null;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypts "ivHex:tagHex:cipherHex" format string
 * @param {string} encryptedText - encrypted text string
 * @returns {string|null}
 */
export const decrypt = (encryptedText) => {
  if (!encryptedText) return null;
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format. Expected iv:tag:ciphertext');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = Buffer.from(parts[2], 'hex');
    
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('Decryption failure:', err.message);
    const customErr = new Error('Credentials decryption failed.');
    customErr.code = 'CREDENTIALS_DECRYPTION_FAILED';
    customErr.status = 500;
    throw customErr;
  }
};
