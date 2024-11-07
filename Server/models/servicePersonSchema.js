const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const servicePersonSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true
    },
    contact: {
        type: Number,
        required: true,
        unique: true,
        validate: {
            validator: function(v) {
                // Regular expression to check for exactly 10 digits
                return /^[0-9]{10}$/.test(v);
            },
            message: props => `${props.value} is not a valid 10-digit phone number!`
        }
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        required: true,
        default: 'serviceperson'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    refreshToken: {
        type: String,
        default: null
    }
}, { collection: 'inServicePersons' });

const ServicePerson = mongoose.model("ServicePerson", servicePersonSchema);
module.exports = ServicePerson;