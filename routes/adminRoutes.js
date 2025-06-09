const express = require('express');
const { login, createCustomer, customerList, customerDetail, editCustomerDetail, deleteCustomer, addSupplier, supplierList, editSupplierDetail, deleteSupplier, supplierDetail, addProcess, processList, processDetail, editProcess, deleteProcess } = require('../controllers/adminController');
const adminValidateToken = require('../middlewares/adminValidateTokenHandler');


const router = express.Router()


router.post("/login",login)
router.post("/create-customer",adminValidateToken,createCustomer)
router.get("/all-customer-list",adminValidateToken,customerList)
router.get("/get-customer-detail/:id",adminValidateToken,customerDetail)
router.put("/edit-customer-detail/:id",adminValidateToken,editCustomerDetail)
router.put("/delete-customer/:id",adminValidateToken,deleteCustomer)
router.post("/add-supplier",adminValidateToken,addSupplier)
router.get("/all-supplier",adminValidateToken,supplierList)
router.get("/supplier-detail/:id",adminValidateToken,supplierDetail)
router.put("/edit-supplier/:id",adminValidateToken,editSupplierDetail)
router.put("/delete-supplier/:id",adminValidateToken,deleteSupplier)
router.post("/add-process",adminValidateToken,addProcess)
router.get("/all-process",adminValidateToken,processList)
router.get("/get-process-detail/:id",adminValidateToken,processDetail)
router.put("/edit-process/:id",adminValidateToken,editProcess)
router.put("/delete-process/:id",adminValidateToken,deleteProcess)
module.exports = router