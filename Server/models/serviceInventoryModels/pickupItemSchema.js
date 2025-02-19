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
      required: true,
    },
    servicePerContact: {
      type: Number,
      required: true
    },
    farmerName: {
      type: String,
    },
    farmerContact: { //Used For Saral ID
      type: Number,  
      required: true,
    },
    farmerVillage: {
      type: String,
    },
    farmerComplaintId: {
      type: String,
      required: true
    },
    farmerSaralId:{
      type:String,
      required:true
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
    pickupDate: {
      type: Date,
      required: true,
    },
    arrivedDate: {
      type: Date,
    },
  },
  { collection: "inPickupItems" }
);

const PickupItem = mongoose.model("InPickupItem", pickupItemSchema);
module.exports = PickupItem;

