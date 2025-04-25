const express = require('express')
const { login, forgetPassword, validOtp, resetPassword } = require('../controllers/adminController')
const { forgotPass, userOTPVerify, resetPass, adminLogin } = require('../validations/validations')

const router = express.Router()

router.post("/login",adminLogin,login)
router.post("/forget-password",forgotPass,forgetPassword)
router.post("/validate-otp",userOTPVerify,validOtp)
router.post("/reset-password",resetPass,resetPassword)
module.exports = router