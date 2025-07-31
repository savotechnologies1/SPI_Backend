const express = require("express");
const {
  login,
  sendForgotPasswordOTP,
  validOtp,
  resetPassword,
} = require("../controllers/shopFloorController");
const {
  adminLogin,
  forgotPass,
  otpVerify,
  resetPass,
} = require("../validations/validations");
const validateToken = require("../middlewares/validateTokenHandler");
const {
  stationLogin,
  selectScheduleProcess,
  getScheduleProcessInformation,
  createProductionResponse,
} = require("../controllers/productionResponseController");
const router = express.Router();
router.post("/login", adminLogin, login);
router.post("/forget-password", forgotPass, sendForgotPasswordOTP);
router.post("/validate-otp", otpVerify, validOtp);
router.post("/reset-password", resetPass, resetPassword);
router.post("/process-login", validateToken, stationLogin);
router.get("/select-schedule-process", validateToken, selectScheduleProcess);
router.get(
  "/get-schedule-process-information/:id",
  validateToken,
  getScheduleProcessInformation
);
router.post(
  "/submit-production-response",
  validateToken,
  createProductionResponse
);
module.exports = router;
