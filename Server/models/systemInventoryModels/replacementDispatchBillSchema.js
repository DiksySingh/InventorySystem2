const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const replacementDispatchBillPhotoSchema = new Schema(
  {
    replacementDispatchId: {
      type: Schema.Types.ObjectId,
      ref: "ReplacementDispatchDetails",
      required: true,
      unique: true, // 🔥 enforce one bill per dispatch
    },

    billPhoto: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "inReplacementDispatchBillPhotos",
  }
);

module.exports = mongoose.model(
  "ReplacementDispatchBillPhoto",
  replacementDispatchBillPhotoSchema
);
