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

const login = async (req, res) => {
  const errors = validationResult(req);
  const checkValid = await checkValidations(errors);
  if (checkValid.type === "error") {
    return res.status(400).send({
      message: checkValid.errors.msg,
    });
  }
  const { userName, password } = req.body;
  const connection = await pool.getConnection();
  try {
    const [data] = await connection.query(
      `SELECT * FROM admins 
       WHERE (email = ? OR phoneNumber = ?) 
       AND password = ? 
       AND isDeleted = FALSE`,
      [userName.trim().toLowerCase(), userName.trim(), md5(password)]
    );

    if (data.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = {
      id: data[0].id,
      password: data[0].password,
      roles: data[0].roles,
    };
    const token = jwt.sign({ user: user }, process.env.ACCESS_TOKEN_SECERT, {
      expiresIn: "5d",
    });
    connection
      .query(
        `UPDATE admins 
      SET tokens = JSON_ARRAY_APPEND(COALESCE(tokens, JSON_ARRAY()), '$', ?) 
      WHERE id = ?`,
        [token, user.id]
      )
      .then();

    return res.status(200).json({
      message: "You have successfully logged in.",
      token,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Something went wrong . please try again later ." });
  } finally {
    connection.release();
  }
};

const forgetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    const checkValid = await checkValidations(errors);
    if (checkValid.type === "error") {
      return res.status(400).send({
        message: checkValid.errors.msg,
      });
    }

    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const connection = await pool.getConnection();
    const [data] = await connection.query(
      `SELECT * FROM admins 
       WHERE email = ? 
       AND isDeleted = FALSE`,
      [normalizedEmail]
    );
    if (data.length == 0) {
      return res.status(400).send({ message: "Admin not found" });
    }
    const getData = data[0];
    const otp = generateRandomOTP();

    // const mailVariables = {
    //   "%otp%": otp,
    // };
    await connection.query(`UPDATE admins SET otp = ? WHERE email = ?`, [
      otp,
      getData.email,
    ]);
    // await sendMail("forget-password-otp", mailVariables, normalizedEmail);

    return res.status(200).json({
      email: getData.email,
      message: "OTP sent successfully",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
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
      `UPDATE admins SET password = ?, token = NULL WHERE id = ?`,
      [covertedNewPass, getData.id]
    );
    return res.status(200).send({ message: "Password reset successfully." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Something went wrong . please try again later ." });
  }
};

const selectProcessProcess = async (req, res) => {
  try {
    // Ensure table exists (run only once in production)
    await createTable("work", [
      { name: "id", type: "INT PRIMARY KEY AUTO_INCREMENT" },
      { name: "process", type: "VARCHAR(255)" },
      { name: "product", type: "VARCHAR(255)" },
      { name: "instructionId", type: "VARCHAR(255)" },
      { name: "createdBy", type: "VARCHAR(255)" },
    ]);

    const { process, product } = req.body;
    const { id: userId } = req.user;

    const instructionId = uuidv4();
    console.log("Generated instructionId:", instructionId);

    const connection = await pool.getConnection();

    // Insert main record without steps
    await connection.query(
      `INSERT INTO work 
       (process, product, instructionId, createdBy)
       VALUES (?, ?, ?, ?)`,
      [process?.trim(), product?.trim(), instructionId, userId]
    );

    connection.release();

    return res.status(201).json({
      message: "Process and product selected successfully!",
      instructionId: instructionId, // return this so client can add steps later
    });
  } catch (error) {
    console.error("Error selecting process/product:", error);
    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const workInstruction = async (req, res) => {
  try {
    await createTable("work_instructions", [
      { name: "id", type: "INT PRIMARY KEY AUTO_INCREMENT" },
      { name: "instructionId", type: "VARCHAR(255)" },
      { name: "process", type: "VARCHAR(255)" },
      { name: "part", type: "VARCHAR(255)" },
      { name: "stepNumber", type: "INT" },
      { name: "workInstruction", type: "VARCHAR(255)" },
      { name: "workInstructionImg", type: "VARCHAR(255)" },
      { name: "workInstructionVideo", type: "VARCHAR(255)" },
      { name: "createdBy", type: "VARCHAR(255)" },
    ]);
    let fileData;
    fileData = await fileUploadFunc(req, res);
    if (fileData && fileData?.type !== "success") {
      return res.status(400).send({ message: fileData.type });
    }
    const getWorkInstructionimg =
      fileData?.data?.workInstructionImg?.[0].filename;
    const getWorkInstructionVideo =
      fileData?.data?.workInstructionVideo?.[0].filename;

    const { id: userId } = req.user;
    const { instructionId, part, workInstruction, stepNumber } = req.body;
    const connection = await pool.getConnection();
    const [[getProcess]] = await connection.query(
      `SELECT process FROM work WHERE  instructionId = ? AND isDeleted = FALSE`,
      [instructionId]
    );
    console.log("getProcessgetProcess", getProcess.process);
    await connection.query(
      `INSERT INTO work_instructions (instructionId, process,stepNumber, part, workInstruction,workInstructionImg,workInstructionVideo,createdBy)
       VALUES (?, ?,?, ?,?, ?,?,?)`,
      [
        instructionId,
        getProcess.process,
        stepNumber,
        part?.trim(),
        workInstruction?.trim(),
        getWorkInstructionimg,
        getWorkInstructionVideo,
        userId,
      ]
    );
    return res
      .status(201)
      .json({ message: `Step ${stepNumber} added successfully!` });
  } catch (error) {
    console.error("Error inserting work instruction step:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// const workInstruction = async (req, res) => {
//   const { instructionId, process, product, part, steps } = req.body; // steps: array of { stepNumber, workInstruction }
//   const userId = req.user.id;

//   if (!instructionId || !process || !product || !part || !steps?.length) {
//     return res.status(400).json({ message: "Missing required fields" });
//   }

//   const connection = await pool.getConnection();

//   try {
//     await connection.beginTransaction();

//     // Insert each step as separate row
//     for (const step of steps) {
//       await connection.query(
//         `INSERT INTO work
//          (instructionId, process, product, part, stepNumber, workInstruction, createdBy)
//          VALUES (?, ?, ?, ?, ?, ?, ?)`,
//         [instructionId, process, product, part, step.stepNumber, step.workInstruction.trim(), userId]
//       );
//     }

//     await connection.commit();
//     connection.release();

//     return res.status(201).json({ message: "Work instruction steps added successfully!" });
//   } catch (err) {
//     await connection.rollback();
//     connection.release();
//     console.error(err);
//     return res.status(500).json({ message: "Something went wrong" });
//   }
// };

// const workInstruction = async (req, res) => {
//   let connection;
//   try {
//     const { instructionId, part, workInstruction, steps } = req.body;
//     const userId = req.user.id;

//     connection = await pool.getConnection();
//     await connection.beginTransaction();

//     // 1. Update work table
//     const [updateResult] = await connection.query(
//       `UPDATE work
//        SET part = ?, workInstruction = ?, createdBy = ?
//        WHERE instructionId = ? AND isDeleted = FALSE`,
//       [part?.trim(), workInstruction?.trim(), userId, instructionId]
//     );

//     if (updateResult.affectedRows === 0) {
//       await connection.rollback();
//       return res.status(404).json({ message: "Work instruction not found." });
//     }

//     // 2. Delete existing steps (optional – if you're replacing all)
//     await connection.query(
//       `DELETE FROM work_steps WHERE instruction_id = ?`,
//       [instructionId]
//     );

//     // 3. Insert new steps
//     for (const step of steps) {
//       const { stepNo, title, description } = step;
//       await connection.query(
//         `INSERT INTO work_steps (instruction_id, step_no, step, description)
//          VALUES (?, ?, ?, ?)`,
//         [instructionId, stepNo, title, description]
//       );
//     }

//     await connection.commit();
//     connection.release();

//     return res.status(200).json({
//       message: `Work instruction and ${steps.length} steps saved successfully!`,
//     });
//   } catch (error) {
//     if (connection) await connection.rollback();
//     console.error("Error saving work instruction:", error);
//     return res.status(500).json({ message: "Something went wrong." });
//   }
// };

// const workInstruction = async (req, res) => {
//   try {
//     const { part, stepNumber, workInstruction, step, instructionId } = req.body;
//     const userId = req.user.id;

//     console.log("instructionId", instructionId);
//     const connection = await pool.getConnection();
//     const [result] = await connection.query(
//       `UPDATE work
//    SET part = ?,
//        workInstruction = ?,
//        createdBy = ?
//    WHERE instructionId = ? AND isDeleted = FALSE`,
//       [part?.trim(), workInstruction?.trim(), userId, instructionId]
//     );

//     if (result.affectedRows === 0) {
//       console.log("No matching record found to update.");
//     }

//     return res.status(201).json({
//       message: `Step ${stepNumber} for part '${part}' created successfully!`,
//     });
//   } catch (err) {
//     console.error("Error in createWorkInstruction:", err);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// const workInstruction = async (req, res) => {
//   try {
//     await createTable("work", [
//       { name: "id", type: "INT PRIMARY KEY AUTO_INCREMENT" },
//       { name: "part", type: "VARCHAR(255)" },
//       { name: "stepNumber", type: "VARCHAR(100)" },
//       { name: "workInstruction", type: "VARCHAR(255)" },
//       { name: "createdBy", type: "VARCHAR(255)" },
//       { name: "isDeleted", type: "TINYINT(1) DEFAULT 0" },
//       { name: "createdAt", type: "DATETIME DEFAULT CURRENT_TIMESTAMP" },
//       {
//         name: "updatedAt",
//         type: "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
//       },
//     ]);

//     const {
//       part,
//       stepNumber,
//       workInstruction,
//       imageWorkInstruction,
//       videoWorkInstruction,
//       createdBy,
//     } = req.body;
//     const userId = req.user.id;
//     const connection = await pool.getConnection();
//     await connection.query(
//       "INSERT INTO work (part, stepNumber, workInstruction,createdBy) VALUES (?, ?, ?,?)",
//       [part.trim(), stepNumber.trim(), workInstruction.trim(), userId]
//     );

//     return res.status(201).json({
//       message: "work instruction created successfully!",
//     });
//   } catch (error) {
//     return res.status(500).send({
//       message: "Something went wrong . please try again later .",
//     });
//   }
// };

const getWorkDetail = async (req, res) => {
  try {
    const id = req.params;
    const connection = await pool.getConnection();
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
    const connection = await pool.getConnection();
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
  }
};

const workInstructionList = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const paginationData = await paginationQuery(req.query);

    const [[workInstructionData], [totalCounts]] = await Promise.all([
      connection.query(
        `SELECT * FROM work_instructions WHERE isDeleted = FALSE LIMIT ${Number(
          paginationData.pageSize
        )} OFFSET ${Number(paginationData.skip)};`
      ),
      connection.query(
        `SELECT COUNT(*) AS totalCount FROM work_instructions WHERE isDeleted = FALSE;`
      ),
    ]);
    const paginationObj = {
      page: paginationData.page,
      pageSize: paginationData.pageSize,
      total: totalCounts[0].totalCount,
    };
    const getPagination = await pagination(paginationObj);
    return res.status(200).json({
      message: "Work Instructions list retrived successfully !",
      data: workInstructionData,
      totalCounts: totalCounts[0].totalCount,
      pagination: getPagination,
    });
  } catch (error) {
    console.log("errorerrorerror", error);
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const deleteWorkInstruction = async (req, res) => {
  try {
    const id = req?.params?.id;
    const connection = await pool.getConnection();
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
  }
};

const addSuppliers = async (req, res) => {
  try {
    await createTable("supplier", [
      { name: "id", type: "INT PRIMARY KEY AUTO_INCREMENT" },
      { name: "firstName", type: "VARCHAR(255)" },
      { name: "lastName", type: "VARCHAR(255)" },
      { name: "email", type: "VARCHAR(255)" },
      { name: "address", type: "VARCHAR(255)" },
      { name: "billingTerms", type: "VARCHAR(255)" },
      { name: "submittedBy", type: "VARCHAR(255)" },
      { name: "submittedDate", type: "VARCHAR(255)" },
    ]);
    const connection = await pool.getConnection();
    const [data] = await connection.query(`SELECT name FROM admins`);
    const submittedBy = data[0].name;
    const { firstName, lastName, email, address, billingTerms } = req.body;
    connection
      .query(
        "INSERT INTO supplier (firstName, lastName, email,address,billingTerms,submittedBy) VALUES (?,?,?,?,?,?)",
        [
          firstName.trim(),
          lastName.trim(),
          email.trim(),
          address.trim(),
          billingTerms.trim(),
          submittedBy.trim(),
        ]
      )
      .then();
    return res.status(201).json({
      message: "Suppliers added successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again .",
    });
  }
};

const getSuppliers = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const { page, pageSize, skip } = await paginationQuery(req.query);
    const [[supplierResult], [totalCountResult]] = await Promise.all([
      connection.query(
        `SELECT * FROM supplier WHERE isDeleted = FALSE LIMIT ${Number(
          pageSize
        )} OFFSET ${Number(skip)};`
      ),
      connection.query(
        `SELECT COUNT(*) AS totalCount FROM supplier WHERE isDeleted = FALSE`
      ),
    ]);
    const paginationObj = {
      page,
      pageSize,
      total: totalCountResult[0].totalCount,
    };
    const getPagination = await pagination(paginationObj);
    return res.status(200).json({
      message: "Suppliers list retrieved successfully!",
      data: supplierResult,
      pagination: getPagination,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const editSupplierDetail = async (req, res) => {
  try {
    const { firstName, lastName, email, address, billingTerms } = req.body;
    const id = req.params.id;
    const connection = await pool.getConnection();
    connection
      .query(
        `UPDATE supplier 
      SET firstName = ?, 
      lastName = ?, 
      email = ?, 
      address = ?,
      billingTerms = ?
      WHERE id = ? AND isDeleted = FALSE`,
        [firstName, lastName, email, address, billingTerms, id]
      )
      .then();
    return res.status(201).json({
      message: "Supplier detail edit successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const deleteSupplier = async (req, res) => {
  try {
    const id = req?.params?.id;
    const connection = await pool.getConnection();
    connection
      .query(`DELETE FROM supplier WHERE isDeleted = FALSE AND id = ?;`, id)
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
    const connection = await pool.getConnection();
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
  }
};

const customerList = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const paginationData = await paginationQuery(req.query);
    const [[customerData], [totalCounts]] = await Promise.all([
      connection.query(
        `SELECT * FROM customers WHERE isDeleted = FALSE LIMIT ${Number(
          paginationData.pageSize
        )} OFFSET ${Number(paginationData.skip)};`
      ),
      connection.query(
        `SELECT COUNT(*) AS totalCount FROM customers WHERE isDeleted = FALSE;`
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
    console.log("customer error : ", error);
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const customerDetail = async (req, res) => {
  try {
    const connection = await pool.getConnection();
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
  }
};

const editCustomerDetail = async (req, res) => {
  try {
    const { firstName, lastName, email, address, billingTerms } = req.body;
    const id = req.params?.id;
    const connection = await pool.getConnection();
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
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const id = req.params.id;
    const connection = await pool.getConnection();
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

    const connection = await pool.getConnection();
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
  }
};

const processList = async (req, res) => {
  try {
    const paginationData = paginationQuery(req.query);
    const connection = await pool.getConnection();
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
    console.log("customer error : ", error);
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const processDetail = async (req, res) => {
  try {
    const id = req.params.id;
    const connection = await pool.getConnection();
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
  }
};

const addPartNumber = async (req, res) => {
  try {
    await createTable("product", [
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
        `INSERT INTO product (partFamily,metaDescription,cost,leadTime,supplierOrderQuantity,
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
      message: "Part number added successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
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
      { name: "address", definition: `VARCHAR(255) ` },
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
        `UPDATE admins 
     SET name = ?, email = ?, phoneNumber = ?, address = ?, country = ?, state = ?, city = ?, zipcode = ?, about = ?,
     profileImg = ? 
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
    console.log("eerrrrrrrrro", error);
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
      `SELECT *, NULL AS tokens ,NULL AS password FROM admins WHERE id = ? AND isDeleted = FALSE`,
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
  addSuppliers,
  getSuppliers,
  editSupplierDetail,
  deleteSupplier,
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
  // supplierOrder,
};



