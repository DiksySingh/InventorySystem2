const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const outgoingItemsSchema = new Schema({
    fromWarehouse: {
        type: String,
        required: true
    },
    toServiceCenter: {
        type: String,
        required: true
    },
    items: [
        {
            itemName: {
                type: String,
                required: true
            },
            quantity: {
                type: Number,
                required: true
            },
            _id: false
        }
    ],
    sendingDate: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "WarehousePerson"
    },
}, {collection: "inOutgoingItems"});

const OutgoingItems = mongoose.model("OutgoingItems", outgoingItemsSchema);
module.exports = OutgoingItems;