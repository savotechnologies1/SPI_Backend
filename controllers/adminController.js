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
const moment = require("moment");
const moment1 = require("moment-timezone");
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
      where: { email: userName.trim() },
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
      },
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
    const id = req.params.id;
    const { firstName, lastName, email, customerPhone, address, billingTerms } =
      req.body;
    const existingOtherCustomer = await prisma.customers.findFirst({
      where: {
        id: {
          not: id,
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

    await prisma.customers.update({
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
    const { firstName, lastName, email, companyName, address, billingTerms } =
      req.body;
    const getId = uuidv4().slice(0, 6);
    const existingSupplier = await prisma.suppliers.findFirst({
      where: {
        isDeleted: false,
        email: email,
      },
    });

    if (existingSupplier) {
      return res.status(400).json({
        message: "Supplier with this email already exists.",
      });
    }
    await prisma.suppliers.create({
      data: {
        id: getId,
        firstName,
        lastName,
        companyName,
        email,
        address,
        billingTerms: billingTerms,
        createdBy: req.user.id,
      },
    });

    return res.status(201).json({
      message: "Supplier added successfully!",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Internal Server Error. Please try again later.",
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
    const { firstName, lastName, companyName, email, address, billingTerms } =
      req.body;
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
          companyName: companyName,
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
        companyName: true,
        email: true,
      },
    });
    const formattedSuppliers = suppliers.map((supplier) => ({
      id: supplier.id,
      name: `${supplier.firstName} ${supplier.lastName}`,
      companyName: supplier.companyName,
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
    let supplierDetails = {};

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
      orderDetail.order_date,
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedNeedDate = new Date(
      orderDetail.need_date,
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
    res.status(500).json({ message: "Server error" });
  }
};
const sendOrderToSupplier = async (req, res) => {
  try {
    const { part_id, quantity, need_date } = req.body;

    if (!part_id || !quantity || !need_date) {
      return res
        .status(400)
        .json({ message: "part_id, quantity, and need_date are required." });
    }

    const partDetail = await prisma.partNumber.findUnique({
      where: { part_id: part_id, isDeleted: false },
      include: {
        supplier: true,
      },
    });

    if (!partDetail) {
      return res.status(404).json({ message: "Part not found." });
    }

    if (!partDetail.supplier || !partDetail.supplier.email) {
      return res.status(400).json({
        message: "Supplier or Supplier Email not found for this part.",
      });
    }

    const orderNumber = `PO-${new Date().getTime().toString().slice(-6)}`;
    const formattedOrderDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedNeedDate = new Date(need_date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const templateData = {
      "{{supplier_name}}": `${partDetail.supplier.firstName} ${partDetail.supplier.lastName}`,
      "{{order_number}}": orderNumber,
      "{{order_date}}": formattedOrderDate,
      "{{part_name}}": partDetail.partNumber,
      "{{quantity}}": quantity,
      "{{cost}}": `$${(partDetail.cost * quantity).toFixed(2)}`,
      "{{need_date}}": formattedNeedDate,
    };

    await prisma.supplier_orders.create({
      data: {
        order_number: orderNumber,
        order_date: new Date().toISOString(),
        supplier_id: partDetail.supplier.id,
        part_id: partDetail.part_id,
        quantity: parseInt(quantity),
        cost: partDetail.cost * quantity,
        status: "pending",
        need_date: new Date(need_date).toISOString(),
        firstName: partDetail.supplier.firstName,
        lastName: partDetail.supplier.lastName,
        email: partDetail.supplier.email,
      },
    });

    await sendMail(
      "send-order-to-the-supplier",
      templateData,
      partDetail.supplier.email,
    );

    return res.status(200).json({
      message: "Order placed and email sent to supplier successfully!",
      orderNumber,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
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
          createdAt: "desc",
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
    const existingProcess = await prisma.process.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingProcess) {
      return res.status(404).json({
        message: "Process not found",
      });
    }

    await prisma.process.update({
      where: {
        id: id,
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

const allEmployee = async (req, res) => {
  try {
    const { search = "", processLogin, status } = req.query;
    const paginationData = await paginationQuery(req.query);

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
      email,
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

const createStockOrder = async (req, res) => {
  try {
    const {
      orderNumber,
      orderDate,
      shipDate,
      timezone,
      productQuantity,
      productId,
      customerId,
      customerEmail,
      customerName,
      customerPhone,
    } = req.body;

    const clientTimezone = timezone || "UTC";
    const finalOrderDate = moment1.tz(orderDate, clientTimezone).toISOString();
    const finalShipDate = moment1.tz(shipDate, clientTimezone).toISOString();
    let finalCustomerId;
    const existingCustomerById = await prisma.customers.findUnique({
      where: { id: customerId },
    });

    if (existingCustomerById) {
      finalCustomerId = existingCustomerById.id;
    } else {
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

    await prisma.stockOrder.create({
      data: {
        orderNumber,
        orderDate: finalOrderDate,
        shipDate: finalShipDate,
        productQuantity: parseInt(productQuantity, 10),
        productNumber: req.body.productNumber,
        productDescription: req.body.productDescription,
        cost: req.body.cost,
        totalCost: req.body.totalCost,
        customerName,
        customerEmail,
        customerPhone,
        customerId: finalCustomerId,
        partId: productId,
        status: "Pending",
      },
    });

    res.status(201).json({
      message: `Stock order added successfully !`,
    });
  } catch (error) {
    res.status(500).json({ error: "Something went wrong." });
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
      cost,
      totalCost,
      productQuantity,
      bomList = [],
      newParts = [],
    } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      let customer = null;
      if (customerId && customerId !== "new") {
        customer = await tx.customers.findUnique({ where: { id: customerId } });
      }

      if (!customer) {
        if (!customerName) throw new Error("Customer name is required");
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
          cost: parseFloat(cost || 0),
          totalCost: parseFloat(totalCost || 0),
          productQuantity: parseInt(productQuantity || 1, 10),
          status: "Pending",
        },
      });

      if (Array.isArray(bomList) && bomList.length > 0) {
        for (const item of bomList) {
          if (!item.partId) continue;
          const globalPart = await tx.partNumber.findUnique({
            where: { part_id: item.partId },
          });

          if (globalPart) {
            await tx.customOrderExistingPart.create({
              data: {
                customOrderId: createdOrder.id,
                partId: item.partId,
                processId: item.processId || globalPart.processId,
                quantity: parseInt(item.qty || 1, 10),
                cycleTime:
                  item.cycleTime?.toString() || globalPart.cycleTime || "0",
                instructionRequired:
                  item.instructionRequired !== undefined
                    ? item.instructionRequired
                    : globalPart.instructionRequired,
              },
            });
          }
        }
      }

      if (Array.isArray(newParts) && newParts.length > 0) {
        for (const partItem of newParts) {
          if (!partItem.part) continue;

          await tx.customPart.create({
            data: {
              customOrderId: createdOrder.id,
              partNumber: partItem.part.trim(),
              quantity: parseInt(partItem.qty || 1, 10),
              processId: partItem.processId || null,
              processName: partItem.processName || "",
              cycleTime: partItem.totalTime?.toString() || "0",
              workInstruction: partItem.instructionRequired ? "Yes" : "No",
            },
          });
        }
      }

      return createdOrder;
    });

    return res.status(201).json({
      success: true,
      message:
        "Custom order created successfully. BOM details saved for both Existing and New parts.",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create custom order",
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
        machineName: true,
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
      machineName: process.machineName,
    }));
    res.status(200).json(formattedProcess);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
const selectPartNumber = async (req, res) => {
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
        components: {
          where: {
            isDeleted: false,
          },
          select: {
            part_id: true,
            partQuantity: true,
          },
        },
      },
      where: {
        isDeleted: false,
        type: {
          in: ["part", "product"],
        },
      },
      orderBy: {
        partNumber: "asc",
      },
    });

    const formattedData = data.map((item) => ({
      ...item,
      hasSubParts: item.components.length > 0,
    }));

    return res.status(200).json({
      message: "Part numbers retrieved successfully!",
      data: formattedData,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
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
      (file) => file.fieldname === "partImages",
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
      instructionRequired,
      processId,
      processDesc,
    } = req.body;

    const existingPart = await prisma.partNumber.findFirst({
      where: { partNumber: partNumber?.trim() },
    });

    if (existingPart && !existingPart.isDeleted) {
      return res.status(400).json({ message: "Part Number already exists." });
    }
    const getId = uuidv4().slice(0, 6);
    if (existingPart && existingPart.isDeleted) {
      await prisma.partNumber.update({
        where: { part_id: existingPart.part_id },
        data: {
          partFamily,
          partDescription,
          cost: parseFloat(cost) || 0,
          leadTime: parseInt(leadTime) || 0,
          supplierOrderQty: parseInt(supplierOrderQty) || 0,
          companyName,
          minStock: parseInt(minStock) || 0,
          availStock: parseInt(availStock) || 0,
          cycleTime,
          processOrderRequired: processOrderRequired === "true",
          instructionRequired: instructionRequired === "true",
          processId,
          processDesc,
          type: "part",
          isDeleted: false,
          submittedBy: req.user.id,
        },
      });
      return res
        .status(200)
        .json({ message: "Part number reactivated successfully!" });
    }

    await prisma.partNumber.create({
      data: {
        part_id: getId,
        partFamily,
        partNumber: partNumber.trim(),
        partDescription,
        cost: parseFloat(cost) || 0,
        leadTime: parseInt(leadTime) || 0,
        supplierOrderQty: parseInt(supplierOrderQty) || 0,
        companyName,
        minStock: parseInt(minStock) || 0,
        availStock: parseInt(availStock) || 0,
        cycleTime,
        processOrderRequired: processOrderRequired === "true",
        processId,
        processDesc,
        type: "part", // Ensuring type is part
        submittedBy: req.user.id,
        partImages: {
          create: getPartImages?.map((img) => ({
            imageUrl: img.filename,
            type: "part",
          })),
        },
      },
    });

    return res
      .status(201)
      .json({ message: "Part number created successfully!" });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong." });
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
          createdAt: "desc",
        },
        include: {
          process: {
            select: {
              processName: true,
            },
          },
          supplier: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
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
      (file) => file?.fieldname === "partImages",
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

    const trimmedNumber = productNumber?.trim();
    const existingEntry = await prisma.partNumber.findUnique({
      where: { partNumber: trimmedNumber },
    });

    let productId;
    const validProcessId =
      processId && processId.trim() !== "" ? processId : null;
    const commonData = {
      partFamily,
      partDescription,
      cost: parseFloat(cost) || 0,
      leadTime: parseInt(leadTime) || 0,
      supplierOrderQty: parseInt(supplierOrderQty) || 0,
      companyName,
      minStock: parseInt(minStock) || 0,
      availStock: parseInt(availStock) || 0,
      cycleTime: cycleTime,
      processOrderRequired: processOrderRequired === "true",
      instructionRequired: instructionRequired === "true",
      processId: validProcessId,
      processDesc,
      type: "product",
      isDeleted: false,
      submittedBy: req.user.id,
    };

    if (existingEntry) {
      productId = existingEntry.part_id;
      await prisma.partNumber.update({
        where: { part_id: productId },
        data: commonData,
      });
      console.log(`Updated existing entry ${trimmedNumber} to type: product`);
    } else {
      productId = uuidv4().slice(0, 6);
      await prisma.partNumber.create({
        data: {
          ...commonData,
          part_id: productId,
          partNumber: trimmedNumber,
          partFamily: partFamily,
          partImages: {
            create: getPartImages?.map((img) => ({
              imageUrl: img.filename,
              type: "product",
            })),
          },
        },
      });
    }

    const parsedParts = typeof parts === "string" ? JSON.parse(parts) : parts;

    if (parsedParts && parsedParts.length > 0) {
      for (const item of parsedParts) {
        const componentPart = await prisma.partNumber.findUnique({
          where: { part_id: item.part_id },
        });

        if (componentPart) {
          await prisma.partNumber.update({
            where: { part_id: item.part_id },
            data: {
              availStock:
                item.availStock !== undefined
                  ? parseInt(item.availStock)
                  : componentPart.availStock,
              minStock:
                item.minStock !== undefined
                  ? parseInt(item.minStock)
                  : componentPart.minStock,
              cost:
                item.cost !== undefined
                  ? parseFloat(item.cost)
                  : componentPart.cost,
              supplierOrderQty:
                item.supplierOrderQty !== undefined
                  ? parseInt(item.supplierOrderQty)
                  : componentPart.supplierOrderQty,
              leadTime:
                item.leadTime !== undefined
                  ? parseInt(item.leadTime)
                  : componentPart.leadTime,
            },
          });

          const parentToUse = item.parent_id ? item.parent_id : productId;

          await prisma.productTree.upsert({
            where: {
              product_part_unique: {
                product_id: parentToUse,
                part_id: item.part_id,
              },
            },
            update: {
              partQuantity: Number(item.qty) || 1,
              isDeleted: false,
            },
            create: {
              id: uuidv4().slice(0, 6),
              product_id: parentToUse,
              part_id: item.part_id,
              partQuantity: Number(item.qty) || 1,
              processId: componentPart.processId,
              processOrderRequired: componentPart.processOrderRequired,
              instructionRequired: instructionRequired === "true",
              createdBy: req.user.id,
            },
          });
        }
      }
    }
    return res.status(200).json({
      message: existingEntry
        ? "Part updated to Product and BOM added!"
        : "New Product and BOM created!",
      product_id: productId,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Something went wrong.", error: error.message });
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
        orderBy: {
          createdAt: "desc",
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
      data: allProcess,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const bomDataList = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);
    const { search = "" } = req.query;
    const filterConditions = {
      isDeleted: false,
      OR: [
        { type: "part" },
        {
          AND: [
            { type: "product" },
            {
              usedInProducts: {
                some: {
                  isDeleted: false,
                },
              },
            },
          ],
        },
      ],
    };

    if (search) {
      filterConditions.partNumber = {
        contains: search.trim(),
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
          createdAt: "desc",
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
      message: "Data retrieved successfully!",
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
        minStock: true,
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
        supplier: {
          select: {
            companyName: true,
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
        supplier: {
          select: {
            companyName: true,
          },
        },
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

    const parts = productTreeEntries.map((pt) => ({
      id: pt.id,
      part_id: pt.part_id,
      partNumber: pt.part?.partNumber || null,
      partFamily: pt.part?.partFamily || null,
      process: pt.part?.process || null,
      instructionRequired: pt.instructionRequired ? "Yes" : "No",
      partQuantity: pt.partQuantity,
    }));

    const fullName = productInfo.supplier
      ? `${productInfo.supplier.companyName || ""} `.trim()
      : "";

    const result = {
      product_id: productInfo.part_id,
      productNumber: productInfo.partNumber,
      partFamily: productInfo.partFamily,
      partDescription: productInfo.partDescription,
      availStock: productInfo.availStock,
      supplier: productInfo.supplier
        ? { ...productInfo.supplier, name: fullName }
        : null,
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
      (file) => file.fieldname === "partImages",
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
      instructionRequired,
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
        cost: cost ? parseFloat(cost) : 0,
        leadTime: leadTime ? parseInt(leadTime) : 0,
        supplierOrderQty: supplierOrderQty ? parseInt(supplierOrderQty) : 0,
        companyName: companyName || null,
        minStock: minStock ? parseInt(minStock) : 0,
        availStock: availStock ? parseInt(availStock) : 0,
        cycleTime: cycleTime,
        processOrderRequired: processOrderRequired === "true",
        instructionRequired: instructionRequired === "true",
        processId: processOrderRequired === "true" ? processId || null : null,
        processDesc:
          processOrderRequired === "true" ? processDesc || null : null,
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
        }),
      );
      await Promise.all(imagePromises);
    }

    return res.status(200).json({
      message: "Part updated successfully!",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Something went wrong. Please try again later." });
  }
};
const updateProductNumber = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);
    const getPartImages = fileData?.data?.filter(
      (file) => file.fieldname === "partImages",
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
        // isProductSchedule: true,
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
      }),
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
    };

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

    if (productNumber) {
      whereClause.part = { partNumber: { contains: productNumber.trim() } };
    }

    if (shipDate) {
      whereClause.shipDate = shipDate;
    }
    const partSelectFields = {
      part_id: true,
      partFamily: true,
      partNumber: true,
      partDescription: true,
      type: true,
      cost: true,
      minStock: true,
      availStock: true,
      supplierOrderQty: true,
      processId: true,
      processDesc: true,
      processOrderRequired: true,
      submittedBy: true,
      createdBy: true,
      isDeleted: true,
      companyName: true,
    };

    const bomSelect = {
      select: {
        ...partSelectFields,
        components: {
          select: {
            id: true,
            product_id: true,
            part_id: true,
            partQuantity: true,
            isDeleted: true,
            processOrderRequired: true,
            createdBy: true,
            part: {
              select: {
                ...partSelectFields,
                components: {
                  select: {
                    id: true,
                    partQuantity: true,
                    part: {
                      select: {
                        ...partSelectFields,
                        components: {
                          select: {
                            id: true,
                            part: { select: partSelectFields },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const orders = await prisma.stockOrder.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        orderDate: true,
        shipDate: true,
        customerId: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        productNumber: true,
        productDescription: true,
        cost: true,
        productQuantity: true,
        createdBy: true,
        isDeleted: true,
        totalCost: true,
        status: true,
        partId: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            customerPhone: true,
          },
        },
        part: bomSelect,
      },
    });

    return res.status(200).json({
      message: "Stock orders retrieved successfully!",
      data: orders,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong.",
      error: error.message,
    });
  }
};

const formatOrders = (orders) => {
  return orders.map((order) => {
    const { part, product, ...rest } = order;

    const productFamily = [];

    if (product) {
      productFamily.push({
        ...product,
        isParent: true,
        quantityRequired: order.productQuantity || 1,
        components: undefined,
      });

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

    if (part) {
      productFamily.push({
        ...part,
        isParent: true,
        quantityRequired: 1,
        components: undefined,
      });
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
    const { customerName, shipDate, partNumber, orderNumber } = req.query;
    const commonInclude = {
      customer: true,
      product: {
        select: {
          partNumber: true,
          partDescription: true,
        },
      },
      existingParts: {
        include: {
          part: { select: { partNumber: true, partDescription: true } },
          process: { select: { processName: true } },
        },
      },
      customPart: {
        include: {
          process: { select: { processName: true } },
        },
      },
    };

    const andConditions = [{ isDeleted: false }];
    if (orderNumber) {
      andConditions.push({ orderNumber: { contains: orderNumber.trim() } });
    }

    if (customerName) {
      const name = customerName.trim();
      andConditions.push({
        OR: [
          { customerName: { contains: name } },
          {
            customer: {
              OR: [
                { firstName: { contains: name } },
                { lastName: { contains: name } },
              ],
            },
          },
        ],
      });
    }

    if (shipDate) {
      const date = new Date(shipDate);
      const nextDay = new Date(shipDate);
      nextDay.setDate(date.getDate() + 1);
      andConditions.push({ shipDate: { gte: date, lt: nextDay } });
    }
    if (partNumber) {
      const pNum = partNumber.trim();
      andConditions.push({
        OR: [
          { partNumber: { contains: pNum } },
          {
            existingParts: {
              some: { part: { partNumber: { contains: pNum } } },
            },
          },
          { customPart: { some: { partNumber: { contains: pNum } } } },
        ],
      });
    }
    const orders = await prisma.customOrder.findMany({
      where: { AND: andConditions },
      include: commonInclude,
      orderBy: { createdAt: "desc" },
    });

    const formattedOrders = orders.map((order) => {
      const mappedExisting = order.existingParts.map((ep) => ({
        id: ep.id,
        partId: ep.partId,
        partNumber: ep.part?.partNumber,
        partDescription: ep.part?.partDescription,
        qty: ep.quantity,
        processId: ep.processId,
        processName: ep.process?.processName || "No Process",
        cycleTime: ep.cycleTime,
        workInstruction: ep.instructionRequired ? "Yes" : "No",
        source: "Library",
      }));

      const mappedManual = order.customPart.map((cp) => ({
        id: cp.id,
        partNumber: cp.partNumber,
        qty: cp.quantity,
        processId: cp.processId,
        processName:
          cp.processName || cp.process?.processName || "Manual Process",
        cycleTime: cp.cycleTime,
        workInstruction: cp.workInstruction,
        source: "Manual",
      }));

      return {
        ...order,
        bomList: [...mappedExisting, ...mappedManual],
      };
    });

    return res.status(200).json({
      success: true,
      message:
        orders.length > 0 ? "Orders retrieved successfully" : "No orders found",
      data: formattedOrders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
const stockOrderSchedule = async (req, res) => {
  const ordersToSchedule = req.body;
  try {
    const allPrismaPromises = [];
    const orderIdsToUpdate = new Set();

    for (const order of ordersToSchedule) {
      const {
        order_id,
        product_id,
        part_id,
        quantity,
        delivery_date,
        status,
        type,
      } = order;
      const targetPartId = part_id || product_id;

      if (!order_id || !targetPartId) {
        continue;
      }

      orderIdsToUpdate.add(order_id);
      const productPart = await prisma.partNumber.findUnique({
        where: { part_id: targetPartId },
        include: { process: true },
      });

      const submittedBy =
        req.user.role === "superAdmin"
          ? { submittedByAdmin: { connect: { id: req.user.id } } }
          : { submittedByEmployee: { connect: { id: req.user.id } } };

      if (productPart?.part_id) {
        const productSchedule = prisma.stockOrderSchedule.upsert({
          where: {
            order_id_part_id_order_type: {
              order_id,
              part_id: productPart.part_id,
              order_type: "StockOrder",
            },
          },
          update: {
            delivery_date: new Date(delivery_date),
            quantity: Number(quantity),
            status,
            completed_date: null,
            type,
          },
          create: {
            order_id,
            order_type: "StockOrder",
            delivery_date: new Date(delivery_date),
            quantity: Number(quantity),
            status,
            completed_date: null,
            ...submittedBy,
            part: {
              connect: { part_id: productPart.part_id },
            },
            process: productPart.processId
              ? { connect: { id: productPart.processId } }
              : undefined,
            type,
            scheduleQuantity: Number(quantity),
            remainingQty: Number(quantity),
          },
        });

        allPrismaPromises.push(productSchedule);
      } else {
        console.warn(`Part ID ${targetPartId} not found in database.`);
      }

      if (type === "product") {
        const bomEntries = await prisma.productTree.findMany({
          where: { product_id: targetPartId },
          include: {
            part: {
              include: { process: true },
            },
          },
        });

        const componentSchedulePromises = bomEntries
          .filter((entry) => entry?.part?.part_id)
          .map((entry) => {
            const scheduleQty = Number(quantity) * (entry.quantity || 1);

            return prisma.stockOrderSchedule.upsert({
              where: {
                order_id_part_id_order_type: {
                  order_id,
                  part_id: entry.part.part_id,
                  order_type: "StockOrder",
                },
              },
              update: {
                delivery_date: new Date(delivery_date),
                quantity: scheduleQty,
                status,
                completed_date: null,
              },
              create: {
                order_id,
                order_type: "StockOrder",
                delivery_date: new Date(delivery_date),
                quantity: scheduleQty,
                status,
                completed_date: null,
                ...submittedBy,
                part: {
                  connect: { part_id: entry.part.part_id },
                },
                process: entry.part.processId
                  ? { connect: { id: entry.part.processId } }
                  : undefined,
                type: "part",
                scheduleQuantity: scheduleQty,
                remainingQty: scheduleQty,
              },
            });
          });

        allPrismaPromises.push(...componentSchedulePromises);
      }
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
        message: "Successfully scheduled or updated stock orders.",
        data: newSchedules,
      });
    }

    return res.status(200).json({
      message: "No valid orders found to schedule.",
    });
  } catch (error) {
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
    const result = await prisma.$transaction(async (tx) => {
      const orderIds = new Set();
      const firstItem = partsToSchedule[0];
      const orderData = await tx.customOrder.findUnique({
        where: { id: firstItem.order_id },
        include: { product: true },
      });

      if (orderData && orderData.productId) {
        const submittedBy =
          req.user.role === "superAdmin"
            ? { submittedByAdminId: req.user.id }
            : { submittedByEmployeeId: req.user.id };
        await tx.stockOrderSchedule.upsert({
          where: {
            order_id_part_id_order_type: {
              order_id: orderData.id,
              part_id: orderData.productId,
              order_type: "CustomOrder",
            },
          },
          update: {
            status: "new",
            quantity: orderData.productQuantity,
            scheduleQuantity: orderData.productQuantity,
            remainingQty: orderData.productQuantity,
            delivery_date: new Date(orderData.shipDate),
          },
          create: {
            order_id: orderData.id,
            order_type: "CustomOrder",
            part_id: orderData.productId,
            quantity: orderData.productQuantity,
            scheduleQuantity: orderData.productQuantity,
            remainingQty: orderData.productQuantity,
            delivery_date: new Date(orderData.shipDate),
            status: "new",
            type: "product",
            processId: orderData.product?.processId || null,
            ...submittedBy,
          },
        });
      }

      for (const item of partsToSchedule) {
        const {
          order_id,
          customPartId,
          type,
          quantity,
          delivery_date,
          part_id,
        } = item;

        if (part_id === orderData?.productId) continue;

        let processId = null;
        if (type === "Existing" || type === "Library") {
          const existingRecord = await tx.customOrderExistingPart.findUnique({
            where: { id: customPartId },
          });
          processId = existingRecord?.processId;
        } else {
          const manualRecord = await tx.customPart.findUnique({
            where: { id: customPartId },
          });
          processId = manualRecord?.processId;
        }

        const submittedBy =
          req.user.role === "superAdmin"
            ? { submittedByAdminId: req.user.id }
            : { submittedByEmployeeId: req.user.id };

        await tx.stockOrderSchedule.upsert({
          where: {
            order_id_part_id_order_type: {
              order_id: order_id,
              part_id:
                type === "Existing" || type === "Library"
                  ? part_id
                  : `custom-${customPartId}`,
              order_type: "CustomOrder",
            },
          },
          update: {
            quantity: parseInt(quantity),
            scheduleQuantity: parseInt(quantity),
            remainingQty: parseInt(quantity),
            status: "new",
          },
          create: {
            order_id: order_id,
            order_type: "CustomOrder",
            part_id: type === "Existing" || type === "Library" ? part_id : null,
            customPartId:
              type === "New" || type === "Manual" ? customPartId : null,
            quantity: parseInt(quantity),
            scheduleQuantity: parseInt(quantity),
            remainingQty: parseInt(quantity),
            delivery_date: new Date(delivery_date),
            status: "new",
            type: "part",
            processId: processId,
            ...submittedBy,
          },
        });

        orderIds.add(order_id);
      }
      await tx.customOrder.updateMany({
        where: { id: { in: Array.from(orderIds) } },
        data: { status: "Scheduled" },
      });

      return true;
    });

    return res.status(201).json({
      success: true,
      message: "Parent and components scheduled successfully",
    });
  } catch (error) {
    console.error("Scheduling Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const scheduleStockOrdersList = async (req, res) => {
  try {
    const { search, order_type } = req.query;
    const paginationData = await paginationQuery(req.query);
    const whereClause = { isDeleted: false };

    if (order_type && order_type !== "all") {
      whereClause.order_type = order_type;
    }
    if (search) {
      const searchTerm = search.trim();
      whereClause.OR = [
        { part: { partNumber: { contains: searchTerm } } },
        {
          customPart: {
            partNumber: { contains: searchTerm },
          },
        },
        { status: { contains: searchTerm } },
        {
          part: {
            process: {
              processName: { contains: searchTerm },
            },
          },
        },
        {
          customPart: {
            process: {
              processName: { contains: searchTerm },
            },
          },
        },
      ];
    }

    const [filteredSchedules, totalCount] = await Promise.all([
      prisma.stockOrderSchedule.findMany({
        where: whereClause,
        skip: paginationData.skip,
        take: paginationData.pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          part: { include: { process: true } },
          customPart: { include: { process: true } },
          completedByEmployee: {
            select: { firstName: true, lastName: true, id: true },
          },
        },
      }),
      prisma.stockOrderSchedule.count({ where: whereClause }),
    ]);

    const performerIds = [
      ...new Set(filteredSchedules.map((s) => s.completed_by).filter(Boolean)),
    ];
    const [admins, employees] = await Promise.all([
      prisma.admin.findMany({
        where: { id: { in: performerIds } },
        select: { id: true, name: true },
      }),
      prisma.employee.findMany({
        where: { id: { in: performerIds } },
        select: { id: true, firstName: true, lastName: true },
      }),
    ]);

    const nameMap = new Map();
    admins.forEach((a) => nameMap.set(a.id, `Admin (${a.name})`));
    employees.forEach((e) =>
      nameMap.set(e.id, `${e.firstName} ${e.lastName || ""}`.trim()),
    );

    const stockOrderIds = [
      ...new Set(
        filteredSchedules
          .filter((s) => s.order_type === "StockOrder")
          .map((s) => s.order_id),
      ),
    ];
    const customOrderIds = [
      ...new Set(
        filteredSchedules
          .filter((s) => s.order_type === "CustomOrder")
          .map((s) => s.order_id),
      ),
    ];

    const [stockOrders, customOrders] = await Promise.all([
      stockOrderIds.length > 0
        ? prisma.stockOrder.findMany({ where: { id: { in: stockOrderIds } } })
        : [],
      customOrderIds.length > 0
        ? prisma.customOrder.findMany({
            where: { id: { in: customOrderIds } },
            include: { product: { select: { partNumber: true } } },
          })
        : [],
    ]);

    const stockMap = new Map(stockOrders.map((o) => [o.id, o]));
    const customMap = new Map(customOrders.map((o) => [o.id, o]));

    const finalData = filteredSchedules.map((schedule) => {
      const type = schedule.order_type?.replace(/\s/g, "");
      const orderDetails =
        type === "StockOrder"
          ? stockMap.get(schedule.order_id)
          : customMap.get(schedule.order_id);
      const displayCompletedBy =
        nameMap.get(schedule.completed_by) || schedule.completed_by || "N/A";
      const stationWorkerName = schedule.completedByEmployee
        ? `${schedule.completedByEmployee.firstName} ${schedule.completedByEmployee.lastName || ""}`.trim()
        : "N/A";

      return {
        ...schedule,
        completed_by: displayCompletedBy,
        completedEmployeeName: stationWorkerName,
        order: orderDetails,
        partDetails: {
          partNumber:
            schedule.customPart?.partNumber ||
            schedule.part?.partNumber ||
            "N/A",
          description:
            schedule.part?.partDescription ||
            (schedule.customPart ? "Manual Entry" : "N/A"),
          source: schedule.customPart ? "Manual" : "Library",
          processName:
            schedule.customPart?.process?.processName ||
            schedule.part?.process?.processName ||
            "No Process",
        },
      };
    });

    return res.status(200).json({
      success: true,
      message: "Orders retrieved successfully",
      data: finalData,
      pagination: await pagination({
        page: paginationData.page,
        pageSize: paginationData.pageSize,
        total: totalCount,
      }),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
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
      (file) => file?.fieldname === "profileImg",
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

    const orders = await prisma.supplier_orders.findMany({
      where: filterConditions,
      orderBy: {
        createdAt: "desc",
      },
      skip: paginationData.skip,
      take: paginationData.pageSize,
      select: {
        id: true,
        order_number: true,
        order_date: true,
        supplier_id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        need_date: true,
        createdBy: true,
        isDeleted: true,
        createdAt: true,
        part_id: true,
      },
    });

    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
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
      }),
    );

    const totalCount = await prisma.supplier_orders.count({
      where: filterConditions,
    });

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
    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const updateSupplierOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, quantity, part_id } = req.body;
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

const validateStockQty = async (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || !quantity) {
    return res
      .status(400)
      .json({ success: false, message: "Product ID and quantity required." });
  }

  try {
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
      message: ` Available quantity: ${availStock}. You can add maximum ${maxAddableQty}.`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
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
        },
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
    res.status(500).json({ message: "Internal Server Error" });
  }
};
const getLowStockParts = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);
    const { search = "", sort = "" } = req.query;

    const orConditions = [];
    if (search) {
      orConditions.push(
        { partNumber: { contains: search } },
        { partDescription: { contains: search } },
        { partFamily: { contains: search } },
      );
    }

    const whereFilter = {
      isDeleted: false,
      availStock: {
        lte: prisma.partNumber.fields.minStock,
      },
      ...(orConditions.length > 0 ? { OR: orConditions } : {}),
    };

    let orderBy = { createdAt: "desc" };
    if (sort === "oldest") {
      orderBy = { createdAt: "asc" };
    }

    const [inventoryData, totalCount] = await Promise.all([
      prisma.partNumber.findMany({
        where: whereFilter,
        orderBy,
        skip: paginationData.skip,
        take: paginationData.pageSize,
        select: {
          part_id: true,
          partNumber: true,
          partDescription: true,
          partFamily: true,
          availStock: true,
          minStock: true,
          cost: true,
          type: true,
          createdAt: true,
          companyName: true,
          supplier: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.partNumber.count({
        where: whereFilter,
      }),
    ]);

    const getPagination = await pagination({
      page: paginationData.page,
      pageSize: paginationData.pageSize,
      total: totalCount,
    });

    return res.status(200).json({
      message: "Low Stock Parts retrieved successfully!",
      data: inventoryData,
      totalCount,
      pagination: getPagination,
    });
  } catch (err) {
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
  }
};

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

    const vacationRequests = await prisma.vacationRequest.findMany({
      where: {
        ...(queryEmployeeId && { employeeId: queryEmployeeId }),
        status: "APPROVED",
        isDeleted: false,
      },
    });
    switch (filter) {
      case "This Week":
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(
          now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1),
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
      orderBy: { timestamp: "asc" },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    const getMs = (date) => (date ? new Date(date).getTime() : 0);

    const groupedByDate = allEvents.reduce((acc, event) => {
      const dateKey = new Date(event.timestamp).toISOString().split("T")[0];

      if (!acc[dateKey]) {
        const matchedVacation = vacationRequests.find((v) => {
          const vStart = new Date(v.startDate).toISOString().split("T")[0];
          const vEnd = new Date(v.endDate).toISOString().split("T")[0];
          return (
            v.employeeId === event.employeeId &&
            dateKey >= vStart &&
            dateKey <= vEnd
          );
        });

        acc[dateKey] = {
          date: dateKey,
          employeeName:
            `${event.employee?.firstName || ""} ${event.employee?.lastName || ""}`.trim(),
          employeeEmail: event.employee?.email || "",
          loginTime: null,
          rawLogin: null,
          lunchStart: null,
          rawLunchStart: null,
          lunchEnd: null,
          rawLunchEnd: null,
          logout: null,
          rawLogout: null,
          exceptionStart: null,
          rawExStart: null,
          exceptionEnd: null,
          rawExEnd: null,
          vacationStatus: matchedVacation ? "APPROVED" : "-",
          vacationHours: matchedVacation
            ? Number(matchedVacation.hours || 0)
            : 0,
        };
      }

      switch (event.eventType) {
        case "CLOCK_IN":
          acc[dateKey].loginTime = formatTime(event.timestamp);
          acc[dateKey].rawLogin = event.timestamp;
          break;
        case "START_LUNCH":
          acc[dateKey].lunchStart = formatTime(event.timestamp);
          acc[dateKey].rawLunchStart = event.timestamp;
          break;
        case "END_LUNCH":
          acc[dateKey].lunchEnd = formatTime(event.timestamp);
          acc[dateKey].rawLunchEnd = event.timestamp;
          break;
        case "CLOCK_OUT":
          acc[dateKey].logout = formatTime(event.timestamp);
          acc[dateKey].rawLogout = event.timestamp;
          break;
        case "START_EXCEPTION":
          acc[dateKey].exceptionStart = formatTime(event.timestamp);
          acc[dateKey].rawExStart = event.timestamp;
          break;
        case "END_EXCEPTION":
          acc[dateKey].exceptionEnd = formatTime(event.timestamp);
          acc[dateKey].rawExEnd = event.timestamp;
          break;
      }
      return acc;
    }, {});

    let timeSheetData = Object.values(groupedByDate).map((entry) => {
      let workMs = 0;
      if (entry.rawLogin && entry.rawLogout) {
        workMs = getMs(entry.rawLogout) - getMs(entry.rawLogin);

        if (entry.rawLunchStart && entry.rawLunchEnd) {
          workMs -= getMs(entry.rawLunchEnd) - getMs(entry.rawLunchStart);
        }
        if (entry.rawExStart && entry.rawExEnd) {
          workMs -= getMs(entry.rawExEnd) - getMs(entry.rawExStart);
        }
      }

      const workHours = Math.max(0, workMs / (1000 * 60 * 60));
      const totalHours = workHours + entry.vacationHours;

      return {
        ...entry,
        workHours: workHours.toFixed(2),
        vacationHours: entry.vacationHours.toFixed(2),
        totalHours: totalHours.toFixed(2),
        rawLogin: undefined,
        rawLogout: undefined,
        rawLunchStart: undefined,
        rawLunchEnd: undefined,
        rawExStart: undefined,
        rawExEnd: undefined,
      };
    });

    if (search) {
      const lowercasedSearch = search.toLowerCase();
      timeSheetData = timeSheetData.filter(
        (entry) =>
          entry.date.includes(lowercasedSearch) ||
          entry.employeeName.toLowerCase().includes(lowercasedSearch),
      );
    }

    const totalCount = timeSheetData.length;
    const paginatedData = timeSheetData.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    );

    return res.status(200).json({
      message: "Employee timesheet retrieved successfully!",
      data: paginatedData,
      totalCounts: totalCount,
      pagination: {
        page: currentPage,
        totalPages: Math.ceil(totalCount / itemsPerPage),
      },
    });
  } catch (error) {
    return res.status(500).send({ message: "Internal Server Error" });
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
    const { search = "", filter = "" } = req.query;

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
          id: true,
          cycleTimeStart: true,
          cycleTimeEnd: true,
          submittedDateTime: true,
          process: {
            select: {
              processName: true,
              machineName: true,
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
          submittedDateTime: "desc",
        },
      }),
      prisma.productionResponse.count({
        where: whereFilter,
      }),
    ]);

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
        machineName: item.process?.machineName || "N/A",
        hours: readableDuration,
        vacationDate: submittedDate.toISOString().split("T")[0],
        createDate: createDate.toISOString().split("T")[0],
        vacationHours: readableDuration,
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
        employee: true,
      },
    });
    if (!user) {
      return res.status(400).send({ message: "Employee not found" });
    }

    const fullName = `${user.employee?.firstName || ""} ${
      user.employee?.lastName || ""
    }`.trim();
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

    await sendMail(
      "send-employee-vacation-req-status",
      {
        "%name%": fullName || "Employee",
        "%status%": status,
        "%statusMessage%": statusMessage,
        "%statusColor%": statusColor,
        "%statusBgColor%": statusBgColor,
      },
      email,
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

const getDayRange = (dateString) => {
  const startOfDay = moment(dateString).startOf("day").toDate();
  const endOfDay = moment(dateString).endOf("day").toDate();
  return { startOfDay, endOfDay };
};
const productionOverview = async (req, res) => {
  try {
    const dateQuery = req.query.date || moment().format("YYYY-MM-DD");
    const { startOfDay, endOfDay } = getDayRange(dateQuery);
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
        scrap: true,
      },
    });

    console.log(`Found ${productionResponses.length} records for this date.`);
    const totalActual = productionResponses.reduce(
      (sum, item) => sum + (Number(item.completedQuantity) || 0),
      0,
    );

    const totalScrap = productionResponses.reduce(
      (sum, item) => sum + (Number(item.scrap) || 0),
      0,
    );
    const currentHour = moment().hour();
    let shift = 1;
    if (currentHour >= 6 && currentHour < 14) shift = 1;
    else if (currentHour >= 14 && currentHour < 22) shift = 2;
    else shift = 3;

    res.json({
      hourByHour: [
        { label: "Shift", value: shift, image: "green.png" },
        { label: "Actual", value: totalActual, image: "yellow.png" },
        { label: "Scrap", value: totalScrap, image: "orange.png" },
      ],
      pieChartData: [
        { name: "Actual", value: totalActual, color: "#4CAF50" },
        { name: "Scrap", value: totalScrap, color: "#FFC107" },
      ],
    });
  } catch (error) {
    console.error("Error fetching overview:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
function parseCycleTime(cycleTimeStr) {
  if (!cycleTimeStr) return 0;

  const minutes = Number(cycleTimeStr.trim());
  return isNaN(minutes) ? 0 : minutes;
}
const processHourly = async (req, res) => {
  try {
    const tz = req.query.tz || "UTC";
    const selectedDate = req.query.date || moment().tz(tz).format("YYYY-MM-DD");
    const startOfDay = moment.tz(selectedDate, tz).startOf("day").toDate();
    const endOfDay = moment.tz(selectedDate, tz).endOf("day").toDate();
    const activeProcesses = await prisma.process.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        processName: true,
        machineName: true,
        cycleTime: true,
      },
    });

    const allProcessData = [];
    let grandTotalActual = 0;
    let grandTotalScrap = 0;
    let grandTotalTarget = 0;

    for (const process of activeProcesses) {
      const [productionResponses, scrapEntriesRecords] = await Promise.all([
        prisma.productionResponse.findMany({
          where: {
            processId: process.id,
            OR: [
              { submittedDateTime: { gte: startOfDay, lte: endOfDay } },
              { createdAt: { gte: startOfDay, lte: endOfDay } },
            ],
            isDeleted: false,
          },
          include: { employeeInfo: true },
        }),
        prisma.scapEntries.findMany({
          where: {
            processId: process.id,
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
            isDeleted: false,
          },
          include: { createdByEmployee: true },
        }),
      ]);

      const cycleTimeMinutes = process.cycleTime
        ? parseCycleTime(process.cycleTime)
        : 0;
      const hourlyDataMap = new Map();
      let processTotalActual = 0;
      let processTotalScrap = 0;
      const employeesSet = new Map();
      for (let h = 0; h < 24; h++) {
        const hourKey = `${h.toString().padStart(2, "0")}:00`;
        hourlyDataMap.set(hourKey, {
          actual: 0,
          scrap: 0,
          target: cycleTimeMinutes > 0 ? Math.round(60 / cycleTimeMinutes) : 0,
        });
      }

      productionResponses.forEach((resData) => {
        const entryTime = resData.submittedDateTime || resData.createdAt;
        const hour = moment(entryTime).tz(tz).format("HH:00");

        const qty = Number(resData.completedQuantity) || 0;
        const scrapQty = Number(resData.scrapQuantity) || 0;

        if (hourlyDataMap.has(hour)) {
          hourlyDataMap.get(hour).actual += qty;
          hourlyDataMap.get(hour).scrap += scrapQty;
        }

        processTotalActual += qty;
        processTotalScrap += scrapQty;

        if (resData.employeeInfo) {
          employeesSet.set(resData.employeeInfo.id, {
            name: `${resData.employeeInfo.firstName} ${resData.employeeInfo.lastName}`,
            profileImage: resData.employeeInfo.employeeProfileImg || "",
          });
        }
      });

      scrapEntriesRecords.forEach((scrap) => {
        const hour = moment(scrap.createdAt).tz(tz).format("HH:00");
        const sQty = Number(
          scrap.returnQuantity || scrap.scrapQuantity || scrap.quantity || 0,
        );

        if (hourlyDataMap.has(hour)) {
          hourlyDataMap.get(hour).scrap += sQty;
        }
        processTotalScrap += sQty;

        if (scrap.createdByEmployee) {
          employeesSet.set(scrap.createdByEmployee.id, {
            name: `${scrap.createdByEmployee.firstName} ${scrap.createdByEmployee.lastName}`,
            profileImage: scrap.createdByEmployee.employeeProfileImg || "",
          });
        }
      });

      const hourlyData = Array.from(hourlyDataMap.entries()).map(
        ([hour, data]) => ({
          hour,
          actual: data.actual,
          scrap: data.scrap,
          target: data.target,
        }),
      );

      const targetPerHour =
        cycleTimeMinutes > 0 ? Math.round(60 / cycleTimeMinutes) : 0;
      const totalTarget = targetPerHour * 24;

      grandTotalActual += processTotalActual;
      grandTotalScrap += processTotalScrap;
      grandTotalTarget += totalTarget;

      allProcessData.push({
        processName: process.processName,
        machineName: process.machineName,
        hourlyData,
        total: {
          actual: processTotalActual,
          scrap: processTotalScrap,
          target: totalTarget,
        },
        employees: Array.from(employeesSet.values()),
      });
    }

    return res.json({
      allProcessData,
      grandTotals: {
        actual: grandTotalActual,
        scrap: grandTotalScrap,
        target: grandTotalTarget,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
const liveProductionGoalBoard = async (req, res) => {
  try {
    const { startOfDay, endOfDay } = getDayRange(
      req.query.date || moment().format("YYYY-MM-DD"),
    );

    const currentHour = moment().hour();
    const { shiftNumber, shiftLabel } = getShiftInfo(currentHour);

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

      const hourlyBreakdownMap = new Map();

      for (let h = 0; h < 24; h++) {
        const hourKey = moment().hour(h).format("HH");
        let targetValue = 0;
        if (process.ratePerHour) {
          targetValue = process.ratePerHour;
        } else if (process.cycleTime) {
          const cycleTimeMinutes = parseFloat(process.cycleTime);
          if (!isNaN(cycleTimeMinutes) && cycleTimeMinutes > 0) {
            targetValue = Math.round(60 / cycleTimeMinutes);
          }
        }
        hourlyBreakdownMap.set(hourKey, {
          hour: parseInt(hourKey),
          target: targetValue,
          actual: 0,
          scrap: 0,
          employees: new Map(),
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
      const hourlyDataArray = Array.from(hourlyBreakdownMap.values())
        .map((hourEntry) => ({
          hour: hourEntry.hour,
          target: hourEntry.target,
          actual: hourEntry.actual,
          scrap: hourEntry.scrap,
          employees: Array.from(hourEntry.employees.values()),
        }))
        .sort((a, b) => a.hour - b.hour);

      processesHourlyData.push({
        processId: process.id,
        processName: process.processName,
        hourlyBreakdown: hourlyDataArray,
        totalActual: processActual,
        totalScrap: processScrap,
      });
    }

    const responseData = {
      summary: {
        shift: shiftNumber,
        shiftLabel: shiftLabel,
        totalActual: totalActualOverall,
        totalScrap: totalScrapOverall,
      },
      pieChartData: [
        { name: "Actual", value: totalActualOverall, color: "#4CAF50" },
        { name: "Scrap", value: totalScrapOverall, color: "#FFC107" },
      ],
      hourlyProductionByProcess: processesHourlyData,
    };

    res.json(responseData);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};

const currentStatusOverview = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = { isDeleted: false };

    if (startDate && endDate) {
      dateFilter.startDateTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const stockOrders = await prisma.stockOrderSchedule.findMany({
      where: dateFilter,
      include: {
        part: {
          select: {
            partDescription: true,
          },
        },
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
    });

    let totalActual = 0;
    let totalScrap = 0;
    let totalScheduled = 0;
    const processDetails = [];

    for (const order of stockOrders) {
      const process = order.process;
      const cycleTimeMinutes = parseCycleTime(process?.cycleTime);
      const targetPerHour = cycleTimeMinutes
        ? Math.round(60 / cycleTimeMinutes)
        : process?.ratePerHour || 0;

      const actual = order.completedQuantity || 0;
      const scrap = order.scrapQuantity || 0;
      const scheduled = order.scheduleQuantity || 0;
      totalActual += actual;
      totalScrap += scrap;
      totalScheduled += scheduled;

      const efficiency =
        targetPerHour > 0 ? ((actual / targetPerHour) * 100).toFixed(1) : 0;
      const productivity =
        scheduled > 0 ? ((actual / scheduled) * 100).toFixed(1) : 0;

      processDetails.push({
        processName: process?.processName,
        machineName: process?.machineName,
        partId: order.part_id,
        partDescription: order?.part?.partDescription,
        scheduled,
        actual,
        scrap,
        remaining: order.remainingQty,
        targetPerHour,
        efficiency: efficiency + "%",
        productivity: productivity + "%",
        startDate: order.startDateTime,
      });
    }

    res.json({
      summary: {
        totalActual,
        totalScrap,
        totalScheduled,
        totalOrders: stockOrders.length,
      },
      details: processDetails,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};

const currentQualityStatusOverview = async (req, res) => {
  try {
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
    startOfWeek.setDate(now.getDate() - now.getDay());
    const lastWeek = new Date(startOfWeek);
    lastWeek.setDate(startOfWeek.getDate() - 7);

    let totalActual = 0;
    let totalScrap = 0;
    let lastWeekActual = 0;
    let lastWeekScrap = 0;

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

    const scrapByProcess = Object.entries(scrapByProcessMap).map(
      ([process, scrap]) => ({
        process,
        scrap,
      }),
    );

    const scrapCost = totalScrap * 10000;

    res.json({
      actual: totalActual,
      scrap: totalScrap,
      scrapCost,
      diffActual: totalActual - lastWeekActual,
      diffScrap: totalScrap - lastWeekScrap,
      scrapByProcess,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};

const monitorChartsData = async (req, res) => {
  try {
    const today = new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);

    const manualData = await prisma.stockOrderSchedule.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        isDeleted: false,
      },
      include: {
        part: { select: { partNumber: true, partDescription: true } },
        process: { select: { processName: true, machineName: true } },
      },
    });

    const manualGrouped = {};
    manualData.forEach((item) => {
      const partName =
        item.part?.partDescription || item.part?.partNumber || "N/A";
      const processName = item.process?.processName || "N/A";
      const machineName = item.process?.machineName || "N/A";
      const key = `${item.processId}-${partName}`;

      if (!manualGrouped[key]) {
        manualGrouped[key] = {
          process: processName,
          machineName: machineName,
          part: partName,
          qty: 0,
          scrap: 0,
        };
      }
      manualGrouped[key].qty += item.quantity || 0;
      manualGrouped[key].scrap += item.scrapQuantity || 0;
    });

    const productionData = await prisma.productionResponse.findMany({
      where: {
        isDeleted: false,
        createdAt: { gte: start, lte: end },
      },
      include: {
        PartNumber: { select: { partNumber: true, partDescription: true } },
        process: {
          select: {
            processName: true,
            machineName: true,
            processDesc: true,
            cycleTime: true,
          },
        },
      },
    });

    const monitorGrouped = {};
    const scrapGrouped = {};

    productionData.forEach((item) => {
      const currentPartName =
        item.PartNumber?.partDescription ||
        item.PartNumber?.partNumber ||
        "N/A";
      const processName = item.process?.processName || "N/A";
      const machineName = item.process?.machineName || "N/A";
      const key = `${processName}-${currentPartName}`;

      if (!monitorGrouped[key]) {
        monitorGrouped[key] = {
          processName,
          machineName,
          processDesc: item.process?.processDesc || "",
          part: currentPartName,
          actualCycleTime: item.process?.cycleTime || "0",
          totalCycleTime: 0,
          count: 0,
        };
      }
      if (item.cycleTimeStart && item.cycleTimeEnd) {
        const diffMin =
          (new Date(item.cycleTimeEnd) - new Date(item.cycleTimeStart)) / 60000;
        monitorGrouped[key].totalCycleTime += Math.max(0, diffMin);
        monitorGrouped[key].count += 1;
      }

      if (!scrapGrouped[key]) {
        scrapGrouped[key] = {
          processName,
          machineName,
          part: currentPartName,
          scrap: 0,
        };
      }
      scrapGrouped[key].scrap += item.scrapQuantity || 0;
    });

    const manualTable = Object.values(manualGrouped);

    const monitorTable = Object.values(monitorGrouped).map((row) => ({
      processName: row.processName,
      machineName: row.machineName,
      processDesc: row.processDesc,
      part: row.part,
      actualCycleTime: row.actualCycleTime,
      cycleTime:
        row.count > 0 ? (row.totalCycleTime / row.count).toFixed(2) : "--",
    }));

    const productionScrap = Object.values(scrapGrouped).sort(
      (a, b) => b.scrap - a.scrap,
    );

    const totals = {
      totalCompletedQty: manualData.reduce(
        (sum, item) => sum + (item.completedQuantity || 0),
        0,
      ),
      totalScrapQty: manualData.reduce(
        (sum, item) => sum + (item.scrapQuantity || 0),
        0,
      ),
    };

    return res.status(200).json({
      manualTable,
      monitorTable,
      productionScrap,
      totals,
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal Error",
      details: error.message,
    });
  }
};
const getDiveApi = async (req, res) => {
  try {
    const { processId, startDate, endDate, employeeId, partId } = req.query;

    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const filterCondition = {
      isDeleted: false,
      ...(processId && processId !== "All" && { processId }),
      ...(partId && partId !== "All" && { partId: partId }),
      ...(employeeId && employeeId !== "All" && { stationUserId: employeeId }),
      submittedDateTime: { gte: start, lte: end },
    };

    const productions = await prisma.productionResponse.findMany({
      where: filterCondition,
      include: {
        process: true,
        PartNumber: true,
        StockOrder: true,
        CustomOrder: true,
        employeeInfo: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const orderIds = [
      ...new Set(productions.map((p) => p.orderId).filter(Boolean)),
    ];

    const schedules = await prisma.stockOrderSchedule.findMany({
      where: {
        order_id: { in: orderIds },
        isDeleted: false,
      },
      include: {
        part: { select: { part_id: true, partNumber: true } },
        customPart: { select: { id: true, partNumber: true } },
      },
    });

    const employeeMap = {};
    const topPerformanceMap = {};

    const orderData = productions.map((record) => {
      const scheduled = Number(record.scheduleQuantity || 0);
      const actual = Number(record.completedQuantity || 0);
      const scrap = Number(record.scrapQuantity || 0);

      let displayPartNumber =
        record.PartNumber?.partNumber ||
        record.StockOrder?.productNumber ||
        record.CustomOrder?.partNumber;

      if (!displayPartNumber) {
        const matchSchedule = schedules.find(
          (s) =>
            s.order_id === record.orderId &&
            (s.part_id === record.partId || s.processId === record.processId),
        );
        displayPartNumber =
          matchSchedule?.part?.partNumber ||
          matchSchedule?.customPart?.partNumber;
      }

      displayPartNumber = displayPartNumber || "N/A";
      const productivity =
        scheduled > 0 ? ((actual - scrap) / scheduled) * 100 : 0;
      const efficiency = scheduled > 0 ? (actual / scheduled) * 100 : 0;
      let cycleTime = 0;
      if (record.cycleTimeStart && record.cycleTimeEnd && actual > 0) {
        const startT = new Date(record.cycleTimeStart).getTime();
        const endT = new Date(record.cycleTimeEnd).getTime();
        cycleTime = (endT - startT) / (1000 * 60) / actual;
      }

      const empId = record.employeeInfo?.id || "admin";
      const empName = record.employeeInfo
        ? `${record.employeeInfo.firstName} ${record.employeeInfo.lastName}`
        : "Admin";
      const empKey = `${empId}_${record.process?.id || "no_process"}`;
      if (!employeeMap[empKey]) {
        employeeMap[empKey] = {
          processName: record.process?.processName || "N/A",
          machineName: record.process?.machineName || "N/A",
          employeeName: empName,
          totalScheduled: 0,
          totalCompleted: 0,
          totalScrap: 0,
          totalCT: 0,
          count: 0,
        };
      }
      employeeMap[empKey].totalScheduled += scheduled;
      employeeMap[empKey].totalCompleted += actual;
      employeeMap[empKey].totalScrap += scrap;
      employeeMap[empKey].totalCT += cycleTime;
      employeeMap[empKey].count += actual > 0 ? 1 : 0;

      if (!topPerformanceMap[empId]) {
        topPerformanceMap[empId] = {
          employeeName: empName,
          totalScheduled: 0,
          totalCompleted: 0,
          totalScrap: 0,
        };
      }
      topPerformanceMap[empId].totalScheduled += scheduled;
      topPerformanceMap[empId].totalCompleted += actual;
      topPerformanceMap[empId].totalScrap += scrap;

      return {
        orderType: record.order_type || "StockOrder",
        processName: record.process?.processName || "N/A",
        machineName: record.process?.machineName || "N/A",
        partNumber: displayPartNumber,
        scheduled,
        actual,
        scrap,
        productivity: productivity.toFixed(1) + "%",
        efficiency: efficiency.toFixed(1) + "%",
        avgCycleTime: cycleTime.toFixed(2) + " min",
        employee: empName,
        createdAt: record.createdAt,
      };
    });

    const productivitySummary = Object.values(employeeMap).map((emp) => ({
      processName: emp.processName,
      machineName: emp.machineName,
      employeeName: emp.employeeName,
      Qty: emp.totalCompleted,
      Scrap: emp.totalScrap,
      CT: emp.count > 0 ? (emp.totalCT / emp.count).toFixed(2) : "0.00",
      Eff:
        emp.totalScheduled > 0
          ? ((emp.totalCompleted / emp.totalScheduled) * 100).toFixed(1) + "%"
          : "0.0%",
      Prod:
        emp.totalScheduled > 0
          ? (
              ((emp.totalCompleted - emp.totalScrap) / emp.totalScheduled) *
              100
            ).toFixed(1) + "%"
          : "0.0%",
    }));

    const topPerformers = Object.values(topPerformanceMap)
      .map((emp) => {
        const effNum =
          emp.totalScheduled > 0
            ? (emp.totalCompleted / emp.totalScheduled) * 100
            : 0;
        return {
          employeeName: emp.employeeName,
          totalEfficiency: effNum.toFixed(1) + "%",
          totalQty: emp.totalCompleted,
          totalScrap: emp.totalScrap,
          _sortVal: effNum,
        };
      })
      .sort((a, b) => b._sortVal - a._sortVal);

    return res.status(200).json({
      message: "Data fetched successfully",
      totalRecords: orderData.length,
      data: orderData,
      productivity: productivitySummary,
      topPerformers,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};
const cycleTimeComparisionData = async (req, res) => {
  try {
    let { startDate, endDate, partId } = req.query;
    if (!partId) {
      return res.status(400).json({ error: "partId is required" });
    }
    const today = new Date().toISOString().split("T")[0];
    startDate = startDate;
    endDate = endDate;
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start) || isNaN(end)) {
      return res
        .status(400)
        .json({ error: "Invalid date format (YYYY-MM-DD)" });
    }
    const productionResponses = await prisma.productionResponse.findMany({
      where: {
        partId,
        isDeleted: false,
      },
      include: {
        process: { select: { processName: true, machineName: true } },
        PartNumber: { select: { cycleTime: true } },
      },
    });

    const grouped = {};
    productionResponses.forEach((resp) => {
      if (!grouped[resp.processId]) {
        grouped[resp.processId] = {
          processName: resp.process?.processName,
          machineName: resp.process?.machineName,
          manualCTs: [],
          idealCT: resp.PartNumber?.cycleTime
            ? Number(resp.PartNumber.cycleTime) / 60
            : 0,
        };
      }

      if (resp.cycleTimeStart && resp.cycleTimeEnd) {
        const ct =
          (new Date(resp.cycleTimeEnd) - new Date(resp.cycleTimeStart)) /
          1000 /
          60;
        grouped[resp.processId].manualCTs.push(ct);
      }
    });

    const processWiseCT = Object.values(grouped).map((p) => ({
      processName: p.processName,
      machineName: p.machineName,
      manualCT:
        p.manualCTs.length > 0
          ? p.manualCTs.reduce((a, b) => a + b, 0) / p.manualCTs.length
          : 0,
      idealCT: p.idealCT,
    }));
    const stepTrackings = await prisma.productionStepTracking.findMany({
      where: {
        status: "completed",
        stepStartTime: { not: null },
        stepEndTime: { not: null },
      },
      include: {
        productionResponse: {
          select: {
            partId: true,
          },
        },
        workInstructionStep: {
          select: {
            id: true,
            stepNumber: true,
            title: true,
          },
        },
      },
    });
    const stepGrouped = {};

    stepTrackings.forEach((st) => {
      const duration =
        (new Date(st.stepEndTime) - new Date(st.stepStartTime)) / 1000 / 60;

      const stepId = st.workInstructionStep?.id;
      if (!stepId) return;

      if (!stepGrouped[stepId]) {
        stepGrouped[stepId] = {
          stepId,
          stepTitle: st.workInstructionStep.title,
          stepNumber: st.workInstructionStep.stepNumber,
          durations: [],
        };
      }

      stepGrouped[stepId].durations.push(duration);
    });

    const stepAverages = Object.values(stepGrouped).map((s) => ({
      stepId: s.stepId,
      stepTitle: s.stepTitle,
      stepNumber: s.stepNumber,
      averageDuration:
        s.durations.reduce((a, b) => a + b, 0) / s.durations.length,
      count: s.durations.length,
    }));

    const allDurations = stepAverages.flatMap((s) => s.averageDuration);
    const overallAverage =
      stepAverages.length > 0
        ? stepAverages.reduce((sum, s) => sum + s.averageDuration, 0) /
          stepAverages.length
        : 0;

    res.json({
      message: "Cycle Time Comparison fetched successfully",
      data: {
        processWiseCT,
        stepWiseCT: {
          stepAverages,
          overallAverage,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
};
const dashBoardData = async (req, res) => {
  try {
    const { month } = req.query;
    const now = new Date();
    const year = now.getFullYear();
    let currentStart, currentEnd;
    if (month) {
      const monthNum = parseInt(month);
      currentStart = new Date(year, monthNum - 1, 1, 0, 0, 0);
      currentEnd = new Date(year, monthNum, 0, 23, 59, 59);
    } else {
      currentStart = startOfMonth(now);
      currentEnd = endOfMonth(now);
    }

    const lastMonthStart = startOfMonth(subMonths(currentStart, 1));
    const lastMonthEnd = endOfMonth(subMonths(currentStart, 1));
    const getStats = (current, previous, reverse = false) => {
      let percent = 0;
      if (previous > 0) {
        percent = ((current - previous) / previous) * 100;
      } else if (current > 0) {
        percent = 100;
      }
      let indicator = "gray";
      if (percent > 0) indicator = reverse ? "red" : "green";
      if (percent < 0) indicator = reverse ? "green" : "red";
      return { percent: percent.toFixed(2), indicator };
    };

    const splitName = (fullName) => {
      const parts = (fullName || "N/A").trim().split(" ");
      return {
        firstName: parts[0] || "N/A",
        lastName: parts.slice(1).join(" ") || "N/A",
      };
    };
    const [stockOrdersAll, customOrdersAll] = await Promise.all([
      prisma.stockOrder.findMany({ where: { isDeleted: false } }),
      prisma.customOrder.findMany({ where: { isDeleted: false } }),
    ]);

    const orderMap = {};
    stockOrdersAll.forEach((o) => {
      orderMap[o.id] = o;
    });
    customOrdersAll.forEach((o) => {
      orderMap[o.id] = o;
    });

    const productionResponses = await prisma.productionResponse.findMany({
      where: {
        isDeleted: false,
        submittedDateTime: { gte: currentStart, lte: currentEnd },
      },
      include: { process: true, employeeInfo: true, PartNumber: true },
      orderBy: { submittedDateTime: "desc" },
    });

    const productivityData = productionResponses.map((record) => {
      const completedQty = record.completedQuantity || 0;
      const scrapQuantity = record.scrapQuantity || 0;
      const partCost = parseFloat(record.PartNumber?.cost || 0);
      const completedPartCost = completedQty * partCost;

      let actualCycleTimePerUnit = 0;
      let totalTimeSpentMinutes = 0;

      if (record.cycleTimeStart && record.cycleTimeEnd) {
        const start = new Date(record.cycleTimeStart).getTime();
        const end = new Date(record.cycleTimeEnd).getTime();
        totalTimeSpentMinutes = (end - start) / (1000 * 60);
        if (completedQty > 0 && totalTimeSpentMinutes > 0) {
          actualCycleTimePerUnit = totalTimeSpentMinutes / completedQty;
        }
      }

      const standardCT = record.process?.cycleTime
        ? parseFloat(record.process.cycleTime)
        : 0;
      const efficiency =
        totalTimeSpentMinutes > 0
          ? (
              ((completedQty * standardCT) / totalTimeSpentMinutes) *
              100
            ).toFixed(2)
          : "0.00";

      return {
        process: record.process?.processName || "N/A",
        machineName: record.process?.machineName || "N/A",
        employee: record.employeeInfo?.fullName || "N/A",
        cycleTime: actualCycleTimePerUnit.toFixed(2),
        totalQty: record.scheduleQuantity || 0,
        scrapQuantity: record.scrapQuantity,
        completedQty: completedQty,
        completedPartCost: completedPartCost.toFixed(2),
        productivity:
          record.scheduleQuantity > 0
            ? `${((completedQty / record.scheduleQuantity) * 100).toFixed(2)}%`
            : "0%",
        efficiency: `${efficiency}%`,
      };
    });

    const calcRev = (orders, start, end) =>
      orders
        .filter(
          (o) => new Date(o.orderDate) >= start && new Date(o.orderDate) <= end,
        )
        .reduce(
          (sum, o) =>
            sum + (parseFloat(o.cost) || 0) * (o.productQuantity || 0),
          0,
        );

    const currentRevenue =
      calcRev(stockOrdersAll, currentStart, currentEnd) +
      calcRev(customOrdersAll, currentStart, currentEnd);
    const lastRevenue =
      calcRev(stockOrdersAll, lastMonthStart, lastMonthEnd) +
      calcRev(customOrdersAll, lastMonthStart, lastMonthEnd);

    const parts = await prisma.partNumber.findMany({
      where: { isDeleted: false },
      include: { process: true },
    });
    let totalInventoryCost = 0,
      totalInventoryCount = 0;
    parts.forEach((p) => {
      const extra = (p.availStock || 0) - (p.minStock || 0);
      if (extra > 0) {
        const unitVal =
          (parseFloat(p.cost) || 0) +
          ((p.cycleTime || 0) / 60) * (p.process?.ratePerHour || 0);
        totalInventoryCount += extra;
        totalInventoryCost += extra * unitVal;
      }
    });

    const fetchSchedules = async (start, end) =>
      await prisma.stockOrderSchedule.findMany({
        where: { isDeleted: false, order_date: { gte: start, lte: end } },
        include: { part: true },
      });

    const fetchScrapEntries = async (start, end) =>
      await prisma.scapEntries.findMany({
        where: { isDeleted: false, createdAt: { gte: start, lte: end } },
        include: { PartNumber: true },
      });
    const [currSched, lastSched, currScrapEntries, lastScrapEntries] =
      await Promise.all([
        fetchSchedules(currentStart, currentEnd),
        fetchSchedules(lastMonthStart, lastMonthEnd),
        fetchScrapEntries(currentStart, currentEnd),
        fetchScrapEntries(lastMonthStart, lastMonthEnd),
      ]);

    const getTotals = (recs, entries) => {
      let prod = 0,
        sQty = 0,
        sCost = 0;

      recs.forEach((r) => {
        prod += (r.completedQuantity || 0) - (r.scrapQuantity || 0);
        sQty += r.scrapQuantity || 0;
        sCost += (r.scrapQuantity || 0) * (parseFloat(r.part?.cost) || 0);
      });

      entries.forEach((e) => {
        const qty = Number(e.returnQuantity) || 0;
        const cost = parseFloat(e.PartNumber?.cost) || 0;
        sQty += qty;
        sCost += qty * cost;
      });

      return { prod, sQty, sCost };
    };

    const cT = getTotals(currSched, currScrapEntries);
    const lT = getTotals(lastSched, lastScrapEntries);

    const fulfilledRaw = await prisma.stockOrderSchedule.findMany({
      where: { isDeleted: false, status: "completed" },
      include: { part: true, completedByEmployee: true },
      orderBy: { completed_date: "desc" },
    });

    const fulfilledOrders = {
      list: fulfilledRaw.map((o) => {
        const parent = orderMap[o.order_id];
        const names = splitName(parent?.customerName);
        return {
          date: o.completed_date,
          orderNo: parent?.orderNumber || "N/A",
          firstName: names.firstName,
          lastName: names.lastName,
          product: o.part?.partNumber,
          qty: o.completedQuantity,
          employee: o.completedByEmployee?.fullName || "N/A",
        };
      }),
      total: fulfilledRaw.length,
    };

    const openOrdersList = [
      ...stockOrdersAll
        .filter((o) => o.status !== "completed")
        .map((o) => ({
          ...splitName(o.customerName),
          date: o.orderDate,
          orderNo: o.orderNumber,
          product: o.productNumber,
          qty: o.productQuantity,
          type: "Stock",
        })),
      ...customOrdersAll
        .filter((o) => o.status !== "completed")
        .map((o) => ({
          ...splitName(o.customerName),
          date: o.orderDate,
          orderNo: o.orderNumber,
          product: o.partNumber,
          qty: o.productQuantity,
          type: "Custom",
        })),
    ];

    res.status(200).json({
      productivityData,
      currentRevenue,
      revenueChangePercent: getStats(currentRevenue, lastRevenue).percent,
      revenueIndicator: getStats(currentRevenue, lastRevenue).indicator,
      inventory: {
        totalInventoryCount,
        totalInventoryCost: totalInventoryCost.toFixed(2),
        inventoryChangePercent: "0.00",
        inventoryIndicator: "green",
      },
      production: {
        currentProductionTotal: cT.prod,
        lastProductionTotal: lT.prod,
        productionChangePercent: getStats(cT.prod, lT.prod).percent,
        productionIndicator: getStats(cT.prod, lT.prod).indicator,
      },
      scrap: {
        currentScrapQty: cT.sQty,
        currentScrapCost: cT.sCost.toFixed(2),
        lastScrapCost: lT.sCost.toFixed(2),
        scrapChangePercent: getStats(cT.sQty, lT.sQty, true).percent,
        scrapIndicator: getStats(cT.sQty, lT.sQty, true).indicator,
      },
      openOrders: { total: openOrdersList.length, list: openOrdersList },
      totalOrders: openOrdersList.length,
      fulfilledOrders,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
const dailySchedule = async (req, res) => {
  try {
    const { date, process } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const whereClause = {
      isDeleted: false,
      createdAt: { gte: startOfDay, lte: endOfDay },
    };

    if (process) {
      whereClause.part = { processId: process };
    }
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
                machineName: true,
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
    return res
      .status(500)
      .json({ message: "Something went wrong.", error: error.message });
  }
};
const capacityStatus = async (req, res) => {
  try {
    const getProcess = await prisma.process.findMany({
      where: { isDeleted: false },
    });

    const scheduleData = await prisma.stockOrderSchedule.findMany({
      where: { isDeleted: false },
      include: {
        process: { select: { id: true, processName: true, machineName: true } },
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

        const productionCompletedQty = productionResponses.reduce(
          (sum, p) => sum + Number(p.completedQuantity || 0),
          0,
        );

        const completedQty =
          productionCompletedQty > 0
            ? productionCompletedQty
            : Number(item.completedQuantity || 0);

        const cycleTimeFromPart = Number(item.part?.cycleTime || 0);
        const scheduleQuantity = Number(item.scheduleQuantity || 0);
        const loadTime = cycleTimeFromPart * scheduleQuantity;
        return {
          id: item.id,
          processId: item.process?.id,
          processName: item.process?.processName || "Unknown",
          machineName: item.process?.machineName || "Unknown",
          partNumber: item.part?.partNumber || "N/A",
          cycleTimeFromPart: cycleTimeFromPart,
          scheduleQuantity,
          completedQty,
          loadTime,
          status: item.status,
          order_date: item.StockOrder?.orderDate || item.order_date,
        };
      }),
    );

    const barChartData = {};
    const processCompletion = {};
    let grandTotalQty = 0;
    let grandCompletedQty = 0;

    scheduleDataWithLoad.forEach((item) => {
      const pName = `${item.processName} (${item.machineName})`;

      if (!barChartData[pName]) barChartData[pName] = 0;
      barChartData[pName] += item.loadTime;

      if (!processCompletion[pName]) {
        processCompletion[pName] = { completed: 0, total: 0 };
      }
      processCompletion[pName].completed += item.completedQty;
      processCompletion[pName].total += item.scheduleQuantity;

      grandTotalQty += item.scheduleQuantity;
      grandCompletedQty += item.completedQty;
    });

    const overallAverage =
      grandTotalQty > 0
        ? ((grandCompletedQty / grandTotalQty) * 100).toFixed(2)
        : "0.00";

    const processCompletionPercentage = Object.entries(processCompletion).map(
      ([processName, v]) => ({
        processName,
        completed: v.completed,
        total: v.total,
        completionPercentage:
          v.total > 0 ? ((v.completed / v.total) * 100).toFixed(2) : "0.00",
      }),
    );

    return res.status(200).json({
      message: "Capacity Status Data",
      overallAverage,
      scheduleData: scheduleDataWithLoad,
      barChartData: {
        labels: Object.keys(barChartData),
        datasets: [
          { label: "Load Time (min)", data: Object.values(barChartData) },
        ],
      },
      processCompletion: processCompletionPercentage,
      data: getProcess,
    });
  } catch (error) {
    console.error("capacityStatus error:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};

const productionEfficieny = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.lte = end;
      }
    }

    const [schedules, scrapEntries] = await Promise.all([
      prisma.stockOrderSchedule.findMany({
        where: { isDeleted: false, ...dateFilter },
        select: {
          createdAt: true,
          completedQuantity: true,
          scheduleQuantity: true,
          scrapQuantity: true,
          part: { select: { cost: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.scapEntries.findMany({
        where: { isDeleted: false, ...dateFilter },
        select: {
          createdAt: true,
          returnQuantity: true,
          PartNumber: { select: { cost: true } },
        },
      }),
    ]);

    const totalOrders = schedules.length;
    const dailyMap = new Map();
    let totalCompleted = 0;
    let totalScrapCost = 0;

    schedules.forEach((item) => {
      const dateKey = item.createdAt.toISOString().split("T")[0];

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { date: dateKey, completed: 0 });
      }
      const current = dailyMap.get(dateKey);
      current.completed += item.completedQuantity || 0;
      totalCompleted += item.completedQuantity || 0;
      const partCost = parseFloat(item.part?.cost || 0);
      totalScrapCost += partCost * (item.scrapQuantity || 0);
    });

    scrapEntries.forEach((entry) => {
      const entryCost = parseFloat(entry.PartNumber?.cost || 0);
      const entryQty = Number(entry.returnQuantity) || 0;
      totalScrapCost += entryCost * entryQty;
    });

    const graphData = Array.from(dailyMap.values()).sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );

    return res.status(200).json({
      message: "Production Quantity Data",
      data: graphData,
      totals: {
        totalOrders,
        totalCompleted,
        totalScrapCost: parseFloat(totalScrapCost.toFixed(2)),
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
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
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};

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
    res
      .status(500)
      .json({ success: false, message: "Error fetching graph data" });
  }
};

const getParts = async (req, res) => {
  try {
    const parts = await prisma.partNumber.findMany({
      where: { isDeleted: false },
      select: { part_id: true, partDescription: true, partNumber: true },
    });
    res.json(parts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const revenueApi1 = async (req, res) => {
  try {
    const year = parseInt(req.query.year);
    const schedules = await prisma.stockOrderSchedule.findMany({
      where: { isDeleted: false },
      include: {
        part: true,
        process: true,
        StockOrder: true,
        CustomOrder: true,
      },
    });

    const fixedCosts = await prisma.fixedCost.findMany({
      select: { expenseCost: true },
    });

    const totalFixedCost = fixedCosts.reduce(
      (sum, item) => sum + parseFloat(item.expenseCost || 0),
      0,
    );

    let totalRevenue = 0;
    let totalCOGS = 0;
    let scrapCost = 0;
    let supplierReturn = 0;

    let projectionOpenOrderRevenue = 0;
    let projectionOpenPartsCost = 0;
    let projectionOpenLaborCost = 0;

    const monthlyRevenue = {};
    const monthlyCOGS = {};
    const dailyCashFlow = {};

    schedules.forEach((order) => {
      const date = new Date(order.order_date);
      if (year && date.getFullYear() !== year) return;

      const qtyFulfilled = order.completedQuantity || 0;
      const qtyUnfulfilled = order.remainingQty || 0;

      const monthKey =
        date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
      const dateKey = date.toISOString().slice(0, 10);

      const partCost = parseFloat(order.part?.cost || 0);
      const productCost = parseFloat(
        order.StockOrder?.cost || order.CustomOrder?.totalCost || 0,
      );
      const cycleTimeMinutes = order.part?.cycleTime || 0;
      const cycleTimeHours = cycleTimeMinutes / 60;
      const ratePerHour = order?.process?.ratePerHour || 0;

      const orderCOGS =
        (partCost + cycleTimeHours * ratePerHour) * qtyFulfilled;
      const fulfilledRevenue = (partCost + productCost) * qtyFulfilled;

      totalRevenue += fulfilledRevenue;
      totalCOGS += orderCOGS;

      monthlyRevenue[monthKey] =
        (monthlyRevenue[monthKey] || 0) + fulfilledRevenue;
      monthlyCOGS[monthKey] = (monthlyCOGS[monthKey] || 0) + orderCOGS;

      const unfulfilledRevenue = (partCost + productCost) * qtyUnfulfilled;
      projectionOpenOrderRevenue += unfulfilledRevenue;

      const unfulfilledPartsCost = partCost * qtyUnfulfilled;
      projectionOpenPartsCost += unfulfilledPartsCost;

      const unfulfilledLaborCost =
        cycleTimeHours * ratePerHour * qtyUnfulfilled;
      projectionOpenLaborCost += unfulfilledLaborCost;

      const currentScrap = order.scrapQuantity
        ? partCost * order.scrapQuantity
        : 0;
      scrapCost += currentScrap;
      supplierReturn += currentScrap;

      dailyCashFlow[dateKey] =
        (dailyCashFlow[dateKey] || 0) + (partCost + productCost) * qtyFulfilled;
    });

    res.json({
      // Existing Stats
      totalRevenue,
      totalCOGS,
      grossProfit: totalRevenue - totalCOGS - scrapCost - supplierReturn,
      scrapCost,
      supplierReturn,
      totalFixedCost,
      monthlyRevenue,
      monthlyCOGS,
      dailyCashFlow,

      // New Projections Section
      projections: {
        orderCard: {
          title: "Total Open Order Revenue",
          value: projectionOpenOrderRevenue,
        },
        partCard: {
          title: "Total Open Parts Cost",
          value: projectionOpenPartsCost,
        },
        employeeCard: {
          title: "Total Open Labor Cost",
          value: projectionOpenLaborCost,
        },
        fixedCostCard: {
          title: "Total Fixed Cost",
          value: totalFixedCost,
        },
      },

      unfulfilledRevenue: projectionOpenOrderRevenue,
      cashflowNeeded:
        totalFixedCost + projectionOpenPartsCost + projectionOpenLaborCost,
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
    const { search } = req.query;
    const parts = await prisma.partNumber.findMany({
      where: {
        isDeleted: false,
        ...(search && {
          partNumber: {
            contains: search,
          },
        }),
      },
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
      const pNumber = part.partNumber;
      const cost = Number(part.cost) || 0;
      const stock = Number(part.availStock) || 0;

      if (!inventoryMap[pNumber]) {
        inventoryMap[pNumber] = {
          partNumber: pNumber,
          partDescription: part.partDescription || "N/A",
          qtyAvailable: stock,
          safetyStock: part.minStock ?? 0,
          totalCost: stock * cost,
          unitCost: cost.toFixed(2),
        };
      } else {
        inventoryMap[pNumber].qtyAvailable += stock;
        inventoryMap[pNumber].totalCost += stock * cost;
      }
    });

    const inventoryData = Object.values(inventoryMap).map((item) => ({
      ...item,
      totalCost: item.totalCost.toFixed(2),
    }));

    res.json({
      message: "Inventory fetched successfully",
      searchQuery: search || "All",
      totalRecords: inventoryData.length,
      data: inventoryData,
    });
  } catch (error) {
    res.status(500).json({
      message: "Something went wrong while fetching inventory.",
      error: error.message,
    });
  }
};

const updateInventoryData = async (req, res) => {
  try {
    const { partNumber, qtyAvailable, safetyStock, unitCost } = req.body;

    if (!partNumber) {
      return res
        .status(400)
        .json({ message: "partNumber is required to update data." });
    }

    const updatedPart = await prisma.partNumber.update({
      where: {
        partNumber: partNumber,
      },
      data: {
        availStock:
          qtyAvailable !== undefined ? parseInt(qtyAvailable) : undefined,
        minStock: safetyStock !== undefined ? parseInt(safetyStock) : undefined,
        cost: unitCost !== undefined ? parseFloat(unitCost) : undefined,
      },
    });

    res.json({
      message: "Inventory updated successfully",
      data: {
        partNumber: updatedPart.partNumber,
        qtyAvailable: updatedPart.availStock,
        safetyStock: updatedPart.minStock,
        unitCost: updatedPart.cost,
      },
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Part not found." });
    }

    res.status(500).json({
      message: "Error updating inventory.",
      error: error.message,
    });
  }
};

const getLabourForcast = async (req, res) => {
  try {
    const { processId, startDate, endDate, forecastHours } = req.query;
    const whereClause = { isDeleted: false };
    if (processId && processId !== "all") {
      whereClause.processId = processId;
    }
    if (startDate || endDate) {
      whereClause.order_date = {};
      if (startDate) whereClause.order_date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.order_date.lte = end;
      }
    }

    const getInventory = await prisma.supplier_inventory.findMany({
      where: { isDeleted: false },
    });

    const orderDetail = await prisma.stockOrderSchedule.findMany({
      where: whereClause,
      include: {
        part: { select: { part_id: true, partNumber: true, availStock: true } },
        process: { select: { processName: true, id: true, cycleTime: true } },
      },
    });

    const fHours = parseFloat(forecastHours) || 0;

    const forecastData = orderDetail.map((order) => {
      const available = order.part?.availStock || 0;
      const need = order.scheduleQuantity || 0;
      const cycleTimeStr = order.process?.cycleTime || "0";
      const cycleTimeMinutes = parseFloat(cycleTimeStr);
      const processTimeHours = cycleTimeMinutes / 60;
      const hrNeed = need * processTimeHours;
      const forcQty =
        processTimeHours > 0 && fHours > 0
          ? Math.floor(fHours / processTimeHours)
          : 0;

      return {
        product_name: order.part?.partNumber || "Part Not Found",
        sub_name: order.process?.processName || "No Process Assigned",
        Available: `${available} qty`,
        Need: `${need} qty`,
        Forc: forcQty,
        cycleTime: `${processTimeHours.toFixed(4)} hr`,
        Hr_Need: `${hrNeed.toFixed(2)} hr`,
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
    const timeDifference = end.getTime() - start.getTime();
    const daysInPeriod = Math.ceil(timeDifference / (1000 * 3600 * 24)) || 1;
    const schedules = await prisma.stockOrderSchedule.findMany({
      where: {
        isDeleted: false,
        order_date: { gte: start, lte: end },
      },
      include: {
        part: true,
        process: true,
        StockOrder: true,
        CustomOrder: true,
      },
    });

    const fixedCostsData = await prisma.fixedCost.findMany({
      select: { expenseCost: true },
    });
    const sumFixedCosts = fixedCostsData.reduce(
      (sum, item) => sum + parseFloat(item.expenseCost || 0),
      0,
    );
    const proratedFixedCost = (sumFixedCosts / 365) * daysInPeriod;
    let totalRevenue = 0;
    let bomCost = 0;
    let laborCost = 0;
    let scrapCost = 0;
    let supplierReturn = 0;
    let inventoryCost = 0;

    schedules.forEach((order) => {
      const qtyFulfilled = parseFloat(order.completedQuantity || 0);
      const qtyRemaining = parseFloat(order.remainingQty || 0);
      const scrapQty = parseFloat(order.scrapQuantity || 0);
      const partCost = parseFloat(order.part?.cost || 0);
      const productCost = parseFloat(
        order.StockOrder?.cost || order.CustomOrder?.totalCost || 0,
      );
      const cycleTimeHours = parseFloat(order.part?.cycleTime || 0) / 60;
      const ratePerHour = parseFloat(order.process?.ratePerHour || 0);
      const laborUnitCost = cycleTimeHours * ratePerHour;
      const revenuePerUnit = partCost + productCost;
      totalRevenue += revenuePerUnit * qtyFulfilled;
      bomCost += partCost * qtyFulfilled;
      laborCost += laborUnitCost * qtyFulfilled;
      scrapCost += scrapQty * partCost;
      inventoryCost += qtyRemaining * (partCost + laborUnitCost);
      if (order.scrapQuantity > 0) {
        supplierReturn += order.scrapQuantity * partCost;
      }
    });
    const totalCOGS = bomCost + laborCost;
    const operatingExpenses = totalCOGS + proratedFixedCost;
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
      InventoryCost: inventoryCost,
      scrapCost,
      supplierReturn,
      cashFlow,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching business analysis data",
      error: error.message,
    });
  }
};
const getProductParts = async (req, res) => {
  try {
    const { id } = req.params;

    const productParts = await prisma.productTree.findMany({
      where: {
        product_id: id,
        isDeleted: false,
      },
      include: {
        part: {
          select: {
            part_id: true,
            partNumber: true,
            partDescription: true,
            cycleTime: true,
            cost: true,
          },
        },
        process: {
          select: {
            id: true,
            processName: true,
          },
        },
      },
    });

    const formattedData = productParts.map((item) => ({
      part_id: item.part_id,
      partNumber: item.part?.partNumber,
      qty: item.partQuantity,
      cycleTime: item.part?.cycleTime || "0",
      instructionRequired: item.instructionRequired,
      process: {
        id: item.process?.id,
        processName: item.process?.processName,
      },
    }));
    return res.status(200).json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
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
  updateInventoryData,
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
  revenueApi1,
  scheudleInventory,
  getLabourForcast,
  businessAnalysisApi,
  getProductParts,
  getLowStockParts,
  sendOrderToSupplier,
};
