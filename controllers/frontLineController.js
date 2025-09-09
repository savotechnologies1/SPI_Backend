// const md5 = require("md5");
// const jwt = require("jsonwebtoken");
// const { v4: uuidv4 } = require("uuid");
// const { generateToken, generateRandomOTP } = require("../functions/common");
// const { validationResult } = require("express-validator");
// const { checkValidations } = require("../functions/checkvalidation");
// const prisma = require("../config/prisma");
// const { sendMail } = require("../functions/mailer");
// const signUp = async (req, res) => {
//   const errors = validationResult(req);
//   const checkValid = await checkValidations(errors);
//   if (checkValid.type === "error") {
//     return res.status(400).send({
//       message: checkValid.errors.msg,
//     });
//   }
//   try {
//     const { email, password, confirmPassword } = req.body;
//     if (password !== confirmPassword) {
//       let errorMsg = "Passwords does not match";
//       return res
//         .status(400)
//         .json({ status: "error", message: errorMsg, statusCode: 400 });
//     }

//     let getId = uuidv4().slice(0, 6);
//     const existingCustomer = await prisma.employee.findFirst({
//       where: {
//         isDeleted: false,
//         OR: [{ email: email }],
//       },
//     });

//     if (existingCustomer) {
//       return res.status(400).json({
//         message: "Customer with this email already exists.",
//       });
//     }

//     const newUser = await prisma.employee.create({
//       data: {
//         id: getId,
//         email: email.trim(),
//         password: md5(password),
//       },
//     });
//     const new_access_token = await generateToken(getId, email);

//     await prisma.employee.update({
//       where: { id: newUser.id },
//       data: {
//         tokens: Array.isArray(newUser.tokens)
//           ? [...newUser.tokens, new_access_token]
//           : [new_access_token],
//       },
//     });

//     return res.status(201).json({
//       message: "Registered successfully",
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: "Something went wrong",
//     });
//   }
// };

// const login = async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     const checkValid = await checkValidations(errors);
//     if (checkValid.type === "error") {
//       return res.status(400).send({
//         message: checkValid.errors.msg,
//       });
//     }

//     const { email, password } = req.body;

//     const user = await prisma.employee.findUnique({
//       where: { email: email },
//       select: {
//         id: true,
//         email: true,
//         status: true,
//         password: true,
//         tokens: true,
//         isDeleted: true,
//       },
//     });

//     if (!user || user.password !== md5(password) || user.isDeleted) {
//       return res.status(400).send({ message: "Invalid Username or Password" });
//     }
//     if (user.status !== "active") {
//       return res.status(400).send({
//         message: "Faild Login..! You don't have permission to login .",
//       });
//     }
//     const new_access_token = await generateToken(user.id, email);
//     await prisma.employee.update({
//       where: { id: user.id },
//       data: {
//         tokens: Array.isArray(user.tokens)
//           ? [...user.tokens, new_access_token]
//           : [new_access_token],
//       },
//     });
//     return res.status(201).json({
//       message: "You have successfully login !",
//       new_access_token,
//     });
//   } catch (error) {
//     console.error("Login error:", error);
//     return res.status(500).json({
//       message: "Something went wrong.",
//     });
//   }
// };
// const sendForgotPasswordOTP = async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     const checkValid = await checkValidations(errors);
//     if (checkValid.type === "error") {
//       return res.status(400).send({ message: checkValid.errors.msg });
//     }

//     const { email } = req.body;
//     const user = await prisma.employee.findFirst({
//       where: {
//         email: email.toLowerCase().trim(),
//         isDeleted: false,
//       },
//     });

//     if (!user) {
//       return res.status(400).send({ message: "employee not found" });
//     }
//     const otp = generateRandomOTP();

//     await sendMail("otp-verify", { "%otp%": otp }, user.email);

//     await prisma.employee.update({
//       where: { id: user.id },
//       data: { otp },
//     });

//     return res.status(200).json({
//       id: user.id,
//       email: user.email,
//       message: "OTP sent Successfully",
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: "Something went wrong",
//       error: error.message,
//     });
//   }
// };

// const validOtp = async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     const checkValid = await checkValidations(errors);
//     if (checkValid.type === "error") {
//       return res.status(400).send({ message: checkValid.errors.msg });
//     }

//     const { email, otp } = req.body;

//     if (!email || !otp) {
//       return res.status(400).send({ message: "Email and OTP are required" });
//     }

//     const user = await prisma.employee.findFirst({
//       where: {
//         email: email.toLowerCase().trim(),
//         isDeleted: false,
//       },
//     });

//     if (!user || !user.otp || user.otp !== otp) {
//       return res.status(400).send({ message: "Invalid OTP" });
//     }

//     const token = uuidv4();

//     await prisma.employee.update({
//       where: { id: user.id },
//       data: {
//         resetToken: token,
//         otp: null,
//       },
//     });

//     return res.status(200).json({
//       message: "OTP verified successfully",
//       id: user.id,
//       resetToken: token,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

// const resetPassword = async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     const checkValid = await checkValidations(errors);
//     if (checkValid.type === "error") {
//       return res.status(400).send({ message: checkValid.errors.msg });
//     }

//     const { token, newPassword, confirmPassword } = req.body;

//     if (!newPassword || !confirmPassword) {
//       return res.status(400).send({
//         message: "New password and confirm password must be provided.",
//       });
//     }

//     if (newPassword !== confirmPassword) {
//       return res.status(400).send({
//         message: "Passwords do not match.",
//       });
//     }

//     const user = await prisma.employee.findFirst({
//       where: {
//         resetToken: token === "null" ? null : token?.toLowerCase().trim(),
//         isDeleted: false,
//       },
//     });

//     if (!user) {
//       return res
//         .status(404)
//         .send({ message: "User not found or invalid token." });
//     }

//     await prisma.employee.update({
//       where: { id: user.id },
//       data: {
//         password: md5(newPassword),
//         resetToken: null,
//       },
//     });

//     return res.status(200).json({ message: "Password reset successfully." });
//   } catch (error) {
//     return res
//       .status(500)
//       .json({ message: "Internal server error.", error: error.message });
//   }
// };

// const changePassword = async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     const checkValid = await checkValidations(errors);
//     if (checkValid.type === "error") {
//       return res.status(400).send({ message: checkValid.errors.msg });
//     }
//     const { id, oldPassword, newPassword, confirmPassword } = req.body;

//     const user = await prisma.employee.findFirst({
//       where: {
//         id: id,
//         isDeleted: false,
//       },
//     });

//     if (!user || !user.password) {
//       return res.status(400).send({ message: "somthing went wrong" });
//     }
//     if (md5(oldPassword.trim()) !== user.password.trim()) {
//       return res.status(400).send({ message: "Invalid Old Password" });
//     }
//     if (!newPassword || !confirmPassword) {
//       return res.status(400).send({
//         message: "New password and confirm password must be provided.",
//       });
//     }

//     const result = await prisma.employee.update({
//       where: { id: user.id },
//       data: {
//         password: md5(newPassword),
//       },
//     });
//     return res.status(200).json({ message: "Password reset successfully." });
//   } catch (error) {
//     return res
//       .status(500)
//       .json({ message: "Internal server error.", error: error.message });
//   }
// };

// module.exports = {
//   signUp,
//   login,
//   sendForgotPasswordOTP,
//   validOtp,
//   resetPassword,
//   changePassword,
// };

const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const md5 = require("md5");
const { validationResult } = require("express-validator");
const { checkValidations } = require("../functions/checkvalidation");
const { sendMail } = require("../functions/mailer");
const { generateRandomOTP, fileUploadFunc } = require("../functions/common");
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
      where: { email: userName, role: "Frontline_Manager" },
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

// const sendForgotPasswordOTP = async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     const checkValid = await checkValidations(errors);
//     if (checkValid.type === "error") {
//       return res.status(400).send({ message: checkValid.errors.msg });
//     }
//     const { email } = req.body;
//     const user = await prisma.employee.findFirst({
//       where: {
//         email: email.toLowerCase().trim(),
//         isDeleted: false,
//       },
//     });

//     if (!user) {
//       return res.status(400).send({ message: "Employee not found" });
//     }

//     const otp = generateRandomOTP();

//     await sendMail("otp-verify", { "%otp%": otp }, user.email);

//     await prisma.employee.update({
//       where: { id: user.id },
//       data: { otp },
//     });

//     return res.status(200).json({
//       id: user.id,
//       email: user.email,
//       message: "OTP sent Successfully",
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: "Something went wrong",
//       error: error.message,
//     });
//   }
// };

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
      return res.status(400).send({ message: "Admin not found" });
    }

    const otp = generateRandomOTP();

    const otpExpiresAt = new Date(Date.now() + 30 * 1000);

    await sendMail("otp-verify", { "%otp%": otp }, user.email);

    await prisma.employee.update({
      where: { id: user.id },
      data: {
        otp,
        otpExpiresAt,
      },
    });

    return res.status(200).json({
      id: user.id,
      email: user.email,
      message: "OTP sent successfully. It will expire in 30 seconds.",
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

    if (new Date() > user.otpExpiresAt) {
      await prisma.employee.update({
        where: { id: user.id },
        data: { otp: null, otpExpiresAt: null },
      });
      return res
        .status(400)
        .send({ message: "OTP has expired. Please request a new one." });
    }

    const token = uuidv4();

    await prisma.employee.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        otp: null,
        otpExpiresAt: null,
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

const checkToken = async (req, res) => {
  try {
    const user = await prisma.employee.findFirst({
      where: {
        id: req.user.id,
        isDeleted: false,
      },
    });

    if (!user) {
      return res
        .status(404)
        .json({ message: "Token expired or invalid. Please re-login." });
    }

    let isConnectAccountEnabled = false;

    if (user.accountId) {
      const account = await getAccounts(user.accountId);

      if (account?.data?.payouts_enabled) {
        isConnectAccountEnabled = true;
      }
    }

    return res.status(200).json({
      message: "Token is valid",
      user: {
        id: user.id,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        profileImg: user.profileImg,
        role: user.role,
        isConnectAccount: isConnectAccountEnabled,
      },
    });
  } catch (error) {
    console.error("Error in checkToken:", error);
    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const employeeTimeLineDetail = async (req, res) => {
  try {
    const id = req.user?.id;
    const data = await prisma.employee.findUnique({
      where: {
        id: id,
        isDeleted: false,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        fullName: true,
        email: true,
        startDate: true,
        phoneNumber: true,
      },
    });

    return res.status(200).json({
      message: "Employee detail retrived successfully !",
      data: data,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const getEmployeeStatus = async (req, res) => {
  try {
    // हम मान रहे हैं कि प्रमाणीकरण (authentication) से हमें यूजर ID मिल रही है
    const employeeId = req.user?.id;

    if (!employeeId) {
      return res.status(401).json({ message: "Not authorized." });
    }

    // Prisma का उपयोग करके TimeClock टेबल में सबसे हालिया रिकॉर्ड ढूंढें
    const lastEvent = await prisma.timeClock.findFirst({
      where: {
        employeeId: employeeId,
      },
      orderBy: {
        timestamp: "desc", // timestamp के अनुसार घटते क्रम में, ताकि सबसे नया पहले मिले
      },
    });

    // अगर कोई रिकॉर्ड नहीं मिलता है
    if (!lastEvent) {
      return res.status(200).json({
        status: "NOT_CLOCKED_IN",
        lastPunch: null,
      });
    }

    // अगर रिकॉर्ड मिलता है, तो उसे भेजें
    return res.status(200).json({
      status: lastEvent.eventType, // जैसे 'CLOCK_IN', 'CLOCK_OUT'
      lastPunch: lastEvent, // पूरा आखिरी पंच ऑब्जेक्ट
    });
  } catch (error) {
    console.error("Error fetching employee status:", error);
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};
// controllers/shopFloorController.js

// ... getEmployeeStatus फंक्शन के बाद ...

const getEmployeeTimeline = async (req, res) => {
  try {
    const employeeId = req.user?.id;

    if (!employeeId) {
      return res.status(401).json({ message: "Not authorized." });
    }

    // आज की शुरुआत और अंत का समय निर्धारित करें
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // findMany का उपयोग करके आज के सभी रिकॉर्ड्स प्राप्त करें
    const timelineEvents = await prisma.timeClock.findMany({
      where: {
        employeeId: employeeId,
        timestamp: {
          gte: startOfDay, // gte = Greater than or equal to
          lte: endOfDay, // lte = Less than or equal to
        },
      },
      orderBy: {
        timestamp: "asc", // पुराने से नए क्रम में ताकि टाइमलाइन सीधी दिखे
      },
      select: {
        // सिर्फ जरूरी डेटा चुनें
        eventType: true,
        timestamp: true,
        notes: true,
      },
    });

    return res.status(200).json({
      message: "Timeline retrieved successfully!",
      data: timelineEvents,
    });
  } catch (error) {
    console.error("Error in getEmployeeTimeline:", error);
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const createTimeLine = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { eventType, timestamp, notes, timezone } = req.body;
    if (!eventType) {
      return res.status(400).json({ message: "eventType is required." });
    }
    const utcTime = timestamp ? new Date(timestamp) : new Date();
    const newTimeClockEntry = await prisma.timeClock.create({
      data: {
        employeeId: employeeId,
        eventType: eventType,
        timestamp: new Date(),
        timezone: timezone || "Asia/Kolkata", // save timezone here
        notes: "SYSTEM Auto CLOCK_OUT for testing every minute",
        createdBy: "SYSTEM",
      },
    });

    // const newTimeClockEntry = await prisma.timeClock.create({
    //   data: {
    //     employeeId,
    //     eventType,
    //     timestamp: utcTime,
    //     timezone, // Save punch timezone here
    //     notes: notes || `User Local Time: ${timezone}`,
    //     createdBy: employeeId,
    //   },
    // });

    return res.status(201).json({
      message: "Time clock event created successfully!",
      data: newTimeClockEntry,
    });
  } catch (error) {
    console.error("createTimeLine error:", error);
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const vacationReq = async (req, res) => {
  try {
    const { startDate, endDate, hours, notes, employeeId } = req.body;
    const userId = req.user.id;
    await prisma.vacationRequest.create({
      data: {
        employeeId: userId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        hours: Number(hours),
        notes: notes,
        createdBy: userId,
      },
    });
    return res.status(201).json({
      message: "vacationReq added successfully!",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const profileDetail = async (req, res) => {
  try {
    const data = await prisma.employee.findFirst({
      where: {
        id: req.user.id,
        isDeleted: false,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        about: true,
        address: true,
        city: true,
        country: true,
        state: true,
        zipCode: true,
        phoneNumber: true,
        employeeProfileImg: true,
      },
    });

    return res.status(200).json({
      message: "Profile detail retrieved successfully!",
      data: data,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try agin later .",
    });
  }
};

const updateProfileApi = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);
    const getProfileImage = fileData?.data?.filter(
      (file) => file?.fieldname === "employeeProfileImg"
    );
    const {
      name,
      email,
      phoneNumber,
      address,
      country,
      state,
      city,
      zipCode,
      about,
    } = req.body;
    await prisma.employee.update({
      where: {
        id: req.user.id,
      },
      data: {
        name: name,
        email: email,
        phoneNumber: phoneNumber,
        address: address,
        country: country,
        state: state,
        city: city,
        zipCode: zipCode,
        about: about,
        employeeProfileImg: getProfileImage?.[0]?.filename,
      },
    });
    return res.status(200).json({
      message: "Profile update successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const deleteProfileImage = async (req, res) => {
  try {
    await prisma.employee.update({
      where: {
        id: req.user.id,
      },
      data: {
        employeeProfileImg: "",
      },
    });
    return res.status(200).json({
      message: "Profile image deleted successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

module.exports = {
  login,
  sendForgotPasswordOTP,
  validOtp,
  resetPassword,
  checkToken,
  employeeTimeLineDetail,
  createTimeLine,
  getEmployeeStatus,
  getEmployeeTimeline,
  vacationReq,
  profileDetail,
  updateProfileApi,
  deleteProfileImage,
};
