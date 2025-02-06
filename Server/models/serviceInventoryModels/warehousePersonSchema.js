const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcrypt");

const warehousePersonSchema = new Schema({
    name:{
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true
    },
    warehouse: {
        type: Schema.Types.ObjectId,
        ref: "Warehouse",
    },
    contact: {
        type: Number,
        required: true,
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: "warehouseAdmin"
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    refreshToken: {
        type: String,
        default: null,
      },
    },
    { collection: "inWarehousePersons" }
);

warehousePersonSchema.pre("save", async function(next) {
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

const WarehousePerson = mongoose.model("WarehousePerson", warehousePersonSchema);
module.exports = WarehousePerson;