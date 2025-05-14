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

// const createEmployee = async (req, res) => {
//   try {
//     await createTable("employee", [
//       { name: "id", type: "INT PRIMARY KEY AUTO_INCREMENT" },
//       { name: "firstName", type: "VARCHAR(255)" },
//       { name: "lastName", type: "VARCHAR(255)" },
//       { name: "fullName", type: "VARCHAR(255)" },
//       { name: "hourlyRate", type: "VARCHAR(255)" },
//       { name: "shift", type: "VARCHAR(255)" },
//       { name: "pin", type: "VARCHAR(255)" },
//       { name: "startDate", type: "VARCHAR(255)" },
//       { name: "shopFloorLogin", type: "VARCHAR(255)" },
//       { name: "department", type: "VARCHAR(255)" },
//       { name: "createdBy", type: "VARCHAR(255)" },
//     ]);
//     const userId = req.user.id;
//     const {
//       firstName,
//       lastName,
//       fullName,
//       hourlyRate,
//       shift,
//       pin,
//       startDate,
//       shopFloorLogin,
//       department,
//     } = req.body;
//     const connection = await pool.getConnection();
//     connection
//       .query(
//         "INSERT INTO employee (firstName, lastName, fullName,hourlyRate,shift,pin,startDate,shopFloorLogin,department,createdBy) VALUES (?, ?, ?,?,?,?,?,?,?,?)",
//         [
//           firstName.trim(),
//           lastName.trim(),
//           fullName.trim(),
//           hourlyRate.trim(),
//           shift.trim(),
//           pin.trim(),
//           startDate.trim(),
//           shopFloorLogin.trim(),
//           department.trim(),
//           userId,
//         ]
//       )
//       .then();
//     return res.status(201).json({
//       message: "New employee created successfully !",
//     });
//   } catch (error) {
//     return res.status(500).send({
//       message: "Something went wrong . please try again later .",
//     });
//   }
// };

// const employeeDetail = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const connection = await pool.getConnection();
//     const [data] = await connection.query(
//       `SELECT * FROM employee
//        WHERE id = ?
//        AND isDeleted = FALSE`,
//       id
//     );
//     if (data.length === 0) {
//       return res.status(404).json({
//         message: "This employee not found or may be deleted .",
//       });
//     }

//     return res.status(200).json({
//       message: "Employee detail retrived successfully !",
//       data: data[0],
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
//     const {
//       firstName,
//       lastName,
//       fullName,
//       hourlyRate,
//       shift,
//       pin,
//       startDate,
//       shopFloorLogin,
//     } = req.body;

//     const connection = await pool.getConnection();
//     connection
//       .query(
//         `UPDATE employee
//        SET firstName = ?,
//            lastName = ?,
//            fullName = ?,
//            hourlyRate = ?,
//            shift = ?,
//            pin = ?,
//            startDate = ?,
//            shopFloorLogin = ?
//        WHERE id = ?`,
//         [
//           firstName.trim(),
//           lastName.trim(),
//           fullName.trim(),
//           hourlyRate.trim(),
//           shift.trim(),
//           pin.trim(),
//           startDate.trim(),
//           shopFloorLogin.trim(),
//           id,
//         ]
//       )
//       .then();
//     return res.status(200).json({
//       message: "Employee information edit successfully !",
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: "Something went wrong . please try again later .",
//     });
//   }
// };

// const allEmployees = async (req, res) => {
//   try {
//     const { employeeStatus } = req.query;
//     const connection = await pool.getConnection();
//     const paginationData = await paginationQuery(req.query);
//     const { page, pageSize, skip } = paginationData;
//     let query = `SELECT * FROM employee WHERE isDeleted = FALSE`;
//     let countQuery = `SELECT COUNT(*) AS total FROM employee WHERE isDeleted = FALSE`;
//     const params = [];
//     const countParams = [];
//     if (employeeStatus) {
//       query += ` AND employeeStatus = ?`;
//       countQuery += ` AND employeeStatus = ?`;
//       params.push(employeeStatus);
//       countParams.push(employeeStatus);
//     }
//     query += ` LIMIT ? OFFSET ?`;
//     params.push(pageSize, skip);
//     const [data] = await connection.query(query, params);
//     const [countResult] = await connection.query(countQuery, countParams);
//     const totalCount = countResult[0]?.total || 0;
//     const paginationObj = {
//       page,
//       pageSize,
//       total: totalCount,
//     };
//     const getPagination = await pagination(paginationObj);
//     res.status(200).json({
//       message: "All employee list retrived successfully !",
//       data: data,
//       totalCount,
//       pagination: getPagination,
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Internal server error" });
//   } finally {
//     connection.release();
//   }
// };

// const allEmployees = async (req, res) => {
//   try {
//     // const { employeeStatus, search, department } = req.query;
//     // const paginationData = await paginationQuery(req.query);
//     // console.log('paginationDatapaginationData',paginationData);

//     // let condition = { isDeleted: false };

//     // if (employeeStatus) {
//     //   condition.employeeStatus = employeeStatus.trim();
//     // }

//     // if (search) {
//     //   condition.fullName = { $regex: search.trim(), $options: "i" };
//     // }
//     // if (department) {
//     //   condition.department = department.trim();
//     // }

//     // const [EmployeeData, totalCount] = await Promise.all([
//     //   Employee.find(condition, {
//     //     __v: 0,
//     //     updatedAt: 0,
//     //   })
//     //     .skip(paginationData.skip)
//     //     .limit(paginationData.pageSize)
//     //     .lean(true),
//     //   Employee.countDocuments(condition),
//     // ]);
//     // const paginationObj = {
//     //   page: paginationData.page,
//     //   pageSize: paginationData.pageSize,
//     //   total: totalCount,
//     // };
//     // const getPagination = await pagination(paginationObj);

//     // if (Employee.length) {
//     //   return res.status(200).send({
//     //     data: EmployeeData,
//     //     current: EmployeeData.length,
//     //     totalCount,
//     //     pagination: getPagination,
//     //     message: "All employees list retirved successfully!",
//     //   });
//     // }

//     //   const { employeeStatus, limit ,page} = req.query;
//     //   const connection = await pool.getConnection();
//     //   const paginationData = await paginationQuery(req.query);
//     //   console.log("paginationDatapaginationData", paginationData);

//     //   let query = `SELECT * FROM employee WHERE isDeleted = FALSE`;
//     //   let params = [];

//     //   if (employeeStatus) {
//     //     query += ` AND employeeStatus = ?`;
//     //     params.push(employeeStatus);
//     //   }

//     //   if (limit) {
//     //     query += ` LIMIT ?`;
//     //     params.push(Number(paginationData.pageSize));
//     //   }
//     //   query += ` OFFSET ?`;
//     //   params.push(Number(paginationData.skip));

//     //   const [data] = await connection.query(query, params);
//     //   const paginationObj = {
//     //     page: paginationData.page,
//     //     pageSize: paginationData.pageSize,
//     //     // total: totalCount,
//     //   };
//     //  console.log('paginationObjpaginationObj',paginationObj);

//     //   return res.status(200).json({
//     //     message: "All Employee list retrived successfully !",
//     //     data: data,
//     //   });

//     const { employeeStatus, limit, page } = req.query;
//     const connection = await pool.getConnection();

// try {
//   const paginationData = await paginationQuery(req.query);
//   const { page, pageSize, skip } = paginationData;
//   let query = `SELECT * FROM employee WHERE isDeleted = FALSE`;
//   let countQuery = `SELECT COUNT(*) AS total FROM employee WHERE isDeleted = FALSE`;

//   const params = [];
//   const countParams = [];
//   if (employeeStatus) {
//     query += ` AND employeeStatus = ?`;
//     countQuery += ` AND employeeStatus = ?`;
//     params.push(employeeStatus);
//     countParams.push(employeeStatus);
//   }
//   query += ` LIMIT ? OFFSET ?`;
//   params.push(pageSize, skip);

//   const [data] = await connection.query(query, params);
//   const [countResult] = await connection.query(countQuery, countParams);

//   const totalCount = countResult[0]?.total || 0;

//   const paginationObj = {
//     page,
//     pageSize,
//     total: totalCount,
//   };

//   const getPagination = await pagination(paginationObj);

//   res.json({ data, totalCount, pagination: getPagination });

// } catch (error) {
//   console.error(error);
//   res.status(500).json({ message: "Internal server error" });
// } finally {
//   connection.release(); // Always release connection
// }
//  catch (error) {
//       console.error(error);
//       res.status(500).json({ message: "Internal server error" });
//     } finally {
//       connection.release();
//     }
//   } catch (error) {
//     console.log("errorerror", error);

//     return res.status(500).send({
//       message: "Something went wrong . please try agian later.",
//     });
//   }
// };

// const allEmployees = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       pageSize = 10,
//       search = "",
//       department = "",
//       employeeStatus,
//     } = req.query;

//     const offset = (parseInt(page) - 1) * parseInt(pageSize);

//     let whereClause = "WHERE isDeleted = FALSE";
//     let queryParams = [];

//     // Search by fullName
//     if (search) {
//       whereClause += " AND fullName LIKE ?";
//       queryParams.push(`%${search.trim()}%`);
//     }

//     // Filter by department
//     if (department) {
//       whereClause += " AND department = ?";
//       queryParams.push(department.trim());
//     }

//     // Filter by employeeStatus (if you have such a column, otherwise ignore this part)
//     if (employeeStatus) {
//       whereClause += " AND employeeStatus = ?";
//       queryParams.push(employeeStatus.trim());
//     }

//     const connection = await pool.getConnection();

//     // Get paginated data
//     const [data] = await connection.query(
//       `SELECT * FROM employee ${whereClause} LIMIT ? OFFSET ?`,
//       [...queryParams, parseInt(pageSize), offset]
//     );

//     // Get total count
//     const [[{ totalCount }]] = await connection.query(
//       `SELECT COUNT(*) as totalCount FROM employee ${whereClause}`,
//       queryParams
//     );

//     connection.release();

//     return res.status(200).json({
//       message: "All Employee list retrieved successfully!",
//       data,
//       current: data.length,
//       totalCount,
//       pagination: {
//         page: parseInt(page),
//         pageSize: parseInt(pageSize),
//         totalPages: Math.ceil(totalCount / pageSize),
//       },
//     });
//   } catch (error) {
//     console.log("errorerror", error);
//     return res.status(500).send({
//       message: "Something went wrong. Please try again later.",
//     });
//   }
// };

// const changeEmployeeStatus = async (req, res) => {
//   try {
//     const { employeeStatus } = req.body;
//     const { id } = req.params;
//     const connection = await pool.getConnection();
//     const [employeeStatusExists] = await connection.query(
//       ` SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
//       WHERE TABLE_NAME = 'employee' AND COLUMN_NAME = 'employeeStatus'`
//     );
//     if (employeeStatusExists.length === 0) {
//       await connection.query(
//         `ALTER TABLE employee ADD COLUMN employeeStatus VARCHAR(100) DEFAULT 'pending'`
//       );
//     }
//     connection
//       .query(
//         `UPDATE employee SET employeeStatus = ? WHERE id = ? AND isDeleted = FALSE`,
//         [employeeStatus.toLowerCase(), id]
//       )
//       .then();
//     return res.status(201).json({
//       message: `Employee status ${employeeStatus} .`,
//     });
//   } catch (error) {
//     res
//       .status(500)
//       .send({ message: "Something went wrong . please try again later ." });
//   }
// };

// const vacationApprovel = async (req, res) => {
//   try {
//     const { id } = req.params;
//     let connection;
//     connection = await pool.getConnection();
//     const [employee] = await connection.query(
//       `SELECT isDeleted FROM employee WHERE id = ?`,
//       [id]
//     );
//     if (employee[0].isDeleted) {
//       return res.status(400).json({ message: "Employee has been deleted." });
//     }
//     const columnsToCheck = [
//       { name: "isApproved", definition: `VARCHAR(20) DEFAULT 'pending'` },
//       { name: "vacationStartDate", definition: "VARCHAR(20)" },
//       { name: "vacationEndDate", definition: "VARCHAR(20)" },
//       { name: "vacationNote", definition: "VARCHAR(255)" },
//       { name: "vacationHours", definition: "VARCHAR(20)" },
//     ];

//     for (const column of columnsToCheck) {
//       const [columnExists] = await connection.query(
//         `
//         SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
//         WHERE TABLE_NAME = 'employee' AND COLUMN_NAME = ?
//       `,
//         [column.name]
//       );

//       if (columnExists.length === 0) {
//         await connection.query(
//           `ALTER TABLE employee ADD COLUMN ${column.name} ${column.definition}`
//         );
//       }
//     }

//     const {
//       isApproved,
//       fullName,
//       vacationStartDate,
//       vacationEndDate,
//       vacationNote,
//       vacationHours,
//     } = req.body;
//     connection
//       .query(
//         `UPDATE employee
//        SET isApproved = ?,
//        fullName = ?,
//        vacationStartDate = ?,
//        vacationEndDate = ?,
//        vacationNote = ?,
//        vacationHours = ?
//        WHERE id = ? AND isDeleted = FALSE`,
//         [
//           isApproved.trim() === "yes" ? "approved" : "rejected",
//           fullName.trim(),
//           vacationStartDate.trim(),
//           vacationEndDate.trim(),
//           vacationNote.trim(),
//           vacationHours.trim(),
//           id,
//         ]
//       )
//       .then();
//     return res.status(200).json({
//       message: `Employee vacation request has been ${
//         isApproved === "yes" ? "Approved" : "Rejected"
//       }.`,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: "Something went wrong. Please try again later.",
//     });
//   } finally {
//     if (connection) connection.release();
//   }
// };

// const vacationApprovalList = async (req, res) => {
//   try {

//     const { isApproved } = req.query;
//     const connection = await pool.getConnection();
//     const paginationData = await paginationQuery(req.query);
//     const { page, pageSize, skip } = paginationData;
//     let query = `SELECT * FROM employee WHERE isDeleted = FALSE`;
//     let countQuery = `SELECT COUNT(*) AS total FROM employee WHERE isDeleted = FALSE`;
//     const params = [];
//     const countParams = [];
//     if (isApproved) {
//       query += ` AND isApproved = ?`;
//       countQuery += ` AND isApproved = ?`;
//       params.push(isApproved);
//       countParams.push(isApproved);
//     }
//     query += ` LIMIT ? OFFSET ?`;
//     params.push(pageSize, skip);
//     const [data] = await connection.query(query, params);
//     const [countResult] = await connection.query(countQuery, countParams);
//     const totalCount = countResult[0]?.total || 0;
//     const paginationObj = {
//       page,
//       pageSize,
//       total: totalCount,
//     };
//     const getPagination = await pagination(paginationObj);
//     res.status(200).json({
//       message: "All employee vacation list retrived successfully !",
//       data: data,
//       totalCount,
//       pagination: getPagination,
//     });
//   } catch (error) {
//     return res
//       .status(500)
//       .send({ message: "Something went wrong . please try again later ." });
//   }
// };

// const updateEmployeeTimeClock = async (req, res) => {
//   try {
//     const { id } = req.params;
//     let connection;
//     connection = await pool.getConnection();
//     const [employee] = await connection.query(
//       `SELECT isDeleted FROM employee WHERE id = ?`,
//       [id]
//     );
//     if (employee[0].isDeleted) {
//       return res.status(400).json({ message: "Employee has been deleted." });
//     }
//     const columnsToCheck = [
//       { name: "employeeLunchInDate", definition: `VARCHAR(255) ` },
//       { name: "employeeLunchInTime", definition: "VARCHAR(255)" },
//       { name: "employeeLunchEndDate", definition: "VARCHAR(255)" },
//       { name: "employeeLunchEndTime", definition: "VARCHAR(255)" },
//       { name: "employeeExceptionEndDate", definition: "VARCHAR(255)" },
//       { name: "employeeExceptionInTime", definition: "VARCHAR(255)" },
//       { name: "employeeExceptionEndDate", definition: "VARCHAR(255)" },
//       { name: "employeeExceptionEndTime", definition: "VARCHAR(255)" },
//     ];

//     for (const column of columnsToCheck) {
//       const [columnExists] = await connection.query(
//         `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
//         WHERE TABLE_NAME = 'employee' AND COLUMN_NAME = ?`,
//         [column.name]
//       );

//       if (columnExists.length === 0) {
//         await connection.query(
//           `ALTER TABLE employee ADD COLUMN ${column.name} ${column.definition}`
//         );
//       }
//     }
//     const {
//       employeeLunchInDate,
//       employeeLunchInTime,
//       employeeLunchEndDate,
//       employeeLunchEndTime,
//       employeeExceptionInTime,
//       employeeExceptionEndDate,
//       employeeExceptionEndTime,
//     } = req.body;
//     connection
//       .query(
//         `UPDATE employee
//        SET employeeLunchInDate = ?,
//        employeeLunchInTime = ?,
//        employeeLunchEndDate = ?,
//        employeeLunchEndTime = ?,
//        employeeExceptionInTime = ?,
//        employeeExceptionEndDate = ?,
//        employeeExceptionEndTime = ?
//        WHERE id = ? AND isDeleted = FALSE`,
//         [
//           employeeLunchInDate.trim(),
//           employeeLunchInTime.trim(),
//           employeeLunchEndDate.trim(),
//           employeeLunchEndTime.trim(),
//           employeeExceptionInTime.trim(),
//           employeeExceptionEndDate.trim(),
//           employeeExceptionEndTime.trim(),
//           id,
//         ]
//       )
//       .then();

//     return res.status(201).json({
//       message: "Employee clock detail update successfully!",
//     });
//   } catch (error) {
//     return res.status(500).send({
//       message: "Something went wrong . please try again later .",
//     });
//   }
// };

// const allEmployeeTimeClockList = async (req, res) => {
//   try {
//     const paginationData = paginationQuery(req.query);
//     const connection = await pool.getConnection();
//     const [[processData], [totalCounts]] = await Promise.all([
//       connection.query(
//         `SELECT * FROM  employee WHERE  isDeleted = FALSE LIMIT ${Number(
//           paginationData.pageSize
//         )} OFFSET ${Number(paginationData.skip)} `
//       ),
//       connection.query(
//         `SELECT COUNT(*) AS totalCount FROM employee WHERE isDeleted = FALSE; `
//       ),
//     ]);
//     const paginationObj = {
//       page: paginationData.page,
//       pageSize: paginationData.pageSize,
//       total: totalCounts[0].totalCount,
//     };
//     const getPagination = await pagination(paginationObj);
//     return res.status(200).json({
//       message: "All employee time clock list retrived successfully !",
//       processData: processData,
//       totalCount: totalCounts[0].totalCount,
//       pagination: getPagination,
//     });
//     // const connection = await pool.getConnection();
//     // const paginationData = await paginationQuery(req.query);
//     // const { page, pageSize, skip } = paginationData;
//     // let query = `SELECT * FROM employee WHERE isDeleted = FALSE`;
//     // let countQuery = `SELECT COUNT(*) AS total FROM employee WHERE isDeleted = FALSE`;
//     // const params = [];
//     // params.push(pageSize, skip);
//     // const [data] = await connection.query(query, params);
//     // const [countResult] = await connection.query(countQuery);
//     // const totalCount = countResult[0]?.total || 0;
//     // const paginationObj = {
//     //   page,
//     //   pageSize,
//     //   total: totalCount,
//     // };
//     // const getPagination = await pagination(paginationObj);
//     // res.status(200).json({
//     //   message: "All employee time clock list retrived successfully !",
//     //   data: data,
//     //   totalCount,
//     //   pagination: getPagination,
//     // });
//   } catch (error) {
//     return res.status(500).send({
//       message: "Something went wrong . please try again later .",
//     });
//   }
// };

const selectProcessProcess = async (req, res) => {
  try {
    await createTable("work", [
      { name: "id", type: "INT PRIMARY KEY AUTO_INCREMENT" },
      { name: "process", type: "VARCHAR(255)" },
      { name: "product", type: "VARCHAR(255)" },
      { name: "instructionId", type: "VARCHAR(255)" },
      { name: "part", type: "VARCHAR(255)" },
      { name: "stepNumber", type: "INT" },
      { name: "workInstruction", type: "VARCHAR(255)" },
      { name: "createdBy", type: "VARCHAR(255)" },
    ]);
    const { process, product } = req.body;
    const { id } = req.user;
    const instructionId = uuidv4();
    console.log("instructionIdinstructionId", instructionId);
    const connection = await pool.getConnection();
    await connection.query(
      `INSERT INTO work 
        (process,product,instructionId,createdBy)
       VALUES (?,?,?,?)`,
      [
        process?.trim(),
        product?.trim(),
        instructionId?.trim(),
        // imageWorkInstruction,
        // videoWorkInstruction,
        id,
      ]
    );
    return res.status(201).json({
      message: "You have successfully process and product successfully !",
      data:instructionId
    });
  } catch (error) {
    console.log("errorerrorerror", error);
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const workInstruction = async (req, res) => {
  try {
    await createTable("work", [
      { name: "id", type: "INT PRIMARY KEY AUTO_INCREMENT" },
      { name: "part", type: "VARCHAR(255)" },
      { name: "stepNumber", type: "INT" },
      { name: "workInstruction", type: "VARCHAR(255)" },
      { name: "createdBy", type: "VARCHAR(255)" },
    ]);

    const { part, stepNumber, workInstruction, step ,instructionId} = req.body;
    const userId = req.user.id;

    console.log('instructionId',instructionId)
    const stepValue = parseInt(step);

    if (![1, 2, 3, 4].includes(stepValue)) {
      return res.status(400).json({ message: "Invalid step" });
    }

    const connection = await pool.getConnection();

    // Image and Video (optional uploads)
    // const imageWorkInstruction = req.files?.imageWorkInstruction?.[0]?.filename || null;
    // const videoWorkInstruction = req.files?.videoWorkInstruction?.[0]?.filename || null;

    // Check if same step already exists

    // const [existing] = await connection.query(
    //   `SELECT * FROM work WHERE id = ? AND isDeleted = FALSE`,
    //   [instructionId]
    // );

    // console.log('existingexistingexisting',existing)

    // if (existing.length > 0) {
    //   return res.status(400).json({
    //     message: `Step ${stepNumber} already exists for part ${part}`,
    //   });
    // }

    // Insert new step
      connection
      .query(
        `UPDATE work 
      SET part = ?, 
      workInstruction = ?, 
      createdBy = ?
      WHERE instructionId = ? AND isDeleted = FALSE`,
        [part, workInstruction,  instructionId]
      )
      .then();
    await connection.query(
      `INSERT INTO work 
        (part, workInstruction,createdBy)
       VALUES (?,  ?, ?) WHERE id = ?`,
      [
        part?.trim(),
        workInstruction?.trim() || null,
        // imageWorkInstruction,
        // videoWorkInstruction,
        userId,
      ]
    );

    return res.status(201).json({
      message: `Step ${stepNumber} for part '${part}' created successfully!`,
    });
  } catch (err) {
    console.error("Error in createWorkInstruction:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

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
      `SELECT * FROM work WHERE id = ? AND isDeleted = FALSE`,
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
    const id = req.params.id;
    const connection = await pool.getConnection();
    const { part, stepNumber, workInstruction } = req.body;
    connection
      .query(
        `UPDATE work 
        SET part = ?, 
        stepNumber = ?, 
        workInstruction = ?
        WHERE id = ? AND isDeleted = FALSE`,
        [part.trim(), stepNumber.trim(), workInstruction.trim(), id]
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
    return res.status(500).send({
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
  // supplierOrder,
};
