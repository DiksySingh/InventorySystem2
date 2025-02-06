const {updateLatitudeLongitude, addServicePersonState} = require("../controllers/servicePersonController");
const {addIsActiveField} = require("../controllers/authController");
const router = require("express").Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.put("/upload-excel", upload.single('file'), updateLatitudeLongitude);
router.put("/uploadState", upload.single('file'), addServicePersonState);
router.put("/add-isActive-field", addIsActiveField);

module.exports = router;
