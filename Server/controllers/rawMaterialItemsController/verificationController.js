const prisma = require("../../config/prismaClient");

const showPaymentRequestWithDocuments = async (req, res) => {
  try {
    const userRole = req.user?.role;

    if (!["Verification"].includes(userRole.name)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const payments = await prisma.payment.findMany({
      where: {
       docApprovalStatus: null
      },
      include: {
        purchaseOrder: {
          include: {
            vendor: true,
            company: true,
            bills: true,
          },
        },
        debitNote: true,
        paymentCreatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      message: "Payment requests with documents",
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    console.error("SHOW PAYMENT REQUEST ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


module.exports = {
    showPaymentRequestWithDocuments,

}