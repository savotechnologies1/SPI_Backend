
const nodemailer = require("nodemailer");
const smtpTransport = require("nodemailer-smtp-transport");
const prisma = require("../config/prisma");
module.exports.sendMail = (templateName, mailVariables, email) => {
  console.log('mailVariables',mailVariables)
  return new Promise(async function (resolve, reject) {
    try {
      const template = await prisma.mailTemplate.findFirst({
        where: {
          templateEvent: templateName,
          isDeleted: false,
          active: true,
        },
      });

      if (!template) {
        return reject(new Error("Mail template not found"));
      }

      let subject = template?.subject || "";
      let html = template?.htmlBody || "";
      let text = template?.textBody || "";

      const transporter = nodemailer.createTransport({
        host: "smtp.office365.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
      for (let key in mailVariables) {
        subject = subject.replaceAll(key, mailVariables[key]);
        html = html.replaceAll(key, mailVariables[key]);
        text = text.replaceAll(key, mailVariables[key]);
      }

      const cleanHtml = html.replace(/\r/g, "").replace(/\n/g, "");
      const options = {
        from: `"${process.env.SMTP_EMAIL}" <${process.env.SMTP_EMAIL}>`,
        to: email,
        subject: subject,
        text: text,
        html: cleanHtml,
      };

      const info = await transporter.sendMail(options);
      console.log("Email sent successfully:", info.messageId);
      resolve({ type: "success", message: "Mail successfully sent" });

    } catch (error) {
      console.error("SMTP Error:", error);
      reject(error);
    }
  });
};

