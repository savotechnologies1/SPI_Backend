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
  completeScheduleOrder,
  updateScrapEntry,
  scrapScheduleOrder,
  updateStepTime,
  completeTraning,
  selectScheudlePartNumber,
  scrapEntry,
  allScrapEntires,
} = require("../controllers/productionResponseController");
const { selectSupplier } = require("../controllers/adminController");
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
router.get(
  "/select-schedule-employee-process",
  validateToken,
  selectScheduleProcess
);

router.post("/station-login", validateToken, stationLogin);
router.get(
  "/get-schedule-process-information/:id",
  validateToken,
  getScheduleProcessInformation
);
router.put("/complete-order/:id", validateToken, completeScheduleOrder);
router.put("/scrap-order/:id", validateToken, scrapScheduleOrder);
router.put("/update-scrap-entry/:id", updateScrapEntry);
router.put(
  "/production-response/:id/update-step-time",
  validateToken,
  updateStepTime
);
router.put("/complete-traning/:id", validateToken, completeTraning);
router.get("/select-supplier", validateToken, selectSupplier);
router.get("/select-schedule-part-number", selectScheudlePartNumber);
router.post("/add-scrap-entry", validateToken, scrapEntry);
router.get("/all-scrap-entry", validateToken, allScrapEntires);

module.exports = router;
