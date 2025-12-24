const prisma = require("../../config/prismaClient");
const bcrypt = require("bcrypt");

const updatePassword = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current Password & New Password are required.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid current password.",
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, refreshToken: null },
    });

    return res
      .status(200)
      .clearCookie("accessToken", { httpOnly: true, secure: false })
      .clearCookie("refreshToken", { httpOnly: true, secure: false })
      .json({
        success: true,
        message: "Password updated successfully.",
        shouldLogout: true
      });
  } catch (error) {
    console.error("Password Update Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = {
  updatePassword,
};
