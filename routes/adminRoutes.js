const express = require('express')
const { login, forgetPassword, validOtp, resetPassword,  workInstruction, getWorkDetail, updateWorkInstruction, addSuppliers, 
    getSuppliers,
    editSupplierDetail,
    deleteSupplier,
    createCustomer,
    customerDetail,
    editCustomerDetail,
    deleteCustomer,
    customerList,
    addProcess,
    processList,
    editProcess,
    processDetail,
    deleteProcess,
    addPartNumber,
    workProcess,
    profileUpdate,
    profileDetail,
    deleteProfile} = require('../controllers/adminController')
const { forgotPass, userOTPVerify, resetPass, adminLogin } = require('../validations/validations')
const adminValidateToken = require('../middlewares/adminValidateTokenHandler')
const upload = require('../functions/upload')

const router = express.Router()

router.post("/login",adminLogin,login)
router.post("/forget-password",forgotPass,forgetPassword)
router.post("/validate-otp",userOTPVerify,validOtp)
router.post("/reset-password",resetPass,resetPassword)
// router.post("/create-new-employee",adminValidateToken,createEmployee)
// router.get("/employee-detail/:id",adminValidateToken,employeeDetail)
// router.put("/edit-employee/:id",adminValidateToken,editEmployee)
// router.get("/get-all-employee",adminValidateToken,allEmployees)
// router.put("/change-employee-status/:id",adminValidateToken,changeEmployeeStatus)
// router.put("/update-vaccation-status/:id",adminValidateToken,vacationApprovel)
// router.get("/all-employee-vacation-list",adminValidateToken,vacationApprovalList)
// router.put("/employee-clock-update/:id",adminValidateToken,updateEmployeeTimeClock)
// router.get("/all-employee-clock-list",adminValidateToken,allEmployeeTimeClockList)
router.post("/add-work-instruction",adminValidateToken,workInstruction)
router.get("/get-work-detail/:id",adminValidateToken,getWorkDetail)
router.put("/update-work-instruction/:id",adminValidateToken,updateWorkInstruction)
router.post("/add-supplier",adminValidateToken,addSuppliers)
router.get("/get-supplier-list",adminValidateToken,getSuppliers)
router.put("/edit-supplier-detail/:id",adminValidateToken,editSupplierDetail)
router.delete("/delete-supplier/:id",adminValidateToken,deleteSupplier)
// router.post("/add-supplier-order",supplierOrder)
router.post("/create-customer",adminValidateToken,createCustomer)
router.get("/get-customer-detail/:id",adminValidateToken,customerDetail)
router.put("/edit-customer-detail/:id",adminValidateToken,editCustomerDetail)
router.put("/delete-customer/:id",adminValidateToken,deleteCustomer)
router.get("/all-customer-list",adminValidateToken,customerList)
router.post("/add-process",adminValidateToken,addProcess)
router.get("/all-process",adminValidateToken,processList)
router.get("/get-process-detail/:id",adminValidateToken,processDetail)
router.get("/work-process",adminValidateToken,workProcess)
router.put("/edit-process/:id",adminValidateToken,editProcess)
router.put("/delete-process/:id",deleteProcess)
router.post("/add-part-number",addPartNumber)
router.put("/profile-update",adminValidateToken,profileUpdate)
router.get("/profile-detail",adminValidateToken,profileDetail)
router.put("/profile-delete",adminValidateToken,deleteProfile)
// router.post("/add-worked-instruction",adminValidateToken,addWorkInstruction)
// router.put("/edit-worked-instruction/:id",adminValidateToken,editWorkInstruction)
module.exports = router



 

