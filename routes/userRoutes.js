const express = require('express')
const { register, login, forgetPassword, validOtp } = require('../controllers/userController')

const router = express.Router()

router.post("/register",register)
router.post("/login",login)
router.post("/forget-password",forgetPassword)
router.post("/validate-otp",validOtp)

module.exports = router
