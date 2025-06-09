const md5 = require("md5");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { createTable } = require("../functions/createTable");
const { paginationQuery, pagination } = require("../functions/common");

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
    console.error("Login error:", err);
    return res.status(500).json({
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  } finally {
    if (connection) await connection.release();
  }
};

const createCustomer = async (req, res) => {
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
    console.error(
      "Error creating customerd:",
      error.sqlMessage || error.message
    );
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
    console.log("errorerror", error);

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
  let connection;
  try {
    await createTable("suppliers", [
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
      "INSERT INTO suppliers (firstName, lastName, email, address, billingTerms, createdBy) VALUES (?, ?, ?, ?, ?, ?)",
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
      message: "Supplier added successfully!",
    });
  } catch (error) {
    console.error(
      "Error creating customerd:",
      error.sqlMessage || error.message
    );
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
    console.log("errorerrorerror", error);

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

const supplierOrder = async(req,res)=>{
  try {
    
  } catch (error) {
    return res.status(500).send({
      message:"Something went wrong . please try again later."
    })
  }
}

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
  }finally {
    if (connection) await connection.release();
  }
};

const processList = async (req, res) => {
  try {
     console.log("process start")
    
    const paginationData = paginationQuery(req.query);
     connection = await db.getConnection();
     console.log("process start0")
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
     console.log("process start1")

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
  }finally {

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
  }finally {
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
  }finally {
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
  }finally {
    if (connection) await connection.release();
  }
};
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
  supplierOrder,
  addProcess,
  processList,
  processDetail,
  editProcess,
  deleteProcess
};
