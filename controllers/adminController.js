const md5 = require("md5");
const jwt = require("jsonwebtoken");
const { paginationQuery, pagination } = require("../functions/common");
const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");
const { checkValidations } = require("../functions/checkvalidation");
const prisma = require("../config/prisma");
let connection;

const login = async (req, res) => {
  try {
    const { userName, password } = req.body;
    const user = await prisma.admin.findFirst({
      where: {
        AND: [
          {
            OR: [
              { email: userName.trim().toLowerCase() },
              { phoneNumber: userName.trim() },
            ],
          },
          { password: md5(password) },
          {
            isDeleted: false,
          },
        ],
      },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign(
      {
        id: user.id,
        roles: user.roles,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "5d" }
    );

    const updatedTokens = Array.isArray(user.tokens)
      ? [...user.tokens, token]
      : [token];

    await prisma.admin.update({
      where: { id: user.id },
      data: {
        tokens: updatedTokens,
      },
    });

    const get = await prisma.admin.findMany();
    console.log("getget", get);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Something went wrong . please try again later .",
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
    const { firstName, lastName, email, address, billingTerms } = req.body;
    const userId = req.user.id;
    const getId = uuidv4().slice(0, 6);
    await prisma.customers.create({
      data: {
        id: getId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        address: address.trim(),
        billingTerms: billingTerms.trim(),
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
    const { firstName, lastName, email, address, billingTerms } = req.body;
    const id = req.params?.id;
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
    if (connection) await connection.release();
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
    console.log(error);

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
    prisma.suppliers
      .update({
        where: {
          id: req.params?.id,
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
    console.error("Error fetching suppliers:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const supplierOrder = async (req, res) => {
  try {
    let connection;
    // await createTable("supplier_orders", [
    //   { name: "id", type: "INT PRIMARY KEY AUTO_INCREMENT" },
    //   { name: "order_number", type: "VARCHAR(50)" },
    //   { name: "order_date", type: "VARCHAR(50)" },
    //   { name: "supplier_id", type: "VARCHAR(10)" },
    //   { name: "part_name", type: "VARCHAR(255)" },
    //   { name: "quantity", type: "VARCHAR(50)" },
    //   { name: "cost", type: "VARCHAR(50)" },
    //   { name: "need_date", type: "VARCHAR(50)" },
    //   { name: "createdBy", type: "VARCHAR(255)" },
    //   { name: "FOREIGN KEY (supplier_id)", type: "REFERENCES suppliers(id)" },
    // ]);

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
    console.log("errorrrssss areeeeeeeeeeee : ", error);

    return res.status(500).send({
      message: "Something went wrong . please try again later.",
    });
  }
};

const addProcess = async (req, res) => {
  try {
    const { processName, machineName, ratePerHour, cycleTime, orderNeeded } =
      req.body;
    const getId = uuidv4().slice(0, 6);
    await prisma.process.create({
      data: {
        id: getId,
        processName: processName.trim(),
        machineName: machineName.trim(),
        ratePerHour: ratePerHour.trim(),
        cycleTime: cycleTime.trim(),
        orderNeeded: orderNeeded.trim(),
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
    if (connection) await connection.release();
  }
};

const createEmployee = async (req, res) => {
  try {
    const getId = uuidv4().slice(0, 6);
    const {
      firstName,
      lastName,
      fullName,
      hourlyRate,
      shift,
      startDate,
      pin,
      shopFloorLogin,
      termsAccepted,
      status,
    } = req.body;

    prisma.employee
      .create({
        data: {
          id: getId,
          firstName: firstName,
          lastName: lastName,
          fullName: fullName,
          employeeId: `EMP${getId}`,
          hourlyRate: hourlyRate,
          shift: shift,
          startDate: startDate,
          pin: pin,
          shopFloorLogin: shopFloorLogin,
          role: shopFloorLogin === "yes" ? "Shop_Floor" : "Frontline",
          termsAccepted: termsAccepted,
          status: status,
          createdBy: req.user.id,
        },
      })
      .then();
    return res.status(201).json({
      message: "Employee added successfully!",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong .",
    });
  }
};

const allEmployee = async (req, res) => {
  try {
    connection = await db.getConnection();
    const paginationData = await paginationQuery(req.query);
    const { process = "", search = "" } = req.query;
    const searchTerm = `%${search.replace(/[%_]/g, "\\$&")}%`;
    const [[employeeData], [totalCounts]] = await Promise.all([
      connection.query(
        `SELECT * FROM employee  WHERE isDeleted = FALSE 
        AND (fullName LIKE ? OR hourlyRate LIKE ?) 
        LIMIT ? OFFSET ?`,
        [
          searchTerm.trim(),
          searchTerm.trim(),
          paginationData.pageSize,
          paginationData.skip,
        ]
      ),
      connection.query(
        `SELECT COUNT(*) AS totalCount FROM employee 
        WHERE  isDeleted = FALSE AND (fullName LIKE ? OR hourlyRate LIKE ?)`,
        [process, searchTerm, searchTerm]
      ),
    ]);
    const paginationObj = {
      page: paginationData.page,
      pageSize: paginationData.pageSize,
      total: totalCounts[0].totalCount,
    };
    const getPagination = await pagination(paginationObj);
    return res.status(200).json({
      message: "Employee list retrived successfully !",
      data: employeeData,
      totalCounts: totalCounts[0].totalCount,
      pagination: getPagination,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
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

const editEmployee = async (req, res) => {
  try {
    const id = req.params.id;
    const {
      firstName,
      lastName,
      fullName,
      hourlyRate,
      shift,
      startDate,
      pin,
      shopFloorLogin,
      termsAccepted,
    } = req.body;
    prisma.process
      .update({
        where: {
          id: id,
          isDeleted: false,
          createdBy: req.user.id,
        },
        data: {
          firstName: firstName,
          lastName: lastName,
          fullName: fullName,
          hourlyRate: hourlyRate,
          shift: shift,
          startDate: startDate,
          pin: pin,
          shopFloorLogin: shopFloorLogin,
          termsAccepted: termsAccepted,
        },
      })
      .then();
    return res.status(200).json({
      message: "Employee edit successfully !",
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
    console.log("errorerror", error);
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};

// const createProductNumber = async (req, res) => {
//   try {
//     const getId = uuidv4().slice(0, 6);
//     await createTable("productNumber", [
//       { name: "id", type: "VARCHAR(10) PRIMARY KEY" },
//       { name: "partFamily", type: "VARCHAR(255)" },
//       { name: "productNumber", type: "VARCHAR(255)" },
//       { name: "description", type: "VARCHAR(255)" },
//       { name: "cost", type: "VARCHAR(255)" },
//       { name: "leadTime", type: "VARCHAR(255)" },
//       { name: "orderQuantity", type: "VARCHAR(255)" },
//       { name: "companyName", type: "VARCHAR(255)" },
//       { name: "minStock", type: "VARCHAR(255)" },
//       { name: "availStock", type: "VARCHAR(50)" },
//       { name: "cycleTime", type: "VARCHAR(50)" },
//       { name: "prcessOrder", type: "VARCHAR(255)" },
//       { name: "partImage", type: "VARCHAR(255)" },
//       { name: "createdBy", type: "VARCHAR(255)" },
//     ]);
//     const {
//       partFamily,
//       productNumber,
//       description,
//       cost,
//       leadTime,
//       orderQuantity,
//       companyName,
//       minStock,
//       availStock,
//       cycleTime,
//       prcessOrder,
//       partImage,
//     } = req.body;
//     const userId = req.user.id;
//     connection = await db.getConnection();
//     await connection.query(
//       "INSERT INTO productNumber (id,partFamily, productNumber,description, cost,leadTime, orderQuantity, companyName,minStock,cycleTime,prcessOrder ,createdBy) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
//       [
//         getId,
//         partFamily.trim(),
//         productNumber.trim(),
//         description.trim(),
//         cost.trim(),
//         leadTime,
//         orderQuantity,
//         companyName,
//         minStock,
//         availStock,
//         cycleTime,
//         prcessOrder,
//         userId,
//       ]
//     );
//     return res.status(201).json({
//       message: "Product number added successfully!",
//     });
//   } catch (error) {
//     console.log("errorerrorerror0", error);
//     return res.status(500).send({
//       message: "Something went wrong . please try again later .",
//     });
//   }
// };

module.exports = {
  login,
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
  createEmployee,
  allEmployee,
  employeeDetail,
  editEmployee,
  deleteEmployee,
  // createProductNumber,
};

