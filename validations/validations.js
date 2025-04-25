const { body } = require("express-validator");

const adminLogin = [
  body("userName")
  .exists({ checkFalsy: true })
  .withMessage("Please enter the username")
];
const userRegister = [
  body("email")
    .exists({ checkFalsy: true })
    .withMessage("Please enter the email")
    .matches(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    )
    .withMessage("Please enter valid email Id"),
  body("password")
    .exists({ checkFalsy: true })
    .withMessage("Please enter the password")
    .matches(
      /^(?=.*?[A-Z])(?=(.*[a-z]){1,})(?=(.*[\d]){1,})(?=(.*[\W]){1,})(?!.*\s).{8,}$/
    )
    .withMessage(
      "Password contain 8 character which has at least one uppercase letter, one lowercase letter, and one number"
    ),
];

const userOTPVerify = [
  body("otp").exists({ checkFalsy: true }).withMessage("OTP is required"),
];
const userOTPVerified = [
  body("code").exists({ checkFalsy: true }).withMessage("OTP is required"),
];



const forgotPass = [
  body("email")
    .exists({ checkFalsy: true })
    .withMessage("Please enter the email")
    .matches(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    )
    .withMessage("Please enter valid email Id"),
];

const resetPass = [
  body("newPassword")
    .exists({ checkFalsy: true })
    .withMessage("Please enter the new Password"),
  body("confirmPassword")
    .exists({ checkFalsy: true })
    .withMessage("Please enter the confirm Password"),
];

const loginData = [
  body("email")
    .exists({ checkFalsy: true })
    .withMessage("Please enter the email")
    .matches(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    )
    .withMessage("Please enter valid email Id"),
  body("password")
    .exists({ checkFalsy: true })
    .withMessage("Password is required")
    .isLength({ min: 5 })
    .withMessage("Password should be at least 5 characters")
    .matches(
      /^(?=.*?[A-Z])(?=(.*[a-z]){1,})(?=(.*[\d]){1,})(?=(.*[\W]){1,})(?!.*\s).{5,}$/
    )
    .withMessage(
      "Password contain 5 character which has at least one uppercase letter, one lowercase letter, and one number"
    ),
];

const userChangePassword = [
  body("currentPassword")
    .exists({ checkFalsy: true })
    .withMessage("Please enter the current password"),

  body("newPassword")
    .exists({ checkFalsy: true })
    .withMessage("Please enter the new Password")
    .isLength({ min: 8 })
    .withMessage(
      "The Password must be a minimum of 8 characters long and include at least one number digit, one uppercase letter, one lowercase letter, and one special character (@, $, !, %, *, ?, &)."
    )
    .matches(
      /^(?=.*?[A-Z])(?=(.*[a-z]){1,})(?=(.*[\d]){1,})(?=(.*[\W]){1,})(?!.*\s).{5,}$/
    )
    .withMessage(
      "The Password must be a minimum of 8 characters long and include at least one number digit, one uppercase letter, one lowercase letter, and one special character (@, $, !, %, *, ?, &)."
    ),

  body("confirmPassword")
    .exists({ checkFalsy: true })
    .withMessage("Please enter the confirm Password"),
];
module.exports = {
  adminLogin,
  userRegister,
  userOTPVerify,
  userOTPVerified,
  forgotPass,
  resetPass,
  loginData,
  userChangePassword,
};
