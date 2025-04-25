const md5 = require("md5");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/userModel");
const {
  generateRandomOTP,
  pagination,
  paginationQuery,
} = require("../functions/common");
const { sendMail } = require("../functions/mailer");
const { validationResult } = require("express-validator");
const { checkValidations } = require("../functions/checkvalidation");
const Employee = require("../models/employeeModel");

const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    const checkValid = await checkValidations(errors);
    if (checkValid.type === "error") {
      return res.status(400).send({
        message: checkValid.errors.msg,
      });
    }
    const { email, password, confirmPassword } = req.body;
    const isEmail = await User.countDocuments({
      email: email.toLowerCase().trim(),
      isDeleted: false,
    });

    if (isEmail) {
      return res.status(400).send({
        message:
          "Email is already registered, please add different email address.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).send({
        message: "password and Confirm password must be same .",
      });
    }
    const data = await User.create({
      email: email,
      password: md5(password),
      confirmPassword: md5(confirmPassword),
    });

    const token = jwt.sign({ user: data }, process.env.ACCESS_TOKEN_SECERT, {
      expiresIn: "5d",
    });

    User.updateOne(
      { _id: data._id, isDeleted: false },
      { $push: { tokens: token } }
    ).then();

    return res.status(201).json({
      message: "You have successfully registered. ",
      data: data,
    });
  } catch (error) {
    return res
      .status(500)
      .send({ message: "Something went wrong . please try again later ." });
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
    const users = await User.findOne(
      { email: email.toLowerCase().trim(), isDeleted: false },
      { tokens: 0, createdAt: 0, updatedAt: 0 }
    ).lean(true);

    if (!users && users?.password !== md5(password)) {
      return res.status(400).send({ message: "Invalid Username and Password" });
    }
    const token = jwt.sign({ user: users }, process.env.ACCESS_TOKEN_SECERT, {
      expiresIn: "5d",
    });

    User.updateOne(
      {
        _id: users._id,
        isDeleted: false,
      },
      { $push: { tokens: token } },
      { new: true }
    ).then();

    return res.status(200).send({
      token: token,
      message: "You have successfully login. ",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const forgetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    const checkValid = await checkValidations(errors);
    if (checkValid.type === "error") {
      return res.status(400).send({
        message: checkValid.errors.msg,
      });
    }
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({
      email: normalizedEmail,
      isDeleted: false,
    }).lean(true);

    if (!user) {
      return res.status(400).send({ message: "User not found" });
    }

    const otp = generateRandomOTP();
    const mailVariables = {
      "%otp%": otp,
    };

    User.updateOne(
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
    let user = await User.findOne({ email: email, isDeleted: false }).lean(
      true
    );
    if (!user) {
      user = await User.findOne({
        email: email.toLowerCase().trim(),
        isDeleted: false,
      }).lean(true);
    }

    if (!user) {
      return res.status(400).send({ message: "User not found ." });
    }

    if (user.otp !== otp) {
      return res.status(400).send({ message: "Invalid OTP" });
    }
    const token = uuidv4();
    User.updateOne(
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

    let user = await User.findOne({
      token: token.toLowerCase().trim(),
      isDeleted: false,
    }).lean(true);

    if (!user) {
      return res
        .status(404)
        .send({ message: "User not found or invalid token." });
    }
    User.updateOne(
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

const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    const checkValid = await checkValidations(errors);
    if (checkValid.type === "error") {
      return res.status(400).send({
        message: checkValid.errors.msg,
      });
    }
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (req?.user?.password !== md5(currentPassword)) {
      return res.status(400).send({
        message:
          "The current password you provided does not match. Please double-check and try again.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).send({
        message:
          "The new password and confirm password entries must match. Please ensure they are identical.",
      });
    }

    User.updateOne(
      { _id: req.user._id, isDeleted: false },
      { $set: { password: md5(newPassword), tokens: [] } }
    ).then();

    return res.status(200).send({
      status: 200,
      message: "Your password has been successfully changed.",
    });
  } catch (error) {
    return res
      .status(500)
      .send({ message: "Something went wrong . please try again later ." });
  }
};

const profileUpdate = async (req, res) => {
  try {
    const getProfileImg = req.files.profileImg[0].filename;
    const {
      name,
      email,
      phoneNumber,
      address,
      country,
      state,
      city,
      zipcode,
      about,
    } = req.body;
    const user = await User.findOne(
      { _id: req.user._id, isDeleted: false },
      {}
    ).lean(true);
    if (!user) {
      return res.status(400).send({
        message: "User not found. It's possible the user has been deleted.",
      });
    }
    User.updateOne(
      { _id: req.user?._id, isDeleted: false },
      {
        $set: {
          name: name?.trim(),
          email: email?.trim(),
          phoneNumber: phoneNumber?.trim(),
          address: address?.trim(),
          country: country?.trim(),
          state: state?.trim(),
          city: city?.trim(),
          zipcode: zipcode?.trim(),
          about: about?.trim(),
          profileImage: getProfileImg,
        },
      }
    ).then();
    return res.status(200).json({
      message: "Profile updated successfully !",
    });
  } catch (error) {
    return res
      .status(500)
      .send({ message: "Something went wrong . please try again later ." });
  }
};

const getProfileDetail = async (req, res) => {
  try {
    const data = await User.findOne(
      {
        _id: req.user._id,
        isDeleted: false,
      },
      {
        tokens: 0,
        createdAt: 0,
        updatedAt: 0,
        roles: 0,
        __v: 0,
      }
    ).lean(true);
    if (!data) {
      return res.status(400).send({
        message: "User not found .",
      });
    }
    return res.status(200).json({
      message: "User detail retirved successfully !",
      data: data,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const deleteProfile = async (req, res) => {
  try {
    User.updateOne(
      { _id: req.user._id, isDeleted: false },
      {
        $set: { isDeleted: true },
      }
    ).then();

    return res.status(200).json({
      message: "You have successfully deleted profile !",
    });
  } catch (error) {
    return res
      .status(500)
      .send({ message: "Something went wrong . please try again later ." });
  }
};

const createEmployee = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      fullName,
      hourlyRate,
      shift,
      pin,
      startDate,
      shopFloorLogin,
    } = req.body;
    const data = await Employee.create({
      firstName: firstName,
      lastName: lastName,
      fullName: fullName,
      hourlyRate: hourlyRate,
      shift: shift,
      pin: pin,
      startDate: startDate,
      shopFloorLogin: shopFloorLogin,
      createdBy: req.user?._id,
    });
    return res.status(201).json({
      message: "New employee created successfully !",
      data: data,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const editEmployee = async (req, res) => {
  try {
    const id = req.params.id;
    const {
      firstName,
      lastName,
      fullName,
      hourlyRate,
      shift,
      pin,
      startDate,
      shopFloorLogin,
    } = req.body;
    Employee.updateOne(
      {
        _id: id,
        isDeleted: false,
      },
      {
        $set: {
          firstName: firstName,
          lastName: lastName,
          fullName: fullName,
          hourlyRate: hourlyRate,
          shift: shift,
          pin: pin,
          startDate: startDate,
          shopFloorLogin: shopFloorLogin,
        },
      }
    ).then();
    return res.status(200).json({
      message: "Employee information edit successfully !",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong . please try again later .",
    });
  }
};

const allEmployees = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);
    const [EmployeeData, totalCount] = await Promise.all([
      Employee.find({ isDeleted: false })
        .skip(paginationData.skip)
        .limit(paginationData.pageSize)
        .lean(true),
      Employee.countDocuments({ isDeleted: false }),
    ]);
    const paginationObj = {
      page: paginationData.page,
      pageSize: paginationData.pageSize,
      total: totalCount,
    };
    const getPagination = await pagination(paginationObj);

    if (Employee.length) {
      return res.status(200).send({
        data: EmployeeData,
        current: EmployeeData.length,
        totalCount,
        pagination: getPagination,
        message: "All employees list retirved successfully!",
      });
    }
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try agian later.",
    });
  }
};

const vacationApprovel = async (req, res) => {
  try {
    const {
      isApproved,
      fullName,
      vacationStartDate,
      hourlyRate,
      vacationNote,
    } = req.body;
    Employee.updateOne(
      { _id: req.params.id, isDeleted: false },
      {
        $set: {
          fullName: fullName,
          vacationStartDate: vacationStartDate,
          vacationEndDate: vacationStartDate,
          hourlyRate: hourlyRate,
          vacationNote: vacationNote,
          vacationStatus: isApproved,
        },
      }
    ).then();
    return res.status(200).json({
      message: `Vaccation has been ${isApproved} .`,
    });
  } catch (error) {
    return res
      .status(500)
      .send({ message: "Something went wrong . pleaset try again later ." });
  }
};

const vacationApprovalList = async (req, res) => {
  try {
    const data = await Employee.find(
      { isDeleted: false },
      {
        fullName: 1,
        hourlyRate: 1,
        vacationEndDate: 1,
        vacationStartDate: 1,
        vacationHours: 1,
        vacationNote: 1,
        vacationStatus: 1,
      }
    ).lean(true);
    return res.status(200).json({
      message: "All employee vaccation list retrived successfully !",
      data: data,
    });
  } catch (error) {
    return res
      .status(500)
      .send({ message: "Something went wrong . please try again later ." });
  }
};
module.exports = {
  register,
  login,
  forgetPassword,
  validOtp,
  resetPassword,
  changePassword,
  profileUpdate,
  getProfileDetail,
  deleteProfile,
  createEmployee,
  editEmployee,
  allEmployees,
  vacationApprovel,
  vacationApprovalList,
};
