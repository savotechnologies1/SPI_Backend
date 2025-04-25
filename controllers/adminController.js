const md5 = require("md5");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const Admin = require("../models/adminModel");
const { sendMail } = require("../functions/mailer");
const { generateRandomOTP } = require("../functions/common");
const { validationResult } = require("express-validator");
const { checkValidations } = require("../functions/checkvalidation");

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    const checkValid = await checkValidations(errors);
    if (checkValid.type === "error") {
      return res.status(400).send({
        message: checkValid.errors.msg,
      });
    }

    const { userName, password } = req.body;

    const users = await Admin.findOne(
      {
        $or: [
          { email: userName.toLowerCase().trim() },
          { phoneNumber: userName.trim() },
        ],
        isDeleted: false,
      },
      { tokens: 0, createdAt: 0, updatedAt: 0 }
    ).lean(true);

    if (!users || users.password !== md5(password)) {
      return res.status(400).send({ message: "Invalid Username and Password" });
    }

    const token = jwt.sign({ user: users }, process.env.ACCESS_TOKEN_SECERT, {
      expiresIn: "5d",
    });

    Admin.updateOne(
      { _id: users._id, isDeleted: false },
      { $push: { tokens: token } },
      { new: true }
    ).then();

    return res.status(200).send({
      token: token,
      message: "You have successfully login.",
    });
  } catch (error) {
    console.log("errorerror", error);

    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const forgetPassword = async (req, res) => {
  try {
    // const errors = validationResult(req);
    // const checkValid = await checkValidations(errors);
    // if (checkValid.type === "error") {
    //   return res.status(400).send({
    //     message: checkValid.errors.msg,
    //   });
    // }
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const user = await Admin.findOne({
      email: normalizedEmail,
      isDeleted: false,
    }).lean(true);

    if (!user) {
      return res.status(400).send({ message: "Admin not found" });
    }

    const otp = generateRandomOTP();
    const mailVariables = {
      "%otp%": otp,
    };
    console.log("hey ! here is your otp :", otp);

    Admin.updateOne(
      { _id: user._id, isDeleted: false },
      { $set: { otp: otp } }
    ).then();

    await sendMail("forget-password-otp", mailVariables, normalizedEmail);

    return res.status(200).json({
      id: user._id,
      email: user.email,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.log("errorerror", error);

    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const validOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    const checkValid = await checkValidations(errors);
    if (checkValid.type === "error") {
      return res.status(400).send({
        message: checkValid.errors.msg,
      });
    }
    const { email, otp } = req.body;
    let user = await Admin.findOne({ email: email, isDeleted: false }).lean(
      true
    );
    if (!user) {
      user = await Admin.findOne({
        email: email.toLowerCase().trim(),
        isDeleted: false,
      }).lean(true);
    }

    if (!user) {
      return res.status(400).send({ message: "Admin not found ." });
    }

    if (user.otp !== otp) {
      return res.status(400).send({ message: "Invalid OTP" });
    }
    const token = uuidv4();
    Admin.updateOne(
      { _id: user._id, isDeleted: false },
      { $set: { token: token }, $unset: { otp: null } }
    ).then();

    return res.status(200).json({
      message: "OTP verified successfully",
      id: user._id,
      token: token,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Something went wrong . please try again later ." });
  }
};

const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    const checkValid = await checkValidations(errors);
    if (checkValid.type === "error") {
      return res.status(400).send({
        message: checkValid.errors.msg,
      });
    }
    const { token, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .send({ message: "New password and confirm password do not match." });
    }

    let user = await Admin.findOne({
      token: token.toLowerCase().trim(),
      isDeleted: false,
    }).lean(true);

    if (!user) {
      return res
        .status(404)
        .send({ message: "Admin not found or invalid token." });
    }
    Admin.updateOne(
      { _id: user._id, isDeleted: false },
      {
        $set: {
          password: md5(newPassword),
          tokens: [],
        },
        $unset: {
          token: "",
        },
      }
    ).then();
    return res.status(200).send({ message: "Password reset successfully." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Something went wrong . please try again later ." });
  }
};

// const changePassword = async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     const checkValid = await checkValidations(errors);
//     if (checkValid.type === "error") {
//       return res.status(400).send({
//         message: checkValid.errors.msg,
//       });
//     }
//     const { currentPassword, newPassword, confirmPassword } = req.body;
//     if (req?.user?.password !== md5(currentPassword)) {
//       return res.status(400).send({
//         message:
//           "The current password you provided does not match. Please double-check and try again.",
//       });
//     }

//     if (newPassword !== confirmPassword) {
//       return res.status(400).send({
//         message:
//           "The new password and confirm password entries must match. Please ensure they are identical.",
//       });
//     }

//     Admin.updateOne(
//       { _id: req.user._id, isDeleted: false },
//       { $set: { password: md5(newPassword), tokens: [] } }
//     ).then();

//     return res.status(200).send({
//       status: 200,
//       message: "Your password has been successfully changed.",
//     });
//   } catch (error) {
//     return res
//       .status(500)
//       .send({ message: "Something went wrong . please try again later ." });
//   }
// };

module.exports = { login, forgetPassword, validOtp, resetPassword };
