const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendMail = async ({ to, subject, text, attachments }) => {
  return transporter.sendMail({
    from: `<${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    attachments,
  });
};

module.exports = sendMail;
