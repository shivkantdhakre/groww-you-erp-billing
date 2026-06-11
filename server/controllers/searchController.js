import prisma from "../utils/prisma.js";

// GET /api/search?q=... - Combined top bar search
export const searchAll = async (req, res) => {
  const { q } = req.query;

  if (!q || typeof q !== "string") {
    return res.status(200).json([]);
  }

  const companyId = req.user.companyId;

  try {
    // Run queries concurrently using Promise.all()
    const [customers, vendors, items, invoices] = await Promise.all([
      // 1. Search Customers
      prisma.customer.findMany({
        where: {
          companyId,
          isActive: true,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { mobile: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, name: true, mobile: true },
      }),

      // 2. Search Vendors
      prisma.vendor.findMany({
        where: {
          companyId,
          isActive: true,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { mobile: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, name: true, mobile: true },
      }),

      // 3. Search Items (Inventory)
      prisma.item.findMany({
        where: {
          companyId,
          isActive: true,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, name: true, sku: true },
      }),

      // 4. Search Invoices
      prisma.invoice.findMany({
        where: {
          companyId,
          invoiceNo: { contains: q, mode: "insensitive" },
        },
        take: 5,
        select: { id: true, invoiceNo: true, invoiceType: true },
      }),
    ]);

    // Format all search results into a unified standard structure
    const results = [];

    customers.forEach((c) => {
      results.push({
        id: c.id,
        type: "Customer",
        name: c.name,
        details: `Mobile: ${c.mobile}`,
        link: "/customers",
      });
    });

    vendors.forEach((v) => {
      results.push({
        id: v.id,
        type: "Vendor",
        name: v.name,
        details: `Mobile: ${v.mobile}`,
        link: "/vendors",
      });
    });

    items.forEach((i) => {
      results.push({
        id: i.id,
        type: "Item",
        name: i.name,
        details: `SKU: ${i.sku || "N/A"}`,
        link: "/inventory",
      });
    });

    invoices.forEach((inv) => {
      const typeLabel = inv.invoiceType === "SALE" ? "Sales Invoice" : "Purchase Invoice";
      results.push({
        id: inv.id,
        type: "Invoice",
        name: `${typeLabel} - ${inv.invoiceNo}`,
        details: `Type: ${inv.invoiceType}`,
        link: "/day-book", // Direct user to the day book to view logs
      });
    });

    res.status(200).json(results);
  } catch (error) {
    console.error("Combined Search Error:", error);
    res.status(500).json({ error: "Failed to perform global search" });
  }
};
