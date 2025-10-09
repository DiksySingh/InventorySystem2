const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(
      __dirname,
      "../../uploads/dispatchedSystems/dispatchBillPhoto"
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
    cb(null, `${file.fieldname}-${timestamp}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|mp4|mov|avi|mkv/;
  const extValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeValid = allowedTypes.test(file.mimetype);
  if (extValid && mimeValid) cb(null, true);
  else
    cb(
      new Error(
        "Only image (.jpeg, .jpg, .png) and video (.mp4, .mov, .avi, .mkv) files are allowed!"
      )
    );
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // Max 50MB per file
}).any(); // Accept any field name

// Middleware to validate files
const fileHandler = async (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message:
          err.code === "LIMIT_FILE_SIZE"
            ? "File too large! Must be under 50MB."
            : err.message,
      });
    }

    const allFiles = req.files || [];
    for (const file of allFiles) {
      const ext = path.extname(file.originalname).toLowerCase();
      if ([".jpeg", ".jpg", ".png"].includes(ext) && file.size > 2 * 1024 * 1024) {
        await Promise.all(allFiles.map((f) => fs.unlink(f.path)));
        return res.status(400).json({
          success: false,
          message: `Image "${file.originalname}" exceeds 2MB limit.`,
        });
      }
    }

    next();
  });
};

module.exports = fileHandler;
