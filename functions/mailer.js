// const nodemailer = require("nodemailer");
// const smtpTransport = require("nodemailer-smtp-transport");
// const prisma = require("../config/prisma");

// module.exports.sendMail = (templateName, mailVariables, email) => {
//   return new Promise(async function (resolve, reject) {
//     try {
//       const template = await prisma.mailTemplate.findUnique({
//         where: {
//           templateEvent: templateName,
//           isDeleted: false,
//           active: true,
//         },
//       });
//       let subject = template?.subject;
//       let html = template?.htmlBody;
//       let text = template?.textBody;

//       const transporter = nodemailer.createTransport(
//         smtpTransport({
//           pool: true,
//           host: "smtp.gmail.com",
//           port: 465,
//           auth: {
//             user: "shikhajatav23march@gmail.com",
//             pass: "aoal udqz ftky adur",
//           },
//           secure: true,
//           // tls: {
//           //   rejectUnauthorized: false,
//           // },
//         }),
//       );

//       for (let key in mailVariables) {
//         subject = subject?.replaceAll(key, mailVariables[key]);
//         html = html?.replaceAll(key, mailVariables[key]);
//         text = text?.replaceAll(key, mailVariables[key]);
//       }
//       const options = {
//         from: "shikhajatav23march@gmail.com",
//         to: email,
//         subject: subject,
//         text: text,
//         html: html,
//       };

//       transporter.sendMail(options, function (error) {
//         if (error) {
//           return reject(error);
//         }

//         return resolve({
//           type: "success",
//           message: "Mail successfully sent",
//         });
//       });
//     } catch (error) {
//       return reject(error);
//     }
//   });
// };


const nodemailer = require("nodemailer");
const prisma = require("../config/prisma");

module.exports.sendMail = async (templateName, mailVariables, email) => {
  try {
    const template = await prisma.mailTemplate.findUnique({
      where: {
        templateEvent: templateName,
        isDeleted: false,
        active: true,
      },
    });

    if (!template) throw new Error("Template not found.");

    let subject = template.subject;
    let html = template.htmlBody;
    let text = template.textBody;

    // Microsoft 365 / GoDaddy SMTP Configuration
    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com", // GoDaddy Microsoft 365 के लिए यही host होता है
      port: 587,
      secure: false, // TLS के लिए false रखें
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD , // अगर MFA चालू है तो यहाँ App Password डालें
      },
      tls: {
        ciphers: "SSLv3",
        rejectUnauthorized: false, // खुद के डोमेन सर्टिफिकेशन इशू से बचने के लिए
      },
    });

    // Variable replacement
    for (let key in mailVariables) {
      subject = subject?.replaceAll(key, mailVariables[key]);
      html = html?.replaceAll(key, mailVariables[key]);
      text = text?.replaceAll(key, mailVariables[key]);
    }

    const options = {
      from: `process.env.SMTP_EMAIL`, // प्रोफेशनल नाम के साथ
      to: email,
      subject: subject,
      text: text,
      html: html,
    };

    const info = await transporter.sendMail(options);
    
    return {
      type: "success",
      message: "Mail successfully sent",
      info: info.messageId
    };

  } catch (error) {
    console.error("Email Error:", error);
    throw error;
  }
};