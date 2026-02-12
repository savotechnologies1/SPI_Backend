const md5 = require("md5");
const prisma = require("./prisma");
const { v4: uuidv4 } = require("uuid");
const connectDB = async () => {
  try {
    await prisma.$connect();
    const getId = uuidv4().slice(0, 6);
    const convertedPass = md5("Admin@123");
    const adminCount = await prisma.admin.count();
    if (adminCount === 0) {
      await prisma.admin.create({
        data: {
          id: getId,
          name: "Admin",
          email: "spiadmin@gmail.com",
          password: convertedPass,
          roles: "superAdmin",
          phoneNumber: "+9111117777",
        },
      });
    }
    const templateCount = await prisma.mailTemplate.count();
    if (templateCount === 0) {
      await prisma.mailTemplate.createMany({
        data: [
          {
            templateEvent: "otp-verify",
            subject: "SPI OTP Verification",
            mailVariables: "%otp%",
            htmlBody: `<!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>OTP Verification</title>
              </head>
              <body style="font-family: Arial, sans-serif; background-color: #f4f7fc; margin: 0; padding: 0;">
                <div style="width: 100%; max-width: 600px; margin: 40px auto; background-color: #ffffff; padding: 30px 0px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); text-align: center;">
                  <h1 style="font-size: 28px; color: #2c3e50; margin-bottom: 20px">Verify Your Identity</h1>
                  <p style="font-size: 16px; color: #7f8c8d; line-height: 1.8">Hello,</p>
                  <p style="font-size: 16px; color: #7f8c8d; line-height: 1.8">Your One-Time Password (OTP) for verification is:</p>
                  
                  <div style="font-size: 40px; font-weight: bold; color: #052C89; margin: 30px 0; background-color: #f1f8ff; padding: 10px 30px; border-radius: 5px; display: inline-block;">%otp%</div>
                  
                  <p style="font-size: 16px; color: #7f8c8d; line-height: 1.8">Please use this OTP to complete your verification.</p>
                  <div style="margin-top: 40px; font-size: 14px; color: #bdc3c7; border-top: 1px solid #f1f1f1; padding-top: 20px;">
                    <p style="margin: 0">© SPI. All rights reserved.</p>
                  </div>
                </div>
              </body>
            </html>`,
            textBody: "Your SPI Verification code is %otp%",
          },
          {
            templateEvent: "account-created",
            subject: "Your Account has been Created",
            mailVariables: "%email%, %password%",
            htmlBody: `<!DOCTYPE html>
                      <html lang="en">
                        <head>
                          <meta charset="UTF-8" />
                          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                          <title>Account Created</title>
                        </head>
                        <body style="font-family: Arial, sans-serif; background-color: #f4f7fc; margin: 0; padding: 0;">
                          <div style="width: 100%; max-width: 600px; margin: 40px auto; background-color: #ffffff; padding: 30px 0px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); text-align: center;">
                            <h1 style="font-size: 28px; color: #2c3e50; margin-bottom: 20px">Welcome to SPI !</h1>
                            <p style="font-size: 16px; color: #7f8c8d; line-height: 1.8">Hello,</p>
                            <p style="font-size: 16px; color: #7f8c8d; line-height: 1.8">Your account has been successfully created.</p>
                            <p style="font-size: 16px; color: #2c3e50; font-weight: bold; margin-top: 30px;">Account Details:</p>
                            <div style="font-size: 16px; color: #34495e; margin-top: 10px;">
                              <p style="margin: 10px 0;"><strong>Email:</strong> %email%</p>
                              <p style="margin: 10px 0;"><strong>Password:</strong> %password%</p>
                            </div>
                            <p style="font-size: 16px; color: #7f8c8d; margin-top: 30px;">You can now log in using the credentials above.</p>
                            <div style="margin-top: 40px; font-size: 14px; color: #bdc3c7; border-top: 1px solid #f1f1f1; padding-top: 20px;">
                              <p style="margin: 0">&copy; SPI. All rights reserved.</p>
                            </div>
                          </div>
                        </body>
                      </html>`,
            textBody:
              "Your account is created with email: %email% and password: %password%",
          },
          {
            templateEvent: "send-order-to-the-supplier",
            subject: "Supplier Order Request",
            mailVariables: "%email%",
            htmlBody: `<!DOCTYPE html>
              <html lang="en">
                <head>
                  <meta charset="UTF-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                  <title>Supplier Order Email</title>
                </head>
                <body style="font-family: Arial, sans-serif; background-color: #f5f7fa; margin: 0; padding: 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 20px 0 ;  margin: auto;">
                    <tr>
                      <td style="text-align: center">
                        <table width="700" cellpadding="0" cellspacing="0" style="max-width: 700px; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);">
                          <tr>
                            <td style="background: #052c89; color: #ffffff; padding: 20px; text-align: center;">
                              <h1 style="margin: 0; font-size: 22px; color: #ffffff">Supplier Order Request</h1>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 30px 20px; color: #333">
                              <p style="font-size: 16px; line-height: 1.5">
                                Dear <strong>{{supplier_name}}</strong>,
                              </p>
                              <p style="font-size: 16px; line-height: 1.5">
                                We would like to place the following order with you.
                              </p>
                              <h2 style="font-size: 18px; margin-top: 25px; margin-bottom: 10px">Order Details</h2>
                              <table width="100%" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                                <tr>
                                  <th style="padding: 12px; border: 1px solid #ddd; text-align: left; font-size: 14px; background: #f0f2f7;">Order Number</th>
                                  <td style="padding: 12px; border: 1px solid #ddd; text-align: left; font-size: 14px;">{{order_number}}</td>
                                </tr>
                                <tr>
                                  <th style="padding: 12px; border: 1px solid #ddd; text-align: left; font-size: 14px; background: #f0f2f7;">Order Date</th>
                                  <td style="padding: 12px; border: 1px solid #ddd; text-align: left; font-size: 14px;">{{order_date}}</td>
                                </tr>
                                <tr>
                                  <th style="padding: 12px; border: 1px solid #ddd; text-align: left; font-size: 14px; background: #f0f2f7;">Part Name</th>
                                  <td style="padding: 12px; border: 1px solid #ddd; text-align: left; font-size: 14px;">{{part_name}}</td>
                                </tr>
                                <tr>
                                  <th style="padding: 12px; border: 1px solid #ddd; text-align: left; font-size: 14px; background: #f0f2f7;">Quantity</th>
                                  <td style="padding: 12px; border: 1px solid #ddd; text-align: left; font-size: 14px;">{{quantity}}</td>
                                </tr>
                                <tr>
                                  <th style="padding: 12px; border: 1px solid #ddd; text-align: left; font-size: 14px; background: #f0f2f7;">Cost</th>
                                  <td style="padding: 12px; border: 1px solid #ddd; text-align: left; font-size: 14px;">{{cost}}</td>
                                </tr>
                                <tr>
                                  <th style="padding: 12px; border: 1px solid #ddd; text-align: left; font-size: 14px; background: #f0f2f7;">Need Date</th>
                                  <td style="padding: 12px; border: 1px solid #ddd; text-align: left; font-size: 14px;">{{need_date}}</td>
                                </tr>
                              </table>

                              <p style="font-size: 16px; line-height: 1.5; margin-top: 25px">If you have any questions, please feel free to contact us.</p>
                              <p style="font-size: 16px; line-height: 1.5">Thank you,<br /><strong>SPI Team</strong></p>
                            </td>
                          </tr>
                          <tr>
                            <td style="background: #f9f9f9; text-align: center; padding: 15px; font-size: 12px; color: #777;">
                            &copy; SPI. All rights reserved.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
              </html>
              `,
            textBody:
              "Your account is created with email: %email% and password: %password%",
          },
          {
            templateEvent: "send-employee-vacation-req-status",
            subject: "Employe Vacation Request Status",
            mailVariables: "%status%",
            htmlBody: `<!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Vacation Request Status</title>
            </head>
            <body
              style="
                font-family: 'Segoe UI', Arial, sans-serif;
                background-color: #f5f7fa;
                margin: 0;
                padding: 20px;
                color: #333;
              "
            >
              <div
                style="
                  max-width: 600px;
                  margin: 0 auto;
                  background-color: #ffffff;
                  border-radius: 8px;
                  overflow: hidden;
                  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
                "
              >
                <div
                  style="
                    background: linear-gradient(135deg, #3498db, #2c3e50);
                    padding: 25px;
                    text-align: center;
                    color: white;
                  "
                >
                  <h1 style="margin: 0; font-size: 28px">Vacation Request</h1>
                  <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9">
                    Request Status Update
                  </p>
                </div>
                <div style="padding: 30px">
                  <p style="margin: 0 0 15px; font-size: 16px; line-height: 1.5">
                    Hello <strong>%name%</strong>,
                  </p>

                  <p style="margin: 0 0 25px; font-size: 16px; line-height: 1.5">
                    Your vacation request has been reviewed and processed.
                  </p>

                  <div
                    style="
                      text-align: center;
                      margin: 25px 0;
                      padding: 15px;
                      border-radius: 8px;
                      font-size: 20px;
                      font-weight: 600;
                      background-color: %statusBgColor%;
                      color: %statusColor%;
                      border: 2px solid %statusColor%;
                    "
                  >
                    %statusMessage%
                  </div>
                </div>
                <div
                  style="
                    background-color: #f8f9fa;
                    padding: 20px;
                    text-align: center;
                    border-top: 1px solid #eaeaea;
                    font-size: 14px;
                    color: #7f8c8d;
                  "
                >
                  <p style="margin: 0 0 10px">© 2025 SPI. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>`,

            textBody:
              "Your account is created with email: %email% and password: %password%",
          },
        ],
        skipDuplicates: true,
      });
    }
  } catch (error) {
    console.error(" Database connection error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
