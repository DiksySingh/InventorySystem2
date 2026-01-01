const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const materialDispatchLogSchema = new Schema(
  {
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    movementType: {
      type: String,
      enum: ["IN", "OUT"],
    },
    itemsList: [
      {
        systemItemId: {
          type: Schema.Types.ObjectId,
          ref: "SystemItem",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        _id: false,
      },
    ],
    state: {
      type: String,
    },
    partyName: {
        type: String,
        required: true
    },
    purpose: {
      type: String,
      enum: ["TESTING", "DEMO", "TEMPORARY"]
    },
    address: {
        type: String,
    },
    remarks: {
      type: String,
    },
    sendingDate: {
      type: Date,
    },
    receivingDate: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "WarehousePerson",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
    },
  },
  {
    collection: "inMaterialDispatchLogs",
  }
);

const MaterialDispatchLog = mongoose.model(
  "MaterialDispatchLog",
  materialDispatchLogSchema
);
module.exports = MaterialDispatchLog;
