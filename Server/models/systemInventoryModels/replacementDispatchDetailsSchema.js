const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const replacementDispatchDetailsSchema = new Schema({
    driverName: {
        type: String,
        required: true,
        trim: true,
    },

    driverContact: {
        type: String,
        required: true,
        trim: true,
        match: /^[0-9]{10}$/,
    },

    vehicleNumber: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
    },
    movementType: {
        type: String,
        enum: ['Replacement', 'Defective', 'OK_RETURNED']
    },
    dispatchedBy: {
        type: Schema.Types.ObjectId,
        ref: "WarehousePerson",
        required: true,
    },

    warehouseId: {
        type: Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true,
    },

    // 🔁 Link to replacement activity instead of normal activity
    dispatchedReplacementActivities: [
        {
            type: Schema.Types.ObjectId,
            ref: "FarmerReplacementItemsActivity",
        },
    ],
}, {
    timestamps: true,
    collection: "inReplacementDispatchDetails",
});

const ReplacementDispatchDetails = mongoose.model(
    "ReplacementDispatchDetails",
    replacementDispatchDetailsSchema
);

module.exports = ReplacementDispatchDetails;
