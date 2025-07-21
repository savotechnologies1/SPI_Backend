const express = require('express');
const { signUp , login,sendForgotPasswordOTP,validOtp, resetPassword, changePassword } = require('../controllers/frontLineController');
const router = express.Router();


router.post("/signUp", signUp);
router.post("/login",login);
router.post("/send-OTP",sendForgotPasswordOTP)
router.post("/validate-otp", validOtp);
router.post("/reset-Password",resetPassword);
router.patch("/changePassword",changePassword)

module.exports = router;
