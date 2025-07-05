const md5 = require("md5");
const jwt = require("jsonwebtoken");
const {
  paginationQuery,
  pagination,
  generateRandomOTP,
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
        expiresIn: "30d",
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

    await sendMail("otp-verify", { "%otp%": otp }, user.email);

    await prisma.admin.update({
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

    const user = await prisma.admin.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        isDeleted: false,
      },
    });

    if (!user || !user.otp || user.otp !== otp) {
      return res.status(400).send({ message: "Invalid OTP" });
    }

    const token = uuidv4();

    await prisma.admin.update({
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
      part_name,
      quantity,
      need_date,
      cost,
    } = req.body;

    const data = await prisma.supplier_orders.create({
      data: {
        order_number: order_number,
        order_date: order_date,
        supplier_id: supplier_id,
        part_name: part_name,
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
      orderNeeded,
    } = req.body;
    const getId = uuidv4().slice(0, 6);
    await prisma.process.create({
      data: {
        id: getId,
        processName: processName.trim(),
        machineName: machineName.trim(),
        ratePerHour: ratePerHour.trim(),
        partFamily: partFamily.trim(),
        cycleTime: cycleTime.trim(),
        orderNeeded: Boolean(orderNeeded),
        createdBy: req.user?.id,
      },
    });

    return res.status(201).json({
      message: "Process added successfully !",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const processList = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);
    const [allProcess, totalCount] = await Promise.all([
      prisma.process.findMany({
        where: {
          isDeleted: false,
        },
        skip: paginationData.skip,
        take: paginationData.pageSize,
      }),
      prisma.process.count({
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
    const { processName, machineName, cycleTime, ratePerHour, orderNeeded } =
      req.body;
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
          cycleTime: cycleTime,
          ratePerHour: ratePerHour,
          orderNeeded: orderNeeded,
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
  console.log("data", req.body);

  try {
    const errors = validationResult(req);
    const checkValid = await checkValidations(errors);
    if (checkValid.type === "error") {
      return res.status(400).send({ message: checkValid.errors.msg });
    }
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
      customerId,
    } = req.body;

    let firstName = "";
    let lastName = "";
    if (customerName) {
      const nameParts = customerName.trim().split(" ");
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(" ");
    }
    const isCustomerAvl = await prisma.customers.findFirst({
      where: {
        id: customerId,
      },
    });

    if (isCustomerAvl === null) {
      const existingCustomer = await prisma.customers.findFirst({
        where: {
          isDeleted: false,
          OR: [{ email: customerEmail }, { customerPhone: customerPhone }],
        },
      });

      if (existingCustomer) {
        return res.status(400).json({
          message: "Customer with this email or phone number already exists.",
        });
      }
      await prisma.customers.create({
        data: {
          id: customerId,
          firstName: firstName,
          lastName: lastName,
          email: customerEmail,
          customerPhone: customerPhone,
          createdBy: req.user.id,
        },
      });
    }
    const checkStockOrder = await prisma.stockOrder.findFirst({
      where: {
        orderNumber: orderNumber,
      },
    });

    if (checkStockOrder) {
      return res.status(401).send({
        message:
          "This order number already exists. Please try a different order number.",
      });
    }

    await prisma.stockOrder.create({
      data: {
        orderNumber: orderNumber,
        orderDate: orderDate,
        shipDate: shipDate,
        customerName: customerName,
        customerEmail: customerEmail,
        customerPhone: customerPhone,
        productNumber: productNumber,
        productDescription: productDescription,
        productQuantity: Number(productQuantity),
        cost: cost,
        customerId: customerId,
        createdBy: req.user.id,
      },
    });
    return res.status(201).json({
      message: "Stock order created successfully!",
    });
  } catch (error) {
    console.log("error", error);

    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
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
    console.log(error);

    res.status(500).json({ message: "Server error" });
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
    console.log(error);
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
    const {
      partFamily,
      partNumber,
      partDescription,
      cost,
      leadTime,
      supplierOrderQty,
      companyName,
      minStock,
      availableStock,
      cycleTime,
      processOrderRequired,
      processId,
      processDesc,
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
        cost,
        leadTime,
        supplierOrderQty,
        companyName,
        minStock,
        availableStock,
        cycleTime,
        processOrderRequired,
        processId,
        processDesc,
        type: "part",
        submittedBy: req.user.id,
      },
    });

    return res.status(201).json({
      message: "Part number created successfully!",
    });
  } catch (error) {
    console.error(error);
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
    console.log("errorerror", error);
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const createProductNumber = async (req, res) => {
  try {
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
      part_id,
      partQuantity,
      processDesc,
      workInstruction,
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
    console.log("req.bodyreq.body", req.body);
    await prisma.PartNumber.create({
      data: {
        part_id: getId,
        partFamily,
        partNumber: productNumber.trim(),
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
        type: "product",
        submittedBy: req.user.id,
      },
    });
    console.log("partpart", parts);

    for (const part of parts) {
      console.log("partsparts", part);

      await prisma.productTree.create({
        data: {
          product_id: getId,
          part_id: part.part_id,
          partQuantity: Number(part.qty),
        },
      });
      // if (part.workInstruction === "Yes" || part.workInstruction === true) {
      //   await prisma.workInstruction.create({
      //     data: {
      //       partId: part.partNumber,
      //     },
      //   });
      // }
    }

    return res.status(201).json({
      message: "Product number and parts added successfully!",
    });
  } catch (error) {
    console.error("errorerror", error);
    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
    });
  }
};

// const createProductNumber = async (req, res) => {
//   try {
//     const {
//       partFamily,
//       productNumber,
//       partDescription,
//       cost,
//       leadTime,
//       supplierOrderQty,
//       companyName,
//       minStock,
//       availStock,
//       cycleTime,
//       processOrderRequired,
//       processId,
//       part_id,
//       partQuantity,
//       workInstruction,
//     } = req.body;

//     console.log("req.bodyreq.body", req.body.parts);
//     const existingPart = await prisma.partNumber.findUnique({
//       where: {
//         partNumber: productNumber,
//       },
//     });

//     if (existingPart) {
//       return res.status(400).json({
//         message: "Product Number already exists.",
//       });
//     }
//     const getId = uuidv4().slice(0, 6);
//     await prisma.partNumber.create({
//       data: {
//         part_id: getId,
//         partFamily,
//         partNumber: productNumber,
//         partDescription,
//         cost,
//         leadTime,
//         supplierOrderQty,
//         companyName,
//         minStock,
//         availStock,
//         cycleTime,
//         processOrderRequired,
//         processId,
//         processDesc: req?.body?.processDesc,
//         type: "product",
//         submittedBy: req.user.id,
//       },
//     });
//     await prisma.productTree.create({
//       data: {
//         product_id: getId,
//         part_id,
//         partQuantity,
//       },
//     });
//     if (workInstruction === true) {
//       await prisma.workInstruction.create({
//         data: {
//           partId: getId,
//         },
//       });
//     }

//     return res.status(201).json({
//       message: "Product number created successfully!",
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       message: "Something went wrong. Please try again later.",
//     });
//   }
// };

const createProductTree = async (req, res) => {
  try {
    const { product_id, part_id, quantity } = req.body;
    const partExists = await prisma.PartNumber.findUnique({
      where: { part_id },
    });

    if (!partExists) {
      return res
        .status(404)
        .json({ message: "Part not found with given part_id." });
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

    const [productTrees, totalCount] = await Promise.all([
      prisma.productTree.findMany({
        where: {
          isDeleted: false,
        },
        skip: paginationData.skip,
        take: paginationData.pageSize,
        include: {
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
                  orderNeeded: true,
                },
              },
            },
          },
          // ✅ Join product_id to get productNumber
          product: {
            select: {
              partNumber: true, // You’ll get the productNumber here
            },
          },
        },
      }),
      prisma.productTree.count({
        where: {
          isDeleted: false,
        },
      }),
    ]);

    // Group by product_id
    const grouped = {};

    productTrees.forEach((item) => {
      const { product_id, part_id, part, product } = item;

      console.log("productproduct", product);

      if (!grouped[product_id]) {
        grouped[product_id] = {
          product_id,
          productNumber: product?.partNumber || null, // ✅ include productNumber
          parts: [],
        };
      }

      if (part) {
        grouped[product_id].parts.push({
          part_id,
          partNumber: part.partNumber,
          partFamily: part.partFamily,
          process: part.process,
        });
      }
    });

    const result = Object.values(grouped).map((product) => ({
      product_id: product.product_id,
      productNumber: product.productNumber,
      parts: product.parts,
    }));

    const paginated = await pagination({
      data: result,
      page: paginationData.page,
      pageSize: paginationData.pageSize,
      total: Object.keys(grouped).length,
    });

    return res.status(200).json({
      message: "Part number retrieved successfully!",
      result,
      data: paginated.data,
      totalCount,
      pagination: paginated.pagination,
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

    const [allProcess, totalCount] = await Promise.all([
      prisma.PartNumber.findMany({
        where: {
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
    console.log("errorerror", error);
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
      },
      orderBy: {
        partNumber: 'asc',
      },

    })

    return res.status(200).json({
      message: "Product number retrived successfully !",
      data: data,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later.",
    });
  }
}

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
  // createEmployee,
  // allEmployee,
  // employeeDetail,
  // editEmployee,
  // deleteEmployee,
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
  selectCustomerForStockOrder,
  selectProductNumberForStockOrder,
};
