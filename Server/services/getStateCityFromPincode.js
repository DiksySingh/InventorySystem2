const axios = require("axios");

const getStateCityFromPincode = async (pincode) => {
  if (!/^\d{6}$/.test(pincode)) {
    throw new Error("Invalid PIN code");
  }

  const url = `https://api.postalpincode.in/pincode/${pincode}`;
  const { data } = await axios.get(url);

  if (data[0].Status !== "Success") {
    return null;
  }

  const po = data[0].PostOffice[0];

  return {
    city: po.District,
    state: po.State
  };
};
module.exports = getStateCityFromPincode;
