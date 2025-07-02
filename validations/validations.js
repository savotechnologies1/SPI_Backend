const { body } = require("express-validator");

const adminLogin = [
  body("userName")
    .exists({ checkFalsy: true })
    .withMessage("Please enter the username"),
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

const otpVerify = [
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
    .withMessage("Please enter the new Password")
    .matches(
      /^(?=.*?[A-Z])(?=(.*[a-z]){1,})(?=(.*[\d]){1,})(?=(.*[\W]){1,})(?!.*\s).{8,}$/
    )
    .withMessage(
      "Password contain 8 character which has at least one uppercase letter, one lowercase letter, and one number"
    ),
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

const customerValidation = [
  body("firstName")
    .exists({ checkFalsy: true })
    .withMessage("Please enter the first name"),

  body("lastName")
    .exists({ checkFalsy: true })
    .withMessage("Please enter the last name"),

  body("email")
    .exists({ checkFalsy: true })
    .withMessage("Please enter the email"),

  body("customerPhone")
    .trim()
    .notEmpty()
    .withMessage("Please enter the customer phone number.")
    .isNumeric()
    .withMessage(
      "Phone number must contain digits only (no spaces or symbols)."
    )
    .isLength({ min: 7, max: 15 })
    .withMessage("Phone number must be between 7 to 15 digits."),
];

const supplierValidation = [
  body("firstName")
    .exists({ checkFalsy: true })
    .withMessage("Please enter the first name"),
  body("lastName")
    .exists({ checkFalsy: true })
    .withMessage("Please enter the last name"),
  body("email")
    .exists({ checkFalsy: true })
    .withMessage("Please enter the email"),
  body("address")
    .exists({ checkFalsy: true })
    .withMessage("Please enter the address"),
  body("billingTerms")
    .exists({ checkFalsy: true })
    .withMessage("Please enter the billing terms"),
];
const processValidation = [
  body("processName")
    .exists({ checkFalsy: true })
    .withMessage("Please enter the process name."),

  body("machineName")
    .exists({ checkFalsy: true })
    .withMessage("Please enter the machine name."),

  body("cycleTime")
    .exists({ checkFalsy: true })
    .withMessage("Please enter the cycle time."),

  body("ratePerHour")
    .exists({ checkFalsy: true })
    .withMessage("Please enter the rate per hour."),

  body("orderNeeded")
    .exists({ checkFalsy: true })
    .withMessage("Please select whether order is needed or not."),
];

const employeeValidation = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("Please enter the first name."),

  body("lastName").trim().notEmpty().withMessage("Please enter the last name."),

  body("fullName").trim().notEmpty().withMessage("Please enter the full name."),

  body("hourlyRate")
    .notEmpty()
    .withMessage("Please enter the hourly rate.")
    .isNumeric()
    .withMessage("Hourly rate must be a number."),

  body("shift").notEmpty().withMessage("Please select any one shift."),

  body("startDate").notEmpty().withMessage("Please select start date."),

  body("pin").notEmpty().withMessage("Please enter the pin."),

  body("shopFloorLogin")
    .notEmpty()
    .withMessage("Please select if shop floor login is enabled or not."),

  body("status").notEmpty().withMessage("Please select employee status."),

  body("termsAccepted")
    .equals("true")
    .withMessage("You must accept the terms and conditions."),
];

const stockOrderValidation = [
  body("orderNumber")
    .trim()
    .notEmpty()
    .withMessage("Please enter the first name."),

  body("orderDate").trim().notEmpty().withMessage("Please select order date ."),

  body("shipDate").trim().notEmpty().withMessage("Please select ship date ."),

  body("customerName")
    .trim()
    .notEmpty()
    .withMessage("Please enter the customer name."),

  body("customerEmail")
    .exists({ checkFalsy: true })
    .withMessage("Please enter the email")
    .matches(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    )
    .withMessage("Please enter valid email id"),

  body("customerPhone")
    .trim()
    .notEmpty()
    .withMessage("Please enter the customer phone number.")
    .isNumeric()
    .withMessage(
      "Phone number must contain digits only (no spaces or symbols)."
    )
    .isLength({ min: 7, max: 15 })
    .withMessage("Phone number must be between 7 to 15 digits."),

  body("orderDate").trim().notEmpty().withMessage("Please select order date ."),

  body("productNumber")
    .trim()
    .notEmpty()
    .withMessage("Please enter the product number."),

  body("cost")
    .trim()
    .notEmpty()
    .withMessage("Please enter the cost.")
    .isNumeric()
    .withMessage("Cost must contain digits only (no spaces or symbols)."),

  body("productDescription")
    .trim()
    .notEmpty()
    .withMessage("Please enter the product description."),

  body("productQuantity")
    .trim()
    .notEmpty()
    .withMessage("Please enter the product quantity.")
    .isNumeric()
    .withMessage(
      "Product quantity must contain digits only (no spaces or symbols)."
    ),
];
module.exports = {
  adminLogin,
  userRegister,
  otpVerify,
  userOTPVerified,
  forgotPass,
  resetPass,
  loginData,
  userChangePassword,
  customerValidation,
  supplierValidation,
  processValidation,
  employeeValidation,
  stockOrderValidation,
};
