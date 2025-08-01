const md5 = require("md5");
const jwt = require("jsonwebtoken");
const {
  paginationQuery,
  pagination,
  generateRandomOTP,
  fileUploadFunc,
} = require("../functions/common");
const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");
const { checkValidations } = require("../functions/checkvalidation");
const prisma = require("../config/prisma");
const { sendMail } = require("../functions/mailer");

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
    const user = await prisma.admin.findUnique({
      where: { email: userName },
      select: {
        id: true,
        email: true,
        password: true,
        tokens: true,
        isDeleted: true,
      },
    });

    if (!user || user.password !== md5(password) || user.isDeleted) {
      return res
        .status(400)
        .send({ message: "Invalid Username and Password ." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "5d",
      }
    );

    await prisma.admin.update({
      where: { id: user.id },
      data: {
        tokens: Array.isArray(user.tokens) ? [...user.tokens, token] : [token],
      },
    });

    return res.status(201).json({
      message: "Admin login successfully!",
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
    const user = await prisma.admin.findFirst({
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

    await prisma.admin.update({
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

    const user = await prisma.admin.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        isDeleted: false,
      },
    });

    // Check 1: User nahi mila ya OTP galat hai
    if (!user || !user.otp || user.otp !== otp) {
      return res.status(400).send({ message: "Invalid OTP" });
    }

    // === YAHAN SE BADLAAV SHURU ===

    // Check 2: OTP expire ho chuka hai
    if (new Date() > user.otpExpiresAt) {
      // Expired OTP ko DB se clear kar dein
      await prisma.admin.update({
        where: { id: user.id },
        data: { otp: null, otpExpiresAt: null },
      });
      return res
        .status(400)
        .send({ message: "OTP has expired. Please request a new one." });
    }

    // === BADLAAV KHATAM ===

    const token = uuidv4();

    // OTP aab valid hai, to use clear kar dein aur reset token save karein
    await prisma.admin.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        otp: null,
        otpExpiresAt: null, // Expiry time ko bhi null kar dein
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

    const user = await prisma.admin.findFirst({
      where: {
        resetToken: token === "null" ? null : token?.toLowerCase().trim(),
        isDeleted: false,
      },
    });

    if (!user) {
      return res
        .status(404)
        .send({ message: "Admin not found or invalid token." });
    }

    await prisma.admin.update({
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

const createCustomer = async (req, res) => {
  const errors = validationResult(req);
  const checkValid = await checkValidations(errors);
  if (checkValid.type === "error") {
    return res.status(400).send({
      message: checkValid.errors.msg,
    });
  }
  try {
    const { firstName, lastName, email, address, customerPhone, billingTerms } =
      req.body;
    const userId = req.user.id;
    let getId = uuidv4().slice(0, 6);
    const existingCustomer = await prisma.customers.findFirst({
      where: {
        isDeleted: false,
        OR: [{ email: email }, { customerPhone: customerPhone }],
      },
    });

    if (existingCustomer) {
      return res.status(400).json({
        message: "Customer with this email or phone number already exists.",
      });
    }

    await prisma.customers.create({
      data: {
        id: getId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        address: address?.trim() || "",
        customerPhone: customerPhone?.trim(),
        billingTerms: billingTerms?.trim() || "",
        createdBy: userId,
      },
    });

    return res.status(201).json({
      message: "Customer added successfully!",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const customerList = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);
    const { search = "" } = req.query;
    const [allCustomers, totalCount] = await Promise.all([
      prisma.customers.findMany({
        where: {
          email: {
            contains: search,
          },
          isDeleted: false,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: paginationData.skip,
        take: paginationData.pageSize,
      }),
      prisma.customers.count({
        where: {
          email: {
            contains: search,
          },
          isDeleted: false,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);
    const getPagination = await pagination({
      page: paginationData.page,
      pageSize: paginationData.pageSize,
      total: totalCount,
    });
    return res.status(200).json({
      message: "Customer data retrieved successfully!",
      data: allCustomers,
      totalCount,
      pagination: getPagination,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong .please try again later",
    });
  }
};

const customerDetail = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await prisma.customers.findUnique({
      where: {
        id: id,
        isDeleted: false,
      },
    });
    return res.status(200).json({
      message: "Customer detail retrived successfully !",
      data: user,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later.",
    });
  }
};

const editCustomerDetail = async (req, res) => {
  try {
    const id = req.params.id;
    const { firstName, lastName, email, customerPhone, address, billingTerms } =
      req.body;
    const existingCustomer = await prisma.customers.findFirst({
      where: {
        isDeleted: false,
        OR: [{ email: email }, { customerPhone: customerPhone }],
      },
    });
    if ((existingCustomer && existingCustomer.id !== id) === true) {
      return res.status(400).json({
        message: "Customer with this email or phone number already exists.",
      });
    }
    prisma.customers
      .update({
        where: {
          id: id,
          isDeleted: false,
        },
        data: {
          firstName: firstName,
          lastName: lastName,
          email: email,
          customerPhone: customerPhone,
          address: address,
          billingTerms: billingTerms,
        },
      })
      .then();

    return res.status(200).send({
      message: "Customer detail updated successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const id = req.params.id;
    prisma.customers
      .update({
        where: {
          id: id,
          isDeleted: false,
        },
        data: {
          isDeleted: true,
        },
      })
      .then();

    return res.status(200).json({
      message: "Customer delete successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  } finally {
  }
};

const addSupplier = async (req, res) => {
  const errors = validationResult(req);
  const checkValid = await checkValidations(errors);
  if (checkValid.type === "error") {
    return res.status(400).send({
      message: checkValid.errors.msg,
    });
  }
  try {
    const { firstName, lastName, email, address, billingTerms } = req.body;
    const getId = uuidv4().slice(0, 6);
    const existingCustomer = await prisma.suppliers.findFirst({
      where: {
        isDeleted: false,
        email: email,
      },
    });
    if (existingCustomer) {
      return res.status(400).json({
        message: "Supplier with this email  already exists.",
      });
    }
    await prisma.suppliers
      .create({
        data: {
          id: getId,
          firstName: firstName,
          lastName: lastName,
          email: email,
          address: address,
          billingTerms: billingTerms,
          createdBy: req.user.id,
        },
      })
      .then();

    return res.status(201).json({
      message: "Supplier added successfully!",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const supplierList = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);
    const { search = "" } = req.query;
    const [allSuppliers, totalCount] = await Promise.all([
      prisma.suppliers.findMany({
        where: {
          email: {
            contains: search,
          },
          isDeleted: false,
        },
        skip: paginationData.skip,
        take: paginationData.pageSize,
      }),
      prisma.suppliers.count({
        where: {
          email: {
            contains: search,
          },
          isDeleted: false,
        },
      }),
    ]);
    const getPagination = await pagination({
      page: paginationData.page,
      pageSize: paginationData.pageSize,
      total: totalCount,
    });
    return res.status(200).json({
      message: "Suppliers data retrieved successfully!",
      data: allSuppliers,
      totalCount,
      pagination: getPagination,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong .please try again later",
    });
  }
};

const supplierDetail = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await prisma.suppliers.findUnique({
      where: {
        id: id,
        isDeleted: false,
        createdBy: req.user.id,
      },
    });

    return res.status(200).json({
      message: "Supplier detail retrived successfully !",
      data: data,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later.",
    });
  }
};

const editSupplierDetail = async (req, res) => {
  try {
    const { firstName, lastName, email, address, billingTerms } = req.body;
    const id = req.params?.id;
    const existingCustomer = await prisma.suppliers.findFirst({
      where: {
        isDeleted: false,
        email: email,
      },
    });
    if ((existingCustomer && existingCustomer.id !== id) === true) {
      return res.status(400).json({
        message: "Supplier with this email already exists.",
      });
    }
    prisma.suppliers
      .update({
        where: {
          id: id,
          isDeleted: false,
          createdBy: req.user.id,
        },
        data: {
          firstName: firstName,
          lastName: lastName,
          email: email,
          address: address,
          billingTerms: billingTerms,
        },
      })
      .then();
    return res.status(200).send({
      message: "Supplier detail updated successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const deleteSupplier = async (req, res) => {
  try {
    const id = req.params.id;
    prisma.suppliers
      .update({
        where: {
          id: id,
          isDeleted: false,
        },
        data: {
          isDeleted: true,
        },
      })
      .then();

    return res.status(200).json({
      message: "Supplier delete successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const selectSupplier = async (req, res) => {
  try {
    const suppliers = await prisma.suppliers.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    const formattedSuppliers = suppliers.map((supplier) => ({
      id: supplier.id,
      name: `${supplier.firstName} ${supplier.lastName}`,
    }));
    res.status(200).json(formattedSuppliers);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const supplierOrder = async (req, res) => {
  try {
    const {
      order_number,
      order_date,
      supplier_id,
      part_id,
      quantity,
      need_date,
      cost,
    } = req.body;
    console.log("supplier_idsupplier_id", supplier_id);

    const data = await prisma.supplier_orders.create({
      data: {
        order_number: order_number,
        order_date: order_date,
        supplier_id: supplier_id,
        part_id: part_id,
        quantity: quantity,
        need_date: need_date,
        cost: cost,
        createdBy: req.user.id,
      },
    });

    return res.status(201).json({
      message: "Order added successfully !",
    });
  } catch (error) {
    console.log("errorerror", error);

    return res.status(500).send({
      message: "Something went wrong . please try again later.",
    });
  }
};

const addProcess = async (req, res) => {
  try {
    const {
      processName,
      machineName,
      ratePerHour,
      cycleTime,
      partFamily,
      processDesc,
      orderNeeded,
    } = req.body;

    const trimmedProcessName = processName.trim();
    const checkExistingProcess = await prisma.process.findFirst({
      where: {
        processName: {
          equals: trimmedProcessName,
        },
      },
    });

    if (checkExistingProcess) {
      return res.status(400).json({
        message: "Process name already exists.",
      });
    }

    const getId = uuidv4().slice(0, 6);
    await prisma.process.create({
      data: {
        id: getId,
        processName: processName.trim(),
        machineName: machineName.trim(),
        ratePerHour: ratePerHour.trim(),
        partFamily: partFamily.trim(),
        processDesc: processDesc.trim(),
        cycleTime: cycleTime.trim(),
        orderNeeded: Boolean(orderNeeded),
        createdBy: req.user?.id,
      },
    });

    return res.status(201).json({
      message: "Process added successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const processList = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);
    const { search = "", partfamily = "" } = req.query;

    const orConditions = [];
    if (search) {
      orConditions.push({
        processName: {
          contains: search,
        },
      });
    }
    if (partfamily) {
      orConditions.push({
        partFamily: {
          contains: partfamily,
        },
      });
    }

    const whereFilter = {
      isDeleted: false,
      ...(orConditions.length > 0 ? { OR: orConditions } : {}),
    };

    const [allProcess, totalCount] = await Promise.all([
      prisma.process.findMany({
        where: whereFilter,
        skip: paginationData.skip,
        take: paginationData.pageSize,
      }),
      prisma.process.count({
        where: whereFilter,
      }),
    ]);
    const getPagination = await pagination({
      page: paginationData.page,
      pageSize: paginationData.pageSize,
      total: totalCount,
    });
    return res.status(200).json({
      message: "Process data retrieved successfully!",
      data: allProcess,
      totalCount,
      pagination: getPagination,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const processDetail = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await prisma.process.findUnique({
      where: {
        id: id,
        isDeleted: false,
        createdBy: req.user.id,
      },
    });

    return res.status(200).json({
      message: "Process detail retrived successfully !",
      data: data,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const editProcess = async (req, res) => {
  try {
    const id = req.params.id;
    const {
      processName,
      machineName,
      partFamily,
      cycleTime,
      ratePerHour,
      orderNeeded,
    } = req.body;
    prisma.process
      .update({
        where: {
          id: id,
          isDeleted: false,
          createdBy: req.user.id,
        },
        data: {
          processName: processName,
          machineName: machineName,
          partFamily: partFamily,
          cycleTime: cycleTime,
          ratePerHour: ratePerHour,
          orderNeeded: Boolean(orderNeeded),
        },
      })
      .then();
    return res.status(200).json({
      message: "Process edit successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const deleteProcess = async (req, res) => {
  try {
    const id = req.params.id;
    prisma.process
      .update({
        where: {
          id: id,
          isDeleted: false,
        },
        data: {
          isDeleted: true,
        },
      })
      .then();

    return res.status(200).json({
      message: "Process delete successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  } finally {
  }
};

const createEmployee = async (req, res) => {
  try {
    const getId = uuidv4().slice(0, 6);
    const {
      firstName,
      lastName,
      fullName,
      email,
      hourlyRate,
      shift,
      startDate,
      pin,
      shopFloorLogin,
      termsAccepted,
      status,
    } = req.body;

    const existingEmployee = await prisma.employee.findFirst({
      where: {
        isDeleted: false,
        email: email,
      },
    });

    if (existingEmployee) {
      return res.status(400).json({
        message: "Employee with this email .",
      });
    }

    await prisma.employee.create({
      data: {
        firstName: firstName,
        lastName: lastName,
        fullName: fullName,
        email,
        employeeId: `EMP${getId}`,
        hourlyRate: hourlyRate,
        shift: shift,
        startDate: startDate,
        pin: pin,
        shopFloorLogin: Boolean(shopFloorLogin),
        role: shopFloorLogin === "true" ? "Shop_Floor" : "Frontline",
        termsAccepted: termsAccepted,
        status: status,
        password: "",
        createdBy: req.user.id,
      },
    });
    return res.status(201).json({
      message: "Employee added successfully!",
    });
  } catch (error) {
    console.log("errorerror", error);

    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

// const allEmployee = async (req, res) => {
//   try {
//     const paginationData = await paginationQuery(req.query);
//     const { search = "" } = req.query;

//     const data = await prisma.employee.findMany();
//     const [employeeData, totalCount] = await Promise.all([
//       prisma.employee.findMany({
//         where: {
//           isDeleted: false,
//         },
//         skip: paginationData.skip,
//         take: paginationData.pageSize,
//       }),
//       prisma.employee.count({
//         where: {
//           isDeleted: false,
//         },
//       }),
//     ]);

//     const paginationObj = {
//       page: paginationData.page,
//       pageSize: paginationData.pageSize,
//       total: totalCount,
//     };

//     const getPagination = await pagination(paginationObj);

//     return res.status(200).json({
//       message: "Employee list retrieved successfully!",
//       data: employeeData,
//       totalCounts: totalCount,
//       pagination: getPagination,
//     });
//   } catch (error) {
//     console.error("Employee Fetch Error:", error);
//     return res.status(500).send({
//       message: "Something went wrong. Please try again later.",
//     });
//   }
// };

const allEmployee = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);
    const { search = "", isShopFloor } = req.query;

    const whereCondition = {
      isDeleted: false,
      ...(search && {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
        ],
      }),
      ...(isShopFloor && {
        shopFloorLogin: {
          equals: isShopFloor,
        },
      }),
    };
    const [employeeData, totalCount] = await Promise.all([
      prisma.employee.findMany({
        where: whereCondition,
        skip: paginationData.skip,
        take: paginationData.pageSize,
      }),
      prisma.employee.count({
        where: whereCondition,
      }),
    ]);
    const paginationObj = {
      page: paginationData.page,
      pageSize: paginationData.pageSize,
      total: totalCount,
    };
    const getPagination = await pagination(paginationObj);
    return res.status(200).json({
      message: "Employee list retrieved successfully!",
      data: employeeData,
      totalCounts: totalCount,
      pagination: getPagination,
    });
  } catch (error) {
    console.error("Employee Fetch Error:", error);
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const employeeDetail = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await prisma.employee.findUnique({
      where: {
        id: id,
        isDeleted: false,
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

const editEmployee = async (req, res) => {
  try {
    const id = req.params.id;
    const getId = uuidv4().slice(0, 6);
    const {
      firstName,
      lastName,
      fullName,
      email,
      hourlyRate,
      shift,
      startDate,
      pin,
      shopFloorLogin,
      status,
      termsAccepted,
    } = req.body;
    await prisma.employee.update({
      where: {
        id: id,
        isDeleted: false,
      },
      data: {
        firstName: firstName,
        lastName: lastName,
        fullName: fullName,
        email: email,
        hourlyRate: hourlyRate,
        employeeId: `EMP${getId}`,
        shift: shift,
        startDate: startDate,
        pin: pin,
        status: status,
        shopFloorLogin: shopFloorLogin,
        termsAccepted: termsAccepted,
      },
    });
    return res.status(200).json({
      message: "Employee data updated successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const id = req.params.id;
    prisma.employee
      .update({
        where: {
          id: id,
          isDeleted: false,
        },
        data: {
          isDeleted: true,
        },
      })
      .then();

    return res.status(200).json({
      message: "Employee delete successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const sendMailToEmplyee = async (req, res) => {
  try {
    const errors = validationResult(req);
    const checkValid = await checkValidations(errors);
    if (checkValid.type === "error") {
      return res.status(400).send({ message: checkValid.errors.msg });
    }
    const { email, id, password } = req.body;
    const user = await prisma.employee.findFirst({
      where: {
        id: id,
        isDeleted: false,
      },
    });
    if (!user) {
      return res.status(400).send({ message: "employee not found" });
    }

    const getEmail = await user.email;
    await prisma.employee.update({
      where: {
        id: id,
      },
      data: {
        password: md5(password),
      },
    });
    await sendMail(
      "account-created",
      { "%email%": getEmail, "%password%": password },
      email
    );

    return res.status(200).json({
      message: "Email sent Successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
};
// const createEmployee = async (req, res) => {
//   try {
//     const getId = uuidv4().slice(0, 6);
//     const {
//       firstName,
//       lastName,
//       fullName,
//       email,
//       hourlyRate,
//       shift,
//       startDate,
//       pin,
//       shopFloorLogin,
//       termsAccepted,
//       status,
//     } = req.body;

//     await prisma.employee.create({
//       data: {
//         firstName: firstName,
//         lastName: lastName,
//         fullName: fullName,
//         email,
//         employeeId: `EMP${getId}`,
//         hourlyRate: hourlyRate,
//         shift: shift,
//         startDate: startDate,
//         pin: pin,
//         shopFloorLogin: shopFloorLogin,
//         role: shopFloorLogin === "yes" ? "Shop_Floor" : "Frontline",
//         termsAccepted: termsAccepted,
//         status: status,
//         password: "",
//         createdBy: req.user.id,
//       },
//     });
//     return res.status(201).json({
//       message: "Employee added successfully!",
//     });
//   } catch (error) {
//     return res.status(500).send({
//       message: "Something went wrong . please try again later .",
//     });
//   }
// };

// const allEmployee = async (req, res) => {
//   try {
//     const paginationData = await paginationQuery(req.query);
//     const { search = "" } = req.query;

//     const data = await prisma.employee.findMany();
//     const [employeeData, totalCount] = await Promise.all([
//       prisma.employee.findMany({
//         where: {
//           isDeleted: false,
//         },
//         skip: paginationData.skip,
//         take: paginationData.pageSize,
//       }),
//       prisma.employee.count({
//         where: {
//           isDeleted: false,
//         },
//       }),
//     ]);

//     const paginationObj = {
//       page: paginationData.page,
//       pageSize: paginationData.pageSize,
//       total: totalCount,
//     };

//     const getPagination = await pagination(paginationObj);

//     return res.status(200).json({
//       message: "Employee list retrieved successfully!",
//       data: employeeData,
//       totalCounts: totalCount,
//       pagination: getPagination,
//     });
//   } catch (error) {
//     console.error("Employee Fetch Error:", error);
//     return res.status(500).send({
//       message: "Something went wrong. Please try again later.",
//     });
//   }
// };

// const employeeDetail = async (req, res) => {
//   try {
//     const id = req.params.id;
//     const data = await prisma.employee.findUnique({
//       where: {
//         id: id,
//         isDeleted: false,
//       },
//     });

//     return res.status(200).json({
//       message: "Process detail retrived successfully !",
//       data: data,
//     });
//   } catch (error) {
//     return res.status(500).send({
//       message: "Something went wrong . please try again later .",
//     });
//   }
// };

// const editEmployee = async (req, res) => {
//   try {
//     const id = req.params.id;
//     const getId = uuidv4().slice(0, 6);
//     const {
//       firstName,
//       lastName,
//       fullName,
//       email,
//       hourlyRate,
//       shift,
//       startDate,
//       pin,
//       shopFloorLogin,
//       status,
//       termsAccepted,
//     } = req.body;
//     await prisma.employee.update({
//       where: {
//         id: id,
//         isDeleted: false,
//       },
//       data: {
//         firstName: firstName,
//         lastName: lastName,
//         fullName: fullName,
//         email: email,
//         hourlyRate: hourlyRate,
//         employeeId: `EMP${getId}`,
//         shift: shift,
//         startDate: startDate,
//         pin: pin,
//         status: status,
//         shopFloorLogin: shopFloorLogin,
//         termsAccepted: termsAccepted,
//       },
//     });
//     return res.status(200).json({
//       message: "Employee edit successfully !",
//     });
//   } catch (error) {
//     return res.status(500).send({
//       message: "Something went wrong . please try again later .",
//     });
//   }
// };

// const deleteEmployee = async (req, res) => {
//   try {
//     const id = req.params.id;
//     prisma.employee
//       .update({
//         where: {
//           id: id,
//           isDeleted: false,
//         },
//         data: {
//           isDeleted: true,
//         },
//       })
//       .then();

//     return res.status(200).json({
//       message: "Employee delete successfully !",
//     });
//   } catch (error) {
//     return res.status(500).send({
//       message: "Something went wrong. Please try again later.",
//     });
//   }
// };

const createStockOrder = async (req, res) => {
  try {
    const {
      orderNumber,
      orderDate,
      shipDate,
      productQuantity,
      productNumber,
      productDescription,
      cost,
      totalCost,
      productId,
      customerId,
      customerEmail,
      customerName,
      customerPhone,
    } = req.body;

    const newStockOrder = await prisma.stockOrder.create({
      data: {
        orderNumber,
        orderDate,
        shipDate,
        productQuantity: parseInt(productQuantity, 10),
        productNumber,
        productDescription,
        cost,
        totalCost,
        customerName,
        customerEmail,
        customerPhone,
        customerId: customerId,
        partId: productId,
      },
      include: {
        customer: true,
        part: true,
      },
    });

    res.status(201).json(newStockOrder);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const selectCustomer = async (req, res) => {
  try {
    const customer = await prisma.customers.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
      where: {
        isDeleted: false,
      },
    });

    const formattedSuppliers = customer.map((customer) => ({
      id: customer.id,
      name: `${customer.firstName} ${customer.lastName}`,
    }));
    res.status(200).json(formattedSuppliers);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const selectProcess = async (req, res) => {
  try {
    const process = await prisma.process.findMany({
      select: {
        id: true,
        processName: true,
        partFamily: true,
      },
      where: {
        isDeleted: false,
      },
    });

    const formattedProcess = process.map((process) => ({
      id: process.id,
      name: process.processName,
      partFamily: process.partFamily,
    }));
    res.status(200).json(formattedProcess);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const selectPartNumber = async (req, res) => {
  try {
    const process = await prisma.partNumber.findMany({
      select: {
        part_id: true,
        partNumber: true,
      },
      where: {
        type: "part",
        isDeleted: false,
      },
    });

    const formattedProcess = process.map((process) => ({
      id: process.part_id,
      partNumber: process.partNumber,
    }));
    res.status(200).json({
      data: formattedProcess,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Something went wrong . please try again later ." });
  }
};

const selectProductNumber = async (req, res) => {
  try {
    const process = await prisma.PartNumber.findMany({
      select: {
        part_id: true,
        partNumber: true,
      },
      where: {
        type: "product",
        isDeleted: false,
      },
    });

    const formattedProcess = process.map((process) => ({
      id: process.part_id,
      productNumber: process.partNumber,
    }));
    res.status(200).json({
      data: formattedProcess,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Something went wrong . please try again later ." });
  }
};

const customeOrder = async (req, res) => {
  try {
    const {
      orderNumber,
      orderDate,
      shipDate,
      customerName,
      customerEmail,
      customerPhone,
      productNumber,
      cost,
      productDescription,
      productQuantity,
      processAssign,
      totalTime,
      process,
      customerId,
    } = req.body;

    await prisma.customOrder.create({
      data: {
        orderNumber: orderNumber,
        orderDate: orderDate,
        shipDate: shipDate,
        customerName: customerName,
        customerEmail: customerEmail,
        customerPhone: customerPhone,
        productNumber: productNumber,
        cost: cost,
        productDescription: productDescription,
        productQuantity: productQuantity,
        processAssign: processAssign,
        process: process,
        totalTime: totalTime,
        customerId: customerId,
      },
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const createPartNumber = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);
    const getPartImages = fileData?.data?.filter(
      (file) => file.fieldname === "partImages"
    );
    const {
      partFamily,
      partNumber,
      partDescription,
      cost,
      leadTime,
      supplierOrderQty,
      companyName,
      minStock,
      availStock,
      cycleTime,
      processOrderRequired,
      processId,
      processDesc,
      partImages,
    } = req.body;
    const getId = uuidv4().slice(0, 6);
    const existingPart = await prisma.PartNumber.findUnique({
      where: {
        partNumber: partNumber,
      },
    });

    if (existingPart) {
      return res.status(400).json({
        message: "Part Number already exists.",
      });
    }
    await prisma.PartNumber.create({
      data: {
        part_id: getId,
        partFamily,
        partNumber,
        partDescription,
        cost: parseFloat(cost),
        leadTime: parseInt(leadTime),
        supplierOrderQty: parseInt(supplierOrderQty),
        companyName,
        minStock: parseInt(minStock),
        availStock: parseInt(availStock),
        cycleTime: parseInt(cycleTime),
        processOrderRequired: processOrderRequired === "true",
        processId,
        processDesc,
        type: "part",
        submittedBy: req.user.id,
        partImages: {
          create: getPartImages?.map((img) => ({
            imageUrl: img.filename,
            type: "part",
          })),
        },
      },
    });

    return res.status(201).json({
      message: "Part number created successfully!",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const partNumberList = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);
    const [allProcess, totalCount] = await Promise.all([
      prisma.partNumber.findMany({
        where: {
          type: "part",
          isDeleted: false,
        },
        skip: paginationData.skip,
        take: paginationData.pageSize,
        include: {
          process: {
            select: {
              processName: true,
            },
          },
        },
      }),
      prisma.partNumber.count({
        where: {
          type: "part",
          isDeleted: false,
        },
      }),
    ]);

    const getPagination = await pagination({
      page: paginationData.page,
      pageSize: paginationData.pageSize,
      total: totalCount,
    });

    return res.status(200).json({
      message: "Part number retrieved successfully!",
      data: allProcess,
      totalCount,
      pagination: getPagination,
    });
  } catch (error) {
    console.log("error", error);

    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const createProductNumber = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);
    const getPartImages = fileData?.data?.filter(
      (file) => file.fieldname === "partImages"
    );
    const {
      partFamily,
      productNumber,
      partDescription,
      cost,
      leadTime,
      supplierOrderQty,
      companyName,
      minStock,
      availStock,
      cycleTime,
      processOrderRequired,
      processId,
      processDesc,
      parts = [],
    } = req.body;

    const existingPart = await prisma.partNumber.findUnique({
      where: {
        partNumber: productNumber.trim(),
      },
    });

    if (existingPart) {
      return res.status(400).json({
        message: "Product Number already exists.",
      });
    }

    const getId = uuidv4().slice(0, 6);
    await prisma.PartNumber.create({
      data: {
        part_id: getId,
        partFamily,
        partNumber: productNumber.trim(),
        partDescription,
        cost: parseFloat(cost),
        leadTime: parseInt(leadTime),
        supplierOrderQty: parseInt(supplierOrderQty),
        companyName,
        minStock: parseInt(minStock),
        availStock: parseInt(availStock),
        cycleTime: parseInt(cycleTime),
        processOrderRequired: processOrderRequired === "true",
        processId,
        processDesc,
        type: "product",
        submittedBy: req.user.id,
        partImages: {
          create: getPartImages?.map((img) => ({
            imageUrl: img.filename,
            type: "product",
          })),
        },
      },
    });
    const parsedParts = typeof parts === "string" ? JSON.parse(parts) : parts;
    console.log("parsedPartsparsedParts", parsedParts);

    for (const part of parsedParts) {
      console.log("partpart", part);
      const componentPart = await prisma.partNumber.findUnique({
        where: {
          part_id: part.part_id,
        },
        select: {
          processOrderRequired: true,
        },
      });

      console.log("componentPartcomponentPart", componentPart);

      await prisma.productTree.create({
        data: {
          product_id: getId,
          part_id: part.part_id,
          partQuantity: Number(part.qty),
        },
      });

      await prisma.partNumber.update({
        where: {
          part_id: getId,
          type: "product",
        },
        data: {
          processOrderRequired: componentPart.processOrderRequired,
        },
      });
    }
    return res.status(201).json({
      message: "Product number and parts added successfully!",
    });
  } catch (error) {
    // try {
    //   const fileData = await fileUploadFunc(req, res);
    //   const getPartImages = fileData?.data?.filter(
    //     (file) => file.fieldname === "partImages"
    //   );
    //   const {
    //     partFamily,
    //     productNumber,
    //     partDescription,
    //     cost,
    //     leadTime,
    //     supplierOrderQty,
    //     companyName,
    //     minStock,
    //     availStock,
    //     cycleTime,
    //     processOrderRequired,
    //     processId,
    //     processDesc,
    //     parts = [],
    //   } = req.body;

    //   const existingPart = await prisma.partNumber.findUnique({
    //     where: {
    //       partNumber: productNumber.trim(),
    //     },
    //   });

    //   if (existingPart) {
    //     return res.status(400).json({
    //       message: "Product Number already exists.",
    //     });
    //   }

    //   // Pehle Naya Product (PartNumber) banayein
    //   const newProduct = await prisma.PartNumber.create({
    //     data: {
    //       // part_id Prisma schema mein @default(uuid()) hai, to humein alag se dene ki zaroorat nahi
    //       // Lekin agar aapko wahi 6 digit ka ID chahiye, to use karein.
    //       // part_id: uuidv4().slice(0, 6),
    //       partFamily,
    //       partNumber: productNumber.trim(),
    //       partDescription,
    //       cost: parseFloat(cost),
    //       leadTime: parseInt(leadTime),
    //       supplierOrderQty: parseInt(supplierOrderQty),
    //       companyName,
    //       minStock: parseInt(minStock),
    //       availStock: parseInt(availStock),
    //       cycleTime: parseInt(cycleTime),
    //       processOrderRequired: processOrderRequired === "true",
    //       processId,
    //       processDesc,
    //       type: "product",
    //       submittedBy: req.user.id,
    //       partImages: {
    //         create: getPartImages?.map((img) => ({
    //           imageUrl: img.filename,
    //           type: "product",
    //         })),
    //       },
    //     },
    //     // Naye product ka part_id get karne ke liye select karein
    //     select: {
    //       part_id: true,
    //     },
    //   });

    //   const productId = newProduct.part_id; // Yahan se naye product ka ID mil gaya

    //   const parsedParts = typeof parts === "string" ? JSON.parse(parts) : parts;

    //   // Ab parts ke liye loop chalayein
    //   for (const part of parsedParts) {
    //     // Step 1: Har part ka data 'PartNumber' table se nikalein
    //     // taki uska 'processOrderRequired' status pata chale.
    //     const componentPart = await prisma.partNumber.findUnique({
    //       where: {
    //         part_id: part.part_id,
    //       },
    //       select: {
    //         processOrderRequired: true, // Sirf zaroori field hi select karein
    //       },
    //     });

    //     // Agar part database mein nahi mila, to use skip kar dein
    //     if (!componentPart) {
    //       console.warn(`Part with ID ${part.part_id} not found. Skipping.`);
    //       continue;
    //     }

    //     // Step 2: 'ProductTree' mein record banayein
    //     await prisma.productTree.create({
    //       data: {
    //         product_id: productId, // Naye banaye gaye product ka ID
    //         part_id: part.part_id,
    //         partQuantity: Number(part.qty),
    //         // Yahan par hum component part se mili value ka istemal kar rahe hain
    //         processOrderRequired: componentPart.processOrderRequired,
    //       },
    //     });
    //   }

    //   return res.status(201).json({
    //     message: "Product number and parts added successfully!",
    //   });
    // }

    // try {
    //   const fileData = await fileUploadFunc(req, res);
    //   const getPartImages = fileData?.data?.filter(
    //     (file) => file.fieldname === "partImages"
    //   );
    //   const {
    //     partFamily,
    //     productNumber,
    //     partDescription,
    //     cost,
    //     leadTime,
    //     supplierOrderQty,
    //     companyName,
    //     minStock,
    //     availStock,
    //     cycleTime,
    //     // processOrderRequired is no longer needed from the body for the product itself
    //     processId,
    //     processDesc,
    //     parts = [], // Expecting an array of objects like [{ part_id: '...', qty: 2 }]
    //   } = req.body;

    //   // 1. Check if the product number already exists
    //   const existingPart = await prisma.partNumber.findUnique({
    //     where: { partNumber: productNumber.trim() },
    //   });

    //   if (existingPart) {
    //     return res
    //       .status(400)
    //       .json({ message: "Product Number already exists." });
    //   }

    //   // 2. Parse the incoming parts array
    //   const parsedParts = typeof parts === "string" ? JSON.parse(parts) : parts;
    //   let isProcessRequiredForProduct = false; // Default status is false

    //   // 3. Check the status of component parts IF they exist
    //   if (parsedParts && parsedParts.length > 0) {
    //     // Get all part_ids from the incoming array
    //     const componentPartIds = parsedParts.map((p) => p.part_id);

    //     // Fetch the actual data for these parts from the database
    //     const componentPartsFromDb = await prisma.partNumber.findMany({
    //       where: {
    //         part_id: { in: componentPartIds },
    //         isDeleted: false,
    //       },
    //       select: {
    //         processOrderRequired: true,
    //       },
    //     });

    //     // Check if ANY of the component parts has processOrderRequired as true
    //     isProcessRequiredForProduct = componentPartsFromDb.some(
    //       (part) => part.processOrderRequired === true
    //     );
    //   }

    //   // 4. Create the new Product with the CORRECT processOrderRequired status
    //   const getId = uuidv4().slice(0, 6);
    //   const newProduct = await prisma.partNumber.create({
    //     data: {
    //       part_id: getId,
    //       partFamily,
    //       partNumber: productNumber.trim(),
    //       partDescription,
    //       cost: parseFloat(cost),
    //       leadTime: parseInt(leadTime),
    //       supplierOrderQty: parseInt(supplierOrderQty),
    //       companyName,
    //       minStock: parseInt(minStock),
    //       availStock: parseInt(availStock),
    //       cycleTime: parseInt(cycleTime),
    //       processId,
    //       processDesc,
    //       type: "product",
    //       submittedBy: req.user.id,
    //       // The status is now determined by its parts
    //       processOrderRequired: isProcessRequiredForProduct,
    //       partImages: {
    //         create: getPartImages?.map((img) => ({
    //           imageUrl: img.filename,
    //           type: "product",
    //         })),
    //       },
    //     },
    //   });

    //   // 5. Create the links in the ProductTree table (if parts were provided)
    //   if (parsedParts && parsedParts.length > 0) {
    //     // Using createMany for better performance instead of a loop
    //     await prisma.productTree.createMany({
    //       data: parsedParts.map((part) => ({
    //         product_id: getId, // Use the ID of the product we just created
    //         part_id: part.part_id,
    //         partQuantity: Number(part.qty),
    //       })),
    //     });
    //   }

    //   return res.status(201).json({
    //     message: "Product created successfully!",
    //     data: newProduct,
    //   });
    // }
    console.error("errorerror", error);
    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const createProductTree = async (req, res) => {
  try {
    const { product_id, part_id, quantity } = req.body;

    const partExists = await prisma.PartNumber.findUnique({
      where: { part_id },
    });

    if (!partExists) {
      return res
        .status(404)
        .json({ message: "Part not found with given part id" });
    }
    const getId = uuidv4().slice(0, 6);
    await prisma.productTree.create({
      data: {
        id: getId,
        product_id,
        part_id,
        quantity,
      },
    });

    return res.status(201).json({
      message: "Product tree entry created successfully.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const getProductTree = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);
    const { search = "" } = req.query;

    const [allProcess, totalCount] = await Promise.all([
      prisma.PartNumber.findMany({
        where: {
          partNumber: {
            contains: search,
          },

          type: "product",
          isDeleted: false,
        },
        skip: paginationData.skip,
        take: paginationData.pageSize,
        include: {
          process: {
            select: {
              processName: true,
            },
          },
        },
      }),
      prisma.PartNumber.count({
        where: {
          type: "product",
          isDeleted: false,
        },
      }),
    ]);
    return res.status(200).json({
      message: "Part number retrieved successfully!",
      // result,
      data: allProcess,
      // totalCount,
      // pagination: paginated.pagination,
    });
  } catch (error) {
    console.error("getProductTree error:", error);
    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const bomDataList = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);
    const { search = "", type = "all" } = req.query;

    const filterConditions = {
      isDeleted: false,
    };

    if (search) {
      filterConditions.partNumber = {
        contains: search,
      };
    }
    if (type && type !== "all") {
      filterConditions.type = {
        contains: type,
      };
    }

    const [allProcess, totalCount] = await Promise.all([
      prisma.PartNumber.findMany({
        where: filterConditions,
        skip: paginationData.skip,
        take: paginationData.pageSize,
        include: {
          process: {
            select: {
              processName: true,
            },
          },
        },
      }),
      prisma.PartNumber.count({
        where: filterConditions,
      }),
    ]);

    const getPagination = await pagination({
      page: paginationData.page,
      pageSize: paginationData.pageSize,
      total: totalCount,
    });

    return res.status(200).json({
      message: "Part number retrieved successfully!",
      data: allProcess,
      totalCount,
      pagination: getPagination,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const deleteProductPart = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.productTree.update({
      where: {
        id: id,
      },
      data: {
        part_id: null,
      },
    });

    return res.status(200).json({
      message: "Part deleted successfully!",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const partNumberDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.partNumber.findFirst({
      where: {
        partNumber: id,
      },
      select: {
        part_id: true,
        process: true,
        processId: true,
        supplierOrderQty: true,
        cycleTime: true,
      },
    });
    return res.status(200).json({
      message: "Part number detail retrived successfully !",
      data: data,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later.",
    });
  }
};

const partDetail = async (req, res) => {
  try {
    const id = req.params.id;

    const data = await prisma.partNumber.findUnique({
      where: {
        part_id: id,
      },
      include: {
        process: {
          select: {
            processName: true,
          },
        },
        partImages: {
          select: {
            id: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!data || data.type !== "part" || data.isDeleted) {
      return res.status(404).json({ message: "Part not found!" });
    }

    return res.status(200).json({
      message: "Part detail retrieved successfully!",
      data: data,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const productDetail = async (req, res) => {
  try {
    const id = req.params.id;

    const data = await prisma.partNumber.findUnique({
      where: {
        part_id: id,
        type: "product",
      },
      include: {
        process: {
          select: {
            processName: true,
          },
        },
        partImages: {
          select: {
            imageUrl: true,
          },
        },
      },
    });

    if (!data || data.type !== "part" || data.isDeleted) {
      return res.status(404).json({ message: "Part not found!" });
    }

    return res.status(200).json({
      message: "Part detail retrieved successfully!",
      data: data,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};

// const getSingleProductTree = async (req, res) => {
//   try {
//     const id = req.params.id;
//     const productTrees = await prisma.productTree.findMany({
//       where: {
//         product_id: id,
//         isDeleted: false,
//       },
//       include: {
//         part: {
//           select: {
//             partNumber: true,
//             partFamily: true,
//             process: {
//               select: {
//                 id: true,
//                 processName: true,
//                 machineName: true,
//                 cycleTime: true,
//                 ratePerHour: true,
//                 orderNeeded: true,
//               },
//             },
//           },
//         },
//         product: {
//           select: {
//             partNumber: true,
//             availStock: true,
//             companyName: true,
//             cost: true,
//             cycleTime: true,
//             leadTime: true,
//             supplierOrderQty: true,
//             minStock: true,
//             partFamily: true,
//             partDescription: true,
//             partImages: true,
//           },
//         },
//       },
//     });
//     if (!productTrees || productTrees.length === 0) {
//       return res.status(404).json({
//         message: "Product not found!",
//       });
//     }
//     const productInfo = productTrees[0].product;
//     const instructionRequired = productTrees[0]?.instructionRequired || false;
//     const parts = productTrees.map((pt) => ({
//       id: pt.id,
//       part_id: pt.part_id,
//       partNumber: pt.part?.partNumber || null,
//       partFamily: pt.part?.partFamily || null,
//       process: pt.part?.process || [],
//       instructionRequired: pt.instructionRequired || false,
//       partQuantity: pt.partQuantity || false,
//     }));
//     const result = {
//       product_id: id,
//       productNumber: productInfo?.partNumber || null,
//       instructionRequired: instructionRequired,
//       partDescription: productInfo?.partDescription || null,
//       availStock: productInfo?.availStock || null,
//       companyName: productInfo?.companyName || null,
//       cost: productInfo?.cost || null,
//       cycleTime: productInfo?.cycleTime || null,
//       leadTime: productInfo?.leadTime || null,
//       minStock: productInfo?.minStock || null,
//       supplierOrderQty: productInfo?.supplierOrderQty || null,
//       productImages: productInfo?.partImages,
//       parts,
//     };
//     return res.status(200).json({
//       message: "Product detail retrieved successfully!",
//       data: result,
//     });
//   } catch (error) {
//     console.log("errorerror", error);

//     return res.status(500).json({
//       message: "Something went wrong while fetching product detail.",
//       error: error.message,
//     });
//   }
// };

const getSingleProductTree = async (req, res) => {
  try {
    const id = req.params.id;
    const productInfo = await prisma.partNumber.findUnique({
      where: { part_id: id },
      select: {
        part_id: true,
        partNumber: true,
        partFamily: true,
        partDescription: true,
        availStock: true,
        companyName: true,
        cost: true,
        cycleTime: true,
        leadTime: true,
        minStock: true,
        partImages: true,
      },
    });

    console.log("productInfoproductInfo", productInfo);

    if (!productInfo) {
      return res.status(404).json({ message: "Product not found!" });
    }

    const productTreeEntries = await prisma.productTree.findMany({
      where: {
        product_id: id,
        isDeleted: false,
      },
      select: {
        id: true,
        part_id: true,
        partQuantity: true,
        instructionRequired: true,
        part: {
          select: {
            partNumber: true,
            partFamily: true,
            process: {
              select: {
                id: true,
                processName: true,
                machineName: true,
                cycleTime: true,
                ratePerHour: true,
              },
            },
          },
        },
      },
    });

    const parts = productTreeEntries.map((pt) => ({
      id: pt.id,
      part_id: pt.part_id,
      partNumber: pt.part?.partNumber || null,
      partFamily: pt.part?.partFamily || null,
      process: pt.part?.process || null,
      instructionRequired: pt.instructionRequired,
      partQuantity: pt.partQuantity,
    }));

    const result = {
      product_id: productInfo.part_id,
      productNumber: productInfo.partNumber,
      partFamily: productInfo.partFamily,
      partDescription: productInfo.partDescription,
      availStock: productInfo.availStock,
      companyName: productInfo.companyName,
      cost: productInfo.cost,
      cycleTime: productInfo.cycleTime,
      leadTime: productInfo.leadTime,
      minStock: productInfo.minStock,
      productImages: productInfo.partImages,
      parts,
    };

    return res.status(200).json({
      message: "Product detail retrieved successfully!",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching product tree:", error);
    return res.status(500).json({
      message: "Something went wrong while fetching product detail.",
      error: error.message,
    });
  }
};

const updatePartNumber = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);
    const getPartImages = fileData?.data?.filter(
      (file) => file.fieldname === "partImages"
    );
    const id = req.params.id;
    const {
      partFamily,
      partNumber,
      partDescription,
      cost,
      leadTime,
      supplierOrderQty,
      companyName,
      minStock,
      availStock,
      cycleTime,
      processOrderRequired,
      processId,
      processDesc,
    } = req.body;

    await prisma.partNumber.update({
      where: {
        part_id: id,
        isDeleted: false,
      },
      data: {
        partFamily,
        partNumber,
        partDescription,
        cost: parseFloat(cost),
        leadTime: parseInt(leadTime),
        supplierOrderQty: parseInt(supplierOrderQty),
        companyName,
        minStock: parseInt(minStock),
        availStock: parseInt(availStock),
        cycleTime: parseInt(cycleTime),
        processOrderRequired: processOrderRequired === "true",
        processId,
        processDesc,
        type: "part",
        submittedBy: req.user.id,
      },
    });
    if (getPartImages && getPartImages.length > 0) {
      const imagePromises = getPartImages.map((img) =>
        prisma.partImage.create({
          data: {
            imageUrl: img.filename,
            partId: id,
            type: "part",
          },
        })
      );
      await Promise.all(imagePromises);
    }
    return res.status(200).json({
      message: "Part updated successfully with new images!",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Something went wrong . please try again later ." });
  }
};

const updateProductNumber = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);
    const getPartImages = fileData?.data?.filter(
      (file) => file.fieldname === "partImages"
    );
    const { id } = req.params;
    const {
      partFamily,
      productNumber,
      partDescription,
      cost,
      leadTime,
      supplierOrderQty,
      cycleTime,
      companyName,
      minStock,
      availStock,
      processId,
      parts = [],
      instructionRequired,
    } = req.body;
    const updatedProduct = await prisma.partNumber.update({
      where: { part_id: id },
      data: {
        partFamily,
        partNumber: productNumber,
        partDescription,
        cost: parseFloat(cost),
        leadTime: parseInt(leadTime),
        supplierOrderQty: supplierOrderQty ? parseInt(supplierOrderQty) : null,
        cycleTime: cycleTime ? parseInt(cycleTime) : null,
        companyName,
        minStock: parseInt(minStock),
        availStock: parseInt(availStock),
        processId: processId || null,
      },
    });

    const parsedParts = typeof parts === "string" ? JSON.parse(parts) : parts;

    const existingParts = await prisma.productTree.findMany({
      where: { product_id: id },
    });

    const existingPartMap = new Map(existingParts.map((p) => [p.part_id, p]));
    const incomingPartIds = new Set(parsedParts.map((p) => p.part_id));

    for (const part of parsedParts) {
      const existing = existingPartMap.get(part.part_id);

      const partInstructionRequired = part.instructionRequired === "Yes";

      if (existing) {
        if (
          existing.partQuantity !== Number(part.partQuantity) ||
          existing.instructionRequired !== partInstructionRequired
        ) {
          await prisma.productTree.update({
            where: { id: existing.id },
            data: {
              partQuantity: Number(part.partQuantity),
              instructionRequired: partInstructionRequired,
            },
          });
        }
      } else {
        // Create new BOM entry
        await prisma.productTree.create({
          data: {
            product_id: id,
            part_id: part.part_id,
            partQuantity: Number(part.partQuantity),
            instructionRequired: partInstructionRequired,
          },
        });
      }
    }

    // 7. Delete removed parts
    for (const oldPart of existingParts) {
      if (!incomingPartIds.has(oldPart.part_id)) {
        await prisma.productTree.delete({
          where: { id: oldPart.id },
        });
      }
    }

    // 8. Upload new part images if available
    if (getPartImages?.length > 0) {
      for (const image of getPartImages) {
        await prisma.partImage.create({
          data: {
            imageUrl: image.filename,
            type: "product",
            part: {
              connect: { part_id: id },
            },
          },
        });
      }
    }

    // 9. Send success response
    return res.status(200).json({
      message: "Product and BOM updated successfully!",
      data: updatedProduct,
    });
  } catch (error) {
    console.log("errorerror", error);

    return res.status(500).json({
      message: "Something went wrong while updating the product.",
    });
  }
};

const deletePartNumber = async (req, res) => {
  try {
    const id = req.params.id;
    prisma.partNumber
      .update({
        where: {
          part_id: id,
          isDeleted: false,
        },
        data: {
          isDeleted: true,
        },
      })
      .then();

    return res.status(200).json({
      message: "Supplier delete successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const deleteProductPartNumber = async (req, res) => {
  try {
    const { id } = req.params;
    const { product_id } = req.body;
    await prisma.productTree.deleteMany({
      where: {
        part_id: id,
        product_id: product_id,
      },
    });
    return res.status(200).json({
      message: "Part removed from product successfully!",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong. Please try again.",
    });
  }
};

const deletePartImage = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.partImage.delete({
      where: {
        id: id,
      },
    });
    return res.status(200).json({
      message: "Part image deleted successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const selectCustomerForStockOrder = async (req, res) => {
  try {
    const customer = await prisma.customers.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        customerPhone: true,
      },
      where: {
        isDeleted: false,
      },
    });

    const formattedSuppliers = customer.map((customer) => ({
      id: customer.id,
      name: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      customerPhone: customer.customerPhone,
    }));
    res.status(200).json(formattedSuppliers);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const selectProductNumberForStockOrder = async (req, res) => {
  try {
    const data = await prisma.partNumber.findMany({
      select: {
        part_id: true,
        partNumber: true,
        partDescription: true,
        availStock: true,
        cost: true,
        type: true,
      },
      where: {
        isDeleted: false,
        type: "product",
        processOrderRequired: true,
      },
      orderBy: {
        partNumber: "asc",
      },
    });
    console.log("datadata", data);

    return res.status(200).json({
      message: "Product number retrived successfully !",
      data: data,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later.",
    });
  }
};

const selectPartNumberForCustomOrder = async (req, res) => {
  try {
    const data = await prisma.partNumber.findMany({
      select: {
        part_id: true,
        partNumber: true,
        partDescription: true,
        availStock: true,
        cost: true,
        type: true,
      },
      where: {
        isDeleted: false,
        type: "part",
      },
      orderBy: {
        partNumber: "asc",
      },
    });

    return res.status(200).json({
      message: "Part number retrived successfully !",
      data: data,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later.",
    });
  }
};

const addCustomOrder = async (req, res) => {
  const { processDetails, ...orderData } = req.body;

  if (
    !processDetails ||
    !Array.isArray(processDetails) ||
    processDetails.length === 0
  ) {
    return res.status(400).json({
      message: "`processDetails` must be a non-empty array.",
    });
  }

  try {
    const newCustomOrder = await prisma.customOrder.create({
      data: {
        orderNumber: orderData.orderNumber,
        productNumber: orderData.productNumber,
        partNumber: orderData.partNumber,
        customerName: orderData.customerName,
        customerEmail: orderData.customerEmail,
        customerPhone: orderData.customerPhone,
        customerId: orderData.customerId,
        orderDate: new Date(orderData.orderDate),
        shipDate: new Date(orderData.shipDate),
        productQuantity: parseInt(orderData.productQuantity),
        cost: orderData.cost,
        totalCost: orderData.totalCost,

        processDetails: {
          create: processDetails.map((detail) => ({
            process: detail.process,
            assignTo: detail.assignTo,
            totalTime: parseInt(detail.totalTime),
          })),
        },
      },
      include: {
        processDetails: true,
      },
    });

    return res.status(201).json({
      message: "Custom order and its details created successfully!",
      data: newCustomOrder,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later.",
    });
  }
};

const getCustomOrderById = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await prisma.customOrder.findUnique({
      where: {
        id: id,
      },
      include: {
        processDetails: true,
        customer: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        message: `Custom order with ID '${id}' not found.`,
      });
    }

    return res.status(200).json({
      message: "Custom order retrieved successfully!",
      data: order,
    });
  } catch (error) {
    console.error(`Error fetching custom order with ID ${id}:`, error);
    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const searchStockOrders = async (req, res) => {
  try {
    const { customerName, shipDate, productNumber } = req.query;
    if (!customerName && !shipDate && !productNumber) {
      return res.status(400).json({
        message: "Please provide at least one search parameter.",
        data: null,
      });
    }
    const whereClause = {
      isDeleted: false,
    };
    if (customerName) {
      whereClause.customer = {
        firstName: {
          contains: customerName,
        },
      };
    }
    if (productNumber) {
      whereClause.part = {
        partNumber: {
          contains: productNumber,
        },
      };
    }

    if (shipDate) {
      whereClause.shipDate = {
        equals: shipDate,
      };
    }

    const orders = await prisma.stockOrder.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customer: true,

        part: {
          include: {
            components: {
              select: {
                partQuantity: true,

                part: {
                  select: {
                    part_id: true,
                    partNumber: true,
                    partDescription: true,
                    minStock: true,
                    cost: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (orders.length === 0) {
      return res.status(200).json({
        message: "No stock orders found matching your criteria.",
        data: [],
      });
    }

    return res.status(200).json({
      message: "Stock orders retrieved successfully!",
      data: orders,
    });
  } catch (error) {
    console.error("Error searching stock orders:", error);
    if (error.name === "PrismaClientValidationError") {
      return res.status(400).json({
        message: "Invalid search query. Please check the field names.",
        error: error.message,
        data: null,
      });
    }
    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
      data: null,
    });
  }
};

// const stockOrderSchedule = async (req, res) => {
//   try {
//     const {
//       order_id,
//       productId,
//       part_id,
//       process_id,
//       schedule_date,
//       submitted_by,
//       customersId,
//       type,
//     } = req.body;

//     if (type === "product" && productId) {
//       const bomEntries = await prisma.productTree.findMany({
//         where: { product_id: productId },
//         include: {
//           part: {
//             include: {
//               process: true,
//             },
//           },
//         },
//       });

//       if (!bomEntries || bomEntries.length === 0) {
//         return res.status(404).json({
//           message:
//             "No component parts found in the ProductTree for this product. Cannot schedule.",
//         });
//       }

//       const scheduleCreationPromises = bomEntries.map((entry) => {
//         const componentPart = entry.part;

//         if (!componentPart) {
//           throw new Error(
//             `A record in ProductTree for product ${productId} has a missing or invalid part_id.`
//           );
//         }
//         if (!componentPart.processId) {
//           throw new Error(
//             `Component part ${componentPart.partNumber} (ID: ${componentPart.part_id}) does not have a default process assigned.`
//           );
//         }

//         const dataForThisComponent = {
//           schedule_date: new Date(schedule_date),
//           submitted_by,
//           type: "part",

//           order: { connect: { id: order_id } },
//           part: { connect: { part_id: componentPart.part_id } },
//           process: { connect: { id: componentPart.processId } },
//         };
//         if (customersId) {
//           dataForThisComponent.customers = { connect: { id: customersId } };
//         }

//         return prisma.stockOrderSchedule.create({ data: dataForThisComponent });
//       });

//       const newSchedules = await prisma.$transaction(scheduleCreationPromises);

//       return res.status(201).json({
//         message: `Successfully scheduled ${newSchedules.length} component parts for the product.`,
//         data: newSchedules,
//       });
//     } else if (type === "part" && part_id && process_id) {
//       const dataToCreate = {
//         type,
//         submitted_by,
//         schedule_date: new Date(schedule_date),
//         order: { connect: { id: order_id } },
//         process: { connect: { id: process_id } },
//         part: { connect: { part_id: part_id } },
//       };

//       if (customersId) {
//         dataToCreate.customers = { connect: { id: customersId } };
//       }

//       const newSchedule = await prisma.stockOrderSchedule.createMany([
//         {
//           data: dataToCreate,
//         },
//       ]);

//       return res.status(201).json({
//         message: "Stock order part scheduled successfully!",
//         data: newSchedule,
//       });
//     } else {
//       // Handle invalid request case
//       return res.status(400).json({
//         message:
//           "Invalid request. Please provide a valid 'type' ('product' or 'part') and the corresponding IDs.",
//       });
//     }
//   } catch (error) {
//     console.error("Error creating stock order schedule:", error);
//     return res.status(500).json({
//       message: "Something went wrong during scheduling.",
//       error: error.message,
//     });
//   }
// };

// const stockOrderSchedule = async (req, res) => {
//   const ordersToSchedule = req.body;
//   console.log("ordersToScheduleordersToSchedule", ordersToSchedule);

//   // 1. --- Basic Validation ---
//   if (!Array.isArray(ordersToSchedule) || ordersToSchedule.length === 0) {
//     return res.status(400).json({
//       message: "Request body must be a non-empty array of items to schedule.",
//     });
//   }

//   try {
//     const allPrismaPromises = [];

//     for (const order of ordersToSchedule) {
//       const {
//         order_id,
//         part_id,
//         quantity,
//         status,
//         order_date,
//         delivery_date,
//         completed_date,
//         processOrder,
//         product_id,
//       } = order;
//       console.log("orderorder", order);

//       if (product_id) {
//         const bomEntries = await prisma.productTree.findMany({
//           where: { product_id: product_id },
//           include: {
//             part: {
//               include: {
//                 process: true,
//               },
//             },
//           },
//         });

//         console.log("bomEntriesbomEntries", bomEntries);

//         if (!bomEntries || bomEntries.length === 0) {
//           // If one product fails, we should stop the whole transaction
//           throw new Error(
//             `No component parts found in ProductTree for product ID ${product_id}. Cannot schedule.`
//           );
//         }

//         const componentSchedulePromises = bomEntries.map((entry) => {
//           const dataForThisComponent = {
//             schedule_date: new Date(schedule_date),
//             submitted_by,
//             type: "part",
//             qty: scheduled_quantity,
//             order: { connect: { id: order_id } },
//             part: { connect: { part_id: entry.part.part_id } },
//             process: { connect: { id: entry.part.processId } },
//             ...(customersId && { customers: { connect: { id: customersId } } }),
//           };
//           return prisma.stockOrderSchedule.create({
//             data: dataForThisComponent,
//           });
//         });

//         allPrismaPromises.push(...componentSchedulePromises);
//       } else if (part_id) {
//         const partData = await prisma.part.findUnique({ where: { part_id } });
//         if (!partData || !partData.processId) {
//           throw new Error(
//             `Part with ID ${part_id} not found or has no process assigned.`
//           );
//         }

//         const dataForThisPart = {
//           schedule_date: new Date(schedule_date),
//           submitted_by,
//           type: "part",
//           scheduled_quantity,
//           order: { connect: { id: order_id } },
//           part: { connect: { part_id: part_id } },
//           process: { connect: { id: partData.processId } },
//           ...(customersId && { customers: { connect: { id: customersId } } }),
//         };

//         const partSchedulePromise = prisma.stockOrderSchedule.create({
//           data: dataForThisPart,
//         });
//         allPrismaPromises.push(partSchedulePromise);
//       } else {
//         throw new Error(
//           `Invalid item in payload: type '${type}' with missing ID.`
//         );
//       }
//     }

//     if (allPrismaPromises.length > 0) {
//       const newSchedules = await prisma.$transaction(allPrismaPromises);
//       return res.status(201).json({
//         message: `Successfully scheduled ${newSchedules.length} new items.`,
//         data: newSchedules,
//       });
//     } else {
//       return res.status(200).json({
//         message: "No new items needed to be scheduled.",
//       });
//     }
//   } catch (error) {
//     console.error("Error creating stock order schedule batch:", error);
//     return res.status(500).json({
//       message: "Something went wrong during the scheduling batch.",
//       error: error.message,
//     });
//   }
// };

const stockOrderSchedule = async (req, res) => {
  const ordersToSchedule = req.body;
  try {
    const allPrismaPromises = [];
    for (const order of ordersToSchedule) {
      const { order_id, product_id, quantity, delivery_date, status } = order;
      if (product_id) {
        const bomEntries = await prisma.productTree.findMany({
          where: { product_id: product_id },
          include: { part: { include: { process: true } } },
        });
        const componentSchedulePromises = bomEntries.map((entry) => {
          const dataForThisComponent = {
            delivery_date: new Date(delivery_date),
            submittedBy: { connect: { id: req.user.id } },
            quantity: quantity,
            order: { connect: { id: order_id } },
            part: { connect: { part_id: entry.part.part_id } },
            process: { connect: { id: entry.part.processId } },
            status: status,
            completed_date: null,
          };

          return prisma.stockOrderSchedule.create({
            data: dataForThisComponent,
          });
        });
        allPrismaPromises.push(...componentSchedulePromises);
      }
    }

    if (allPrismaPromises.length > 0) {
      const newSchedules = await prisma.$transaction(allPrismaPromises);

      return res.status(201).json({
        message: `Successfully scheduled ${newSchedules.length} new items.`,
        data: newSchedules,
      });
    } else {
      return res.status(200).json({ message: "No new items to schedule." });
    }
  } catch (error) {
    console.error("Error during batch scheduling:", error);
    return res.status(500).json({
      message: "Something went wrong during scheduling.",
      error: error.message,
    });
  }
};

// const scheduleStockOrdersList = async (req, res) => {
//   try {
//     const paginationData = await paginationQuery(req.query);

//     const [allSchedules, totalCount] = await Promise.all([
//       prisma.stockOrderSchedule.findMany({
//         where: {
//           isDeleted: false,
//         },
//         skip: paginationData.skip,
//         take: paginationData.pageSize,
//         orderBy: {
//           createdAt: "desc",
//         },
//         include: {
//           order: {
//             select: {
//               id: true,
//               orderNumber: true,
//               orderDate: true,
//               shipDate: true,
//               status: true,
//               part: {
//                 select: { partNumber: true },
//               },
//               customer: {
//                 select: {
//                   firstName: true,
//                   lastName: true,
//                 },
//               },
//             },
//           },
//           part: {
//             select: {
//               partNumber: true,
//               process: true,
//             },
//           },
//           product: {
//             select: {
//               part_id: true,
//               partNumber: true,
//               partDescription: true,
//               process: true,
//             },
//           },
//         },
//       }),
//       prisma.stockOrderSchedule.count({
//         where: {
//           isDeleted: false,
//         },
//       }),
//     ]);

//     const getPagination = await pagination({
//       page: paginationData.page,
//       pageSize: paginationData.pageSize,
//       total: totalCount,
//     });

//     return res.status(200).json({
//       message: "Scheduled orders retrieved successfully!",
//       data: allSchedules,
//       pagination: getPagination,
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({
//       message: "Something went wrong. Please try again later.",
//       error: error.message,
//     });
//   }
// };

const scheduleStockOrdersList = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);

    const [allSchedules, totalCount] = await Promise.all([
      prisma.stockOrderSchedule.findMany({
        where: {
          isDeleted: false,
        },
        skip: paginationData.skip,
        take: paginationData.pageSize,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              orderDate: true,
              shipDate: true,
              status: true,
              part: {
                select: { partNumber: true },
              },
            },
          },
          part: {
            select: {
              partNumber: true,
              process: true,
            },
          },
        },
      }),
      prisma.stockOrderSchedule.count({
        where: {
          isDeleted: false,
        },
      }),
    ]);

    const getPagination = await pagination({
      page: paginationData.page,
      pageSize: paginationData.pageSize,
      total: totalCount,
    });

    return res.status(200).json({
      message: "Scheduled orders retrieved successfully!",
      data: allSchedules,
      pagination: getPagination,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
      error: error.message,
    });
  }
};

const deleteProductTreeById = async (req, res) => {
  try {
    const id = req.params.id;
    await prisma.partNumber.update({
      where: {
        part_id: id,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
      },
    });

    return res.status(200).json({
      message: "deleteProductTreeById deleted successfully !",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong . please try again later .",
    });
  }
};

const profileDetail = async (req, res) => {
  try {
    const data = await prisma.admin.findFirst({
      where: {
        id: req.user.id,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        address: true,
        phoneNumber: true,
        zipCode: true,
        about: true,
        country: true,
        city: true,
        state: true,
        profileImg: true,
        isDeleted: true,
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
      (file) => file?.fieldname === "profileImg"
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
    await prisma.admin.update({
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
        profileImg: getProfileImage?.[0]?.filename,
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
    await prisma.admin.update({
      where: {
        id: req.user.id,
      },
      data: {
        profileImg: "",
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

const getAllSupplierOrder = async (req, res) => {
  try {
    const { search = "" } = req.query;
    const paginationData = await paginationQuery(req.query);

    const filterConditions = {
      isDeleted: false,
    };

    if (search) {
      filterConditions.order_number = {
        contains: search,
      };
    }

    const [getAllSupplierOrder, totalCount] = await Promise.all([
      prisma.supplier_orders.findMany({
        where: filterConditions,
        include: {
          part: {
            select: {
              partNumber: true,
            },
          },
          supplier: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        skip: paginationData.skip,
        take: paginationData.pageSize,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.supplier_orders.count({
        where: filterConditions,
      }),
    ]);

    const paginationObj = {
      page: paginationData.page,
      pageSize: paginationData.pageSize,
      total: totalCount,
    };

    const getPagination = await pagination(paginationObj);

    return res.status(200).json({
      message: "Supplier order list retrieved successfully!",
      data: getAllSupplierOrder,
      totalCounts: totalCount,
      pagination: getPagination,
    });
  } catch (error) {
    console.error("Supplier Fetch Error:", error);
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const updateSupplierOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { order_date, part_name, quantity, cost, need_date } = req.body;

    console.log("see the body", req.body);

    const result = await prisma.supplier_orders.updateMany({
      where: {
        id: id,
        isDeleted: false,
      },
      data: {
        order_date,
        part_name,
        quantity,
        cost,
        need_date,
      },
    });

    return res.status(200).json({
      message: "SupplierOrder updated successfully",
    });
  } catch (error) {
    console.error("Error updating SupplierOrder", error);
    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const deleteSupplierOrder = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await prisma.supplier_orders.updateMany({
      where: {
        id: id,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
      },
    });

    console.log("see the result", result);
    return res.status(200).json({
      message: "SupplierOrder delete successfully !",
    });
  } catch (error) {
    console.log("see the error ", error);
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

// const deleteSupplierOrder = async (req, res) => {
//   try {
//     const id = req.params.id;
//     const result = await prisma.supplier_orders.updateMany({
//       where: {
//         order_number: id,
//         isDeleted: false,
//       },
//       data: {
//         isDeleted: true,
//       },
//     })

//     console.log("see the result", result);
//     return res.status(200).json({
//       message: "SupplierOrder delete successfully !",
//     });
//   } catch (error) {
//     console.log("see the error ", error);
//     return res.status(500).send({
//       message: "Something went wrong . please try again later .",
//     });
//   }
// }

// const selectProcessStationUser = async (req, res) => {
//   try {
//     const employeeData = await prisma.employee.findMany({
//       where: {
//         isDeleted: false,
//       },

//       select: {
//         id: true,
//         employeeId: true,
//         email: true,
//         fullName: true,
//       },
//     });
//     const formatted = employeeData.map((employee) => ({
//       id: employee.id || null,
//       name: employee.fullName || null,
//       employeeId: employee.employeeId || null,
//       email: employee.email || null,
//     }));
//     return res.status(200).json(formatted);
//   } catch (error) {
//     return res.status(500).send({
//       message: "Something went wrong. Please try again later.",
//     });
//   }
// };

module.exports = {
  login,
  sendForgotPasswordOTP,
  validOtp,
  resetPassword,
  createCustomer,
  customerList,
  customerDetail,
  editCustomerDetail,
  deleteCustomer,
  addSupplier,
  supplierList,
  supplierDetail,
  editSupplierDetail,
  deleteSupplier,
  selectSupplier,
  supplierOrder,
  addProcess,
  processList,
  processDetail,
  editProcess,
  deleteProcess,
  createStockOrder,
  selectCustomer,
  customeOrder,
  createPartNumber,
  createProductNumber,
  createProductTree,
  selectProcess,
  partNumberList,
  bomDataList,
  selectPartNumber,
  selectPartNumber,
  partNumberDetail,
  getProductTree,
  selectProductNumber,
  partDetail,
  productDetail,
  getSingleProductTree,
  updatePartNumber,
  deletePartNumber,
  updateProductNumber,
  deleteProductPartNumber,
  deletePartImage,
  selectCustomerForStockOrder,
  selectProductNumberForStockOrder,
  selectPartNumberForCustomOrder,
  addCustomOrder,
  getCustomOrderById,
  searchStockOrders,
  stockOrderSchedule,
  scheduleStockOrdersList,
  deleteProductPart,
  deleteProductTreeById,
  createEmployee,
  allEmployee,
  employeeDetail,
  editEmployee,
  deleteEmployee,
  sendMailToEmplyee,
  updateProfileApi,
  profileDetail,
  deleteProfileImage,
  getAllSupplierOrder,
  updateSupplierOrder,
  deleteSupplierOrder,
};
