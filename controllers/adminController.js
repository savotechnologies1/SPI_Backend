const md5 = require("md5");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const {
  generateRandomOTP,
  paginationQuery,
  pagination,
  fileUploadFunc,
} = require("../functions/common");
const { validationResult } = require("express-validator");
const { checkValidations } = require("../functions/checkvalidation");
const { pool, createTable } = require("../config/dbConnection");
let connection;

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userName, password } = req.body;
    connection = await pool.getConnection();
    
    const [data] = await connection.query(
      `SELECT * FROM admins 
       WHERE (email = ? OR phoneNumber = ?) 
       AND password = ? 
       AND isDeleted = FALSE`,
      [userName.trim().toLowerCase(), userName.trim(), md5(password)]
    );

    if (data.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = data[0];
    const token = jwt.sign(
      { 
        id: user.id,
        roles: user.roles 
      }, 
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "5d" }
    );

    await connection.query(
      `UPDATE admins 
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
        roles: user.roles
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ 
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    console.log('reeeeeeeeeeeee');
    
    if (connection) await connection.release();
  }
};
const forgetPassword = async (req, res) => {
  let connection;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    connection = await pool.getConnection();
    
    const [data] = await connection.query(
      `SELECT * FROM admins 
       WHERE email = ? 
       AND isDeleted = FALSE`,
      [email.toLowerCase().trim()]
    );

    if (data.length === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const otp = generateRandomOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

    await connection.query(
      `UPDATE admins 
       SET otp = ?, otpExpiry = ? 
       WHERE email = ?`,
      [otp, otpExpiry, email.toLowerCase().trim()]
    );

    // Uncomment and implement email sending
    // await sendOtpEmail(email, otp);

    return res.status(200).json({
      message: "OTP sent successfully",
      email: email.toLowerCase().trim()
    });
  } catch (error) {
    console.error("Forget password error:", error);
    return res.status(500).json({ 
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) await connection.release();
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
    const connection = await pool.getConnection();
    const [data] = await connection.query(
      `SELECT * FROM admins 
       WHERE email = ? 
       AND isDeleted = FALSE`,
      email
    );
    const getData = data[0];
    if (data.length == 0) {
      return res.status(400).send({ message: "Admin not found" });
    }

    if (getData.otp !== otp) {
      return res.status(400).send({ message: "Invalid OTP" });
    }
    const token = uuidv4();
    await connection.query(
      `UPDATE admins SET token = ?, otp = NULL WHERE id = ?`,
      [token, getData.id]
    );

    return res.status(200).json({
      message: "OTP verified successfully",
      id: getData.id,
      token: token,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Something went wrong . please try again later ." });
  } finally {
    if (connection) await connection.release();
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
    const connection = await pool.getConnection();
    const [data] = await connection.query(
      `SELECT * FROM admins 
       WHERE token = ? 
       AND isDeleted = FALSE`,
      token
    );
    const getData = data[0];
    if (data.length == 0) {
      return res.status(400).send({ message: "Admin not found" });
    }

    const covertedNewPass = md5(newPassword);

    await connection.query(
      `UPDATE admins SET password = ?, tokens = NULL WHERE id = ?`,
      [covertedNewPass, getData.id]
    );
    return res.status(200).send({ message: "Password reset successfully." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Something went wrong . please try again later ." });
  } finally {
    if (connection) await connection.release();
  }
};

const selectProcessProcess = async (req, res) => {
  try {
    await createTable("work", [
      { name: "instructionId", type: "CHAR(36) PRIMARY KEY" },
      { name: "process", type: "VARCHAR(255)" },
      { name: "product", type: "VARCHAR(255)" },
      { name: "createdBy", type: "VARCHAR(255)" },
    ]);

    const { process, product } = req.body;
    const { id: userId } = req.user;
    const instructionId = uuidv4();
    connection = await pool.getConnection();
    await connection.query(
      `INSERT INTO work 
       (process, product, instructionId, createdBy)
       VALUES (?, ?, ?, ?)`,
      [process?.trim(), product?.trim(), instructionId, userId]
    );

    connection.release();

    return res.status(201).json({
      message: "Process and product selected successfully!",
      instructionId: instructionId,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
    });
  } finally {
    if (connection) await connection.release();
  }
};

const workInstruction = async (req, res) => {
  let connection;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const fileData = await fileUploadFunc(req, res);
    if (fileData?.type !== "success") {
      return res.status(400).json({ message: fileData?.type || "File upload failed" });
    }

    const { id: userId } = req.user;
    const { instructionId, part, workInstruction, stepNumber } = req.body;
    
    connection = await pool.getConnection();

    // Verify instruction exists
    const [[instruction]] = await connection.query(
      `SELECT process FROM work 
       WHERE instructionId = ? AND isDeleted = FALSE`,
      [instructionId]
    );

    if (!instruction) {
      return res.status(404).json({ message: "Instruction not found" });
    }

    await createTable("work_instructions", [
      { name: "id", type: "INT AUTO_INCREMENT PRIMARY KEY" },
      { name: "instructionId", type: "CHAR(36) NOT NULL" },
      { name: "process", type: "VARCHAR(255) NOT NULL" },
      { name: "part", type: "VARCHAR(255) NOT NULL" },
      { name: "stepNumber", type: "INT NOT NULL" },
      { name: "workInstruction", type: "VARCHAR(255) NOT NULL" },
      { name: "workInstructionImg", type: "VARCHAR(255)" },
      { name: "workInstructionVideo", type: "VARCHAR(255)" },
      { name: "createdBy", type: "VARCHAR(255) NOT NULL" },
      { name: "isDeleted", type: "TINYINT(1) DEFAULT 0" },
      { name: "createdAt", type: "DATETIME DEFAULT CURRENT_TIMESTAMP" },
      { name: "updatedAt", type: "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" },
      { name: "CONSTRAINT fk_instruction", type: "FOREIGN KEY (instructionId) REFERENCES work(instructionId)" }
    ]);

    await connection.query(
      `INSERT INTO work_instructions 
       (instructionId, process, stepNumber, part, workInstruction, workInstructionImg, workInstructionVideo, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        instructionId,
        instruction.process,
        stepNumber,
        part?.trim(),
        workInstruction?.trim(),
        fileData.data?.workInstructionImg?.[0]?.filename,
        fileData.data?.workInstructionVideo?.[0]?.filename,
        userId
      ]
    );

    return res.status(201).json({
      message: `Step ${stepNumber} added successfully!`
    });
  } catch (error) {
    console.error("Work instruction error:", error);
    return res.status(500).json({ 
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }finally {
    console.log('reeeeeeeeeeeee');
    
    if (connection) await connection.release();
  }
};
const getWorkDetail = async (req, res) => {
  try {
    const id = req.params.id;
    connection = await pool.getConnection();
    const [data] = await connection.query(
      `SELECT * FROM work_instructions WHERE id = ? AND isDeleted = FALSE`,
      id
    );
    if (data.length === 0) {
      return res.status(404).send({
        message: "Record not found .",
      });
    }
    return res.status(200).json({
      message: "Work detail retrived successfully !",
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

const updateWorkInstruction = async (req, res) => {
  try {
    let fileData;
    fileData = await fileUploadFunc(req, res);
    if (fileData && fileData?.type !== "success") {
      return res.status(400).send({ message: fileData.type });
    }
    const getWorkInstructionimg =
      fileData?.data?.workInstructionImg?.[0].filename;
    const getWorkInstructionVideo =
      fileData?.data?.workInstructionVideo?.[0].filename;
    const id = req.params.id;
    connection = await pool.getConnection();
    const { part, stepNumber, workInstruction } = req.body;
    connection
      .query(
        `UPDATE work_instructions 
        SET part = ?, 
        stepNumber = ?, 
        workInstruction = ?,
        workInstructionImg = ?,
        workInstructionVideo = ?
        WHERE id = ? AND isDeleted = FALSE`,
        [
          part.trim(),
          stepNumber.trim(),
          workInstruction.trim(),
          getWorkInstructionimg,
          getWorkInstructionVideo,
          id,
        ]
      )
      .then();

    return res.status(201).json({
      message: "Work instruction updated successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Sometthing went wrong .",
    });
  } finally {
    if (connection) await connection.release();
  }
};
const workInstructionList = async (req, res) => {
  
  try {
    await pool.getConnection();
    const paginationData = await paginationQuery(req.query);
    const { process = "", search = "" } = req.query;
    const searchTerm = `%${search.replace(/[%_]/g, "\\$&")}%`;
    const [[workInstructionData], [totalCounts]] = await Promise.all([
      connection.query(
        `SELECT * FROM work_instructions 
     WHERE (process = ? OR ? = '') 
     AND isDeleted = FALSE 
     AND (workInstruction LIKE ? OR part LIKE ?)
     LIMIT ? OFFSET ?`,
        [
          process.trim(),
          process.trim(),
          searchTerm,
          searchTerm,
          paginationData.pageSize,
          paginationData.skip,
        ]
      ),

      connection.query(
        `SELECT COUNT(*) AS totalCount FROM work_instructions 
     WHERE (process = ? OR ? = '') 
     AND isDeleted = FALSE 
     AND (workInstruction LIKE ? OR part LIKE ?)`,
        [process.trim(), process.trim(), searchTerm, searchTerm]
      ),
    ]);

    const paginationObj = {
      page: paginationData.page,
      pageSize: paginationData.pageSize,
      total: totalCounts[0].totalCount,
    };

    const getPagination = await pagination(paginationObj);

    return res.status(200).json({
      message: "Work Instructions list retrieved successfully!",
      data: workInstructionData,
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

const deleteWorkInstruction = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const id = req?.params?.id;
    connection
      .query(`UPDATE work_instructions SET isDeleted = TRUE WHERE id = ?`, [id])
      .then();
    return res.status(200).json({
      message: "Work Instruction delete successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  } finally {
    if (connection) await connection.release();
  }
};


const createCustomer = async (req, res) => {
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
    connection = await pool.getConnection();
    connection.query(
      "INSERT INTO customers (firstName, lastName, email,address,billingTerms,createdBy) VALUES (?,?,?,?,?,?)",
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
      message: "Customers added successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }finally {
    if (connection) await connection.release();
  }
};

const customerList = async (req, res) => {
  try {
     connection = await pool.getConnection();
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

      // connection.query(
      //   `SELECT * FROM customers WHERE isDeleted = FALSE LIMIT ${Number(
      //     paginationData.pageSize
      //   )} OFFSET ${Number(paginationData.skip)};`
      // ),
      // connection.query(
      //   `SELECT COUNT(*) AS totalCount FROM customers WHERE isDeleted = FALSE;`
      // ),
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
    console.log(error);
    
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }finally {
    if (connection) await connection.release();
  }
};

const customerDetail = async (req, res) => {
  try {
    connection = await pool.getConnection();
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
  }finally {
    if (connection) await connection.release();
  }
};

const editCustomerDetail = async (req, res) => {
  try {
    const { firstName, lastName, email, address, billingTerms } = req.body;
    const id = req.params?.id;
    connection = await pool.getConnection();
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
    return res.status(201).send({
      message: "Customer detail updated successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }finally {
    if (connection) await connection.release();
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const id = req.params.id;
    connection = await pool.getConnection();
    const data = await connection.query(
      `UPDATE customers SET isDeleted = TRUE WHERE id = ?`,
      [id]
    );
    return res.status(201).json({
      message: "Customer delete successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }finally {
    if (connection) await connection.release();
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

    connection = await pool.getConnection();
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
    const paginationData = paginationQuery(req.query);
     connection = await pool.getConnection();
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
  }finally {
    if (connection) await connection.release();
  }
};

const processDetail = async (req, res) => {
  try {
    const id = req.params.id;
    connection = await pool.getConnection();
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

const workProcess = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT id, processName FROM process WHERE isDeleted = FALSE`
    );

    const processData = rows.map((row) => ({
      value: row.processName,
      label: row.processName,
    }));

    return res.status(200).json({
      message: "All processes retrieved successfully!",
      processData,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
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
    const connection = await pool.getConnection();
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
    return res.status(201).json({
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
    const connection = await pool.getConnection();
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

const addProductNumber = async (req, res) => {
  try {
    await createTable("product_number", [
      { name: "id", type: "INT PRIMARY KEY AUTO_INCREMENT" },
      { name: "partFamily", type: "VARCHAR(255)" },
      { name: "metaDescription", type: "VARCHAR(500)" },
      { name: "cost", type: "VARCHAR(255)" },
      { name: "leadTime", type: "VARCHAR(255)" },
      { name: "supplierOrderQuantity", type: "VARCHAR(255)" },
      { name: "companyName", type: "VARCHAR(255)" },
      { name: "miniumStock", type: "INT" },
      { name: "availStock", type: "INT" },
      { name: "cycleTime", type: "VARCHAR(255)" },
      { name: "processOrderRequired", type: "VARCHAR(255)" },
      { name: "createdBy", type: "VARCHAR(255)" },
    ]);
    const {
      partFamily,
      metaDescription,
      cost,
      leadTime,
      supplierOrderQuantity,
      companyName,
      minimumStock,
      availStock,
      cycleTime,
    } = req.body;
    const connection = await pool.getConnection();
    connection
      .query(
        `INSERT INTO product_number (partFamily,metaDescription,cost,leadTime,supplierOrderQuantity,
      companyName,miniumStock,availStock,cycleTime) VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          partFamily?.trim(),
          metaDescription?.trim(),
          cost?.trim(),
          leadTime?.trim(),
          supplierOrderQuantity?.trim(),
          companyName?.trim(),
          minimumStock?.trim(),
          availStock?.trim(),
          cycleTime?.trim(),
        ]
      )
      .then();
    return res.status(201).json({
      message: "Product number added successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const productNumberList = async (req, res) => {
  try {
    const paginationData = paginationQuery(req.query);
    const connection = await pool.getConnection();
    const [[productNumberData], [totalCounts]] = await Promise.all([
      connection.query(
        `SELECT * FROM  product_number WHERE  isDeleted = FALSE LIMIT ${Number(
          paginationData.pageSize
        )} OFFSET ${Number(paginationData.skip)} `
      ),
      connection.query(
        `SELECT COUNT(*) AS totalCount FROM product_number WHERE isDeleted = FALSE; `
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
      productNumberData: productNumberData,
      totalCount: totalCounts[0].totalCount,
      pagination: getPagination,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const productDetail = async (req, res) => {
  try {
    const id = req.params.id;
    const connection = await pool.getConnection();
    const [data] = await connection.query(
      `SELECT * FROM product_number WHERE isDeleted = FALSE AND id = ?`,
      id
    );
    return res.status(200).json({
      message: "Process detail retrived successfully !",
      data: data[0],
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again .",
    });
  }
};

const addPartNumber = async (req, res) => {
  try {
    await createTable("part_number", [
      { name: "id", type: "INT PRIMARY KEY AUTO_INCREMENT" },
      { name: "partFamily", type: "VARCHAR(255)" },
      { name: "metaDescription", type: "VARCHAR(500)" },
      { name: "cost", type: "VARCHAR(255)" },
      { name: "leadTime", type: "VARCHAR(255)" },
      { name: "supplierOrderQuantity", type: "VARCHAR(255)" },
      { name: "companyName", type: "VARCHAR(255)" },
      { name: "minStock", type: "INT" },
      { name: "availStock", type: "INT" },
      { name: "cycleTime", type: "VARCHAR(255)" },
      { name: "processOrderRequired", type: "VARCHAR(255)" },
      { name: "partImg", type: "VARCHAR(255)" },
      { name: "createdBy", type: "VARCHAR(255)" },
    ]);
    let fileData;
    fileData = await fileUploadFunc(req, res);
    if (fileData && fileData?.type !== "success") {
      return res.status(400).send({ message: fileData.type });
    }
   
    const partImgFilename = fileData?.data?.partImg[0].filename;
    const {
      partFamily,
      metaDescription,
      cost,
      leadTime,
      supplierOrderQuantity,
      companyName,
      minimumStock,
      availStock,
      cycleTime,
    } = req.body;
    const connection = await pool.getConnection();
    connection
      .query(
        `INSERT INTO part_number (partFamily,metaDescription,cost,leadTime,supplierOrderQuantity,
      companyName,minStock,availStock,cycleTime,partImg) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          partFamily?.trim(),
          metaDescription?.trim(),
          cost?.trim(),
          leadTime?.trim(),
          supplierOrderQuantity?.trim(),
          companyName?.trim(),
          minimumStock?.trim(),
          availStock?.trim(),
          cycleTime?.trim(),
          partImgFilename,
        ]
      )
      .then();
    return res.status(201).json({
      message: "Part number added successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const editPartNumber = async (req, res) => {
  try {
    const id = req.params.id;
    const {
      partFamily,
      metaDescription,
      cost,
      leadTime,
      supplierOrderQuantity,
      companyName,
      minimumStock,
      availStock,
      cycleTime,
    } = req.body;
    const connection = await pool.getConnection();
    connection
      .query(
        `UPDATE part_number 
        SET partFamily = ?, 
        metaDescription = ?, 
        cost = ?, 
        leadTime = ?,
        supplierOrderQuantity = ?,
        companyName = ?,
        minimumStock = ?,
        availStock = ?,
        cycleTime = ?,
        WHERE id = ? AND isDeleted = FALSE`,
        [
          partFamily,
          metaDescription,
          cost,
          leadTime,
          supplierOrderQuantity,
          companyName,
          minimumStock,
          availStock,
          cycleTime,
          id,
        ]
      ).then();
    return res.status(201).json({
      message: "Process edit successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again .",
    });
  }
};
const profileUpdate = async (req, res) => {
  try {
    let fileData;
    fileData = await fileUploadFunc(req, res);
    if (fileData && fileData?.type !== "success") {
      return res.status(400).send({ message: fileData.type });
    }
    const profileImgFilename = fileData?.data?.profileImg[0].filename;
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
    const { id } = req.user;
    const connection = await pool.getConnection();
    const columnsToCheck = [
      { name: "address", definition: `VARCHAR(255)` },
      { name: "country", definition: "VARCHAR(255)" },
      { name: "state", definition: "VARCHAR(255)" },
      { name: "city", definition: "VARCHAR(255)" },
      { name: "zipcode", definition: "VARCHAR(255)" },
      { name: "about", definition: "VARCHAR(255)" },
      { name: "profileImg", definition: "VARCHAR(255)" },
    ];

    for (const column of columnsToCheck) {
      const [columnExists] = await connection.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'admins' AND COLUMN_NAME = ?`,
        [column.name]
      );


      if (columnExists.length === 0) {
        await connection.query(
          `ALTER TABLE admins ADD COLUMN ${column.name} ${column.definition}`
        );
      }
    }
    connection
      .query(
        `UPDATE admins SET name = ?, email = ?, phoneNumber = ?, address = ?, country = ?, state = ?, city = ?, zipcode = ?, about = ?,profileImg = ? 
     WHERE id = ? AND isDeleted = FALSE`,
        [
          name,
          email,
          phoneNumber,
          address,
          country,
          state,
          city,
          zipcode,
          about,
          profileImgFilename,
          id,
        ]
      )
      .then();

    return res.status(201).json({
      message: "Profile update successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const profileDetail = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const id = req.user.id;
    const [data] = await connection.query(
      `SELECT *, NULL AS tokens ,NULL AS password FROM admins WHERE id = ? AND isDeleted = FALSE`,
      id
    );
    return res.status(200).json({
      message: "Profile detail retrived successfully !",
      data: data[0],
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const deleteProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const connection = await pool.getConnection();
    connection
      .query(
        `UPDATE admins SET isDeleted = TRUE WHERE id = ? AND isDeleted = FALSE`,
        [id]
      )
      .then();
    return res.status(200).json({
      message: "Your profile deleted successfully .",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const checkToken = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const id = req.user.id;
    const [[user]] = await connection.query(
      `SELECT *, NULL AS token ,NULL AS password FROM admins WHERE id = ? AND isDeleted = FALSE`,
      id
    );

    return res.status(200).json({
      message: "Token is valid",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profileImg: user.profileImg,
        roles: user.roles,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong . please try again later .",
    });
  }
};


module.exports = {
  login,
  forgetPassword,
  validOtp,
  resetPassword,
  // createEmployee,
  // employeeDetail,
  // editEmployee,
  // allEmployees,
  // changeEmployeeStatus,
  // vacationApprovel,
  // vacationApprovalList,
  // updateEmployeeTimeClock,
  // allEmployeeTimeClockList,
  // addWorkInstruction,
  // editWorkInstruction,
  workInstruction,
  getWorkDetail,
  updateWorkInstruction,
  workInstructionList,
  deleteWorkInstruction,
  createCustomer,
  customerDetail,
  editCustomerDetail,
  deleteCustomer,
  customerList,
  addProcess,
  processList,
  processDetail,
  editProcess,
  deleteProcess,
  addPartNumber,
  workProcess,
  profileUpdate,
  profileDetail,
  deleteProfile,
  selectProcessProcess,
  checkToken,
  addProductNumber,
  productNumberList,
  productDetail,
  editPartNumber,
  // supplierOrder,
};
