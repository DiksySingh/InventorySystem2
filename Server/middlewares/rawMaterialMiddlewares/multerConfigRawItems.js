const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(
      __dirname,
      "../../uploads/rawMaterial/billPhoto"
    );

    try {
      await fs.mkdir(uploadPath, { recursive: true });
    } catch (err) {
      return cb(err);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now().toString();
    const ext = path.extname(file.originalname).toLowerCase();
    const fieldName = file.fieldname;
    cb(null, `${fieldName}-${timestamp}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extValid = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimeValid = allowedTypes.test(file.mimetype);
  if (extValid && mimeValid) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only image (.jpeg, .jpg, .png) and pdf files are allowed!"
      )
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).fields([{ name: "billPhoto", maxCount: 1 }]);

const uploadHandler = (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message:
          err.code === "LIMIT_FILE_SIZE"
            ? "File too large! Must be under 5MB."
            : err.message,
      });
    }

    // ✅ Safely handle when no file is uploaded
    const allFiles = req.files ? Object.values(req.files).flat() : [];

    for (const file of allFiles) {
      const ext = path.extname(file.originalname).toLowerCase();

      if (
        [".jpeg", ".jpg", ".png"].includes(ext) &&
        file.size > 2 * 1024 * 1024
      ) {
        await Promise.all(allFiles.map((f) => fs.unlink(f.path)));
        return res.status(400).json({
          success: false,
          message: `Image "${file.originalname}" exceeds 2MB limit.`,
        });
      }

      if (
        [".pdf"].includes(ext) &&
        file.size > 5 * 1024 * 1024
      ) {
        await Promise.all(allFiles.map((f) => fs.unlink(f.path)));
        return res.status(400).json({
          success: false,
          message: `Pdf "${file.originalname}" exceeds 5MB limit.`,
        });
      }
    }

    next();
  });
};

module.exports = uploadHandler;

