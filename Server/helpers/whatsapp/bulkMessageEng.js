const fs = require('fs');
const axios = require("axios");
const bulkMessage = async (contactNumber, message) => {
  const Token = process.env.WHATSAPP_TOKEN;
  const payload = {
    "to": contactNumber,
    "type": "template",
    "source": "external",
    "template": {
      "name": "service_8",
      "language": {
        "code": "en"
      },
      "components": [
        
        {
          "type": "body",
          "parameters": [
            {
              "type": "text",
              "text": "Galo Energy Pvt. Ltd."
            },
            {
              "type": "text",
              "text": message
            }
          ]
        }
      ]
    }
  }
  try {
    const whatsAppResponse = await axios.post(
      "https://wb.omni.tatatelebusiness.com/whatsapp-cloud/messages",
      payload,
      {
        headers :{
          Authorization : Token,
          "Content-Type" :"application/json",
        },
      }
    );
    return whatsAppResponse.data;
  } catch (error) {
    console.log("Error",error);
    return error 
  }
};

module.exports = bulkMessage;