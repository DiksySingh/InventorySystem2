const prisma = require("../../config/prismaClient");

const showAdminApprovedPaymentRequests = async (req, res) => {
  try {
    const userRole = req.user?.role;

    if (!["Accounts"].includes(userRole?.name)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const paymentRequests = await prisma.payment.findMany({
      where: {
        adminApprovalStatus: true,      
        approvedByAdmin: { not: null },
        paymentStatus: null,
        paymentTransferredBy: null
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        poId: true,
        amount: true,
        billpaymentType: true,
        createdAt: true,
        purchaseOrder: {
          select: {
            poNumber: true,
            companyName: true,
            vendorName: true,
            currency: true,
          },
        },
        paymentCreatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const formatted = paymentRequests.map((r) => ({
      paymentRequestId: r.id,
      poId: r.poId,
      poNumber: r.purchaseOrder?.poNumber,
      companyName: r.purchaseOrder?.companyName,
      vendorName: r.purchaseOrder?.vendorName,
      currency: r.purchaseOrder?.currency,
      requestedAmount: Number(r.amount),
      billpaymentType: r.billpaymentType,
      paymentRequestedBy: r.paymentCreatedBy?.name,
      createdAt: r.createdAt,
    }));

    return res.status(200).json({
      success: true,
      message: "Admin-approved payment requests for accounts fetched successfully",
      count: formatted.length,
      data: formatted,
    });

  } catch (error) {
    console.error("ADMIN APPROVED PAYMENT REQUEST ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const approveOrRejectPaymentRequestByAccounts = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!["Accounts"].includes(userRole.name)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const { paymentRequestId, status, remarks } = req.body;

    if (!paymentRequestId || !status || !remarks) {
      return res.status(400).json({
        success: false,
        message: "paymentRequestId, status and remarks are required",
      });
    }

    if (!["PAID", "REJECTED"].includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Status must be APPROVED or REJECTED",
      });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentRequestId }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment request not found",
      });
    }

    if (payment.paymentStatus !== null) {
      return res.status(400).json({
        success: false,
        message: "Payment already processed",
      });
    }

    // Update
    const updated = await prisma.payment.update({
      where: { id: paymentRequestId },
      data: {
        paymentStatus: status === "PAID" ? true : false,
        paymentDate: new Date(),
        paymentRemark: remarks.trim() || null,
        paymentTransferredBy: userId
      },
    });

    return res.status(200).json({
      success: true,
      message: `Payment request ${status.toLowerCase()} successfully`,
      data: updated,
    });

  } catch (error) {
    console.error("Handle Payment Request ERROR:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = {
    showAdminApprovedPaymentRequests,
    approveOrRejectPaymentRequestByAccounts
}