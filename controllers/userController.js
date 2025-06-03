const md5 = require("md5");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { createTable, pool } = require("../config/dbConnection");
const {
  generateRandomOTP,
  pagination,
  paginationQuery,
} = require("../functions/common");
const { validationResult } = require("express-validator");
const { checkValidations } = require("../functions/checkvalidation");

const register = async (req, res) => {
  try {
    await createTable("users", [
      { name: "id", type: "CHAR(36) PRIMARY KEY DEFAULT (UUID())" },
      { name: "email", type: "VARCHAR(255)" },
      { name: "password", type: "VARCHAR(255)" },
      { name: "tokens", type: "JSON" },
      { name: "roles", type: "VARCHAR(255) DEFAULT 'front-line'" }, // default role set here
    ]);

    const connection = await pool.getConnection();
    const { email, password } = req.body;

    const [users] = await connection.query(
      `SELECT * FROM users WHERE email = ? AND isDeleted = FALSE`,
      [email]
    );

    if (users.length) {
      return res.status(409).send({
        message: "User already present.",
      });
    }

    const convertedPassword = md5(password);
    const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "5d",
    });

    // Store token as a JSON array: ["token"]
    await connection.query(
      `INSERT INTO users (email, password, tokens) VALUES (?, ?, ?)`,
      [email, convertedPassword, JSON.stringify([token])]
    );

    res.status(201).send({
      message: "User created successfully",
      token,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

// const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     const connection = await pool.getConnection();

//     const [data] = await connection.query(
//       `SELECT * FROM users WHERE email = ? AND isDeleted = FALSE`,
//       [email]
//     );

//     if (data.length === 0) {
//       return res.status(404).send({
//         message: "User not found.",
//       });
//     }

//     const user = {
//       id: data[0].id,
//       password: data[0].password,
//       // roles: data[0].roles,
//     };
//     const hashedPassword = md5(password);

//     if (user.password !== hashedPassword) {
//       return res.status(401).send({
//         message: "Invalid password.",
//       });
//     }

//     const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
//       expiresIn: "5d",
//     });
//     connection
//       .query(
//         `UPDATE users SET token
//         s = JSON_ARRAY_APPEND(COALESCE(tokens, JSON_ARRAY()), '$', ?)  WHERE email = ?`,
//         [token, email]
//       )
//       .then();
//     const [getData] = await connection.query(`SELECT * FROM users`);
//     return res.status(200).json({
//       message: "Login successful!",
//       token,
//     });
//   } catch (error) {
//     return res.status(500).send({
//       message: "Something went wrong. Please try again later.",
//     });
//   }
// };

const login = async (req, res) => {
  const errors = validationResult(req);
  const checkValid = await checkValidations(errors);
  if (checkValid.type === "error") {
    return res.status(400).send({
      message: checkValid.errors.msg,
    });
  }
  const { email, password } = req.body;
  const connection = await pool.getConnection();
  try {
    const [data] = await connection.query(
      `SELECT * FROM users 
       WHERE email = ? 
       AND password = ? 
       AND isDeleted = FALSE`,
      [email.trim().toLowerCase(), md5(password)]
    );

    console.log("datadata", data);
    if (data.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = {
      id: data[0].id,
      password: data[0].password,
      roles: data[0].roles,
    };
    const token = jwt.sign({ user: user }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "5d",
    });
    connection
      .query(
        `UPDATE users 
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
    console.log(err);
    return res
      .status(500)
      .json({ message: "Something went wrong . please try again later ." });
  }
};
const forgetPassword = async (req, res) => {
  try {
    //    const errors = validationResult(req);
    //    const checkValid = await checkValidations(errors);
    //    if (checkValid.type === "error") {
    //      return res.status(400).send({
    //        message: checkValid.errors.msg,
    //      });
    //    }

    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const connection = await pool.getConnection();
    const [data] = await connection.query(
      `SELECT * FROM users 
          WHERE email = ? 
          AND isDeleted = FALSE`,
      [normalizedEmail]
    );
    if (data.length == 0) {
      return res.status(400).send({ message: "User not found" });
    }
    const getData = data[0];
    const [otpExists] = await connection.query(
      ` SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'otp'`
    );
    if (otpExists.length === 0) {
      await connection.query(`ALTER TABLE users ADD COLUMN otp VARCHAR(100) `);
    }
    const otp = generateRandomOTP();

    // const mailVariables = {
    //   "%otp%": otp,
    // };
    await connection.query(`UPDATE users SET otp = ? WHERE email = ?`, [
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
    //   const errors = validationResult(req);
    //   const checkValid = await checkValidations(errors);
    //   if (checkValid.type === "error") {
    //     return res.status(400).send({
    //       message: checkValid.errors.msg,
    //     });
    //   }
    const { email, otp } = req.body;
    const connection = await pool.getConnection();
    const [data] = await connection.query(
      `SELECT * FROM users 
         WHERE email = ? 
         AND isDeleted = FALSE`,
      email
    );
    const getData = data[0];
    const [tokenExists] = await connection.query(
      ` SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'token'`
    );
    if (tokenExists.length === 0) {
      await connection.query(
        `ALTER TABLE users ADD COLUMN token VARCHAR(100) `
      );
    }
    if (data.length == 0) {
      return res.status(400).send({ message: "User not found" });
    }

    if (getData.otp !== otp) {
      return res.status(400).send({ message: "Invalid OTP" });
    }
    const token = uuidv4();
    await connection.query(
      `UPDATE users SET token = ?, otp = NULL WHERE id = ?`,
      [token, getData.id]
    );

    await connection.query(`ALTER TABLE users DROP COLUMN otp VARCHAR(100) `);

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

const stockOrder = async (req, res) => {
  try {
    await createTable("stock_order", [
      { name: "id", type: "INT PRIMARY KEY AUTO_INCREMENT" },
      { name: "orderNumber", type: "INT" },
      { name: "orderDate", type: "VARCHAR(255)" },
      { name: "shipDate", type: "VARCHAR(255)" },
      { name: "customer", type: "JSON" },
      { name: "customerName", type: "VARCHAR(255)" },
      { name: "customerEmail", type: "VARCHAR(255)" },
      { name: "customerPhoneNum", type: "VARCHAR(255)" },
      { name: "productNumber", type: "VARCHAR(255)" },
      { name: "cost", type: "VARCHAR(255)" },
      { name: "productQuantity", type: "INT" },
      { name: "productDesc", type: "VARCHAR(255)" },
      { name: "partFamily", type: "JSON" },
      { name: "partNumber", type: "VARCHAR(255)" },
      { name: "partDesc", type: "VARCHAR(255)" },
      { name: "partQuantity", type: "VARCHAR(255)" },
      { name: "partCost", type: "VARCHAR(255)" },
      { name: "totalTime", type: "VARCHAR(255)" },
      { name: "process", type: "VARCHAR(255)" },
      { name: "assignTo", type: "VARCHAR(255)" },
      { name: "createdBy", type: "VARCHAR(255)" },
    ]);
    const userId = req.user?.id;
    const {
      orderNumber,
      orderDate,
      shipDate,
      customer,
      customerName,
      customerEmail,
      customerPhoneNum,
      productNumber,
      cost,
      productQuantity,
      productDesc,
      partFamily,
      partNumber,
      partDesc,
      partQuantity,
      partCost,
      totalTime,
      process,
      assignTo,
    } = req.body;
    const connection = await pool.getConnection();
    connection
      .query(
        `INSERT INTO stock_order (orderNumber,orderDate,shipDate,customer,customerName,
      customerEmail,customerPhoneNum,productNumber,cost,productQuantity,productDesc,partFamily,partNumber,partDesc,partQuantity,
      partCost,totalTime,process,assignTo,createdBy) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          orderNumber?.trim(),
          orderDate?.trim(),
          shipDate?.trim(),
          customer?.trim(),
          customerName?.trim(),
          customerEmail?.trim(),
          customerPhoneNum?.trim(),
          productNumber?.trim(),
          cost?.trim(),
          productQuantity?.trim(),
          productDesc?.trim(),
          partFamily?.trim(),
          partNumber?.trim(),
          partDesc?.trim(),
          partQuantity?.trim(),
          partCost?.trim(),
          totalTime?.trim(),
          process?.trim(),
          assignTo?.trim(),
          userId,
        ]
      )
      .then();
    return res.status(201).json({
      message: "Stock order added successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong  . please try again later .",
    });
  }
};

const customerOrder = async (req, res) => {
  try {
    await createTable("customer_order", [
      { name: "id", type: "INT PRIMARY KEY AUTO_INCREMENT" },
      { name: "orderNumber", type: "INT" },
      { name: "orderDate", type: "VARCHAR(255)" },
      { name: "shipDate", type: "VARCHAR(255)" },
      { name: "customer", type: "VARCHAR(255)" },
      { name: "customerName", type: "VARCHAR(255)" },
      { name: "customerEmail", type: "VARCHAR(255)" },
      { name: "customerPhoneNum", type: "VARCHAR(255)" },
      { name: "productNumber", type: "VARCHAR(255)" },
      { name: "cost", type: "VARCHAR(255)" },
      { name: "productQuantity", type: "INT" },
      { name: "productDesc", type: "VARCHAR(255)" },
      { name: "partFamily", type: "VARCHAR(255)" },
      { name: "totalTime", type: "VARCHAR(255)" },
      { name: "process", type: "VARCHAR(255)" },
      { name: "assignTo", type: "VARCHAR(255)" },
      { name: "createdBy", type: "VARCHAR(255)" },
    ]);
    const {
      orderNumber,
      orderDate,
      shipDate,
      customer,
      customerName,
      customerEmail,
      customerPhoneNum,
      productNumber,
      cost,
      productQuantity,
      productDesc,
      partFamily,
      totalTime,
      process,
      assignTo,
    } = req.body;
    const connection = await pool.getConnection();
    connection
      .query(
        `INSERT INTO part_number (orderNumber,orderDate,shipDate,customer,customerName,
      customerEmail,customerPhoneNum,productNumber,cost,productQuantity,productDesc,partFamily,totalTime,process,assignTo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          orderNumber?.trim(),
          orderDate?.trim(),
          shipDate?.trim(),
          customer?.trim(),
          customerName?.trim(),
          customerEmail?.trim(),
          customerPhoneNum?.trim(),
          productNumber?.trim(),
          cost?.trim(),
          productQuantity?.trim(),
          productDesc?.trim(),
          partFamily?.trim(),
          totalTime?.trim(),
          process?.trim(),
          assignTo?.trim(),
        ]
      )
      .then();
    return res.status(201).json({
      message: "Customer order added successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong  . please try again later .",
    });
  }
};

const addSupplier = async (req, res) => {
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
    const connection = await pool.getConnection();
    const { id: userId } = req.user;
    const { firstName, lastName, email, address, billingTerms } = req.body;
    connection
      .query(
        `INSERT INTO suppliers (firstName,lastName,email,address,billingTerms) VALUES (?,?,?,?,?)`,
        [
          firstName?.trim(),
          lastName?.trim(),
          email?.trim(),
          address?.trim(),
          billingTerms?.trim(),
          userId,
        ]
      )
      .then();
    return res.status(201).json({
      message: "Supplier added  successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

// const allSupplier = async (req, res) => {
//   try {
//     const paginationData = paginationQuery(req.query);
//     const connection = await pool.getConnection();
//     const [[supplierData], [totalCounts]] = await Promise.all([
//       connection.query(
//         `SELECT * FROM  suppliers WHERE  isDeleted = FALSE LIMIT ${Number(
//           paginationData.pageSize
//         )} OFFSET ${Number(paginationData.skip)} `
//       ),
//       connection.query(
//         `SELECT COUNT(*) AS totalCount FROM suppliers WHERE isDeleted = FALSE; `
//       ),
//     ]);
//     const paginationObj = {
//       page: paginationData.page,
//       pageSize: paginationData.pageSize,
//       total: totalCounts[0].totalCount,
//     };
//     const getPagination = await pagination(paginationObj);
//     return res.status(200).json({
//       message: "All suppliers retrived successfully !",
//       supplierData: supplierData,
//       totalCount: totalCounts[0].totalCount,
//       pagination: getPagination,
//     });
//   } catch (error) {
//     return res.status(500).send({
//       message: "Something went wrong . please try again later .",
//     });
//   }
// };

const allSupplier = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const paginationData = await paginationQuery(req.query);
    const { process = "", search = "" } = req.query;
    const searchTerm = `%${search.replace(/[%_]/g, "\\$&")}%`;
    const [[supplierData], [totalCounts]] = await Promise.all([
      connection.query(
        `SELECT * FROM suppliers  WHERE isDeleted = FALSE 
        AND (email LIKE ? OR firstName LIKE ?) 
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
        WHERE  isDeleted = FALSE   AND (email LIKE ? OR firstName LIKE ?) `,
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
      data: supplierData,
      totalCounts: totalCounts[0].totalCount,
      pagination: getPagination,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const getSupplierDetail = async (req, res) => {
  try {
    const id = req.params.id;
    const connection = await pool.getConnection();
    const [data] = await connection.query(
      `SELECT * FROM suppliers WHERE id = ? AND isDeleted = FALSE`,
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

const editSupplier = async (req, res) => {
  try {
    const id = req.params.id;
    const { firstName, lastName, email, address, billingTerms } = req.body;
    const connection = await pool.getConnection();
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
    return res.status(201).json({
      message: "Supplier information edit successfully !",
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
      .query(`UPDATE suppliers SET isDeleted = TRUE WHERE id = ?`, [id])
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

// const allSupplier = async (req, res) => {
//   try {
//     const paginationData = paginationQuery(req.query);
//     const { search = "", sortBy = "id", order = "desc" } = req.query;

//     const connection = await pool.getConnection();

//     // Prepare search clause
//     const searchClause = search
//       ? `AND (firstName LIKE ? OR lastName LIKE ? OR email LIKE ?)`
//       : "";

//     const searchValues = search
//       ? [`%${search}%`, `%${search}%`, `%${search}%`]
//       : [];

//     // Main query with search + sort + pagination
//     const [supplierData] = await connection.query(
//       `
//       SELECT * FROM suppliers
//       WHERE isDeleted = FALSE ${searchClause}
//       ORDER BY ${connection.escapeId(sortBy)} ${order.toUpperCase() === "ASC" ? "ASC" : "DESC"}
//       LIMIT ? OFFSET ?
//       `,
//       [...searchValues, Number(paginationData.pageSize), Number(paginationData.skip)]
//     );

//     // Count query for pagination
//     const [totalCounts] = await connection.query(
//       `
//       SELECT COUNT(*) AS totalCount FROM suppliers
//       WHERE isDeleted = FALSE ${searchClause}
//       `,
//       searchValues
//     );

//     const paginationObj = {
//       page: paginationData.page,
//       pageSize: paginationData.pageSize,
//       total: totalCounts[0].totalCount,
//     };
//     const getPagination = await pagination(paginationObj);

//     return res.status(200).json({
//       message: "All suppliers retrieved successfully!",
//       processData: supplierData,
//       totalCount: totalCounts[0].totalCount,
//       pagination: getPagination,
//     });
//   } catch (error) {
//     console.error("Error fetching suppliers:", error);
//     return res.status(500).send({
//       message: "Something went wrong. Please try again later.",
//     });
//   }
// };

module.exports = {
  register,
  login,
  forgetPassword,
  validOtp,
  stockOrder,
  customerOrder,
  addSupplier,
  allSupplier,
  getSupplierDetail,
  editSupplier,
  deleteSupplier,
};
