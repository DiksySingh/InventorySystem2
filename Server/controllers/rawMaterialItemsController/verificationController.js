const prisma = require("../../config/prismaClient");

const showAllPOWithBills = async (req, res) => {
  try {
    const userRole = req.user?.role;

    if (!["Verification"].includes(userRole.name)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const pos = await prisma.purchaseOrder.findMany({
      select: {
        id: true,
        poNumber: true,
        companyName: true,
        vendorName: true,
        currency: true,
        poDate: true,
        grandTotal: true,
        foreignGrandTotal: true,
        items: {
          select: {
            itemId: true,
            itemName: true,
            itemSource: true,
            quantity: true,
            unit: true,
          },
        },
        bills: {
          select: {
            id: true,
            invoiceNumber: true,
            fileUrl: true,
            createdAt: true,
          },
        },
        payments: {
          select: {
            amount: true,
            paymentStatus: true,
            adminApprovalStatus: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = pos.map((po) => {
      const isINR = (po.currency || "INR").toUpperCase() === "INR";

      const grandTotal = Number(
        isINR ? po.grandTotal : po.foreignGrandTotal || 0
      );

      const totalPaid = po.payments
        ?.filter((p) => p.paymentStatus === true && p.adminApprovalStatus === true)
        ?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      return {
        poId: po.id,
        poNumber: po.poNumber,
        companyName: po.companyName,
        vendorName: po.vendorName,
        poDate: po.poDate,
        hasBill: po.bills.length > 0,   
        currency: po.currency,           // NEW FLAG
        grandTotal,
        totalPaid,
        remainingAmount: Number(grandTotal) - Number(totalPaid),
        items: po.items,
        bills: po.bills,                           // If empty => no invoice uploaded yet
      };
    });

    res.status(200).json({
      success: true,
      message: "All Purchase Orders (with or without invoices)",
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("SHOW ALL POS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const showPendingPaymentRequests = async (req, res) => {
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
            vendor: { select: { name: true } },
            company: { select: { name: true } },
            payments: {
              select: {
                amount: true,
                paymentStatus: true,
                adminApprovalStatus: true
              }
            }
          }
        },
        debitNote: {
          select: {
            id: true,
            debitNoteNo: true,
            drNoteDate: true
          }
        },
        paymentCreatedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = payments.map(pay => {
      const po = pay.purchaseOrder;
      const currency = (po.currency || "INR").toUpperCase();
      const isINR = currency === "INR";

      // const grandTotal = Number(
      //   isINR ? po.grandTotal : po.foreignGrandTotal || 0
      // );

      // const totalPaid = po.payments
      //   ?.filter(p => p.paymentStatus && p.adminApprovalStatus)
      //   ?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // const pendingAfterThis = grandTotal - (totalPaid + Number(pay.amount));

      return {
        paymentRequestId: pay.id,
        poId: po.id,
        poNumber: po.poNumber,
        companyName: po.company?.name,
        vendorName: po.vendor?.name,
        currency,
        requestedAmount: Number(pay.amount),
        billpaymentType: pay.billpaymentType,
        paymentRequestedBy: pay.paymentCreatedBy.name,
        createdAt: pay.createdAt
      };
    });

    return res.status(200).json({
      success: true,
      message: "Pending payment requests",
      count: formatted.length,
      data: formatted
    });

  } catch (error) {
    console.error("SHOW PAYMENT REQUEST ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const approveOrRejectPaymentRequest = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!["Verification"].includes(userRole.name)) {
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

    if (!["APPROVED", "REJECTED"].includes(status.toUpperCase())) {
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

    if (payment.docApprovalStatus !== null) {
      return res.status(400).json({
        success: false,
        message: "Payment already processed",
      });
    }


    // Update
    const updated = await prisma.payment.update({
      where: { id: paymentRequestId },
      data: {
        docApprovalStatus: status.toUpperCase() === "APPROVED" ? true : false,
        docApprovalDate: new Date(),
        docApprovalRemark: remarks.trim(),
        docApprovedBy: userId
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
  showAllPOWithBills,
  showPendingPaymentRequests,
  approveOrRejectPaymentRequest,
};
