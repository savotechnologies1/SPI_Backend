const md5 = require("md5");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { createTable, pool } = require("../config/dbConnection");
const { generateRandomOTP } = require("../functions/common");

const register = async (req, res) => {
  try {
    await createTable("users", [
      { name: "id", type: "CHAR(36) PRIMARY KEY DEFAULT (UUID())" },
      { name: "email", type: "VARCHAR(255)" },
      { name: "password", type: "VARCHAR(255)" },
      { name: "tokens", type: "JSON" },
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

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const connection = await pool.getConnection();

    const [data] = await connection.query(
      `SELECT * FROM users WHERE email = ? AND isDeleted = FALSE`,
      [email]
    );

    if (data.length === 0) {
      return res.status(404).send({
        message: "User not found.",
      });
    }

    const user = data[0];
    const hashedPassword = md5(password);

    if (user.password !== hashedPassword) {
      return res.status(401).send({
        message: "Invalid password.",
      });
    }

    const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "5d",
    });
    connection
      .query(
        `UPDATE users SET tokens = JSON_ARRAY_APPEND(COALESCE(tokens, JSON_ARRAY()), '$', ?)  WHERE email = ?`,
        [token, email]
      )
      .then();
    const [getData] = await connection.query(`SELECT * FROM users`);
    return res.status(200).json({
      message: "Login successful!",
      token,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
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
module.exports = { register, login, forgetPassword, validOtp };

