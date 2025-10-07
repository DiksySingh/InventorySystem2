const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const serialNumberHistorySchema = new Schema({
  farmerSaralId: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  },
  serialNumber: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  fieldType: {
    type: String,
    enum: ["panelNumber", "pumpNumber", "controllerNumber", "rmuNumber", "motorNumber"],
    required: true,
  },
  oldValue: {
    type: String,
    uppercase: true,
    trim: true,
  },
  newValue: {
    type: String,
    uppercase: true,
    trim: true,
  },
  state: {
    type: String,
  },
  changedBy: {
    type: String,
    required: true,
  },
  changedAt: {
    type: Date,
    default: Date.now,
  },
}, { collection: "inSerialNumberHistories" });

module.exports = mongoose.model("SerialNumberHistory", serialNumberHistorySchema);
