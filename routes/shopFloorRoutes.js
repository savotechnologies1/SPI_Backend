const express = require("express");
const {
  registerShopFloor,
  login,
} = require("../controllers/shopFloorController");
const router = express.Router();

router.post("/register", registerShopFloor);
router.post("/login", login);
module.exports = router;
