const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const md5 = require("md5");
const { validationResult } = require("express-validator");
const { checkValidations } = require("../functions/checkvalidation");
const { sendMail } = require("../functions/mailer");
const { generateRandomOTP } = require("../functions/common");
const { v4: uuidv4 } = require("uuid");

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
    const user = await prisma.employee.findUnique({
      where: { email: userName },
      select: {
        id: true,
        email: true,
        status: true,
        password: true,
        role: true,
        tokens: true,
        isDeleted: true,
      },
    });
    console.log("useruser", user);

    if (!user || user.password !== md5(password) || user.isDeleted) {
      return res.status(400).send({ message: "Invalid Username and Password" });
    }
    if (user.status !== "active") {
      return res
        .status(400)
        .send({ message: "You don't have permission to login ." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "30d",
      }
    );

    await prisma.employee.update({
      where: { id: user.id },
      data: {
        tokens: Array.isArray(user.tokens) ? [...user.tokens, token] : [token],
      },
    });

    return res.status(201).json({
      message: "You have successfully login !",
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Something went wrong.",
    });
  }
};

const sendForgotPasswordOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    const checkValid = await checkValidations(errors);
    if (checkValid.type === "error") {
      return res.status(400).send({ message: checkValid.errors.msg });
    }
    const { email } = req.body;
    const user = await prisma.employee.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        isDeleted: false,
      },
    });

    if (!user) {
      return res.status(400).send({ message: "Employee not found" });
    }

    const otp = generateRandomOTP();

    await sendMail("otp-verify", { "%otp%": otp }, user.email);

    await prisma.employee.update({
      where: { id: user.id },
      data: { otp },
    });

    return res.status(200).json({
      id: user.id,
      email: user.email,
      message: "OTP sent Successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const validOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    const checkValid = await checkValidations(errors);
    if (checkValid.type === "error") {
      return res.status(400).send({ message: checkValid.errors.msg });
    }

    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).send({ message: "Email and OTP are required" });
    }
    const user = await prisma.employee.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        isDeleted: false,
      },
    });

    if (!user || !user.otp || user.otp !== otp) {
      return res.status(400).send({ message: "Invalid OTP" });
    }

    const token = uuidv4();

    await prisma.employee.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        otp: null,
      },
    });

    return res.status(200).json({
      message: "OTP verified successfully",
      id: user.id,
      resetToken: token,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    const checkValid = await checkValidations(errors);
    if (checkValid.type === "error") {
      return res.status(400).send({ message: checkValid.errors.msg });
    }

    const { token, newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return res.status(400).send({
        message: "New password and confirm password must be provided.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).send({
        message: "Passwords do not match.",
      });
    }

    const user = await prisma.employee.findFirst({
      where: {
        resetToken: token === "null" ? null : token?.toLowerCase().trim(),
        isDeleted: false,
      },
    });

    if (!user) {
      return res
        .status(404)
        .send({ message: "Employee not found or invalid token." });
    }

    await prisma.employee.update({
      where: { id: user.id },
      data: {
        password: md5(newPassword),
        resetToken: null,
      },
    });

    return res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
};
module.exports = {
  login,
  sendForgotPasswordOTP,
  validOtp,
  resetPassword,
};
