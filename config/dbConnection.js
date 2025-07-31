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
          phoneNumber: "+911111111111",
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
