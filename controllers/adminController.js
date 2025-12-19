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
const moment = require("moment"); // For date/time manipulation
const {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfDay,
  endOfDay,
} = require("date-fns");

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

    const searchFilter = search.trim();

    const [allCustomers, totalCount] = await Promise.all([
      prisma.customers.findMany({
        where: {
          AND: [
            { isDeleted: false },
            {
              OR: [
                {
                  email: {
                    contains: searchFilter,
                  },
                },
                {
                  firstName: {
                    contains: searchFilter,
                  },
                },
                {
                  lastName: {
                    contains: searchFilter,
                  },
                },
              ],
            },
          ],
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: paginationData.skip,
        take: paginationData.pageSize,
      }),
      prisma.customers.count({
        where: {
          AND: [
            { isDeleted: false },
            {
              OR: [
                {
                  email: {
                    contains: searchFilter,
                  },
                },
                {
                  firstName: {
                    contains: searchFilter,
                  },
                },
                {
                  lastName: {
                    contains: searchFilter,
                  },
                },
              ],
            },
          ],
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
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later",
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
    const searchFilter = search.trim();
    const searchConditions = {
      OR: [
        {
          email: {
            contains: searchFilter,
          },
        },
        {
          firstName: {
            contains: searchFilter,
          },
        },
        {
          lastName: {
            contains: searchFilter,
          },
        },
      ],
    };

    const [allSuppliers, totalCount] = await Promise.all([
      prisma.suppliers.findMany({
        where: {
          AND: [{ isDeleted: false }, searchConditions],
        },
        skip: paginationData.skip,
        take: paginationData.pageSize,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.suppliers.count({
        where: {
          AND: [{ isDeleted: false }, searchConditions],
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
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later",
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
      },
    });
    console.log("datadata", data);

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
      where: {
        isDeleted: false,
      },
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
        ratePerHour: parseFloat(ratePerHour),
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
        orderBy: {
          createdAt: "desc", // latest first
        },
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
    console.log("idid", id);
    const data = await prisma.process.findUnique({
      where: {
        id: id,
        isDeleted: false,
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
    const { search = "", processLogin, status } = req.query;
    const paginationData = await paginationQuery(req.query); // page, pageSize, skip

    const whereCondition = {
      isDeleted: false,
      ...(search && {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
        ],
      }),
      ...(processLogin === "true" || processLogin === "false"
        ? { processLogin: processLogin === "true" }
        : {}),
      ...(status ? { status } : {}),
    };
    console.log("Filter conditions:", whereCondition);

    const [employeeData, totalCount] = await Promise.all([
      prisma.employee.findMany({
        where: whereCondition,
        skip: paginationData.skip,
        take: paginationData.pageSize,
        orderBy: { createdAt: "desc" },
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
      customerId,
      customerEmail,
      customerName,
      customerPhone,
    } = req.body;

    let finalCustomerId;

    const existingCustomerById = await prisma.customers.findUnique({
      where: { id: customerId },
    });

    if (existingCustomerById) {
      finalCustomerId = existingCustomerById.id;
    } else {
      const duplicateCustomer = await prisma.customers.findFirst({
        where: {
          OR: [{ email: customerEmail }, { customerPhone: customerPhone }],
        },
      });

      if (duplicateCustomer) {
        return res.status(409).json({
          message: "A customer with this email or phone number already exists.",
        });
      }

      const newCustomer = await prisma.customers.create({
        data: {
          firstName: customerName.split(" ")[0],
          lastName: customerName.split(" ").slice(1).join(" ") || "",
          email: customerEmail,
          customerPhone: customerPhone,
          createdBy: req.user?.id,
        },
      });
      finalCustomerId = newCustomer.id;
    }

    const product = await prisma.partNumber.findUnique({
      where: { part_id: productId },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }
    const available = product.availStock || 0;

    // if (parseInt(productQuantity, 10) > available) {
    //   const message =
    //     available === 0
    //       ? "This product is currently out of stock."
    //       : `Not enough stock available. Only ${available} unit${
    //           available === 1 ? "" : "s"
    //         } can be ordered at this time.`;

    //   return res.status(400).json({ message });
    // }

    // const existingOrder = await prisma.stockOrder.findFirst({
    //   where: {
    //     customerId: finalCustomerId,
    //     partId: productId,
    //     shipDate,
    //     isDeleted: false,
    //   },
    // });

    // if (existingOrder && existingOrder.status !== "completed") {
    //   return res.status(400).json({
    //     message:
    //       "This product is already added for the selected customer on this date.",
    //   });
    // }

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
        customerName,
        customerEmail,
        customerPhone,
        customerId: finalCustomerId,
        partId: productId,
        status: "Pending",
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

// const addCustomOrder = async (req, res) => {
//   try {
//     const {
//       orderNumber,
//       orderDate,
//       shipDate,
//       customerId,
//       customerName,
//       customerEmail,
//       customerPhone,
//       productId,
//       part_id,
//       cost,
//       totalCost,
//       productQuantity,
//       newParts,
//     } = req.body;

//     if (!newParts || !Array.isArray(newParts) || newParts.length === 0) {
//       return res.status(400).send({ message: "At least one process detail must be added." });
//     }

//     const newCustomOrder = await prisma.$transaction(async (tx) => {
//       let customer;
//       if (customerId) {
//         customer = await tx.customers.findUnique({ where: { id: customerId } });
//       }

//       if (!customer) {
//         if (!customerName || !customerEmail) {
//           throw new Error("Customer name and email are required to create a new customer.");
//         }
//         customer = await tx.customers.create({
//           data: {
//             firstName: customerName.split(" ")[0],
//             lastName: customerName.split(" ").slice(1).join(" ") || "",
//             email: customerEmail,
//             customerPhone: customerPhone,
//             createdBy: req.user?.id,
//           },
//         });
//       }

//       const createdOrder = await tx.customOrder.create({
//         data: {
//           orderNumber,
//           orderDate: new Date(orderDate),
//           shipDate: new Date(shipDate),
//           customerId: customer.id,
//           customerName,
//           customerEmail,
//           customerPhone,
//           productId,
//           ...(part_id && { partId: part_id }),
//           cost: parseFloat(cost),
//           totalCost: parseFloat(totalCost),
//           productQuantity: parseInt(productQuantity, 10),
//           processDetails: {
//             create: newParts.map((item) => ({
//               totalTime: parseInt(item.totalTime, 10),
//               process: item.processId,
//               assignTo: item.part,
//             })),
//           },
//         },
//       });

//       for (const processItem of newParts) {
//         // Fetch process details
//         const processRecord = await tx.process.findUnique({
//           where: { id: processItem.processId },
//         });

//         if (!processRecord) {
//           throw new Error(`Process with ID ${processItem.processId} not found.`);
//         }

//         // Check or create PartNumber
//         let partRecord = await tx.partNumber.findUnique({
//           where: { partNumber: processItem.part },
//         });

//         const partData = {
//           partNumber: processItem.part,
//           partFamily: `${processItem.part} Family`,
//           type: "part",
//           cost: parseFloat(cost),
//           leadTime: parseInt(processItem.totalTime, 10) || 0,
//           minStock: 0,
//           companyName: "SPI Custom",
//           processId: processItem.processId,
//           processDesc: processRecord.processDesc,
//           cycleTime: processItem.totalTime.toString(),
//           machineName: processRecord.machineName,
//           ratePerHour: processRecord.ratePerHour,
//           orderNeeded: processRecord.orderNeeded,
//           partFamily: processRecord.partFamily || `${processItem.part}`,
//         };

//         if (!partRecord) {
//           partRecord = await tx.partNumber.create({ data: partData });
//         } else {
//           partRecord = await tx.partNumber.update({
//             where: { part_id: partRecord.part_id },
//             data: partData,
//           });
//         }

//         await tx.productTree.upsert({
//           where: {
//             product_part_unique: {
//               product_id: productId,
//               part_id: partRecord.part_id,
//             },
//           },
//           update: {
//             processId: processItem.processId,
//             partQuantity: { increment: 1 },
//           },
//           create: {
//             product_id: productId,
//             part_id: partRecord.part_id,
//             partQuantity: 1,
//             processId: processItem.processId,
//             createdBy: customer.id,
//           },
//         });
//       }

//       return createdOrder;
//     });

//     return res.status(201).json({
//       message: "Custom order created successfully!",
//       data: newCustomOrder,
//     });
//   } catch (error) {
//     console.error("Error during custom order transaction:", error);
//     return res.status(500).send({
//       message: "Something went wrong. The operation was rolled back.",
//       error: error.message,
//     });
//   }
// };
// correct code start

// const addCustomOrder = async (req, res) => {
//   try {
//     const {
//       orderNumber,
//       orderDate,
//       shipDate,
//       customerId,
//       customerName,
//       customerEmail,
//       customerPhone,
//       productId,
//       part_id,
//       cost,
//       totalCost,
//       productQuantity,
//       newParts,
//     } = req.body;

//     // if (!newParts || !Array.isArray(newParts) || newParts.length === 0) {
//     //   return res
//     //     .status(400)
//     //     .send({ message: "At least one process detail must be added." });
//     // }

//     const newCustomOrder = await prisma.$transaction(async (tx) => {
//       let customer;
//       if (customerId) {
//         customer = await tx.customers.findUnique({ where: { id: customerId } });
//       }

//       if (!customer) {
//         if (!customerName || !customerEmail) {
//           throw new Error("Customer name and email are required.");
//         }

//         customer = await tx.customers.create({
//           data: {
//             firstName: customerName.split(" ")[0],
//             lastName: customerName.split(" ").slice(1).join(" ") || "",
//             email: customerEmail,
//             customerPhone,
//             createdBy: req.user?.id,
//           },
//         });
//       }

//       // const checkIsPartPresent = await prisma.product.find({
//       //   where: {
//       //     product_id: productId,
//       //     part_id: part_id,
//       //   },
//       // });
//       // console.log(
//       //   "checkIsPartPresentcheckIsPartPresentcheckIsPartPresent",
//       //   checkIsPartPresent
//       // );

//       const createdOrder = await tx.customOrder.create({
//         data: {
//           orderNumber,
//           orderDate: new Date(orderDate),
//           shipDate: new Date(shipDate),
//           customerId: customer?.id,
//           customerName,
//           customerEmail,
//           customerPhone,
//           productId,
//           ...(part_id && { partId: part_id }),
//           cost: parseFloat(cost),
//           totalCost: parseFloat(totalCost),
//           productQuantity: parseInt(productQuantity, 10),

//           processDetails: {
//             create: newParts.map((item) => ({
//               totalTime: item?.totalTime ? parseInt(item.totalTime, 10) : null,

//               process: item?.processId,
//               assignTo: item?.part,
//             })),
//           },
//         },
//       });

//       if (Array.isArray(newParts) && newParts.length > 0) {
//         for (const processItem of newParts) {
//           const processRecord = await tx.process.findUnique({
//             where: { id: processItem.processId },
//           });

//           // Find part
//           let partRecord = await tx.partNumber.findUnique({
//             where: { partNumber: processItem?.part },
//           });

//           const partData = {
//             partNumber: processItem.part,
//             partFamily: processRecord?.partFamily || `${processItem?.part}`,
//             type: "part",
//             cost: parseFloat(cost),
//             processId: processItem?.processId,
//             processDesc: processRecord?.processDesc || null,
//             cycleTime: processItem?.totalTime?.toString(),
//             companyName: " ",
//           };

//           if (!partRecord) {
//             partRecord = await tx.partNumber.create({ data: partData });
//           } else {
//             partRecord = await tx.partNumber.update({
//               where: { part_id: partRecord?.part_id },
//               data: partData,
//             });
//           }

//           await tx.productTree.upsert({
//             where: {
//               product_part_unique: {
//                 product_id: productId,
//                 part_id: partRecord?.part_id,
//               },
//             },
//             update: {
//               processId: processItem.processId,
//               partQuantity: { increment: 1 },
//             },
//             create: {
//               product_id: productId,
//               part_id: partRecord?.part_id,
//               partQuantity: 1,
//               processId: processItem?.processId,
//               createdBy: customer?.id,
//             },
//           });
//         }
//       }

//       return createdOrder;
//     });

//     return res.status(201).json({
//       message: "Custom order created successfully!",
//       data: newCustomOrder,
//     });
//   } catch (error) {
//     console.error("Error during custom order transaction:", error);
//     return res.status(500).send({
//       message: "Something went wrong. The operation was rolled back.",
//       error: error.message,
//     });
//   }
// };
// correct code end
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
      part_id,
      cost,
      totalCost,
      productQuantity,
      bomList, // Existing Parts List from Payload
      newParts, // New Parts List (Manual Entry)
    } = req.body;

    console.log("Payload Received - BOM:", bomList);

    const newCustomOrder = await prisma.$transaction(async (tx) => {
      // ---------------------------------------------------------
      // 1. Customer Management
      // ---------------------------------------------------------
      let customer;
      if (customerId && customerId !== "new") {
        customer = await tx.customers.findUnique({ where: { id: customerId } });
      }

      if (!customer) {
        if (!customerName) throw new Error("Customer name is required.");
        customer = await tx.customers.create({
          data: {
            firstName: customerName.split(" ")[0],
            lastName: customerName.split(" ").slice(1).join(" ") || "",
            email: customerEmail || "",
            customerPhone: customerPhone || "",
            createdBy: req.user?.id,
          },
        });
      }
      const createdOrder = await tx.customOrder.create({
        data: {
          orderNumber,
          orderDate: new Date(orderDate),
          shipDate: new Date(shipDate),
          customerId: customer.id,
          customerName,
          customerEmail,
          customerPhone,
          productId: productId || null,
          partId: part_id || null,
          cost: parseFloat(cost || 0),
          totalCost: parseFloat(totalCost || 0),
          productQuantity: parseInt(productQuantity, 10),
          status: "Pending",
        },
      });

      if (Array.isArray(bomList) && bomList.length > 0) {
        for (const item of bomList) {
          if (!item.partId) continue;

          const existingPart = await tx.partNumber.findUnique({
            where: { part_id: item.partId },
            include: { process: true },
          });

          if (!existingPart) {
            console.warn(`Part ID ${item.partId} not found. Skipping.`);
            continue;
          }

          const finalCycleTime =
            (item.totalTime ? item.totalTime.toString() : null) ||
            (item.cycleTime ? item.cycleTime.toString() : null) ||
            existingPart.cycleTime ||
            "0";

          const finalProcessId =
            item.processId || existingPart.processId || null;

          const finalProcessName =
            item.process ||
            existingPart.process?.processName ||
            existingPart.processDesc ||
            "";

          const qtyPerUnit = parseInt(item.qty || 1, 10);
          const orderQty = parseInt(productQuantity, 10);
          const totalRequiredQty = qtyPerUnit * orderQty;
          const createdCustomPart = await tx.customPart.create({
            data: {
              partNumber: existingPart.partNumber,
              quantity: qtyPerUnit,
              processId: finalProcessId,
              processName: finalProcessName,
              cycleTime: finalCycleTime,
              workInstruction: existingPart.instructionRequired ? "Yes" : "No",
              customOrderId: createdOrder.id,
            },
          });

          // D. Create Schedule Entry (Linked to CustomPart)
          await tx.stockOrderSchedule.create({
            data: {
              order_id: createdOrder.id,
              order_type: "Custom Order",
              part_id: existingPart.part_id,
              quantity: totalRequiredQty,
              scheduleQuantity: totalRequiredQty,
              remainingQty: totalRequiredQty,
              processId: finalProcessId,
              status: "new",
              order_date: new Date(orderDate),
              delivery_date: new Date(shipDate),

              // LINKING ID HERE (This works now because we used .create())
              customPartId: createdCustomPart.id,
            },
          });
        }
      }

      // ---------------------------------------------------------
      // 4. Process New Parts (MANUAL ENTRY)
      // ---------------------------------------------------------
      if (Array.isArray(newParts) && newParts.length > 0) {
        const validNewParts = newParts.filter(
          (p) => p.part && p.part.trim() !== ""
        );

        for (const partItem of validNewParts) {
          // ✅ CHECK: Kya ye Part Number pehle se DB me exist karta hai?
          // Hum assume kar rahe hain ki 'partItem.part' me Part Number ka naam hai
          const duplicateCheck = await tx.partNumber.findFirst({
            where: {
              partNumber: partItem.part, // Check exact match
            },
          });

          if (duplicateCheck) {
            // Agar part mil gaya, toh Error throw karo.
            // Transaction rollback ho jayega aur catch block me chala jayega.
            return res.status(400).json({
              message: "This new part already exist .",
            });
          }

          // Agar exist nahi karta, toh aage ka logic (Save to CustomPart or create new PartNumber)
          console.log("Processing verified new manual part:", partItem.part);

          // Example: Save this new manual part into CustomPart table
          // Note: Since it's a manual part, we might not have a processId or part_id yet
          await tx.customPart.create({
            data: {
              partNumber: partItem?.part,
              quantity: parseInt(partItem?.qty || 1, 10),
              processName: partItem?.process,
              customOrderId: createdOrder.id,
              // Other fields as needed
            },
          });
        }
      }

      return createdOrder;
    });

    return res.status(201).json({
      message: "Custom order created successfully!",
      data: newCustomOrder,
    });
  } catch (error) {
    console.error("Error creating custom order:", error);
    return res.status(500).send({
      message: "Transaction failed.",
      error: error.message,
    });
  }
};
// const addCustomOrder = async (req, res) => {
//   try {
//     const {
//       orderNumber,
//       orderDate,
//       shipDate,
//       customerId,
//       customerName,
//       customerEmail,
//       customerPhone,
//       productId,
//       part_id,
//       cost,
//       totalCost,
//       productQuantity,
//       newParts,
//     } = req.body;

//     if (!newParts || !Array.isArray(newParts) || newParts.length === 0) {
//       return res
//         .status(400)
//         .send({ message: "At least one process detail must be added." });
//     }

//     const newCustomOrder = await prisma.$transaction(async (tx) => {
//       let customer;
//       if (customerId) {
//         customer = await tx.customers.findUnique({
//           where: { id: customerId },
//         });
//       }

//       if (!customer) {
//         if (!customerName || !customerEmail) {
//           throw new Error(
//             "Customer name and email are required to create a new customer."
//           );
//         }
//         customer = await tx.customers.create({
//           data: {
//             firstName: customerName.split(" ")[0],
//             lastName: customerName.split(" ").slice(1).join(" ") || "",
//             email: customerEmail,
//             customerPhone: customerPhone,
//             createdBy: req.user?.id,
//           },
//         });
//       }
//       const createdOrder = await tx.customOrder.create({
//         data: {
//           orderNumber,
//           orderDate: new Date(orderDate),
//           shipDate: new Date(shipDate),
//           customerId: customer.id,
//           customerName,
//           customerEmail,
//           customerPhone,
//           productId,
//           ...(part_id && { partId: part_id }),
//           cost: parseFloat(cost),
//           totalCost: parseFloat(totalCost),
//           productQuantity: parseInt(productQuantity, 10),
//           processDetails: {
//             create: newParts.map((item) => ({
//               totalTime: parseInt(item.totalTime, 10),
//               process: item.processId,
//               assignTo: item.part,
//             })),
//           },
//         },
//       });

//       for (const processItem of newParts) {
//         let partRecord = await tx.partNumber.findUnique({
//           where: { partNumber: processItem.part },
//         });

//         if (!partRecord) {
//           partRecord = await tx.partNumber.create({
//             data: {
//               partNumber: processItem.part,
//               partFamily: `${processItem.part} Family`,
//               type: "part",
//               cost: parseFloat(cost),
//               leadTime: parseInt(processItem.totalTime, 10) || 0,
//               minStock: 0,
//               companyName: "SPI Custom",
//               processId: processItem.processId,
//             },
//           });
//         } else {
//           partRecord = await tx.partNumber.update({
//             where: { part_id: partRecord.part_id },
//             data: { processId: processItem.processId },
//           });
//         }

//         await tx.productTree.upsert({
//           where: {
//             product_part_unique: {
//               product_id: productId,
//               part_id: partRecord.part_id,
//             },
//           },
//           update: {
//             processId: processItem.processId,
//             partQuantity: { increment: 1 },
//           },
//           create: {
//             product_id: productId,
//             part_id: partRecord.part_id,
//             partQuantity: 1,
//             processId: processItem.processId,
//             createdBy: customer.id,
//           },
//         });
//       }
//       return createdOrder;
//     });

//     return res.status(201).json({
//       message: "Custom order created successfully!",
//       data: newCustomOrder,
//     });
//   } catch (error) {
//     console.error("Error during custom order transaction:", error);
//     return res.status(500).send({
//       message: "Something went wrong. The operation was rolled back.",
//       error: error.message,
//     });
//   }
// };
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
        isProcessReq: true,
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

    const existingPart = await prisma.partNumber.findFirst({
      where: {
        partNumber,
      },
    });

    if (existingPart && !existingPart.isDeleted) {
      return res.status(400).json({
        message: "Part Number already exists.",
      });
    }

    // If part exists but deleted, update it instead of creating
    if (existingPart && existingPart.isDeleted) {
      await prisma.partNumber.update({
        where: { part_id: existingPart.part_id },
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
          cycleTime: req?.body?.cycleTime,
          processOrderRequired: processOrderRequired === "true",
          processId,
          processDesc,
          type: "part",
          isDeleted: false,
          submittedBy: req.user.id,
          partImages: {
            create: getPartImages?.map((img) => ({
              imageUrl: img.filename,
              type: "part",
            })),
          },
        },
      });

      return res.status(200).json({
        message: " Part number reactivated successfully!",
      });
    }
    console.log("parseFloat(cost)parseFloat(cost)", parseFloat(cost));

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
        cycleTime: req?.body?.cycleTime,
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
        orderBy: {
          createdAt: "desc", // latest first
        },
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
      (file) => file?.fieldname === "partImages"
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

    const existingPart = await prisma.partNumber.findUnique({
      where: {
        partNumber: productNumber?.trim(),
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
        cycleTime: cycleTime,
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
      console.log("partpart0", part);

      const componentPart = await prisma.partNumber.findUnique({
        where: {
          part_id: part.part_id,
          isDeleted: false,
        },
        select: {
          processOrderRequired: true,
        },
      });

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
        orderBy: {
          createdAt: "desc", // latest first
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
            minStock: true,
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
    console.log("productTreeEntries", productTreeEntries);

    const parts = productTreeEntries.map((pt) => ({
      id: pt.id,
      part_id: pt.part_id,
      partNumber: pt.part?.partNumber || null,
      partFamily: pt.part?.partFamily || null,
      process: pt.part?.process || null,
      instructionRequired: pt.instructionRequired,
      partQuantity: pt.part?.minStock,
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
        cycleTime: cycleTime,
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
        cycleTime: cycleTime ? cycleTime : null,
        companyName,
        minStock: parseInt(minStock),
        availStock: parseInt(availStock),
        processId: processId || null,
        processDesc: processDesc,
        processOrderRequired: processOrderRequired === "true",
        instructionRequired: instructionRequired === "true",
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

    const transformedData = data.map(
      ({ part_id, partDescription, ...rest }) => ({
        productId: part_id,
        productDescription: partDescription,
        ...rest,
      })
    );

    return res.status(200).json({
      message: "Product number retrived successfully !",
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
        process: {
          select: {
            processName: true,
          },
        },
        availStock: true,
        cost: true,
        minStock: true,
        cycleTime: true,
        instructionRequired: true,
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
    console.log("errorerrorerror", error);
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

    let whereClause = {
      isDeleted: false,
      status: "Pending",
      // status: { not: "" }, // only empty status remove, scheduled allow
    };

    // CUSTOMER NAME SEARCH
    if (customerName) {
      const name = customerName.trim();
      const parts = name.split(/\s+/);

      if (parts.length >= 2) {
        whereClause.customer = {
          OR: [
            { firstName: { contains: name } },
            { lastName: { contains: name } },
            {
              AND: [
                { firstName: { contains: parts[0] } },
                { lastName: { contains: parts.slice(1).join(" ") } },
              ],
            },
          ],
        };
      } else {
        whereClause.customer = {
          OR: [
            { firstName: { contains: name } },
            { lastName: { contains: name } },
          ],
        };
      }
    }

    // PRODUCT NUMBER SEARCH
    if (productNumber) {
      whereClause.part = {
        partNumber: { contains: productNumber.trim() },
      };
    }

    // SHIP DATE SEARCH
    if (shipDate) {
      whereClause.shipDate = shipDate;
    }

    // FINAL QUERY
    const orders = await prisma.stockOrder.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        part: {
          include: {
            components: {
              include: {
                part: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      message: "Stock orders retrieved successfully!",
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching stock orders:", error);
    return res.status(500).json({
      message: "Something went wrong.",
      error: error.message,
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
//       andConditions.push({ customerName: { contains: customerName.trim() } });
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
//           { part: { partNumber: { contains: partNumber.trim() } } },
//           { product: { partNumber: { contains: partNumber.trim() } } },
//         ],
//       });
//     }

//     const orders = await prisma.customOrder.findMany({
//       where: { AND: andConditions },
//       orderBy: { createdAt: "desc" },
//       include: {
//         customer: true,
//         part: {
//           include: {
//             components: {
//               where: { isDeleted: false },
//               include: {
//                 part: true,
//               },
//             },
//           },
//         },
//         product: {
//           include: {
//             process: {
//               select: {
//                 id: true,
//                 processName: true,
//               },
//             },
//             components: {
//               where: { isDeleted: false },
//               include: {
//                 part: true,
//               },
//             },
//           },
//         },
//       },
//     });
//     if (orders.length === 0) {
//       return res.status(200).json({
//         message: "No custom orders found matching your criteria.",
//         data: [],
//       });
//     }

//     const formattedOrders = orders.map((order) => {
//       const { part, product, ...restOfOrder } = order;
//       const mainItem = product || part;
//       const productFamily = [];
//       if (mainItem) {
//         productFamily.push({
//           ...mainItem,
//           isParent: true,
//           quantityRequired: order.productQuantity || 1,
//           components: undefined,
//         });

//         if (mainItem.components && mainItem.components.length > 0) {
//           mainItem.components.forEach((componentEntry) => {
//             if (componentEntry.part) {
//               productFamily.push({
//                 ...componentEntry.part,
//                 isParent: false,
//                 quantityRequired: componentEntry.partQuantity,
//               });
//             }
//           });
//         }
//       }

//       // Final object return karein
//       return {
//         ...restOfOrder,
//         productFamily, // Product aur uske parts ki flat list
//       };
//     });

//     return res.status(200).json({
//       message: "Custom orders retrieved successfully!",
//       data: formattedOrders,
//     });
//   } catch (error) {
//     console.error("Error searching custom orders:", error);
//   }
// };

const formatOrders = (orders) => {
  return orders.map((order) => {
    const { part, product, ...rest } = order;

    const productFamily = [];

    // -------------------------
    // PRODUCT (Parent + Components)
    // -------------------------
    if (product) {
      // Parent product
      productFamily.push({
        ...product,
        isParent: true,
        quantityRequired: order.productQuantity || 1,
        components: undefined,
      });

      // Product components
      if (product.components?.length) {
        product.components.forEach((c) => {
          if (c.part) {
            productFamily.push({
              ...c.part,
              isParent: false,
              quantityRequired: c.partQuantity,
            });
          }
        });
      }
    }

    // -------------------------
    // PART (Parent + Components)
    // -------------------------
    if (part) {
      // Parent part
      productFamily.push({
        ...part,
        isParent: true,
        quantityRequired: 1,
        components: undefined,
      });

      // Part components
      if (part.components?.length) {
        part.components.forEach((c) => {
          if (c.part) {
            productFamily.push({
              ...c.part,
              isParent: false,
              quantityRequired: c.partQuantity,
            });
          }
        });
      }
    }

    return { ...rest, productFamily };
  });
};

const searchCustomOrders = async (req, res) => {
  try {
    const { customerName, shipDate, partNumber } = req.query;

    // Common Include Object (DRY Principle - Don't Repeat Yourself)
    // Ye ensure karega ki hume 'customPart' (BOM List) har baar mile.
    const commonInclude = {
      customer: true,
      part: {
        include: {
          components: {
            where: { isDeleted: false },
            include: { part: true },
          },
        },
      },
      product: {
        include: {
          process: { select: { id: true, processName: true } },
          components: {
            where: { isDeleted: false },
            include: { part: true },
          },
        },
      },
      customPart: true,
    };

    // -------------------------------------------------------------------------------------
    // CASE 1: IF NO SEARCH INPUT → RETURN ALL CUSTOM ORDERS
    // -------------------------------------------------------------------------------------
    if (!customerName && !shipDate && !partNumber) {
      const orders = await prisma.customOrder.findMany({
        where: {
          isDeleted: false,
        },
        orderBy: { createdAt: "desc" },
        include: commonInclude, // Using the updated include object
      });

      return res.status(200).json({
        message: "All custom orders retrieved successfully.",
        data: formatOrders(orders),
      });
    }

    // -------------------------------------------------------------------------------------
    // CASE 2: SEARCH LOGIC
    // -------------------------------------------------------------------------------------
    const andConditions = [{ isDeleted: false }];

    // -----------------------------
    // 🔹 SEARCH BY CUSTOMER NAME
    // -----------------------------
    if (customerName) {
      const name = customerName.trim();
      const [fName, lName] = name.split(" ");

      andConditions.push({
        customer: {
          is: {
            OR: [
              { firstName: { contains: name, mode: "insensitive" } },
              { lastName: { contains: name, mode: "insensitive" } },
              {
                AND: [
                  { firstName: { contains: fName || "", mode: "insensitive" } },
                  { lastName: { contains: lName || "", mode: "insensitive" } },
                ],
              },
            ],
          },
        },
      });
    }

    // -----------------------------
    // 🔹 SEARCH BY SHIP DATE
    // -----------------------------
    if (shipDate) {
      const date = new Date(shipDate);
      andConditions.push({
        shipDate: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
          lt: new Date(new Date(shipDate).setDate(date.getDate() + 1)),
        },
      });
    }

    // -----------------------------
    // 🔹 SEARCH BY PART NUMBER (Updated for BOM)
    // -----------------------------
    if (partNumber) {
      andConditions.push({
        OR: [
          // 1. Search in Main Part ID
          {
            part: {
              partNumber: { contains: partNumber.trim(), mode: "insensitive" },
            },
          },
          // 2. Search in Product ID
          {
            product: {
              partNumber: { contains: partNumber.trim(), mode: "insensitive" },
            },
          },
          // 3. ✅ NEW: Search inside the CustomPart (BOM List)
          // Agar user kisi child part ka number search kare, to bhi order milna chahiye
          {
            customPart: {
              some: {
                partNumber: {
                  contains: partNumber.trim(),
                  mode: "insensitive",
                },
              },
            },
          },
        ],
      });
    }

    // -------------------------------------------------------------------------------------
    // 🔹 GET SEARCH RESULTS
    // -------------------------------------------------------------------------------------
    const orders = await prisma.customOrder.findMany({
      where: { AND: andConditions },
      orderBy: { createdAt: "desc" },
      include: commonInclude, // Using the updated include object
    });

    // No results
    if (orders.length === 0) {
      return res.status(200).json({
        message: "No custom orders found matching your criteria.",
        data: [],
      });
    }

    // FINAL RESPONSE
    return res.status(200).json({
      message: "Custom orders retrieved successfully!",
      data: formatOrders(orders),
    });
  } catch (error) {
    console.error("Error searching custom orders:", error);
    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
      error: error.message,
    });
  }
};

// const stockOrderSchedule = async (req, res) => {
//   const ordersToSchedule = req.body;
//   try {
//     const allPrismaPromises = [];
//     const orderIdsToUpdate = new Set();

//     for (const order of ordersToSchedule) {
//       const { order_id, product_id, quantity, delivery_date, status, type } =
//         order;

//       if (!order_id || !product_id) {
//         console.warn(
//           "Skipping order due to missing order_id or product_id",
//           order
//         );
//         continue;
//       }

//       orderIdsToUpdate.add(order_id);

//       const productPart = await prisma.partNumber.findUnique({
//         where: { part_id: product_id },
//         include: { process: true },
//       });

//       if (productPart) {
//         const productSchedule = prisma.stockOrderSchedule.upsert({
//           where: {
//             order_id_part_id_order_type: {
//               order_id: order_id,
//               part_id: product_id,
//               order_type: "StockOrder", // You must provide the type now
//             },
//           },
//           update: {
//             delivery_date: new Date(delivery_date),
//             quantity: quantity,
//             status: status,
//             completed_date: null,
//             type: type,
//           },
//           create: {
//             // --- CHANGE #2: Set polymorphic fields directly ---
//             order_id: order_id,
//             order_type: "StockOrder",
//             // --- END OF CHANGES ---
//             delivery_date: new Date(delivery_date),
//             quantity: quantity,
//             status: status,
//             completed_date: null,
//             submittedBy: { connect: { id: req.user.id } },
//             part: { connect: { part_id: product_id } },
//             process: productPart.processId
//               ? { connect: { id: productPart.processId } }
//               : undefined,
//             scheduleQuantity: quantity,
//             remainingQty: quantity,
//           },
//         });
//         allPrismaPromises.push(productSchedule);
//       }

//       const bomEntries = await prisma.productTree.findMany({
//         where: { product_id: product_id },
//         include: { part: { include: { process: true } } },
//       });

//       const componentSchedulePromises = bomEntries.map((entry) => {
//         // Use a default value for minStock if it's null or undefined
//         const scheduleQty = quantity * (entry?.part?.minStock || 1);
//         return prisma.stockOrderSchedule.upsert({
//           where: {
//             // --- CHANGE #3: Use the new unique identifier here as well ---
//             order_id_part_id_order_type: {
//               order_id: order_id,
//               part_id: entry?.part?.part_id,
//               order_type: "StockOrder",
//             },
//           },
//           update: {
//             delivery_date: new Date(delivery_date),
//             quantity: quantity,
//             status: status,
//             completed_date: null,
//           },
//           create: {
//             // --- CHANGE #4: Set polymorphic fields directly here too ---
//             order_id: order_id,
//             order_type: "StockOrder",
//             // --- END OF CHANGES ---
//             delivery_date: new Date(delivery_date),
//             quantity: quantity,
//             status: status,
//             completed_date: null,
//             submittedBy: { connect: { id: req.user.id } },
//             part: { connect: { part_id: entry?.part?.part_id } },
//             process: entry?.part?.processId
//               ? { connect: { id: entry?.part?.processId } }
//               : undefined,
//             type: type,
//             scheduleQuantity: scheduleQty,
//             remainingQty: scheduleQty,
//           },
//         });
//       });

//       allPrismaPromises.push(...componentSchedulePromises);
//     }

//     if (allPrismaPromises.length > 0) {
//       const newSchedules = await prisma.$transaction(allPrismaPromises);

//       // Update all scheduled orders, not just the last one
//       await prisma.stockOrder.updateMany({
//         where: {
//           id: { in: Array.from(orderIdsToUpdate) },
//           isDeleted: false,
//         },
//         data: {
//           status: "scheduled",
//         },
//       });

//       return res.status(201).json({
//         message: `Successfully scheduled or updated  items.`,
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

      // 🟢 Helper: decide whether user is admin or employee
      const submittedBy =
        req.user.role === "superAdmin"
          ? { submittedByAdmin: { connect: { id: req.user.id } } }
          : { submittedByEmployee: { connect: { id: req.user.id } } };

      if (productPart) {
        const productSchedule = prisma.stockOrderSchedule.upsert({
          where: {
            order_id_part_id_order_type: {
              order_id: order_id,
              part_id: product_id,
              order_type: "StockOrder",
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
            order_id: order_id,
            order_type: "StockOrder",
            delivery_date: new Date(delivery_date),
            quantity: quantity,
            status: status,
            completed_date: null,
            ...submittedBy, // 🟢 dynamic relation
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
        const scheduleQty = quantity * (entry?.part?.minStock || 1);

        return prisma.stockOrderSchedule.upsert({
          where: {
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
            order_id: order_id,
            order_type: "StockOrder",
            delivery_date: new Date(delivery_date),
            quantity: quantity,
            status: status,
            completed_date: null,
            ...submittedBy, // 🟢 dynamic relation
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

      await prisma.stockOrder.updateMany({
        where: {
          id: { in: Array.from(orderIdsToUpdate) },
          isDeleted: false,
        },
        data: { status: "scheduled" },
      });

      return res.status(201).json({
        message: `Successfully scheduled or updated items.`,
        data: newSchedules,
      });
    }
  } catch (error) {
    console.error("Error during batch scheduling:", error);
    return res.status(500).json({
      message: "Something went wrong during scheduling.",
      error: error.message,
    });
  }
};

// const customOrderSchedule = async (req, res) => {
//   const partsToSchedule = req.body;

//   if (!Array.isArray(partsToSchedule) || partsToSchedule.length === 0) {
//     return res
//       .status(400)
//       .json({ message: "Request body must be a non-empty array." });
//   }

//   try {
//     const allPrismaPromises = [];
//     const orderIdsToUpdate = new Set();

//     for (const item of partsToSchedule) {
//       const {
//         order_id: customOrderId, // ID from CustomOrder
//         part_id,
//         quantity,
//         delivery_date,
//         status,
//         type,
//       } = item;

//       if (!customOrderId || !part_id || !quantity) {
//         console.warn("Skipping an item due to missing data:", item);
//         continue;
//       }

//       orderIdsToUpdate.add(customOrderId);

//       const partDetails = await prisma.partNumber.findUnique({
//         where: { part_id: part_id },
//       });

//       if (!partDetails) {
//         console.warn(`Part with ID ${part_id} not found. Skipping schedule.`);
//         continue;
//       }
//       const scheduleQuantity =
//         quantity *
//         (partDetails.type === "product"
//           ? quantity || 1
//           : partDetails.minStock || 1);

//       const schedulePromise = prisma.stockOrderSchedule.upsert({
//         // The unique constraint now correctly identifies the record
//         where: {
//           order_id_part_id_order_type: {
//             order_id: customOrderId,
//             part_id: part_id,
//             order_type: "CustomOrder", // Specify the type
//           },
//         },
//         update: {
//           delivery_date: new Date(delivery_date),
//           quantity: quantity,
//           status: status,
//           type: type,
//           scheduleQuantity: scheduleQuantity,
//           remainingQty: scheduleQuantity,
//           completed_date: null,
//         },
//         create: {
//           // --- THIS IS THE KEY CHANGE ---
//           // Manually set the polymorphic fields instead of using 'connect'
//           order_id: customOrderId,
//           order_type: "CustomOrder",
//           // --- END OF CHANGE ---

//           part: { connect: { part_id: part_id } },
//           delivery_date: new Date(delivery_date),
//           quantity: quantity,
//           status: status,
//           type: type,
//           scheduleQuantity: scheduleQuantity,
//           remainingQty: scheduleQuantity,
//           completed_date: null,
//           submittedBy: { connect: { id: req.user.id } },
//           process: partDetails.processId
//             ? { connect: { id: partDetails.processId } }
//             : undefined,
//         },
//       });

//       allPrismaPromises.push(schedulePromise);
//     }

//     if (allPrismaPromises.length === 0) {
//       return res
//         .status(200)
//         .json({ message: "No valid items were provided to schedule." });
//     }

//     const newSchedules = await prisma.$transaction(allPrismaPromises);

//     await prisma.customOrder.updateMany({
//       where: { id: { in: Array.from(orderIdsToUpdate) } },
//       data: { status: "scheduled" },
//     });

//     return res.status(201).json({
//       message: `Successfully scheduled or updated ${newSchedules.length} items.`,
//       data: newSchedules,
//     });
//   } catch (error) {
//     console.error("Error during custom order batch scheduling:", error);
//     return res
//       .status(500)
//       .json({ message: "Something went wrong.", error: error.message });
//   }
// };

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
        order_id: customOrderId, // CustomOrder ka ID
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

      // Part details fetch
      const partDetails = await prisma.partNumber.findUnique({
        where: { part_id: part_id },
        include: { process: true },
      });

      if (!partDetails) {
        console.warn(`Part with ID ${part_id} not found. Skipping schedule.`);
        continue;
      }

      // 🟢 Helper: decide whether user is admin or employee
      const submittedBy =
        req.user.role === "superAdmin"
          ? { submittedByAdmin: { connect: { id: req.user.id } } }
          : { submittedByEmployee: { connect: { id: req.user.id } } };

      // Schedule Qty (product vs part logic)
      const scheduleQuantity =
        partDetails.type === "product"
          ? quantity
          : quantity * (partDetails.minStock || 1);

      // Upsert for CustomOrder
      const schedulePromise = prisma.stockOrderSchedule.upsert({
        where: {
          order_id_part_id_order_type: {
            order_id: customOrderId,
            part_id: part_id,
            order_type: "CustomOrder",
          },
        },
        update: {
          delivery_date: new Date(delivery_date),
          quantity,
          status,
          type,
          scheduleQuantity,
          remainingQty: scheduleQuantity,
          completed_date: null,
        },
        create: {
          order_id: customOrderId,
          order_type: "CustomOrder",
          delivery_date: new Date(delivery_date),
          quantity,
          status,
          type,
          scheduleQuantity,
          remainingQty: scheduleQuantity,
          completed_date: null,
          ...submittedBy, // ✅ Submitted by (Admin/Employee)
          part: { connect: { part_id } },
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

    // Run all promises in a transaction
    const newSchedules = await prisma.$transaction(allPrismaPromises);

    // Update customOrder status
    await prisma.customOrder.updateMany({
      where: { id: { in: Array.from(orderIdsToUpdate) } },
      data: { status: "scheduled" },
    });

    return res.status(201).json({
      message: `Successfully scheduled ordres`,
      data: newSchedules,
    });
  } catch (error) {
    console.error("Error during custom order batch scheduling:", error);
    return res.status(500).json({
      message: "Something went wrong during custom order scheduling.",
      error: error.message,
    });
  }
};

// const scheduleStockOrdersList = async (req, res) => {
//   try {
//     const { search, order_type } = req.query;
//     const paginationData = await paginationQuery(req.query);
//     const whereClause = {
//       isDeleted: false,
//     };
//     if (order_type && order_type !== "all") {
//       whereClause.order_type = order_type;
//     }

//     if (search) {
//       whereClause.OR = [{ part: { partNumber: { contains: search } } }];
//     }
//     // if (req.user?.role === "Frontline_Manager") {
//     //   whereClause.submittedByEmployeeId = req.user.id;
//     // }

//     const [filteredSchedules, totalCount] = await Promise.all([
//       prisma.stockOrderSchedule.findMany({
//         where: whereClause,
//         skip: paginationData.skip,
//         take: paginationData.pageSize,
//         orderBy: {
//           createdAt: "desc",
//         },
//         include: {
//           part: {
//             select: {
//               partNumber: true,
//               process: true,
//             },
//           },
//           completedByEmployee: {
//             select: {
//               firstName: true,
//               lastName: true,
//             },
//           },
//         },
//       }),
//       prisma.stockOrderSchedule.count({
//         where: whereClause,
//       }),
//     ]);

//     if (filteredSchedules.length === 0) {
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
//     const stockOrderIds = [];
//     const customOrderIds = [];

//     for (const schedule of filteredSchedules) {
//       if (schedule.order_type === "StockOrder" && schedule.order_id) {
//         stockOrderIds.push(schedule.order_id);
//       } else if (schedule.order_type === "CustomOrder" && schedule.order_id) {
//         customOrderIds.push(schedule.order_id);
//       }
//     }

//     const [stockOrders, customOrders] = await Promise.all([
//       stockOrderIds.length > 0
//         ? prisma.stockOrder.findMany({
//             where: { id: { in: stockOrderIds } },
//             include: { part: { select: { partNumber: true } } },
//           })
//         : Promise.resolve([]),

//       customOrderIds.length > 0
//         ? prisma.customOrder.findMany({
//             where: { id: { in: customOrderIds } },
//             include: { product: { select: { partNumber: true } } },
//           })
//         : Promise.resolve([]),
//     ]);
//     console.log("customOrderscustomOrders", customOrders);
//     const stockOrderMap = new Map(
//       stockOrders.map((order) => [order.id, order])
//     );
//     const customOrderMap = new Map(
//       customOrders.map((order) => [order.id, order])
//     );
//     const schedulesWithOrders = filteredSchedules.map((schedule) => {
//       let orderData = null;
//       if (schedule.order_type === "StockOrder") {
//         orderData = stockOrderMap.get(schedule.order_id) || null;
//       } else if (schedule.order_type === "CustomOrder") {
//         orderData = customOrderMap.get(schedule.order_id) || null;
//       }
//       return { ...schedule, order: orderData };
//     });

//     const getPagination = await pagination({
//       page: paginationData.page,
//       pageSize: paginationData.pageSize,
//       total: totalCount,
//     });

//     return res.status(200).json({
//       message: "Scheduled orders retrieved successfully!",
//       data: schedulesWithOrders,
//       pagination: getPagination,
//     });
//   } catch (error) {
//     console.error("Error retrieving scheduled orders:", error);
//     return res.status(500).json({
//       message: "Something went wrong. Please try again later.",
//       error: error.message,
//     });
//   }
// };

const scheduleStockOrdersList = async (req, res) => {
  try {
    const { search, order_type } = req.query;
    const paginationData = await paginationQuery(req.query);
    const whereClause = { isDeleted: false };

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
        orderBy: { createdAt: "desc" },
        include: {
          part: { select: { partNumber: true, process: true } },
          completedByEmployee: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.stockOrderSchedule.count({ where: whereClause }),
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
    const customPartIds = [];

    for (const schedule of filteredSchedules) {
      // String normalize: "Custom Order" -> "CustomOrder"
      const type = schedule.order_type?.replace(/\s/g, "");

      if (type === "StockOrder" && schedule.order_id) {
        stockOrderIds.push(schedule.order_id);
      } else if (type === "CustomOrder") {
        if (schedule.order_id) customOrderIds.push(schedule.order_id);
        if (schedule.customPartId) customPartIds.push(schedule.customPartId);
      }
    }

    const [stockOrders, customOrders, customPartDetails] = await Promise.all([
      stockOrderIds.length > 0
        ? prisma.stockOrder.findMany({
            where: { id: { in: stockOrderIds } },
            include: { part: { select: { partNumber: true } } },
          })
        : [],

      customOrderIds.length > 0
        ? prisma.customOrder.findMany({
            where: { id: { in: customOrderIds } },
            include: { product: { select: { partNumber: true } } },
          })
        : [],

      customPartIds.length > 0
        ? prisma.customPart.findMany({
            where: { id: { in: customPartIds } },
            include: {
              CustomOrder: {
                // Capital 'C' as per your schema
                include: { product: { select: { partNumber: true } } },
              },
            },
          })
        : [],
    ]);

    // Maps creation
    const stockOrderMap = new Map(stockOrders.map((o) => [o.id, o]));
    const customOrderMap = new Map(customOrders.map((o) => [o.id, o]));

    // Yahan fix kiya: cp.CustomOrder (Capital C)
    const customPartMap = new Map(
      customPartDetails.map((cp) => [cp.id, cp.CustomOrder])
    );

    const schedulesWithOrders = filteredSchedules.map((schedule) => {
      let orderData = null;
      const type = schedule.order_type?.replace(/\s/g, "");

      if (type === "StockOrder") {
        orderData = stockOrderMap.get(schedule.order_id) || null;
      } else if (type === "CustomOrder") {
        // First try via order_id, if null try via customPartId
        orderData =
          customOrderMap.get(schedule.order_id) ||
          customPartMap.get(schedule.customPartId) ||
          null;
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
      message: "Something went wrong.",
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

    // Step 1: Fetch orders WITHOUT include (avoid Prisma panic)
    const orders = await prisma.supplier_orders.findMany({
      where: filterConditions,
      orderBy: {
        createdAt: "desc",
      },
      skip: paginationData.skip,
      take: paginationData.pageSize,
    });

    // Step 2: Manually fetch relations for each order
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        console.log("orderorderorder", order);
        const [supplier, part] = await Promise.all([
          prisma.suppliers.findUnique({
            where: { id: order.supplier_id },
            select: {
              firstName: true,
              lastName: true,
            },
          }),
          prisma.partNumber.findFirst({
            where: { part_id: order.part_id },
            select: {
              partNumber: true,
              partDescription: true,
            },
          }),
        ]);

        return {
          ...order,
          supplier,
          part,
        };
      })
    );

    // Total count for pagination
    const totalCount = await prisma.supplier_orders.count({
      where: filterConditions,
    });

    // Pagination response
    const paginationObj = {
      page: paginationData.page,
      pageSize: paginationData.pageSize,
      total: totalCount,
    };

    const getPagination = await pagination(paginationObj);

    return res.status(200).json({
      message: "Supplier order list retrieved successfully!",
      data: enrichedOrders,
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

    console.log("part_idpart_id", part_id);
    const existingOrder = await prisma.supplier_orders.findUnique({
      where: { id },
      select: { status: true },
    });
    const record = await prisma.partNumber.findUnique({
      where: { part_id },
    });
    if (!record) {
      return res.status(404).json({ message: "Part/Product record not found" });
    }
    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found" });
    }
    const oldStatus = existingOrder.status;

    await prisma.supplier_orders.update({
      where: { id },
      data: { status },
    });

    if (status === "Delivered" && oldStatus !== "Delivered") {
      await prisma.partNumber.update({
        where: { part_id },
        data: {
          supplierOrderQty: { increment: quantity },
          availStock: { increment: quantity },
        },
      });
      await prisma.supplier_inventory.updateMany({
        where: { part_id },
        data: { availStock: { increment: quantity } },
      });
    } else if (oldStatus === "Delivered" && status !== "Delivered") {
      await prisma.partNumber.update({
        where: { part_id },
        data: {
          supplierOrderQty: { decrement: quantity },
          availStock: { decrement: quantity },
        },
      });
      await prisma.supplier_inventory.updateMany({
        where: { part_id },
        data: { availStock: { decrement: quantity } },
      });
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
    const vacationRequests1 = await prisma.vacationRequest.findMany({
      where: {
        employeeId: queryEmployeeId,
        isDeleted: false,
      },
    });
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

    const groupedByDate = allEvents.reduce((acc, event) => {
      const date = new Date(event.timestamp).toISOString().split("T")[0];

      const matchedVacation = vacationRequests1.find((v) => {
        const vStart = new Date(v.startDate);
        const vEnd = new Date(v.endDate);
        console.log("vvvvv", v);
        return v.employeeId === event.employee.id;
      });
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
          vacation: matchedVacation.status || "PENDING",
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

    let timeSheetData = Object.values(groupedByDate);

    if (search) {
      const lowercasedSearch = search.toLowerCase();
      timeSheetData = timeSheetData.filter((entry) => {
        return (
          entry.date.toLowerCase().includes(lowercasedSearch) ||
          entry.employeeName.toLowerCase().includes(lowercasedSearch) ||
          entry.employeeEmail.toLowerCase().includes(lowercasedSearch)
        );
      });
    }

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
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const timeClockList = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);
    const { search = "", filter = "" } = req.query; // Changed 'partfamily' to 'role' to align with UI

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
      const createDate = new Date(item.cycleTimeStart);

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
        createDate: createDate.toISOString().split("T")[0],
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
    if (!user) {
      return res.status(400).send({ message: "Employee not found" });
    }

    const fullName = `${user.employee?.firstName || ""} ${
      user.employee?.lastName || ""
    }`.trim();
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

const getLiveProduction = async (req, res) => {
  try {
    // Fetch all production responses of current shift (example)
    const responses = await prisma.productionResponse.findMany({
      where: { isDeleted: false },
    });

    let totalCompleted = 0;
    let totalScrap = 0;
    let totalCycleTime = 0;
    let totalParts = 0;

    responses.forEach((item) => {
      totalCompleted += item.completedQuantity || 0;
      totalScrap += item.scrapQuantity || 0;

      if (item.cycleTimeStart && item.cycleTimeEnd) {
        const cycleTime =
          new Date(item.cycleTimeEnd) - new Date(item.cycleTimeStart); // ms
        totalCycleTime += cycleTime;
        totalParts++;
      }
    });

    const avgCycleTimeSec =
      totalParts > 0 ? totalCycleTime / totalParts / 1000 : 0;

    const target = avgCycleTimeSec > 0 ? Math.floor(3600 / avgCycleTimeSec) : 0;

    return res.status(200).json({
      shift: 1,
      actual: totalCompleted,
      scrap: totalScrap,
      target,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching live production data" });
  }
};

// Helper to calculate start/end of day
const getDayRange = (dateString) => {
  const startOfDay = moment(dateString).startOf("day").toDate();
  const endOfDay = moment(dateString).endOf("day").toDate();
  return { startOfDay, endOfDay };
};
const productionOverview = async (req, res) => {
  try {
    const { startOfDay, endOfDay } = getDayRange(
      req.query.date || moment().format("YYYY-MM-DD")
    );

    const productionResponses = await prisma.productionResponse.findMany({
      where: {
        submittedDateTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        isDeleted: false,
      },
      select: {
        completedQuantity: true,
        scrapQuantity: true,
      },
    });

    const totalActual = productionResponses.reduce(
      (sum, res) => sum + (res.completedQuantity || 0),
      0
    );
    const totalScrap = productionResponses.reduce(
      (sum, res) => sum + (res.scrapQuantity || 0),
      0
    );

    // Determine current shift (simplified)
    const currentHour = moment().hour();
    let shift = 1; // Default
    if (currentHour >= 6 && currentHour < 14) shift = 1;
    else if (currentHour >= 14 && currentHour < 22) shift = 2;
    else shift = 3; // Night shift

    const overview = {
      hourByHour: [
        { label: "Shift", value: shift, image: "green.png" },
        { label: "Actual", value: totalActual, image: "yellow.png" },
        { label: "Scrap", value: totalScrap, image: "orange.png" },
      ],
      pieChartData: [
        { name: "Actual", value: totalActual, color: "#4CAF50" },
        { name: "Scrap", value: totalScrap, color: "#FFC107" },
      ],
    };

    res.json(overview);
  } catch (error) {
    console.error("Error fetching overview:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
// function parseCycleTime(cycleTimeStr) {
//   if (!cycleTimeStr) return null;

//   const match = cycleTimeStr
//     .trim()
//     .toLowerCase()
//     .match(
//       /^(\d+(\.\d+)?)\s*(sec|second|seconds|min|minute|minutes|hr|hour|hours)$/
//     );
//   if (!match) return null;

//   const value = parseFloat(match[1]);
//   const unit = match[3];

//   let minutes;
//   switch (unit) {
//     case "sec":
//     case "second":
//     case "seconds":
//       minutes = value / 60; // convert sec → minutes
//       break;
//     case "min":
//     case "minute":
//     case "minutes":
//       minutes = value; // already minutes
//       break;
//     case "hr":
//     case "hour":
//     case "hours":
//       minutes = value * 60; // convert hr → minutes
//       break;
//     default:
//       minutes = value; // fallback assume minutes
//   }

//   return minutes;
// }
function parseCycleTime(cycleTimeStr) {
  if (!cycleTimeStr) return 0;

  const minutes = Number(cycleTimeStr.trim());
  return isNaN(minutes) ? 0 : minutes;
}

const processHourly = async (req, res) => {
  try {
    const { startOfDay, endOfDay } = getDayRange(
      req.query.date || moment().format("YYYY-MM-DD")
    );

    const activeProcesses = await prisma.process.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        processName: true,
        cycleTime: true,
        ratePerHour: true,
      },
    });

    const allProcessData = [];
    let grandTotalActual = 0;
    let grandTotalScrap = 0;
    let grandTotalTarget = 0;

    for (const process of activeProcesses) {
      const productionResponses = await prisma.productionResponse.findMany({
        where: {
          processId: process.id,
          submittedDateTime: {
            gte: startOfDay,
            lte: endOfDay,
          },
          isDeleted: false,
        },
        include: {
          employeeInfo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeProfileImg: true,
            },
          },
        },
      });

      // parse cycleTime into minutes
      const cycleTimeMinutes = process.cycleTime
        ? parseCycleTime(process.cycleTime)
        : 0;
      const hourlyDataMap = new Map();
      let processTotalActual = 0;
      let processTotalScrap = 0;
      const employeesSet = new Map();

      // initialize 24 hours with target
      for (let h = 0; h < 24; h++) {
        const hourKey = moment().hour(h).format("HH:00");
        hourlyDataMap.set(hourKey, {
          actual: 0,
          scrap: 0,
          target: cycleTimeMinutes > 0 ? Math.round(60 / cycleTimeMinutes) : 0, // target per hour
        });
      }

      // sum actual, scrap, and track employees
      for (const response of productionResponses) {
        const hour = moment(response.submittedDateTime).format("HH:00");
        const currentHourData = hourlyDataMap.get(hour);

        if (currentHourData) {
          const actualQty = response.completedQuantity || 0;
          const scrapQty = response.scrapQuantity || 0;

          currentHourData.actual += actualQty;
          currentHourData.scrap += scrapQty;
        }

        processTotalActual += response.completedQuantity || 0;
        processTotalScrap += response.scrapQuantity || 0;

        if (response.employeeInfo) {
          employeesSet.set(response.employeeInfo.id, {
            name: `${response.employeeInfo.firstName} ${response.employeeInfo.lastName}`,
            profileImage: response.employeeInfo.employeeProfileImg,
          });
        }
      }

      const hourlyData = Array.from(hourlyDataMap.entries()).map(
        ([hour, data]) => ({
          hour,
          actual: data.actual,
          scrap: data.scrap,
          target: data.target,
        })
      );

      const totalTarget =
        cycleTimeMinutes > 0 ? Math.round(24 * (60 / cycleTimeMinutes)) : 0;

      // add to grand totals
      grandTotalActual += processTotalActual;
      grandTotalScrap += processTotalScrap;
      grandTotalTarget += totalTarget;

      allProcessData.push({
        processName: process.processName,
        hourlyData,
        total: {
          actual: processTotalActual,
          scrap: processTotalScrap,
          target: totalTarget,
        },
        employees: Array.from(employeesSet.values()),
      });
    }

    res.json({
      allProcessData,
      grandTotals: {
        actual: grandTotalActual,
        scrap: grandTotalScrap,
        target: grandTotalTarget,
      },
    });
  } catch (error) {
    console.error("Error fetching hourly process data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const liveProductionGoalBoard = async (req, res) => {
  try {
    const { startOfDay, endOfDay } = getDayRange(
      req.query.date || moment().format("YYYY-MM-DD")
    );

    const currentHour = moment().hour();
    const { shiftNumber, shiftLabel } = getShiftInfo(currentHour);

    // Fetch all active processes
    const activeProcesses = await prisma.process.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        processName: true,
        cycleTime: true,
        ratePerHour: true,
      },
    });

    let totalActualOverall = 0;
    let totalScrapOverall = 0;

    const processesHourlyData = [];

    for (const process of activeProcesses) {
      // Fetch production responses for the current process within the day
      const productionResponses = await prisma.productionResponse.findMany({
        where: {
          processId: process.id,
          submittedDateTime: {
            gte: startOfDay,
            lte: endOfDay,
          },
          isDeleted: false,
        },
        include: {
          employeeInfo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeProfileImg: true,
            },
          },
        },
      });

      const hourlyBreakdownMap = new Map(); // Hour (HH) -> { target, actual, scrap, employees: Set }

      // Initialize hourly breakdown for all 24 hours
      for (let h = 0; h < 24; h++) {
        const hourKey = moment().hour(h).format("HH");
        let targetValue = 0;
        if (process.ratePerHour) {
          targetValue = process.ratePerHour;
        } else if (process.cycleTime) {
          const cycleTimeMinutes = parseFloat(process.cycleTime);
          if (!isNaN(cycleTimeMinutes) && cycleTimeMinutes > 0) {
            targetValue = Math.round(60 / cycleTimeMinutes); // Units per hour
          }
        }
        hourlyBreakdownMap.set(hourKey, {
          hour: parseInt(hourKey),
          target: targetValue,
          actual: 0,
          scrap: 0,
          employees: new Map(), // Map to store unique employees for this hour
        });
      }

      let processActual = 0;
      let processScrap = 0;

      for (const response of productionResponses) {
        const responseHourKey = moment(response.submittedDateTime).format("HH");
        const hourData = hourlyBreakdownMap.get(responseHourKey);

        if (hourData) {
          hourData.actual += response.completedQuantity || 0;
          hourData.scrap += response.scrapQuantity || 0;
          processActual += response.completedQuantity || 0;
          processScrap += response.scrapQuantity || 0;

          if (response.employeeInfo) {
            hourData.employees.set(response.employeeInfo.id, {
              id: response.employeeInfo.id,
              name: `${response.employeeInfo.firstName} ${response.employeeInfo.lastName}`,
              image: response.employeeInfo.employeeProfileImg,
            });
          }
        }
      }

      totalActualOverall += processActual;
      totalScrapOverall += processScrap;

      // Convert hourlyBreakdownMap to a sorted array, and employees map to an array
      const hourlyDataArray = Array.from(hourlyBreakdownMap.values())
        .map((hourEntry) => ({
          hour: hourEntry.hour,
          target: hourEntry.target,
          actual: hourEntry.actual,
          scrap: hourEntry.scrap,
          employees: Array.from(hourEntry.employees.values()),
        }))
        .sort((a, b) => a.hour - b.hour); // Sort by hour

      processesHourlyData.push({
        processId: process.id,
        processName: process.processName,
        hourlyBreakdown: hourlyDataArray,
        totalActual: processActual,
        totalScrap: processScrap,
      });
    }

    // Prepare the final response structure
    const responseData = {
      summary: {
        shift: shiftNumber,
        shiftLabel: shiftLabel,
        totalActual: totalActualOverall,
        totalScrap: totalScrapOverall,
      },
      pieChartData: [
        { name: "Actual", value: totalActualOverall, color: "#4CAF50" }, // Green
        { name: "Scrap", value: totalScrapOverall, color: "#FFC107" }, // Amber/Yellow
      ],
      hourlyProductionByProcess: processesHourlyData,
    };

    res.json(responseData);
  } catch (error) {
    console.error("Error fetching live production goal board data:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};
// const currentStatusOverview = async (req, res) => {
//   try {
//     const stockOrders = await prisma.stockOrderSchedule.findMany({
//       where: { isDeleted: false },
//       include: {
//         process: {
//           select: {
//             id: true,
//             processName: true,
//             cycleTime: true,
//             ratePerHour: true,
//           },
//         },
//       },
//     });

//     const result = [];

//     for (const order of stockOrders) {
//       const process = order.process;

//       // parse cycleTime into minutes
//       const cycleTimeMinutes = parseCycleTime(process?.cycleTime);
//       const targetPerHour = cycleTimeMinutes
//         ? Math.round(60 / cycleTimeMinutes)
//         : process?.ratePerHour || 0;
//       console.log("cycleTimeMinutes", cycleTimeMinutes);
//       console.log("targetPerHourtargetPerHour", targetPerHour);

//       // totals
//       const actual = order.completedQuantity || 0;
//       const scrap = order.scrapQuantity || 0;
//       const scheduled = order.scheduleQuantity || 0;

//       // efficiency/productivity
//       const efficiency =
//         targetPerHour > 0 ? ((actual / targetPerHour) * 100).toFixed(1) : 0;
//       const productivity =
//         scheduled > 0 ? ((actual / scheduled) * 100).toFixed(1) : 0;

//       result.push({
//         processName: process?.processName,
//         partId: order.part_id,
//         scheduled,
//         actual,
//         scrap,
//         remaining: order.remainingQty,
//         targetPerHour,
//         efficiency: efficiency + "%",
//         productivity: productivity + "%",
//         avgCycleTime: process?.cycleTime || null,
//       });
//     }

//     res.json(result);
//   } catch (error) {
//     console.error("Error fetching current status overview:", error);
//     res
//       .status(500)
//       .json({ error: "Internal Server Error", details: error.message });
//   }
// };

const currentStatusOverview = async (req, res) => {
  try {
    const stockOrders = await prisma.stockOrderSchedule.findMany({
      where: { isDeleted: false },
      include: {
        process: {
          select: {
            id: true,
            processName: true,
            cycleTime: true,
            ratePerHour: true,
          },
        },
      },
    });

    const result = [];

    for (const order of stockOrders) {
      const process = order.process;

      const cycleTimeMinutes = parseCycleTime(process?.cycleTime);
      const targetPerHour = cycleTimeMinutes
        ? Math.round(60 / cycleTimeMinutes)
        : process?.ratePerHour || 0;

      const actual = order.completedQuantity || 0;
      const scrap = order.scrapQuantity || 0;
      const scheduled = order.scheduleQuantity || 0;

      const efficiency =
        targetPerHour > 0 ? ((actual / targetPerHour) * 100).toFixed(1) : 0;
      const productivity =
        scheduled > 0 ? ((actual / scheduled) * 100).toFixed(1) : 0;
      const startDate = order.startDateTime;
      const now = new Date();

      result.push({
        processName: process?.processName,
        partId: order.part_id,
        scheduled,
        actual,
        scrap,
        remaining: order.remainingQty,
        targetPerHour,
        efficiency: efficiency + "%",
        productivity: productivity + "%",
        avgCycleTime: process?.cycleTime || null,
        startDate: startDate,
        currentDate: now,
      });
    }

    res.json(result);
  } catch (error) {
    console.error("Error fetching current status overview:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};
// const currentQualityStatusOverview = async (req, res) => {
//   try {
//     const stockOrders = await prisma.stockOrderSchedule.findMany({
//       where: { isDeleted: false },
//       include: {
//         process: {
//           select: {
//             id: true,
//             processName: true,
//             cycleTime: true,
//             ratePerHour: true,
//           },
//         },
//       },
//     });

//     const now = new Date();
//     const startOfWeek = new Date(now);
//     startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
//     const lastWeek = new Date(startOfWeek);
//     lastWeek.setDate(startOfWeek.getDate() - 7);

//     // Group data
//     let totalScheduled = 0;
//     let totalActual = 0;
//     let totalScrap = 0;
//     let lastWeekScrap = 0;
//     let lastWeekActual = 0;

//     for (const order of stockOrders) {
//       totalScheduled += order.scheduleQuantity || 0;
//       totalActual += order.completedQuantity || 0;
//       totalScrap += order.scrapQuantity || 0;

//       if (
//         new Date(order.startDateTime) >= lastWeek &&
//         new Date(order.startDateTime) < startOfWeek
//       ) {
//         lastWeekScrap += order.scrapQuantity || 0;
//         lastWeekActual += order.completedQuantity || 0;
//       }
//     }

//     // Scrap cost logic example
//     const scrapCost = totalScrap * 10000; // suppose har scrap = $10k (custom logic)

//     res.json({
//       scheduled: totalScheduled,
//       actual: totalActual,
//       scrap: totalScrap,
//       scrapCost,
//       diffScrap: totalScrap - lastWeekScrap,
//       diffActual: totalActual - lastWeekActual,
//     });
//   } catch (error) {
//     console.error("Error fetching current status overview:", error);
//     res
//       .status(500)
//       .json({ error: "Internal Server Error", details: error.message });
//   }
// };

const currentQualityStatusOverview = async (req, res) => {
  try {
    // Fetch all stock orders that are not deleted
    const stockOrders = await prisma.StockOrderSchedule.findMany({
      where: { isDeleted: false },
      include: {
        process: {
          select: {
            id: true,
            processName: true,
          },
        },
      },
    });

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
    const lastWeek = new Date(startOfWeek);
    lastWeek.setDate(startOfWeek.getDate() - 7); // Start of last week

    let totalActual = 0;
    let totalScrap = 0;
    let lastWeekActual = 0;
    let lastWeekScrap = 0;

    // For Scrap By Process chart
    const scrapByProcessMap = {};

    stockOrders.forEach((order) => {
      const orderDate = new Date(order.order_date);

      totalActual += order.completedQuantity || 0;
      totalScrap += order.scrapQuantity || 0;

      if (orderDate >= lastWeek && orderDate < startOfWeek) {
        lastWeekActual += order.completedQuantity || 0;
        lastWeekScrap += order.scrapQuantity || 0;
      }

      if (order.process && order.scrapQuantity > 0) {
        const key = order.process.processName;
        if (!scrapByProcessMap[key]) scrapByProcessMap[key] = 0;
        scrapByProcessMap[key] += order.scrapQuantity;
      }
    });

    // Convert scrap by process map to array for chart
    const scrapByProcess = Object.entries(scrapByProcessMap).map(
      ([process, scrap]) => ({
        process,
        scrap,
      })
    );

    // Scrap cost logic
    const scrapCost = totalScrap * 10000; // custom logic: $10k per scrap

    res.json({
      actual: totalActual,
      scrap: totalScrap,
      scrapCost,
      diffActual: totalActual - lastWeekActual,
      diffScrap: totalScrap - lastWeekScrap,
      scrapByProcess,
    });
  } catch (error) {
    console.error("Error fetching current quality overview:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};

// const monitorChartsData = async (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;

//     const data = await prisma.stockOrderSchedule.findMany({
//       include: {
//         part: {
//           select: { partNumber: true },
//         },
//         process: {
//           select: {
//             processName: true,
//             processDesc: true,
//           },
//         },
//       },
//     });

//     const manualGrouped = {};
//     data.forEach((item) => {
//       const key = `${item.processId}-${item.part?.partNumber || "N/A"}`;

//       if (!manualGrouped[key]) {
//         manualGrouped[key] = {
//           processId: item.processId,
//           process: item.processId,
//           processName: item.process.processName,
//           processDesc: item.part.partNumber,
//           part: item.part?.partNumber || "N/A",
//           totalQuantity: 0,
//           totalCompleted: 0,
//           totalScrap: 0,
//         };
//       }
//       manualGrouped[key].totalQuantity += item.quantity || 0;
//       manualGrouped[key].totalCompleted += item.completedQuantity || 0;
//       manualGrouped[key].totalScrap += item.scrapQuantity || 0;
//     });
//     const manualTable = Object.values(manualGrouped);

//     // Monitor Table (production responses)
//     const partToMonitor = await prisma.productionResponse.findMany({
//       where: {
//         createdAt: {
//           gte: new Date(startDate),
//           lte: new Date(endDate),
//         },
//       },
//       include: {
//         PartNumber: { select: { partNumber: true } },
//         process: { select: { processName: true, processDesc: true } },
//       },
//     });

//     // Grouping monitor table by part
//     const monitorGrouped = {};
//     partToMonitor.forEach((item) => {
//       const key = item.PartNumber?.partNumber || "N/A";
//       if (!monitorGrouped[key]) {
//         monitorGrouped[key] = {
//           part: key,
//           processName: item.process?.processName || "N/A",
//           processDesc: item.process?.processDesc || "",
//           totalCycleTime: 0,
//           count: 0,
//         };
//       }

//       if (item.cycleTimeStart && item.cycleTimeEnd) {
//         const start = new Date(item.cycleTimeStart).getTime();
//         const end = new Date(item.cycleTimeEnd).getTime();
//         const diffSec = Math.max(0, (end - start) / 1000); // seconds
//         const diffMin = diffSec / 60; // ✅ convert to minutes
//         monitorGrouped[key].totalCycleTime += diffMin;
//         monitorGrouped[key].count += 1;
//       }
//     });

//     const monitorTable = Object.values(monitorGrouped).map((row) => ({
//       processName: row.processName,
//       processDesc: row.processDesc,
//       part: row.part,
//       cycleTime:
//         row.count > 0 ? (row.totalCycleTime / row.count).toFixed(2) : "--",
//     }));

//     // Totals
//     const totalCompletedQty = data.reduce(
//       (sum, item) => sum + (item.completedQuantity || 0),
//       0
//     );
//     const totalScrapQty = data.reduce(
//       (sum, item) => sum + (item.scrapQuantity || 0),
//       0
//     );

//     return res.status(200).json({
//       message: "All chart data retrieved successfully!",
//       manualTable,
//       monitorTable,
//       totals: { totalCompletedQty, totalScrapQty },
//     });
//   } catch (error) {
//     res.status(500).json({
//       error: "Internal Server Error",
//       details: error.message,
//     });
//   }
// };

// const getDiveApi = async (req, res) => {
//   try {
//     const { processId } = req.query;
//     const filterCondition = {
//       isDeleted: false,
//       ...(processId && { processId }),
//     };
//     const schedules = await prisma.stockOrderSchedule.findMany({
//       where: filterCondition,
//       include: {
//         process: {
//           select: {
//             id: true,
//             processName: true,
//             cycleTime: true,
//             ratePerHour: true,
//           },
//         },
//         part: { select: { part_id: true, partNumber: true } },
//         completedByEmployee: {
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//           },
//         },
//       },
//     });

//     const result = schedules.map((order) => {
//       const process = order.process;
//       const cycleTimeMinutes = parseCycleTime(process?.cycleTime);
//       console.log("cycleTimeMinutescycleTimeMinutes", cycleTimeMinutes);

//       const targetPerHour = process?.ratePerHour;
//       console.log("targetPerHourtargetPerHour", targetPerHour);

//       console.log("orderorder", order);

//       const actual = order.completedQuantity || 0;
//       const scrap = order.scrapQuantity || 0;
//       const scheduled = order.scheduleQuantity || 0;

//       const efficiency =
//         targetPerHour > 0 ? ((actual / targetPerHour) * 100).toFixed(1) : 0;
//       console.log("scheduledscheduled", scheduled);

//       const productivity = scheduled > 0 ? (actual / scheduled) * 100 : 0;
//       console.log("productivityproductivity", productivity);

//       return {
//         orderType: order.order_type,
//         processId: process?.id || null,
//         processName: process?.processName || null,
//         partId: order.part_id,
//         partNumber: order.part?.partNumber || null,
//         scheduled,
//         actual,
//         scrap,
//         remaining: order.remainingQty,
//         targetPerHour,
//         efficiency: efficiency + "%",
//         productivity: productivity + "%",
//         avgCycleTime: process?.cycleTime || null,
//         startDate: order.order_date,
//         deliveryDate: order.delivery_date,
//         currentDate: new Date(),
//         employeeInfo: order.completedByEmployee
//           ? {
//               id: order.completedByEmployee.id,
//               firstName: order.completedByEmployee.firstName,
//               lastName: order.completedByEmployee.lastName,
//             }
//           : null,
//       };
//     });

//     const responses = await prisma.productionResponse.findMany({
//       where: filterCondition,
//       include: {
//         process: {
//           select: {
//             id: true,
//             processName: true,
//             cycleTime: true,
//             ratePerHour: true,
//           },
//         },
//         PartNumber: { select: { part_id: true, partNumber: true } },
//         employeeInfo: { select: { id: true, firstName: true, lastName: true } },
//       },
//     });

//     const result1 = responses.map((resp) => {
//       const process = resp.process;
//       const employee = resp.employeeInfo;

//       // Find matching schedule entry from result (processId + partId match)
//       const matchingSchedule = result.find(
//         (r) => r.processId === process?.id && r.partId === resp.partId
//       );
//       console.log("matchingSchedulematchingSchedule", matchingSchedule);

//       // Use schedule from stockOrderSchedule (result), fallback to resp.scheduleQuantity
//       const scheduled =
//         Number(matchingSchedule?.scheduled) ||
//         Number(resp.scheduleQuantity) ||
//         0;

//       const actualQty = Number(matchingSchedule?.actual) || 0;
//       const scrapQty = Number(matchingSchedule?.scrap) || 0;

//       const targetPerHour = process?.ratePerHour;

//       const efficiency =
//         targetPerHour > 0 ? ((actualQty / targetPerHour) * 100).toFixed(1) : 0;

//       const productivity = scheduled > 0 ? (actualQty / scheduled) * 100 : 0;

//       return {
//         processName: process?.processName || null,
//         employeeName: employee
//           ? `${employee.firstName} ${employee.lastName}`
//           : null,
//         CT: (parseFloat(process?.cycleTime) || 0).toFixed(2),
//         Qty: actualQty,
//         Scrap: scrapQty,
//         Eff: efficiency + "%",
//         Prod: productivity.toFixed(1) + "%", // keeping consistent decimal
//       };
//     });

//     res.json({
//       message: "Current status overview fetched successfully",
//       processId: processId || "All",
//       totalRecords: result.length,
//       data: result,
//       productivity: result1,
//     });
//   } catch (error) {
//     console.error("Error fetching current status overview:", error);
//     res
//       .status(500)
//       .json({ error: "Internal Server Error", details: error.message });
//   }
// };

const monitorChartsData = async (req, res) => {
  try {
    const today = new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);

    const data = await prisma.stockOrderSchedule.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        part: { select: { partNumber: true } },
        process: { select: { processName: true, processDesc: true } },
      },
    });

    const manualGrouped = {};
    data.forEach((item) => {
      const key = `${item.processId}-${item.part?.partNumber || "N/A"}`;

      if (!manualGrouped[key]) {
        manualGrouped[key] = {
          process: item.process?.processName || "N/A",
          part: item.part?.partNumber || "N/A",
          qty: 0,
          scrap: 0,
        };
      }
      manualGrouped[key].qty += item.quantity || 0;
      manualGrouped[key].scrap += item.scrapQuantity || 0;
    });

    const manualTable = Object.values(manualGrouped);

    // ---------------- Monitor Table (cycle time) ----------------
    const partToMonitor = await prisma.productionResponse.findMany({
      where: {
        isDeleted: false,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        PartNumber: { select: { partNumber: true, partDescription: true } },
        process: {
          select: { processName: true, processDesc: true, cycleTime: true },
        },
      },
    });

    const monitorGrouped = {};
    partToMonitor.forEach((item) => {
      const key = `${item.process?.processName || "N/A"}-${
        item.PartNumber?.partDescription || "N/A"
      }`;

      if (!monitorGrouped[key]) {
        monitorGrouped[key] = {
          processName: item.process?.processName || "N/A",
          processDesc: item.process?.processDesc || "",
          cycleTime: item.process?.cycleTime || "",
          part: item.PartNumber?.partNumber || "N/A",
          totalCycleTime: 0,
          count: 0,
        };
      }

      if (item.cycleTimeStart && item.cycleTimeEnd) {
        const start = new Date(item.cycleTimeStart).getTime();
        const end = new Date(item.cycleTimeEnd).getTime();
        const diffSec = Math.max(0, (end - start) / 1000);
        const diffMin = diffSec / 60;
        monitorGrouped[key].totalCycleTime += diffMin;
        monitorGrouped[key].count += 1;
      }
    });

    const monitorTable = Object.values(monitorGrouped)
      .map((row) => ({
        processName: row.processName,
        processDesc: row.processDesc,
        part: row.part,
        actualCycleTime: row.cycleTime,
        cycleTime:
          row.count > 0 ? (row.totalCycleTime / row.count).toFixed(2) : "--",
      }))
      .sort((a, b) => a.cycleTime - b.cycleTime);

    const scrapGrouped = {};
    partToMonitor.forEach((item) => {
      const key = `${item.process?.processName || "N/A"}-${
        item.PartNumber?.partDescription || "N/A"
      }`;

      if (!scrapGrouped[key]) {
        scrapGrouped[key] = {
          processName: item.process?.processName || "N/A",
          part: item.PartNumber?.partDescription || "N/A",
          scrap: 0,
        };
      }
      scrapGrouped[key].scrap += item.scrapQuantity || 0;
    });

    const productionScrap = Object.values(scrapGrouped).sort(
      (a, b) => b.scrap - a.scrap
    );

    const totalCompletedQty = data.reduce(
      (sum, item) => sum + (item.completedQuantity || 0),
      0
    );
    const totalScrapQty = data.reduce(
      (sum, item) => sum + (item.scrapQuantity || 0),
      0
    );

    return res.status(200).json({
      message: "All chart data retrieved successfully!",
      manualTable,
      monitorTable,
      productionScrap,
      totals: { totalCompletedQty, totalScrapQty },
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
};
const getDiveApi = async (req, res) => {
  try {
    const { processId, startDate, endDate } = req.query;

    // ===============================
    // Filters
    // ===============================
    const filterCondition = {
      isDeleted: false,
      ...(processId && { processId }),
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
          },
        }),
    };

    // ===============================
    // 1️⃣ Fetch schedules
    // ===============================
    const schedules = await prisma.stockOrderSchedule.findMany({
      where: filterCondition,
      include: {
        process: {
          select: {
            id: true,
            processName: true,
            cycleTime: true,
            ratePerHour: true,
          },
        },
        part: {
          select: {
            part_id: true,
            partNumber: true,
          },
        },
        completedByEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // ===============================
    // 2️⃣ Employee-wise aggregation
    // ===============================
    const employeeMap = {};

    schedules.forEach((order) => {
      if (!order.completedByEmployee) return;

      const emp = order.completedByEmployee;
      const empKey = `${emp.id}_${order.process?.id}`;

      if (!employeeMap[empKey]) {
        employeeMap[empKey] = {
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          processId: order.process?.id,
          processName: order.process?.processName,
          totalScheduled: 0,
          totalCompleted: 0,
          totalScrap: 0,
        };
      }

      employeeMap[empKey].totalScheduled += Number(order.scheduleQuantity || 0);
      employeeMap[empKey].totalCompleted += Number(
        order.completedQuantity || 0
      );
      employeeMap[empKey].totalScrap += Number(order.scrapQuantity || 0);
    });

    // ===============================
    // 3️⃣ Employee productivity result
    // ===============================
    const productivity = Object.values(employeeMap).map((emp) => {
      const netQty = emp.totalCompleted - emp.totalScrap;

      const prod =
        emp.totalScheduled > 0
          ? ((netQty / emp.totalScheduled) * 100).toFixed(1)
          : "0.0";

      const eff =
        emp.totalScheduled > 0
          ? ((emp.totalCompleted / emp.totalScheduled) * 100).toFixed(1)
          : "0.0";

      return {
        processName: emp.processName,
        employeeName: emp.employeeName,
        Qty: emp.totalCompleted,
        Scrap: emp.totalScrap,
        Eff: eff + "%",
        Prod: prod + "%",
      };
    });

    // ===============================
    // 4️⃣ Order-wise data
    // ===============================
    const orderData = schedules.map((order) => {
      const scheduled = Number(order.scheduleQuantity || 0);
      const actual = Number(order.completedQuantity || 0);
      const scrap = Number(order.scrapQuantity || 0);

      const productivity =
        scheduled > 0 ? ((actual - scrap) / scheduled) * 100 : 0;

      const efficiency = scheduled > 0 ? (actual / scheduled) * 100 : 0;

      return {
        orderType: order.order_type,
        processName: order.process?.processName,
        partNumber: order.part?.partNumber,
        scheduled,
        actual,
        scrap,
        productivity: productivity.toFixed(1) + "%",
        efficiency: efficiency.toFixed(1) + "%",
        employee: order.completedByEmployee
          ? `${order.completedByEmployee.firstName} ${order.completedByEmployee.lastName}`
          : null,
      };
    });

    // ===============================
    // 5️⃣ Final response
    // ===============================
    res.json({
      message: "Employee wise productivity fetched successfully",
      processId: processId || "All",
      totalRecords: orderData.length,
      data: orderData, // order-wise
      productivity, // employee-wise
    });
  } catch (error) {
    console.error("Error fetching productivity:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
};

// controllers/cycleTimeController.js
// const cycleTimeComparisionData = async (req, res) => {
//   try {
//     let { startDate, endDate, partId } = req.query;
//     const today = new Date().toISOString().split("T")[0];
//     if (!startDate) startDate = today;
//     if (!endDate) endDate = today;

//     const start = new Date(startDate);
//     const end = new Date(endDate);

//     if (isNaN(start.getTime()) || isNaN(end.getTime())) {
//       return res.status(400).json({
//         error: "Invalid date format. Use YYYY-MM-DD",
//       });
//     }

//     const productionResponses = await prisma.productionResponse.findMany({
//       where: {
//         partId: partId,
//         isDeleted: false,
//         cycleTimeStart: { gte: start },
//         cycleTimeEnd: { lte: end },
//       },
//       include: {
//         process: { select: { processName: true } },
//         PartNumber: { select: { cycleTime: true } },
//       },
//     });
//     console.log(
//       "productionResponsesproductionResponses",
//       productionResponses.id
//     );

//     const getSteps = await prisma.productionStepTracking.findMany({
//       where: {
//         productionResponseId: productionResponses.id,
//       },
//       select: {
//         productId: true,
//         stepStartTime: true,
//         stepEndTime: true,
//       },
//     });
//     console.log("getStepsgetSteps", getSteps);

//     const manualData = productionResponses.map((resp) => {
//       let manualCT = null;
//       if (resp.cycleTimeStart && resp.cycleTimeEnd) {
//         manualCT =
//           (new Date(resp.cycleTimeEnd) - new Date(resp.cycleTimeStart)) /
//           1000 /
//           60; // minutes
//       }
//       return {
//         processId: resp.processId,
//         processName: resp.process?.processName,
//         manualCT,
//         idealCT: resp.PartNumber?.cycleTime
//           ? parseFloat(resp.PartNumber.cycleTime) / 60
//           : null,
//       };
//     });

//     // Group by processId
//     const grouped = {};
//     manualData.forEach((item) => {
//       if (!grouped[item.processId]) {
//         grouped[item.processId] = {
//           processName: item.processName,
//           manualCTs: [],
//           idealCT: item.idealCT,
//         };
//       }
//       if (item.manualCT !== null) {
//         grouped[item.processId].manualCTs.push(item.manualCT);
//       }
//     });

//     // Average manual CT per process
//     const result = Object.values(grouped).map((proc) => ({
//       processName: proc.processName,
//       manualCT:
//         proc.manualCTs.length > 0
//           ? proc.manualCTs.reduce((a, b) => a + b, 0) / proc.manualCTs.length
//           : 0,
//       idealCT: proc.idealCT || 0,
//     }));

//     res.json({
//       message: "Cycle Time Comparison retrieved successfully!",
//       data: result,
//     });
//   } catch (error) {
//     console.error("Error fetching cycle time comparison:", error);
//     res.status(500).json({
//       error: "Internal Server Error",
//       details: error.message,
//     });
//   }
// };

// const cycleTimeComparisionData = async (req, res) => {
//   try {
//     let { startDate, endDate, partId } = req.query;
//     const today = new Date().toISOString().split("T")[0];
//     if (!startDate) startDate = today;
//     if (!endDate) endDate = today;

//     const start = new Date(startDate);
//     const end = new Date(endDate);

//     if (isNaN(start.getTime()) || isNaN(end.getTime())) {
//       return res.status(400).json({
//         error: "Invalid date format. Use YYYY-MM-DD",
//       });
//     }
//     console.log("1111", partId);

//     // 🔹 1. Get all production responses for this part
//     const productionResponses = await prisma.productionResponse.findMany({
//       where: {
//         partId: partId,
//         isDeleted: false,
//       },
//       include: {
//         process: { select: { processName: true } },
//         PartNumber: { select: { cycleTime: true } },
//       },
//     });
//     console.log("productionResponsesproductionResponses", productionResponses);

//     if (!productionResponses.length) {
//       return res.json({
//         message: "No production responses found for this part/date range",
//         data: [],
//       });
//     }

//     // 🔹 2. Collect all productionResponseIds
//     const responseIds = productionResponses.map((resp) => resp.id);
//     console.log("responseIdsresponseIds", responseIds);

//     // 🔹 3. Get all step tracking for these responses
//     // const stepTrackings = await prisma.productionStepTracking.findMany({
//     //   where: {
//     //     productionResponseId: { in: responseIds },
//     //   },
//     //   select: {
//     //     id: true,
//     //     productionResponseId: true,
//     //     stepStartTime: true,
//     //     stepEndTime: true,
//     //     workInstructionStepId: true,
//     //     workInstructionStep: {
//     //       select: {
//     //         id: true,
//     //         title: true,
//     //         stepNumber: true,
//     //       },
//     //     },
//     //   },
//     // });

//     // console.log("stepTrackingsstepTrackings", stepTrackings);

//     // 🔹 4. Calculate step cycle time
//     const stepsData = stepTrackings.map((st) => {
//       console.log("stst111", st);

//       let stepTime = null;
//       if (st.stepStartTime && st.stepEndTime) {
//         stepTime =
//           (new Date(st.stepEndTime) - new Date(st.stepStartTime)) / 1000 / 60; // minutes
//       }
//       return {
//         stepId: st.WorkInstructionSteps?.id,
//         stepNumber: st.WorkInstructionSteps?.stepNumber,
//         stepTitle: st.WorkInstructionSteps?.title,
//         stepTime,
//       };
//     });

//     // 🔹 5. Prepare manual vs ideal CT comparison (existing logic)
//     const manualData = productionResponses.map((resp) => {
//       let manualCT = null;
//       if (resp.cycleTimeStart && resp.cycleTimeEnd) {
//         manualCT =
//           (new Date(resp.cycleTimeEnd) - new Date(resp.cycleTimeStart)) /
//           1000 /
//           60; // minutes
//       }
//       return {
//         processId: resp.processId,
//         processName: resp.process?.processName,
//         manualCT,
//         idealCT: resp.PartNumber?.cycleTime
//           ? parseFloat(resp.PartNumber.cycleTime) / 60
//           : null,
//       };
//     });

//     // 🔹 6. Group per process
//     const grouped = {};
//     manualData.forEach((item) => {
//       if (!grouped[item.processId]) {
//         grouped[item.processId] = {
//           processName: item.processName,
//           manualCTs: [],
//           idealCT: item.idealCT,
//         };
//       }
//       if (item.manualCT !== null) {
//         grouped[item.processId].manualCTs.push(item.manualCT);
//       }
//     });

//     const result = Object.values(grouped).map((proc) => ({
//       processName: proc.processName,
//       manualCT:
//         proc.manualCTs.length > 0
//           ? proc.manualCTs.reduce((a, b) => a + b, 0) / proc.manualCTs.length
//           : 0,
//       idealCT: proc.idealCT || 0,
//     }));
//     // 1️⃣ Get all production responses for this part

//     const productionResponseIds = productionResponses.map((p) => p.id);

//     // 2️⃣ Get all step tracking for these production responses
//     const stepTrackings = await prisma.productionStepTracking.findMany({
//       where: {
//         productionResponseId: { in: productionResponseIds },
//         stepStartTime: { not: null },
//         stepEndTime: { not: null },
//       },
//       include: {
//         WorkInstructionSteps: {
//           select: {
//             id: true,
//             stepNumber: true,
//             title: true,
//           },
//         },
//       },
//     });

//     if (!stepTrackings.length) {
//       return res.json({ message: "No step tracking found for this part", data: [] });
//     }

//     // 3️⃣ Calculate step durations in minutes
//     const stepDurations = stepTrackings.map((st) => {
//       const duration =
//         (new Date(st.stepEndTime) - new Date(st.stepStartTime)) / 1000 / 60; // minutes
//       return {
//         stepId: st.WorkInstructionSteps?.id,
//         stepNumber: st.WorkInstructionSteps?.stepNumber,
//         stepTitle: st.WorkInstructionSteps?.title,
//         duration,
//       };
//     });

//     // 4️⃣ Group by stepId to calculate average per step
//     const stepGrouped = {};
//     stepDurations.forEach((sd) => {
//       if (!stepGrouped[sd.stepId]) {
//         stepGrouped[sd.stepId] = { stepTitle: sd.stepTitle, durations: [] };
//       }
//       stepGrouped[sd.stepId].durations.push(sd.duration);
//     });

//     const stepAverages = Object.keys(stepGrouped).map((stepId) => {
//       const durations = stepGrouped[stepId].durations;
//       const avgDuration =
//         durations.reduce((a, b) => a + b, 0) / durations.length;
//     res.json({
//       message: "Cycle Time Comparison retrieved successfully!",
//       data: {
//         processWiseCT: result,
//         stepWiseCT: stepsData,
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching cycle time comparison:", error);
//     res.status(500).json({
//       error: "Internal Server Error",
//       details: error.message,
//     });
//   }
// };
const cycleTimeComparisionData = async (req, res) => {
  try {
    let { startDate, endDate, partId } = req.query;
    const today = new Date().toISOString().split("T")[0];
    if (!startDate) startDate = today;
    if (!endDate) endDate = today;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        error: "Invalid date format. Use YYYY-MM-DD",
      });
    }
    console.log("partIdpartId", partId);

    // =============================
    // 1️⃣ Existing process-wise cycle time
    // =============================
    const productionResponses = await prisma.productionResponse.findMany({
      where: {
        partId: partId,
        isDeleted: false,
      },
      include: {
        process: { select: { processName: true } },
        PartNumber: { select: { cycleTime: true } },
      },
    });
    console.log("productionResponsesproductionResponses", productionResponses);

    const manualData = productionResponses.map((resp) => {
      let manualCT = null;
      if (resp.cycleTimeStart && resp.cycleTimeEnd) {
        manualCT =
          (new Date(resp.cycleTimeEnd) - new Date(resp.cycleTimeStart)) /
          1000 /
          60; // minutes
      }
      return {
        processId: resp.processId,
        processName: resp.process?.processName,
        manualCT,
        idealCT: resp.PartNumber?.cycleTime
          ? parseFloat(resp.PartNumber.cycleTime) / 60
          : null,
      };
    });

    // Group by processId
    const grouped = {};
    manualData.forEach((item) => {
      if (!grouped[item.processId]) {
        grouped[item.processId] = {
          processName: item.processName,
          manualCTs: [],
          idealCT: item.idealCT,
        };
      }
      if (item.manualCT !== null) {
        grouped[item.processId].manualCTs.push(item.manualCT);
      }
    });

    // Average manual CT per process
    const processWiseCT = Object.values(grouped).map((proc) => ({
      processName: proc.processName,
      manualCT:
        proc.manualCTs.length > 0
          ? proc.manualCTs.reduce((a, b) => a + b, 0) / proc.manualCTs.length
          : 0,
      idealCT: proc.idealCT || 0,
    }));

    // =============================
    // 2️⃣ Step-wise average time for selected part
    // =============================
    const productionResponseIds = productionResponses.map((p) => p.id);

    const stepTrackings = await prisma.productionStepTracking.findMany({
      where: {
        productionResponseId: { in: productionResponseIds },
        stepStartTime: { not: null },
        stepEndTime: { not: null },
      },
      include: {
        workInstructionStep: {
          select: {
            id: true,
            stepNumber: true,
            title: true,
          },
        },
      },
    });
    console.log("stepTrackingsstepTrackings", stepTrackings);
    const stepDurations = stepTrackings.map((st) => ({
      stepId: st.workInstructionStep?.id,
      stepNumber: st.workInstructionStep?.stepNumber,
      stepTitle: st.workInstructionStep?.title,
      duration:
        (new Date(st.stepEndTime).getTime() -
          new Date(st.stepStartTime).getTime()) /
        1000 /
        60, // duration in minutes
    }));

    const stepGrouped = {};
    stepDurations.forEach((sd) => {
      if (!stepGrouped[sd.stepId]) {
        stepGrouped[sd.stepId] = {
          stepTitle: sd.stepTitle,
          stepNumber: sd.stepNumber,
          durations: [],
        };
      }
      stepGrouped[sd.stepId].durations.push(sd.duration);
    });

    const stepAverages = Object.keys(stepGrouped).map((stepId) => {
      const durations = stepGrouped[stepId].durations;

      const avgDuration =
        durations.reduce((a, b) => a + b, 0) / durations.length;

      return {
        stepId,
        stepTitle: stepGrouped[stepId].stepTitle,
        stepNumber: stepGrouped[stepId].stepNumber,
        averageDuration: avgDuration,
        count: durations.length,
      };
    });

    const allDurations = stepDurations.map((s) => s.duration);
    const overallAverage =
      allDurations.length > 0
        ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length
        : 0;

    res.json({
      message: "Cycle Time Comparison & Step Averages retrieved successfully!",
      data: {
        processWiseCT,
        stepWiseCT: {
          stepAverages,
          overallAverage,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching cycle time comparison:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
};

// ordersController.js

// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();

// const getOrderStatus = async (req, res) => {
//   try {
//     const { month, year } = req.query; // Get month and year from query parameters

//     let whereClause = {
//       isDeleted: false,
//     };

//     // Add date filtering if month and year are provided
//     if (month && year) {
//       const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
//       const endOfMonth = new Date(parseInt(year), parseInt(month), 0); // Last day of the month

//       whereClause.order_date = {
//         gte: startOfMonth, // Greater than or equal to the first day of the month
//         lte: endOfMonth,   // Less than or equal to the last day of the month
//       };
//     } else if (year) { // If only year is provided, filter for the whole year
//         const startOfYear = new Date(parseInt(year), 0, 1);
//         const endOfYear = new Date(parseInt(year), 11, 31, 23, 59, 59); // End of the last day of the year

//         whereClause.order_date = {
//             gte: startOfYear,
//             lte: endOfYear,
//         };
//     }

//     const orders = await prisma.StockOrderSchedule.findMany({
//       where: whereClause,
//       select: {
//         order_id: true,
//         order_date: true,
//         status: true,
//         // Assuming 'completedByEmployee' is the relevant employee for status display
//         completedByEmployee: {
//           select: {
//             fullName: true,
//             email: true, // Assuming employee model has an email field
//           },
//         },
//         // To get the total, we need to access parts. This assumes a relationship
//         // between StockOrderSchedule and PartNumber that allows summing costs.
//         // If an order can have multiple parts, you'd need a linking table or
//         // to retrieve all parts for a given order_id separately and sum their costs.
//         // For simplicity, let's assume `part_id` and `part.cost` directly relates to the schedule entry.
//         // A more robust solution might involve querying StockOrder or CustomOrder and then their associated parts.
//         PartNumber: { // This relation seems to exist in StockOrderSchedule model
//             select: {
//                 cost: true,
//             }
//         },
//         // We need country. If not in StockOrderSchedule, you might need to link to StockOrder/CustomOrder
//         // and then to a customer/supplier model that has country info.
//         // For now, let's assume a placeholder or add a 'country' field to StockOrderSchedule if appropriate.
//         // For the sake of this example, I'll add a mock country.
//       },
//       orderBy: {
//         order_date: 'desc', // Order by date, latest first
//       }
//     });

//     const formattedOrders = orders.map(order => {
//         // Calculate total. This assumes PartNumber.cost is directly related to the scheduled item.
//         // If an order can have multiple scheduled parts with different quantities,
//         // you'll need a more complex calculation (e.g., from StockOrder -> OrderParts -> PartNumber).
//         const total = order.PartNumber?.cost ? parseFloat(order.PartNumber.cost) : 0; // Assuming cost is a string/decimal in DB

//         // Mock country data as it's not in your schema
//         const mockCountries = ["USA", "Canada", "UK", "Germany", "France", "Japan"];
//         const country = mockCountries[Math.floor(Math.random() * mockCountries.length)];

//       return {
//         process: order.order_id,
//         employee: order.completedByEmployee?.fullName || 'N/A',
//         email: order.completedByEmployee?.email || 'N/A',
//         date: order.order_date.toISOString().split('T')[0], // Format date as YYYY-MM-DD
//         status: order.status,
//         country: country, // Placeholder, needs actual data
//         total: `$${total.toFixed(2)}`,
//       };
//     });

//     res.status(200).json(formattedOrders);

//   } catch (error) {
//     console.error("Error fetching order status:", error);
//     res.status(500).json({
//       error: "Internal Server Error",
//       details: error.message,
//     });
//   }
// };

// export default getOrderStatus;

// const dashBoardData = async (req, res) => {
//   try {
//     const { month } = req.query;

//     let whereClause = { isDeleted: false };

//     if (month) {
//       const monthNum = parseInt(month);
//       const now = new Date();
//       const year = now.getFullYear();

//       const startOfMonth = new Date(year, monthNum - 1, 1, 0, 0, 0);
//       const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59);

//       whereClause.order_date = {
//         gte: startOfMonth,
//         lte: endOfMonth,
//       };
//     }
//     const currentMonthStart = startOfMonth(new Date());
//     const currentMonthEnd = endOfMonth(new Date());

//     const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
//     const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));

//     // 3️⃣ Helper function to filter orders by month
//     const filterOrdersByMonth = (orders, start, end) =>
//       orders.filter((order) => {
//         const orderDate = new Date(order.orderDate);
//         return orderDate >= start && orderDate <= end;
//       });

//     // 4️⃣ Filter orders
//     const currentStockOrders = filterOrdersByMonth(
//       stockOrder,
//       currentMonthStart,
//       currentMonthEnd
//     );
//     const currentCustomOrders = filterOrdersByMonth(
//       customOrder,
//       currentMonthStart,
//       currentMonthEnd
//     );

//     const lastStockOrders = filterOrdersByMonth(
//       stockOrder,
//       lastMonthStart,
//       lastMonthEnd
//     );
//     const lastCustomOrders = filterOrdersByMonth(
//       customOrder,
//       lastMonthStart,
//       lastMonthEnd
//     );

//     const calculatePercentageChange = (current, previous) => {
//       if (previous === 0) return current > 0 ? 100 : 0;
//       return ((current - previous) / previous) * 100;
//     };

//     const stockOrder = await prisma.stockOrder.findMany({ where: whereClause });
//     const customOrder = await prisma.customOrder.findMany({
//       where: whereClause,
//     });
//     const totalOrders = stockOrder.length + customOrder.length;
//     Z;

//     // 6️⃣ Total orders
//     // const totalOrders = currentStockOrders.length + currentCustomOrders.length;

//     // 7️⃣ Revenue % change & dot indicator
//     let revenueChangePercent = 0;
//     let revenueIndicator = "gray"; // default if lastRevenue = 0

//     if (lastRevenue > 0) {
//       revenueChangePercent =
//         ((currentRevenue - lastRevenue) / lastRevenue) * 100;
//       revenueIndicator = revenueChangePercent >= 0 ? "green" : "red";
//     }

//     const currentOrders = await prisma.stockOrderSchedule.count({
//       where: whereClause,
//     });
//     const currentSuppliers = await prisma.supplier_orders.count({
//       where: {
//         isDeleted: false,
//         ...(whereClause.order_date && { createdAt: whereClause.order_date }),
//       },
//     });
//     const currentProduction = await prisma.productionResponse.count({
//       where: {
//         isDeleted: false,
//         ...(whereClause.order_date && { createdAt: whereClause.order_date }),
//       },
//     });
//     const currentScrapOrders = await prisma.stockOrderSchedule.count({
//       where: { ...whereClause, scrapQuantity: { gt: 0 } },
//     });
//     let previousWhereClause = { isDeleted: false };
//     if (month) {
//       const monthNum = parseInt(month);
//       const now = new Date();
//       const year = now.getFullYear();

//       let prevMonth = monthNum - 1 === 0 ? 12 : monthNum - 1;
//       let prevYear = monthNum - 1 === 0 ? year - 1 : year;

//       const startOfPrevMonth = new Date(prevYear, prevMonth - 1, 1, 0, 0, 0);
//       const endOfPrevMonth = new Date(prevYear, prevMonth, 0, 23, 59, 59);

//       previousWhereClause.order_date = {
//         gte: startOfPrevMonth,
//         lte: endOfPrevMonth,
//       };
//     }

//     const previousOrders = await prisma.stockOrderSchedule.count({
//       where: previousWhereClause,
//     });
//     const previousSuppliers = await prisma.supplier_orders.count({
//       where: {
//         isDeleted: false,
//         ...(previousWhereClause.order_date && {
//           createdAt: previousWhereClause.order_date,
//         }),
//       },
//     });
//     const previousProduction = await prisma.productionResponse.count({
//       where: {
//         isDeleted: false,
//         ...(previousWhereClause.order_date && {
//           createdAt: previousWhereClause.order_date,
//         }),
//       },
//     });
//     const previousScrapOrders = await prisma.stockOrderSchedule.count({
//       where: { ...previousWhereClause, scrapQuantity: { gt: 0 } },
//     });

//     const orderSchedulePercentage = calculatePercentageChange(
//       currentOrders,
//       previousOrders
//     );
//     const totalSupplierPercentage = calculatePercentageChange(
//       currentSuppliers,
//       previousSuppliers
//     );
//     const totalProductionPercentage = calculatePercentageChange(
//       currentProduction,
//       previousProduction
//     );
//     const totalScrapOrderPercentage = calculatePercentageChange(
//       currentScrapOrders,
//       previousScrapOrders
//     );

//     const data = await prisma.supplier_orders.findMany({
//       where: { isDeleted: false },
//       select: {
//         supplier: { select: { firstName: true, lastName: true } },
//         email: true,
//         part: { select: { partNumber: true, cost: true } },
//       },
//     });

//     const supplierMap = {};
//     data.forEach((item) => {
//       const supplierName = `${item.supplier.firstName} ${item.supplier.lastName}`;
//       if (!supplierMap[supplierName]) {
//         supplierMap[supplierName] = {
//           supplierName,
//           email: item.email,
//           products: [],
//           total: 0,
//         };
//       }
//       supplierMap[supplierName].products.push(item.part.partNumber);
//       supplierMap[supplierName].total += Number(item.part.cost);
//     });

//     let suppliers = Object.values(supplierMap)
//       .sort((a, b) => b.total - a.total)
//       .map((s, index) => ({
//         supplierName: s.supplierName,
//         email: s.email,
//         product: s.products.join(", "),
//         total: `$${s.total.toFixed(2)}`,
//         rank: index + 1,
//       }));

//     const topPerformers = await prisma.employee.findMany({
//       where: { isDeleted: false },
//       include: { completedSchedules: true },
//     });

//     const topPerformersSorted = topPerformers
//       .map((emp) => ({
//         id: emp.id,
//         fullName: emp.fullName,
//         completedCount: emp.completedSchedules.length,
//       }))
//       .sort((a, b) => b.completedCount - a.completedCount)
//       .slice(0, 5);

//     const newlyAddedEmployees = await prisma.employee.findMany({
//       where: { isDeleted: false },
//       orderBy: { createdAt: "desc" },
//       take: 5,
//       select: { id: true, fullName: true, email: true },
//     });

//     const orders = await prisma.stockOrderSchedule.findMany({
//       where: whereClause,
//       select: {
//         order_id: true,
//         order_date: true,
//         status: true,
//         scheduleQuantity: true,
//         completedQuantity: true,
//         scrapQuantity: true,
//         completedByEmployee: { select: { fullName: true, email: true } },
//         part: {
//           select: {
//             partNumber: true,
//             cost: true,
//           },
//         },
//         process: { select: { processName: true, ratePerHour: true } },
//       },
//       orderBy: { order_date: "desc" },
//     });

//     const productivityData = orders.map((order) => {
//       const cycleTime = order.process?.cycleTime
//         ? parseFloat(order.process.cycleTime)
//         : 0;
//       console.log("orderorderord111111er", order);

//       console.log("ordeorder.scheduleQuantityrorder", order.scheduleQuantity);
//       console.log("ordeorder.scrapQuantity", order.scrapQuantity);

//       const qty = order.scheduleQuantity || 0; // total assigned qty
//       const scrap = order.scrapQuantity || 0; // scrap made by employee
//       const completedQty = qty - scrap; // completed by employee
//       console.log("qtyqty", qty);

//       // Productivity %
//       const productivity =
//         qty > 0 ? ((completedQty / qty) * 100).toFixed(2) : "0.00";

//       // Efficiency %
//       const totalTime = qty * cycleTime; // standard time
//       const actualTime = completedQty * cycleTime; // actual work done by employee
//       const efficiency =
//         totalTime > 0 ? ((actualTime / totalTime) * 100).toFixed(2) : "0.00";

//       return {
//         process: order.process.processName,
//         employee: order.completedByEmployee?.fullName || "N/A",
//         cycleTime,
//         totalQty: qty,
//         scrap,
//         completedQty,
//         productivity: `${productivity}%`,
//         efficiency: `${efficiency}%`,
//       };
//     });

//     res.status(200).json({
//       orderSchedule: {
//         count: currentOrders,
//         percentageChange: orderSchedulePercentage,
//       },
//       totalSupplier: {
//         count: currentSuppliers,
//         percentageChange: totalSupplierPercentage,
//       },
//       totalProduction: {
//         count: currentProduction,
//         percentageChange: totalProductionPercentage,
//       },
//       totalScrapOrder: {
//         count: currentScrapOrders,
//         percentageChange: totalScrapOrderPercentage,
//       },
//       suppliers,
//       topPerformersSorted,
//       newlyAddedEmployees,
//       productivityData,
//       totalOrders,
//       currentRevenue,
//       lastRevenue,
//       revenueChangePercent: revenueChangePercent.toFixed(2),
//       revenueIndicator,
//     });
//   } catch (error) {
//     console.log("Error:", error);
//     res
//       .status(500)
//       .json({ error: "Internal Server Error", details: error.message });
//   }
// };
const dashBoardData = async (req, res) => {
  try {
    const { month } = req.query;
    let whereClause = { isDeleted: false };
    if (month) {
      const monthNum = parseInt(month);
      const now = new Date();
      const year = now.getFullYear();
      const startOfMonthDate = new Date(year, monthNum - 1, 1, 0, 0, 0);
      const endOfMonthDate = new Date(year, monthNum, 0, 23, 59, 59);
      whereClause.order_date = {
        gte: startOfMonthDate,
        lte: endOfMonthDate,
      };
    }

    // Helper: percentage change
    const calculatePercentageChange = (current, previous) => {
      if (!previous || previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    // Fetch orders (stock & custom) for revenue computations
    const stockOrder = await prisma.stockOrder.findMany({
      where: { isDeleted: false },
    });
    const customOrder = await prisma.customOrder.findMany({
      where: { isDeleted: false },
    });

    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());
    const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
    const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));

    const filterOrdersByMonth = (orders, start, end) =>
      orders.filter((order) => {
        const orderDate = new Date(order.orderDate);
        return orderDate >= start && orderDate <= end;
      });

    const currentStockOrders = filterOrdersByMonth(
      stockOrder,
      currentMonthStart,
      currentMonthEnd
    );
    const currentCustomOrders = filterOrdersByMonth(
      customOrder,
      currentMonthStart,
      currentMonthEnd
    );
    const lastStockOrders = filterOrdersByMonth(
      stockOrder,
      lastMonthStart,
      lastMonthEnd
    );
    const lastCustomOrders = filterOrdersByMonth(
      customOrder,
      lastMonthStart,
      lastMonthEnd
    );

    const stockOrderRevenue = currentStockOrders.reduce(
      (sum, order) =>
        sum + (parseFloat(order.cost) || 0) * (order.productQuantity || 0),
      0
    );

    const customOrderRevenue = currentCustomOrders.reduce(
      (sum, order) =>
        sum + (parseFloat(order.cost) || 0) * (order.productQuantity || 0),
      0
    );

    const currentRevenue = stockOrderRevenue + customOrderRevenue;

    const lastStockRevenue = lastStockOrders.reduce(
      (sum, order) =>
        sum + (parseFloat(order.cost) || 0) * (order.productQuantity || 0),
      0
    );
    const lastCustomRevenue = lastCustomOrders.reduce(
      (sum, order) =>
        sum + (parseFloat(order.cost) || 0) * (order.productQuantity || 0),
      0
    );
    const lastRevenue = lastStockRevenue + lastCustomRevenue;
    const totalOrders = currentStockOrders.length + currentCustomOrders.length;

    let revenueChangePercent = 0;
    let revenueIndicator = "gray";

    if (lastRevenue === 0) {
      if (currentRevenue > 0) {
        revenueChangePercent = 100;
        revenueIndicator = "green";
      } else if (currentRevenue < 0) {
        revenueChangePercent = -100;
        revenueIndicator = "red";
      } else {
        revenueChangePercent = 0;
        revenueIndicator = "gray";
      }
    } else {
      revenueChangePercent =
        ((currentRevenue - lastRevenue) / lastRevenue) * 100;
      revenueIndicator = revenueChangePercent >= 0 ? "green" : "red";
    }

    // Supplier mapping (kept same)
    const data = await prisma.supplier_orders.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" },
      include: {
        supplier: { select: { firstName: true, lastName: true } },
        part: { select: { partNumber: true, cost: true } },
      },
    });

    const supplierMap = {};
    data.forEach((item) => {
      const supplierName = `${item?.supplier?.firstName || ""} ${
        item?.supplier?.lastName || ""
      }`.trim();
      if (!supplierMap[supplierName]) {
        supplierMap[supplierName] = {
          supplierName,
          email: item.email,
          products: [],
          total: 0,
        };
      }
      if (item.part?.partNumber)
        supplierMap[supplierName].products.push(item.part.partNumber);
      supplierMap[supplierName].total += Number(item.part?.cost || 0);
    });

    let suppliers = Object.values(supplierMap)
      .sort((a, b) => b.total - a.total)
      .map((s, index) => ({
        supplierName: s.supplierName,
        email: s.email,
        product: s.products.join(", "),
        total: `$${s.total.toFixed(2)}`,
        rank: index + 1,
      }));

    // Productivity / orders (kept mostly same)
    const orders = await prisma.stockOrderSchedule.findMany({
      where: whereClause,
      select: {
        order_id: true,
        order_date: true,
        status: true,
        scheduleQuantity: true,
        completedQuantity: true,
        scrapQuantity: true,
        completedByEmployee: { select: { fullName: true, email: true } },
        part: { select: { partNumber: true, cost: true } },
        process: {
          select: { processName: true, ratePerHour: true, cycleTime: true },
        },
      },
      orderBy: { order_date: "desc" },
    });

    const productivityData = orders.map((order) => {
      const cycleTime = order.process?.cycleTime
        ? parseFloat(order.process.cycleTime)
        : 0;
      const qty = order.scheduleQuantity || 0;
      const scrap = order.scrapQuantity || 0;
      const completedQty = order.completedQuantity ?? 0;
      const productivity =
        qty > 0 ? ((completedQty / qty) * 100).toFixed(2) : "0.00";
      const totalTime = qty * cycleTime;
      const actualTime = completedQty * cycleTime;
      const efficiency =
        totalTime > 0 ? ((actualTime / totalTime) * 100).toFixed(2) : "0.00";

      return {
        process: order.process?.processName || "N/A",
        employee: order.completedByEmployee?.fullName || "N/A",
        cycleTime,
        totalQty: qty,
        scrap,
        completedQty,
        productivity: `${productivity}%`,
        efficiency: `${efficiency}%`,
      };
    });

    // === Inventory calculation using CLIENT formula ===
    // inventoryCost = (availableStock - minStock) × (partCost + cycleTime_hours × ratePerHour)
    const parts = await prisma.partNumber.findMany({
      where: { isDeleted: false },
      include: { process: { select: { ratePerHour: true } } },
    });

    let totalInventoryCost = 0;
    let totalInventoryCount = 0;

    parts.forEach((part) => {
      const availableStock = Number(part.availStock || 0);
      const minStock = Number(part.minStock || 0);

      const extraStock = availableStock - minStock;

      // ignore shortage & zero stock
      if (extraStock <= 0) return;

      const partCost = Number(part.cost || 0);

      // cycleTime assumed in MINUTES → convert to HOURS
      const cycleTime = Number(part.cycleTime || 0) / 60;

      const ratePerHour = Number(part.process?.ratePerHour || 0);

      const costPerUnit = partCost + cycleTime * ratePerHour;

      const inventoryCost = extraStock * costPerUnit;

      totalInventoryCount += extraStock;
      totalInventoryCost += inventoryCost;
    });

    // For previous month we don't have real snapshot -> keep dummy or replace with real logic if available
    // (if you have historical inventory table, replace this)
    const lastInventoryCost = totalInventoryCost * 0.8;
    const lastInventoryCount = Math.round(totalInventoryCount * 0.8);

    const inventoryChangePercent = calculatePercentageChange(
      totalInventoryCost,
      lastInventoryCost
    );
    const inventoryIndicator = inventoryChangePercent >= 0 ? "green" : "red";

    // === Production totals (unchanged) ===
    const currentMonthProductionData = await prisma.stockOrderSchedule.findMany(
      {
        where: {
          isDeleted: false,
          order_date: { gte: currentMonthStart, lte: currentMonthEnd },
        },
        select: { completedQuantity: true, scrapQuantity: true },
      }
    );

    const currentProductionTotal = currentMonthProductionData.reduce(
      (sum, p) => {
        const completed = p.completedQuantity || 0;
        const scrap = p.scrapQuantity || 0;
        return sum + (completed - scrap);
      },
      0
    );

    const lastMonthProductionData = await prisma.stockOrderSchedule.findMany({
      where: {
        isDeleted: false,
        order_date: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      select: { completedQuantity: true, scrapQuantity: true },
    });

    const lastProductionTotal = lastMonthProductionData.reduce((sum, p) => {
      const completed = p.completedQuantity || 0;
      const scrap = p.scrapQuantity || 0;
      return sum + (completed - scrap);
    }, 0);

    const productionChangePercent = calculatePercentageChange(
      currentProductionTotal,
      lastProductionTotal
    );
    const productionIndicator = productionChangePercent >= 0 ? "green" : "red";

    // === Scrap calculations (unchanged) ===
    const currentMonthScrapData = await prisma.stockOrderSchedule.findMany({
      where: {
        isDeleted: false,
        order_date: { gte: currentMonthStart, lte: currentMonthEnd },
      },
      select: { scrapQuantity: true, part: { select: { cost: true } } },
    });

    let currentScrapQty = 0;
    let currentScrapCost = 0;
    currentMonthScrapData.forEach((item) => {
      const scrap = item.scrapQuantity || 0;
      const cost = parseFloat(item.part?.cost) || 0;
      currentScrapQty += scrap;
      currentScrapCost += scrap * cost;
    });

    const lastMonthScrapData = await prisma.stockOrderSchedule.findMany({
      where: {
        isDeleted: false,
        order_date: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      select: { scrapQuantity: true, part: { select: { cost: true } } },
    });

    let lastScrapQty = 0;
    let lastScrapCost = 0;
    lastMonthScrapData.forEach((item) => {
      const scrap = item.scrapQuantity || 0;
      const cost = parseFloat(item.part?.cost) || 0;
      lastScrapQty += scrap;
      lastScrapCost += scrap * cost;
    });

    const scrapChangePercent = calculatePercentageChange(
      currentScrapQty,
      lastScrapQty
    );
    const scrapIndicator = currentScrapQty <= lastScrapQty ? "red" : "green";

    // === Open / Fulfilled orders (kept same) ===
    const openStockOrders = await prisma.stockOrder.findMany({
      where: { isDeleted: false, NOT: { status: "scheduled" } },
      select: {
        orderDate: true,
        orderNumber: true,
        customerName: true,
        customerEmail: true,
        productNumber: true,
        productQuantity: true,
      },
    });

    const openCustomOrders = await prisma.customOrder.findMany({
      where: { isDeleted: false, status: "scheduled" },
      select: {
        orderDate: true,
        orderNumber: true,
        customerName: true,
        customerEmail: true,
        partNumber: true,
        productQuantity: true,
      },
    });

    const openOrders = [...openStockOrders, ...openCustomOrders].map((o) => ({
      date: o.orderDate,
      order: o.orderNumber,
      firstName: o.customerName?.split(" ")[0] || "",
      lastName: o.customerName?.split(" ")[1] || "",
      product: o.partNumber,
      qty: o.productQuantity,
    }));

    const totalOpenQty = openOrders.reduce((sum, o) => sum + (o.qty || 0), 0);

    const fulfilledOrdersData = await prisma.stockOrderSchedule.findMany({
      where: { isDeleted: false, status: "completed" },
      include: {
        StockOrder: { select: { orderNumber: true } },
        CustomOrder: { select: { orderNumber: true } },
        part: { select: { partNumber: true } },
        completedByEmployee: { select: { fullName: true } },
      },
    });

    const fulfilledOrders = fulfilledOrdersData.map((o) => {
      const nameParts = o.completedByEmployee?.fullName?.split(" ") || [];
      const type = o.order_type ? o.order_type.toLowerCase() : "";

      return {
        date: o.order_date,
        order:
          type === "StockOrder"
            ? o.StockOrder?.orderNumber
            : o.CustomOrder?.orderNumber || o.order_id,
        firstName: nameParts[0] || "",
        lastName: nameParts[1] || "",
        product: o.part?.partNumber || "",
        qty: o.completedQuantity ?? 0,
      };
    });

    const totalFulfilledQty = fulfilledOrders.reduce(
      (sum, o) => sum + (o.qty || 0),
      0
    );

    // === Final response ===
    res.status(200).json({
      suppliers,
      productivityData,
      totalOrders,
      currentRevenue,
      lastRevenue,
      revenueChangePercent: revenueChangePercent.toFixed(2),
      revenueIndicator,
      inventory: {
        totalInventoryCount,
        totalInventoryCost: totalInventoryCost.toFixed(2),
        lastInventoryCost: lastInventoryCost.toFixed(2),
        inventoryChangePercent: inventoryChangePercent.toFixed(2),
        inventoryIndicator,
      },
      production: {
        currentProductionTotal: currentProductionTotal,
        lastProductionTotal: lastProductionTotal,
        productionChangePercent: productionChangePercent.toFixed(2),
        productionIndicator,
      },
      scrap: {
        currentScrapQty,
        currentScrapCost: currentScrapCost.toFixed(2),
        lastScrapQty,
        lastScrapCost: lastScrapCost.toFixed(2),
        scrapChangePercent: scrapChangePercent.toFixed(2),
        scrapIndicator,
      },
      openOrders: {
        list: openOrders,
        total: totalOpenQty,
      },
      fulfilledOrders: {
        list: fulfilledOrders,
        total: totalFulfilledQty,
      },
    });
  } catch (error) {
    console.log("Error********************:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};

const dailySchedule = async (req, res) => {
  try {
    const { date, process } = req.query; // get date & process from frontend

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    // Convert to start and end of day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Build dynamic where clause
    const whereClause = {
      isDeleted: false,
      createdAt: { gte: startOfDay, lte: endOfDay },
    };

    if (process) {
      whereClause.part = { processId: process };
    }

    // Fetch schedules
    const filteredSchedules = await prisma.stockOrderSchedule.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        part: {
          select: {
            partNumber: true,
            process: {
              select: {
                processName: true,
              },
            },
          },
        },
        completedByEmployee: { select: { firstName: true, lastName: true } },
      },
    });

    if (!filteredSchedules.length) {
      return res
        .status(200)
        .json({ message: "No scheduled orders found.", data: [] });
    }

    // Separate Stock and Custom Orders
    const stockOrderIds = [];
    const customOrderIds = [];

    filteredSchedules.forEach((schedule) => {
      if (schedule.order_type === "StockOrder" && schedule.order_id)
        stockOrderIds.push(schedule.order_id);
      if (schedule.order_type === "CustomOrder" && schedule.order_id)
        customOrderIds.push(schedule.order_id);
    });

    const [stockOrders, customOrders] = await Promise.all([
      stockOrderIds.length
        ? prisma.stockOrder.findMany({
            where: { id: { in: stockOrderIds } },
            include: { part: { select: { partNumber: true } } },
          })
        : [],
      customOrderIds.length
        ? prisma.customOrder.findMany({
            where: { id: { in: customOrderIds } },
            include: { product: { select: { partNumber: true } } },
          })
        : [],
    ]);

    const stockOrderMap = new Map(stockOrders.map((o) => [o.id, o]));
    const customOrderMap = new Map(customOrders.map((o) => [o.id, o]));

    const schedulesWithOrders = filteredSchedules.map((schedule) => {
      let orderData = null;
      if (schedule.order_type === "StockOrder")
        orderData = stockOrderMap.get(schedule.order_id) || null;
      if (schedule.order_type === "CustomOrder")
        orderData = customOrderMap.get(schedule.order_id) || null;
      return { ...schedule, order: orderData };
    });

    return res.status(200).json({
      message: "Scheduled orders retrieved successfully!",
      data: schedulesWithOrders,
    });
  } catch (error) {
    console.error("Error retrieving scheduled orders:", error);
    return res
      .status(500)
      .json({ message: "Something went wrong.", error: error.message });
  }
};
// const capacityStatus = async (req, res) => {
//   try {
//     // Get all processes
//     const getProcess = await prisma.process.findMany({});

//     // Get schedule data
//     let scheduleData = await prisma.stockOrderSchedule.findMany({
//       where: {
//         isDeleted: false,
//         NOT: {
//           status: "completed", // completed exclude kar diya
//         },
//       },
//       include: {
//         process: { select: { processName: true } },
//         part: { select: { partNumber: true, cycleTime: true } },
//         StockOrder: { select: { orderDate: true } },
//       },
//     });
//     console.log("scheduleDatascheduleData", scheduleData);

//     // Fetch ProductionResponse for each schedule item
//     const scheduleDataWithLoad = await Promise.all(
//       scheduleData.map(async (item) => {
//         // Get all production responses for this schedule
//         const productionResponses = await prisma.productionResponse.findMany({
//           where: {
//             orderId: item.stockOrderId || item.order_id,
//             partId: item.part_id,
//             processId: item.processId,
//             isDeleted: false,
//           },
//         });

//         // Calculate total cycle time (sum of all responses)
//         let totalCycleTime = 0;
//         productionResponses.forEach((prod) => {
//           const start = prod.cycleTimeStart
//             ? new Date(prod.cycleTimeStart)
//             : null;
//           const end = prod.cycleTimeEnd
//             ? new Date(prod.cycleTimeEnd)
//             : new Date();

//           if (start) {
//             const diffInMinutes = (end - start) / (1000 * 60);
//             totalCycleTime += diffInMinutes;
//           }
//         });

//         // Per part cycle time = totalCycleTime / totalCompletedQty
//         const completedQty = productionResponses.reduce(
//           (sum, p) => sum + (p.completedQuantity || 0),
//           0
//         );

//         const cycleTime = scheduleData;
//         console.log("cycleTimecycleTime", cycleTime);

//         const cycleTimePerPart =
//           completedQty > 0 ? totalCycleTime / completedQty : 0;

//         const scheduleQuantity = item.scheduleQuantity || 0;
//         const loadTime = cycleTimePerPart * scheduleQuantity;

//         return {
//           id: item.id,
//           process: item.process,
//           part: item.part,
//           cycleTimePerPart, // ⬅️ one part ka avg time
//           scheduleQuantity,
//           loadTime, // ⬅️ total load time (min)
//           order_date: item.StockOrder?.orderDate || item.order_date,
//         };
//       })
//     );

//     return res.status(200).json({
//       message: "All Process",
//       data: getProcess,
//       scheduleData: scheduleDataWithLoad,
//     });
//   } catch (error) {
//     console.log("Error in capacityStatus:", error);
//     return res.status(500).json({ message: "Server Error", error });
//   }
// };
// const capacityStatus = async (req, res) => {
//   try {
//     const getProcess = await prisma.process.findMany({});

//     let scheduleData = await prisma.stockOrderSchedule.findMany({
//       where: {
//         isDeleted: false,
//         NOT: {
//           status: "completed",
//         },
//       },
//       include: {
//         process: { select: { processName: true } },
//         part: { select: { partNumber: true, cycleTime: true } },
//         StockOrder: { select: { orderDate: true } },
//       },
//     });

//     const scheduleDataWithLoad = await Promise.all(
//       scheduleData.map(async (item) => {
//         const productionResponses = await prisma.productionResponse.findMany({
//           where: {
//             orderId: item.stockOrderId || item.order_id,
//             partId: item.part_id,
//             processId: item.processId,
//             isDeleted: false,
//           },
//         });

//         let totalCycleTime = 0;
//         productionResponses.forEach((prod) => {
//           const start = prod.cycleTimeStart
//             ? new Date(prod.cycleTimeStart)
//             : null;
//           const end = prod.cycleTimeEnd
//             ? new Date(prod.cycleTimeEnd)
//             : new Date();

//           if (start) {
//             const diffInMinutes = (end - start) / (1000 * 60);
//             totalCycleTime += diffInMinutes;
//           }
//         });

//         const completedQty = productionResponses.reduce(
//           (sum, p) => sum + (p.completedQuantity || 0),
//           0
//         );

//         const calculatedCycleTimePerPart =
//           completedQty > 0 ? totalCycleTime / completedQty : 0;

//         const cycleTimeFromPart = item.part?.cycleTime
//           ? parseFloat(item.part.cycleTime)
//           : 0;

//         const scheduleQuantity = item.scheduleQuantity || 0;
//         const status = item.status;

//         const loadTime = cycleTimeFromPart * scheduleQuantity;

//         return {
//           id: item.id,
//           process: item.process,
//           part: item.part,
//           cycleTimeFromPart,
//           calculatedCycleTimePerPart,
//           scheduleQuantity,
//           status,
//           loadTime,
//           order_date: item.StockOrder?.orderDate || item.order_date,
//         };
//       })
//     );

//     // 🔹 Aggregate data for BarChart
//     const barChartData = {};
//     scheduleDataWithLoad.forEach((item) => {
//       const processName = item.process?.processName || "Unknown";
//       if (!barChartData[processName]) {
//         barChartData[processName] = 0;
//       }
//       barChartData[processName] += item.loadTime; // total load per process
//     });

//     const barChartFormatted = {
//       labels: Object.keys(barChartData),
//       datasets: [
//         {
//           label: "Load Time (minutes)",
//           data: Object.values(barChartData),
//         },
//       ],
//     };

//     return res.status(200).json({
//       message: "Capacity Status Data",
//       data: getProcess,
//       scheduleData: scheduleDataWithLoad,
//       barChartData: barChartFormatted, // 👈 new field
//     });
//   } catch (error) {
//     console.log("Error in capacityStatus:", error);
//     return res.status(500).json({ message: "Server Error", error });
//   }
// };

const capacityStatus = async (req, res) => {
  try {
    const getProcess = await prisma.process.findMany({});

    let scheduleData = await prisma.stockOrderSchedule.findMany({
      where: {
        isDeleted: false,
        NOT: {
          status: "completed",
        },
      },
      include: {
        process: { select: { processName: true, id: true } },
        part: { select: { partNumber: true, cycleTime: true } },
        StockOrder: { select: { orderDate: true } },
      },
    });

    const scheduleDataWithLoad = await Promise.all(
      scheduleData.map(async (item) => {
        const productionResponses = await prisma.productionResponse.findMany({
          where: {
            orderId: item.stockOrderId || item.order_id,
            partId: item.part_id,
            processId: item.processId,
            isDeleted: false,
          },
        });

        let totalCycleTime = 0;
        productionResponses.forEach((prod) => {
          const start = prod.cycleTimeStart
            ? new Date(prod.cycleTimeStart)
            : null;
          const end = prod.cycleTimeEnd
            ? new Date(prod.cycleTimeEnd)
            : new Date();

          if (start) {
            const diffInMinutes = (end - start) / (1000 * 60);
            totalCycleTime += diffInMinutes;
          }
        });

        const completedQty = productionResponses.reduce(
          (sum, p) => sum + (p.completedQuantity || 0),
          0
        );

        const calculatedCycleTimePerPart =
          completedQty > 0 ? totalCycleTime / completedQty : 0;

        const cycleTimeFromPart = item.part?.cycleTime
          ? parseFloat(item.part.cycleTime)
          : 0;

        const scheduleQuantity = item.scheduleQuantity || 0;
        const status = item.status;
        const loadTime = cycleTimeFromPart * scheduleQuantity;

        return {
          id: item.id,
          processId: item.process?.id,
          process: item.process,
          part: item.part,
          cycleTimeFromPart,
          calculatedCycleTimePerPart,
          scheduleQuantity,
          completedQty,
          status,
          loadTime,
          order_date: item.StockOrder?.orderDate || item.order_date,
        };
      })
    );

    const barChartData = {};
    const processCompletion = {};

    scheduleDataWithLoad.forEach((item) => {
      const processName = item.process?.processName || "Unknown";

      if (!barChartData[processName]) {
        barChartData[processName] = 0;
      }
      barChartData[processName] += item.loadTime;

      if (!processCompletion[processName]) {
        processCompletion[processName] = { completed: 0, total: 0 };
      }
      processCompletion[processName].completed += item.completedQty;
      processCompletion[processName].total += item.scheduleQuantity;
    });

    const barChartFormatted = {
      labels: Object.keys(barChartData),
      datasets: [
        {
          label: "Load Time (minutes)",
          data: Object.values(barChartData),
        },
      ],
    };

    const processCompletionPercentage = Object.entries(processCompletion).map(
      ([processName, values]) => ({
        processName,
        completionPercentage:
          values.total > 0
            ? ((values.completed / values.total) * 100).toFixed(2)
            : "0.00",
        completed: values.completed,
        total: values.total,
      })
    );

    return res.status(200).json({
      message: "Capacity Status Data",
      data: getProcess,
      scheduleData: scheduleDataWithLoad,
      barChartData: barChartFormatted, // 👈 existing
      processCompletion: processCompletionPercentage, // 👈 new field add kiya
    });
  } catch (error) {
    console.log("Error in capacityStatus:", error);
    return res.status(500).json({ message: "Server Error", error });
  }
};
const productionEfficieny = async (req, res) => {
  try {
    const schedules = await prisma.stockOrderSchedule.findMany({
      where: { isDeleted: false },
      select: {
        scheduleQuantity: true,
        completedQuantity: true,
        scrapQuantity: true,
        remainingQty: true, // supplier return quantity
        part: { select: { cost: true } }, // part cost
        process: { select: { processName: true } },
      },
    });

    // Group by process
    const processMap = new Map();

    let totalCompleted = 0;
    let totalScheduled = 0;
    let totalScrapCost = 0;
    let totalSupplierReturnCost = 0;

    schedules.forEach((item) => {
      const processName = item.process?.processName || "Unknown";

      if (!processMap.has(processName)) {
        processMap.set(processName, {
          completed: 0,
          scheduled: 0,
          scrapCost: 0,
          supplierReturnCost: 0,
        });
      }

      const current = processMap.get(processName);

      const partCost = item.part?.cost || 0;
      const scrapCost = partCost * (item.scrapQuantity || 0);
      const supplierReturnCost = partCost * (item.scrapQuantity || 0);

      current.completed += item.completedQuantity || 0;
      current.scheduled += item.scheduleQuantity || 0;
      current.scrapCost += scrapCost;
      current.supplierReturnCost += supplierReturnCost;

      processMap.set(processName, current);

      // accumulate totals
      totalCompleted += item.completedQuantity || 0;
      totalScheduled += item.scheduleQuantity || 0;
      totalScrapCost += scrapCost;
      totalSupplierReturnCost += supplierReturnCost;
    });

    // Convert map to array with efficiency and costs
    const efficiencyData = Array.from(processMap, ([processName, vals]) => {
      const efficiency =
        vals.scheduled > 0 ? (vals.completed / vals.scheduled) * 100 : 0;

      return {
        processName,
        efficiency: parseFloat(efficiency.toFixed(2)),
        scrapCost: parseFloat(vals.scrapCost.toFixed(2)),
        supplierReturnCost: parseFloat(vals.supplierReturnCost.toFixed(2)),
      };
    });

    // calculate total efficiency across all processes
    const totalEfficiency =
      totalScheduled > 0 ? (totalCompleted / totalScheduled) * 100 : 0;

    return res.status(200).json({
      message: "Production Efficiency with Costs by Process",
      data: efficiencyData,
      totals: {
        totalEfficiency: parseFloat(totalEfficiency.toFixed(2)),
        totalScrapCost: parseFloat(totalScrapCost.toFixed(2)),
        totalSupplierReturnCost: parseFloat(totalSupplierReturnCost.toFixed(2)),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error", error });
  }
};

const fiexedDataCalculation = async (req, res) => {
  try {
    const { category, name, cost, depreciation } = req.body;

    const newRecord = await prisma.fixedCost.create({
      data: {
        category,
        expenseName: name,
        expenseCost: parseFloat(cost),
        depreciation: parseFloat(depreciation),
      },
    });

    res.status(201).json({ success: true, data: newRecord });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error creating record" });
  }
};

const deleteFixedCost = async (req, res) => {
  try {
    const id = req.params.id;
    await prisma.fixedCost.delete({
      where: {
        id: id,
      },
    });
    return res.status(200).json({
      message: "Fixed cost deleted successfully !",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating record" });
  }
};
const fixedDataList = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);
    const [fixedCost, totalCount] = await Promise.all([
      prisma.fixedCost.findMany({
        where: {
          isDeleted: false,
        },
        skip: paginationData.skip,
        take: paginationData.pageSize,
      }),
      prisma.fixedCost.count({
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
      message: "Fixed cost retrieved successfully!",
      data: fixedCost,
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

// const getFixedCostGraph = async (req, res) => {
//   try {
//     const currentYear = new Date().getFullYear();
//     const { year } = req.query;

//     const filterYear = year ? parseInt(year) : currentYear;

//     // 1️⃣ Fetch fixed costs
//     const costs = await prisma.fixedCost.findMany({
//       where: {
//         createdAt: {
//           gte: new Date(`${filterYear}-01-01`),
//           lte: new Date(`${filterYear}-12-31`),
//         },
//       },
//       select: {
//         expenseCost: true,
//         createdAt: true,
//       },
//     });

//     // 2️⃣ Fetch stock and custom orders
//     const stockOrders = await prisma.stockOrder.findMany({
//       where: {
//         createdAt: {
//           gte: new Date(`${filterYear}-01-01`),
//           lte: new Date(`${filterYear}-12-31`),
//         },
//       },
//       select: {
//         cost: true,
//         productQuantity: true,
//         createdAt: true,
//       },
//     });

//     const customOrders = await prisma.customOrder.findMany({
//       where: {
//         createdAt: {
//           gte: new Date(`${filterYear}-01-01`),
//           lte: new Date(`${filterYear}-12-31`),
//         },
//       },
//       select: {
//         cost: true,
//         productQuantity: true,
//         createdAt: true,
//       },
//     });

//     // 3️⃣ Initialize arrays for 12 months
//     const monthlyFixedCost = Array(12).fill(0);
//     const monthlyStockRevenue = Array(12).fill(0);
//     const monthlyCustomRevenue = Array(12).fill(0);

//     // 4️⃣ Fill monthly fixed cost
//     costs.forEach((c) => {
//       const month = c.createdAt.getMonth();
//       monthlyFixedCost[month] += c.expenseCost;
//     });

//     // 5️⃣ Fill monthly stock revenue
//     stockOrders.forEach((o) => {
//       const month = o.createdAt.getMonth();
//       monthlyStockRevenue[month] += parseFloat(o.cost) * o.productQuantity;
//     });

//     // 6️⃣ Fill monthly custom revenue
//     customOrders.forEach((o) => {
//       const month = o.createdAt.getMonth();
//       monthlyCustomRevenue[month] += parseFloat(o.cost) * o.productQuantity;
//     });

//     // 7️⃣ Prepare chart data
//     const chartData = monthlyFixedCost.map((totalCost, i) => ({
//       month: new Date(0, i).toLocaleString("default", { month: "short" }),
//       totalCost,
//       stockRevenue: monthlyStockRevenue[i],
//       customRevenue: monthlyCustomRevenue[i],
//       totalRevenue: monthlyStockRevenue[i] + monthlyCustomRevenue[i],
//     }));

//     res.status(200).json({ success: true, data: chartData });
//   } catch (error) {
//     console.error(error);
//     res
//       .status(500)
//       .json({ success: false, message: "Error fetching graph data" });
//   }
// };

const getFixedCostGraph = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const { year } = req.query;

    const filterYear = year ? parseInt(year) : currentYear;

    const costs = await prisma.fixedCost.findMany({
      where: {
        createdAt: {
          gte: new Date(`${filterYear}-01-01`),
          lte: new Date(`${filterYear}-12-31`),
        },
        isDeleted: false,
      },
      select: {
        expenseCost: true,
        createdAt: true,
      },
    });
    const stockOrders = await prisma.stockOrder.findMany({
      where: {
        createdAt: {
          gte: new Date(`${filterYear}-01-01`),
          lte: new Date(`${filterYear}-12-31`),
        },
        isDeleted: false,
      },
      select: {
        cost: true,
        productQuantity: true,
        createdAt: true,
      },
    });

    const customOrders = await prisma.customOrder.findMany({
      where: {
        createdAt: {
          gte: new Date(`${filterYear}-01-01`),
          lte: new Date(`${filterYear}-12-31`),
        },
        isDeleted: false,
      },
      select: {
        cost: true,
        productQuantity: true,
        createdAt: true,
      },
    });

    const monthlyFixedCost = Array(12).fill(0);
    const monthlyStockRevenue = Array(12).fill(0);
    const monthlyCustomRevenue = Array(12).fill(0);

    let totalFixedCost = 0;
    let totalRevenue = 0;

    costs.forEach((c) => {
      const month = c.createdAt.getMonth();
      monthlyFixedCost[month] += c.expenseCost;
      totalFixedCost += c.expenseCost;
    });

    stockOrders.forEach((o) => {
      const revenue = parseFloat(o.cost) * o.productQuantity;
      const month = o.createdAt.getMonth();
      monthlyStockRevenue[month] += revenue;
      totalRevenue += revenue;
    });

    customOrders.forEach((o) => {
      const revenue = parseFloat(o.cost) * o.productQuantity;
      const month = o.createdAt.getMonth();
      monthlyCustomRevenue[month] += revenue;
      totalRevenue += revenue;
    });

    const chartData = monthlyFixedCost.map((totalCost, i) => ({
      month: new Date(0, i).toLocaleString("default", { month: "short" }),
      totalCost,
      stockRevenue: monthlyStockRevenue[i],
      customRevenue: monthlyCustomRevenue[i],
      totalRevenue: monthlyStockRevenue[i] + monthlyCustomRevenue[i],
    }));

    res.status(200).json({
      success: true,
      data: chartData,
      totals: {
        year: filterYear,
        totalFixedCost,
        totalRevenue,
      },
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching graph data" });
  }
};

const getParts = async (req, res) => {
  try {
    const parts = await prisma.partNumber.findMany({
      where: { isDeleted: false },
      select: { part_id: true, partDescription: true },
    });
    res.json(parts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// const revenueApi = async (req, res) => {
//   try {
//     const year = parseInt(req.query.year);

//     const stockOrders = await prisma.stockOrder.findMany({
//       where: { isDeleted: false },
//       include: {
//         part: {
//           select: {
//             cost: true,
//             partNumber: true,
//             cycleTime: true,
//             process: { select: { ratePerHour: true } },
//           },
//         },
//         PartNumber_StockOrder_productNumberToPartNumber: {
//           select: { cost: true, partNumber: true },
//         },
//       },
//     });
//     const customOrders = await prisma.customOrder.findMany({
//       where: { isDeleted: false },
//       include: {
//         part: {
//           select: {
//             cost: true,
//             partNumber: true,
//             cycleTime: true,
//             process: { select: { ratePerHour: true } },
//           },
//         },
//         product: { select: { cost: true, partNumber: true } },
//       },
//     });

//     const stockOrderSchedule = await prisma.stockOrderSchedule.findMany({
//       where: { isDeleted: false },
//       include: {
//         part: true, // part cost
//         StockOrder: true, // product cost
//         CustomOrder: true, // custom product cost
//       },
//     });

//     let totalRevenue = 0;

//     stockOrderSchedule.forEach((order) => {
//       const qty = order.completedQuantity || 0;
//       const partCost = parseFloat(order.part?.cost || 0);
//       const productCost = parseFloat(
//         order.StockOrder?.cost || order.CustomOrder?.totalCost || 0
//       );
//       console.log("productCostproductCost", productCost);
//       console.log("partCostpartCost", partCost);
//       console.log("qtyqty", qty);

//       const revenueForOrder = (partCost + productCost) * qty;

//       totalRevenue += revenueForOrder;
//     });

//     console.log("Total Revenue (StockOrderSchedule based):", totalRevenue);

//     const getFixedCost = await prisma.fixedCost.findMany({
//       select: {
//         expenseCost: true,
//       },
//     });

//     const totalFixedCost = getFixedCost.reduce(
//       (sum, item) => sum + parseFloat(item.expenseCost || 0),
//       0
//     );

//     const totalFullfilled = await prisma.stockOrderSchedule.findMany({
//       where: {
//         isDeleted: false,
//         status: "completed",
//       },
//       select: {
//         part: {
//           select: {
//             partNumber: true,
//             cost: true,
//           },
//         },
//       },
//     });

//     console.log("totalFullfilledtotalFullfilled", totalFullfilled);

//     const monthlyRevenue = {};
//     const monthlyCOGS = {};

//     let totalStockRevenue = 0;
//     let totalCustomRevenue = 0;
//     let totalCOGS = 0;
//     let scrapCost = 0;
//     let supplierReturn = 0;

//     stockOrders.forEach((order) => {
//       const date = new Date(order.orderDate || order.shipDate);
//       if (year && date.getFullYear() !== year) return;

//       const monthKey =
//         date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");

//       const productCost = parseFloat(order.cost || 0);
//       console.log("orderorder", order);

//       const productRevenue = productCost * (order.productQuantity || 0);

//       let partCostTotal = 0;
//       if (order.part?.cost) {
//         console.log("order.part?.cost", order.part?.cost);

//         partCostTotal +=
//           parseFloat(order.part.cost) * (order.productQuantity || 0);
//       }
//       if (order.PartNumber_StockOrder_productNumberToPartNumber?.cost) {
//         partCostTotal +=
//           parseFloat(
//             order.PartNumber_StockOrder_productNumberToPartNumber.cost
//           ) * (order.productQuantity || 0);
//       }

//       const totalRevenueForOrder = productRevenue + partCostTotal;
//       monthlyRevenue[monthKey] =
//         (monthlyRevenue[monthKey] || 0) + totalRevenueForOrder;
//       totalStockRevenue += totalRevenueForOrder;

//       // --- COGS ---
//       const partCost = order.part?.cost || 0;
//       const cycleTimeHours = parseCycleTime(order.part?.cycleTime);
//       const ratePerHour = order.part?.process?.ratePerHour || 0;
//       const orderCOGS =
//         (partCost + cycleTimeHours * ratePerHour) *
//         (order.productQuantity || 1);

//       monthlyCOGS[monthKey] = (monthlyCOGS[monthKey] || 0) + orderCOGS;
//       totalCOGS += orderCOGS;

//       // Scrap + Supplier Return
//       scrapCost += order.scrapQuantity ? partCost * order.scrapQuantity : 0;
//       supplierReturn += order.supplierReturnQuantity
//         ? partCost * order.supplierReturnQuantity
//         : 0;
//     });

//     // --- Process Custom Orders ---
//     customOrders.forEach((order) => {
//       const date = new Date(order.orderDate || order.shipDate);
//       if (year && date.getFullYear() !== year) return;

//       const monthKey =
//         date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");

//       // Revenue
//       const baseCost = parseFloat(order.totalCost || 0);

//       let extraPartCost = 0;
//       if (order.part?.cost) {
//         extraPartCost +=
//           parseFloat(order.part.cost) * (order.productQuantity || 0);
//       }
//       if (order.product?.cost) {
//         extraPartCost +=
//           parseFloat(order.product.cost) * (order.productQuantity || 0);
//       }

//       const totalRevenueForOrder = baseCost + extraPartCost;
//       monthlyRevenue[monthKey] =
//         (monthlyRevenue[monthKey] || 0) + totalRevenueForOrder;
//       totalCustomRevenue += totalRevenueForOrder;

//       // --- COGS ---
//       const partCost = order.part?.cost || 0;
//       const cycleTimeHours = parseCycleTime(order.part?.cycleTime);
//       const ratePerHour = order.part?.process?.ratePerHour || 0;
//       const orderCOGS =
//         (partCost + cycleTimeHours * ratePerHour) *
//         (order.productQuantity || 1);

//       monthlyCOGS[monthKey] = (monthlyCOGS[monthKey] || 0) + orderCOGS;
//       totalCOGS += orderCOGS;

//       // Scrap + Supplier Return
//       scrapCost += order.scrapQuantity ? partCost * order.scrapQuantity : 0;
//       supplierReturn += order.supplierReturnQuantity
//         ? partCost * order.supplierReturnQuantity
//         : 0;
//     });

//     const fulfilledOrders = await prisma.stockOrderSchedule.findMany({
//       where: {
//         isDeleted: false,
//         status: "completed",
//       },
//       include: {
//         part: {
//           select: { partNumber: true, cost: true },
//         },
//         StockOrder: { select: { cost: true } }, // agar product cost bhi chahiye
//         CustomOrder: { select: { totalCost: true } }, // agar custom order h
//       },
//     });

//     let fulfilledRevenue = 0;

//     fulfilledOrders.forEach((order) => {
//       const partCost = parseFloat(order.part?.cost || 0);
//       const productCost = parseFloat(
//         order.StockOrder?.cost || order.CustomOrder?.totalCost || 0
//       );
//       const qty = order.completedQuantity || 0;

//       fulfilledRevenue += (partCost + productCost) * qty;
//     });
//     const unfulfilledOrders = await prisma.stockOrderSchedule.findMany({
//       where: {
//         isDeleted: false,
//         NOT: { status: "completed" }, // yani jo complete nahi hue
//       },
//       include: {
//         part: {
//           select: { partNumber: true, cost: true },
//         },
//         StockOrder: { select: { cost: true } },
//         CustomOrder: { select: { totalCost: true } },
//       },
//     });

//     let unfulfilledRevenue = 0;

//     unfulfilledOrders.forEach((order) => {
//       const partCost = parseFloat(order.part?.cost || 0);
//       const productCost = parseFloat(
//         order.StockOrder?.cost || order.CustomOrder?.totalCost || 0
//       );
//       const qty = order.remainingQty || order.quantity || 0; // remaining/pending qty

//       unfulfilledRevenue += (partCost + productCost) * qty;
//     });
//     const cashflowNeeded =
//       totalFixedCost + totalCOGS - fulfilledRevenue + unfulfilledRevenue;

//     const dailyCashFlow = {};

//     // Example: iterate over stockOrders and customOrders to fill daily data
//     [...stockOrders, ...customOrders].forEach((order) => {
//       const date = new Date(order.orderDate || order.shipDate);
//       const dateKey = date.toISOString().slice(0, 10); // YYYY-MM-DD

//       const partCost = parseFloat(order.part?.cost || 0);
//       const productCost = parseFloat(order.cost || order.totalCost || 0) || 0;
//       const qty = order.productQuantity || 1;

//       const cashNeededForOrder =
//         totalFixedCost + (partCost + productCost) * qty;

//       dailyCashFlow[dateKey] =
//         (dailyCashFlow[dateKey] || 0) + cashNeededForOrder;
//     });

//     res.json({
//       monthlyRevenue,
//       monthlyCOGS,
//       stockOrderRevenue: totalStockRevenue,
//       customOrderRevenue: totalCustomRevenue,
//       totalRevenue: totalStockRevenue + totalCustomRevenue,
//       totalCOGS,
//       scrapCost,
//       supplierReturn,
//       grossProfit:
//         totalStockRevenue +
//         totalCustomRevenue -
//         totalCOGS -
//         scrapCost -
//         supplierReturn,
//       totalFixedCost,
//       fulfilledRevenue,
//       unfulfilledRevenue,
//       cashflowNeeded,
//       dailyCashFlow, // ✅ New day-wise schedule
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: "Something went wrong while fetching revenue & cogs.",
//       error: error.message,
//     });
//   }
// };
const revenueApi = async (req, res) => {
  try {
    const year = parseInt(req.query.year);

    const schedules = await prisma.stockOrderSchedule.findMany({
      where: { isDeleted: false },
      include: {
        part: true, // part cost
        process: true,
        StockOrder: true, // stock order cost
        CustomOrder: true, // custom order cost
      },
    });

    const fixedCosts = await prisma.fixedCost.findMany({
      select: { expenseCost: true },
    });
    const totalFixedCost = fixedCosts.reduce(
      (sum, item) => sum + parseFloat(item.expenseCost || 0),
      0
    );

    // Initialize
    let totalRevenue = 0;
    let totalCOGS = 0;
    let scrapCost = 0;
    let supplierReturn = 0;
    const monthlyRevenue = {};
    const monthlyCOGS = {};
    const dailyCashFlow = {};

    schedules.forEach((order) => {
      const qtyFulfilled = order.completedQuantity || 0;
      const qtyUnfulfilled = order.remainingQty || 0;
      const date = new Date(order.order_date);
      if (year && date.getFullYear() !== year) return;

      const monthKey =
        date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
      const dateKey = date.toISOString().slice(0, 10);

      const partCost = parseFloat(order.part?.cost || 0);
      const productCost = parseFloat(
        order.StockOrder?.cost || order.CustomOrder?.totalCost || 0
      );
      const cycleTimeMinutes = order.part?.cycleTime || 0;
      const cycleTimeHours = cycleTimeMinutes / 60;
      const ratePerHour = order.process.ratePerHour || 0;

      const orderCOGS =
        (partCost + cycleTimeHours * ratePerHour) * qtyFulfilled;
      console.log("orderCOGSorderCOGS", orderCOGS);

      // --- Revenue ---
      const fulfilledRevenue = (partCost + productCost) * qtyFulfilled;
      const unfulfilledRevenue = (partCost + productCost) * qtyUnfulfilled;
      totalRevenue += fulfilledRevenue;

      // Monthly
      monthlyRevenue[monthKey] =
        (monthlyRevenue[monthKey] || 0) + fulfilledRevenue;

      totalCOGS += orderCOGS;
      monthlyCOGS[monthKey] = (monthlyCOGS[monthKey] || 0) + orderCOGS;

      // --- Scrap & Supplier Return ---
      scrapCost += order.scrapQuantity ? partCost * order.scrapQuantity : 0;
      console.log("************orderm*****************", order);
      supplierReturn += order.scrapQuantity
        ? partCost * order.scrapQuantity
        : 0;

      // --- Daily cash flow (required for planning)
      dailyCashFlow[dateKey] =
        (dailyCashFlow[dateKey] || 0) +
        totalFixedCost +
        (partCost + productCost) * qtyFulfilled;
    });

    res.json({
      monthlyRevenue,
      monthlyCOGS,
      totalRevenue,
      totalCOGS,
      scrapCost,
      supplierReturn,
      grossProfit: totalRevenue - totalCOGS - scrapCost - supplierReturn,
      totalFixedCost,
      fulfilledRevenue: totalRevenue,
      unfulfilledRevenue: schedules.reduce(
        (sum, o) =>
          sum +
          (parseFloat(o.part?.cost || 0) +
            parseFloat(o.StockOrder?.cost || o.CustomOrder?.totalCost || 0)) *
            (o.remainingQty || 0),
        0
      ),
      cashflowNeeded:
        totalFixedCost +
        totalCOGS -
        totalRevenue +
        schedules.reduce(
          (sum, o) =>
            sum +
            (parseFloat(o.part?.cost || 0) +
              parseFloat(o.StockOrder?.cost || o.CustomOrder?.totalCost || 0)) *
              (o.remainingQty || 0),
          0
        ),
      dailyCashFlow,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong while fetching revenue & COGS.",
      error: error.message,
    });
  }
};

const scheudleInventory = async (req, res) => {
  try {
    const parts = await prisma.partNumber.findMany({
      where: { isDeleted: false },
      select: {
        partNumber: true,
        partDescription: true,
        availStock: true,
        minStock: true,
        cost: true,
      },
    });

    const inventoryMap = {};

    parts.forEach((part) => {
      if (!inventoryMap[part.partNumber]) {
        inventoryMap[part.partNumber] = {
          partNumber: part.partNumber,
          partDescription: part.partDescription,
          qtyAvailable: part.availStock ?? 0,
          safetyStock: part.minStock ?? 0,
          totalCost: (part.availStock ?? 0) * part.cost,
          unitCost: part.cost.toFixed(2),
        };
      } else {
        inventoryMap[part.partNumber].qtyAvailable += part.availStock ?? 0;
        inventoryMap[part.partNumber].totalCost +=
          (part.availStock ?? 0) * part.cost;
      }
    });

    const inventoryData = Object.values(inventoryMap).map((item) => ({
      ...item,
      totalCost: item.totalCost.toFixed(2),
    }));

    res.json({
      message: "Inventory fetched successfully",
      data: inventoryData,
    });
  } catch (error) {
    res.status(500).json({
      message: "Something went wrong while fetching inventory.",
      error: error.message,
    });
  }
};
const getLabourForcast = async (req, res) => {
  try {
    const getInventory = await prisma.supplier_inventory.findMany({
      where: { isDeleted: false },
    });

    const orderDetail = await prisma.stockOrderSchedule.findMany({
      where: { isDeleted: false },
      include: {
        part: { select: { part_id: true, partNumber: true, availStock: true } },
        process: { select: { processName: true, id: true, cycleTime: true } },
      },
    });
    console.log("getInventorygetInventory", getInventory);

    // const getInvData = getInventory.map((item)=>item.availStock)
    const forecastData = orderDetail.map((order) => {
      const matchingInventory = getInventory.find(
        (inv) => inv.part_id === order.part_id
      );

      const available = order.part.availStock || 0;
      const need = order.scheduleQuantity || 0;
      const prodNeed = need - available;
      const cycleTime = parseFloat(order.process.cycleTime || "0");

      const processTime = cycleTime / 60;
      console.log("processTimeprocessTime", processTime);

      return {
        product_name: order.part.partNumber,
        sub_name: order.process.processName,
        Available: available,
        Need: need,
        Forc: null,
        cycleTime: processTime,
        Hr_Need: null,
      };
    });

    res.status(200).json({ data: forecastData });
  } catch (error) {
    res.status(500).json({
      message: "Something went wrong while fetching forecast data.",
      error: error.message,
    });
  }
};

const businessAnalysisApi = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1. Calculate Days for Fixed Cost (Client Formula: Time period selected)
    const timeDifference = end.getTime() - start.getTime();
    const daysInPeriod = Math.ceil(timeDifference / (1000 * 3600 * 24)) || 1;

    // --- FETCH DATA (Strictly Date Filtered) ---
    const schedules = await prisma.stockOrderSchedule.findMany({
      where: {
        isDeleted: false,
        // Yahi main filter hai jo client maang raha hai "For the period selected"
        order_date: { gte: start, lte: end },
      },
      include: {
        part: true,
        process: true,
        StockOrder: true,
        CustomOrder: true,
      },
    });

    // Fixed Costs (Annual)
    const fixedCostsData = await prisma.fixedCost.findMany({
      select: { expenseCost: true },
    });
    const sumFixedCosts = fixedCostsData.reduce(
      (sum, item) => sum + parseFloat(item.expenseCost || 0),
      0
    );
    // Formula: (Fixed Cost / 365) * Days Selected
    const proratedFixedCost = (sumFixedCosts / 365) * daysInPeriod;

    // --- CALCULATIONS ---
    let totalRevenue = 0;
    let bomCost = 0;
    let laborCost = 0;
    let scrapCost = 0;
    let supplierReturn = 0;
    let inventoryCost = 0;

    schedules.forEach((order) => {
      // Quantities
      const qtyFulfilled = parseFloat(order.completedQuantity || 0);
      const qtyRemaining = parseFloat(order.remainingQty || 0); // Yeh hai Inventory (Pending Work)
      const scrapQty = parseFloat(order.scrapQuantity || 0);

      // Unit Costs
      const partCost = parseFloat(order.part?.cost || 0);
      const productCost = parseFloat(
        order.StockOrder?.cost || order.CustomOrder?.totalCost || 0
      );

      // Labor Calculation
      const cycleTimeHours = parseFloat(order.part?.cycleTime || 0) / 60;
      const ratePerHour = parseFloat(order.process?.ratePerHour || 0);
      const laborUnitCost = cycleTimeHours * ratePerHour;

      // 1. REVENUE (For period selected)
      const revenuePerUnit = partCost + productCost;
      totalRevenue += revenuePerUnit * qtyFulfilled;

      // 2. COGS (For period selected)
      // BOM Cost
      bomCost += partCost * qtyFulfilled;
      // Labor Cost
      laborCost += laborUnitCost * qtyFulfilled;

      // 3. SCRAP (For period selected)
      scrapCost += scrapQty * partCost;

      // 4. INVENTORY COST (At the end of period / Pending for this period)
      // Client Image logic: Is period ka bacha hua maal/pending value
      inventoryCost += qtyRemaining * (partCost + laborUnitCost);

      // 5. SUPPLIER RETURN (Optional logic)
      if (order.scrapQuantity > 0) {
        supplierReturn += order.scrapQuantity * partCost;
      }
    });

    // --- FINAL TOTALS ---
    const totalCOGS = bomCost + laborCost;

    // Client Formula: Op Exp = Total COGS + Fixed Cost (Prorated)
    const operatingExpenses = totalCOGS + proratedFixedCost;

    // Client Formula: Profit = Revenue - Op Exp
    const profit = totalRevenue - operatingExpenses;

    const cashFlow = profit;

    res.status(200).json({
      totalRevenue,
      totalCOGS,
      bomCost,
      laborCost,
      totalFixedCost: proratedFixedCost,
      operatingExpenses,
      Profit: profit,
      InventoryCost: inventoryCost, // Ab ye Dashboard se alag hai, strictly order dates par based hai
      scrapCost,
      supplierReturn,
      cashFlow,
    });
  } catch (error) {
    console.error("Analysis Error:", error);
    res.status(500).json({
      message: "Error fetching business analysis data",
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
  getLiveProduction,
  productionOverview,
  processHourly,
  liveProductionGoalBoard,
  currentStatusOverview,
  currentQualityStatusOverview,
  monitorChartsData,
  getDiveApi,
  cycleTimeComparisionData,
  dashBoardData,
  dailySchedule,
  capacityStatus,
  productionEfficieny,
  fiexedDataCalculation,
  fixedDataList,
  deleteFixedCost,
  getFixedCostGraph,
  getParts,
  revenueApi,
  scheudleInventory,
  getLabourForcast,
  businessAnalysisApi,
};
