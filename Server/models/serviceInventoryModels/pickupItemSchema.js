const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const pickupItemSchema = new Schema(
  {
    servicePerson: {
      type: Schema.Types.ObjectId,
      ref: "ServicePerson",
      required: true,
    },
    servicePersonName: {
      type: String,
    },
    servicePerContact: {
      type: Number,
    },
    farmerName: {
      type: String,
    },
    farmerContact: {
      type: Number,
    },
    farmerVillage: {
      type: String,
    },
    farmerComplaintId: {  // Used for tracking complaints for the farmer
      type: Schema.Types.ObjectId,
      //default: null
    },
    farmerSaralId: { // Used For Saral ID
      type: String,
    },
    items: [
      {
        itemName: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
      },
    ],
    warehouse: {
      type: String,
      required: true,
    },
    serialNumber: {
      type: String,
      required: true
    },
    withoutRMU: {
      type: Boolean,
      default: null
    },
    rmuRemark: {
      type: String,
      default: "",
    },
    remark: {
      type: String,
    },
    status: {
      type: Boolean,
      default: null
    },
    itemResend: {
      type: Boolean,
      default: false,
    },
    incoming: {
      type: Boolean,
      default: null
    },
    approvedBy: {
      type: String,
      default: null
    },
    installationId: {
      type: Schema.Types.ObjectId,
      ref: "InstallationData"
    },
    installationDone: {
      type: Boolean,
      default: false
    },
    isNewStock: {
      type: Boolean,
      default: false
    },
    warehouseRemark: {
      type: String,
    },
    pickupDate: {
      type: Date,
      required: true,
    },
    arrivedDate: {
      type: Date,
    },
     declinedBy: {
      type: String
    },
    declineDate: {
      type: Date,
    },
    referenceType: {
      type: String,
      enum: ["ServicePerson", "SurveyPerson", "WarehousePerson"], // List of allowed models
    },
    itemSendBy: {
      type: Schema.Types.ObjectId,
      refPath: "referenceType",
    }
  },
  { collection: "inPickupItems" }
);

const PickupItem = mongoose.model("InPickupItem", pickupItemSchema);
module.exports = PickupItem;

