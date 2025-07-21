const nodemailer = require("nodemailer");
const smtpTransport = require("nodemailer-smtp-transport");
const prisma = require("../config/prisma");

module.exports.sendMail = (templateName, mailVariables, email) => {
  return new Promise(async function (resolve, reject) {
    try {
      const template = await prisma.mailTemplate.findUnique({
        where: {
          templateEvent: templateName,
          isDeleted: false,
          active: true,
        },
      });
      let subject = template?.subject;
      let html = template?.htmlBody;
      let text = template?.textBody;

      const transporter = nodemailer.createTransport(
        smtpTransport({
          pool: true,
          host: "smtp.gmail.com",
          port: 465,
          auth: {
            user: "shikhajatav23march@gmail.com",
            pass: "aoal udqz ftky adur",
          },
          secure: true,
          // tls: {
          //   rejectUnauthorized: false,
          // },
        })
      );

      for (let key in mailVariables) {
        subject = subject?.replaceAll(key, mailVariables[key]);
        html = html?.replaceAll(key, mailVariables[key]);
        text = text?.replaceAll(key, mailVariables[key]);
      }
      const options = {
        from: "shikhajatav23march@gmail.com",
        to: email,
        subject: subject,
        text: text,
        html: html,
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
