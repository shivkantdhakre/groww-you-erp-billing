import { encrypt, decrypt } from '../utils/crypto.js';

async function runCryptoTests() {
  console.log('=== RUNNING ISOLATED CRYPTONET WORKFLOW TESTS ===\n');
  let passes = 0;
  let failures = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passes++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failures++;
    }
  };

  try {
    const originalKey = process.env.ENCRYPTION_KEY;
    const originalActiveVersion = process.env.ACTIVE_ENCRYPTION_KEY_VERSION;
    const originalV1Key = process.env.ENCRYPTION_KEY_V1;
    const originalV2Key = process.env.ENCRYPTION_KEY_V2;

    // Test 1: Basic Versioned Encryption/Decryption roundtrip
    console.log('--- TEST 1: Versioned Encryption Roundtrip ---');
    process.env.ACTIVE_ENCRYPTION_KEY_VERSION = 'v1';
    const secretMessage = 'MyNICPassword123!';
    const cipherText = encrypt(secretMessage);
    
    assert(cipherText !== null, 'Ciphertext is generated');
    assert(cipherText.startsWith('v1:'), 'Ciphertext starts with version prefix v1:');
    assert(cipherText.split(':').length === 4, 'Ciphertext uses version:iv:tag:ciphertext format');
    
    const decryptedMessage = decrypt(cipherText);
    assert(decryptedMessage === secretMessage, 'Decrypted message matches original cleartext');

    // Test 2: Legacy format decoding (without prefix)
    console.log('\n--- TEST 2: Legacy (Prefix-less) Format Support ---');
    // Manual legacy ciphertext format: iv:tag:ciphertext (3 parts)
    const ivTagCipher = cipherText.split(':').slice(1).join(':');
    assert(ivTagCipher.split(':').length === 3, 'Manual legacy ciphertext has exactly 3 parts');
    
    const decryptedLegacy = decrypt(ivTagCipher);
    assert(decryptedLegacy === secretMessage, 'Decryption of unversioned legacy ciphertext matches original cleartext');

    // Test 3: Key Rotation from v1 to v2
    console.log('\n--- TEST 3: Key Rotation & Multi-Key Support (v1 -> v2) ---');
    
    // Set v1 and v2 keys
    process.env.ENCRYPTION_KEY_V1 = '8f2f4c9c104443bc9195b058a5e8211b8f2f4c9c104443bc9195b058a5e8211b';
    process.env.ENCRYPTION_KEY_V2 = '9f2f4c9c104443bc9195b058a5e8211b9f2f4c9c104443bc9195b058a5e8211c';
    
    // Encrypt something with active key version v1
    process.env.ACTIVE_ENCRYPTION_KEY_VERSION = 'v1';
    const cipherV1 = encrypt('Secret_V1');
    
    // Perform key rotation: change active key version to v2
    process.env.ACTIVE_ENCRYPTION_KEY_VERSION = 'v2';
    const cipherV2 = encrypt('Secret_V2');
    
    assert(cipherV1.startsWith('v1:'), 'V1 ciphertext starts with version v1:');
    assert(cipherV2.startsWith('v2:'), 'V2 ciphertext starts with version v2:');
    
    // Decrypt both simultaneously (proving passive rotation support)
    const decryptedV1 = decrypt(cipherV1);
    const decryptedV2 = decrypt(cipherV2);
    
    assert(decryptedV1 === 'Secret_V1', 'Successfully decrypted V1 payload under active V2 environment');
    assert(decryptedV2 === 'Secret_V2', 'Successfully decrypted V2 payload under active V2 environment');

    // Test 4: Mismatched key handling
    console.log('\n--- TEST 4: Mismatched Key Decryption Failure ---');
    // Change ENCRYPTION_KEY_V2 to trigger decryption failure
    process.env.ENCRYPTION_KEY_V2 = '333f4c9c104443bc9195b058a5e8211b9f2f4c9c104443bc9195b058a5e8211c';
    try {
      decrypt(cipherV2);
      assert(false, 'Allowed decryption with incorrect V2 key');
    } catch (err) {
      assert(
        err.code === 'CREDENTIALS_DECRYPTION_FAILED',
        `Correctly caught decryption error. Code: ${err.code}`
      );
    }

    // Restore original env variables
    process.env.ENCRYPTION_KEY = originalKey;
    process.env.ACTIVE_ENCRYPTION_KEY_VERSION = originalActiveVersion;
    process.env.ENCRYPTION_KEY_V1 = originalV1Key;
    process.env.ENCRYPTION_KEY_V2 = originalV2Key;

  } catch (err) {
    console.error('Unexpected error during crypto tests:', err);
    failures++;
  }

  console.log(`\n=== CRYPTO TEST RESULTS: ${passes} PASSED, ${failures} FAILED ===\n`);
  if (failures > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runCryptoTests();
