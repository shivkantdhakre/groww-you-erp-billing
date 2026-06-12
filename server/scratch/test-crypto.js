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
    // Save original env key
    const originalKey = process.env.ENCRYPTION_KEY;

    // Test 1: Basic Encryption/Decryption roundtrip
    console.log('--- TEST 1: Encryption Roundtrip ---');
    const secretMessage = 'MyNICPassword123!';
    const cipherText = encrypt(secretMessage);
    
    assert(cipherText !== null, 'Ciphertext is generated');
    assert(cipherText.split(':').length === 3, 'Ciphertext uses iv:tag:ciphertext format');
    
    const decryptedMessage = decrypt(cipherText);
    assert(decryptedMessage === secretMessage, 'Decrypted message matches original cleartext');

    // Test 2: Mismatched key handling (rotation simulation)
    console.log('\n--- TEST 2: Encryption Key Mismatch Failure ---');
    
    // Switch key
    process.env.ENCRYPTION_KEY = 'a8f2f4c9c104443bc9195b058a5e8211ba8f2f4c9c104443bc9195b058a5e8212';
    
    try {
      decrypt(cipherText);
      assert(false, 'Allowed decryption with incorrect key');
    } catch (err) {
      assert(
        err.code === 'CREDENTIALS_DECRYPTION_FAILED',
        `Correctly caught decryption error. Code: ${err.code}`
      );
    }

    // Restore key
    process.env.ENCRYPTION_KEY = originalKey;

    // Test 3: Malformed encrypted format
    console.log('\n--- TEST 3: Malformed Ciphertext Handling ---');
    try {
      decrypt('invalid-format-string');
      assert(false, 'Allowed decryption of malformed format string');
    } catch (err) {
      assert(
        err.code === 'CREDENTIALS_DECRYPTION_FAILED',
        `Correctly caught malformed format error. Code: ${err.code}`
      );
    }

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
