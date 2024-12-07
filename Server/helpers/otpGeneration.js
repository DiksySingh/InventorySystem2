const unirest = require("unirest")

const sendOtp = async (phoneNumber, otp) => {
  var req = unirest("POST", "https://www.fast2sms.com/dev/bulkV2");

  req.headers({
    "authorization": process.env.FAST2SMS_API_KEY
  });

  req.form({
    "variables_values": otp,
    "route": "otp",
    "numbers": phoneNumber,
  });

  req.end((response) => {
    if (response.error) {
      console.error("Error while sending OTP:", response.error);
      return { success: false, message: "Failed to send OTP" };
    }

    console.log("OTP sent response:", response.body);
    return { success: true, message: "OTP sent successfully", data: response.body };
  });
}

module.exports = sendOtp;