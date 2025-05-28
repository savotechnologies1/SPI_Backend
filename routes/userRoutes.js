const express = require('express')
const { register, login, forgetPassword, validOtp, customerOrder, stockOrder, addSupplier, allSupplier, editSupplier, getSupplierDetail, deleteSupplier } = require('../controllers/userController')
const validateToken = require('../middlewares/validateTokenHandler')

const router = express.Router()

router.post("/register",register)
router.post("/login",login)
router.post("/forget-password",forgetPassword)
router.post("/validate-otp",validOtp)
router.post("/add-stock-order",validateToken,stockOrder)
router.post("/add-customer-order",validateToken,customerOrder)
router.post("/add-supplier",validateToken,addSupplier)
router.get("/all-supplier",validateToken,allSupplier)
router.get("/supplier-detail/:id",validateToken,getSupplierDetail)
router.put("/edit-supplier/:id",validateToken,editSupplier)
router.put("/delete-supplier/:id",validateToken,deleteSupplier)
module.exports = router
