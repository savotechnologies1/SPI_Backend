const express = require("express");
const {
  registerShopFloor,
  login,
  sendForgotPasswordOTP,
  validOtp,
  resetPassword,
} = require("../controllers/shopFloorController");
const {
  userRegister,
  adminLogin,
  forgotPass,
  otpVerify,
  resetPass,
} = require("../validations/validations");
const router = express.Router();

router.post("/register", userRegister, registerShopFloor);
router.post("/login", adminLogin, login);
router.post("/forget-password", forgotPass, sendForgotPasswordOTP);
router.post("/validate-otp", otpVerify, validOtp);
router.post("/reset-password", resetPass, resetPassword);
module.exports = router;
