const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const servicePersonOrderDetails = new Schema(
  {
    servicePerson: {
      type: Schema.Types.ObjectId,
      ref: "ServicePerson",
      required: true,
    },
    items: [
      {
        itemName: {
          type: String,
        },
        quantity: {
          type: Number,
        },
      },
    ],
  },
  { collection: "inTotalIncomingItemsDetails" }
);

const IncomingItemDetails = mongoose.model(
  "IncomingItemDetails",
  servicePersonOrderDetails
);
module.exports = IncomingItemDetails;
