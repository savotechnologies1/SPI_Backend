const express = require("express");
const {
  signUp,
  login,
  sendForgotPasswordOTP,
  validOtp,
  resetPassword,
  changePassword,
  profileDetail,
  updateProfileApi,
  deleteProfileImage,
} = require("../controllers/frontLineController");
const validateToken = require("../middlewares/validateTokenHandler");
const {
  stockOrderValidation,
  supplierValidation,
  forgotPass,
  otpVerify,
  resetPass,
} = require("../validations/validations");
const {
  createStockOrder,
  selectCustomer,
  selectProcess,
  selectProductNumberForStockOrder,
  selectCustomerForStockOrder,
  selectPartNumberForCustomOrder,
  searchStockOrders,
  searchCustomOrders,
  customeOrder,
  addCustomOrder,
  getCustomOrderById,
  customOrderSchedule,
  scheduleStockOrdersList,
  stockOrderSchedule,
  deleteSupplierInventory,
  getSupplierInventory,
  deleteScrapEntry,
  sendSupplierEmail,
  addSupplier,
  supplierDetail,
  supplierList,
  editSupplierDetail,
  deleteSupplier,
  selectSupplier,
  supplierOrder,
  getAllSupplierOrder,
  updateSupplierOrder,
  updateSupplierOrderStatus,
  supplierOrderDetail,
  deleteSupplierOrder,
  validateStockQty,
  dashBoardData,
  getLiveProduction,
  productionOverview,
  processHourly,
  currentStatusOverview,
  currentQualityStatusOverview,
  monitorChartsData,
  getDiveApi,
  cycleTimeComparisionData,
  deleteFixedCost,
  getParts,
  getLowStockParts,
  getProductParts,
} = require("../controllers/adminController");
const {
  stationSendNotification,
  getStationNotifications,
  changeStationNotification,
  stationLogin,
  stationLogout,
  getNextJobDetails,
  selectScheduleProcess,
  getScheduleProcessInformation,
  completeScheduleOrder,
  updateStepTime,
  completeTraning,
  scrapScheduleOrder,
  processBarcodeScan,
  deleteScheduleOrder,
  completeScheduleOrderViaGet,
  scrapEntry,
  allScrapEntires,
  selectScheudlePartNumber,
  selectScheudleProductNumber,
  getScrapEntryById,
  updateScrapEntry,
  qualityPerformance,
  costingApi,
  fixedCost,
  getTrainingScheduleInformation,
} = require("../controllers/productionResponseController");
const {
  workInstructionProcess,
  createWorkInstructionDetail,
  createWorkInstruction,
  productRelatedParts,
  allWorkInstructions,
  selectInstructionPartNumber,
  selectWorkInstruction,
  deleteWorkInstructionImg,
  deleteWorkInstructionStepsById,
  selectByProductNumberOrDesc,
  applyWorkInstruction,
  deleteWorkInstruction,
  updateWorkInstructionDetail,
  getWorkInstructionDetail,
} = require("../controllers/workInstructionController");
const router = express.Router();
router.post("/login", login);
router.post("/forget-password", forgotPass, sendForgotPasswordOTP);
router.post("/validate-otp", otpVerify, validOtp);
router.post("/reset-password", resetPass, resetPassword);
router.post(
  "/create-stock-order",
  validateToken,
  stockOrderValidation,
  createStockOrder,
);
router.get("/select-customer", validateToken, selectCustomer);
router.get("/select-process", validateToken, selectProcess);
router.get(
  "/select-product-number-for-stock",
  validateToken,
  selectProductNumberForStockOrder,
);
router.get(
  "/select-customer-for-stock-order",
  validateToken,
  selectCustomerForStockOrder,
);
router.get(
  "/select-part-number-for-custom-order",
  validateToken,
  selectPartNumberForCustomOrder,
);
router.get("/search-stock-order", validateToken, searchStockOrders);
router.get("/search-custom-order", validateToken, searchCustomOrders);
router.post("/create-custom-order", validateToken, customeOrder);
router.post("/add-custom-orders", validateToken, addCustomOrder);
router.get("/get-customOrders/:id", validateToken, getCustomOrderById);
router.post("/custom-order-schedule", validateToken, customOrderSchedule);

router.get(
  "/select-product-number-for-stock",
  validateToken,
  selectProductNumberForStockOrder,
);
router.get(
  "/stock-order-schedule-list",
  validateToken,
  scheduleStockOrdersList,
);
router.post("/stock-order-schedule", validateToken, stockOrderSchedule);
router.get(
  "/stock-order-schedule-list",
  validateToken,
  scheduleStockOrdersList,
);

router.get("/supplier-inventory", getLowStockParts);
router.patch("/delete-supplier-invetory/:id", deleteSupplierInventory);
router.post("/send-notification", validateToken, stationSendNotification);
router.get("/all-station-notification", validateToken, getStationNotifications);
router.patch(
  "/change-station-notification-status/:id",
  validateToken,
  changeStationNotification,
);
router.patch("/delete-scrap-entry/:id", validateToken, deleteScrapEntry);
router.post("/supplier-order-email", validateToken, sendSupplierEmail);

router.post("/add-supplier", validateToken, supplierValidation, addSupplier);
router.get("/all-supplier", validateToken, supplierList);
router.get("/supplier-detail/:id", validateToken, supplierDetail);
router.put(
  "/edit-supplier/:id",
  validateToken,
  supplierValidation,
  editSupplierDetail,
);
router.put("/delete-supplier/:id", validateToken, deleteSupplier);
router.get("/select-supplier", validateToken, selectSupplier);
router.post("/add-supplier-order", validateToken, supplierOrder);
router.get("/supplier-order-list", validateToken, getAllSupplierOrder);
router.put("/update-supplier-order/:id", validateToken, updateSupplierOrder);
router.patch(
  "/change-order-status/:id",
  validateToken,
  updateSupplierOrderStatus,
);
router.get(
  "/get-supplier-order-detail/:id",
  validateToken,
  supplierOrderDetail,
);
router.put("/delete-supplier-order/:id", validateToken, deleteSupplierOrder);
router.post("/create-work-instruction", validateToken, createWorkInstruction);
router.post(
  "/create-work-instruction-detail",
  validateToken,
  createWorkInstructionDetail,
);
router.get(
  "/select-instruction-process",
  validateToken,
  workInstructionProcess,
);
router.get("/product-related-parts", validateToken, productRelatedParts);
router.get("/all-work-instructions", validateToken, allWorkInstructions);
router.get("/get-instructin-parts", validateToken, selectInstructionPartNumber);
router.get(
  "/select-work-instruction-title",
  validateToken,
  selectWorkInstruction,
);
router.delete(
  "/delete-work-instruction-image/:id",
  validateToken,
  deleteWorkInstructionImg,
);
router.put(
  "/delete-work-instruction-step/:id",
  validateToken,
  deleteWorkInstructionStepsById,
);
router.get("/select-product-info", validateToken, selectByProductNumberOrDesc);
router.post("/apply-work-instruction", validateToken, applyWorkInstruction);
router.post(
  "/create-work-instruction-detail",
  validateToken,
  createWorkInstructionDetail,
);
router.get(
  "/work-instruction-detail/:id",
  validateToken,
  getWorkInstructionDetail,
);
router.put(
  "/update-work-instruction",
  validateToken,
  updateWorkInstructionDetail,
);
router.put(
  "/delete-work-instruction/:id",
  validateToken,
  deleteWorkInstruction,
);

router.get(
  "/get-training-schedule/:id",
  validateToken,
  getTrainingScheduleInformation,
);
// router.get("/profile-detail", validateToken, profileDetail);
// router.put("/profile-update", validateToken, updateProfileApi);
// router.put("/delete-profile-image", validateToken, deleteProfileImage);
router.post("/station-login", validateToken, stationLogin);
router.post("/station-logout/:id", validateToken, stationLogout);
router.post("/stock-order-schedule", validateToken, stockOrderSchedule);
router.get("/next-job-details/:id", validateToken, getNextJobDetails);
router.get(
  "/select-schedule-employee-process",
  validateToken,
  selectScheduleProcess,
);
router.get(
  "/get-schedule-process-information/:id",
  validateToken,
  getScheduleProcessInformation,
);
router.put("/complete-order/:id", validateToken, completeScheduleOrder);
router.put(
  "/production-response/:id/update-step-time",
  validateToken,
  updateStepTime,
);
router.get("/supplier-inventory", getLowStockParts);
router.put("/complete-traning/:id", validateToken, completeTraning);
router.put("/scrap-order/:id", validateToken, scrapScheduleOrder);
router.post("/production/:id/scan", processBarcodeScan);
router.post("/validate-stock-quantity", validateStockQty);
router.delete("/delete-schedule-order/:id", deleteScheduleOrder);
router.get("/scan-complete", completeScheduleOrderViaGet);
router.post("/add-scrap-entry", validateToken, scrapEntry);
router.get("/all-scrap-entry", allScrapEntires);
router.get("/select-schedule-part-number", selectScheudlePartNumber);
router.get("/select-schedule-product-number", selectScheudleProductNumber);
router.get("/scrap-entry-detail/:id", getScrapEntryById);
router.put("/update-scrap-entry/:id", updateScrapEntry);
router.get("/profile-detail", validateToken, profileDetail);
router.put("/profile-update", validateToken, updateProfileApi);
router.patch("/delete-profile-image", validateToken, deleteProfileImage);
router.get("/dashboard-data", dashBoardData);
router.get("/live-production", getLiveProduction);
router.get("/production/overview", productionOverview);
router.get("/production/processes/hourly", processHourly);
router.get("/current-status-overview", currentStatusOverview);
router.get("/current-quality-status-overview", currentQualityStatusOverview);
router.get("/quality-performance-data", qualityPerformance);
router.get("/monitor-chart-data", monitorChartsData);
router.get("/dive-chart-data", getDiveApi);
router.get("/cycle-time-comparision-data", cycleTimeComparisionData);
router.get("/costing-data", costingApi);
router.get("/fixed-cost-data", fixedCost);
router.delete("/fixed-cost-delete/:id", deleteFixedCost);
router.get("/get-parts", getParts);

router.get("/product-parts/:id", validateToken, getProductParts);
module.exports = router;
