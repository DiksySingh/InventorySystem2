const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.PO_SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.PO_SMTP_USER, // system mail
    pass: process.env.PO_SMTP_PASS,
  },
});

const sendMail = async ({
  to,
  subject,
  text,
  html,
  attachments,
  senderName,     // 👤 person name
  replyTo,        // 👤 person email
  cc,
  bcc,
}) => {
  return transporter.sendMail({
    from: senderName
      ? `"${senderName}" <${process.env.SMTP_USER}>`
      : `<${process.env.SMTP_USER}>`,
    replyTo,       // replies go to person
    to,
    cc,
    bcc,
    subject,
    text,
    html,
    attachments,
  });
};

module.exports = sendMail;
