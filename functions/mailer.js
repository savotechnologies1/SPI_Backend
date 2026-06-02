
const nodemailer = require("nodemailer");
const smtpTransport = require("nodemailer-smtp-transport");
const prisma = require("../config/prisma");


 
// module.exports.sendMail = async (templateName, mailVariables, email) => {
//   try {
//     // Fetch template
//     const template = await prisma.mailTemplate.findFirst({
//       where: {
//         templateEvent: templateName,
//         isDeleted: false,
//         active: true,
//       },
//     });
 
//     if (!template) {
//       throw new Error("Mail template not found");
//     }
 
//     let subject = template.subject || "";
//     let html = template.htmlBody || "";
//     let text = template.textBody || "";
 
//     // Replace template variables
//     for (const key in mailVariables) {
//       subject = subject.replaceAll(key, mailVariables[key]);
//       html = html.replaceAll(key, mailVariables[key]);
//       text = text.replaceAll(key, mailVariables[key]);
//     }
 
//     // Outlook SMTP Configuration
//     const transporter = nodemailer.createTransport({
//       host: "smtp-mail.outlook.com",
//       port: 587,
//       secure: false,
//       auth: {
//         user: process.env.SMTP_EMAIL,
//         pass: process.env.SMTP_PASSWORD,
//       },
//       tls: {
//         ciphers: "SSLv3",
//       },
//     });
 
//     // Verify SMTP connection
//     await transporter.verify();
//     console.log("Outlook SMTP connected successfully");
 
//     // Mail options
//     const mailOptions = {
//       from: `"BHives" <${process.env.SMTP_EMAIL}>`,
//       to: email,
//       subject,
//       text,
//       html,
//     };
 
//     // Send email
//     const info = await transporter.sendMail(mailOptions);
 
//     console.log("Email sent successfully:", info.messageId);
 
//     return {
//       type: "success",
//       message: "Mail successfully sent",
//       messageId: info.messageId,
//     };
 
//   } catch (error) {
//     console.error("SMTP Error:", error);
 
//     return {
//       type: "error",
//       message: error.message || "Failed to send email",
//     };
//   }
// };


// const nodemailer = require("nodemailer");
// const smtpTransport = require("nodemailer-smtp-transport");
// const prisma = require("../config/prisma");

// module.exports.sendMail = (templateName, mailVariables, email) => {
//   console.log('templateNametemplateName',templateName,mailVariables,email)
//   return new Promise(async function (resolve, reject) {
//     try {
//       const template = await prisma.mailTemplate.findFirst({
//         where: {
//           templateEvent: templateName,
//           isDeleted: false,
//           active: true,
//         },
//       });

//       if (!template) {
//         return reject(new Error("Mail template not found"));
//       }
//       console.log(' process.env', process.env)

//       let subject = template?.subject;
//       let html = template?.htmlBody;
//       let text = template?.textBody;
//       const transporter = nodemailer.createTransport(
//         smtpTransport({
//           pool: true,
//           host: "smtp.office365.com",
//           port: 587,
//           secure: false,
//           auth: {
//             user: process.env.SMTP_EMAIL,
//             pass: process.env.SMTP_PASSWORD,
//           },
//         }),
//       );

//       for (let key in mailVariables) {
//         subject = subject?.replaceAll(key, mailVariables[key]);
//         html = html?.replaceAll(key, mailVariables[key]);
//         text = text?.replaceAll(key, mailVariables[key]);
//       }
//       const cleanHtml = html.replace(/\r/g, "").replace(/\n/g, "");
//       const options = {
//         from: process.env.SMTP_EMAIL,
//         to: email,
//         subject: subject,
//         text: text,
//         html: cleanHtml,
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
// ;

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
          // ciphers: "SSLv3",
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
