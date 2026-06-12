/**
 * Base Adapter class for GSP (GST Suvidha Provider) operations.
 * Allows switching between sandbox mock environments and production GSP vendors (e.g., ClearTax).
 */
export class GspAdapter {
  /**
   * Authenticates with GSP / GSTN portal.
   * @param {string} clientId
   * @param {string} clientSecret
   * @param {string} [otp] - OTP received on the registered mobile number
   * @returns {Promise<{token: string, expiresAt: Date}>}
   */
  async authenticate(clientId, clientSecret, otp) {
    throw new Error('Method authenticate() must be implemented.');
  }

  /**
   * Files GSTR-1 with the portal.
   * @param {Object} payload - standard mapped GSTR-1 data
   * @param {string} token - portal session token
   * @returns {Promise<{referenceId: string, status: string}>}
   */
  async fileGstr1(payload, token) {
    throw new Error('Method fileGstr1() must be implemented.');
  }

  /**
   * Fetches monthly GSTR-3B summary calculations.
   * @param {string} month - MM format
   * @param {string} year - YYYY format
   * @param {string} token - portal session token
   * @returns {Promise<Object>}
   */
  async getGstr3bSummary(month, year, token) {
    throw new Error('Method getGstr3bSummary() must be implemented.');
  }

  /**
   * Generates a new E-Way Bill.
   * @param {Object} payload - E-way bill details
   * @param {string} token - portal session token
   * @returns {Promise<{ewayBillNo: string, ewayBillDate: Date}>}
   */
  async generateEwayBill(payload, token) {
    throw new Error('Method generateEwayBill() must be implemented.');
  }
}
