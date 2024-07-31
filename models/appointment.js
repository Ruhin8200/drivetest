const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const appointmentSchema = new Schema({
  date: { type: String, required: true },
  time: { type: String, required: true },
  isTimeSlotAvailable: { type: Boolean, default: true },
  user: { type: Schema.Types.ObjectId, ref: "User" },
  testType: { type: String, enum: ["G", "G2"], required: true },
});

const Appointment = mongoose.model("Appointment", appointmentSchema);
module.exports = Appointment;
