import prisma from '../utils/prisma.js';
import pdfService from '../utils/pdfService.js';

// GET /api/pdf/invoices/:id - Generate and return PDF invoice url or raw file attachment
export const generateInvoicePDF = async (req, res) => {
  const invoiceId = parseInt(req.params.id);
  const layout = req.query.layout === 'Thermal' ? 'Thermal' : 'A4';
  const forceRegenerate = req.query.regenerate === 'true';

  if (isNaN(invoiceId)) {
    return res.status(400).json({ error: 'Invalid Invoice ID' });
  }

  try {
    // 1. Fetch the invoice with all details
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        company: true,
        branch: true,
        customer: true,
        vendor: true,
        items: {
          include: {
            item: true
          }
        }
      }
    });

    if (!invoice || invoice.companyId !== req.user.companyId) {
      return res.status(404).json({ error: 'Invoice not found or unauthorized' });
    }

    // 2. Return cached PDF URL if already generated and forceRegenerate is false
    // (Note: we generate/cache separate URLs if needed, but here we cache standard format)
    if (invoice.pdfUrl && !forceRegenerate && req.query.download !== 'true') {
      return res.status(200).json({ pdfUrl: invoice.pdfUrl });
    }

    // 3. Generate the PDF buffer
    const pdfBuffer = await pdfService.generatePDF(invoice, layout);

    // 4. If direct download is requested, stream buffer directly to response
    if (req.query.download === 'true') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="invoice-${invoice.invoiceNo}.pdf"`);
      return res.send(pdfBuffer);
    }

    // 5. Upload buffer to cloud storage (or local storage fallback)
    const pdfUrl = await pdfService.uploadPDF(invoice, pdfBuffer);

    // 6. Update database record
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdfUrl }
    });

    res.status(200).json({ pdfUrl });
  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate PDF invoice', details: error.message });
  }
};
