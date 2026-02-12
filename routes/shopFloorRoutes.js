const express = require("express");
const {
  login,
  sendForgotPasswordOTP,
  validOtp,
  resetPassword,
  checkToken,
  employeeTimeLineDetail,
  createTimeLine,
  getEmployeeStatus,
  getEmployeeTimeline,
  vacationReq,
  profileDetail,
  updateProfileApi,
  deleteProfileImage,
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
  selectScheudleProductNumber,
  stationLogout,
  stationSendNotification,
  getStationNotifications,
  changeStationNotification,
  getTrainingScheduleInformation,
  getScrapEntryById,
} = require("../controllers/productionResponseController");
const {
  selectSupplier,
  allEmployeeTimeLine,
  selectCustomerForStockOrder,
} = require("../controllers/adminController");
const router = express.Router();
router.post("/login", adminLogin, login);
router.post("/forget-password", forgotPass, sendForgotPasswordOTP);
router.post("/validate-otp", otpVerify, validOtp);
router.post("/reset-password", resetPass, resetPassword);
router.get("/check-token", validateToken, checkToken);
router.post("/process-login", validateToken, stationLogin);
router.get("/select-schedule-process", validateToken, selectScheduleProcess);
router.get(
  "/get-schedule-process-information/:id",
  validateToken,
  getScheduleProcessInformation,
);
router.post(
  "/submit-production-response",
  validateToken,
  createProductionResponse,
);
router.get(
  "/select-schedule-employee-process",
  validateToken,
  selectScheduleProcess,
);
router.post("/station-login", validateToken, stationLogin);
router.get(
  "/get-schedule-process-information/:id",
  validateToken,
  getScheduleProcessInformation,
);
router.put("/complete-order/:id", validateToken, completeScheduleOrder);
router.put("/scrap-order/:id", validateToken, scrapScheduleOrder);
router.put("/update-scrap-entry/:id", updateScrapEntry);
router.put(
  "/production-response/:id/update-step-time",
  validateToken,
  updateStepTime,
);
router.put("/complete-traning/:id", validateToken, completeTraning);
router.get("/select-supplier", validateToken, selectSupplier);
router.get("/select-schedule-part-number", selectScheudlePartNumber);
router.post("/add-scrap-entry", validateToken, scrapEntry);
router.get("/all-scrap-entry", validateToken, allScrapEntires);
router.get("/scrap-entry-detail/:id", getScrapEntryById);
router.get(
  "/select-schedule-product-number",
  validateToken,
  selectScheudleProductNumber,
);
router.get("/employee-time-line-detail", validateToken, employeeTimeLineDetail);
router.post("/create-timeline", validateToken, createTimeLine);
router.get("/employee-timeline-status", validateToken, getEmployeeStatus);
router.get("/employee-timeline", validateToken, getEmployeeTimeline);
router.get("/all-employee-timeline", validateToken, allEmployeeTimeLine);
router.post("/apply-vacation-request", validateToken, vacationReq);
router.post("/station-logout/:id", validateToken, stationLogout);
router.get("/profile-detail", validateToken, profileDetail);
router.put("/profile-update", validateToken, updateProfileApi);
router.patch("/delete-profile-image", validateToken, deleteProfileImage);
router.post("/send-notification", validateToken, stationSendNotification);
router.get("/all-station-notification", validateToken, getStationNotifications);
router.patch(
  "/change-station-notification-status/:id",
  validateToken,
  changeStationNotification,
);
router.get(
  "/get-training-schedule/:id",
  validateToken,
  getTrainingScheduleInformation,
);

router.get(
  "/select-customer-for-stock-order",
  validateToken,
  selectCustomerForStockOrder,
);
module.exports = router;
