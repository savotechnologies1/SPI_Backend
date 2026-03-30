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
    const trimmedEmail = email ? email.trim() : "";
    const trimmedPhone = customerPhone ? customerPhone.trim() : "";
    const orConditions = [];
    if (trimmedEmail !== "") orConditions.push({ email: trimmedEmail });
    if (trimmedPhone !== "") orConditions.push({ customerPhone: trimmedPhone });
    if (orConditions.length > 0) {
      const existingOtherCustomer = await prisma.customers.findFirst({
        where: {
          id: { not: id },
          isDeleted: false,
          OR: orConditions,
        },
      });

      if (existingOtherCustomer) {
        const isEmailConflict = existingOtherCustomer.email === trimmedEmail;
        return res.status(400).json({
          message: `Customer with this ${isEmailConflict ? "email" : "phone number"} already exists for another customer.`,
        });
      }
    }
    await prisma.customers.update({
      where: {
        id: id,
      },
      data: {
        firstName: firstName,
        lastName: lastName,
        email: trimmedEmail,
        customerPhone: trimmedPhone,
        address: address,
        billingTerms: billingTerms,
      },
    });

    return res.status(200).json({
      message: "Customer detail updated successfully!",
    });
  } catch (error) {
    return res.status(500).json({
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
            firstName: true,
            lastName: true,
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
            firstName: true,
            lastName: true,
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
    const { customerName, shipDate, partNumber } = req.query;

    let whereClause = {
      isDeleted: false,
      status: "Pending",
    };
    if (customerName) {
      const name = customerName.trim();
      whereClause.customer = {
        OR: [
          { firstName: { contains: name } },
          { lastName: { contains: name } },
        ],
      };
    }
    if (partNumber) {
      const pNum = partNumber.trim();
      whereClause.AND = [
        {
          OR: [
            { productNumber: { contains: pNum } },
            {
              part: {
                partNumber: { contains: pNum },
              },
            },
          ],
        },
      ];
    }

    if (shipDate) {
      whereClause.shipDate = {
        contains: shipDate,
      };
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

    // Yahan humne "components" ko include kiya hai jo ProductTree se data layega
    const commonInclude = {
      customer: true,
      product: { 
        include: { 
          components: { // Low level parts for the main product
            include: {
              part: { select: { partNumber: true, partDescription: true, cost: true } }
            }
          }
        } 
      },
      existingParts: {
        include: {
          part: { 
            include: { 
              components: { // Low level parts for the existing parts in BOM
                include: {
                  part: { select: { partNumber: true, partDescription: true, cost: true } }
                }
              }
            } 
          },
          process: { select: { processName: true } },
        },
      },
      customPart: {
        include: { process: { select: { processName: true } } },
      },
    };

    const andConditions = [{status: "Pending", isDeleted: false }];

    // ... (Aapki existing filtering logic same rahegi)
    if (orderNumber) {
      andConditions.push({ orderNumber: { contains: orderNumber.trim() } });
    }
    if (customerName) {
      const name = customerName.trim();
      andConditions.push({
        OR: [
          { customerName: { contains: name } },
          { customer: { OR: [{ firstName: { contains: name } }, { lastName: { contains: name } }] } },
        ],
      });
    }
    // ... Date filtering logic ...

    const orders = await prisma.customOrder.findMany({
      where: { AND: andConditions },
      include: commonInclude,
      orderBy: { createdAt: "desc" },
    });

    // Formatting logic to structure the nested parts
    const formattedOrders = orders.map((order) => {
      const mappedExisting = (order.existingParts || []).map((ep) => ({
        id: ep.id,
        partId: ep.partId,
        partNumber: ep.part?.partNumber,
        partDescription: ep.part?.partDescription,
        qty: ep.quantity,
        processName: ep.process?.processName || "No Process",
        source: "Library",
        // Sub-parts (Low level parts) ko yahan add kiya
        subComponents: (ep.part?.components || []).map(comp => ({
          partNumber: comp.part?.partNumber,
          description: comp.part?.partDescription,
          quantityNeeded: comp.partQuantity
        }))
      }));

      const mappedManual = (order.customPart || []).map((cp) => ({
        id: cp.id,
        partId: cp.id,
        partNumber: cp.partNumber,
        qty: cp.quantity,
        processName: cp.process?.processName || "Manual Process",
        source: "Manual",
        subComponents: [] // Manual parts usually don't have nested tree in this schema
      }));

      return {
        ...order,
        bomList: [...mappedExisting, ...mappedManual],
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedOrders,
    });
  } catch (error) {
    console.error("Search Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
// const searchCustomOrders = async (req, res) => {
//   try {
//     const { customerName, shipDate, partNumber, orderNumber } = req.query;

//     const commonInclude = {
//       customer: true,
//       product: { select: { partNumber: true, partDescription: true } },
//       existingParts: {
//         include: {
//           part: { select: { partNumber: true, partDescription: true } },
//           process: { select: { processName: true } },
//         },
//       },
//       customPart: {
//         include: { process: { select: { processName: true } } },
//       },
//     };

//     const andConditions = [{ isDeleted: false }];

//     if (orderNumber) {
//       andConditions.push({
//         orderNumber: { contains: orderNumber.trim() },
//       });
//     }

//     if (customerName) {
//       const name = customerName.trim();
//       andConditions.push({
//         OR: [
//           { customerName: { contains: name } },
//           {
//             customer: {
//               OR: [
//                 { firstName: { contains: name } },
//                 { lastName: { contains: name } },
//               ],
//             },
//           },
//         ],
//       });
//     }

//     if (shipDate) {
//       const startOfDay = new Date(shipDate);
//       startOfDay.setUTCHours(0, 0, 0, 0);

//       const endOfDay = new Date(shipDate);
//       endOfDay.setUTCHours(23, 59, 59, 999);

//       andConditions.push({
//         shipDate: {
//           gte: startOfDay,
//           lte: endOfDay,
//         },
//       });
//     }

//     if (partNumber) {
//       const pNum = partNumber.trim();
//       andConditions.push({
//         OR: [
//           { partNumber: { contains: pNum } },
//           { product: { partNumber: { contains: pNum } } },
//           {
//             existingParts: {
//               some: {
//                 part: { partNumber: { contains: pNum } },
//               },
//             },
//           },
//           {
//             customPart: {
//               some: { partNumber: { contains: pNum } },
//             },
//           },
//         ],
//       });
//     }

//     const orders = await prisma.customOrder.findMany({
//       where: { AND: andConditions },
//       include: commonInclude,
//       orderBy: { createdAt: "desc" },
//     });

//     const formattedOrders = orders.map((order) => {
//       const mappedExisting = (order.existingParts || []).map((ep) => ({
//         id: ep.id,
//         partId: ep.partId,
//         partNumber: ep.part?.partNumber,
//         partDescription: ep.part?.partDescription,
//         qty: ep.quantity,
//         processName: ep.process?.processName || "No Process",
//         source: "Library",
//       }));

//       const mappedManual = (order.customPart || []).map((cp) => ({
//         id: cp.id,
//         partNumber: cp.partNumber,
//         qty: cp.quantity,
//         processName: cp.process?.processName || "Manual Process",
//         source: "Manual",
//       }));

//       return {
//         ...order,
//         bomList: [...mappedExisting, ...mappedManual],
//       };
//     });

//     return res.status(200).json({
//       success: true,
//       data: formattedOrders,
//     });
//   } catch (error) {
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };
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
  try {
    const payload = req.body; 
    const adminId = req.user.id;
    for (const item of payload) {
      const existingRecord = await prisma.stockOrderSchedule.findFirst({
        where: {
          order_id: item.order_id,
          order_type: item.order_type,
          AND: [
            { part_id: item.part_id || null },
            { customPartId: item.customPartId || null }
          ]
        }
      });

      const commonData = {
        quantity: item.quantity,
        scheduleQuantity: item.quantity,
        remainingQty: item.quantity,
        delivery_date: new Date(item.delivery_date),
        status: item.status,
        process: item.processId ? { connect: { id: item.processId } } : undefined,
      };

      if (existingRecord) {
        await prisma.stockOrderSchedule.update({
          where: { id: existingRecord.id },
          data: commonData
        });
      } else {
        await prisma.stockOrderSchedule.create({
          data: {
            ...commonData,
            order_id: item.order_id,
            order_type: item.order_type,
            type: item.type || "part",
            part: item.part_id ? { connect: { part_id: item.part_id } } : undefined,
            customPart: item.customPartId ? { connect: { id: item.customPartId } } : undefined,
            submittedByAdmin: { connect: { id: adminId } }
          }
        });
      }
    }

    return res.status(200).json({ message: "Orders scheduled successfully!" });

  } catch (error) {
    console.error("Custom Scheduling Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
// const customOrderSchedule = async (req, res) => {
//   try {
//     const payload = req.body; // Ye array hona chahiye jo frontend se aa raha hai
//     const adminId = req.user.id; // Ya jo bhi aapki admin ID nikalne ki logic ho

//     // Payload par loop chalayenge
//     const allPrismaPromises = payload.map((item) => { // <--- variable name 'item' rakha hai
      
//       // Unique key check karein (Prisma schema ke hisaab se)
//       const uniqueWhere = {
//         order_id_part_id_order_type: {
//           order_id: item.order_id,
//           part_id: item.part_id || "", // part_id null ho toh empty string (Unique key safety)
//           order_type: item.order_type
//         }
//       };

//       return prisma.stockOrderSchedule.upsert({
//         where: uniqueWhere,
//         update: {
//           quantity: item.quantity,
//           scheduleQuantity: item.quantity,
//           remainingQty: item.quantity,
//           delivery_date: new Date(item.delivery_date),
//           status: item.status,
//           // Relation logic
//           process: item.processId ? { connect: { id: item.processId } } : undefined,
//           // Agar customPartId hai toh connect karo, warna disconnect
//           customPart: item.customPartId ? { connect: { id: item.customPartId } } : undefined
//         },
//         create: {
//           order_id: item.order_id,
//           order_type: item.order_type,
//           quantity: item.quantity,
//           scheduleQuantity: item.quantity,
//           remainingQty: item.quantity,
//           delivery_date: new Date(item.delivery_date),
//           status: item.status,
//           type: item.type || "part",
//           // Conditional Relations
//           part: item.part_id ? { connect: { part_id: item.part_id } } : undefined,
//           customPart: item.customPartId ? { connect: { id: item.customPartId } } : undefined,
//           process: item.processId ? { connect: { id: item.processId } } : undefined,
//           submittedByAdmin: { connect: { id: adminId } }
//         }
//       });
//     });

//     await Promise.all(allPrismaPromises);
//     return res.status(200).json({ message: "Orders scheduled successfully!" });

//   } catch (error) {
//     console.error("Custom Scheduling Error:", error);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };
// const customOrderSchedule = async (req, res) => {
//   const partsToSchedule = req.body;

//   if (!Array.isArray(partsToSchedule) || partsToSchedule.length === 0) {
//     return res.status(400).json({ message: "Request body must be a non-empty array." });
//   }

//   try {
//     const allPrismaPromises = [];
//     const orderIdsToUpdate = new Set();
//     const firstItem = partsToSchedule[0];

//     const orderData = await prisma.customOrder.findUnique({
//       where: { id: firstItem.order_id },
//       include: { product: true },
//     });
//     if (!orderData) throw new Error("Custom Order not found.");
//     orderIdsToUpdate.add(orderData.id);

//     const submittedBy = req.user.role === "superAdmin"
//       ? { submittedByAdmin: { connect: { id: req.user.id } } }
//       : { submittedByEmployee: { connect: { id: req.user.id } } };

//     const partIds = partsToSchedule.map(i => i.part_id).filter(Boolean);
//     const customPartIdsFromPayload = partsToSchedule.map(i => i.customPartId).filter(Boolean);

//     // Fetch process IDs from all sources
//     const [standardParts, existingParts, manualParts] = await Promise.all([
//       prisma.partNumber.findMany({ where: { part_id: { in: partIds } }, select: { part_id: true, processId: true } }),
//       prisma.customOrderExistingPart.findMany({ where: { id: { in: customPartIdsFromPayload } }, select: { id: true, processId: true } }),
//       prisma.customPart.findMany({ where: { id: { in: customPartIdsFromPayload } }, select: { id: true, processId: true } })
//     ]);

//     const processMap = new Map();
//     standardParts.forEach(p => processMap.set(p.part_id, p.processId));
//     existingParts.forEach(p => processMap.set(p.id, p.processId));
//     manualParts.forEach(p => processMap.set(p.id, p.processId));

//     // VALIDATION: Identify which IDs truly belong to the CustomPart table
//     const validManualPartIds = new Set(manualParts.map(p => p.id));

//     for (const item of partsToSchedule) {
//       const { order_id, customPartId, quantity, delivery_date, part_id } = item;
      
//       if (part_id === orderData?.productId) continue;
//       orderIdsToUpdate.add(order_id);

//       const qty = parseInt(quantity) || 0;
//       const dDate = new Date(delivery_date);
//       const finalProcessId = processMap.get(customPartId) || processMap.get(part_id) || null;

//       // FIX: Only connect customPart if it exists in CustomPart table to avoid P2003
//       const canConnectCustomPart = customPartId && validManualPartIds.has(customPartId);

//       if (part_id) {
//         // CASE: Standard Part or Sub-component
   
// allPrismaPromises.push(prisma.stockOrderSchedule.upsert({
//   where: {
//     order_id_part_id_order_type: {
//       order_id: part.order_id,
//       part_id: part.part_id || "", // Agar part_id null hai toh empty string ya fallback handle karein
//       order_type: part.order_type
//     }
//   },
//   update: {
//     quantity: part.quantity,
//     scheduleQuantity: part.quantity,
//     remainingQty: part.quantity,
//     delivery_date: new Date(part.delivery_date),
//     status: part.status,
//     // customPartId: null  <-- ISKI JAGAH NICHE WALA USE KAREIN
//     customPart: part.customPartId 
//       ? { connect: { id: part.customPartId } } 
//       : { disconnect: true }, 
//     process: part.processId 
//       ? { connect: { id: part.processId } } 
//       : undefined,
//   },
//   create: {
//     order_id: part.order_id,
//     order_type: part.order_type,
//     quantity: part.quantity,
//     scheduleQuantity: part.quantity,
//     remainingQty: part.quantity,
//     delivery_date: new Date(part.delivery_date),
//     status: part.status,
//     type: part.type || "part",
//     // Relations handles karein
//     part: part.part_id ? { connect: { part_id: part.part_id } } : undefined,
//     customPart: part.customPartId ? { connect: { id: part.customPartId } } : undefined,
//     process: part.processId ? { connect: { id: part.processId } } : undefined,
//     submittedByAdmin: { connect: { id: adminId } } // Aapka logged-in admin ID
//   }
// }));
//       } else if (customPartId) {
//         // CASE: Pure Manual Custom Part
//         const existing = await prisma.stockOrderSchedule.findFirst({
//           where: { order_id, customPartId, order_type: "CustomOrder" }
//         });

//         const manualData = {
//           order_id,
//           order_type: "CustomOrder",
//           customPartId: canConnectCustomPart ? customPartId : null,
//           quantity: qty,
//           scheduleQuantity: qty,
//           remainingQty: qty,
//           delivery_date: dDate,
//           status: "new",
//           type: "part",
//           processId: finalProcessId,
//           ...submittedBy
//         };

//         if (existing) {
//           allPrismaPromises.push(prisma.stockOrderSchedule.update({ where: { id: existing.id }, data: manualData }));
//         } else {
//           allPrismaPromises.push(prisma.stockOrderSchedule.create({ data: manualData }));
//         }
//       }
//     }

//     if (allPrismaPromises.length > 0) {
//       await prisma.$transaction(allPrismaPromises);
//     }

//     await prisma.customOrder.updateMany({
//       where: { id: { in: Array.from(orderIdsToUpdate) } },
//       data: { status: "Scheduled" },
//     });

//     return res.status(201).json({ 
//       success: true, 
//       message: "Custom order components scheduled. Foreign key issues resolved." 
//     });

//   } catch (error) {
//     console.error("Custom Scheduling Error:", error);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };
// const customOrderSchedule = async (req, res) => {
//   const partsToSchedule = req.body;

//   if (!Array.isArray(partsToSchedule) || partsToSchedule.length === 0) {
//     return res.status(400).json({ message: "Request body must be a non-empty array." });
//   }

//   try {
//     const orderIds = new Set();
//     const firstItem = partsToSchedule[0];

//     // 1. Order aur Product ki detail nikaalte hain
//     const orderData = await prisma.customOrder.findUnique({
//       where: { id: firstItem.order_id },
//       include: { product: true },
//     });

//     if (!orderData) throw new Error("Custom Order not found.");
//     orderIds.add(orderData.id);

//     const submittedBy = req.user.role === "superAdmin"
//         ? { submittedByAdminId: req.user.id }
//         : { submittedByEmployeeId: req.user.id };

//     // 2. Sabse pehle main Product (Finished Good) ko schedule karte hain
//     if (orderData.productId) {
//       await prisma.stockOrderSchedule.upsert({
//         where: {
//           order_id_part_id_order_type: {
//             order_id: orderData.id,
//             part_id: orderData.productId,
//             order_type: "CustomOrder",
//           },
//         },
//         update: {
//           quantity: orderData.productQuantity,
//           scheduleQuantity: orderData.productQuantity,
//           remainingQty: orderData.productQuantity,
//           delivery_date: new Date(orderData.shipDate),
//           status: "new",
//         },
//         create: {
//           order_id: orderData.id,
//           order_type: "CustomOrder",
//           part_id: orderData.productId,
//           quantity: orderData.productQuantity,
//           scheduleQuantity: orderData.productQuantity,
//           remainingQty: orderData.productQuantity,
//           delivery_date: new Date(orderData.shipDate),
//           status: "new",
//           type: "product",
//           processId: orderData.product?.processId || null,
//           ...submittedBy,
//         },
//       });
//     }

//     // 3. Loop se pehle saare Process IDs ek saath nikaal lete hain (Performance ke liye)
//     const existingPartIds = partsToSchedule.filter(i => !(i.type === "New" || i.type === "Manual" || i.type === "custom")).map(i => i.customPartId);
//     const manualPartIds = partsToSchedule.filter(i => (i.type === "New" || i.type === "Manual" || i.type === "custom")).map(i => i.customPartId);

//     const [existingData, manualData] = await Promise.all([
//       prisma.customOrderExistingPart.findMany({ where: { id: { in: existingPartIds } }, select: { id: true, processId: true } }),
//       prisma.customPart.findMany({ where: { id: { in: manualPartIds } }, select: { id: true, processId: true } })
//     ]);

//     const processMap = new Map();
//     existingData.forEach(p => processMap.set(p.id, p.processId));
//     manualData.forEach(p => processMap.set(p.id, p.processId));

//     // 4. Ab components schedule karte hain
//     for (const item of partsToSchedule) {
//       const { order_id, customPartId, type, quantity, delivery_date, part_id } = item;
      
//       if (part_id === orderData?.productId) continue;
//       orderIds.add(order_id);

//       const processId = processMap.get(customPartId) || null;
//       const isManual = ["New", "Manual", "custom"].includes(type);
//       const qty = parseInt(quantity) || 0;

//       if (isManual) {
//         // Manual Part Logic
//         const existingSchedule = await prisma.stockOrderSchedule.findFirst({
//           where: { order_id, customPartId, order_type: "CustomOrder" }
//         });

//         if (existingSchedule) {
//           await prisma.stockOrderSchedule.update({
//             where: { id: existingSchedule.id },
//             data: { quantity: qty, scheduleQuantity: qty, remainingQty: qty, delivery_date: new Date(delivery_date) }
//           });
//         } else {
//           await prisma.stockOrderSchedule.create({
//             data: { order_id, order_type: "CustomOrder", customPartId, quantity: qty, scheduleQuantity: qty, remainingQty: qty, delivery_date: new Date(delivery_date), status: "new", type: "part", processId, ...submittedBy }
//           });
//         }
//       } else {
//         // Library Part Logic
//         await prisma.stockOrderSchedule.upsert({
//           where: { order_id_part_id_order_type: { order_id, part_id, order_type: "CustomOrder" } },
//           update: { quantity: qty, scheduleQuantity: qty, remainingQty: qty, delivery_date: new Date(delivery_date), status: "new" },
//           create: { order_id, order_type: "CustomOrder", part_id, quantity: qty, scheduleQuantity: qty, remainingQty: qty, delivery_date: new Date(delivery_date), status: "new", type: "part", processId, ...submittedBy }
//         });
//       }
//     }

//     // 5. Custom Order ka status update karna
//     await prisma.customOrder.updateMany({
//       where: { id: { in: Array.from(orderIds) } },
//       data: { status: "Scheduled" },
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Custom order and components scheduled successfully (No Transaction).",
//     });
//   } catch (error) {
//     console.error("Scheduling Error:", error);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };
// const customOrderSchedule = async (req, res) => {
  
//   const partsToSchedule = req.body; // Array of parts selected for scheduling

//   if (!Array.isArray(partsToSchedule) || partsToSchedule.length === 0) {
//     return res
//       .status(400)
//       .json({ message: "Request body must be a non-empty array." });
//   }

//   try {
//     const result = await prisma.$transaction(async (tx) => {
//       const orderIds = new Set();
//       const firstItem = partsToSchedule[0];

//       // 1. Order aur Product ki detail nikaalte hain
//       const orderData = await tx.customOrder.findUnique({
//         where: { id: firstItem.order_id },
//         include: { product: true },
//       });

//       if (!orderData) throw new Error("Custom Order not found.");

//       const submittedBy =
//         req.user.role === "superAdmin"
//           ? { submittedByAdminId: req.user.id }
//           : { submittedByEmployeeId: req.user.id };

//       // 2. Sabse pehle main Product (Finished Good) ko schedule karte hain
//       if (orderData.productId) {
//         await tx.stockOrderSchedule.upsert({
//           where: {
//             order_id_part_id_order_type: {
//               order_id: orderData.id,
//               part_id: orderData.productId,
//               order_type: "CustomOrder",
//             },
//           },
//           update: {
//             quantity: orderData.productQuantity,
//             scheduleQuantity: orderData.productQuantity,
//             remainingQty: orderData.productQuantity,
//             delivery_date: new Date(orderData.shipDate),
//             status: "new",
//           },
//           create: {
//             order_id: orderData.id,
//             order_type: "CustomOrder",
//             part_id: orderData.productId,
//             quantity: orderData.productQuantity,
//             scheduleQuantity: orderData.productQuantity,
//             remainingQty: orderData.productQuantity,
//             delivery_date: new Date(orderData.shipDate),
//             status: "new",
//             type: "product",
//             processId: orderData.product?.processId || null,
//             ...submittedBy,
//           },
//         });
//       }

//       // 3. Ab loop chala kar components (Existing aur Manual) schedule karte hain
//       for (const item of partsToSchedule) {
//         const {
//           order_id,
//           customPartId,
//           type, // "Existing", "Library", "New", "Manual"
//           quantity,
//           delivery_date,
//           part_id,
//         } = item;

//         // Agar yeh item main product hi hai, to skip karein (kyunki upar handle ho chuka hai)
//         if (part_id === orderData?.productId) continue;

//         let processId = null;
//         let isManual = type === "New" || type === "Manual" || type === "custom";

//         // Process ID find karna
//         if (!isManual) {
//           const existingRecord = await tx.customOrderExistingPart.findUnique({
//             where: { id: customPartId },
//           });
//           processId = existingRecord?.processId;
//         } else {
//           const manualRecord = await tx.customPart.findUnique({
//             where: { id: customPartId },
//           });
//           processId = manualRecord?.processId;
//         }

//         if (isManual) {
//           // MANUAL PART LOGIC: 
//           // Kyunki schema mein [order_id, part_id, order_type] unique hai aur part_id null hoga,
//           // hum manually check karenge ki customPartId ke liye schedule pehle se hai ya nahi.
//           const existingSchedule = await tx.stockOrderSchedule.findFirst({
//             where: {
//               order_id: order_id,
//               customPartId: customPartId,
//               order_type: "CustomOrder"
//             }
//           });

//           if (existingSchedule) {
//             await tx.stockOrderSchedule.update({
//               where: { id: existingSchedule.id },
//               data: {
//                 quantity: parseInt(quantity),
//                 scheduleQuantity: parseInt(quantity),
//                 remainingQty: parseInt(quantity),
//                 delivery_date: new Date(delivery_date),
//               }
//             });
//           } else {
//             await tx.stockOrderSchedule.create({
//               data: {
//                 order_id: order_id,
//                 order_type: "CustomOrder",
//                 customPartId: customPartId,
//                 quantity: parseInt(quantity),
//                 scheduleQuantity: parseInt(quantity),
//                 remainingQty: parseInt(quantity),
//                 delivery_date: new Date(delivery_date),
//                 status: "new",
//                 type: "part",
//                 processId: processId,
//                 ...submittedBy,
//               }
//             });
//           }
//         } else {
//           // LIBRARY / EXISTING PART LOGIC:
//           // Inka part_id hota hai isliye hum compound unique key (upsert) use kar sakte hain.
//           await tx.stockOrderSchedule.upsert({
//             where: {
//               order_id_part_id_order_type: {
//                 order_id: order_id,
//                 part_id: part_id,
//                 order_type: "CustomOrder",
//               },
//             },
//             update: {
//               quantity: parseInt(quantity),
//               scheduleQuantity: parseInt(quantity),
//               remainingQty: parseInt(quantity),
//               delivery_date: new Date(delivery_date),
//               status: "new",
//             },
//             create: {
//               order_id: order_id,
//               order_type: "CustomOrder",
//               part_id: part_id,
//               quantity: parseInt(quantity),
//               scheduleQuantity: parseInt(quantity),
//               remainingQty: parseInt(quantity),
//               delivery_date: new Date(delivery_date),
//               status: "new",
//               type: "part",
//               processId: processId,
//               ...submittedBy,
//             },
//           });
//         }
//         orderIds.add(order_id);
//       }

//       // 4. Custom Order ka status update karna
//       await tx.customOrder.updateMany({
//         where: { id: { in: Array.from(orderIds) } },
//         data: { status: "Scheduled" },
//       });

//       return true;
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Custom order and its components scheduled successfully.",
//     });
//   } catch (error) {
//     console.error("Scheduling Error:", error);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };


// const scheduleStockOrdersList = async (req, res) => {
//   try {
//     const { search, order_type } = req.query;
//     const paginationData = await paginationQuery(req.query);
//     const whereClause = { isDeleted: false };

//     if (order_type && order_type !== "all") {
//       whereClause.order_type = order_type;
//     }

//     // 1. Fetch Scheduled Child Parts
//     const [filteredSchedules, totalCount] = await Promise.all([
//       prisma.stockOrderSchedule.findMany({
//         where: whereClause,
//         skip: paginationData.skip,
//         take: paginationData.pageSize,
//         orderBy: { createdAt: "desc" },
//         include: {
//           part: { include: { process: true } },
//           customPart: { include: { process: true } },
//           process: true,
//           completedByEmployee: { select: { firstName: true, lastName: true, id: true } },
//         },
//       }),
//       prisma.stockOrderSchedule.count({ where: whereClause }),
//     ]);

//     // 2. Fetch Helper Maps (Admins/Employees)
//     const performerIds = [...new Set(filteredSchedules.map((s) => s.completed_by).filter(Boolean))];
//     const [admins, employees] = await Promise.all([
//       prisma.admin.findMany({ where: { id: { in: performerIds } }, select: { id: true, name: true } }),
//       prisma.employee.findMany({ where: { id: { in: performerIds } }, select: { id: true, firstName: true, lastName: true } }),
//     ]);

//     const nameMap = new Map();
//     admins.forEach((a) => nameMap.set(a.id, `Admin (${a.name})`));
//     employees.forEach((e) => nameMap.set(e.id, `${e.firstName} ${e.lastName || ""}`.trim()));

//     // 3. Fetch Parent Order details
//     const customOrderIds = [...new Set(filteredSchedules.filter((s) => s.order_type === "CustomOrder").map((s) => s.order_id))];
//     const stockOrderIds = [...new Set(filteredSchedules.filter((s) => s.order_type === "StockOrder").map((s) => s.order_id))];

//     const [customOrders, stockOrders] = await Promise.all([
//       prisma.customOrder.findMany({
//         where: { id: { in: customOrderIds } },
//         include: { product: { include: { process: true } } }, // PR-101 Details
//       }),
//       prisma.stockOrder.findMany({ where: { id: { in: stockOrderIds } } })
//     ]);

//     const customMap = new Map(customOrders.map((o) => [o.id, o]));
//     const stockMap = new Map(stockOrders.map((o) => [o.id, o]));

//     // 4. Transform and Merge Data
//     const finalData = [];
//     const processedOrders = new Set();

//     filteredSchedules.forEach((schedule) => {
//       const type = schedule.order_type?.replace(/\s/g, "");
      
//       // Agar Custom Order hai aur humne uska parent abhi tak add nahi kiya
//    // ... Custom Order Parent Logic ...
// if (type === "CustomOrder" && !processedOrders.has(schedule.order_id)) {
//   const cOrder = customMap.get(schedule.order_id);
//   if (cOrder && cOrder.product) {
//     // Manual Parent Row Create Karein (PR-101)
//     finalData.push({
//       id: `parent-${cOrder.id}`,
//       order_id: cOrder.id,
//       order_type: "CustomOrder",
      
//       // YEAH DO LINES ADD KAREIN:
//       order_date: cOrder.orderDate,   // Order table se date uthayega
//       delivery_date: cOrder.shipDate, // Order table se ship date uthayega
      
//       status: cOrder.status,
//       mainProductName: cOrder.product.partNumber, // PR-101
//       order: cOrder,
//       partDetails: {
//         partNumber: cOrder.product.partNumber,
//         description: cOrder.product.partDescription || "Parent Product",
//         processName: cOrder.product.process?.processName || "N/A",
//         machineName: cOrder.product.process?.machineName || "N/A",
//         source: "Library"
//       },
//       isParent: true
//     });
//   }
//   processedOrders.add(schedule.order_id);
// }

//       // Baaki child rows as it is add karein
//       const orderDetails = type === "StockOrder" ? stockMap.get(schedule.order_id) : customMap.get(schedule.order_id);
//       const displayCompletedBy = nameMap.get(schedule.completed_by) || "Admin";
      
//       finalData.push({
//         ...schedule,
//         mainProductName: type === "StockOrder" ? orderDetails?.productNumber : orderDetails?.product?.partNumber || "Manual",
//         completed_by: displayCompletedBy,
//         order: orderDetails,
//         partDetails: {
//           partNumber: schedule.customPart?.partNumber || schedule.part?.partNumber || "N/A",
//           description: schedule.part?.partDescription || schedule.customPart?.partNumber || "N/A",
//           processName: schedule.process?.processName || schedule.part?.process?.processName || "N/A",
//           machineName: schedule.process?.machineName || schedule.part?.process?.machineName || "N/A",
//         }
//       });
//     });

//     return res.status(200).json({
//       success: true,
//       data: finalData,
//       pagination: await pagination({ page: paginationData.page, pageSize: paginationData.pageSize, total: totalCount }),
//     });
//   } catch (error) {
//     return res.status(500).json({ success: false, error: error.message });
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

    // if (search) {
    //   const searchTerm = search.trim();
    //   whereClause.OR = [
    //     { part: { partNumber: { contains: searchTerm } } },
    //     { customPart: { partNumber: { contains: searchTerm } } },
    //     { status: { contains: searchTerm } },
    //   ];
    // }
if (search) {
      const searchTerm = search.trim();
      whereClause.OR = [
        { part: { partNumber: { contains: searchTerm, mode: 'insensitive' } } },
        { customPart: { partNumber: { contains: searchTerm, mode: 'insensitive' } } },
        { status: { contains: searchTerm, mode: 'insensitive' } },
        
        { 
          process: { 
            processName: { contains: searchTerm, mode: 'insensitive' } 
          } 
        },
        { 
          part: { 
            process: { 
              processName: { contains: searchTerm, mode: 'insensitive' } 
            } 
          } 
        },
        {
          customPart: {
            process: {
              processName: { contains: searchTerm, mode: 'insensitive' }
            }
          }
        }
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
          process: true,
          completedByEmployee: { select: { firstName: true, lastName: true, id: true } },
        },
      }),
      prisma.stockOrderSchedule.count({ where: whereClause }),
    ]);

    // 2. Fetch Helpers (Names)
    // const performerIds = [...new Set(filteredSchedules.map((s) => s.completed_by).filter(Boolean))];
    
    // Step 2: Fetch Helpers (Names)
const performerIds = [...new Set([
  ...filteredSchedules.map((s) => s.completed_by),
  ...filteredSchedules.map((s) => s.completed_EmpId) // <--- Ye line add karein
].filter(Boolean))];
    const [admins, employees] = await Promise.all([
      prisma.admin.findMany({ where: { id: { in: performerIds } }, select: { id: true, name: true } }),
      prisma.employee.findMany({ where: { id: { in: performerIds } }, select: { id: true, firstName: true, lastName: true } }),
    ]);

    const nameMap = new Map();
    admins.forEach((a) => nameMap.set(a.id, `Admin (${a.name})`));
    employees.forEach((e) => nameMap.set(e.id, `${e.firstName} ${e.lastName || ""}`.trim()));

    // 3. Fetch Parent Orders (Stock vs Custom)
    const customOrderIds = [...new Set(filteredSchedules.filter((s) => s.order_type === "CustomOrder").map((s) => s.order_id))];
    const stockOrderIds = [...new Set(filteredSchedules.filter((s) => s.order_type === "StockOrder").map((s) => s.order_id))];

    const [customOrders, stockOrders] = await Promise.all([
      prisma.customOrder.findMany({
        where: { id: { in: customOrderIds } },
        include: { product: true },
      }),
      prisma.stockOrder.findMany({ where: { id: { in: stockOrderIds } } })
    ]);

    const customMap = new Map(customOrders.map((o) => [o.id, o]));
    const stockMap = new Map(stockOrders.map((o) => [o.id, o]));

    // 4. Simple Mapping (NO MANUAL INJECTION)
    const finalData = filteredSchedules.map((schedule) => {
      const type = schedule.order_type?.replace(/\s/g, "");
      const orderDetails = type === "StockOrder" ? stockMap.get(schedule.order_id) : customMap.get(schedule.order_id);

      const mainProduct = type === "StockOrder" 
        ? orderDetails?.productNumber 
        : (orderDetails?.product?.partNumber || orderDetails?.partNumber || "Manual");

      // Check if this record itself is the Parent Product
      const isParent = (type === "CustomOrder" && schedule.part_id === orderDetails?.productId) || 
                       (type === "StockOrder" && schedule.part_id === orderDetails?.partId);

      const displayCompletedBy = nameMap.get(schedule.completed_by) || schedule.completed_by || "Admin";

      return {
        ...schedule,
        mainProductName: mainProduct,
        isParent: isParent, // UI isse bold kar sakta hai
        completed_by: displayCompletedBy,
        order: orderDetails,
        partDetails: {
          partNumber: schedule.customPart?.partNumber || schedule.part?.partNumber || "N/A",
          description: schedule.part?.partDescription || schedule.customPart?.partNumber || "N/A",
          processName: schedule.process?.processName || schedule.part?.process?.processName || "N/A",
          machineName: schedule.process?.machineName || schedule.part?.process?.machineName || "N/A",
        }
      };
    });

    return res.status(200).json({
      success: true,
      data: finalData,
      pagination: await pagination({ page: paginationData.page, pageSize: paginationData.pageSize, total: totalCount }),
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
            where: { part_id: order?.part_id },
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
    const { status } = req.body;
    const existingOrder = await prisma.supplier_orders.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    const oldStatus = existingOrder.status;
    const part_id = existingOrder.part_id;
    const quantity = parseInt(existingOrder.quantity) || 0;

    if (!part_id) {
      return res
        .status(400)
        .json({ message: "This order is not linked to any Part" });
    }

    await prisma.supplier_orders.update({
      where: { id },
      data: { status },
    });

    const isNowDelivered = status.toLowerCase() === "delivered";
    const wasPreviouslyDelivered = oldStatus
      ? oldStatus.toLowerCase() === "delivered"
      : false;

    if (isNowDelivered && !wasPreviouslyDelivered) {
      await prisma.$transaction([
        prisma.partNumber.update({
          where: { part_id },
          data: {
            supplierOrderQty: { increment: quantity },
            availStock: { increment: quantity },
          },
        }),
        prisma.supplier_inventory.updateMany({
          where: { part_id },
          data: { availStock: { increment: quantity } },
        }),
      ]);
    } else if (!isNowDelivered && wasPreviouslyDelivered) {
      await prisma.$transaction([
        prisma.partNumber.update({
          where: { part_id },
          data: {
            supplierOrderQty: { decrement: quantity },
            availStock: { decrement: quantity },
          },
        }),
        prisma.supplier_inventory.updateMany({
          where: { part_id },
          data: { availStock: { decrement: quantity } },
        }),
      ]);
    }

    return res.status(200).json({
      message: "Order status and inventory updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
      error: error.message,
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
    let startDateFilter = null;
    let endDateFilter = null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    switch (filter) {
      case "This Week":
        const dayOfWeek = now.getDay();
        startDateFilter = new Date(now);
        startDateFilter.setDate(
          now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1),
        );
        endDateFilter = new Date(startDateFilter);
        endDateFilter.setDate(startDateFilter.getDate() + 6);
        endDateFilter.setHours(23, 59, 59, 999);
        break;
      case "This Month":
        startDateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
        endDateFilter = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDateFilter.setHours(23, 59, 59, 999);
        break;
    }

    const isSuperAdmin = req.user?.roles?.toLowerCase() === "superadmin";

    const timeClockConditions = {
      isDeleted: false,
      ...(isSuperAdmin && { createdBy: req.user?.id }),
      ...(queryEmployeeId && { employeeId: queryEmployeeId }),
      ...(startDateFilter &&
        endDateFilter && {
          timestamp: { gte: startDateFilter, lte: endDateFilter },
        }),
    };

    const allEvents = await prisma.timeClock.findMany({
      where: timeClockConditions,
      orderBy: { timestamp: "asc" },
      include: { employee: true },
    });

    const vacationConditions = {
      status: "APPROVED",
      isDeleted: false,
      ...(queryEmployeeId && { employeeId: queryEmployeeId }),
    };

    const vacationRequests = await prisma.vacationRequest.findMany({
      where: vacationConditions,
      include: { employee: true },
    });

    const groupedData = {};

    allEvents.forEach((event) => {
      const dateKey = new Date(event.timestamp).toISOString().split("T")[0];
      const uniqueKey = `${event.employeeId}_${dateKey}`;

      if (!groupedData[uniqueKey]) {
        groupedData[uniqueKey] = {
          date: dateKey,
          employeeName:
            `${event.employee?.firstName || ""} ${event.employee?.lastName || ""}`.trim(),
          employeeEmail: event.employee?.email || "",
          loginTime: null,
          logout: null,
          status: event.status,
          vacationStatus: "-",
          vacationHours: 0,
        };
      }

      if (event.eventType === "CLOCK_IN") {
        groupedData[uniqueKey].loginTime = event.timestamp;
        groupedData[uniqueKey].status = event.status;
      }
      if (event.eventType === "CLOCK_OUT") {
        groupedData[uniqueKey].logout = event.timestamp;
      }
    });

    vacationRequests.forEach((v) => {
      let current = new Date(v.startDate);
      const end = new Date(v.endDate);
      while (current <= end) {
        const dateKey = current.toISOString().split("T")[0];
        const uniqueKey = `${v.employeeId}_${dateKey}`;

        if (!groupedData[uniqueKey]) {
          groupedData[uniqueKey] = {
            date: dateKey,
            employeeName:
              `${v.employee?.firstName || ""} ${v.employee?.lastName || ""}`.trim(),
            employeeEmail: v.employee?.email || "",
            loginTime: null,
            logout: null,
            status: "VACATION",
            vacationStatus: "APPROVED",
            vacationHours: Number(v.hours || 0),
          };
        } else {
          groupedData[uniqueKey].vacationStatus = "APPROVED";
          groupedData[uniqueKey].vacationHours = Number(v.hours || 0);
          if (
            groupedData[uniqueKey].status === "PENDING" ||
            !groupedData[uniqueKey].status
          ) {
            groupedData[uniqueKey].status = "VACATION";
          }
        }
        current.setDate(current.getDate() + 1);
      }
    });

    let timeSheetData = Object.values(groupedData).map((entry) => {
      let workHours = 0;

      if (entry.loginTime && entry.logout) {
        const login = new Date(entry.loginTime);
        const logout = new Date(entry.logout);
        const diffMs = logout.getTime() - login.getTime();
        workHours = Math.max(0, diffMs / (1000 * 60 * 60));
      }

      const vHours = Number(entry.vacationHours || 0);
      const totalHours = workHours + vHours;

      return {
        ...entry,
        workHours: workHours.toFixed(2),
        vacationHours: vHours.toFixed(2),
        totalHours: totalHours.toFixed(2),
      };
    });

    if (search) {
      const lowerSearch = search.toLowerCase();
      timeSheetData = timeSheetData.filter(
        (e) =>
          e.employeeName.toLowerCase().includes(lowerSearch) ||
          e.status.toLowerCase().includes(lowerSearch),
      );
    }

    const totalCount = timeSheetData.length;
    const paginatedData = timeSheetData
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return res.status(200).json({
      data: paginatedData,
      totalCounts: totalCount,
      pagination: {
        page: currentPage,
        totalPages: Math.ceil(totalCount / itemsPerPage),
        hasNext: currentPage < Math.ceil(totalCount / itemsPerPage),
        hasPrevious: currentPage > 1,
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
          new Date(item.cycleTimeEnd) - new Date(item.cycleTimeStart);
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
    const tz = req.query.tz || "Asia/Kolkata";
    const selectedDate = req.query.date || moment().tz(tz).format("YYYY-MM-DD");

    const now = moment().tz(tz);
    const currentHour = now.hour();

    let shift = 1;
    let shiftStart, shiftEnd;

    if (currentHour >= 6 && currentHour < 14) {
      shift = 1;
      shiftStart = moment
        .tz(selectedDate, tz)
        .hour(6)
        .minute(0)
        .second(0)
        .millisecond(0);
      shiftEnd = moment
        .tz(selectedDate, tz)
        .hour(14)
        .minute(0)
        .second(0)
        .millisecond(0);
    } else if (currentHour >= 14 && currentHour < 22) {
      shift = 2;
      shiftStart = moment
        .tz(selectedDate, tz)
        .hour(14)
        .minute(0)
        .second(0)
        .millisecond(0);
      shiftEnd = moment
        .tz(selectedDate, tz)
        .hour(22)
        .minute(0)
        .second(0)
        .millisecond(0);
    } else {
      shift = 3;
      if (currentHour < 6) {
        shiftStart = moment
          .tz(selectedDate, tz)
          .subtract(1, "day")
          .hour(22)
          .minute(0)
          .second(0)
          .millisecond(0);
        shiftEnd = moment
          .tz(selectedDate, tz)
          .hour(6)
          .minute(0)
          .second(0)
          .millisecond(0);
      } else {
        shiftStart = moment
          .tz(selectedDate, tz)
          .hour(22)
          .minute(0)
          .second(0)
          .millisecond(0);
        shiftEnd = moment
          .tz(selectedDate, tz)
          .add(1, "day")
          .hour(6)
          .minute(0)
          .second(0)
          .millisecond(0);
      }
    }

    const startRange = shiftStart.toDate();
    const endRange = shiftEnd.toDate();

    const activeProcesses = await prisma.process.findMany({
      where: { isDeleted: false },
      select: { id: true },
    });
    const processIds = activeProcesses.map((p) => p.id);

    const [allProduction, allScrapEntries] = await Promise.all([
      prisma.productionResponse.findMany({
        where: {
          processId: { in: processIds },
          updatedAt: { gte: startRange, lte: endRange },
          isDeleted: false,
        },
        select: { completedQuantity: true, scrapQuantity: true },
      }),
      prisma.scapEntries.findMany({
        where: {
          processId: { in: processIds },
          updatedAt: { gte: startRange, lte: endRange },
          isDeleted: false,
        },
        select: { returnQuantity: true },
      }),
    ]);

    let totalActual = 0;
    let totalScrap = 0;

    allProduction.forEach((resData) => {
      totalActual += Number(resData.completedQuantity) || 0;
      totalScrap += Number(resData.scrapQuantity) || 0;
    });

    allScrapEntries.forEach((scrap) => {
      totalScrap += Number(scrap.returnQuantity) || 0;
    });

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
      shiftInfo: {
        currentShift: shift,
        start: shiftStart.format("YYYY-MM-DD HH:mm"),
        end: shiftEnd.format("YYYY-MM-DD HH:mm"),
        currentTimeInTZ: now.format("HH:mm"),
        timezoneUsed: tz,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
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
    const currentHour = moment().tz(tz).hour();
    let shift = 1;
    let shiftStart, shiftEnd;

    if (currentHour >= 6 && currentHour < 14) {
      shift = 1;
      shiftStart = moment
        .tz(selectedDate, tz)
        .hour(6)
        .minute(0)
        .second(0)
        .millisecond(0);
      shiftEnd = moment
        .tz(selectedDate, tz)
        .hour(14)
        .minute(0)
        .second(0)
        .millisecond(0);
    } else if (currentHour >= 14 && currentHour < 22) {
      shift = 2;
      shiftStart = moment
        .tz(selectedDate, tz)
        .hour(14)
        .minute(0)
        .second(0)
        .millisecond(0);
      shiftEnd = moment
        .tz(selectedDate, tz)
        .hour(22)
        .minute(0)
        .second(0)
        .millisecond(0);
    } else {
      shift = 3;
      if (currentHour < 6) {
        shiftStart = moment
          .tz(selectedDate, tz)
          .subtract(1, "day")
          .hour(22)
          .minute(0)
          .second(0)
          .millisecond(0);
        shiftEnd = moment
          .tz(selectedDate, tz)
          .hour(6)
          .minute(0)
          .second(0)
          .millisecond(0);
      } else {
        shiftStart = moment
          .tz(selectedDate, tz)
          .hour(22)
          .minute(0)
          .second(0)
          .millisecond(0);
        shiftEnd = moment
          .tz(selectedDate, tz)
          .add(1, "day")
          .hour(6)
          .minute(0)
          .second(0)
          .millisecond(0);
      }
    }

    const startRange = shiftStart.toDate();
    const endRange = shiftEnd.toDate();

    const activeProcesses = await prisma.process.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        processName: true,
        machineName: true,
        cycleTime: true,
      },
    });

    const processIds = activeProcesses.map((p) => p.id);

    const [allProduction, allScrap] = await Promise.all([
      prisma.productionResponse.findMany({
        where: {
          processId: { in: processIds },
          OR: [
            { submittedDateTime: { gte: startRange, lte: endRange } },
            { createdAt: { gte: startRange, lte: endRange } },
          ],
          isDeleted: false,
        },
        include: { employeeInfo: true },
      }),
      prisma.scapEntries.findMany({
        where: {
          processId: { in: processIds },
          createdAt: { gte: startRange, lte: endRange },
          isDeleted: false,
        },
        include: { createdByEmployee: true },
      }),
    ]);

    let grandTotalActual = 0;
    let grandTotalScrap = 0;

    const allProcessData = activeProcesses.map((process) => {
      const cycleTimeMinutes = process.cycleTime
        ? parseCycleTime(process.cycleTime)
        : 0;
      const targetPerHour =
        cycleTimeMinutes > 0 ? Math.round(60 / cycleTimeMinutes) : 0;

      const hourlyDataMap = {};
      let tempHour = shiftStart.clone();
      for (let i = 0; i < 8; i++) {
        const hourKey = tempHour.format("HH:00");
        hourlyDataMap[hourKey] = { actual: 0, scrap: 0, target: targetPerHour };
        tempHour.add(1, "hour");
      }

      const employeesSet = new Map();
      let processTotalActual = 0;
      let processTotalScrap = 0;

      const processProduction = allProduction.filter(
        (p) => p.processId === process.id,
      );
      processProduction.forEach((resData) => {
        const entryTime = resData.submittedDateTime || resData.createdAt;
        const hour = moment(entryTime).tz(tz).format("HH:00");

        const qty = Number(resData.completedQuantity) || 0;
        const sQty = Number(resData.scrapQuantity) || 0;

        if (hourlyDataMap[hour]) {
          hourlyDataMap[hour].actual += qty;
          hourlyDataMap[hour].scrap += sQty;
          processTotalActual += qty;
          processTotalScrap += sQty;
        }

        if (resData.employeeInfo) {
          employeesSet.set(resData.employeeInfo.id, {
            name: `${resData.employeeInfo.firstName} ${resData.employeeInfo.lastName}`,
            profileImage: resData.employeeInfo.employeeProfileImg || "",
          });
        }
      });

      const processScrap = allScrap.filter((s) => s.processId === process.id);
      processScrap.forEach((scrap) => {
        const hour = moment(scrap.createdAt).tz(tz).format("HH:00");
        const sQty = Number(scrap.returnQuantity) || 0;

        if (hourlyDataMap[hour]) {
          hourlyDataMap[hour].scrap += sQty;
          processTotalScrap += sQty;
        }
      });

      grandTotalActual += processTotalActual;
      grandTotalScrap += processTotalScrap;

      return {
        processId: process.id,
        processName: process.processName,
        machineName: process.machineName,
        hourlyData: Object.entries(hourlyDataMap).map(([hour, data]) => ({
          hour,
          ...data,
        })),
        total: {
          actual: processTotalActual,
          scrap: processTotalScrap,
          target: targetPerHour * 8,
        },
        employees: Array.from(employeesSet.values()),
      };
    });

    const grandTotals = {
      actual: grandTotalActual,
      scrap: grandTotalScrap,
      target: allProcessData.reduce((acc, curr) => acc + curr.total.target, 0),
      shift: shift,
    };

    return res.json({ allProcessData, grandTotals });
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

// const currentStatusOverview = async (req, res) => {
//   try {
//     const { startDate, endDate, tz = "Asia/Kolkata" } = req.query;

//     const todayStart = startDate
//       ? moment.tz(startDate, tz).startOf("day").toDate()
//       : moment.tz(tz).startOf("day").toDate();
//     const todayEnd = endDate
//       ? moment.tz(endDate, tz).endOf("day").toDate()
//       : moment.tz(tz).endOf("day").toDate();

//     const dateFilter = { gte: todayStart, lte: todayEnd };

//     const [stockOrders, scrapEntries] = await Promise.all([
//       prisma.stockOrderSchedule.findMany({
//         where: { isDeleted: false, updatedAt: dateFilter },
//         include: {
//           part: { select: { partDescription: true, partNumber: true } },
//           process: {
//             select: { processName: true, machineName: true, cycleTime: true },
//           },
//         },
//       }),
//       prisma.scapEntries.findMany({
//         where: { isDeleted: false, updatedAt: dateFilter },
//         include: {
//           PartNumber: {
//             select: {
//               partDescription: true,
//               partNumber: true,
//               process: {
//                 select: {
//                   processName: true,
//                   machineName: true,
//                   cycleTime: true,
//                 },
//               },
//             },
//           },
//           process: {
//             select: { processName: true, machineName: true, cycleTime: true },
//           },
//         },
//       }),
//     ]);

//     let totalActual = 0;
//     let totalScrap = 0;
//     let totalScheduled = 0;
//     const completedDetails = [];

//     stockOrders.forEach((order) => {
//       const actual = Number(order.completedQuantity) || 0;
//       const scheduled = Number(order.scheduleQuantity) || 0;
//       const scrap = Number(order.scrapQuantity) || 0;
//       totalActual += actual;
//       totalScheduled += scheduled;
//       totalScrap += scrap;

//       if (actual > 0 || scrap > 0) {
//         const cycleTime = order.process?.cycleTime
//           ? parseFloat(order.process.cycleTime)
//           : 0;
//         const targetPerHour = cycleTime > 0 ? Math.round(60 / cycleTime) : 0;

//         completedDetails.push({
//           processName: order.process?.processName || "Production",
//           machineName: order.process?.machineName || "N/A",
//           partNumber: order.part?.partNumber || "N/A",
//           partDescription: order.part?.partDescription || "N/A",
//           actual: actual,
//           scheduled: scheduled,
//           scrap: scrap,
//           targetPerHour: targetPerHour,
//           type: "Production",
//           lastAction: order.updatedAt,
//         });
//       }
//     });

//     scrapEntries.forEach((entry) => {
//       const sQty =
//         Number(entry.scrapQuantity) || Number(entry.returnQuantity) || 0;

//       if (sQty > 0) {
//         totalScrap += sQty;

//         const processInfo = entry.process || entry.PartNumber?.process;
//         const cycleTime = processInfo?.cycleTime
//           ? parseFloat(processInfo.cycleTime)
//           : 0;
//         const targetPerHour = cycleTime > 0 ? Math.round(60 / cycleTime) : 0;

//         completedDetails.push({
//           processName: processInfo?.processName || "Manual Entry",
//           machineName: processInfo?.machineName || "N/A",
//           partNumber: entry.PartNumber?.partNumber || "N/A",
//           partDescription: entry.PartNumber?.partDescription || "N/A",
//           actual: 0,
//           scheduled: 0,
//           scrap: sQty,
//           targetPerHour: targetPerHour,
//           type: entry.type || "Return/Scrap",
//           lastAction: entry.updatedAt,
//         });
//       }
//     });

//     res.json({
//       summary: {
//         totalActual,
//         totalScrap,
//         totalScheduled,
//         totalOrders: stockOrders.length,
//       },
//       details: completedDetails,
//     });
//   } catch (error) {
//     res.status(500).json({ error: "Internal Error", details: error.message });
//   }
// };

// const currentStatusOverview = async (req, res) => {
//   try {
//     const { startDate, endDate, tz = "Asia/Kolkata" } = req.query;

//     const todayStart = startDate
//       ? moment.tz(startDate, tz).startOf("day").toDate()
//       : moment.tz(tz).startOf("day").toDate();
//     const todayEnd = endDate
//       ? moment.tz(endDate, tz).endOf("day").toDate()
//       : moment.tz(tz).endOf("day").toDate();

//     const dateFilter = { gte: todayStart, lte: todayEnd };

//     const [stockOrders, scrapEntries] = await Promise.all([
//       prisma.stockOrderSchedule.findMany({
//         where: { isDeleted: false, updatedAt: dateFilter },
//         include: {
//           part: { select: { partDescription: true, partNumber: true } },
//           process: {
//             select: { processName: true, machineName: true, cycleTime: true },
//           },
//         },
//       }),
//       prisma.scapEntries.findMany({
//         where: { isDeleted: false, updatedAt: dateFilter },
//         include: {
//           PartNumber: {
//             select: {
//               partDescription: true,
//               partNumber: true,
//               process: {
//                 select: {
//                   processName: true,
//                   machineName: true,
//                   cycleTime: true,
//                 },
//               },
//             },
//           },
//           process: {
//             select: { processName: true, machineName: true, cycleTime: true },
//           },
//         },
//       }),
//     ]);

//     let totalActual = 0;
//     let totalScrap = 0;
//     let totalScheduled = 0;
//     const completedDetails = [];

//     stockOrders.forEach((order) => {
//       const actual = Number(order.completedQuantity) || 0;
//       const scheduled = Number(order.scheduleQuantity) || 0;
//       const scrap = Number(order.scrapQuantity) || 0;

//       totalActual += actual;
//       totalScheduled += scheduled;
//       totalScrap += scrap;

//       if (actual > 0 || scrap > 0) {
//         const cycleTime = order.process?.cycleTime
//           ? parseFloat(order.process.cycleTime)
//           : 0;
//         const targetPerHour = cycleTime > 0 ? Math.round(60 / cycleTime) : 0;
//         const rowProductivity = scheduled > 0 ? (actual / scheduled) * 100 : 0;
//         const rowEfficiency =
//           scheduled > 0 ? ((actual + scrap) / scheduled) * 100 : 0;

//         completedDetails.push({
//           processName: order.process?.processName || "Production",
//           machineName: order.process?.machineName || "N/A",
//           partNumber: order.part?.partNumber || "N/A",
//           partDescription: order.part?.partDescription || "N/A",
//           actual: actual,
//           scheduled: scheduled,
//           scrap: scrap,
//           targetPerHour: targetPerHour,
//           productivity: Math.min(rowProductivity, 100).toFixed(2),
//           efficiency: Math.min(rowEfficiency, 100).toFixed(2),
//           type: "Production",
//           lastAction: order.updatedAt,
//         });
//       }
//     });

//     scrapEntries.forEach((entry) => {
//       const sQty =
//         Number(entry.scrapQuantity) || Number(entry.returnQuantity) || 0;

//       if (sQty > 0) {
//         totalScrap += sQty;

//         const processInfo = entry.process || entry.PartNumber?.process;
//         const cycleTime = processInfo?.cycleTime
//           ? parseFloat(processInfo.cycleTime)
//           : 0;
//         const targetPerHour = cycleTime > 0 ? Math.round(60 / cycleTime) : 0;

//         completedDetails.push({
//           processName: processInfo?.processName || "Manual Entry",
//           machineName: processInfo?.machineName || "N/A",
//           partNumber: entry.PartNumber?.partNumber || "N/A",
//           partDescription: entry.PartNumber?.partDescription || "N/A",
//           actual: 0,
//           scheduled: 0,
//           scrap: sQty,
//           targetPerHour: targetPerHour,
//           productivity: "0.00",
//           efficiency: "0.00",
//           type: entry.type || "Return/Scrap",
//           lastAction: entry.updatedAt,
//         });
//       }
//     });

//     // Summary calculations
//     const overallProductivity =
//       totalScheduled > 0 ? (totalActual / totalScheduled) * 100 : 0;
//     const overallEfficiency =
//       totalScheduled > 0
//         ? ((totalActual + totalScrap) / totalScheduled) * 100
//         : 0;

//     res.json({
//       summary: {
//         totalActual,
//         totalScrap,
//         totalScheduled,
//         totalOrders: stockOrders.length,
//         // Overall metrics capped at 100%
//         productivity: Math.min(overallProductivity, 100).toFixed(2),
//         efficiency: Math.min(overallEfficiency, 100).toFixed(2),
//       },
//       details: completedDetails,
//     });
//   } catch (error) {
//     res.status(500).json({ error: "Internal Error", details: error.message });
//   }
// };

const currentStatusOverview = async (req, res) => {
  try {
    const { startDate, endDate, tz = "Asia/Kolkata" } = req.query;

    const todayStart = startDate
      ? moment.tz(startDate, tz).startOf("day").toDate()
      : moment.tz(tz).startOf("day").toDate();
    const todayEnd = endDate
      ? moment.tz(endDate, tz).endOf("day").toDate()
      : moment.tz(tz).endOf("day").toDate();

    const dateFilter = { gte: todayStart, lte: todayEnd };

    const [stockOrders, scrapEntries] = await Promise.all([
      prisma.stockOrderSchedule.findMany({
        where: { isDeleted: false, updatedAt: dateFilter },
        include: {
          part: { select: { partDescription: true, partNumber: true } },
          process: {
            select: { processName: true, machineName: true, cycleTime: true },
          },
        },
      }),
      prisma.scapEntries.findMany({
        where: { isDeleted: false, updatedAt: dateFilter },
        include: {
          PartNumber: {
            select: {
              partDescription: true,
              partNumber: true,
              process: {
                select: {
                  processName: true,
                  machineName: true,
                  cycleTime: true,
                },
              },
            },
          },
          process: {
            select: { processName: true, machineName: true, cycleTime: true },
          },
        },
      }),
    ]);

    let totalActual = 0;
    let totalScrap = 0;
    let totalScheduled = 0;
    const completedDetails = [];

    // 1. Stock Orders calculation
    stockOrders.forEach((order) => {
      const actual = Number(order.completedQuantity) || 0;
      const scheduled = Number(order.scheduleQuantity) || 0;
      const scrap = Number(order.scrapQuantity) || 0;

      totalActual += actual;
      totalScheduled += scheduled;
      totalScrap += scrap;

      if (actual > 0 || scrap > 0) {
        const cycleTime = order.process?.cycleTime
          ? parseFloat(order.process.cycleTime)
          : 0;
        const targetPerHour = cycleTime > 0 ? Math.round(60 / cycleTime) : 0;

        // Productivity Calculation (Actual / Scheduled)
        let rowProductivity = scheduled > 0 ? (actual / scheduled) * 100 : 0;
        // Efficiency Calculation (Total Output / Scheduled)
        let rowEfficiency =
          scheduled > 0 ? ((actual + scrap) / scheduled) * 100 : 0;

        completedDetails.push({
          processName: order.process?.processName || "Production",
          machineName: order.process?.machineName || "N/A",
          partNumber: order.part?.partNumber || "N/A",
          partDescription: order.part?.partDescription || "N/A",
          actual: actual,
          scheduled: scheduled,
          scrap: scrap,
          targetPerHour: targetPerHour,
          // 100% maximum limit apply ki gayi hai
          productivity: Math.min(rowProductivity, 100).toFixed(2),
          efficiency: Math.min(rowEfficiency, 100).toFixed(2),
          type: "Production",
          lastAction: order.updatedAt,
        });
      }
    });

    // 2. Manual Scrap Entries (इनका productivity 0 रहेगा क्योंकि schedule नहीं है)
    scrapEntries.forEach((entry) => {
      const sQty =
        Number(entry.scrapQuantity) || Number(entry.returnQuantity) || 0;

      if (sQty > 0) {
        totalScrap += sQty;
        const processInfo = entry.process || entry.PartNumber?.process;
        const cycleTime = processInfo?.cycleTime
          ? parseFloat(processInfo.cycleTime)
          : 0;
        const targetPerHour = cycleTime > 0 ? Math.round(60 / cycleTime) : 0;

        completedDetails.push({
          processName: processInfo?.processName || "Manual Entry",
          machineName: processInfo?.machineName || "N/A",
          partNumber: entry.PartNumber?.partNumber || "N/A",
          partDescription: entry.PartNumber?.partDescription || "N/A",
          actual: 0,
          scheduled: 0,
          scrap: sQty,
          targetPerHour: targetPerHour,
          productivity: "0.00",
          efficiency: "0.00",
          type: entry.type || "Return/Scrap",
          lastAction: entry.updatedAt,
        });
      }
    });

    // 3. Overall Summary Calculations
    const overallProductivityRaw =
      totalScheduled > 0 ? (totalActual / totalScheduled) * 100 : 0;
    const overallEfficiencyRaw =
      totalScheduled > 0
        ? ((totalActual + totalScrap) / totalScheduled) * 100
        : 0;

    res.json({
      summary: {
        totalActual,
        totalScrap,
        totalScheduled,
        totalOrders: stockOrders.length,
        // Overall metrics also capped at 100%
        productivity: Math.min(overallProductivityRaw, 100).toFixed(2),
        efficiency: Math.min(overallEfficiencyRaw, 100).toFixed(2),
      },
      details: completedDetails,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Error", details: error.message });
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
    const { startDate, endDate } = req.query;

    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      const today = new Date();
      start = new Date(today.setHours(0, 0, 0, 0));
      end = new Date(today.setHours(23, 59, 59, 999));
    }

    const manualData = await prisma.stockOrderSchedule.findMany({
      where: { createdAt: { gte: start, lte: end }, isDeleted: false },
      include: {
        part: { select: { partNumber: true, partDescription: true } },
        customPart: { select: { partNumber: true } },
        CustomOrder: { select: { partNumber: true } },
        process: { select: { processName: true, machineName: true } },
      },
    });

    const manualGrouped = {};
    manualData.forEach((item) => {
      const pDisplay = `${item.process?.processName || "N/A"} (${item.process?.machineName || ""})`;

      const partD =
        item.part?.partDescription ||
        item.part?.partNumber ||
        item.customPart?.partNumber ||
        item.CustomOrder?.partNumber ||
        "Custom Part";

      const key = `${pDisplay}-${partD}`;

      if (!manualGrouped[key]) {
        manualGrouped[key] = {
          process: pDisplay,
          part: partD,
          qty: 0,
          scrap: 0,
        };
      }
      manualGrouped[key].qty += item.completedQuantity || 0;
      manualGrouped[key].scrap += item.scrapQuantity || 0;
    });

    const productionData = await prisma.productionResponse.findMany({
      where: { isDeleted: false, createdAt: { gte: start, lte: end } },
      include: {
        PartNumber: { select: { partNumber: true, partDescription: true } },
        CustomOrder: { select: { partNumber: true } },
        process: { select: { processName: true, machineName: true } },
      },
    });

    const monitorTable = productionData
      .filter((item) => item.completedQuantity > 0 || item.scrapQuantity > 0)
      .map((item) => {
        const sTime = new Date(item.cycleTimeStart);
        const eTime = item.cycleTimeEnd
          ? new Date(item.cycleTimeEnd)
          : new Date();
        const diffSec = (eTime - sTime) / 1000;

        return {
          process: `${item.process?.processName || "N/A"} (${item.process?.machineName || ""})`,
          part:
            item.PartNumber?.partDescription ||
            item.PartNumber?.partNumber ||
            item.CustomOrder?.partNumber ||
            "Custom Part",
          cycleTime:
            diffSec < 60
              ? `${diffSec.toFixed(0)} sec`
              : `${(diffSec / 60).toFixed(2)} min`,
        };
      });

    const scrapEntries = await prisma.scapEntries.findMany({
      where: { createdAt: { gte: start, lte: end }, isDeleted: false },
      include: {
        PartNumber: { select: { partNumber: true, partDescription: true } },
        process: { select: { processName: true, machineName: true } },
        StockOrder: { select: { orderNumber: true } },
      },
    });

    const scrapGroupedMap = {};
    scrapEntries.forEach((entry) => {
      const pDisplay = `${entry.process?.processName || "N/A"} (${entry.process?.machineName || ""})`;
      const partD =
        entry.PartNumber?.partDescription ||
        entry.PartNumber?.partNumber ||
        "Manual Scrap";
      const key = `${pDisplay}-${partD}`;

      if (!scrapGroupedMap[key]) {
        scrapGroupedMap[key] = { process: pDisplay, part: partD, scrap: 0 };
      }
      scrapGroupedMap[key].scrap += entry.returnQuantity || 0;
    });

    Object.values(manualGrouped).forEach((item) => {
      if (item.scrap > 0) {
        if (!scrapGroupedMap[`${item.process}-${item.part}`]) {
          scrapGroupedMap[`${item.process}-${item.part}`] = {
            process: item.process,
            part: item.part,
            scrap: item.scrap,
          };
        } else {
        }
      }
    });

    const productionScrap = Object.values(scrapGroupedMap).sort(
      (a, b) => b.scrap - a.scrap,
    );

    return res.status(200).json({
      manualTable: Object.values(manualGrouped),
      monitorTable,
      productionScrap,
      totals: {
        totalCompletedQty: manualData.reduce(
          (sum, i) => sum + (i.completedQuantity || 0),
          0,
        ),
        totalScrapQty: Object.values(scrapGroupedMap).reduce(
          (sum, i) => sum + i.scrap,
          0,
        ),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
// const cycleTimeComparisionData = async (req, res) => {
//   try {
//     let { startDate, endDate, partId, processId } = req.query;
//     if (!partId) {
//       return res.status(400).json({ error: "partId is required" });
//     }
//     const start = new Date(startDate || "2024-01-01");
//     const end = new Date(endDate || "2025-12-31");

//     if (isNaN(start.getTime()) || isNaN(end.getTime())) {
//       return res
//         .status(400)
//         .json({ error: "Invalid date format (YYYY-MM-DD)" });
//     }

//     const respWhere = {
//       partId: partId,
//       isDeleted: false,
//     };

//     if (processId) {
//       respWhere.processId = processId;
//     }

//     const productionResponses = await prisma.productionResponse.findMany({
//       where: respWhere,
//       include: {
//         process: { select: { processName: true, machineName: true } },
//         PartNumber: { select: { cycleTime: true } },
//       },
//     });

//     const grouped = {};
//     productionResponses.forEach((resp) => {
//       if (!grouped[resp.processId]) {
//         grouped[resp.processId] = {
//           processName: resp.process?.processName || "Unknown",
//           machineName: resp.process?.machineName || "N/A",
//           manualCTs: [],
//           idealCT: resp.PartNumber?.cycleTime
//             ? Number(resp.PartNumber.cycleTime) / 60
//             : 0,
//         };
//       }

//       if (resp.cycleTimeStart && resp.cycleTimeEnd) {
//         const durationMin =
//           (new Date(resp.cycleTimeEnd) - new Date(resp.cycleTimeStart)) /
//           1000 /
//           60;
//         if (durationMin > 0)
//           grouped[resp.processId].manualCTs.push(durationMin);
//       }
//     });

//     const processWiseCT = Object.values(grouped).map((p) => ({
//       processName: p.processName,
//       machineName: p.machineName,
//       manualCT:
//         p.manualCTs.length > 0
//           ? p.manualCTs.reduce((a, b) => a + b, 0) / p.manualCTs.length
//           : 0,
//       idealCT: p.idealCT,
//     }));

//     const stepTrackings = await prisma.productionStepTracking.findMany({
//       where: {
//         status: "completed",
//         stepStartTime: { not: null },
//         stepEndTime: { not: null },
//         productionResponse: {
//           processId: processId || undefined,
//           isDeleted: false,
//         },
//       },
//       include: {
//         workInstructionStep: {
//           select: {
//             id: true,
//             stepNumber: true,
//             title: true,
//           },
//         },
//       },
//     });

//     const stepGrouped = {};
//     stepTrackings.forEach((st) => {
//       const stepId = st.workInstructionStep?.id;
//       if (!stepId) return;

//       const duration =
//         (new Date(st.stepEndTime) - new Date(st.stepStartTime)) / 1000 / 60;

//       if (!stepGrouped[stepId]) {
//         stepGrouped[stepId] = {
//           stepId,
//           stepTitle: st.workInstructionStep.title,
//           stepNumber: st.workInstructionStep.stepNumber,
//           durations: [],
//         };
//       }
//       if (duration > 0) stepGrouped[stepId].durations.push(duration);
//     });

//     const stepAverages = Object.values(stepGrouped)
//       .map((s) => ({
//         stepId: s.stepId,
//         stepTitle: s.stepTitle,
//         stepNumber: s.stepNumber,
//         averageDuration:
//           s.durations.reduce((a, b) => a + b, 0) / s.durations.length,
//         count: s.durations.length,
//       }))
//       .sort((a, b) => a.stepNumber - b.stepNumber);

//     const overallAverage =
//       stepAverages.length > 0
//         ? stepAverages.reduce((sum, s) => sum + s.averageDuration, 0) /
//           stepAverages.length
//         : 0;

//     res.json({
//       message: "Cycle Time Comparison fetched successfully",
//       data: {
//         processWiseCT,
//         stepWiseCT: {
//           stepAverages,
//           overallAverage,
//         },
//       },
//     });
//   } catch (error) {
//     res.status(500).json({
//       error: "Internal Server Error",
//       details: error.message,
//     });
//   }
// };

const cycleTimeComparisionData = async (req, res) => {
  try {
    let { startDate, endDate, partId, processId } = req.query;
    if (!partId) {
      return res.status(400).json({ error: "partId is required" });
    }
    const start = new Date(startDate || "2024-01-01");
    const end = new Date(endDate || "2025-12-31");

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res
        .status(400)
        .json({ error: "Invalid date format (YYYY-MM-DD)" });
    }

    const respWhere = {
      partId: partId,
      isDeleted: false,
    };

    if (processId) {
      respWhere.processId = processId;
    }

    const productionResponses = await prisma.productionResponse.findMany({
      where: respWhere,
      include: {
        process: { select: { processName: true, machineName: true } },
        PartNumber: { select: { cycleTime: true } },
      },
    });

    const grouped = {};
    productionResponses.forEach((resp) => {
      if (!grouped[resp.processId]) {
        grouped[resp.processId] = {
          processName: resp.process?.processName || "Unknown",
          machineName: resp.process?.machineName || "N/A",
          manualCTs: [],
          idealCT: resp.PartNumber?.cycleTime
            ? Number(resp.PartNumber.cycleTime) / 60
            : 0,
        };
      }

      if (resp.cycleTimeStart && resp.cycleTimeEnd) {
        const durationMin =
          (new Date(resp.cycleTimeEnd) - new Date(resp.cycleTimeStart)) /
          1000 /
          60;
        if (durationMin > 0)
          grouped[resp.processId].manualCTs.push(durationMin);
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
        productionResponse: {
          processId: processId || undefined,
          isDeleted: false,
        },
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

    const stepGrouped = {};
    stepTrackings.forEach((st) => {
      const stepId = st.workInstructionStep?.id;
      if (!stepId) return;

      const duration =
        (new Date(st.stepEndTime) - new Date(st.stepStartTime)) / 1000 / 60;

      if (!stepGrouped[stepId]) {
        stepGrouped[stepId] = {
          stepId,
          stepTitle: st.workInstructionStep.title,
          stepNumber: st.workInstructionStep.stepNumber,
          durations: [],
        };
      }
      if (duration > 0) stepGrouped[stepId].durations.push(duration);
    });

    const stepAverages = Object.values(stepGrouped)
      .map((s) => ({
        stepId: s.stepId,
        stepTitle: s.stepTitle,
        stepNumber: s.stepNumber,
        averageDuration:
          s.durations.reduce((a, b) => a + b, 0) / s.durations.length,
        count: s.durations.length,
      }))
      .sort((a, b) => a.stepNumber - b.stepNumber);

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
    console.error("API Error:", error);
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
      if (percent > 100) percent = 100;
      if (percent < -100) percent = -100;

      let indicator = "gray";
      if (percent > 0) indicator = reverse ? "red" : "green";
      if (percent < 0) indicator = reverse ? "green" : "red";
      return { percent: Math.abs(percent).toFixed(2), indicator };
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
      orderMap[o.id] = { ...o, type: "Stock" };
    });
    customOrdersAll.forEach((o) => {
      orderMap[o.id] = { ...o, type: "Custom" };
    });

    const productionResponses = await prisma.productionResponse.findMany({
      where: {
        isDeleted: false,
        submittedDateTime: { gte: currentStart, lte: currentEnd },
      },
      include: { process: true, employeeInfo: true, PartNumber: true },
      orderBy: { submittedDateTime: "desc" },
    });

    const productivityData = productionResponses
      .map((record) => {
        const completedQty = record.completedQuantity || 0;
        const partCost = parseFloat(record.PartNumber?.cost || 0);
        const completedPartCost = completedQty * partCost;

        let totalTimeSpentMinutes = 0;
        let actualCycleTimePerUnit = 0;

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
        let rawEfficiency =
          totalTimeSpentMinutes > 0
            ? ((completedQty * standardCT) / totalTimeSpentMinutes) * 100
            : 0;
        const efficiency = Math.min(rawEfficiency, 100).toFixed(2);

        let rawProductivity =
          record.scheduleQuantity > 0
            ? (completedQty / record.scheduleQuantity) * 100
            : 0;
        const productivity = Math.min(rawProductivity, 100).toFixed(2);

        return {
          process: record.process?.processName || "N/A",
          machineName: record.process?.machineName || "N/A",
          employee: record.employeeInfo?.fullName || "N/A",
          cycleTime: actualCycleTimePerUnit.toFixed(2),
          totalQty: record.scheduleQuantity || 0,
          scrapQuantity: record.scrapQuantity || 0,
          completedQty: completedQty,
          completedPartCost: completedPartCost.toFixed(2),
          productivity: `${productivity}%`,
          efficiency: `${efficiency}%`,
        };
      })
      .filter((item) => item.completedQty > 0);

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

    const fulfilledRaw = await prisma.stockOrderSchedule.findMany({
      where: {
        isDeleted: false,
        status: "completed",
        completed_date: { gte: currentStart, lte: currentEnd },
      },
      include: {
        part: true,
        customPart: true,
        completedByEmployee: true,
      },
      orderBy: { completed_date: "desc" },
    });

    const fulfilledList = fulfilledRaw.map((f) => {
      const orderDetails = orderMap[f.order_id];
      return {
        ...splitName(orderDetails?.customerName),
        date: f.completed_date,
        orderNo: orderDetails?.orderNumber || "N/A",
        product: f.part?.partNumber || f.customPart?.partNumber || "N/A",
        qty: f.completedQuantity,
        type: orderDetails?.type || "N/A",
        employee: f.completedByEmployee?.fullName || "N/A",
      };
    });

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

    const allInventoryItems = await prisma.partNumber.findMany({
      where: { isDeleted: false },
      include: { process: true },
    });

    let totalInventoryCost = 0;
    let totalInventoryCount = 0;
    allInventoryItems.forEach((item) => {
      const avail = item.availStock || 0;
      const min = item.minStock || 0;
      const extraStock = avail - min;
      if (extraStock > 0) {
        const unitValue =
          (parseFloat(item.cost) || 0) +
          ((parseFloat(item.cycleTime) || 0) / 60) *
            (item.process?.ratePerHour || 0);
        totalInventoryCount += extraStock;
        totalInventoryCost += extraStock * unitValue;
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
const scrapFromProduction = productionResponses.reduce((sum, record) => {
  const qty = record.scrapQuantity || 0;
  const cost = parseFloat(record.PartNumber?.cost || 0); // PartNumber relation hona chahiye
  return sum + (qty * cost);
}, 0);

const scrapQtyFromProduction = productionResponses.reduce((sum, record) => sum + (record.scrapQuantity || 0), 0);

// 2. ScapEntries se scrap nikalna (General/Supplier scrap)
const scrapFromEntriesCost = currScrapEntries.reduce((sum, e) => {
  const qty = Number(e.returnQuantity) || 0;
  const cost = parseFloat(e.PartNumber?.cost || 0);
  return sum + (qty * cost);
}, 0);

const scrapQtyFromEntries = currScrapEntries.reduce((sum, e) => sum + (Number(e.returnQuantity) || 0), 0);

// TOTALS
const totalScrapCost = scrapFromProduction + scrapFromEntriesCost;
const totalScrapQty = scrapQtyFromProduction + scrapQtyFromEntries

const lastMonthProductionResponses = await prisma.productionResponse.findMany({
  where: {
    isDeleted: false,
    submittedDateTime: { gte: lastMonthStart, lte: lastMonthEnd },
  },
  include: { PartNumber: true },
});

// 2. CURRENT MONTH SCRAP (ProductionResponse + ScapEntries)
const currentScrapQtyFromProd = productionResponses.reduce((sum, r) => sum + (r.scrapQuantity || 0), 0);
const currentScrapCostFromProd = productionResponses.reduce((sum, r) => 
  sum + (r.scrapQuantity || 0) * (parseFloat(r.PartNumber?.cost) || 0), 0);

const currentScrapQtyFromEntries = currScrapEntries.reduce((sum, e) => sum + (Number(e.returnQuantity) || 0), 0);
const currentScrapCostFromEntries = currScrapEntries.reduce((sum, e) => 
  sum + (Number(e.returnQuantity) || 0) * (parseFloat(e.PartNumber?.cost) || 0), 0);

const totalCurrentScrapQty = currentScrapQtyFromProd + currentScrapQtyFromEntries;
const totalCurrentScrapCost = currentScrapCostFromProd + currentScrapCostFromEntries;

// 3. LAST MONTH SCRAP (Comparison ke liye)
const lastScrapQtyFromProd = lastMonthProductionResponses.reduce((sum, r) => sum + (r.scrapQuantity || 0), 0);
const lastScrapCostFromProd = lastMonthProductionResponses.reduce((sum, r) => 
  sum + (r.scrapQuantity || 0) * (parseFloat(r.PartNumber?.cost) || 0), 0);

const lastScrapQtyFromEntries = lastScrapEntries.reduce((sum, e) => sum + (Number(e.returnQuantity) || 0), 0);
const lastScrapCostFromEntries = lastScrapEntries.reduce((sum, e) => 
  sum + (Number(e.returnQuantity) || 0) * (parseFloat(e.PartNumber?.cost) || 0), 0);

const totalLastScrapQty = lastScrapQtyFromProd + lastScrapQtyFromEntries;
const totalLastScrapCost = lastScrapCostFromProd + lastScrapCostFromEntries;
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
        // scrapChangePercent: getStats(cT.sQty, lT.sQty, true).percent,
        // scrapIndicator: getStats(cT.sQty, lT.sQty, true).indicator,
       
    scrapChangePercent: getStats(totalCurrentScrapQty, totalLastScrapQty, true).percent,
    scrapIndicator: getStats(totalCurrentScrapQty, totalLastScrapQty, true).indicator,
      },
      openOrders: { total: openOrdersList.length, list: openOrdersList },
      fulfilledOrders: { total: fulfilledList.length, list: fulfilledList },
      totalOrders: openOrdersList.length + fulfilledList.length,
    });
  } catch (error) {
    console.log(error);
    
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
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};
// const productionEfficieny = async (req, res) => {
//   try {
//     const { month, year } = req.query;

//     const startDate = new Date(year, month - 1, 1, 0, 0, 0);
//     const endDate = new Date(year, month, 0, 23, 59, 59, 999);

//     const [scheduleData, scrapFromEntries, productionResponses] = await Promise.all([
//       prisma.stockOrderSchedule.findMany({
//         where: { isDeleted: false, createdAt: { gte: startDate, lte: endDate } },
//         include: { part: true },
//       }),
//       prisma.scapEntries.findMany({
//         where: { isDeleted: false, createdAt: { gte: startDate, lte: endDate } },
//         include: { PartNumber: true },
//       }),
//       // Dashboard se match karne ke liye ye table zaroori hai
//       prisma.productionResponse.findMany({
//         where: { isDeleted: false, submittedDateTime: { gte: startDate, lte: endDate } },
//         include: { PartNumber: true },
//       }),
//     ]);

//     let totalCompleted = 0;
//     let totalScrapCost = 0;
//     let totalSupplierReturn = 0;
//     const dailyMap = new Map();

//     // 1. Production Response se Scrap Cost calculate karein
//     productionResponses.forEach((record) => {
//       const sQty = record.scrapQuantity || 0;
//       const sCost = parseFloat(record.PartNumber?.cost || 0);
//       totalScrapCost += (sQty * sCost);
//     });

//     // 2. Stock Order Schedule calculation (Completed Qty)
//     scheduleData.forEach((item) => {
//       const d = new Date(item.createdAt);
//       const dateKey = d.toISOString().split("T")[0];
//       const compQty = item.completedQuantity || 0;
//       const scrapQty = item.scrapQuantity || 0; // Schedule ka scrap
//       const pCost = parseFloat(item.part?.cost || 0);

//       if (compQty > 0) {
//         totalCompleted += compQty;
//         if (!dailyMap.has(dateKey)) dailyMap.set(dateKey, { date: dateKey, completed: 0 });
//         dailyMap.get(dateKey).completed += compQty;
//       }

//       // Schedule table wali scrap cost bhi add karein (Dashboard logic match)
//       totalScrapCost += (scrapQty * pCost);
//     });

//     // 3. Scrap Entries calculation (Supplier Return logic)
//     scrapFromEntries.forEach((entry) => {
//       const entryQty = Number(entry.returnQuantity) || 0;
//       const entryPartCost = parseFloat(entry.PartNumber?.cost || 0);
//       const entryTotalCost = entryQty * entryPartCost;

//       totalScrapCost += entryTotalCost;

//       // Supplier Return check
//       if (entry.supplierId && entry.supplierId !== "") {
//         totalSupplierReturn += entryTotalCost;
//       }
//     });

//     return res.status(200).json({
//       success: true,
//       data: Array.from(dailyMap.values()).sort(
//         (a, b) => new Date(a.date) - new Date(b.date)
//       ),
//       totals: {
//         totalCompleted,
//         totalScrapCost: Number(totalScrapCost.toFixed(2)),
//         totalSupplierReturn: Number(totalSupplierReturn.toFixed(2)),
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

const productionEfficieny = async (req, res) => {
  try {
    const { month, year } = req.query;

    const startDate = new Date(year, month - 1, 1, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // DASHBOARD MATCH: Sirf in do tables ka data scrap cost ke liye use hota hai
    const [scheduleData, scrapFromEntries] = await Promise.all([
      prisma.stockOrderSchedule.findMany({
        where: { isDeleted: false, createdAt: { gte: startDate, lte: endDate } },
        include: { part: true },
      }),
      prisma.scapEntries.findMany({
        where: { isDeleted: false, createdAt: { gte: startDate, lte: endDate } },
        include: { PartNumber: true },
      }),
    ]);

    let totalCompleted = 0;
    let totalScrapCost = 0;
    let totalSupplierReturn = 0;
    const dailyMap = new Map();

    // 1. Stock Order Schedule Calculation (Completed Qty & Scrap Cost)
    // Dashboard logic: sCost += (r.scrapQuantity || 0) * (parseFloat(r.part?.cost) || 0)
    scheduleData.forEach((item) => {
      const d = new Date(item.createdAt);
      const dateKey = d.toISOString().split("T")[0];
      
      const compQty = item.completedQuantity || 0;
      const sQtyInSchedule = item.scrapQuantity || 0;
      const pCost = parseFloat(item.part?.cost || 0);

      // Completed Quantity
      if (compQty > 0) {
        totalCompleted += compQty;
        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, { date: dateKey, completed: 0 });
        }
        dailyMap.get(dateKey).completed += compQty;
      }

      // Scrap Cost (Schedule table se)
      totalScrapCost += (sQtyInSchedule * pCost);
    });

    // 2. Scrap Entries Calculation (General Scrap & Supplier Return)
    // Dashboard logic: sCost += qty * cost
    scrapFromEntries.forEach((entry) => {
      const entryQty = Number(entry.returnQuantity) || 0;
      const entryPartCost = parseFloat(entry.PartNumber?.cost || 0);
      const entryTotalCost = entryQty * entryPartCost;

      totalScrapCost += entryTotalCost;

      // Supplier Return check
      if (entry.supplierId && entry.supplierId !== "" && entry.supplierId !== null) {
        totalSupplierReturn += entryTotalCost;
      }
    });

    return res.status(200).json({
      success: true,
      data: Array.from(dailyMap.values()).sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      ),
      totals: {
        totalCompleted,
        totalScrapCost: Number(totalScrapCost.toFixed(2)),
        totalSupplierReturn: Number(totalSupplierReturn.toFixed(2)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
// const productionEfficieny = async (req, res) => {
//   try {
//     const { month, year } = req.query;

//     const startDate = new Date(year, month - 1, 1, 0, 0, 0);
//     const endDate = new Date(year, month, 0, 23, 59, 59, 999);

//     const [scheduleData, scrapFromEntries] = await Promise.all([
//       prisma.stockOrderSchedule.findMany({
//         where: {
//           isDeleted: false,
//           order_date: { gte: startDate, lte: endDate },
//         },
//         include: { part: true },
//       }),
//       prisma.scapEntries.findMany({
//         where: {
//           isDeleted: false,
//           createdAt: { gte: startDate, lte: endDate },
//         },
//         include: { PartNumber: true },
//       }),
//     ]);

//     let totalCompleted = 0;
//     let totalScrapCost = 0;
//     let totalSupplierReturn = 0;
//     const dailyMap = new Map();

//     scheduleData.forEach((item) => {
//       const d = new Date(item.order_date || item.createdAt);
//       const dateKey = d.toISOString().split("T")[0];

//       const compQty = item.completedQuantity || 0;
//       const scrpQty = item.scrapQuantity || 0;
//       const partCost = parseFloat(item.part?.cost || 0);

//       if (compQty > 0) {
//         totalCompleted += compQty;
//         if (!dailyMap.has(dateKey))
//           dailyMap.set(dateKey, { date: dateKey, completed: 0 });
//         dailyMap.get(dateKey).completed += compQty;
//       }

//       if (scrpQty > 0) {
//         totalScrapCost += scrpQty * partCost;
//       }
//     });

//     scrapFromEntries.forEach((entry) => {
//       const entryQty = Number(entry.returnQuantity) || 0;
//       const entryPartCost = parseFloat(entry.PartNumber?.cost || 0);
//       const entryTotalCost = entryQty * entryPartCost;

//       totalScrapCost += entryTotalCost;

//       if (
//         entry.supplierId ||
//         entry.type === "supplier" ||
//         entry.returnSupplierId
//       ) {
//         totalSupplierReturn += entryTotalCost;
//       }
//     });

//     return res.status(200).json({
//       success: true,
//       data: Array.from(dailyMap.values()).sort(
//         (a, b) => new Date(a.date) - new Date(b.date),
//       ),
//       totals: {
//         totalCompleted,
//         totalScrapCost: Number(totalScrapCost.toFixed(2)),
//         totalSupplierReturn: Number(totalSupplierReturn.toFixed(2)),
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };
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

// const revenueApi1 = async (req, res) => {
//   try {
//     const year = parseInt(req.query.year);
//     const schedules = await prisma.stockOrderSchedule.findMany({
//       where: { isDeleted: false },
//       include: {
//         part: true,
//         process: true,
//         StockOrder: true,
//         CustomOrder: true,
//       },
//     });

//     const fixedCosts = await prisma.fixedCost.findMany({
//       select: { expenseCost: true },
//     });

//     const totalFixedCost = fixedCosts.reduce(
//       (sum, item) => sum + parseFloat(item.expenseCost || 0),
//       0,
//     );

//     let totalRevenue = 0;
//     let totalCOGS = 0;
//     let scrapCost = 0;
//     let supplierReturn = 0;

//     let projectionOpenOrderRevenue = 0;
//     let projectionOpenPartsCost = 0;
//     let projectionOpenLaborCost = 0;

//     const monthlyRevenue = {};
//     const monthlyCOGS = {};
//     const dailyCashFlow = {};

//     schedules.forEach((order) => {
//       const date = new Date(order.order_date);
//       if (year && date.getFullYear() !== year) return;

//       const qtyFulfilled = order.completedQuantity || 0;
//       const qtyUnfulfilled = order.remainingQty || 0;

//       const monthKey =
//         date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
//       const dateKey = date.toISOString().slice(0, 10);

//       const partCost = parseFloat(order.part?.cost || 0);
//       const productCost = parseFloat(
//         order.StockOrder?.cost || order.CustomOrder?.totalCost || 0,
//       );
//       const cycleTimeMinutes = order.part?.cycleTime || 0;
//       const cycleTimeHours = cycleTimeMinutes / 60;
//       const ratePerHour = order?.process?.ratePerHour || 0;

//       const orderCOGS =
//         (partCost + cycleTimeHours * ratePerHour) * qtyFulfilled;
//       const fulfilledRevenue = (partCost + productCost) * qtyFulfilled;

//       totalRevenue += fulfilledRevenue;
//       totalCOGS += orderCOGS;

//       monthlyRevenue[monthKey] =
//         (monthlyRevenue[monthKey] || 0) + fulfilledRevenue;
//       monthlyCOGS[monthKey] = (monthlyCOGS[monthKey] || 0) + orderCOGS;

//       const unfulfilledRevenue = (partCost + productCost) * qtyUnfulfilled;
//       projectionOpenOrderRevenue += unfulfilledRevenue;

//       const unfulfilledPartsCost = partCost * qtyUnfulfilled;
//       projectionOpenPartsCost += unfulfilledPartsCost;

//       const unfulfilledLaborCost =
//         cycleTimeHours * ratePerHour * qtyUnfulfilled;
//       projectionOpenLaborCost += unfulfilledLaborCost;

//       const currentScrap = order.scrapQuantity
//         ? partCost * order.scrapQuantity
//         : 0;
//       scrapCost += currentScrap;
//       supplierReturn += currentScrap;

//       dailyCashFlow[dateKey] =
//         (dailyCashFlow[dateKey] || 0) + (partCost + productCost) * qtyFulfilled;
//     });

//     res.json({
//       totalRevenue,
//       totalCOGS,
//       grossProfit: totalRevenue - totalCOGS - scrapCost - supplierReturn,
//       scrapCost,
//       supplierReturn,
//       totalFixedCost,
//       monthlyRevenue,
//       monthlyCOGS,
//       dailyCashFlow,

//       projections: {
//         orderCard: {
//           title: "Total Open Order Revenue",
//           value: projectionOpenOrderRevenue,
//         },
//         partCard: {
//           title: "Total Open Parts Cost",
//           value: projectionOpenPartsCost,
//         },
//         employeeCard: {
//           title: "Total Open Labor Cost",
//           value: projectionOpenLaborCost,
//         },
//         fixedCostCard: {
//           title: "Total Fixed Cost",
//           value: totalFixedCost,
//         },
//       },

//       unfulfilledRevenue: projectionOpenOrderRevenue,
//       cashflowNeeded:
//         totalFixedCost + projectionOpenPartsCost + projectionOpenLaborCost,
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Something went wrong while fetching revenue & COGS.",
//       error: error.message,
//     });
//   }
// };

// const revenueApi1 = async (req, res) => {
//   try {
//     const { startDate, endDate, year } = req.query;

//     // 1. Date Range Logic (Timezone Friendly)
//     let start, end;
//     if (startDate) {
//       start = new Date(startDate);
//       start.setHours(0, 0, 0, 0);
//       const endRef = endDate ? new Date(endDate) : new Date(startDate);
//       end = new Date(endRef);
//       end.setHours(23, 59, 59, 999);
//     } else if (year) {
//       start = new Date(`${year}-01-01T00:00:00.000Z`);
//       end = new Date(`${year}-12-31T23:59:59.999Z`);
//     } else {
//       // Default: Current Year
//       const currentYear = new Date().getFullYear();
//       start = new Date(`${currentYear}-01-01T00:00:00.000Z`);
//       end = new Date(`${currentYear}-12-31T23:59:59.999Z`);
//     }

//     // 2. Fetch Data (Prisma level filter for performance)
//     const [schedules, fixedCosts] = await Promise.all([
//       prisma.stockOrderSchedule.findMany({
//         where: {
//           isDeleted: false,
//           // Note: Agar projections saare dekhne hain regardless of date,
//           // toh yahan se order_date filter hatana padega.
//           // Lekin reporting ke liye filtered data hi sahi rehta hai.
//           order_date: { gte: start, lte: end },
//         },
//         include: {
//           part: true,
//           process: true,
//           StockOrder: true,
//           CustomOrder: true,
//         },
//       }),
//       prisma.fixedCost.findMany({ where: { isDeleted: false } }),
//     ]);

//     const totalFixedCost = fixedCosts.reduce(
//       (sum, item) => sum + parseFloat(item.expenseCost || 0),
//       0,
//     );

//     let totalRevenue = 0,
//       totalCOGS = 0,
//       scrapCost = 0,
//       supplierReturn = 0;
//     let projOpenRev = 0,
//       projOpenParts = 0,
//       projOpenLabor = 0;

//     const monthlyRevenue = {},
//       monthlyCOGS = {},
//       dailyCashFlow = {};

//     schedules.forEach((order) => {
//       const date = new Date(order.order_date);
//       const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
//       const dateKey = date.toISOString().slice(0, 10);

//       const qtyFulfilled = Number(order.completedQuantity) || 0;
//       const qtyUnfulfilled = Number(order.remainingQty) || 0; // Ye 0 ho jata hai completion pe

//       const partCost = parseFloat(order.part?.cost || 0);
//       const productCost = parseFloat(
//         order.StockOrder?.cost || order.CustomOrder?.totalCost || 0,
//       );
//       const cycleTimeHours = (parseFloat(order.part?.cycleTime) || 0) / 60;
//       const ratePerHour = parseFloat(order.process?.ratePerHour || 0);

//       // --- ACTUAL REVENUE (Jo complete ho gaya) ---
//       const orderCOGS =
//         (partCost + cycleTimeHours * ratePerHour) * qtyFulfilled;
//       const fulfilledRevenue = (partCost + productCost) * qtyFulfilled;

//       totalRevenue += fulfilledRevenue;
//       totalCOGS += orderCOGS;

//       if (qtyFulfilled > 0) {
//         monthlyRevenue[monthKey] =
//           (monthlyRevenue[monthKey] || 0) + fulfilledRevenue;
//         monthlyCOGS[monthKey] = (monthlyCOGS[monthKey] || 0) + orderCOGS;
//         dailyCashFlow[dateKey] =
//           (dailyCashFlow[dateKey] || 0) + fulfilledRevenue;
//       }

//       // --- PROJECTIONS (Jo abhi pending hai) ---
//       projOpenRev += (partCost + productCost) * qtyUnfulfilled;
//       projOpenParts += partCost * qtyUnfulfilled;
//       projOpenLabor += cycleTimeHours * ratePerHour * qtyUnfulfilled;

//       // Scrap logic
//       const currentScrap = (Number(order.scrapQuantity) || 0) * partCost;
//       scrapCost += currentScrap;
//     });

//     res.json({
//       success: true,
//       totalRevenue: parseFloat(totalRevenue.toFixed(2)),
//       totalCOGS: parseFloat(totalCOGS.toFixed(2)),
//       grossProfit: parseFloat(
//         (totalRevenue - totalCOGS - scrapCost).toFixed(2),
//       ),
//       scrapCost: parseFloat(scrapCost.toFixed(2)),
//       totalFixedCost,
//       monthlyRevenue,
//       monthlyCOGS,
//       dailyCashFlow,
//       projections: {
//         totalOpenOrderRevenue: projOpenRev,
//         totalOpenPartsCost: projOpenParts,
//         totalOpenLaborCost: projOpenLabor,
//         cashflowNeeded: totalFixedCost + projOpenParts + projOpenLabor,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

const revenueApi1 = async (req, res) => {
  try {
    const { startDate, endDate, year } = req.query;

    let start, end;
    if (startDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const endRef = endDate ? new Date(endDate) : new Date(startDate);
      end = new Date(endRef);
      end.setHours(23, 59, 59, 999);
    } else if (year) {
      start = new Date(`${year}-01-01T00:00:00.000Z`);
      end = new Date(`${year}-12-31T23:59:59.999Z`);
    } else {
      const currentYear = new Date().getFullYear();
      start = new Date(`${currentYear}-01-01T00:00:00.000Z`);
      end = new Date(`${currentYear}-12-31T23:59:59.999Z`);
    }

    const [schedules, fixedCosts] = await Promise.all([
      prisma.stockOrderSchedule.findMany({
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
      }),
      prisma.fixedCost.findMany({ where: { isDeleted: false } }),
    ]);

    const totalFixedCost = fixedCosts.reduce(
      (sum, item) => sum + parseFloat(item.expenseCost || 0),
      0,
    );

    let totalRevenue = 0,
      totalCOGS = 0,
      scrapCost = 0;
    let projOpenRev = 0,
      projOpenParts = 0,
      projOpenLabor = 0;

    const monthlyRevenue = {},
      monthlyCOGS = {},
      dailyCashFlow = {};

    schedules.forEach((order) => {
      const date = new Date(order.order_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const dateKey = date.toISOString().slice(0, 10);

      // --- QUANTITY LOGIC FIX ---
      const plannedQty = Number(order.plannedQuantity) || 0; // Total jitna banana hai
      const qtyFulfilled = Number(order.completedQuantity) || 0; // Jitna ban chuka hai

      // Agar remainingQty 0 hai but planned > completed, toh difference ko projection maane
      let qtyUnfulfilled = Number(order.remainingQty) || 0;
      if (qtyUnfulfilled === 0 && plannedQty > qtyFulfilled) {
        qtyUnfulfilled = plannedQty - qtyFulfilled;
      }

      const partCost = parseFloat(order.part?.cost || 0);
      const productCost = parseFloat(
        order.StockOrder?.cost || order.CustomOrder?.totalCost || 0,
      );
      const cycleTimeHours = (parseFloat(order.part?.cycleTime) || 0) / 60;
      const ratePerHour = parseFloat(order.process?.ratePerHour || 0);

      // --- ACTUALS (Completed) ---
      if (qtyFulfilled > 0) {
        const orderCOGS =
          (partCost + cycleTimeHours * ratePerHour) * qtyFulfilled;
        const fulfilledRevenue = (partCost + productCost) * qtyFulfilled;

        totalRevenue += fulfilledRevenue;
        totalCOGS += orderCOGS;

        monthlyRevenue[monthKey] =
          (monthlyRevenue[monthKey] || 0) + fulfilledRevenue;
        monthlyCOGS[monthKey] = (monthlyCOGS[monthKey] || 0) + orderCOGS;
        dailyCashFlow[dateKey] =
          (dailyCashFlow[dateKey] || 0) + fulfilledRevenue;
      }

      // --- PROJECTIONS (Pending) ---
      if (qtyUnfulfilled > 0) {
        projOpenRev += (partCost + productCost) * qtyUnfulfilled;
        projOpenParts += partCost * qtyUnfulfilled;
        projOpenLabor += cycleTimeHours * ratePerHour * qtyUnfulfilled;
      }

      // Scrap
      const currentScrap = (Number(order.scrapQuantity) || 0) * partCost;
      scrapCost += currentScrap;
    });

    res.json({
      success: true,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalCOGS: parseFloat(totalCOGS.toFixed(2)),
      grossProfit: parseFloat(
        (totalRevenue - totalCOGS - scrapCost).toFixed(2),
      ),
      scrapCost: parseFloat(scrapCost.toFixed(2)),
      totalFixedCost,
      monthlyRevenue,
      monthlyCOGS,
      dailyCashFlow,
      projections: {
        totalOpenOrderRevenue: parseFloat(projOpenRev.toFixed(2)),
        totalOpenPartsCost: parseFloat(projOpenParts.toFixed(2)),
        totalOpenLaborCost: parseFloat(projOpenLabor.toFixed(2)),
        cashflowNeeded: parseFloat(
          (totalFixedCost + projOpenParts + projOpenLabor).toFixed(2),
        ),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
        process: {
          select: {
            processName: true,
            id: true,
            cycleTime: true,
            machineName: true,
          },
        },
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
        machineName: order.process?.machineName,
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

// const businessAnalysisApi = async (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;

//     if (!startDate || !endDate) {
//       return res
//         .status(400)
//         .json({ message: "startDate and endDate are required." });
//     }

//     // --- DATE FIX: Local Timezone Sync (Same as Costing API) ---
//     const [sy, sm, sd] = startDate.split("-").map(Number);
//     const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0); // Local 00:00:00

//     const [ey, em, ed] = endDate.split("-").map(Number);
//     const end = new Date(ey, em - 1, ed, 23, 59, 59, 999); // Local 23:59:59

//     const timeDifference = end.getTime() - start.getTime();
//     const daysInPeriod = Math.ceil(timeDifference / (1000 * 3600 * 24)) || 1;

//     // Fetch Schedules based on the corrected date range
//     const schedules = await prisma.stockOrderSchedule.findMany({
//       where: {
//         isDeleted: false,
//         order_date: { gte: start, lte: end },
//       },
//       include: {
//         part: true,
//         process: true,
//         StockOrder: true,
//         CustomOrder: true,
//       },
//     });

//     const fixedCostsData = await prisma.fixedCost.findMany({
//       where: { isDeleted: false },
//       select: { expenseCost: true },
//     });

//     const sumFixedCosts = fixedCostsData.reduce(
//       (sum, item) => sum + parseFloat(item.expenseCost || 0),
//       0,
//     );

//     // Prorate fixed cost based on days selected
//     const proratedFixedCost = (sumFixedCosts / 365) * daysInPeriod;

//     let totalRevenue = 0;
//     let bomCost = 0;
//     let laborCost = 0;
//     let scrapCost = 0;
//     let supplierReturn = 0;
//     let inventoryCost = 0;

//     schedules.forEach((order) => {
//       const qtyFulfilled = parseFloat(order.completedQuantity || 0);
//       const qtyRemaining = parseFloat(order.remainingQty || 0);
//       const scrapQty = parseFloat(order.scrapQuantity || 0);

//       const partCost = parseFloat(order.part?.cost || 0);
//       const salePrice = parseFloat(
//         order.StockOrder?.cost || order.CustomOrder?.totalCost || 0,
//       );

//       // --- Time & Labor Calculation (Synced with Costing API) ---
//       const cycleTimeHours = (parseFloat(order.part?.cycleTime) || 0) / 60;
//       const ratePerHour = parseFloat(order.process?.ratePerHour || 0);
//       const unitLabor = cycleTimeHours * ratePerHour;

//       // Calculations
//       const revenuePerUnit = partCost + salePrice;
//       totalRevenue += revenuePerUnit * qtyFulfilled;

//       bomCost += partCost * qtyFulfilled;
//       laborCost += unitLabor * qtyFulfilled;

//       scrapCost += scrapQty * partCost;
//       supplierReturn += scrapQty * partCost; // Scrap is usually returned/debited

//       // Inventory = Unfinished Qty * (Material + Labor effort put so far)
//       inventoryCost += qtyRemaining * (partCost + unitLabor);
//     });

//     const totalCOGS = bomCost + laborCost;
//     const operatingExpenses = totalCOGS + proratedFixedCost + scrapCost;
//     const profit = totalRevenue - operatingExpenses;

//     res.status(200).json({
//       totalRevenue: parseFloat(totalRevenue.toFixed(2)),
//       totalCOGS: parseFloat(totalCOGS.toFixed(2)),
//       bomCost: parseFloat(bomCost.toFixed(2)),
//       laborCost: parseFloat(laborCost.toFixed(2)),
//       totalFixedCost: parseFloat(proratedFixedCost.toFixed(2)),
//       operatingExpenses: parseFloat(operatingExpenses.toFixed(2)),
//       Profit: parseFloat(profit.toFixed(2)),
//       InventoryCost: parseFloat(inventoryCost.toFixed(2)),
//       scrapCost: parseFloat(scrapCost.toFixed(2)),
//       supplierReturn: parseFloat(supplierReturn.toFixed(2)),
//       cashFlow: parseFloat(profit.toFixed(2)), // Profit as basic cashflow
//       daysInPeriod,
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Error fetching business analysis data",
//       error: error.message,
//     });
//   }
// };

// const businessAnalysisApi = async (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;

//     if (!startDate || !endDate) {
//       return res
//         .status(400)
//         .json({ message: "startDate and endDate are required." });
//     }

//     // --- DATE FIX: Local Timezone Sync (Same as Costing API) ---
//     const [sy, sm, sd] = startDate.split("-").map(Number);
//     const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0); // Local 00:00:00

//     const [ey, em, ed] = endDate.split("-").map(Number);
//     const end = new Date(ey, em - 1, ed, 23, 59, 59, 999); // Local 23:59:59

//     const timeDifference = end.getTime() - start.getTime();
//     const daysInPeriod = Math.ceil(timeDifference / (1000 * 3600 * 24)) || 1;

//     // Fetch Schedules based on the corrected date range
//     const schedules = await prisma.stockOrderSchedule.findMany({
//       where: {
//         isDeleted: false,
//         order_date: { gte: start, lte: end },
//       },
//       include: {
//         part: true,
//         process: true,
//         StockOrder: true,
//         CustomOrder: true,
//       },
//     });

//     const fixedCostsData = await prisma.fixedCost.findMany({
//       where: { isDeleted: false },
//       select: { expenseCost: true },
//     });

//     const sumFixedCosts = fixedCostsData.reduce(
//       (sum, item) => sum + parseFloat(item.expenseCost || 0),
//       0,
//     );

//     // Prorate fixed cost based on days selected
//     const proratedFixedCost = (sumFixedCosts / 365) * daysInPeriod;

//     let totalRevenue = 0;
//     let bomCost = 0;
//     let laborCost = 0;
//     let scrapCost = 0;
//     let supplierReturn = 0;
//     let inventoryCost = 0;

//     schedules.forEach((order) => {
//       const qtyFulfilled = parseFloat(order.completedQuantity || 0);
//       const qtyRemaining = parseFloat(order.remainingQty || 0);
//       const scrapQty = parseFloat(order.scrapQuantity || 0);

//       const partCost = parseFloat(order.part?.cost || 0);
//       const salePrice = parseFloat(
//         order.StockOrder?.cost || order.CustomOrder?.totalCost || 0,
//       );

//       // --- Time & Labor Calculation (Synced with Costing API) ---
//       const cycleTimeHours = (parseFloat(order.part?.cycleTime) || 0) / 60;
//       const ratePerHour = parseFloat(order.process?.ratePerHour || 0);
//       const unitLabor = cycleTimeHours * ratePerHour;

//       // Calculations
//       const revenuePerUnit = partCost + salePrice;
//       totalRevenue += revenuePerUnit * qtyFulfilled;

//       bomCost += partCost * qtyFulfilled;
//       laborCost += unitLabor * qtyFulfilled;

//       scrapCost += scrapQty * partCost;
//       supplierReturn += scrapQty * partCost; // Scrap is usually returned/debited

//       // Inventory = Unfinished Qty * (Material + Labor effort put so far)
//       inventoryCost += qtyRemaining * (partCost + unitLabor);
//     });

//     const totalCOGS = bomCost + laborCost;
//     const operatingExpenses = totalCOGS + proratedFixedCost + scrapCost;
//     const profit = totalRevenue - operatingExpenses;

//     res.status(200).json({
//       totalRevenue: parseFloat(totalRevenue.toFixed(2)),
//       totalCOGS: parseFloat(totalCOGS.toFixed(2)),
//       bomCost: parseFloat(bomCost.toFixed(2)),
//       laborCost: parseFloat(laborCost.toFixed(2)),
//       totalFixedCost: parseFloat(proratedFixedCost.toFixed(2)),
//       operatingExpenses: parseFloat(operatingExpenses.toFixed(2)),
//       Profit: parseFloat(profit.toFixed(2)),
//       InventoryCost: parseFloat(inventoryCost.toFixed(2)),
//       scrapCost: parseFloat(scrapCost.toFixed(2)),
//       supplierReturn: parseFloat(supplierReturn.toFixed(2)),
//       cashFlow: parseFloat(profit.toFixed(2)), // Profit as basic cashflow
//       daysInPeriod,
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Error fetching business analysis data",
//       error: error.message,
//     });
//   }
// };

const businessAnalysisApi = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "startDate and endDate are required." });
    }

    const [sy, sm, sd] = startDate.split("-").map(Number);
    const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0); 

    const [ey, em, ed] = endDate.split("-").map(Number);
    const end = new Date(ey, em - 1, ed, 23, 59, 59, 999); 

    const timeDifference = end.getTime() - start.getTime();
    const daysInPeriod = Math.ceil(timeDifference / (1000 * 3600 * 24)) || 1;

    // Fetch All Necessary Data in Parallel
    const [schedules, manualScrapEntries, productionResponses, fixedCostsData] = await Promise.all([
      prisma.stockOrderSchedule.findMany({
        where: { isDeleted: false, order_date: { gte: start, lte: end } },
        include: { part: true, process: true, StockOrder: true, CustomOrder: true },
      }),
      prisma.scapEntries.findMany({
        where: { isDeleted: false, createdAt: { gte: start, lte: end } },
        include: { PartNumber: true },
      }),
      prisma.productionResponse.findMany({
        where: { isDeleted: false, submittedDateTime: { gte: start, lte: end } },
        include: { PartNumber: true },
      }),
      prisma.fixedCost.findMany({
        where: { isDeleted: false },
        select: { expenseCost: true },
      }),
    ]);

    const sumFixedCosts = fixedCostsData.reduce((sum, item) => sum + parseFloat(item.expenseCost || 0), 0);
    const proratedFixedCost = (sumFixedCosts / 365) * daysInPeriod;

    let totalRevenue = 0;
    let bomCost = 0;
    let laborCost = 0;
    let scrapCost = 0;
    let supplierReturn = 0;
    let inventoryCost = 0;

    // 1. Production Response Scrap (Shop Floor Scrap)
    productionResponses.forEach((record) => {
      const sQty = record.scrapQuantity || 0;
      const sCost = parseFloat(record.PartNumber?.cost || 0);
      scrapCost += (sQty * sCost);
    });

    schedules.forEach((order) => {
      const qtyFulfilled = parseFloat(order.completedQuantity || 0);
      const qtyRemaining = parseFloat(order.remainingQty || 0);
      const scheduleScrapQty = parseFloat(order.scrapQuantity || 0);

      const partCost = parseFloat(order.part?.cost || 0);
      const salePrice = parseFloat(order.StockOrder?.cost || order.CustomOrder?.totalCost || 0);

      const cycleTimeHours = (parseFloat(order.part?.cycleTime) || 0) / 60;
      const ratePerHour = parseFloat(order.process?.ratePerHour || 0);
      const unitLabor = cycleTimeHours * ratePerHour;

      const revenuePerUnit = partCost + salePrice;
      totalRevenue += revenuePerUnit * qtyFulfilled;
      bomCost += partCost * qtyFulfilled;
      laborCost += unitLabor * qtyFulfilled;

      scrapCost += scheduleScrapQty * partCost;

      inventoryCost += qtyRemaining * (partCost + unitLabor);
    });

    manualScrapEntries.forEach((entry) => {
      const qty = Number(entry.returnQuantity) || 0;
      const partCost = parseFloat(entry.PartNumber?.cost || 0);
      const cost = qty * partCost;

      scrapCost += cost;

      if (entry.supplierId || entry.type === "supplier" || entry.returnSupplierId) {
        supplierReturn += cost;
      }
    });

    const totalCOGS = bomCost + laborCost;
    const operatingExpenses = totalCOGS + proratedFixedCost + scrapCost;
    const profit = totalRevenue - operatingExpenses;

    res.status(200).json({
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalCOGS: parseFloat(totalCOGS.toFixed(2)),
      bomCost: parseFloat(bomCost.toFixed(2)),
      laborCost: parseFloat(laborCost.toFixed(2)),
      totalFixedCost: parseFloat(proratedFixedCost.toFixed(2)),
      operatingExpenses: parseFloat(operatingExpenses.toFixed(2)),
      Profit: parseFloat(profit.toFixed(2)),
      InventoryCost: parseFloat(inventoryCost.toFixed(2)),
      scrapCost: parseFloat(scrapCost.toFixed(2)),
      supplierReturn: parseFloat(supplierReturn.toFixed(2)),
      cashFlow: parseFloat(profit.toFixed(2)),
      daysInPeriod,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching business analysis data",
      error: error.message,
    });
  }
};


// const businessAnalysisApi = async (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;
//     const start = new Date(startDate);
//     const end = new Date(endDate);
//     const timeDifference = end.getTime() - start.getTime();
//     const daysInPeriod = Math.ceil(timeDifference / (1000 * 3600 * 24)) || 1;
//     const schedules = await prisma.stockOrderSchedule.findMany({
//       where: {
//         isDeleted: false,
//         order_date: { gte: start, lte: end },
//       },
//       include: {
//         part: true,
//         process: true,
//         StockOrder: true,
//         CustomOrder: true,
//       },
//     });

//     const fixedCostsData = await prisma.fixedCost.findMany({
//       select: { expenseCost: true },
//     });
//     const sumFixedCosts = fixedCostsData.reduce(
//       (sum, item) => sum + parseFloat(item.expenseCost || 0),
//       0,
//     );
//     const proratedFixedCost = (sumFixedCosts / 365) * daysInPeriod;
//     let totalRevenue = 0;
//     let bomCost = 0;
//     let laborCost = 0;
//     let scrapCost = 0;
//     let supplierReturn = 0;
//     let inventoryCost = 0;

//     schedules.forEach((order) => {
//       const qtyFulfilled = parseFloat(order.completedQuantity || 0);
//       const qtyRemaining = parseFloat(order.remainingQty || 0);
//       const scrapQty = parseFloat(order.scrapQuantity || 0);
//       const partCost = parseFloat(order.part?.cost || 0);
//       const productCost = parseFloat(
//         order.StockOrder?.cost || order.CustomOrder?.totalCost || 0,
//       );
//       const cycleTimeHours = parseFloat(order.part?.cycleTime || 0) / 60;
//       const ratePerHour = parseFloat(order.process?.ratePerHour || 0);
//       const laborUnitCost = cycleTimeHours * ratePerHour;
//       const revenuePerUnit = partCost + productCost;
//       totalRevenue += revenuePerUnit * qtyFulfilled;
//       bomCost += partCost * qtyFulfilled;
//       laborCost += laborUnitCost * qtyFulfilled;
//       scrapCost += scrapQty * partCost;
//       inventoryCost += qtyRemaining * (partCost + laborUnitCost);
//       if (order.scrapQuantity > 0) {
//         supplierReturn += order.scrapQuantity * partCost;
//       }
//     });
//     const totalCOGS = bomCost + laborCost;
//     const operatingExpenses = totalCOGS + proratedFixedCost;
//     const profit = totalRevenue - operatingExpenses;
//     const cashFlow = profit;
//     res.status(200).json({
//       totalRevenue,
//       totalCOGS,
//       bomCost,
//       laborCost,
//       totalFixedCost: proratedFixedCost,
//       operatingExpenses,
//       Profit: profit,
//       InventoryCost: inventoryCost,
//       scrapCost,
//       supplierReturn,
//       cashFlow,
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Error fetching business analysis data",
//       error: error.message,
//     });
//   }
// };
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
const getSelectParts = async (req, res) => {
  try {
    const parts = await prisma.partNumber.findMany({
      where: {
        isDeleted: false,
        type: "part",
      },
      select: {
        part_id: true,
        partNumber: true,
        partDescription: true,
        cost: true,
        availStock: true,
      },
    });
    res.status(200).json(parts);
  } catch (error) {
    res.status(500).json({
      error: "Parts fetch karne mein masla hua.",
      details: error.message,
    });
  }
};

const getSelectProducts = async (req, res) => {
  try {
    const products = await prisma.partNumber.findMany({
      where: {
        isDeleted: false,
        type: "product",
      },
      select: {
        part_id: true,
        partNumber: true,
        partDescription: true,
        cost: true,
        availStock: true,
      },
    });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      error: "Products fetch karne mein masla hua.",
      details: error.message,
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
  getSelectParts,
  getSelectProducts,
};
