const express = require("express");
const {
  login,
  createCustomer,
  customerList,
  customerDetail,
  editCustomerDetail,
  deleteCustomer,
  addSupplier,
  supplierList,
  editSupplierDetail,
  deleteSupplier,
  supplierDetail,
  addProcess,
  processList,
  processDetail,
  editProcess,
  deleteProcess,
  selectSupplier,
  supplierOrder,
  createEmployee,
  allEmployee,
  employeeDetail,
  editEmployee,
  deleteEmployee,
  sendForgotPasswordOTP,
  validOtp,
  resetPassword,
  createStockOrder,
  selectCustomer,
  customeOrder,
  createPartNumber,
  createProductNumber,
  createProductTree,
  selectProcess,
  partNumberList,
  bomDataList,
  selectPartNumber,
  partNumberDetail,
  getProductTree,
  selectProductNumber,
  partDetail,
  getSingleProductTree,
  updatePartNumber,
  updateProductNumber,
  deletePartNumber,
  deleteProductPartNumber,
  deletePartImage,
  selectCustomerForStockOrder,
  selectProductNumberForStockOrder,
  selectPartNumberForCustomOrder,
  addCustomOrder,
  getCustomOrderById,
  searchStockOrders,
  deleteProductPart,
  deleteProductTreeById,
  updateProfileApi,
  profileDetail,
  deleteProfileImage,
  getAllSupplierOrder,
  updateSupplierOrder,
  deleteSupplierOrder,
  sendMailToEmplyee,
  stockOrderSchedule,
  scheduleStockOrdersList,
  getStockAvailability,
  validateStockQty,
  getSupplierInventory,
  deleteSupplierInventory,
  deleteScrapEntry,
  searchCustomOrders,
  customOrderSchedule,
  sendSupplierEmail,
  supplierOrderDetail,
  updateSupplierOrderStatus,
  checkToken,
  allEmployeeTimeLine,
  allVacationReq,
  vacationReqDetail,
  changeVacationRequestStatus,
  timeClockList,
  sendVacationStatus,
  deleteProductPartsNumber,
  getLiveProduction,
  productionLive,
  processData,
  productionOverview,
  processHourly,
  liveProductionGoalBoard,
  currentStatusOverview,
  currentQualityStatusOverview,
  monitorChartsData,
  getProductionSummary,
  getDiveApi,
  cycleTimeComparisionData,
  dashBoardData,
  dailySchedule,
  capacityStatus,
  productionEfficieny,
  fiexedDataCalculation,
  fixedDataList,
  getFixedCostGraph,
  getParts,
  revenueApi,
  scheudleInventory,
  getLabourForcast,
} = require("../controllers/adminController");
const adminValidateToken = require("../middlewares/adminValidateTokenHandler");
const {
  customerValidation,
  adminLogin,
  supplierValidation,
  processValidation,
  employeeValidation,
  forgotPass,
  otpVerify,
  resetPass,
  stockOrderValidation,
} = require("../validations/validations");
const {
  createWorkInstruction,
  createWorkInstructionDetail,
  workInstructionProcess,
  productRelatedParts,
  allWorkInstructions,
  selectInstructionPartNumber,
  getWorkInstructionDetail,
  updateWorkInstructionDetail,
  deleteWorkInstruction,
  selectInstruction,
  applyWorkInstruction,
  selectWorkInstruction,
  selectByProductNumberOrDesc,
  deleteWorkInstructionImg,
  deleteWorkInstructionStepsById,
} = require("../controllers/workInstructionController");
const {
  stationLogin,
  getNextJobDetails,
  selectScheduleProcess,
  getScheduleProcessInformation,
  completeScheduleOrder,
  stationLogout,
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
  stationSendNotification,
  getStationNotifications,
  changeStationNotification,
  supplierReturn,
  costingApi,
  fixedCost,
  getInventory,
  customerRelation,
  qualityPerformance,
} = require("../controllers/productionResponseController");
const {
  importProcess,
  importParts,
  importProductTree,
  importEmp,
  importCust,
  importSupp,
} = require("../controllers/importController");
const router = express.Router();
router.post("/login", adminLogin, login);
router.post("/forget-password", forgotPass, sendForgotPasswordOTP);
router.post("/validate-otp", otpVerify, validOtp);
router.post("/reset-password", resetPass, resetPassword);
router.get("/check-token", adminValidateToken, checkToken);
router.post(
  "/create-customer",
  adminValidateToken,
  customerValidation,
  createCustomer
);
router.get("/all-customer-list", adminValidateToken, customerList);
router.get("/get-customer-detail/:id", adminValidateToken, customerDetail);
router.put(
  "/edit-customer-detail/:id",
  adminValidateToken,
  customerValidation,
  editCustomerDetail
);
router.put("/delete-customer/:id", adminValidateToken, deleteCustomer);
router.post(
  "/add-supplier",
  adminValidateToken,
  supplierValidation,
  addSupplier
);
router.get("/all-supplier", adminValidateToken, supplierList);
router.get("/supplier-detail/:id", adminValidateToken, supplierDetail);
router.put(
  "/edit-supplier/:id",
  adminValidateToken,
  supplierValidation,
  editSupplierDetail
);
router.put("/delete-supplier/:id", adminValidateToken, deleteSupplier);
router.get("/select-supplier", adminValidateToken, selectSupplier);
router.post("/add-supplier-order", adminValidateToken, supplierOrder);
router.get("/supplier-order-list", adminValidateToken, getAllSupplierOrder);
router.put(
  "/update-supplier-order/:id",
  adminValidateToken,
  updateSupplierOrder
);
router.patch(
  "/change-order-status/:id",
  adminValidateToken,
  updateSupplierOrderStatus
);
router.get(
  "/get-supplier-order-detail/:id",
  adminValidateToken,
  supplierOrderDetail
);
router.put(
  "/delete-supplier-order/:id",
  adminValidateToken,
  deleteSupplierOrder
);
router.post("/add-process", adminValidateToken, processValidation, addProcess);
router.get("/all-process", adminValidateToken, processList);
router.get("/get-process-detail/:id", adminValidateToken, processDetail);
router.put(
  "/edit-process/:id",
  adminValidateToken,
  processValidation,
  editProcess
);
router.put("/delete-process/:id", adminValidateToken, deleteProcess);
router.post(
  "/create-employee",
  adminValidateToken,
  employeeValidation,
  createEmployee
);
router.get("/all-employee", adminValidateToken, allEmployee);
router.get("/employee-detail/:id", adminValidateToken, employeeDetail);
router.put(
  "/edit-employee/:id",
  adminValidateToken,
  employeeValidation,
  editEmployee
);
router.patch("/delete-employee/:id", adminValidateToken, deleteEmployee);
router.post("/send-email-to-employee", adminValidateToken, sendMailToEmplyee);
router.post(
  "/create-stock-order",
  adminValidateToken,
  stockOrderValidation,
  createStockOrder
);
router.get("/select-customer", adminValidateToken, selectCustomer);
router.get("/select-process", adminValidateToken, selectProcess);
router.get(
  "/select-product-number-for-stock",
  adminValidateToken,
  selectProductNumberForStockOrder
);
router.get(
  "/select-customer-for-stock-order",
  adminValidateToken,
  selectCustomerForStockOrder
);
router.get(
  "/select-part-number-for-custom-order",
  adminValidateToken,
  selectPartNumberForCustomOrder
);
router.get("/search-stock-order", adminValidateToken, searchStockOrders);
router.get("/search-custom-order", adminValidateToken, searchCustomOrders);
router.post("/create-custom-order", adminValidateToken, customeOrder);
router.post("/add-custom-orders", adminValidateToken, addCustomOrder);
router.get("/get-customOrders/:id", adminValidateToken, getCustomOrderById);
router.post("/custom-order-schedule", adminValidateToken, customOrderSchedule);
router.get(
  "/stock-order-schedule-list",
  adminValidateToken,
  scheduleStockOrdersList
);
router.post("/stock-order-schedule", adminValidateToken, stockOrderSchedule);
router.get(
  "/stock-order-schedule-list",
  adminValidateToken,
  scheduleStockOrdersList
);
router.post("/create-part-number", adminValidateToken, createPartNumber);
router.post("/create-product-number", adminValidateToken, createProductNumber);
router.post("/create-product-tree", adminValidateToken, createProductTree);
router.get("/part-number-list", adminValidateToken, partNumberList);
router.get("/bom-data-list", adminValidateToken, bomDataList);
router.get("/select-part-number", adminValidateToken, selectPartNumber);
router.get("/select-product-number", adminValidateToken, selectProductNumber);
router.get("/part-number-detail/:id", adminValidateToken, partNumberDetail);
router.get("/get-product-tree", adminValidateToken, getProductTree);
router.get("/get-part-detail/:id", adminValidateToken, partDetail);
router.get("/get-product-detail/:id", adminValidateToken, getSingleProductTree);
router.put("/update-part-number/:id", adminValidateToken, updatePartNumber);
router.put(
  "/update-product-number/:id",
  adminValidateToken,
  updateProductNumber
);
router.patch("/delete-part-number/:id", adminValidateToken, deletePartNumber);
router.delete(
  "/product-part-deleted/:id",
  adminValidateToken,
  deleteProductPartNumber
);
router.get(
  "/select-product-info",
  adminValidateToken,
  selectByProductNumberOrDesc
);
router.delete("/delete-part-image/:id", adminValidateToken, deletePartImage);
router.post(
  "/create-work-instruction",
  adminValidateToken,
  createWorkInstruction
);
router.post(
  "/create-work-instruction-detail",
  adminValidateToken,
  createWorkInstructionDetail
);
router.get(
  "/select-instruction-process",
  adminValidateToken,
  workInstructionProcess
);
router.get("/product-related-parts", adminValidateToken, productRelatedParts);
router.get("/all-work-instructions", adminValidateToken, allWorkInstructions);
router.get(
  "/get-instructin-parts",
  adminValidateToken,
  selectInstructionPartNumber
);
router.put("/delete-product-part/:id", adminValidateToken, deleteProductPart);

router.patch(
  "/delete-product-number/:id",
  adminValidateToken,
  deleteProductTreeById
);
router.delete(
  "/delete-product-part-number/:id",
  adminValidateToken,
  deleteProductPartsNumber
);
router.get(
  "/work-instruction-detail/:id",
  adminValidateToken,
  getWorkInstructionDetail
);
router.put(
  "/update-work-instruction",
  adminValidateToken,
  updateWorkInstructionDetail
);
router.put(
  "/delete-work-instruction/:id",
  adminValidateToken,
  deleteWorkInstruction
);
router.get("/select-work-instructiuon", adminValidateToken, selectInstruction);
router.post(
  "/apply-work-instruction",
  adminValidateToken,
  applyWorkInstruction
);
router.get(
  "/select-work-instruction-title",
  adminValidateToken,
  selectWorkInstruction
);
router.delete(
  "/delete-work-instruction-image/:id",
  adminValidateToken,
  deleteWorkInstructionImg
);
router.put(
  "/delete-work-instruction-step/:id",
  adminValidateToken,
  deleteWorkInstructionStepsById
);
router.get("/profile-detail", adminValidateToken, profileDetail);
router.put("/profile-update", adminValidateToken, updateProfileApi);
router.put("/delete-profile-image", adminValidateToken, deleteProfileImage);
router.post("/station-login", adminValidateToken, stationLogin);
router.post("/station-logout/:id", adminValidateToken, stationLogout);
router.post("/stock-order-schedule", adminValidateToken, stockOrderSchedule);
router.get("/next-job-details/:id", adminValidateToken, getNextJobDetails);
router.get(
  "/select-schedule-employee-process",
  adminValidateToken,
  selectScheduleProcess
);
router.get(
  "/get-schedule-process-information/:id",
  adminValidateToken,
  getScheduleProcessInformation
);
router.put("/complete-order/:id", adminValidateToken, completeScheduleOrder);
router.put(
  "/production-response/update-step-time/:id",
  adminValidateToken,
  updateStepTime
);
router.put("/complete-traning/:id", adminValidateToken, completeTraning);
router.put("/scrap-order/:id", adminValidateToken, scrapScheduleOrder);
router.post("/production/:id/scan", processBarcodeScan);
router.post("/validate-stock-quantity", validateStockQty);
router.patch("/delete-schedule-order/:id", deleteScheduleOrder);
router.get("/scan-complete", completeScheduleOrderViaGet);
router.post("/add-scrap-entry", adminValidateToken, scrapEntry);
router.get("/all-scrap-entry", allScrapEntires);
router.get("/select-schedule-part-number", selectScheudlePartNumber);
router.get("/select-schedule-product-number", selectScheudleProductNumber);
router.get("/scrap-entry-detail/:id", getScrapEntryById);
router.put("/update-scrap-entry/:id", updateScrapEntry);
router.get("/supplier-inventory", getSupplierInventory);
router.patch("/delete-supplier-invetory/:id", deleteSupplierInventory);
router.post("/send-notification", adminValidateToken, stationSendNotification);
router.get(
  "/all-station-notification",
  adminValidateToken,
  getStationNotifications
);
router.patch(
  "/change-station-notification-status/:id",
  adminValidateToken,
  changeStationNotification
);
router.patch("/delete-scrap-entry/:id", adminValidateToken, deleteScrapEntry);
router.post("/supplier-order-email", adminValidateToken, sendSupplierEmail);
router.get("/all-employee-timeline", adminValidateToken, allEmployeeTimeLine);
router.get("/all-vacation-request", adminValidateToken, allVacationReq);
router.get("/vacation-req-detail/:id", adminValidateToken, vacationReqDetail);
router.patch(
  "/change-vacation-request-status",
  adminValidateToken,
  changeVacationRequestStatus
);
router.get("/all-time-clock-list", adminValidateToken, timeClockList);
router.post("/send-email-to-employee", adminValidateToken, sendMailToEmplyee);
router.post("/send-vacation-status", adminValidateToken, sendVacationStatus);
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
router.get("/inventory-data", getInventory);
router.get("/customer-relation-data", customerRelation);
router.get("/dashboard-data", dashBoardData);
router.get("/daily-schedule-data", dailySchedule);
router.get("/capacity-status-data", capacityStatus);
router.get("/production-efficiency", productionEfficieny);
router.post("/fixed-data-calulation", fiexedDataCalculation);
router.get("/fixed-data", fixedDataList);
router.get("/fixed-data-graph", getFixedCostGraph);
router.get("/get-parts", getParts);
router.post("/process/import", importProcess);
router.post("/parts/import", adminValidateToken, importParts);
router.post("/product-tree/import", adminValidateToken, importProductTree);
router.post("/emp/import", adminValidateToken, importEmp);
router.post("/cust/import", adminValidateToken, importCust);
router.post("/supp/import", adminValidateToken, importSupp);
router.get("/revenue-api", revenueApi);
router.get("/schedule-inventory", scheudleInventory);
router.get("/get-labour-forcast", getLabourForcast);

module.exports = router;
