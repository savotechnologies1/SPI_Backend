const express = require('express')
const { register, login, forgetPassword ,validOtp, resetPassword, changePassword, profileUpdate, getProfileDetail, createEmployee, editEmployee, allEmployees, deleteProfile, vacationApprovel, vacationApprovalList} = require('../controllers/userController')
const validateToken = require('../middlewares/validateTokenHandler')
const { userRegister, loginData, forgotPass, resetPass, userOTPVerify, userChangePassword } = require('../validations/validations')
const upload = require('../functions/upload')

const router = express.Router()

router.post("/register",userRegister,register)
router.post("/login",loginData,login)
router.post("/forget-password",forgotPass ,forgetPassword)
router.post("/validate-otp",userOTPVerify ,validOtp);
router.post("/reset-password",resetPass , resetPassword)
router.post("/change-password",validateToken,userChangePassword , changePassword)
router.put("/profile-update",validateToken,upload,profileUpdate)
router.get("/profile-detail",validateToken,getProfileDetail)
router.put("/profile-delete",validateToken,deleteProfile)
router.post("/create-new-employee",validateToken,createEmployee)
router.put("/edit-employee/:id",validateToken,editEmployee)
router.get("/get-all-employee",validateToken,allEmployees)
router.put("/update-vaccation-status/:id",validateToken,vacationApprovel)
router.get("/all-employee-vacation-list",validateToken,vacationApprovalList)
module.exports = router

