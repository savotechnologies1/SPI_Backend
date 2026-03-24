const nodemailer = require("nodemailer");
const smtpTransport = require("nodemailer-smtp-transport");
const prisma = require("../config/prisma");

module.exports.sendMail = (templateName, mailVariables, email) => {
  console.log("process.env.SMTP_PASSWORD", process.env);
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

      let subject = template?.subject;
      let html = template?.htmlBody;
      let text = template?.textBody;
      const transporter = nodemailer.createTransport(
        smtpTransport({
          pool: true,
          host: "smtpout.secureserver.net",
          port: 465,
          secure: true,
          auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
          },
        }),
      );

      for (let key in mailVariables) {
        subject = subject?.replaceAll(key, mailVariables[key]);
        html = html?.replaceAll(key, mailVariables[key]);
        text = text?.replaceAll(key, mailVariables[key]);
      }
      const cleanHtml = html.replace(/\r/g, "").replace(/\n/g, "");
      const options = {
        from: process.env.SMTP_EMAIL,
        to: email,
        subject: subject,
        text: text,
        html: cleanHtml,
      };

      transporter.sendMail(options, function (error) {
        if (error) {
          return reject(error);
        }

        return resolve({
          type: "success",
          message: "Mail successfully sent",
        });
      });
    } catch (error) {
      return reject(error);
    }
  });
};
