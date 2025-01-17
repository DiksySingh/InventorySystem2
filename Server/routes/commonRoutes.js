const {updateLatitudeLongitude, addServicePersonState} = require("../controllers/servicePersonController");
const router = require("express").Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.put("/upload-excel", upload.single('file'), updateLatitudeLongitude);
router.put("/uploadState", upload.single('file'), addServicePersonState);

module.exports = router;
