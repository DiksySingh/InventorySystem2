const multer = require("multer");
const path = require("path");
const fs = require("fs/promises"); // ✅ Promise-based fs

// Set up multer storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads/newInstallation");

    try {
      await fs.mkdir(uploadPath, { recursive: true }); // ✅ Async mkdir
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
  }
});

// Allow only image and video types
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|mp4|mov|avi|mkv/;
  const extValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeValid = allowedTypes.test(file.mimetype);
  if (extValid && mimeValid) {
    cb(null, true);
  } else {
    cb(new Error("Only image (.jpeg, .jpg, .png) and video (.mp4, .mov, .avi, .mkv) files are allowed!"));
  }
};

// Set upload config
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // max 50MB per file
}).fields([
  { name: 'pitPhoto', maxCount: 5 },
  { name: 'earthingFarmerPhoto', maxCount: 5 },
  { name: 'antiTheftNutBoltPhoto', maxCount: 5 },
  { name: 'lightingArresterInstallationPhoto', maxCount: 5 },
  { name: 'finalFoundationFarmerPhoto', maxCount: 5 },
  { name: 'panelFarmerPhoto', maxCount: 5 },
  { name: 'controllerBoxFarmerPhoto', maxCount: 5 },
  { name: 'waterDischargeFarmerPhoto', maxCount: 5 },
  { name: 'installationVideo', maxCount: 1 }, // ✅ video field
]);

// Middleware handler
const uploadHandler = (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.code === 'LIMIT_FILE_SIZE'
          ? "File too large! Must be under 50 MB."
          : err.message,
      });
    }

    const allFiles = Object.values(req.files).flat();

    for (const file of allFiles) {
      const ext = path.extname(file.originalname).toLowerCase();

      if (['.jpeg', '.jpg', '.png'].includes(ext) && file.size > 2 * 1024 * 1024) {
        await Promise.all(allFiles.map(f => fs.unlink(f.path))); // ✅ delete all
        return res.status(400).json({
          success: false,
          message: `Image "${file.originalname}" exceeds 2MB limit.`,
        });
      }

      if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext) && file.size > 50 * 1024 * 1024) {
        await Promise.all(allFiles.map(f => fs.unlink(f.path)));
        return res.status(400).json({
          success: false,
          message: `Video "${file.originalname}" exceeds 50MB limit.`,
        });
      }
    }

    next();
  });
};

module.exports = { uploadHandler };
