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
  completeTrainingSession,
  startTrainingStep,
  getTrainingStatus,
  stepClickHandler,
  completeStepAndStartNext,
  startStep,
  completeStep,
  markStepAsCompleted,
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
} = require("../controllers/productionResponseController");
const router = express.Router();
router.post("/login", adminLogin, login);
router.post("/forget-password", forgotPass, sendForgotPasswordOTP);
router.post("/validate-otp", otpVerify, validOtp);
router.post("/reset-password", resetPass, resetPassword);
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
router.post("/create-custom-order", adminValidateToken, customeOrder);
router.post("/add-custom-orders", adminValidateToken, addCustomOrder);
router.get("/get-customOrders/:id", adminValidateToken, getCustomOrderById);
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
router.delete(
  "/product-part-deleted/:id",
  adminValidateToken,
  deleteProductPartNumber
);

router.delete("/delete-part-image/:id", adminValidateToken, deletePartImage);
router.get(
  "/get-instructin-parts",
  adminValidateToken,
  selectInstructionPartNumber
);
router.get(
  "/select-product-info",
  adminValidateToken,
  selectByProductNumberOrDesc
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

router.get("/search-stock-order", adminValidateToken, searchStockOrders);

router.get(
  "/select-work-instruction-title",
  adminValidateToken,
  selectWorkInstruction
);
router.put("/delete-product-part/:id", adminValidateToken, deleteProductPart);
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

router.patch(
  "/delete-product-number/:id",
  adminValidateToken,
  deleteProductTreeById
);
router.get("/profile-detail", adminValidateToken, profileDetail);
router.put("/profile-update", adminValidateToken, updateProfileApi);
router.put("/delete-profile-image", adminValidateToken, deleteProfileImage);
router.get("/supplier-order-list", adminValidateToken, getAllSupplierOrder);
router.put(
  "/update-supplier-order/:id",
  adminValidateToken,
  updateSupplierOrder
);
router.put(
  "/delete-supplier-order/:id",
  adminValidateToken,
  deleteSupplierOrder
);
router.post("/station-login", adminValidateToken, stationLogin);
router.post("/station-logout/:id", adminValidateToken, stationLogout);
router.post("/stock-order-schedule", adminValidateToken, stockOrderSchedule);
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
router.put("/complete-order/:id", completeScheduleOrder);
router.put("/production-response/:id/update-step-time", updateStepTime);
router.put("/complete-traning/:id", completeTraning);
router.put("/scrap-order/:id", scrapScheduleOrder);
router.post("/production/:id/scan", processBarcodeScan);
router.post("/validate-stock-quantity", validateStockQty);
router.patch("/delete-schedule-order/:id", deleteScheduleOrder);
router.get("/scan-complete", completeScheduleOrderViaGet);
router.post("/add-scrap-entry", scrapEntry);
router.get("/all-scrap-entry", allScrapEntires);
router.get("/select-schedule-part-number", selectScheudlePartNumber);
router.get("/select-schedule-product-number", selectScheudleProductNumber);
router.get("/scrap-entry-detail/:id", getScrapEntryById);
router.put("/update-scrap-entry/:id", updateScrapEntry);
module.exports = router;
