import prisma from '../utils/prisma.js';
import { gstService } from '../utils/gstService.js';

/**
 * GET /api/compliance/gst/health?month=MM&year=YYYY
 * Verifies if any item, customer, or branch involved in this period has a default '000000' PIN/HSN code.
 */
export const getDataHealthStatus = async (req, res) => {
  const { month, year } = req.query;
  const companyId = req.user.companyId;

  if (!month || !year) {
    return res.status(400).json({ error: 'Month and year are required.' });
  }

  try {
    const m = parseInt(month);
    const y = parseInt(year);
    const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

    // 1. Find participating sales invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        invoiceType: 'SALE',
        invoiceDate: { gte: startDate, lte: endDate },
      },
      include: {
        customer: true,
        branch: true,
        items: {
          include: { item: true },
        },
      },
    });

    const invalidItems = new Set();
    const invalidCustomers = new Set();
    const invalidBranches = new Set();

    for (const inv of invoices) {
      // Check customer pincode
      if (!inv.customer || inv.customer.pincode === '000000' || !inv.customer.pincode) {
        invalidCustomers.add(JSON.stringify({ id: inv.customer?.id, name: inv.customer?.name || 'Unknown', mobile: inv.customer?.mobile }));
      }
      
      // Check branch pincode
      if (!inv.branch || inv.branch.pincode === '000000' || !inv.branch.pincode) {
        invalidBranches.add(JSON.stringify({ id: inv.branch?.id, name: inv.branch?.name || 'Unknown' }));
      }

      // Check item HSN codes
      for (const line of inv.items) {
        if (line.item.hsnCode === '000000' || !line.item.hsnCode) {
          invalidItems.add(JSON.stringify({ id: line.item.id, name: line.item.name, sku: line.item.sku }));
        }
      }
    }

    const items = Array.from(invalidItems).map(s => JSON.parse(s));
    const customers = Array.from(invalidCustomers).map(s => JSON.parse(s));
    const branches = Array.from(invalidBranches).map(s => JSON.parse(s));

    const blockFiling = items.length > 0 || customers.length > 0 || branches.length > 0;

    res.status(200).json({
      blockFiling,
      issues: {
        items,
        customers,
        branches,
      },
    });
  } catch (error) {
    console.error('Data Health Check Error:', error);
    res.status(500).json({ error: 'Failed to perform compliance health check.' });
  }
};

/**
 * POST /api/compliance/gst/otp/request
 * Initiates the OTP trigger to the user's phone registered with GSTN.
 */
export const requestOtp = async (req, res) => {
  try {
    // Mock triggering OTP successfully
    res.status(200).json({ message: 'OTP successfully sent to the mobile registered on the GST portal.' });
  } catch (error) {
    console.error('OTP Request Error:', error);
    res.status(500).json({ error: 'Failed to send OTP.' });
  }
};

/**
 * POST /api/compliance/gst/otp/verify
 * Submits the OTP code to acquire/renew the 6-hour GSP session token.
 */
export const verifyOtp = async (req, res) => {
  const { otp } = req.body;

  if (!otp) {
    return res.status(400).json({ error: 'OTP code is required.' });
  }

  try {
    const session = await gstService.authenticate(otp);
    res.status(200).json({
      message: 'Portal authentication successful.',
      token: session.token,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error('OTP Verification Error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'OTP verification failed.' });
  }
};

/**
 * GET /api/compliance/gst/gstr1/preview?month=MM&year=YYYY
 * Previews GSTR-1 payload before filing.
 */
export const previewGstr1 = async (req, res) => {
  const { month, year } = req.query;
  const companyId = req.user.companyId;

  if (!month || !year) {
    return res.status(400).json({ error: 'Month and year are required.' });
  }

  try {
    const payload = await gstService.compileGstr1Payload(companyId, month, year);
    res.status(200).json(payload);
  } catch (error) {
    console.error('Preview GSTR-1 Error:', error);
    res.status(500).json({ error: 'Failed to preview GSTR-1 report.' });
  }
};

/**
 * POST /api/compliance/gst/gstr1/file
 * Files GSTR-1 for the month. Enforces session check and data health block.
 */
export const fileGstr1 = async (req, res) => {
  const { month, year } = req.body;
  const companyId = req.user.companyId;

  if (!month || !year) {
    return res.status(400).json({ error: 'Month and year are required.' });
  }

  const token = gstService.getSessionToken();
  if (!token) {
    return res.status(401).json({ error: 'GSTN_SESSION_EXPIRED', message: 'GST portal token is missing or expired. Authenticate via OTP.' });
  }

  try {
    // 1. Run Data Health checks to block files containing '000000' values
    const m = parseInt(month);
    const y = parseInt(year);
    const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        invoiceType: 'SALE',
        invoiceDate: { gte: startDate, lte: endDate },
      },
      include: {
        customer: true,
        branch: true,
        items: { include: { item: true } },
      },
    });

    let hasViolations = false;
    for (const inv of invoices) {
      if (inv.customer?.pincode === '000000' || inv.branch?.pincode === '000000') {
        hasViolations = true;
        break;
      }
      const itemViolated = inv.items.some(line => line.item.hsnCode === '000000');
      if (itemViolated) {
        hasViolations = true;
        break;
      }
    }

    if (hasViolations) {
      return res.status(400).json({
        error: 'DATA_HEALTH_VIOLATION',
        message: 'Filing blocked: Clean all default "000000" PIN/HSN parameters before uploading.',
      });
    }

    // 2. Compile payload and upload
    const payload = await gstService.compileGstr1Payload(companyId, month, year);
    const result = await gstService.adapter.fileGstr1(payload, token);

    // 3. Update Invoice records status
    await prisma.invoice.updateMany({
      where: {
        companyId,
        invoiceType: 'SALE',
        invoiceDate: { gte: startDate, lte: endDate },
      },
      data: {
        gstFilingStatus: 'FILED',
        gstFilingDate: new Date(),
      },
    });

    res.status(200).json({
      message: 'GSTR-1 successfully uploaded to GSTN staging portal.',
      referenceId: result.referenceId,
      status: result.status,
    });
  } catch (error) {
    console.error('File GSTR-1 Error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'GSTR-1 filing failed.' });
  }
};

/**
 * GET /api/compliance/gst/gstr3b/summary?month=MM&year=YYYY
 * Computes monthly GSTR-3B liability summary.
 */
export const getGstr3bSummary = async (req, res) => {
  const { month, year } = req.query;
  const companyId = req.user.companyId;

  if (!month || !year) {
    return res.status(400).json({ error: 'Month and year are required.' });
  }

  const token = gstService.getSessionToken();
  if (!token) {
    return res.status(401).json({ error: 'GSTN_SESSION_EXPIRED', message: 'GST portal token is missing or expired. Authenticate via OTP.' });
  }

  try {
    const summary = await gstService.compileGstr3bSummary(companyId, month, year);
    res.status(200).json(summary);
  } catch (error) {
    console.error('GSTR-3B Summary Error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to calculate GSTR-3B summary.' });
  }
};

/**
 * POST /api/compliance/ewaybill/generate/:invoiceId
 * Generates an E-way bill for a sales invoice, locking dispatch pincodes and supporting distance overrides.
 */
export const generateEwayBill = async (req, res) => {
  const invoiceId = parseInt(req.params.invoiceId);
  const { transporterId, transporterName, transportMode, vehicleNo, distanceKm } = req.body;
  const companyId = req.user.companyId;

  if (isNaN(invoiceId)) {
    return res.status(400).json({ error: 'Invalid invoice ID.' });
  }

  if (distanceKm && (distanceKm < 1 || distanceKm > 4000)) {
    return res.status(400).json({ error: 'Transit distance override must be between 1 and 4000 km.' });
  }

  const token = gstService.getSessionToken();
  if (!token) {
    return res.status(401).json({ error: 'GSTN_SESSION_EXPIRED', message: 'GST portal token is missing or expired. Authenticate via OTP.' });
  }

  try {
    // 1. Fetch Invoice
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId, invoiceType: 'SALE' },
      include: {
        customer: true,
        branch: true,
        items: { include: { item: true } },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    // 2. Enforce Data Health Validation
    if (
      !invoice.customer || invoice.customer.pincode === '000000' ||
      !invoice.branch || invoice.branch.pincode === '000000' ||
      invoice.items.some(line => line.item.hsnCode === '000000')
    ) {
      return res.status(400).json({
        error: 'DATA_HEALTH_VIOLATION',
        message: 'Default "000000" PIN/HSN fields detected. Update master records before generating E-Way Bill.',
      });
    }

    // 3. Execute adapter request
    const payload = {
      invoiceNo: invoice.invoiceNo,
      invoiceDate: invoice.invoiceDate,
      dispatchPincode: invoice.branch.pincode,
      shippingPincode: invoice.customer.pincode,
      transporterId,
      transporterName,
      transportMode,
      vehicleNo,
      distanceKm: distanceKm || 150, // default placeholder distance if not supplied
    };

    const result = await gstService.adapter.generateEwayBill(payload, token);

    // 4. Update Invoice with transit metadata & freeze pincodes
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        ewayBillNo: result.ewayBillNo,
        ewayBillDate: result.ewayBillDate,
        dispatchPincode: invoice.branch.pincode,
        shippingPincode: invoice.customer.pincode,
        transporterId,
        transporterName,
        transportMode,
        vehicleNo,
        distanceKm: distanceKm || 150,
      },
    });

    res.status(200).json({
      message: 'E-way bill successfully generated.',
      ewayBillNo: updatedInvoice.ewayBillNo,
      ewayBillDate: updatedInvoice.ewayBillDate,
    });
  } catch (error) {
    console.error('Generate E-Way Bill Error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'E-way bill generation failed.' });
  }
};

/**
 * GET /api/compliance/gst/session-status
 * Exposes the active portal session token existence and expiration.
 */
export const getSessionStatus = async (req, res) => {
  try {
    const details = gstService.getSessionDetails();
    res.status(200).json({
      active: !!details.token,
      expiresAt: details.expiresAt,
    });
  } catch (error) {
    console.error('Session Status Error:', error);
    res.status(500).json({ error: 'Failed to retrieve GSP session status.' });
  }
};

/**
 * GET /api/compliance/orphans
 * Queries Prisma directly for all returns missing invoice references.
 */
export const getOrphanedReturns = async (req, res) => {
  const companyId = req.user.companyId;
  try {
    const orphans = await prisma.return.findMany({
      where: {
        companyId,
        invoiceId: null,
        isWrittenOff: false,
        legacyInvoiceNo: null,
      },
      include: {
        customer: true,
      },
      orderBy: {
        returnDate: 'desc',
      },
    });
    res.status(200).json(orphans);
  } catch (error) {
    console.error('Get Orphaned Returns Error:', error);
    res.status(500).json({ error: 'Failed to fetch orphaned returns.' });
  }
};

/**
 * POST /api/compliance/orphans/resolve
 * Resolves an orphan return either by marking it as written off or by mapping it to a legacy/existing invoice.
 */
export const resolveOrphanReturn = async (req, res) => {
  const { returnId, action, invoiceNo, invoiceDate } = req.body;
  const companyId = req.user.companyId;

  if (!returnId || !action) {
    return res.status(400).json({ error: 'returnId and action are required.' });
  }

  try {
    const returnRecord = await prisma.return.findFirst({
      where: { id: parseInt(returnId), companyId },
    });

    if (!returnRecord) {
      return res.status(404).json({ error: 'Return record not found.' });
    }

    if (action === 'WRITE_OFF') {
      await prisma.return.update({
        where: { id: returnRecord.id },
        data: { isWrittenOff: true },
      });
      return res.status(200).json({ message: 'Return record written off successfully.' });
    }

    if (action === 'MAP_INVOICE') {
      if (!invoiceNo || !invoiceDate) {
        return res.status(400).json({ error: 'invoiceNo and invoiceDate are required for mapping.' });
      }

      const invDate = new Date(invoiceDate);
      const retDate = new Date(returnRecord.returnDate);

      // Chronological validation: original invoice date must precede or equal return date
      if (invDate > retDate) {
        return res.status(400).json({ 
          error: 'CHRONOLOGICAL_ERROR', 
          message: 'The original invoice date cannot be after the return date.' 
        });
      }

      // Check if the invoice exists in our system
      const existingInvoice = await prisma.invoice.findFirst({
        where: { companyId, invoiceNo },
      });

      if (existingInvoice) {
        await prisma.return.update({
          where: { id: returnRecord.id },
          data: {
            invoiceId: existingInvoice.id,
            invoiceNo: existingInvoice.invoiceNo,
          },
        });
        return res.status(200).json({ message: 'Return successfully linked to existing invoice.' });
      } else {
        await prisma.return.update({
          where: { id: returnRecord.id },
          data: {
            legacyInvoiceNo: invoiceNo,
            legacyInvoiceDate: invDate,
          },
        });
        return res.status(200).json({ message: 'Return successfully mapped to legacy/external invoice.' });
      }
    }

    return res.status(400).json({ error: 'Invalid action specified.' });
  } catch (error) {
    console.error('Resolve Orphan Return Error:', error);
    res.status(500).json({ error: 'Failed to resolve orphaned return.' });
  }
};
