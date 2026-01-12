const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const farmerReplacementItemsActivitySchema = new Schema({
    warehouseId: {
        type: Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true,
    },
    farmerSaralId: {
        type: String,
        required: true,
    },
    movementType: {
        type: String,
        enum: ['Defective', 'Replacement', 'OK_RETURNED']
    },
    // 🔁 Unified item list
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
}, {
    collection: "inFarmerReplacementItemsActivities",
});

const FarmerReplacementItemsActivity =
    mongoose.model("FarmerReplacementItemsActivity", farmerReplacementItemsActivitySchema);

module.exports = FarmerReplacementItemsActivity;
