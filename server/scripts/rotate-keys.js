import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from '../utils/crypto.js';

const prisma = new PrismaClient();

async function rotateKeys() {
  const activeVersion = process.env.ACTIVE_ENCRYPTION_KEY_VERSION || 'v1';
  console.log(`=== STARTING CRYPTOGRAPHIC KEY MIGRATION TO VERSION: ${activeVersion} ===\n`);
  
  const batchSize = 500;
  
  try {
    // 1. Rotate Company Records
    console.log('--- Migrating Companies ---');
    let companySkip = 0;
    let companyHasMore = true;
    let companiesMigrated = 0;
    
    while (companyHasMore) {
      const companies = await prisma.company.findMany({
        skip: companySkip,
        take: batchSize,
        select: {
          id: true,
          nicPassword: true
        }
      });
      
      if (companies.length === 0) {
        companyHasMore = false;
        break;
      }
      
      for (const company of companies) {
        const password = company.nicPassword;
        if (password && !password.startsWith(`${activeVersion}:`)) {
          try {
            const clearText = decrypt(password);
            const reEncrypted = encrypt(clearText);
            
            await prisma.company.update({
              where: { id: company.id },
              data: { nicPassword: reEncrypted }
            });
            companiesMigrated++;
          } catch (decErr) {
            console.error(`[ERROR] Failed to decrypt company ${company.id}:`, decErr.message);
          }
        }
      }
      
      console.log(`Processed company batch (offset ${companySkip}, size ${companies.length})`);
      if (companies.length < batchSize) {
        companyHasMore = false;
      } else {
        companySkip += batchSize;
      }
    }
    console.log(`Completed Company migration. Total rotated: ${companiesMigrated}\n`);

    // 2. Rotate Branch Records
    console.log('--- Migrating Branches ---');
    let branchSkip = 0;
    let branchHasMore = true;
    let branchesMigrated = 0;
    
    while (branchHasMore) {
      const branches = await prisma.branch.findMany({
        skip: branchSkip,
        take: batchSize,
        select: {
          id: true,
          nicPassword: true
        }
      });
      
      if (branches.length === 0) {
        branchHasMore = false;
        break;
      }
      
      for (const branch of branches) {
        const password = branch.nicPassword;
        if (password && !password.startsWith(`${activeVersion}:`)) {
          try {
            const clearText = decrypt(password);
            const reEncrypted = encrypt(clearText);
            
            await prisma.branch.update({
              where: { id: branch.id },
              data: { nicPassword: reEncrypted }
            });
            branchesMigrated++;
          } catch (decErr) {
            console.error(`[ERROR] Failed to decrypt branch ${branch.id}:`, decErr.message);
          }
        }
      }
      
      console.log(`Processed branch batch (offset ${branchSkip}, size ${branches.length})`);
      if (branches.length < batchSize) {
        branchHasMore = false;
      } else {
        branchSkip += batchSize;
      }
    }
    console.log(`Completed Branch migration. Total rotated: ${branchesMigrated}\n`);
    
    console.log('=== KEY ROTATION SUCCESSFUL ===');
  } catch (err) {
    console.error('=== KEY ROTATION FAILED ===', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

rotateKeys();
