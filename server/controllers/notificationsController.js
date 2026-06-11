import prisma from "../utils/prisma.js";

// GET /api/notifications - Get recent notifications
export const getNotifications = async (req, res) => {
  try {
    const list = await prisma.notification.findMany({
      where: { companyId: req.user.companyId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.status(200).json(list);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

// PUT /api/notifications/:id/read - Mark notification as read
export const markAsRead = async (req, res) => {
  const notificationId = parseInt(req.params.id);

  if (isNaN(notificationId)) {
    return res.status(400).json({ error: "Invalid notification ID" });
  }

  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.companyId !== req.user.companyId) {
      return res.status(404).json({ error: "Notification not found" });
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Failed to update notification" });
  }
};

// DELETE /api/notifications/clear - Clear all company notifications
export const clearNotifications = async (req, res) => {
  try {
    await prisma.notification.deleteMany({
      where: { companyId: req.user.companyId },
    });
    res.status(200).json({ message: "All notifications cleared" });
  } catch (error) {
    console.error("Error clearing notifications:", error);
    res.status(500).json({ error: "Failed to clear notifications" });
  }
};
