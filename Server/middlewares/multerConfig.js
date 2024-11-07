const multer = require("multer");
const path = require("path");
const fs = require("fs/promises"); // Use fs/promises for promise-based file operations
const sharp = require("sharp"); // Use sharp for image processing

const getCurrentDate = () => {
  return Date.now().toString();
};

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads/images");
    try {
      await fs.mkdir(uploadPath, { recursive: true }); // Use fs/promises to create the directory
      cb(null, uploadPath);
    } catch (error) {
      cb(new Error("Failed to create upload directory"));
    }
  },
  filename: (req, file, cb) => {
    const currentDate = getCurrentDate();
    const fileExtension = path.extname(file.originalname).toLowerCase();
    cb(null, `${currentDate}${fileExtension}`);
  },
});

const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(
      new Error(
        "Only image files with .jpeg, .jpg, or .png extensions are allowed!"
      )
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
});

const resizeImageMiddleware = async (req, res, next) => {
  if (!req.file) return next(); // No file uploaded, move to next middleware

  const fileSizeInMB = req.file.size / (1024 * 1024); // Calculate file size in MB

  if (fileSizeInMB > 5) {
    try {
      const inputFile = req.file.path; // Original uploaded file path
      const newFilename = `IMG_${getCurrentDate()}${path
        .extname(req.file.originalname)
        .toLowerCase()}`;
      const outputFile = path.join(path.dirname(inputFile), newFilename);

      console.log(inputFile);
      console.log(outputFile);

      // Check if the input file exists
      try {
        await fs.stat(inputFile); // Ensure the file exists
      } catch {
        return res.status(404).json({ error: "Input file not found." });
      }

      // Use sharp for image resizing/compression
      await sharp(inputFile)
        .resize({ width: 800 }) // Resize to width of 800px, maintaining aspect ratio
        .toFormat("jpeg") // Convert to JPEG format if needed
        .jpeg({ quality: 80 }) // Set JPEG quality to 80
        .toFile(outputFile);

      // Ensure the new file was created before deleting the original one
      try {
        await fs.stat(outputFile); // Check if the compressed file exists
      } catch {
        return res
          .status(500)
          .json({ error: "Compressed file was not created." });
      }

      // Remove the original file if compression was successful
      try {
        await fs.unlink(inputFile); // Delete original file
      } catch (error) {
        console.error("Error deleting original file:", error);
        return res
          .status(500)
          .json({ error: "Failed to delete original file" });
      }

      // Replace the original file path with the compressed image path
      req.file.path = outputFile;
      req.file.filename = path.basename(outputFile);

      next();
    } catch (error) {
      console.error("Image processing error:", error); // Log the actual error
      return res
        .status(500)
        .json({ error: "Failed to process image", details: error.message });
    }
  } else {
    next(); // If size is under 5MB, proceed without resizing
  }
};

module.exports = {
  upload,
  resizeImageMiddleware,
};
