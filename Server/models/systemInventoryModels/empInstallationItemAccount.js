const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const empInstallationItemAccount = new Schema(
  {
    referenceType: {
        type: String,
        enum: ["ServicePerson", "SurveyPerson"],
        required: true
    },
    empId: {
      type: Schema.Types.ObjectId,
      refPath: "referenceType",
      required: true,
    },
    incoming: {
        type: Boolean,
    },
    itemsList: [
      {
        systemItemId: {
          type: Schema.Types.ObjectId,
          ref: "SystemItem",
        },
        quantity: {
          type: Number,
        },
        _id: false,
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      refPath: "referenceType", 
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      refPath: "referenceType",
    },
  },
  { collection: "inEmpInstallationAccounts" }
);

const EmpInstallationAccount = mongoose.model(
  "EmpInstallationAccount",
  empInstallationItemAccount
);
module.exports = EmpInstallationAccount;