import prisma from './prisma.js';
import { MockGspAdapter } from './mockGspAdapter.js';
import { ClearTaxAdapter } from './cleartaxAdapter.js';

// Cache active GSP portal session details in memory
let gspSession = {
  token: null,
  expiresAt: null,
};

class GstService {
  constructor() {
    this.providerType = process.env.GSP_PROVIDER || 'mock';
    if (this.providerType === 'cleartax') {
      this.adapter = new ClearTaxAdapter();
    } else {
      this.adapter = new MockGspAdapter();
    }
  }

  /**
   * Performs authentication and updates active token caching.
   */
  async authenticate(otp) {
    const clientId = process.env.GSP_CLIENT_ID || 'mock-client-id';
    const clientSecret = process.env.GSP_CLIENT_SECRET || 'mock-client-secret';

    const session = await this.adapter.authenticate(clientId, clientSecret, otp);
    gspSession = {
      token: session.token,
      expiresAt: session.expiresAt,
    };
    return gspSession;
  }

  /**
   * Retrieves active token or null if missing/expired.
   */
  getSessionToken() {
    if (gspSession.token && gspSession.expiresAt && new Date() < gspSession.expiresAt) {
      return gspSession.token;
    }
    return null;
  }

  /**
   * Compiles GSTR-1 payload for the company and month.
   */
  async compileGstr1Payload(companyId, month, year) {
    const m = parseInt(month);
    const y = parseInt(year);
    const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

    // 1. Fetch Sales Invoices in range
    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        invoiceType: 'SALE',
        invoiceDate: { gte: startDate, lte: endDate },
      },
      include: {
        customer: true,
        items: {
          include: { item: true },
        },
      },
    });

    // 2. Fetch Sales Returns (Credit Notes) in range
    const returns = await prisma.return.findMany({
      where: {
        companyId,
        returnType: 'SALE',
        returnDate: { gte: startDate, lte: endDate },
      },
      include: {
        customer: true,
        invoice: true,
        items: {
          include: { item: true },
        },
      },
    });

    const b2b = [];
    const b2cs = [];
    const cdnr = [];
    const hsnDataMap = new Map();

    // Compile Invoice Data
    for (const inv of invoices) {
      const isRegistered = inv.customer && inv.customer.gstin && inv.customer.gstin.trim().length > 0;
      
      // Aggregate HSN Summary
      for (const line of inv.items) {
        const hsn = line.item.hsnCode || '000000';
        const rate = line.item.gstPercentage || 0.0;
        const key = `${hsn}_${rate}`;

        const existing = hsnDataMap.get(key) || {
          hsn_sc: hsn,
          qty: 0,
          val: 0.0,
          txval: 0.0,
          iamt: 0.0,
          camt: 0.0,
          samt: 0.0,
        };

        const subtotal = line.price * line.qty;
        existing.qty += line.qty;
        existing.val += line.total;
        existing.txval += subtotal;

        // Split tax components
        const stateCode = inv.customer?.gstin?.substring(0, 2) || '09'; // Default state code (e.g. UP)
        const isInterstate = stateCode !== '09'; // Assume local if matches (mock logic)
        
        if (isInterstate) {
          existing.iamt += line.gstAmount;
        } else {
          existing.camt += line.gstAmount / 2;
          existing.samt += line.gstAmount / 2;
        }

        hsnDataMap.set(key, existing);
      }

      if (isRegistered) {
        b2b.push({
          ctin: inv.customer.gstin,
          inv: [{
            inum: inv.invoiceNo,
            idt: inv.invoiceDate.toISOString().split('T')[0],
            val: inv.grandTotal,
            pos: inv.customer.gstin.substring(0, 2),
            rchrg: 'N',
            inv_typ: 'R',
            itms: inv.items.map((line, idx) => ({
              num: idx + 1,
              itm_det: {
                txval: line.price * line.qty,
                rt: line.item.gstPercentage,
                iamt: line.gstAmount,
              },
            })),
          }],
        });
      } else {
        b2cs.push({
          pos: '09', // Mock State Pos
          txval: inv.items.reduce((sum, line) => sum + (line.price * line.qty), 0),
          rt: inv.items[0]?.item.gstPercentage || 0.0,
          iamt: inv.items.reduce((sum, line) => sum + line.gstAmount, 0),
        });
      }
    }

    // Compile Credit Notes
    for (const ret of returns) {
      if (ret.invoice) {
        cdnr.push({
          ctin: ret.customer?.gstin || '',
          nt: [{
            ntty: 'C', // Credit Note
            nt_num: ret.returnNo,
            nt_dt: ret.returnDate.toISOString().split('T')[0],
            val: ret.grandTotal,
            inum: ret.invoice.invoiceNo,
            idt: ret.invoice.invoiceDate.toISOString().split('T')[0],
            pos: ret.customer?.gstin?.substring(0, 2) || '09',
            itms: ret.items.map((line, idx) => ({
              num: idx + 1,
              itm_det: {
                txval: line.price * line.qty,
                rt: line.item.gstPercentage,
                iamt: line.gstAmount,
              },
            })),
          }],
        });
      }
    }

    return {
      gstin: '09BITPM9999Z1Z0', // Mock filer GSTIN
      fp: `${month}${year}`,
      b2b,
      b2cs,
      cdnr,
      hsn: {
        data: Array.from(hsnDataMap.values()),
      },
    };
  }

  /**
   * Computes summaries for GSTR-3B calculations.
   */
  async compileGstr3bSummary(companyId, month, year) {
    const m = parseInt(month);
    const y = parseInt(year);
    const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

    // Sales Outward Tax
    const salesItems = await prisma.invoiceItem.findMany({
      where: {
        invoice: {
          companyId,
          invoiceType: 'SALE',
          invoiceDate: { gte: startDate, lte: endDate },
        },
      },
    });

    // Purchases Inward ITC
    const purchaseItems = await prisma.invoiceItem.findMany({
      where: {
        invoice: {
          companyId,
          invoiceType: 'PURCHASE',
          invoiceDate: { gte: startDate, lte: endDate },
        },
      },
    });

    let salesTaxable = 0;
    let salesGst = 0;
    salesItems.forEach((item) => {
      salesTaxable += item.price * item.qty;
      salesGst += item.gstAmount;
    });

    let purchaseTaxable = 0;
    let purchaseGst = 0;
    purchaseItems.forEach((item) => {
      purchaseTaxable += item.price * item.qty;
      purchaseGst += item.gstAmount;
    });

    return {
      taxPeriod: `${month}-${year}`,
      outwardSupplies: {
        taxableValue: Math.round(salesTaxable * 100) / 100,
        cgst: Math.round((salesGst / 2) * 100) / 100,
        sgst: Math.round((salesGst / 2) * 100) / 100,
        igst: 0.0,
      },
      eligibleItc: {
        igst: 0.0,
        cgst: Math.round((purchaseGst / 2) * 100) / 100,
        sgst: Math.round((purchaseGst / 2) * 100) / 100,
      },
    };
  }
}

export const gstService = new GstService();
