const mongoose = require("mongoose");

const EmployeeModel = new mongoose.Schema(
  {
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    fullName: {
      type: String,
    },
    hourlyRate: {
      type: String,
    },
    shift: {
      type: String,
    },
    pin: {
      type: String,
    },
    startDate:{
     type: String,
    },
    shopFloorLogin:{
     type: String,
    },
    vacationStartDate:{
      type:String
    },
    vacationEndDate:{
      type:String
    },
    vacationHours:{
      type:String
    }, 
    vacationNote:{
      type:String
    },
    vacationStatus:{
     type:String
    },
    roles: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
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

module.exports = mongoose.model("employee", EmployeeModel);
