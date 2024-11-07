const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const outgoingItemTotalSchema = new Schema(
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
  { collection: "inTotalOutgoingItemDetails" }
);

const OutgoingItemDetails = mongoose.model(
  "OutgoingItemDetails",
  outgoingItemTotalSchema
);
module.exports = OutgoingItemDetails;
