const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcrypt");

const CarDetailsSchema = new Schema({
  make: { type: String, default: "default" },
  model: { type: String, default: "default" },
  year: { type: Number, default: 0 },
  plateNumber: { type: String, default: "default" },
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userType: {
    type: String,
    enum: ["Driver", "Admin", "Examiner"],
    default: "Driver",
  },
  firstName: { type: String, default: "default" },
  lastName: { type: String, default: "default" },
  licenseNumber: { type: String, default: "default" },
  age: { type: Number, default: 0 },
  dob: { type: Date },
  carDetails: CarDetailsSchema,
  appointment: { type: Schema.Types.ObjectId, ref: "Appointment" },
  testType: { type: String, enum: ["G2", "G"], default: null },
  comment: { type: String, default: "" },
  pass: { type: Boolean, default: null },
});

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const User = mongoose.model("User", userSchema);
module.exports = User;
