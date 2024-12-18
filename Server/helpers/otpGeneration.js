const unirest = require("unirest");

const sendOtp = (phoneNumber, otp) => {
  return new Promise((resolve, reject) => {
    const req = unirest("POST", "https://www.fast2sms.com/dev/bulkV2");

    req.headers({
      authorization: process.env.FAST2SMS_API_KEY,
    });

    req.form({
      variables_values: otp,
      route: "otp",
      numbers: phoneNumber,
    });

    req.end((response) => {
      console.log("Response Status:", response.status);
      console.log("Response Body:", response.body);
      if (response.error) {
        console.error("Error while sending OTP:", response.error);
        reject({ success: false, message: "Failed to send OTP", error: response.error });
      } else {
        console.log("OTP sent response:", response.body);
        resolve({ success: true, message: "OTP sent successfully", data: response.body });
      }
    });
  });
};

module.exports = sendOtp;

