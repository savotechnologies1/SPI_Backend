const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
    {
        userName:{
            type: String
        },
        phoneNumber:{
            type :String
        },
        firstName: { 
            type: String
        },
        lastName: {
            type: String
        },
        email: {
            type: String
        },
        otp: {
            type: String,
          },
        dob: {
            type: Date
        },
        password: {
            type: String
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        roles: {
            type: String,
        },
        isVerified: {
            type: Boolean,
            default: false
        },
        profileImage: {
            type: String
        },
        token: {
            type: String
        },
        tokens: {
            type: [String]
        },
        isDeleted:{
            type:Boolean,
            default:false
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Admin", adminSchema);