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
      ref: "referenceType",
      required: true,
    },
    incoming: {
        type: Boolean,
    },
    itemsList: [
      {
        itemId: {
          type: Schema.Types.ObjectId,
          ref: "InstallationInventory"
        },
        quantity: {
          type: Number,
        },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
    },
  },
  { collection: "inEmpInstallationAccounts" }
);

const EmpInstallationAccount = mongoose.model(
  "EmpInstallationAccount",
  empInstallationItemAccount
);
module.exports = EmpInstallationAccount;