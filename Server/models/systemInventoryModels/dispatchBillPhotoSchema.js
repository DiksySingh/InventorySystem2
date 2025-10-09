const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const dispatchBillPhotoSchema = new Schema(
  {
    dispatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DispatchDetails",
      required: true,
    },
    farmerActivityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FarmerItemsActivity",
      required: true,
    },
    billPhoto: {
      type: String,
      required: true,
    },
  },
  { timestamps: true, collection: "inDispatchBillPhotos" }
);

module.exports = mongoose.model("DispatchBillPhoto", dispatchBillPhotoSchema);
