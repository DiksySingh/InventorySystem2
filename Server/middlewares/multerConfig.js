const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");

// Generate current timestamp
const getCurrentTimestamp = () => Date.now().toString();

// Set up multer storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads/newInstallation");
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(new Error("Failed to create uploads/newInstallation directory"));
    }
  },
  filename: (req, file, cb) => {
    const timestamp = getCurrentTimestamp();
    const ext = path.extname(file.originalname).toLowerCase(); // .jpg, .png, etc.
    cb(null, `${timestamp}${ext}`); // Only timestamp-based name
  },
});

// Allow only image types
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeValid = allowedTypes.test(file.mimetype);
  if (extValid && mimeValid) {
    cb(null, true);
  } else {
    cb(new Error("Only .jpeg, .jpg, or .png image files are allowed!"));
  }
};

// Set upload config
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Temporarily allow up to 5MB (we'll validate manually)
}).fields([
  { name: 'pitPhoto', maxCount: 5 },
  { name: 'earthingFarmerPhoto', maxCount: 5 },
  // { name: 'antiTheftNutBoltPhoto', maxCount: 1 },
  // { name: 'lightingArresterInstallationPhoto', maxCount: 1 },
  // { name: 'finalFoundationFarmerPhoto', maxCount: 1 },
  // { name: 'panelFarmerPhoto', maxCount: 1 },
  // { name: 'controllerBoxFarmerPhoto', maxCount: 1 },
  // { name: 'waterDischargeFarmerPhoto', maxCount: 1 },
]);

// Middleware handler
const uploadHandler = (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.code === 'LIMIT_FILE_SIZE'
          ? "File too large! Must be under 5 MB."
          : err.message,
      });
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded!",
      });
    }

    // Flatten all uploaded files into a single array to check sizes
    const allFiles = Object.values(req.files).flat();

    // Check if any file exceeds 2MB
    const oversizedFile = allFiles.find(file => file.size > 2 * 1024 * 1024);
    if (oversizedFile) {
      // Remove all uploaded files before responding
      await Promise.all(allFiles.map(file => fs.unlink(file.path)));

      return res.status(400).json({
        success: false,
        message: `File "${oversizedFile.originalname}" exceeds the 2MB limit.`,
      });
    }

    next();
  });
};

module.exports = { uploadHandler };
