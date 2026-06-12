import { GspAdapter } from './gspAdapter.js';

export class MockGspAdapter extends GspAdapter {
  async authenticate(clientId, clientSecret, otp) {
    console.log('[MockGsp] Authenticating with clientId:', clientId);
    
    // Support testing auth failures
    if (otp === '000000') {
      const err = new Error('Invalid OTP code. Please request a new one.');
      err.status = 400;
      throw err;
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 6); // Portal token valid for 6 hours

    return {
      token: 'mock-session-token-xyz-12345',
      expiresAt,
    };
  }

  async fileGstr1(payload, token) {
    console.log('[MockGsp] Filing GSTR-1 with token:', token);
    
    if (token !== 'mock-session-token-xyz-12345') {
      const err = new Error('GSP Session Expired: Please verify OTP.');
      err.status = 401;
      throw err;
    }

    return {
      referenceId: `G1-MOCK-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'FILED',
    };
  }

  async getGstr3bSummary(month, year, token) {
    console.log(`[MockGsp] Retrieving GSTR-3B for ${month}-${year}`);

    if (token !== 'mock-session-token-xyz-12345') {
      const err = new Error('GSP Session Expired: Please verify OTP.');
      err.status = 401;
      throw err;
    }

    // Return mock computed aggregates
    return {
      taxPeriod: `${month}-${year}`,
      summary: {
        outwardSupplies: {
          taxableValue: 125000.00,
          igst: 18000.00,
          cgst: 2250.00,
          sgst: 2250.00,
        },
        eligibleItc: {
          importGoods: 0.0,
          otherItc: 4500.00, // Input tax credits from purchases
        },
      },
    };
  }

  async generateEwayBill(payload, token) {
    console.log('[MockGsp] Generating E-Way Bill for vehicle:', payload.vehicleNo);

    if (token !== 'mock-session-token-xyz-12345') {
      const err = new Error('GSP Session Expired: Please verify OTP.');
      err.status = 401;
      throw err;
    }

    // E-Way Bill must be 12-digit numeric string
    const ewayBillNo = `${Math.floor(100000000000 + Math.random() * 900000000000)}`;

    return {
      ewayBillNo,
      ewayBillDate: new Date(),
    };
  }
}
