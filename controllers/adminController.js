const md5 = require("md5");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { createTable } = require("../functions/createTable");
const { paginationQuery, pagination } = require("../functions/common");
const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");
const { checkValidations } = require("../functions/checkvalidation");

let connection;

const login = async (req, res) => {
  try {
    const { userName, password } = req.body;
    connection = await db.getConnection();
    const [data] = await connection.query(
      `SELECT * FROM admin 
       WHERE (email = ? OR phoneNumber = ?) 
       AND password = ? 
       AND (isDeleted IS NULL OR isDeleted = FALSE)`,
      [userName.trim().toLowerCase(), userName.trim(), md5(password)]
    );

    if (data.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const user = data[0];
    const token = jwt.sign(
      {
        id: user.id,
        roles: user.roles,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "5d" }
    );

    await connection.query(
      `UPDATE admin
       SET tokens = JSON_ARRAY_APPEND(COALESCE(tokens, JSON_ARRAY()), '$', ?) 
       WHERE id = ?`,
      [token, user.id]
    );

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
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  } finally {
    if (connection) await connection.release();
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
  let connection;
  try {
    await createTable("customers", [
      { name: "id", type: "INT PRIMARY KEY AUTO_INCREMENT" },
      { name: "firstName", type: "VARCHAR(255)" },
      { name: "lastName", type: "VARCHAR(255)" },
      { name: "email", type: "VARCHAR(255)" },
      { name: "address", type: "VARCHAR(255)" },
      { name: "billingTerms", type: "VARCHAR(255)" },
      { name: "createdBy", type: "VARCHAR(255)" },
    ]);
    const { firstName, lastName, email, address, billingTerms } = req.body;
    const userId = req.user.id;
    connection = await db.getConnection();
    await connection.query(
      "INSERT INTO customers (firstName, lastName, email, address, billingTerms, createdBy) VALUES (?, ?, ?, ?, ?, ?)",
      [
        firstName.trim(),
        lastName.trim(),
        email.trim(),
        address.trim(),
        billingTerms.trim(),
        userId,
      ]
    );

    return res.status(201).json({
      message: "Customer added successfully!",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  } finally {
    if (connection) await connection.release();
  }
};

const customerList = async (req, res) => {
  try {
    connection = await db.getConnection();
    const paginationData = await paginationQuery(req.query);
    const { process = "", search = "" } = req.query;
    const searchTerm = `%${search.replace(/[%_]/g, "\\$&")}%`;
    const [[customerData], [totalCounts]] = await Promise.all([
      connection.query(
        `SELECT * FROM customers  WHERE isDeleted = FALSE 
        AND (email LIKE ? OR billingTerms LIKE ?) 
        LIMIT ? OFFSET ?`,
        [
          searchTerm.trim(),
          searchTerm.trim(),
          paginationData.pageSize,
          paginationData.skip,
        ]
      ),
      connection.query(
        `SELECT COUNT(*) AS totalCount FROM customers 
        WHERE  isDeleted = FALSE AND (email LIKE ? OR billingTerms LIKE ?)`,
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
      message: "Customer list retrived successfully !",
      data: customerData,
      totalCounts: totalCounts[0].totalCount,
      pagination: getPagination,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  } finally {
    if (connection) await connection.release();
  }
};

const customerDetail = async (req, res) => {
  try {
    connection = await db.getConnection();
    const id = req.params.id;
    const [data] = await connection.query(
      `SELECT * FROM customers WHERE id = ? AND isDeleted = FALSE`,
      id
    );
    return res.status(200).json({
      message: "Customer detail retrived successfully !",
      data: data[0],
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later.",
    });
  } finally {
    if (connection) await connection.release();
  }
};

const editCustomerDetail = async (req, res) => {
  try {
    const { firstName, lastName, email, address, billingTerms } = req.body;
    const id = req.params?.id;
    connection = await db.getConnection();
    connection
      .query(
        `UPDATE customers 
        SET firstName = ?, 
        lastName = ?, 
        email = ?, 
        address = ?,
        billingTerms = ?
        WHERE id = ? AND isDeleted = FALSE`,
        [firstName, lastName, email, address, billingTerms, id]
      )
      .then();
    return res.status(200).send({
      message: "Customer detail updated successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  } finally {
    if (connection) await connection.release();
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const id = req.params.id;
    connection = await db.getConnection();
    const data = await connection.query(
      `UPDATE customers SET isDeleted = TRUE WHERE id = ?`,
      [id]
    );
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
  let connection;
  try {
    const getId = uuidv4().slice(0, 6);
    await createTable("suppliers", [
      { name: "id", type: "VARCHAR(10) PRIMARY KEY" },
      { name: "firstName", type: "VARCHAR(255)" },
      { name: "lastName", type: "VARCHAR(255)" },
      { name: "email", type: "VARCHAR(255)" },
      { name: "address", type: "VARCHAR(255)" },
      { name: "billingTerms", type: "VARCHAR(255)" },
      { name: "createdBy", type: "VARCHAR(255)" },
    ]);
    const { firstName, lastName, email, address, billingTerms } = req.body;
    const userId = req.user.id;
    connection = await db.getConnection();

    await connection.query(
      "INSERT INTO suppliers (id,firstName, lastName, email, address, billingTerms, createdBy) VALUES (?,?, ?, ?, ?, ?, ?)",
      [
        getId,
        firstName.trim(),
        lastName.trim(),
        email.trim(),
        address.trim(),
        billingTerms.trim(),
        userId,
      ]
    );
    return res.status(201).json({
      message: "Supplier added successfully!",
    });
  } catch (error) {
    console.log(error);
    
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  } finally {
    if (connection) await connection.release();
  }
};

const supplierList = async (req, res) => {
  try {
    connection = await db.getConnection();
    const paginationData = await paginationQuery(req.query);
    const { process = "", search = "" } = req.query;
    const searchTerm = `%${search.replace(/[%_]/g, "\\$&")}%`;
    const [[customerData], [totalCounts]] = await Promise.all([
      connection.query(
        `SELECT * FROM suppliers  WHERE isDeleted = FALSE 
        AND (email LIKE ? OR billingTerms LIKE ?) 
        LIMIT ? OFFSET ?`,
        [
          searchTerm.trim(),
          searchTerm.trim(),
          paginationData.pageSize,
          paginationData.skip,
        ]
      ),
      connection.query(
        `SELECT COUNT(*) AS totalCount FROM suppliers 
        WHERE  isDeleted = FALSE AND (email LIKE ? OR billingTerms LIKE ?)`,
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
      message: "Supplier list retrived successfully !",
      data: customerData,
      totalCounts: totalCounts[0].totalCount,
      pagination: getPagination,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  } finally {
    if (connection) await connection.release();
  }
};

const supplierDetail = async (req, res) => {
  try {
    connection = await db.getConnection();
    const id = req.params.id;
    const [data] = await connection.query(
      `SELECT * FROM suppliers WHERE id = ? AND isDeleted = FALSE`,
      id
    );
    return res.status(200).json({
      message: "Supplier detail retrived successfully !",
      data: data[0],
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later.",
    });
  } finally {
    if (connection) await connection.release();
  }
};

const editSupplierDetail = async (req, res) => {
  try {
    const { firstName, lastName, email, address, billingTerms } = req.body;
    const id = req.params?.id;
    connection = await db.getConnection();
    connection
      .query(
        `UPDATE suppliers 
        SET firstName = ?, 
        lastName = ?, 
        email = ?, 
        address = ?,
        billingTerms = ?
        WHERE id = ? AND isDeleted = FALSE`,
        [firstName, lastName, email, address, billingTerms, id]
      )
      .then();
    return res.status(200).send({
      message: "Supplier detail updated successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  } finally {
    if (connection) await connection.release();
  }
};

const deleteSupplier = async (req, res) => {
  try {
    const id = req.params.id;
    connection = await db.getConnection();
    const data = await connection.query(
      `UPDATE suppliers SET isDeleted = TRUE WHERE id = ?`,
      [id]
    );
    return res.status(200).json({
      message: "Supplier delete successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  } finally {
    if (connection) await connection.release();
  }
};

const selectSupplier = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, CONCAT(firstName, ' ', lastName) AS name FROM suppliers"
    );
    res.status(200).json(rows);
  } catch (err) {
    console.error("Error fetching suppliers:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const supplierOrder = async (req, res) => {
  try {
    let connection;
    await createTable("supplier_orders", [
      { name: "id", type: "INT PRIMARY KEY AUTO_INCREMENT" },
      { name: "order_number", type: "VARCHAR(50)" },
      { name: "order_date", type: "VARCHAR(50)" },
      { name: "supplier_id", type: "VARCHAR(10)" },
      { name: "part_name", type: "VARCHAR(255)" },
      { name: "quantity", type: "VARCHAR(50)" },
      { name: "cost", type: "VARCHAR(50)" },
      { name: "need_date", type: "VARCHAR(50)" },
      { name: "createdBy", type: "VARCHAR(255)" },
      { name: "FOREIGN KEY (supplier_id)", type: "REFERENCES suppliers(id)" },
    ]);

    const {
      order_number,
      order_date,
      supplier_id,
      part_name,
      quantity,
      need_date,
      cost,
    } = req.body;

    const { id: userId } = req.user;
    connection = await db.getConnection();
    const [datass] = await connection.query(
      `SELECT * FROM suppliers WHERE id = '670b97'`
    );

    console.log("datassdatass", datass);
    await connection.query(
      "INSERT INTO supplier_orders (order_number, order_date, supplier_id, part_name, quantity, need_date, cost, createdBy) VALUES (?, ?, ?, ?, ?, ?,?,?)",
      [
        order_number.trim(),
        order_date.trim(),
        supplier_id.trim(),
        part_name.trim(),
        quantity.trim(),
        need_date.trim(),
        cost.trim(),
        userId,
      ]
      // ← Only 7 values
    );
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
    await createTable("process", [
      { name: "id", type: "INT PRIMARY KEY AUTO_INCREMENT" },
      { name: "processName", type: "VARCHAR(255)" },
      { name: "machineName", type: "VARCHAR(255)" },
      { name: "cycleTime", type: "VARCHAR(255)" },
      { name: "ratePerHour", type: "VARCHAR(255)" },
      { name: "orderNeeded", type: "VARCHAR(255)" },
      { name: "createdBy", type: "VARCHAR(255)" },
    ]);
    const userId = req.user?.id;
    const { processName, machineName, ratePerHour, cycleTime, orderNeeded } =
      req.body;

    connection = await db.getConnection();

    connection
      .query(
        `INSERT INTO process (processName , machineName , cycleTime , ratePerHour,orderNeeded,
         createdBy) VALUES (?,?,?,?,?,?)`,
        [
          processName.trim(),
          machineName?.trim(),
          cycleTime?.trim(),
          ratePerHour?.trim(),
          orderNeeded?.trim(),
          userId,
        ]
      )
      .then();

    return res.status(201).json({
      message: "Process added successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  } finally {
    if (connection) await connection.release();
  }
};

const processList = async (req, res) => {
  try {
    const paginationData = paginationQuery(req.query);
    connection = await db.getConnection();
    const [[processData], [totalCounts]] = await Promise.all([
      connection.query(
        `SELECT * FROM  process WHERE  isDeleted = FALSE LIMIT ${Number(
          paginationData.pageSize
        )} OFFSET ${Number(paginationData.skip)} `
      ),
      connection.query(
        `SELECT COUNT(*) AS totalCount FROM process WHERE isDeleted = FALSE; `
      ),
    ]);

    const paginationObj = {
      page: paginationData.page,
      pageSize: paginationData.pageSize,
      total: totalCounts[0].totalCount,
    };
    const getPagination = await pagination(paginationObj);
    return res.status(200).json({
      message: "All process retrived successfully !",
      processData: processData,
      totalCount: totalCounts[0].totalCount,
      pagination: getPagination,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  } finally {
    if (connection) await connection.release();
  }
};

const processDetail = async (req, res) => {
  try {
    const id = req.params.id;
    connection = await db.getConnection();
    const [data] = await connection.query(
      `SELECT * FROM process WHERE isDeleted = FALSE AND id = ?`,
      id
    );
    return res.status(200).json({
      message: "Process detail retrived successfully !",
      data: data[0],
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  } finally {
    if (connection) await connection.release();
  }
};

const editProcess = async (req, res) => {
  try {
    const id = req.params.id;
    const { processName, machineName, cycleTime, ratePerHour, orderNeeded } =
      req.body;
    const connection = await db.getConnection();
    connection
      .query(
        `UPDATE process 
      SET processName = ?, 
      machineName = ?, 
      cycleTime = ?, 
      ratePerHour = ?,
      orderNeeded = ?
      WHERE id = ? AND isDeleted = FALSE`,
        [processName, machineName, cycleTime, ratePerHour, orderNeeded, id]
      )
      .then();
    return res.status(200).json({
      message: "Process edit successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  } finally {
    if (connection) await connection.release();
  }
};

const deleteProcess = async (req, res) => {
  try {
    const id = req.params.id;
    const connection = await db.getConnection();
    await connection.query(
      `UPDATE process SET isDeleted = TRUE WHERE id = ${id}`
    );
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
    await createTable("employee", [
      { name: "id", type: "VARCHAR(10) PRIMARY KEY" },
      { name: "firstName", type: "VARCHAR(255)" },
      { name: "lastName", type: "VARCHAR(255)" },
      { name: "fullName", type: "VARCHAR(255)" },
      { name: "employeeId", type: "VARCHAR(255)" },
      { name: "hourlyRate", type: "VARCHAR(255)" },
      { name: "shift", type: "VARCHAR(255)" },
      { name: "startDate", type: "VARCHAR(255)" },
      { name: "pin", type: "VARCHAR(255)" },
      { name: "shopFloorLogin", type: "VARCHAR(50)" },
      { name: "termsAccepted", type: "VARCHAR(50)" },
      { name: "status", type: "VARCHAR(255)", default: "pending" },
      { name: "createdBy", type: "VARCHAR(255)" },
    ]);
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
      status
    } = req.body;
    const userId = req.user.id;
    connection = await db.getConnection();
    await connection.query(
      "INSERT INTO employee (id,firstName, lastName,fullName, employeeId,hourlyRate, shift, startDate,pin,shopFloorLogin,termsAccepted ,status,createdBy) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        getId,
        firstName.trim(),
        lastName.trim(),
        fullName.trim(),
        `EMP${getId}`,
        hourlyRate.trim(),
        shift.trim(),
        startDate.trim(),
        pin.trim(),
        shopFloorLogin,
        termsAccepted,
        status,
        userId,
      ]
    );
    return res.status(201).json({
      message: "Employee added successfully!",
    });
  } catch (error) {
    console.log('errorerror',error);
    
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
  } finally {
    if (connection) await connection.release();
  }
};

const employeeDetail = async (req, res) => {
  try {
    const id = req.params.id;
    connection = await db.getConnection();
    const [data] = await connection.query(
      `SELECT * FROM employee WHERE isDeleted = FALSE AND id = ?`,
      id
    );
    return res.status(200).json({
      message: "Process detail retrived successfully !",
      data: data[0],
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  } finally {
    if (connection) await connection.release();
  }
};

const editEmployee = async (req, res) => {
  try {
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
    const id = req.params?.id;
    connection = await db.getConnection();
    connection
      .query(
        `UPDATE employee 
        SET firstName = ?, 
        lastName = ?, 
        fullName = ?, 
        hourlyRate = ?,
        shift = ?,
        startDate = ?,
        pin = ?,
        shopFloorLogin = ?,
        termsAccepted = ?
        WHERE id = ? AND isDeleted = FALSE`,
        [firstName, lastName,fullName, hourlyRate, shift, startDate,pin, shopFloorLogin,termsAccepted,id]
      )
      .then();
    return res.status(200).send({
      message: "Employee detail updated successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  } finally {
    if (connection) await connection.release();
  }
};

const deleteEmployee = async(req,res)=>{
   try {
  const id = req.params.id;
  const connection = await db.getConnection();
  console.log('idid', id);

  const [[data]] = await connection.query(`SELECT id FROM employee WHERE id = ?`, [id]);
  console.log('datadata', data);

  if (!data) {
    return res.status(404).json({ message: "Employee not found" });
  }

  await connection.query(
    `UPDATE employee SET isDeleted = TRUE WHERE id = ?`,
    [id]
  );

  return res.status(200).json({
    message: "Employee deleted successfully!",
  });

} catch (error) {
  console.log('errorerror', error);
  return res.status(500).send({
    message: "Something went wrong. Please try again later.",
  });
} finally {
  if (connection) await connection.release();
}

}

const createProductNumber = async(req,res)=>{
  try {
    const getId = uuidv4().slice(0, 6);
    await createTable("productNumber", [
      { name: "id", type: "VARCHAR(10) PRIMARY KEY" },
      { name: "partFamily", type: "VARCHAR(255)" },
      { name: "productNumber", type: "VARCHAR(255)" },
      { name: "description", type: "VARCHAR(255)" },
      { name: "cost", type: "VARCHAR(255)" },
      { name: "leadTime", type: "VARCHAR(255)" },
      { name: "orderQuantity", type: "VARCHAR(255)" },
      { name: "companyName", type: "VARCHAR(255)" },
      { name: "minStock", type: "VARCHAR(255)" },
      { name: "availStock", type: "VARCHAR(50)" },
      { name: "cycleTime", type: "VARCHAR(50)" },
      { name: "prcessOrder", type: "VARCHAR(255)"},
      { name: "partImage", type: "VARCHAR(255)" },
      { name: "createdBy", type: "VARCHAR(255)" },
    ]);
    const {
      partFamily,
      productNumber,
      description,
      cost,
      leadTime,
      orderQuantity,
      companyName,
      minStock,
      availStock,
      cycleTime,
      prcessOrder,
      partImage,
    } = req.body;
    const userId = req.user.id;
    connection = await db.getConnection();
    await connection.query(
      "INSERT INTO productNumber (id,partFamily, productNumber,description, cost,leadTime, orderQuantity, companyName,minStock,cycleTime,prcessOrder ,createdBy) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        getId,
        partFamily.trim(),
        productNumber.trim(),
        description.trim(),
        cost.trim(),
        leadTime,
        orderQuantity,
        companyName,
        minStock,
        availStock,
        cycleTime,
        prcessOrder,
        userId,
      ]
    );
    return res.status(201).json({
      message: "Product number added successfully!",
    });
  } catch (error) {
    console.log('errorerrorerror0',error)
    return res.status(500).send({
      message:"Something went wrong . please try again later ."
    })
  }
}

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
  createProductNumber
};


 

