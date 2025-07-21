const md5 = require("md5");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { generateToken,generateRandomOTP } = require("../functions/common");
const { validationResult } = require("express-validator");
const { checkValidations } = require("../functions/checkvalidation");
const prisma = require("../config/prisma");
const { sendMail } = require("../functions/mailer");
const signUp = async (req, res) => {
    const errors = validationResult(req);
    const checkValid = await checkValidations(errors);
    if (checkValid.type === "error") {
        return res.status(400).send({
            message: checkValid.errors.msg,
        });
    }
    try {
        const { email, password, confirmPassword } = req.body;
        if (password !== confirmPassword) {
            let errorMsg = "Passwords does not match";
            return res.status(400).json({ status: 'error', message: errorMsg, statusCode: 400 });
        }

        let getId = uuidv4().slice(0, 6);
        const existingCustomer = await prisma.employee.findFirst({
            where: {
                isDeleted: false,
                OR: [{ email: email }],
            },
        });

        if (existingCustomer) {
            return res.status(400).json({
                message: "Customer with this email already exists.",
            });
        }

        const newUser = await prisma.employee.create({
            data: {
                id: getId,
                email: email.trim(),
                password: md5(password)
            },
        });
        const new_access_token = await generateToken(getId,email,);

        await prisma.employee.update({
            where: { id: newUser.id },
            data: {
                tokens: Array.isArray(newUser.tokens)
                    ? [...newUser.tokens, new_access_token]
                    : [new_access_token],
            },
        });

        return res.status(201).json({
            message: "Registered successfully",
        });

    } catch (error) {
        console.log("see the error", error)
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
            return res.status(400).send({ message: "Invalid Username or Password" });
        }
        if (user.status !== "active") {
            return res
                .status(400)
                .send({ message: "Faild Login..! You don't have permission to login ." });
        }
        const new_access_token = await generateToken(user.id,email);
        await prisma.employee.update({
            where: { id: user.id },
            data: {
                tokens: Array.isArray(user.tokens) ? [...user.tokens, new_access_token] : [new_access_token],
            },
        });
        return res.status(201).json({
            message: "You have successfully login !",
            new_access_token
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            message: "Something went wrong.",
        });
    }
}
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
        return res.status(400).send({ message: "employee not found" });
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
          .send({ message: "User not found or invalid token." });
      }
  
      await prisma.employee
      .update({
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

  const changePassword = async(req,res)=>{
    try {
      const errors = validationResult(req);
      const checkValid = await checkValidations(errors);
      if (checkValid.type === "error") {
        return res.status(400).send({ message: checkValid.errors.msg });
      }
      const {id,oldPassword,newPassword,confirmPassword} = req.body;

    const user = await prisma.employee.findFirst({
        where: {
          id: id,
          isDeleted: false,
        },
      })
      console.log("see the details",user);

      console.log("Input oldPassword:", oldPassword);
console.log("Hashed oldPassword:", md5(oldPassword));
console.log("Stored password:", user.password);


      if (!user || !user.password ) {
        return res.status(400).send({ message: "somthing went wrong" });
      }
      if (md5(oldPassword.trim()) !== user.password.trim()) {
        return res.status(400).send({ message: "Invalid Old Password" });
      }
      if (!newPassword || !confirmPassword) {
        return res.status(400).send({
          message: "New password and confirm password must be provided.",
        });
      }


      const result = await prisma.employee
      .update({
        where: { id: user.id },
        data: {
          password: md5(newPassword),
        },
      });
      console.log("see the result",result);
      return res.status(200).json({ message: "Password reset successfully." });

    } catch (error) {
      return res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
    }
  }
  

module.exports = { signUp, login ,sendForgotPasswordOTP,validOtp,resetPassword,changePassword };