const mongoose = require("mongoose");
const md5 = require("md5");
const moment = require("moment");
const humanize = require("string-humanize");
const Admin = require("../models/adminModel");
const MailTemplates = require("../models/MailTemplatesModel");
mongoose.set("strictQuery", true);
const connectDb = async () => {
  try {
    const connect = await mongoose.connect(process.env.CONNECTION_STRING);
    console.log(
      "Database connected: ",
      connect.connection.host,
      connect.connection.name
    );

    const checkAdmin = await Admin.countDocuments({});
    if (!checkAdmin) {
      await Admin.create({
        name: humanize("admin"),
        // email: "sipadmin@gmail.com",
        password: md5("Admin@1234"),
        roles: "superAdmin",
        phone: "+911111111111",
        dob: moment(new Date("01/01/1998")).format(
          "YYYY-MM-DD[T00:00:00.000Z]"
        ),
      });
    }
    const template = await MailTemplates.countDocuments({});
    if (!template) {
      await MailTemplates.insertMany([
        {
          templateEvent: "forget-password-otp",
          subject: "SIP OTP Verification",
          mailVariables: "%otp%",
          htmlBody: `<!DOCTYPE html>
                    <html lang="en">
                      <head>
                        <meta charset="UTF-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                        <title>OTP Verification</title>
                      </head>
                      <body
                        style="
                          font-family: Arial, sans-serif;
                          background-color: #f4f7fc;
                          margin: 0;
                          padding: 0;
                        "
                      >
                        <div
                          style="
                            width: 100%;
                            max-width: 600px;
                            margin: 40px auto;
                            background-color: #ffffff;
                            padding: 30px 0px;
                            border-radius: 10px;
                            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                            text-align: center;
                          "
                        >
                          <h1 style="font-size: 28px; color: #2c3e50; margin-bottom: 20px">
                            Verify Your Identity
                          </h1>

                          <p style="font-size: 16px; color: #7f8c8d; line-height: 1.8">Hello,</p>
                          <p style="font-size: 16px; color: #7f8c8d; line-height: 1.8">
                            Your One-Time Password (OTP) for verification is:
                          </p>

                          <div
                            style="
                              font-size: 40px;
                              font-weight: bold;
                              color: #052c89;
                              margin: 30px 0;
                              background-color: #f1f8ff;
                              padding: 10px 30px;
                              border-radius: 5px;
                              display: inline-block;
                            "
                          >
                            %otp%
                          </div>

                          <p style="font-size: 16px; color: #7f8c8d; line-height: 1.8">
                            Please use this OTP to complete your verification.
                          </p>

                          <div
                            style="
                              margin-top: 40px;
                              font-size: 14px;
                              color: #bdc3c7;
                              border-top: 1px solid #f1f1f1;
                              padding-top: 20px;
                            "
                          >
                            <p style="margin: 0">© SIP. All rights reserved.</p>
                            <p style="margin: 5px 0">
                              Need more help? Contact us at
                              <a href="Sip@gmail.com" style="color: #052c89; text-decoration: none"
                                >sip@gmail.com</a
                              >
                            </p>
                          </div>
                        </div>
                      </body>
                    </html>
                             `,
          textBody: "Your Otp Verfication Information.",
        },
      ]);
    }
  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1);
  }
};

module.exports = connectDb;
