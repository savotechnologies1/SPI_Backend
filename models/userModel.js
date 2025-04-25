const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
    address: {
      type: String,
    },
    country: {
      type: String,
    },
    state: {
      type: String,
    },
    city: {
      type: String,
    },
    zipcode: {
      type: String,
    },
    about: {
      type: String,
    },
    password: {
      type: String,
    },
    roles: {
      type: String,
    },
    profileImage: {
      type: String,
    },
    token: {
      type: String,
    },
    tokens: {
      type: [String],
    },
    otp: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", adminSchema);
