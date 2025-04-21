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
            }
        }
    ],
    defective: {
        type: Number,
        default: 0
    },
    sendingDate: {
        type: Date,
        default: Date.now
    }
}, {collection: "inOutgoingItems"});

const OutgoingItems = mongoose.model("OutgoingItems", outgoingItemsSchema);
module.exports = OutgoingItems;