const nodemailer = require("nodemailer");
const MailTemplate = require("../models/MailTemplatesModel");
require("dotenv").config();

module.exports.sendMail = async (templateName, mailVariable, email) => {
  try {
    const template = await MailTemplate.findOne({
      templateEvent: templateName,
      isDeleted: false,
      active: true,
    }).lean();

    if (!template) {
      throw new Error(`No active template found for event: ${templateName}`);
    }

    let { subject, htmlBody: html, textBody: text } = template;

    const transporter = nodemailer.createTransport({
      pool: true, 
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "shikhajatav23march@gmail.com",
        pass: "hyvp wtwy xvir ogoh",
        // user :"hireute61@gmail.com",
        // pass: "gtlu tynu zxov iirc",
      },  
    });

    for (const [key, value] of Object.entries(mailVariable)) {
      const placeholder = new RegExp(key, "g");
      subject = subject?.replace(placeholder, value);
      html = html?.replace(placeholder, value);
      text = text?.replace(placeholder, value);
    }

    const mailOptions = {
      from: "shikhajatav23march@gmail.com",
      to: email,
      subject: subject || "No Subject",
      text: text || "", 
      html: html || "", 
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      type: "success",
      message: "Mail successfully sent",
    };
  } catch (error) {
    throw error;
  }
};
