const nodemailer = require("nodemailer");

// const transporter = nodemailer.createTransport({
//   host: process.env.PO_SMTP_HOST,
//   port: 587,
//   secure: false,
//   auth: {
//     user: process.env.PO_SMTP_USER,
//     pass: process.env.PO_SMTP_PASS,
//   },
// });

const getTransporter = (companyName = "") => {
  const name = companyName.toLowerCase();

  let host, user, pass;

  if (name.includes("galo")) {
    host = process.env.GALO_PO_SMTP_HOST;
    user = process.env.GALO_PO_SMTP_USER;
    pass = process.env.GALO_PO_SMTP_PASS;
  } else {
    host = process.env.GAUTAM_PO_SMTP_HOST;
    user = process.env.GAUTAM_PO_SMTP_USER;
    pass = process.env.GAUTAM_PO_SMTP_PASS;
  }

  return nodemailer.createTransport({
    host,
    port: 587,
    secure: false,
    auth: { user, pass },
  });
};

const sendMail = async ({
  companyName,
  to,
  subject,
  text,
  html,
  attachments,
  senderName,
  replyTo,
  cc,
  bcc,
}) => {
  const transporter = getTransporter(companyName);
  return transporter.sendMail({
    from: senderName
      ? `"${senderName}" <${transporter.options.auth.user}>`
      : transporter.options.auth.user,
    replyTo,
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
