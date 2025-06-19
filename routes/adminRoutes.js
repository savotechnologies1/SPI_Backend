const express = require('express');
const { login, createCustomer, customerList, customerDetail, editCustomerDetail, deleteCustomer, addSupplier, supplierList, editSupplierDetail, deleteSupplier, supplierDetail, addProcess, processList, processDetail, editProcess, deleteProcess, selectSupplier, supplierOrder, createEmployee, allEmployee, employeeDetail, editEmployee, deleteEmployee, createProductNumber } = require('../controllers/adminController');
const adminValidateToken = require('../middlewares/adminValidateTokenHandler');
const { customerValidation, adminLogin, supplierValidation, processValidation, employeeValidation } = require('../validations/validations');

const router = express.Router()
router.post("/login",adminLogin,login)
router.post("/create-customer",adminValidateToken,customerValidation,createCustomer)
router.get("/all-customer-list",adminValidateToken,customerList)
router.get("/get-customer-detail/:id",adminValidateToken,customerDetail)
router.put("/edit-customer-detail/:id",adminValidateToken,customerValidation,editCustomerDetail)
router.put("/delete-customer/:id",adminValidateToken,deleteCustomer)
router.post("/add-supplier",adminValidateToken,supplierValidation,addSupplier)
router.get("/all-supplier",adminValidateToken,supplierList)
router.get("/supplier-detail/:id",adminValidateToken,supplierDetail)
router.put("/edit-supplier/:id",adminValidateToken,supplierValidation,editSupplierDetail)
router.put("/delete-supplier/:id",adminValidateToken,deleteSupplier)
router.get("/select-supplier",adminValidateToken,selectSupplier)
router.post("/add-supplier-order" , adminValidateToken, supplierOrder)
router.post("/add-process",adminValidateToken,processValidation,addProcess)
router.get("/all-process",adminValidateToken,processList)
router.get("/get-process-detail/:id",adminValidateToken,processDetail)
router.put("/edit-process/:id",adminValidateToken,processValidation,editProcess)
router.put("/delete-process/:id",adminValidateToken,deleteProcess)
router.post("/create-employee",adminValidateToken,employeeValidation,createEmployee)
router.get("/all-employee",adminValidateToken,allEmployee)
router.get("/employee-detail/:id",adminValidateToken,employeeDetail)
router.put("/edit-employee/:id",adminValidateToken,employeeValidation,editEmployee)
router.patch("/delete-employee/:id",adminValidateToken,deleteEmployee)
// router.post("/create-product-number",adminValidateToken,createProductNumber)
module.exports = router

 