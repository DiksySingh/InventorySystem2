const express = require("express");
const test = require("../controllers/test.controller");


const router = express.Router();

router.get("/W2WTransaction", test.W2W);

module.exports = router;