const multer = require("multer");
const path = require("path");
const fs = require("fs/promises"); 

const getCurrentDate = () => {
  return Date.now().toString();
};

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads");
    try {
      await fs.mkdir(uploadPath, { recursive: true }); 
      cb(null, uploadPath);
    } catch (error) {
      cb(new Error("Failed to create uploads directory"));
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
  limits: { fileSize: 5 * 1024 * 1024 }, 
}).array("photos", 4); ;

const uploadHandler = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: "Please upload an image less than 5 MB!",
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded!",
      });
    }
    next();
  });
};



module.exports =  { uploadHandler };

if(!req.file){
  return res.status(404).json({
    success: false,
    message: "No file uploaded"
  });
}