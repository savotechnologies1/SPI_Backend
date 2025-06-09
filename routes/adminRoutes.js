const express = require('express');
const { login, createCustomer, customerList, customerDetail, editCustomerDetail, deleteCustomer } = require('../controllers/adminController');
const adminValidateToken = require('../middlewares/adminValidateTokenHandler');


const router = express.Router()


router.post("/login",login)
router.post("/create-customer",adminValidateToken,createCustomer)
router.get("/all-customer-list",adminValidateToken,customerList)
router.get("/get-customer-detail/:id",adminValidateToken,customerDetail)
router.put("/edit-customer-detail/:id",adminValidateToken,editCustomerDetail)
router.put("/delete-customer/:id",adminValidateToken,deleteCustomer)
module.exports = router