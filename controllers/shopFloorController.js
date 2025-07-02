const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const md5 = require("md5");
const { validationResult } = require("express-validator");
const { checkValidations } = require("../functions/checkvalidation");
const { sendMail } = require("../functions/mailer");

const registerShopFloor = async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await prisma.employee.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return res.status(400).json({
        message:
          "Email is already registered, please add a different email address.",
      });
    }

    const newUser = await prisma.employee.create({
      data: {
        email: email?.toLowerCase()?.trim(),
        password: md5(password),
      },
    });

    const token = jwt.sign(
      { userId: newUser.id },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "5d",
      }
    );

    await prisma.employee.update({
      where: { id: newUser.id },
      data: {
        tokens: Array.isArray(newUser.tokens)
          ? [...newUser.tokens, token]
          : [token],
      },
    });

    return res.status(201).json({
      message: "User registered successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    const checkValid = await checkValidations(errors);
    if (checkValid.type === "error") {
      return res.status(400).send({
        message: checkValid.errors.msg,
      });
    }

    const { email, password } = req.body;

    const user = await prisma.employee.findUnique({
      where: { email: email },
      select: {
        id: true,
        email: true,
        status: true,
        password: true,
        tokens: true,
        isDeleted: true,
      },
    });
    if (!user || user.password !== md5(password) || user.isDeleted) {
      return res.status(400).send({ message: "Invalid Username and Password" });
    }
    if (user.status !== "active") {
      return res
        .status(400)
        .send({ message: "You don't have permission to login ." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
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
    const { email } = req.body;
    const user = await prisma.users.findFirst({
      where: {
        email: email,
        isDeleted: false,
      },
    });

    if (!user) {
      return res.status(400).send({ message: "Admin not found" });
    }
    const otp = sendForgotPasswordOTP();
    await sendMail("otp-verify", { "%otp%": otp }, user.email);
    await pr
  } catch (error) {
    res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

module.exports = { registerShopFloor, login, sendForgotPasswordOTP };
