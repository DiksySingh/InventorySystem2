const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcrypt");

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      minLength: [8, "Password should atleast contain 8 characters"],
    },
    role: {
      type: String,
      default: "admin",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    refreshToken: {
      type: String,
      default: null,
    },
  },
  { collection: "inAdmins" }
);

userSchema.pre("save", async function(next) {
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

const Admin = mongoose.model("Admin", userSchema);
module.exports = Admin;