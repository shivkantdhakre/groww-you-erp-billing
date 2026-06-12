import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

const getEncryptionKeyForVersion = (version) => {
  let keyEnvVar = 'ENCRYPTION_KEY';
  if (version && version !== 'legacy') {
    const formattedVersion = version.toUpperCase(); // e.g. 'V1', 'V2'
    const specificKey = process.env[`ENCRYPTION_KEY_${formattedVersion}`];
    if (specificKey) {
      keyEnvVar = `ENCRYPTION_KEY_${formattedVersion}`;
    }
  }

  const rawKey = process.env[keyEnvVar] || process.env.ENCRYPTION_KEY;
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
 * Encrypts cleartext using AES-256-GCM and formats as "version:ivHex:tagHex:cipherHex"
 * @param {string} text - text to encrypt
 * @returns {string|null}
 */
export const encrypt = (text) => {
  if (!text) return null;
  const version = process.env.ACTIVE_ENCRYPTION_KEY_VERSION || 'v1';
  const key = getEncryptionKeyForVersion(version);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${version}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypts "version:ivHex:tagHex:cipherHex" or legacy "ivHex:tagHex:cipherHex" format string
 * @param {string} encryptedText - encrypted text string
 * @returns {string|null}
 */
export const decrypt = (encryptedText) => {
  if (!encryptedText) return null;
  try {
    const parts = encryptedText.split(':');
    let version;
    let ivHex, authTagHex, cipherHex;

    // Detect versioned format vs legacy unversioned format
    if (parts.length === 4 && /^v\d+$/.test(parts[0])) {
      version = parts[0];
      ivHex = parts[1];
      authTagHex = parts[2];
      cipherHex = parts[3];
    } else if (parts.length === 3) {
      version = 'legacy';
      ivHex = parts[0];
      authTagHex = parts[1];
      cipherHex = parts[2];
    } else {
      throw new Error('Invalid encrypted format. Expected iv:tag:ciphertext or version:iv:tag:ciphertext');
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(cipherHex, 'hex');
    
    const key = getEncryptionKeyForVersion(version);
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
