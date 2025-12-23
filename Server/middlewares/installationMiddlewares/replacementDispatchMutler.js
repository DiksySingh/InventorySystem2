const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(
      __dirname,
      "../../uploads/replacementDispatch/dispatchBill"
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
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeValid = allowedTypes.test(file.mimetype.toLowerCase());

  if (extValid && mimeValid) cb(null, true);
  else cb(new Error("Only image (.jpeg, .jpg, .png) or PDF (.pdf) files are allowed!"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 },
}).single("dispatchBillFile");

const fileUploadHandler = async (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message:
          err.code === "LIMIT_FILE_SIZE"
            ? "File too large! Must be under 15MB."
            : err.message,
      });
    }

    const allFiles = req.files || [];

    for (const file of allFiles) {
      const ext = path.extname(file.originalname).toLowerCase();

      if ([".jpeg", ".jpg", ".png"].includes(ext) && file.size > 5 * 1024 * 1024) {
        await Promise.all(allFiles.map((f) => fs.unlink(f.path)));
        return res.status(400).json({
          success: false,
          message: `Image "${file.originalname}" exceeds 5MB limit.`,
        });
      }

      if (ext === ".pdf" && file.size > 15 * 1024 * 1024) {
        await Promise.all(allFiles.map((f) => fs.unlink(f.path)));
        return res.status(400).json({
          success: false,
          message: `PDF "${file.originalname}" exceeds 10MB limit.`,
        });
      }
    }

    next();
  });
};

module.exports = fileUploadHandler;
