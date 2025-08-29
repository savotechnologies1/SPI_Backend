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
        roles: true,
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
      { id: user.id, email: user.email, role: user.roles },
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

    if (!user || !user.otp || user.otp !== otp) {
      return res.status(400).send({ message: "Invalid OTP" });
    }

    if (new Date() > user.otpExpiresAt) {
      await prisma.admin.update({
        where: { id: user.id },
        data: { otp: null, otpExpiresAt: null },
      });
      return res
        .status(400)
        .send({ message: "OTP has expired. Please request a new one." });
    }

    const token = uuidv4();

    await prisma.admin.update({
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

const checkToken = async (req, res) => {
  try {
    const user = await prisma.admin.findFirst({
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
        role: user.roles,
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
        billingTerms: billingTerms.toString()?.trim() || "",
        createdBy: userId,
      },
    });

    return res.status(201).json({
      message: "Customer added successfully!",
    });
  } catch (error) {
    console.log("errorerror", error);

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
            contains: search.trim(),
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
    const id = req.params.id; // The ID of the customer being updated
    const { firstName, lastName, email, customerPhone, address, billingTerms } =
      req.body;

    // Find if any OTHER customer has the same email or phone number
    const existingOtherCustomer = await prisma.customers.findFirst({
      where: {
        id: {
          not: id, // Exclude the current customer being updated
        },
        isDeleted: false,
        OR: [{ email: email }, { customerPhone: customerPhone }],
      },
    });

    if (existingOtherCustomer) {
      return res.status(400).json({
        message:
          "Customer with this email or phone number already exists for another customer.",
      });
    }

    await prisma.customers // Added await here to ensure the update completes before sending response
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
      });

    return res.status(200).send({
      message: "Customer detail updated successfully !",
    });
  } catch (error) {
    console.error("Error updating customer:", error); // Log the error for debugging
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
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
      quantity,
      need_date,
      newSupplier,
      createdBy,
      part_id,
    } = req.body;

    const partDetails = await prisma.partNumber.findUnique({
      where: { part_id },
      select: {
        minStock: true,
        availStock: true,
        cost: true,
        processOrderRequired: true,
      },
    });

    if (!partDetails) {
      return res.status(404).json({ message: "Part not found" });
    }

    let finalSupplierId = supplier_id;
    let supplierDetails = {}; // Variable to hold supplier's details

    if (finalSupplierId === null && newSupplier) {
      const newSupplierRecord = await prisma.suppliers.create({
        data: {
          firstName: newSupplier.firstName,
          lastName: newSupplier.lastName,
          email: newSupplier.email,
        },
      });
      finalSupplierId = newSupplierRecord.id;
      supplierDetails = {
        firstName: newSupplierRecord.firstName,
        lastName: newSupplierRecord.lastName,
        email: newSupplierRecord.email,
      };
    } else if (finalSupplierId) {
      // If using an existing supplier, fetch their details
      const existingSupplier = await prisma.suppliers.findUnique({
        where: { id: finalSupplierId },
      });
      if (!existingSupplier) {
        return res
          .status(404)
          .json({ message: "Existing supplier not found." });
      }
      supplierDetails = {
        firstName: existingSupplier.firstName,
        lastName: existingSupplier.lastName,
        email: existingSupplier.email,
      };
    }

    if (!finalSupplierId) {
      return res.status(400).json({ message: "Supplier ID is missing." });
    }

    await prisma.supplier_orders.create({
      data: {
        order_number,
        order_date,
        supplier_id: finalSupplierId,
        firstName: supplierDetails.firstName,
        lastName: supplierDetails.lastName,
        email: supplierDetails.email,
        quantity,
        need_date,
        createdBy: req.user?.id,
        part_id,
        cost: partDetails.cost,
      },
    });

    if (!partDetails.processOrderRequired) {
      await prisma.supplier_inventory.upsert({
        where: { part_id },
        update: {
          minStock: partDetails.minStock,
          availStock: partDetails.availStock,
          cost: partDetails.cost,
          supplier_id: finalSupplierId,
        },
        create: {
          part_id,
          minStock: partDetails.minStock,
          availStock: partDetails.availStock,
          cost: partDetails.cost,
          supplier_id: finalSupplierId,
        },
      });
    }

    res.status(201).json({ message: "Supplier order created" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const supplierOrderDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.supplier_orders.findFirst({
      where: {
        id: id,
      },
    });
    return res.status(200).json({
      message: "Supplier order  detail retrived successfully !",
      data: data,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later.",
    });
  }
};

const sendSupplierEmail = async (req, res) => {
  try {
    const { id } = req.body;

    const orderDetail = await prisma.supplier_orders.findUnique({
      where: { id: id, isDeleted: false },
      select: {
        id: true,
        order_date: true,
        order_number: true,
        cost: true,
        quantity: true,
        need_date: true,
        supplier: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        part: {
          select: {
            partNumber: true,
          },
        },
      },
    });

    if (!orderDetail) {
      return res.status(404).json({ message: "Order not found." });
    }

    const formattedOrderDate = new Date(
      orderDetail.order_date
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedNeedDate = new Date(
      orderDetail.need_date
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const templateData = {
      "{{supplier_name}}": `${orderDetail.supplier.firstName} ${orderDetail.supplier.lastName}`,
      "{{order_number}}": orderDetail.order_number,
      "{{order_date}}": formattedOrderDate,
      "{{part_name}}": orderDetail.part.partNumber,
      "{{quantity}}": orderDetail.quantity,
      "{{cost}}": `$${parseFloat(orderDetail.cost).toFixed(2)}`,
      "{{need_date}}": formattedNeedDate,
    };

    const supplierEmail = orderDetail.supplier.email;

    await sendMail("send-order-to-the-supplier", templateData, supplierEmail);

    return res.status(200).json({
      message: "Email successfully sent to the supplier.",
    });
  } catch (error) {
    console.error("Failed to send supplier email:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// const supplierOrder = async (req, res) => {
//   try {
//     const {
//       order_number,
//       order_date,
//       supplier_id,
//       part_id,
//       quantity,
//       need_date,
//       cost,
//     } = req.body;

//     const partDetails = await prisma.partNumber.findUnique({
//       where: { part_id },
//       select: { minStock: true, availStock: true, cost: true },
//     });

//     if (!partDetails) {
//       return res.status(404).json({ message: "Part not found" });
//     }

//     // 2️⃣ Supplier order create karo with auto-filled fields
//     const newOrder = await prisma.supplier_orders.create({
//       data: {
//         order_number,
//         order_date,
//         supplier_id,
//         quantity,
//         need_date,
//         createdBy,
//         part_id,
//         cost: partDetails.cost, // cost from PartNumber
//         minStock: partDetails.minStock, // new field in supplier_orders
//         availStock: partDetails.availStock,
//       },
//     });

//     return res.status(201).json({
//       message: "Order added successfully !",
//     });
//   } catch (error) {
//     console.log("errorerror", error);

//     return res.status(500).send({
//       message: "Something went wrong . please try again later.",
//     });
//   }
// };

const addProcess = async (req, res) => {
  try {
    const {
      processName,
      machineName,
      ratePerHour,
      cycleTime,
      partFamily,
      processDesc,
      isProcessReq,
    } = req.body;
    const trimmedProcessName = processName.trim();
    const checkExistingProcess = await prisma.process.findFirst({
      where: {
        isDeleted: false,
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
    const isProcessRequired = String(isProcessReq).toLowerCase() === "true";
    const getId = uuidv4().slice(0, 6);
    await prisma.process.create({
      data: {
        id: getId,
        processName: processName.trim(),
        machineName: machineName.trim(),
        ratePerHour: ratePerHour,
        partFamily: partFamily.trim(),
        processDesc: processDesc.trim(),
        cycleTime: cycleTime.trim(),
        isProcessReq: Boolean(isProcessRequired),
        orderNeeded: Boolean(isProcessRequired),
        createdBy: req.user?.id,
      },
    });

    return res.status(201).json({
      message: "Process added successfully !",
    });
  } catch (error) {
    console.log("errorerror", error);
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
    console.log("errorerrorerrorm", error);

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
      processDesc,
      isProcessReq,
    } = req.body;

    const trimmedProcessName = processName.trim();

    const checkExistingProcess = await prisma.process.findFirst({
      where: {
        processName: trimmedProcessName,
        isDeleted: false,
      },
    });

    // ✅ If process name already exists AND it's not the same process we are editing
    if (checkExistingProcess && checkExistingProcess.id !== id) {
      return res.status(400).json({
        message: "Process name already exists.",
      });
    }

    await prisma.process.update({
      where: {
        id: id,
        isDeleted: false,
        createdBy: req.user.id,
      },
      data: {
        processName: trimmedProcessName,
        machineName,
        processDesc,
        partFamily,
        cycleTime,
        ratePerHour,
        isProcessReq: Boolean(isProcessReq),
      },
    });

    return res.status(200).json({
      message: "Process updated successfully!",
    });
  } catch (error) {
    console.error("Error in editProcess:", error);
    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
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
      role,
      processLogin,
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
        role: role,
        processLogin: Boolean(processLogin),
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
    const { search = "", processLogin } = req.query;
    const paginationData = await paginationQuery(req.query); // page, pageSize, skip

    const whereCondition = {
      isDeleted: false,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(processLogin === "true" || processLogin === "false"
        ? { processLogin: processLogin === "true" }
        : {}),
    };

    const [employeeData, totalCount] = await Promise.all([
      prisma.employee.findMany({
        where: whereCondition,
        skip: paginationData.skip,
        take: paginationData.pageSize,
        orderBy: { createdAt: "desc" }, // optional
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
    return res.status(500).json({
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
      role,
      processLogin,
      status,
      termsAccepted,
    } = req.body;
    console.log("processLoginprocessLogin", processLogin);

    console.log("req.bodyreq.body111", Boolean(req.body.processLogin));

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
        role: role,
        processLogin: req.body.processLogin === "true" ? true : false,
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
// createStockOrder.js

// Assuming 'prisma' is your Prisma client instance
// const { prisma } = require('../db');

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
      customerId, // Can be a real ID or a temporary UUID for a new customer
      customerEmail,
      customerName,
      customerPhone,
    } = req.body;

    let finalCustomerId; // This will hold the ID of the customer for the order

    // --- CORRECTED LOGIC TO HANDLE NEW OR EXISTING CUSTOMER ---

    // We receive a customerId for both existing and new customers.
    // The key is to check if this ID actually exists in our database.
    const existingCustomerById = await prisma.customers.findUnique({
      where: { id: customerId },
    });

    if (existingCustomerById) {
      // CASE 1: The customerId provided exists. This is an existing customer.
      finalCustomerId = existingCustomerById.id;
    } else {
      // CASE 2: The customerId was not found. This is a new customer.
      // The frontend sent a temporary UUID which we can now ignore.

      // 1. Check for duplicates using email or phone number to be safe.
      const duplicateCustomer = await prisma.customers.findFirst({
        where: {
          OR: [{ email: customerEmail }, { customerPhone: customerPhone }],
        },
      });

      if (duplicateCustomer) {
        return res.status(409).json({
          // 409 Conflict is more appropriate here
          message: "A customer with this email or phone number already exists.",
        });
      }

      // 2. Create the new customer since no duplicate was found.
      const newCustomer = await prisma.customers.create({
        data: {
          // Note: Handle names carefully. If customerName can be a single word, this logic is needed.
          firstName: customerName.split(" ")[0],
          lastName: customerName.split(" ").slice(1).join(" ") || "", // Provide empty string if no last name
          email: customerEmail,
          customerPhone: customerPhone,
          createdBy: req.user?.id, // Assuming req.user is populated by authentication middleware
        },
      });

      // 3. Use the newly created customer's ID for the order.
      finalCustomerId = newCustomer.id;
    }

    // --- CONTINUE WITH ORDER CREATION USING finalCustomerId ---

    // Validate Product and Stock
    const product = await prisma.partNumber.findUnique({
      where: { part_id: productId },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    if (parseInt(productQuantity, 10) > (product.availStock || 0)) {
      return res.status(400).json({
        message: `Only ${
          product.availStock || 0
        } units are available in stock.`,
      });
    }

    // Check for duplicate order (optional but good practice)
    const existingOrder = await prisma.stockOrder.findFirst({
      where: {
        customerId: finalCustomerId,
        partId: productId,
        shipDate,
        isDeleted: false,
      },
    });

    if (existingOrder) {
      return res.status(400).json({
        message:
          "This product is already added for the selected customer on this date.",
      });
    }

    // Create the Stock Order
    await prisma.stockOrder.create({
      data: {
        orderNumber,
        orderDate,
        shipDate,
        productQuantity: parseInt(productQuantity, 10),
        productNumber,
        productDescription,
        cost,
        totalCost,
        customerName, // Storing these might be redundant if you join tables, but can be useful for historical data
        customerEmail,
        customerPhone,
        customerId: finalCustomerId, // This ID is now guaranteed to be a valid one
        partId: productId,
      },
    });

    res.status(201).json({ message: "Stock order added successfully!" });
  } catch (error) {
    console.error("Error creating stock order:", error);
    res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
};
const addCustomOrder = async (req, res) => {
  try {
    const {
      orderNumber,
      orderDate,
      shipDate,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      productId,
      part_id, // This can be an empty string ""
      cost,
      totalCost,
      productQuantity,
      newParts,
    } = req.body;

    if (!newParts || !Array.isArray(newParts) || newParts.length === 0) {
      return res
        .status(400)
        .send({ message: "At least one process detail must be added." });
    }

    const newCustomOrder = await prisma.$transaction(async (tx) => {
      // --- CUSTOMER LOGIC (This part is correct) ---
      let customer;
      if (customerId) {
        customer = await tx.customers.findUnique({
          where: { id: customerId },
        });
      }

      if (!customer) {
        if (!customerName || !customerEmail) {
          throw new Error(
            "Customer name and email are required to create a new customer."
          );
        }
        customer = await tx.customers.create({
          data: {
            firstName: customerName.split(" ")[0],
            lastName: customerName.split(" ").slice(1).join(" ") || "",
            email: customerEmail,
            customerPhone: customerPhone,
            createdBy: req.user?.id,
          },
        });
      }
      // --- CUSTOMER LOGIC ENDS ---

      // --- SOLUTION IS HERE ---
      // Create the custom order using the final customer's ID.
      const createdOrder = await tx.customOrder.create({
        data: {
          orderNumber,
          orderDate: new Date(orderDate),
          shipDate: new Date(shipDate),
          customerId: customer.id,
          customerName,
          customerEmail,
          customerPhone,
          productId,
          // Conditionally add partId only if it has a valid value.
          // If part_id is "" or null, this line will not be added to the data object.
          ...(part_id && { partId: part_id }),
          cost: parseFloat(cost),
          totalCost: parseFloat(totalCost),
          productQuantity: parseInt(productQuantity, 10),
          processDetails: {
            create: newParts.map((item) => ({
              totalTime: parseInt(item.totalTime, 10),
              process: item.processId,
              assignTo: item.part,
            })),
          },
        },
      });

      // The rest of your logic for handling parts and product tree remains the same.
      for (const processItem of newParts) {
        let partRecord = await tx.partNumber.findUnique({
          where: { partNumber: processItem.part },
        });

        if (!partRecord) {
          partRecord = await tx.partNumber.create({
            data: {
              partNumber: processItem.part,
              partFamily: `${processItem.part} Family`,
              type: "part",
              cost: parseFloat(cost),
              leadTime: parseInt(processItem.totalTime, 10) || 0,
              minStock: 0,
              companyName: "SPI Custom",
              processId: processItem.processId,
            },
          });
        } else {
          partRecord = await tx.partNumber.update({
            where: { part_id: partRecord.part_id },
            data: { processId: processItem.processId },
          });
        }

        await tx.productTree.upsert({
          where: {
            product_part_unique: {
              product_id: productId,
              part_id: partRecord.part_id,
            },
          },
          update: {
            processId: processItem.processId,
            partQuantity: { increment: 1 },
          },
          create: {
            product_id: productId,
            part_id: partRecord.part_id,
            partQuantity: 1,
            processId: processItem.processId,
            createdBy: customer.id,
          },
        });
      }
      return createdOrder;
    });

    return res.status(201).json({
      message:
        "Custom order created and product structure updated successfully!",
      data: newCustomOrder,
    });
  } catch (error) {
    console.error("Error during custom order transaction:", error);
    return res.status(500).send({
      message: "Something went wrong. The operation was rolled back.",
      error: error.message,
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

const selectProcess = async (req, res) => {
  try {
    const process = await prisma.process.findMany({
      select: {
        id: true,
        processName: true,
        partFamily: true,
        processDesc: true,
      },
      where: {
        isDeleted: false,
      },
    });

    const formattedProcess = process.map((process) => ({
      id: process.id,
      name: process.processName,
      partFamily: process.partFamily,
      processDesc: process.processDesc,
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

// const customeOrder = async (req, res) => {
//   try {
//     const {
//       orderNumber,
//       orderDate,
//       shipDate,
//       customerName,
//       customerEmail,
//       customerPhone,
//       productNumber,
//       cost,
//       productDescription,
//       productQuantity,
//       processAssign,
//       totalTime,
//       process,
//       customerId,
//     } = req.body;

//     await prisma.customOrder.create({
//       data: {
//         orderNumber: orderNumber,
//         orderDate: orderDate,
//         shipDate: shipDate,
//         customerName: customerName,
//         customerEmail: customerEmail,
//         customerPhone: customerPhone,
//         productNumber: productNumber,
//         cost: cost,
//         productDescription: productDescription,
//         productQuantity: productQuantity,
//         processAssign: processAssign,
//         process: process,
//         totalTime: totalTime,
//         customerId: customerId,
//       },
//     });
//   } catch (error) {
//     return res.status(500).send({
//       message: "Something went wrong . please try again later .",
//     });
//   }
// };

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
    console.log("partNumberpartNumber", partNumber);

    const existingActivePart = await prisma.partNumber.findFirst({
      where: {
        partNumber: partNumber,
        isDeleted: false, // Only consider active part numbers as existing
      },
    });

    console.log("existingPartexistingPart", existingActivePart);

    if (existingActivePart) {
      return res.status(400).json({
        message: "Part Number already exists.",
      });
    }
    await prisma.partNumber.create({
      data: {
        part_id: getId,
        partFamily,
        partNumber,
        partDescription,
        cost: parseFloat(cost),
        leadTime: parseInt(leadTime),
        supplierOrderQty: parseInt(supplierOrderQty),
        companyName,
        minStock: parseInt(req?.body?.minStock),
        availStock: parseInt(req?.body?.availStock),
        cycleTime: parseInt(req?.body?.cycleTime),
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
    console.log("errorerror", error);

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
      instructionRequired,
      processId,
      processDesc,
      parts = [],
    } = req.body;
    console.log("processIdprocessId", processId);

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
    console.log("partsparts", parts);

    const parsedParts = typeof parts === "string" ? JSON.parse(parts) : parts;
    console.log("parsedPartsparsedParts", parsedParts);

    for (const part of parsedParts) {
      console.log("3333");

      const componentPart = await prisma.partNumber.findUnique({
        where: {
          part_id: part.part_id,
        },
        select: {
          processOrderRequired: true,
        },
      });
      console.log(
        "getIdgetId",
        getId,
        part,
        processOrderRequired,
        instructionRequired
      );
      await prisma.productTree.create({
        data: {
          product_id: getId,
          processId: processId,
          part_id: part.part_id,
          partQuantity: Number(part.qty),
          processOrderRequired: processOrderRequired === "true" ? true : false,
          instructionRequired: instructionRequired === "true" ? true : false,
        },
      });

      await prisma.partNumber.update({
        where: {
          part_id: getId,
          type: "product",
        },
        data: {
          processId: processId,
          // processOrderRequired: componentPart.processOrderRequired,
          processOrderRequired: processOrderRequired === "true" ? true : false,
          instructionRequired: instructionRequired === "true",
        },
      });
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
        contains: search.trim(),
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
        availStock: true,
        cycleTime: true,
        instructionRequired: true,
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
        supplierOrderQty: true,
        instructionRequired: true,
        processDesc: true,
        processId: true,
        processOrderRequired: true,
      },
    });

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
      supplierOrderQty: productInfo.supplierOrderQty,
      instructionRequired: productInfo.instructionRequired,
      processDesc: productInfo.processDesc,
      processId: productInfo.processId,
      processOrderRequired: productInfo.processOrderRequired,
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
      message: "Part updated successfully!",
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
      processDesc,
      processOrderRequired,
      instructionRequired,
      // -----------------------------------------------------------
      parts = [],
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
        // --- FIX: Add the fields to the Prisma update data object ---
        processDesc: processDesc,
        processOrderRequired: processOrderRequired === "true", // Convert form string to boolean
        instructionRequired: instructionRequired === "true", // Convert form string to boolean
        // ---------------------------------------------------------
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

    for (const oldPart of existingParts) {
      if (!incomingPartIds.has(oldPart.part_id)) {
        await prisma.productTree.delete({
          where: { id: oldPart.id },
        });
      }
    }

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

    return res.status(200).json({
      message: "Product and BOM updated successfully!",
      data: updatedProduct,
    });
  } catch (error) {
    // Add better logging for easier debugging
    console.error("Error while updating product:", error);
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
      message: "Part delete successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const deleteProductPartsNumber = async (req, res) => {
  try {
    const id = req.params.id;
    prisma.partNumber
      .delete({
        where: {
          id: id,
        },
      })
      .then();

    return res.status(200).json({
      message: "Part removed from product successfully!",
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
        // stockOrders: {
        //   none: {
        //     status: "scheduled",
        //     isDeleted: false,
        //   },
        // },
      },
      orderBy: {
        partNumber: "asc",
      },
    });

    // --- KYA BADLA GAYA HAI (WHAT HAS CHANGED) ---
    // Hum `data` array ke har object ko transform kar rahe hain.
    // Har object se `part_id` nikal kar use `product_id` ke naam se ek naye object mein daal rahe hain.
    const transformedData = data.map(
      ({ part_id, partDescription, ...rest }) => ({
        productId: part_id, // part_id ko product_id bana diya
        productDescription: partDescription,
        ...rest, // Baaki saari properties (partNumber, partDescription, etc.) waise hi rahengi
      })
    );
    // ---------------------------------------------

    return res.status(200).json({
      message: "Product number retrived successfully !",
      // Yahan original 'data' ki jagah 'transformedData' bhejenge
      data: transformedData,
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

// const addCustomOrder = async (req, res) => {
//   const { newParts, ...orderData } = req.body;

//   try {
//     // Step 1: Create custom order
//     const newCustomOrder = await prisma.customOrder.create({
//       data: {
//         orderNumber: orderData.orderNumber,
//         productNumber: orderData.productNumber || null,
//         partNumber: orderData.partNumber || null,
//         customerName: orderData.customerName,
//         customerEmail: orderData.customerEmail,
//         customerPhone: orderData.customerPhone,
//         customerId: orderData.customerId,
//         orderDate: new Date(orderData.orderDate),
//         shipDate: new Date(orderData.shipDate),
//         productQuantity: parseInt(orderData.productQuantity),
//         cost: orderData.cost,
//         totalCost: orderData.totalCost,
//       },
//       include: {
//         processDetails: true,
//       },
//     });

//     // Step 2: Insert parts from newParts array
//     if (Array.isArray(newParts) && newParts.length > 0) {
//       for (const part of newParts) {
//         await prisma.partNumber.create({
//           data: {
//             partNumber: part.part, // from payload
//             partFamily: `${part.part} family`, // dummy family name
//             partDescription: part.process, // description from process
//             type: "custom", // you can set as needed
//             cost: parseFloat(orderData.cost), // or different cost per part
//             leadTime: part.totalTime || 0,
//             minStock: 0,
//             availStock: 0,
//             companyName: "Custom", // default value
//             createdBy: orderData.customerId,
//           },
//         });
//       }
//     }

//     return res.status(201).json({
//       message: "Custom order and parts created successfully!",
//       order: newCustomOrder,
//     });
//   } catch (error) {
//     console.error("Error creating custom order:", error);
//     return res.status(500).send({
//       message: "Something went wrong. Please try again later.",
//     });
//   }
// };

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
      status: {
        not: "scheduled",
      },
    };
    if (customerName) {
      whereClause.customer = {
        firstName: {
          contains: customerName.trim(),
        },
      };
    }
    if (productNumber) {
      whereClause.part = {
        partNumber: {
          contains: productNumber.trim(),
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
                  where: {
                    processOrderRequired: true,
                  },
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

    // const data = await prisma.stockOrderSchedule.findFirst({});

    // if (orders.length === 0) {
    //   return res.status(200).json({
    //     message: "No stock orders found matching your criteria.",
    //     data: [],
    //   });
    // }

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

// const searchCustomOrders = async (req, res) => {
//   try {
//     const { customerName, shipDate, productNumber } = req.query;
//     console.log("req.queryreq.query", req.query);
//     if (!customerName && !shipDate && !productNumber) {
//       return res.status(400).json({
//         message: "Please provide at least one search parameter.",
//         data: null,
//       });
//     }

//     const whereClause = {
//       isDeleted: false,
//     };

//     if (customerName) {
//       whereClause.customerName = {
//         contains: customerName,
//       };
//     }

//     if (productNumber) {
//       whereClause.part = {
//         partNumber: {
//           contains: productNumber,
//         },
//       };
//     }

//     if (shipDate) {
//       whereClause.shipDate = {
//         equals: new Date(shipDate),
//       };
//     }
//     const orders = await prisma.customOrder.findMany({
//       where: whereClause,
//       orderBy: {
//         createdAt: "desc",
//       },
//       include: {
//         customer: true,
//         part: true,
//         processDetails: true,
//       },
//     });

//     if (orders.length === 0) {
//       return res.status(200).json({
//         message: "No custom orders found matching your criteria.",
//         data: [],
//       });
//     }

//     return res.status(200).json({
//       message: "Custom orders retrieved successfully!",
//       data: orders,
//     });
//   } catch (error) {
//     console.error("Error searching custom orders:", error);
//     if (error.name === "PrismaClientValidationError") {
//       return res.status(400).json({
//         message: "Invalid search query. Please check the field names.",
//         error: error.message,
//         data: null,
//       });
//     }
//     return res.status(500).json({
//       message: "Something went wrong. Please try again later.",
//       data: null,
//     });
//   }
// };

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

// when only part is  going for processing in production response

// const stockOrderSchedule = async (req, res) => {
//   const ordersToSchedule = req.body;
//   try {
//     const allPrismaPromises = [];
//     let lastOrderId;
//     for (const order of ordersToSchedule) {
//       const { order_id, product_id, quantity, delivery_date, status } = order;
//       lastOrderId = order_id;
//       if (product_id) {
//         const bomEntries = await prisma.productTree.findMany({
//           where: { product_id: product_id },
//           include: { part: { include: { process: true } } },
//         });
//         const componentSchedulePromises = bomEntries.map((entry) => {
//           const createData = {
//             delivery_date: new Date(delivery_date),
//             quantity: quantity,
//             status: status,
//             completed_date: null,
//             submittedBy: { connect: { id: req.user.id } },
//             order: { connect: { id: order_id } },
//             part: { connect: { part_id: entry.part.part_id } },
//             process: { connect: { id: entry.part.processId } },
//           };
//           const updateData = {
//             delivery_date: new Date(delivery_date),
//             quantity: quantity,
//             status: status,
//             completed_date: null,
//           };
//           return prisma.stockOrderSchedule.upsert({
//             where: {
//               order_id_part_id: {
//                 order_id: order_id,
//                 part_id: entry.part.part_id,
//               },
//             },
//             update: updateData,
//             create: createData,
//           });
//         });
//         allPrismaPromises.push(...componentSchedulePromises);
//       }
//     }

//     if (allPrismaPromises.length > 0) {
//       const newSchedules = await prisma.$transaction(allPrismaPromises);
//       await prisma.stockOrder.updateMany({
//         where: {
//           id: lastOrderId,
//           isDeleted: false,
//         },
//         data: {
//           status: "scheduled",
//         },
//       });

//       return res.status(201).json({
//         message: `Successfully scheduled or updated ${newSchedules.length} items.`,
//         data: newSchedules,
//       });
//     } else {
//       return res.status(200).json({ message: "No new items to schedule." });
//     }
//   } catch (error) {
//     console.error("Error during batch scheduling:", error);
//     return res.status(500).json({
//       message: "Something went wrong during scheduling.",
//       error: error.message,
//     });
//   }
// };

// const stockOrderSchedule = async (req, res) => {
//   const ordersToSchedule = req.body;
//   try {
//     const allPrismaPromises = [];
//     let lastOrderId;
//     for (const order of ordersToSchedule) {
//       const { order_id, product_id, quantity, delivery_date, status } = order;
//       lastOrderId = order_id;
//       if (product_id) {
//         const bomEntries = await prisma.productTree.findMany({
//           where: { product_id: product_id },
//           include: { part: { include: { process: true } } },
//         });
//         const componentSchedulePromises = bomEntries.map((entry) => {
//           const createData = {
//             delivery_date: new Date(delivery_date),
//             quantity: quantity,
//             status: status,
//             completed_date: null,
//             submittedBy: { connect: { id: req.user.id } },
//             order: { connect: { id: order_id } },
//             part: { connect: { part_id: entry.part.part_id } },
//             process: { connect: { id: entry.part.processId } },
//           };
//           const updateData = {
//             delivery_date: new Date(delivery_date),
//             quantity: quantity,
//             status: status,
//             completed_date: null,
//           };
//           return prisma.stockOrderSchedule.upsert({
//             where: {
//               order_id_part_id: {
//                 order_id: order_id,
//                 part_id: entry.part.part_id,
//               },
//             },
//             update: updateData,
//             create: createData,
//           });
//         });
//         allPrismaPromises.push(...componentSchedulePromises);
//       }
//     }

//     if (allPrismaPromises.length > 0) {
//       const newSchedules = await prisma.$transaction(allPrismaPromises);
//       await prisma.stockOrder.updateMany({
//         where: {
//           id: lastOrderId,
//           isDeleted: false,
//         },
//         data: {
//           status: "scheduled",
//         },
//       });

//       return res.status(201).json({
//         message: `Successfully scheduled or updated ${newSchedules.length} items.`,
//         data: newSchedules,
//       });
//     } else {
//       return res.status(200).json({ message: "No new items to schedule." });
//     }
//   } catch (error) {
//     console.error("Error during batch scheduling:", error);
//     return res.status(500).json({
//       message: "Something went wrong during scheduling.",
//       error: error.message,
//     });
//   }
// };

// when product is also going for processing in production response

// const searchCustomOrders = async (req, res) => {
//   try {
//     const { customerName, shipDate, productNumber } = req.query;
//     console.log("req.queryreq.query", req.query);
//     if (!customerName && !shipDate && !productNumber) {
//       return res.status(400).json({
//         message: "Please provide at least one search parameter.",
//         data: null,
//       });
//     }

//     const andConditions = [{ isDeleted: false }];

//     if (customerName) {
//       andConditions.push({ customerName: { contains: customerName } });
//     }
//     if (shipDate) {
//       andConditions.push({ shipDate: { equals: new Date(shipDate) } });
//     }
//     if (productNumber) {
//       andConditions.push({
//         OR: [
//           { part: { partNumber: { contains: productNumber } } },
//           {
//             processDetails: { some: { assignTo: { contains: productNumber } } },
//           },
//         ],
//       });
//     }

//     // Step 1: Pehle saare matching orders fetch karo
//     const orders = await prisma.customOrder.findMany({
//       where: { AND: andConditions },
//       orderBy: { createdAt: "desc" },
//       include: {
//         customer: true,
//         part: true,
//         processDetails: true,
//       },
//     });

//     if (orders.length === 0) {
//       return res.status(200).json({
//         message: "No custom orders found matching your criteria.",
//         data: [],
//       });
//     }

//     // Step 2: Data ko process karke extra part details add karo
//     const enrichedOrders = await Promise.all(
//       orders.map(async (order) => {
//         // Har order ke processDetails se saare 'assignTo' part numbers nikaalo
//         if (!order.processDetails || order.processDetails.length === 0) {
//           // Agar processDetails nahi hai, to ek khaali array add kardo
//           return { ...order, assignedParts: [] };
//         }

//         // Saare non-null part numbers collect karo
//         const partNumbersToFind = order.processDetails
//           .map((detail) => detail.assignTo)
//           .filter((pn) => pn != null); // Sirf non-null values lo

//         // Duplicate part numbers hata do
//         const uniquePartNumbers = [...new Set(partNumbersToFind)];

//         if (uniquePartNumbers.length === 0) {
//           return { ...order, assignedParts: [] };
//         }

//         // Un part numbers ki details PartNumber table se fetch karo
//         // NOTE: Yahaan 'prisma.part' use karein, jo aapke 'PartNumber' table ka model hai
//         const assignedPartsDetails = await prisma.partNumber.findMany({
//           where: {
//             partNumber: {
//               in: uniquePartNumbers,
//             },
//           },
//         });

//         // Final order object me original data ke saath 'assignedParts' array bhi daal do
//         return {
//           ...order,
//           assignedParts: assignedPartsDetails,
//         };
//       })
//     );

//     return res.status(200).json({
//       message: "Custom orders retrieved successfully!",
//       data: enrichedOrders, // Processed data bhejo
//     });
//   } catch (error) {
//     console.error("Error searching custom orders:", error);
//     if (error.name === "PrismaClientValidationError") {
//       return res.status(400).json({
//         message: "Invalid search query. Please check the field names.",
//         error: error.message,
//         data: null,
//       });
//     }
//     return res.status(500).json({
//       message: "Something went wrong. Please try again later.",
//       data: null,
//     });
//   }
// };

// const searchCustomOrders = async (req, res) => {
//   try {
//     const { customerName, shipDate, partNumber } = req.query;
//     if (!customerName && !shipDate && !partNumber) {
//       return res.status(400).json({
//         message: "Please provide at least one search parameter.",
//         data: null,
//       });
//     }
//     const andConditions = [{ isDeleted: false }];
//     if (customerName) {
//       andConditions.push({
//         customerName: { contains: customerName },
//       });
//     }
//     if (shipDate) {
//       const date = new Date(shipDate);
//       andConditions.push({
//         shipDate: {
//           gte: new Date(date.setHours(0, 0, 0, 0)),
//           lt: new Date(new Date(shipDate).setDate(date.getDate() + 1)),
//         },
//       });
//     }
//     if (partNumber) {
//       andConditions.push({
//         OR: [
//           {
//             part: {
//               partNumber: { contains: partNumber },
//             },
//           },
//           {
//             product: {
//               partNumber: { contains: partNumber },
//             },
//           },
//           {
//             processDetails: {
//               some: {
//                 assignTo: { contains: partNumber },
//               },
//             },
//           },
//         ],
//       });
//     }
//     const orders = await prisma.customOrder.findMany({
//       where: { AND: andConditions },
//       orderBy: { createdAt: "desc" },
//       include: {
//         customer: true,
//         part: true,
//         processDetails: true,
//       },
//     });

//     if (orders.length === 0) {
//       return res.status(200).json({
//         message: "No custom orders found matching your criteria.",
//         data: [],
//       });
//     }

//     const enrichedOrders = await Promise.all(
//       orders.map(async (order) => {
//         if (!order.processDetails || order.processDetails.length === 0) {
//           return { ...order, assignedParts: [] };
//         }
//         const partNumbersToFind = order.processDetails
//           .map((detail) => detail.assignTo)
//           .filter((pn) => pn != null && pn.trim() !== "");
//         const uniquePartNumbers = [...new Set(partNumbersToFind)];
//         if (uniquePartNumbers.length === 0) {
//           return { ...order, assignedParts: [] };
//         }
//         const assignedPartsDetails = await prisma.partNumber.findMany({
//           where: {
//             partNumber: {
//               in: uniquePartNumbers,
//             },
//           },
//         });
//         return {
//           ...order,
//           assignedParts: assignedPartsDetails,
//         };
//       })
//     );

//     return res.status(200).json({
//       message: "Custom orders retrieved successfully!",
//       data: enrichedOrders,
//     });
//   } catch (error) {
//     console.error("Error searching custom orders:", error);
//     if (error.name === "PrismaClientValidationError") {
//       return res.status(400).json({
//         message: "Invalid search query. Please check the field names.",
//         error: error.message,
//         data: null,
//       });
//     }
//     return res.status(500).json({
//       message: "Something went wrong. Please try again later.",
//       data: null,
//     });
//   }
// };

const searchCustomOrders = async (req, res) => {
  try {
    const { customerName, shipDate, partNumber } = req.query;
    if (!customerName && !shipDate && !partNumber) {
      return res.status(400).json({
        message: "Please provide at least one search parameter.",
        data: null,
      });
    }
    const andConditions = [{ isDeleted: false }];
    if (customerName) {
      andConditions.push({ customerName: { contains: customerName.trim() } });
    }
    if (shipDate) {
      const date = new Date(shipDate);
      andConditions.push({
        shipDate: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
          lt: new Date(new Date(shipDate).setDate(date.getDate() + 1)),
        },
      });
    }
    if (partNumber) {
      andConditions.push({
        OR: [
          { part: { partNumber: { contains: partNumber.trim() } } },
          { product: { partNumber: { contains: partNumber.trim() } } },
        ],
      });
    }

    const orders = await prisma.customOrder.findMany({
      where: { AND: andConditions },
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        part: {
          include: {
            components: {
              where: { isDeleted: false },
              include: {
                part: true,
              },
            },
          },
        },
        product: {
          include: {
            process: {
              select: {
                id: true,
                processName: true,
              },
            },
            components: {
              where: { isDeleted: false },
              include: {
                part: true,
              },
            },
          },
        },
      },
    });
    if (orders.length === 0) {
      return res.status(200).json({
        message: "No custom orders found matching your criteria.",
        data: [],
      });
    }

    const formattedOrders = orders.map((order) => {
      const { part, product, ...restOfOrder } = order;
      const mainItem = product || part;
      const productFamily = [];
      if (mainItem) {
        productFamily.push({
          ...mainItem,
          isParent: true,
          quantityRequired: order.productQuantity || 1,
          components: undefined,
        });

        if (mainItem.components && mainItem.components.length > 0) {
          mainItem.components.forEach((componentEntry) => {
            if (componentEntry.part) {
              productFamily.push({
                ...componentEntry.part,
                isParent: false,
                quantityRequired: componentEntry.partQuantity,
              });
            }
          });
        }
      }

      // Final object return karein
      return {
        ...restOfOrder,
        productFamily, // Product aur uske parts ki flat list
      };
    });

    return res.status(200).json({
      message: "Custom orders retrieved successfully!",
      data: formattedOrders,
    });
  } catch (error) {
    console.error("Error searching custom orders:", error);
  }
};
const stockOrderSchedule = async (req, res) => {
  const ordersToSchedule = req.body;
  try {
    const allPrismaPromises = [];
    const orderIdsToUpdate = new Set();

    for (const order of ordersToSchedule) {
      const { order_id, product_id, quantity, delivery_date, status, type } =
        order;

      if (!order_id || !product_id) {
        console.warn(
          "Skipping order due to missing order_id or product_id",
          order
        );
        continue;
      }

      orderIdsToUpdate.add(order_id);

      const productPart = await prisma.partNumber.findUnique({
        where: { part_id: product_id },
        include: { process: true },
      });

      if (productPart) {
        const productSchedule = prisma.stockOrderSchedule.upsert({
          where: {
            order_id_part_id_order_type: {
              order_id: order_id,
              part_id: product_id,
              order_type: "StockOrder", // You must provide the type now
            },
          },
          update: {
            delivery_date: new Date(delivery_date),
            quantity: quantity,
            status: status,
            completed_date: null,
            type: type,
          },
          create: {
            // --- CHANGE #2: Set polymorphic fields directly ---
            order_id: order_id,
            order_type: "StockOrder",
            // --- END OF CHANGES ---
            delivery_date: new Date(delivery_date),
            quantity: quantity,
            status: status,
            completed_date: null,
            submittedBy: { connect: { id: req.user.id } },
            part: { connect: { part_id: product_id } },
            process: productPart.processId
              ? { connect: { id: productPart.processId } }
              : undefined,
            scheduleQuantity: quantity,
            remainingQty: quantity,
          },
        });
        allPrismaPromises.push(productSchedule);
      }

      const bomEntries = await prisma.productTree.findMany({
        where: { product_id: product_id },
        include: { part: { include: { process: true } } },
      });

      const componentSchedulePromises = bomEntries.map((entry) => {
        // Use a default value for minStock if it's null or undefined
        const scheduleQty = quantity * (entry?.part?.minStock || 1);
        return prisma.stockOrderSchedule.upsert({
          where: {
            // --- CHANGE #3: Use the new unique identifier here as well ---
            order_id_part_id_order_type: {
              order_id: order_id,
              part_id: entry?.part?.part_id,
              order_type: "StockOrder",
            },
          },
          update: {
            delivery_date: new Date(delivery_date),
            quantity: quantity,
            status: status,
            completed_date: null,
          },
          create: {
            // --- CHANGE #4: Set polymorphic fields directly here too ---
            order_id: order_id,
            order_type: "StockOrder",
            // --- END OF CHANGES ---
            delivery_date: new Date(delivery_date),
            quantity: quantity,
            status: status,
            completed_date: null,
            submittedBy: { connect: { id: req.user.id } },
            part: { connect: { part_id: entry?.part?.part_id } },
            process: entry?.part?.processId
              ? { connect: { id: entry?.part?.processId } }
              : undefined,
            type: type,
            scheduleQuantity: scheduleQty,
            remainingQty: scheduleQty,
          },
        });
      });

      allPrismaPromises.push(...componentSchedulePromises);
    }

    if (allPrismaPromises.length > 0) {
      const newSchedules = await prisma.$transaction(allPrismaPromises);

      // Update all scheduled orders, not just the last one
      await prisma.stockOrder.updateMany({
        where: {
          id: { in: Array.from(orderIdsToUpdate) },
          isDeleted: false,
        },
        data: {
          status: "scheduled",
        },
      });

      return res.status(201).json({
        message: `Successfully scheduled or updated  items.`,
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

const customOrderSchedule = async (req, res) => {
  const partsToSchedule = req.body;

  if (!Array.isArray(partsToSchedule) || partsToSchedule.length === 0) {
    return res
      .status(400)
      .json({ message: "Request body must be a non-empty array." });
  }

  try {
    const allPrismaPromises = [];
    const orderIdsToUpdate = new Set();

    for (const item of partsToSchedule) {
      const {
        order_id: customOrderId, // ID from CustomOrder
        part_id,
        quantity,
        delivery_date,
        status,
        type,
      } = item;

      if (!customOrderId || !part_id || !quantity) {
        console.warn("Skipping an item due to missing data:", item);
        continue;
      }

      orderIdsToUpdate.add(customOrderId);

      const partDetails = await prisma.partNumber.findUnique({
        where: { part_id: part_id },
      });

      if (!partDetails) {
        console.warn(`Part with ID ${part_id} not found. Skipping schedule.`);
        continue;
      }
      const scheduleQuantity =
        quantity *
        (partDetails.type === "product"
          ? quantity || 1
          : partDetails.minStock || 1);

      const schedulePromise = prisma.stockOrderSchedule.upsert({
        // The unique constraint now correctly identifies the record
        where: {
          order_id_part_id_order_type: {
            order_id: customOrderId,
            part_id: part_id,
            order_type: "CustomOrder", // Specify the type
          },
        },
        update: {
          delivery_date: new Date(delivery_date),
          quantity: quantity,
          status: status,
          type: type,
          scheduleQuantity: scheduleQuantity,
          remainingQty: scheduleQuantity,
          completed_date: null,
        },
        create: {
          // --- THIS IS THE KEY CHANGE ---
          // Manually set the polymorphic fields instead of using 'connect'
          order_id: customOrderId,
          order_type: "CustomOrder",
          // --- END OF CHANGE ---

          part: { connect: { part_id: part_id } },
          delivery_date: new Date(delivery_date),
          quantity: quantity,
          status: status,
          type: type,
          scheduleQuantity: scheduleQuantity,
          remainingQty: scheduleQuantity,
          completed_date: null,
          submittedBy: { connect: { id: req.user.id } },
          process: partDetails.processId
            ? { connect: { id: partDetails.processId } }
            : undefined,
        },
      });

      allPrismaPromises.push(schedulePromise);
    }

    if (allPrismaPromises.length === 0) {
      return res
        .status(200)
        .json({ message: "No valid items were provided to schedule." });
    }

    const newSchedules = await prisma.$transaction(allPrismaPromises);

    await prisma.customOrder.updateMany({
      where: { id: { in: Array.from(orderIdsToUpdate) } },
      data: { status: "scheduled" },
    });

    return res.status(201).json({
      message: `Successfully scheduled or updated ${newSchedules.length} items.`,
      data: newSchedules,
    });
  } catch (error) {
    console.error("Error during custom order batch scheduling:", error);
    return res
      .status(500)
      .json({ message: "Something went wrong.", error: error.message });
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

// correct code
// const scheduleStockOrdersList = async (req, res) => {
//   try {
//     const paginationData = await paginationQuery(req.query);

//     // Step 1: Fetch the schedules and the total count
//     const [allSchedules, totalCount] = await Promise.all([
//       prisma.stockOrderSchedule.findMany({
//         where: {
//           isDeleted: false,
//           // You can add more filters here, e.g., for order_type
//           // order_type: 'StockOrder'
//         },
//         skip: paginationData.skip,
//         take: paginationData.pageSize,
//         orderBy: {
//           createdAt: "desc",
//         },
//         include: {
//           // 'part' is still a valid direct relation, so we can include it
//           part: {
//             select: {
//               partNumber: true,
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

//     // If there are no schedules, return early
//     if (allSchedules.length === 0) {
//       return res.status(200).json({
//         message: "No scheduled orders found.",
//         data: [],
//         pagination: await pagination({
//           page: paginationData.page,
//           pageSize: paginationData.pageSize,
//           total: 0,
//         }),
//       });
//     }

//     // Step 2: Separate the order IDs by their type
//     const stockOrderIds = [];
//     const customOrderIds = [];

//     for (const schedule of allSchedules) {
//       if (schedule.order_type === "StockOrder" && schedule.order_id) {
//         stockOrderIds.push(schedule.order_id);
//       } else if (schedule.order_type === "CustomOrder" && schedule.order_id) {
//         customOrderIds.push(schedule.order_id);
//       }
//     }

//     // Step 3: Fetch the related orders in parallel
//     const [stockOrders, customOrders] = await Promise.all([
//       // Fetch StockOrders if there are any IDs for them
//       stockOrderIds.length > 0
//         ? prisma.stockOrder.findMany({
//             where: { id: { in: stockOrderIds } },
//             select: {
//               id: true,
//               orderNumber: true,
//               orderDate: true,
//               shipDate: true,
//               status: true,
//               part: { select: { partNumber: true } },
//             },
//           })
//         : Promise.resolve([]),

//       // Fetch CustomOrders if there are any IDs for them
//       // Fetch CustomOrders if there are any IDs for them
//       customOrderIds.length > 0
//         ? prisma.customOrder.findMany({
//             where: { id: { in: customOrderIds } },
//             include: {
//               // 'include' is only used for relations
//               product: {
//                 select: {
//                   partNumber: true,
//                 },
//               },
//             },
//           })
//         : Promise.resolve([]),
//     ]);

//     // Step 4: Create lookup maps for easy access (much faster than nested loops)
//     const stockOrderMap = new Map(
//       stockOrders.map((order) => [order.id, order])
//     );
//     const customOrderMap = new Map(
//       customOrders.map((order) => [order.id, order])
//     );
//     console.log("stockOrderMapstockOrderMap", stockOrderMap);
//     console.log("customOrderMapcustomOrderMapcustomOrderMap", customOrderMap);

//     // Step 5: "Stitch" the order data back onto the schedule objects
//     const schedulesWithOrders = allSchedules.map((schedule) => {
//       let orderData = null;
//       if (schedule.order_type === "StockOrder") {
//         orderData = stockOrderMap.get(schedule.order_id) || null;
//       } else if (schedule.order_type === "CustomOrder") {
//         orderData = customOrderMap.get(schedule.order_id) || null;
//       }
//       // Add the fetched order data to a new property, matching your original desired structure
//       return { ...schedule, order: orderData };
//     });

//     const getPagination = await pagination({
//       page: paginationData.page,
//       pageSize: paginationData.pageSize,
//       total: totalCount,
//     });

//     return res.status(200).json({
//       message: "Scheduled orders retrieved successfully!",
//       data: schedulesWithOrders, // Send the stitched data
//       pagination: getPagination,
//     });
//   } catch (error) {
//     console.error("Error retrieving scheduled orders:", error); // Log the error for debugging
//     return res.status(500).json({
//       message: "Something went wrong. Please try again later.",
//       error: error.message,
//     });
//   }
// };
// correct code end
// controllers/scheduleController.js
const scheduleStockOrdersList = async (req, res) => {
  try {
    const { search, order_type } = req.query;
    const paginationData = await paginationQuery(req.query);
    const whereClause = {
      isDeleted: false,
    };
    if (order_type && order_type !== "all") {
      whereClause.order_type = order_type;
    }

    if (search) {
      whereClause.OR = [{ part: { partNumber: { contains: search } } }];
    }

    const [filteredSchedules, totalCount] = await Promise.all([
      prisma.stockOrderSchedule.findMany({
        where: whereClause,
        skip: paginationData.skip,
        take: paginationData.pageSize,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          part: {
            select: {
              partNumber: true,
              process: true,
            },
          },
        },
      }),
      prisma.stockOrderSchedule.count({
        where: whereClause,
      }),
    ]);

    if (filteredSchedules.length === 0) {
      return res.status(200).json({
        message: "No scheduled orders found.",
        data: [],
        pagination: await pagination({
          page: paginationData.page,
          pageSize: paginationData.pageSize,
          total: 0,
        }),
      });
    }
    const stockOrderIds = [];
    const customOrderIds = [];

    for (const schedule of filteredSchedules) {
      if (schedule.order_type === "StockOrder" && schedule.order_id) {
        stockOrderIds.push(schedule.order_id);
      } else if (schedule.order_type === "CustomOrder" && schedule.order_id) {
        customOrderIds.push(schedule.order_id);
      }
    }

    const [stockOrders, customOrders] = await Promise.all([
      stockOrderIds.length > 0
        ? prisma.stockOrder.findMany({
            where: { id: { in: stockOrderIds } },
            include: { part: { select: { partNumber: true } } },
          })
        : Promise.resolve([]),

      customOrderIds.length > 0
        ? prisma.customOrder.findMany({
            where: { id: { in: customOrderIds } },
            include: { product: { select: { partNumber: true } } },
          })
        : Promise.resolve([]),
    ]);
    const stockOrderMap = new Map(
      stockOrders.map((order) => [order.id, order])
    );
    const customOrderMap = new Map(
      customOrders.map((order) => [order.id, order])
    );
    const schedulesWithOrders = filteredSchedules.map((schedule) => {
      let orderData = null;
      if (schedule.order_type === "StockOrder") {
        orderData = stockOrderMap.get(schedule.order_id) || null;
      } else if (schedule.order_type === "CustomOrder") {
        orderData = customOrderMap.get(schedule.order_id) || null;
      }
      return { ...schedule, order: orderData };
    });

    const getPagination = await pagination({
      page: paginationData.page,
      pageSize: paginationData.pageSize,
      total: totalCount,
    });

    return res.status(200).json({
      message: "Scheduled orders retrieved successfully!",
      data: schedulesWithOrders,
      pagination: getPagination,
    });
  } catch (error) {
    console.error("Error retrieving scheduled orders:", error);
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
        zipCode: true,
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
              email: true,
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
    const { order_date, part_name, quantity, cost, need_date, status } =
      req.body;

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

const updateSupplierOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, quantity, part_id } = req.body;
    const result = await prisma.supplier_orders.update({
      where: {
        id: id,
        isDeleted: false,
      },
      data: {
        status: status,
      },
    });

    if (status === "Delivered") {
      prisma.partNumber
        .update({
          where: {
            part_id: part_id,
          },
          data: {
            supplierOrderQty: { increment: quantity },
          },
        })
        .then();
    }
    return res.status(200).json({
      message: "Order status updated successfully",
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

    return res.status(200).json({
      message: "SupplierOrder delete successfully !",
    });
  } catch (error) {
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
const validateStockQty = async (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || !quantity) {
    return res
      .status(400)
      .json({ success: false, message: "Product ID and quantity required." });
  }

  try {
    // Get the product info
    const product = await prisma.product.findFirst({
      where: { id: productId },
      select: {
        minStock: true,
        availStock: true,
      },
    });

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    const { minStock, availStock } = product;

    // Validation
    if (quantity % minStock !== 0) {
      return res.status(400).json({
        success: false,
        message: `Quantity must be a multiple of ${minStock}.`,
      });
    }

    if (quantity > availStock) {
      return res.status(400).json({
        success: false,
        message: `Quantity cannot be more than available stock (${availStock}).`,
      });
    }

    // Valid quantity
    const maxAddableQty = Math.floor(availStock / minStock) * minStock;

    return res.status(200).json({
      success: true,
      message: `✅ Available quantity: ${availStock}. You can add maximum ${maxAddableQty}.`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
// const createSchedule = async () => {
//   return prisma.s$transaction(async (tx) => {
//     for (const payload of payloads) {
//       // Step 1: Naya StockOrderSchedule record banayein
//       await tx.stockOrderSchedule.create({
//         data: {
//           quantity: payload.quantity,
//           deliveryDate: new Date(payload.delivery_date),
//           status: "Scheduled",
//           stockOrder: { connect: { id: payload.order_id } },
//           part: { connect: { part_id: payload.product_id } },
//           customer: { connect: { id: payload.customersId } },
//         },
//       });

//       // Step 2: Original StockOrder ka status update karein (Optional, but good practice)
//       await tx.stockOrder.update({
//         where: { id: payload.order_id },
//         data: { status: "Scheduled" },
//       });

//       // Step 3: Raw materials (components) ka stock kam karein
//       // Pehle, is product ke saare components (BOM) nikalen
//       const components = await tx.productTree.findMany({
//         where: { product_id: payload.product_id }, // product_id is the parent product
//       });

//       if (components.length === 0) {
//         // Agar product ka BOM define nahi hai, to aage badh sakte hain
//         console.log(
//           `Product ${payload.product_id} has no components in BOM. Skipping stock deduction.`
//         );
//         continue;
//       }

//       for (const component of components) {
//         if (!component.part_id) continue;

//         const quantityToDeduct = payload.quantity * component.partQuantity;

//         // Stock deduct karne se pehle check karein ki sufficient stock hai ya nahi
//         const componentPart = await tx.partNumber.findUnique({
//           where: { part_id: component.part_id },
//         });

//         if (
//           !componentPart ||
//           (componentPart.availStock ?? 0) < quantityToDeduct
//         ) {
//           // Agar stock kam hai, to transaction fail ho jayegi
//           throw new Error(
//             `Insufficient stock for part ${
//               componentPart?.partNumber || component.part_id
//             }. Required: ${quantityToDeduct}, Available: ${
//               componentPart?.availStock ?? 0
//             }`
//           );
//         }

//         // Stock deduct karein
//         await tx.partNumber.update({
//           where: { part_id: component.part_id },
//           data: {
//             availStock: {
//               decrement: quantityToDeduct,
//             },
//           },
//         });
//       }
//     }
//   });
// };

const checkStockQuantity = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    const data = await prisma.productTree.findFirst({
      where: {
        product_id: true,
      },
    });
    const partId = data.part_id;
    return res.status(200).json({
      message: "Stock quantity ",
    });
  } catch (error) {}
};

const getSupplierInventory = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);
    const { search = "", sort = "" } = req.query;

    // 🔍 Search conditions
    const orConditions = [];
    if (search) {
      orConditions.push(
        {
          part: {
            partNumber: {
              contains: search,
            },
          },
        },
        {
          supplier: {
            firstName: {
              contains: search,
            },
          },
        },
        {
          supplier: {
            lastName: {
              contains: search,
            },
          },
        }
      );
    }

    const whereFilter = {
      status: "Delivered",
      isDeleted: false,
      part: {
        processOrderRequired: false,
      },
      ...(orConditions.length > 0 ? { OR: orConditions } : {}),
    };

    let orderBy = { createdAt: "desc" };
    if (sort === "oldest") {
      orderBy = { createdAt: "asc" };
    }

    const [inventoryData, totalCount] = await Promise.all([
      prisma.supplier_orders.findMany({
        where: whereFilter,
        include: {
          part: {
            select: {
              part_id: true,
              partNumber: true,
              partDescription: true,
              supplierOrderQty: true,
              availStock: true,
              minStock: true,
            },
          },
          supplier: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy,
        skip: paginationData.skip,
        take: paginationData.pageSize,
      }),
      prisma.supplier_orders.count({
        where: whereFilter,
      }),
    ]);

    const getPagination = await pagination({
      page: paginationData.page,
      pageSize: paginationData.pageSize,
      total: totalCount,
    });

    return res.status(200).json({
      message: "Supplier Inventory retrieved successfully!",
      data: inventoryData,
      totalCount,
      pagination: getPagination,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const deleteSupplierInventory = async (req, res) => {
  try {
    const id = req.params.id;
    prisma.supplier_inventory
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
      message: "Supplier inventory delete successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  } finally {
  }
};

const deleteScrapEntry = async (req, res) => {
  try {
    const id = req.params.id;
    prisma.scapEntries
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
      message: "Supplier inventory delete successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  } finally {
  }
};

// helper function to format time (e.g., 08:00 AM)
const allEmployeeTimeLine = async (req, res) => {
  try {
    const {
      page,
      limit,
      filter,
      search,
      employeeId: queryEmployeeId,
    } = req.query;

    const currentPage = parseInt(page) || 1;
    const itemsPerPage = parseInt(limit) || 8;

    let startDate = null;
    let endDate = null;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    switch (filter) {
      case "This Week":
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(
          now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
        );
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "Last Week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay() - 6);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "This Month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        break;
    }
    const isSuperAdmin = req.user?.roles?.toLowerCase() === "superadmin";

    const whereConditions = {
      isDeleted: false,
      ...(isSuperAdmin && { createdBy: req.user?.id }),
      ...(queryEmployeeId && { employeeId: queryEmployeeId }),
      ...(startDate &&
        endDate && {
          timestamp: {
            gte: startDate.toISOString(),
            lte: endDate.toISOString(),
          },
        }),
    };

    const allEvents = await prisma.timeClock.findMany({
      where: whereConditions,
      orderBy: {
        timestamp: "asc",
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Group events by date using a reducer
    const groupedByDate = allEvents.reduce((acc, event) => {
      const date = new Date(event.timestamp).toISOString().split("T")[0]; // '2025-03-20'

      // Initialize the day's object if it doesn't exist
      if (!acc[date]) {
        acc[date] = {
          date: date,
          employeeId: event.employeeId,
          employeeName: `${event.employee?.firstName || ""} ${
            event.employee?.lastName || ""
          }`.trim(),
          employeeEmail: event.employee?.email || "",
          loginTime: null,
          lunchStart: null,
          lunchEnd: null,
          logout: null,
          exceptionStart: null, // Placeholder
          exceptionEnd: null, // Placeholder
          vacation: "No", // Placeholder
        };
      }

      switch (event.eventType) {
        case "CLOCK_IN":
          acc[date].loginTime = formatTime(event.timestamp);
          break;
        case "START_LUNCH":
          acc[date].lunchStart = formatTime(event.timestamp);
          break;
        case "END_LUNCH":
          acc[date].lunchEnd = formatTime(event.timestamp);
          break;
        case "CLOCK_OUT":
          acc[date].logout = formatTime(event.timestamp);
          break;
        case "START_EXCEPTION":
          acc[date].exceptionStart = formatTime(event.timestamp);
          break;
        case "END_EXCEPTION":
          acc[date].exceptionEnd = formatTime(event.timestamp);
          break;
      }
      return acc;
    }, {});

    // Convert the grouped object back into an array
    let timeSheetData = Object.values(groupedByDate);

    // --- Searching Logic (applied AFTER grouping) ---
    if (search) {
      const lowercasedSearch = search.toLowerCase();
      timeSheetData = timeSheetData.filter((entry) => {
        // Search by date, employee name, or employee email
        return (
          entry.date.toLowerCase().includes(lowercasedSearch) ||
          entry.employeeName.toLowerCase().includes(lowercasedSearch) ||
          entry.employeeEmail.toLowerCase().includes(lowercasedSearch)
        );
      });
    }

    // --- Pagination (Now we paginate the PROCESSED and SEARCHED data) ---
    const totalCount = timeSheetData.length;
    const paginatedData = timeSheetData.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    return res.status(200).json({
      message: "Employee timesheet retrieved successfully!",
      data: paginatedData,
      totalCounts: totalCount,
      pagination: {
        page: currentPage,
        totalPages: totalPages,
        hasPrevious: currentPage > 1,
        hasNext: currentPage < totalPages,
      },
    });
  } catch (error) {
    console.error("Employee Timesheet Fetch Error:", error);
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};

// Helper function (if not already defined)
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

const allVacationReq = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);
    const { search = "", sortBy = "desc" } = req.query;

    const whereCondition = {
      isDeleted: false,
      ...(search && {
        OR: [
          {
            employee: {
              OR: [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { email: { contains: search } },
              ],
            },
          },
        ],
      }),
    };

    const [employeeData, totalCount] = await Promise.all([
      prisma.vacationRequest.findMany({
        where: whereCondition,
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        skip: paginationData.skip,
        take: paginationData.pageSize,
        orderBy: {
          createdAt: sortBy === "asc" ? "asc" : "desc",
        },
      }),
      prisma.vacationRequest.count({
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

const vacationReqDetail = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await prisma.vacationRequest.findUnique({
      where: {
        id: id,
        isDeleted: false,
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            fullName: true,
            email: true,
          },
        },
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

const changeVacationRequestStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    await prisma.vacationRequest.update({
      where: {
        id: id,
        isDeleted: false,
      },
      data: {
        status: status,
      },
    });
    return res.status(200).json({
      message: `Vacation  successfully ${status}`,
    });
  } catch (error) {
    console.log("errorerror", error);

    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const timeClockList = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);
    const { search = "", filter = "" } = req.query; // Changed 'partfamily' to 'role' to align with UI

    console.log("searchsearch", filter);

    const whereFilter = {
      isDeleted: false,
      type: "run_schedule",
      traniningStatus: false,

      ...(search && {
        OR: [
          {
            employeeInfo: {
              OR: [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { email: { contains: search } },
              ],
            },
          },
        ],
      }),

      process: {
        processName: { contains: filter },
      },
    };

    const [allProcess, totalCount] = await Promise.all([
      prisma.productionResponse.findMany({
        where: whereFilter,
        select: {
          // Use select to get only necessary fields
          id: true,
          cycleTimeStart: true,
          cycleTimeEnd: true,
          submittedDateTime: true, // For 'Vacation' and 'Hour' columns
          process: {
            select: {
              processName: true,
            },
          },
          employeeInfo: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        skip: paginationData.skip,
        take: paginationData.pageSize,
        orderBy: {
          submittedDateTime: "desc", // Order by latest submissions
        },
      }),
      prisma.productionResponse.count({
        where: whereFilter,
      }),
    ]);

    // Map the data to match the UI table structure
    const formattedData = allProcess.map((item) => {
      const startTime = new Date(item.cycleTimeStart);
      const endTime = new Date(item.cycleTimeEnd);
      const submittedDate = new Date(item.submittedDateTime);

      // Calculate hours difference (simple duration, adjust as needed for actual work hours)
      console.log("itemitem", item);

      let readableDuration = "N/A";

      if (item.cycleTimeStart && item.cycleTimeEnd) {
        const diffMs = endTime - startTime;

        const totalSeconds = Math.floor(diffMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const parts = [];
        if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
        if (minutes > 0)
          parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);
        if (seconds > 0 || parts.length === 0)
          parts.push(`${seconds} second${seconds !== 1 ? "s" : ""}`);

        readableDuration = parts.join(" ");
      }

      return {
        id: item.id,
        name: `${item.employeeInfo?.firstName || ""} ${
          item.employeeInfo?.lastName || ""
        }`,
        email: item.employeeInfo?.email || "",
        process: item.process?.processName || "N/A",
        hours: readableDuration, // now human readable
        vacationDate: submittedDate.toISOString().split("T")[0],
        vacationHours: readableDuration, // same here, or replace with hours only if needed
      };
    });

    const getPagination = await pagination({
      page: paginationData.page,
      pageSize: paginationData.limit,
      total: totalCount,
    });

    return res.status(200).json({
      message: "Process data retrieved successfully!",
      data: formattedData,
      totalCount,
      pagination: getPagination,
    });
  } catch (error) {
    console.error("Error in timeClockList:", error);
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};
const sendVacationStatus = async (req, res) => {
  try {
    const { id, email, status } = req.body;

    const user = await prisma.vacationRequest.findFirst({
      where: {
        id: id,
        isDeleted: false,
      },
      include: {
        employee: true, // assuming relation to get employee name
      },
    });
    console.log("useruser", user);

    if (!user) {
      return res.status(400).send({ message: "Employee not found" });
    }

    const fullName = `${user.employee?.firstName || ""} ${
      user.employee?.lastName || ""
    }`.trim();
    console.log("fullNamefullName", fullName);

    // Dynamic status styling
    let statusMessage = "";
    let statusColor = "";
    let statusBgColor = "";

    if (status.toLowerCase() === "APPROVED") {
      statusMessage = "✓ Approved Successfully";
      statusColor = "#2ecc71";
      statusBgColor = "#e8f5e9";
    } else if (status.toLowerCase() === "REJECTED") {
      statusMessage = "✗ Rejected";
      statusColor = "#e74c3c";
      statusBgColor = "#fdecea";
    } else {
      statusMessage = status;
      statusColor = "#f39c12";
      statusBgColor = "#fff8e1";
    }

    // Send dynamic email
    await sendMail(
      "send-employee-vacation-req-status",
      {
        "%name%": fullName || "Employee",
        "%status%": status,
        "%statusMessage%": statusMessage,
        "%statusColor%": statusColor,
        "%statusBgColor%": statusBgColor,
      },
      email
    );

    return res.status(201).json({
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error("Email error:", error);
    return res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
};

module.exports = {
  login,
  sendForgotPasswordOTP,
  validOtp,
  resetPassword,
  checkToken,
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
  searchCustomOrders,
  scheduleStockOrdersList,
  deleteProductPartsNumber,
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
  supplierOrderDetail,
  updateSupplierOrder,
  deleteSupplierOrder,
  validateStockQty,
  checkStockQuantity,
  getSupplierInventory,
  deleteSupplierInventory,
  deleteScrapEntry,
  customOrderSchedule,
  sendSupplierEmail,
  updateSupplierOrderStatus,
  allEmployeeTimeLine,
  allVacationReq,
  vacationReqDetail,
  changeVacationRequestStatus,
  timeClockList,
  sendVacationStatus,
};
