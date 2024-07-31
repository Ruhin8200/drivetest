const express = require("express");
const path = require("path");
const app = express();
const ejs = require("ejs");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const session = require("express-session");
const mongoose = require("mongoose");
const User = require("./models/user");
const BlogPost = require("./models/blogpost");
const Appointment = require("./models/appointment");
const {
  authenticateDriver,
  authenticateAdmin,
  authenticateExaminer,
} = require("./authMiddleware");

mongoose.connect(
  "mongodb+srv://vaghanichintan270:fYApniX2IcO9yXwf@ruhin.2fuirls.mongodb.net/?retryWrites=true&w=majority&appName=Ruhin"
);

app.use(
  session({
    secret: "your_secret_key_here",
    resave: false,
    saveUninitialized: false,
  })
);

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.render("index", { user: req.session.user });
});

app.get("/login", (req, res) => {
  res.render("login", { user: req.session.user });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ username: email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.render("login", {
        user: req.session.user,
        errorMessage: "Invalid email or password",
      });
    }
    req.session.user = { _id: user._id, userType: user.userType };
    res.redirect("/");
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/signup", (req, res) => {
  res.render("signup", { user: req.session.user });
});

app.post("/signup", async (req, res) => {
  const { username, password, repeatPassword, userType } = req.body;
  if (password !== repeatPassword) {
    return res.status(400).send("Passwords do not match");
  }
  try {
    const newUser = new User({
      username,
      password,
      userType,
      firstName: "default",
      lastName: "default",
      licenseNumber: "default",
      age: 0,
      carDetails: {
        make: "default",
        model: "default",
        year: 0,
        plateNumber: "default",
      },
    });
    await newUser.save();
    res.redirect("/login");
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Failed to logout");
    }
    res.redirect("/login");
  });
});

app.get("/g", authenticateDriver, async (req, res) => {
  const date = req.query.date || new Date().toISOString().split("T")[0];
  const testType = "G";
  const availableSlots = await Appointment.find({
    date,
    isTimeSlotAvailable: true,
    testType,
  });
  const userWithAppointment = await User.findById(req.user._id)
    .populate("appointment")
    .exec();
  res.render("g", {
    user: userWithAppointment,
    availableSlots,
    date,
    testType,
  });
});

app.get("/g2", authenticateDriver, async (req, res) => {
  const date = req.query.date || new Date().toISOString().split("T")[0];
  const testType = "G2";
  const availableSlots = await Appointment.find({
    date,
    isTimeSlotAvailable: true,
    testType,
  });
  const userWithAppointment = await User.findById(req.user._id)
    .populate("appointment")
    .exec();
  res.render("g2", {
    user: userWithAppointment,
    availableSlots,
    date,
    testType,
  });
});

app.post("/submit", authenticateDriver, async (req, res) => {
  const {
    firstName,
    lastName,
    licenseNumber,
    age,
    make,
    model,
    year,
    plateNumber,
  } = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        firstName,
        lastName,
        licenseNumber,
        age,
        "carDetails.make": make,
        "carDetails.model": model,
        "carDetails.year": year,
        "carDetails.plateNumber": plateNumber,
      },
      { new: true }
    );
    res.redirect("/g2");
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/updateUser", authenticateDriver, async (req, res) => {
  const { make, model, year, plateNumber } = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        "carDetails.make": make,
        "carDetails.model": model,
        "carDetails.year": year,
        "carDetails.plateNumber": plateNumber,
      },
      { new: true }
    );
    res.render("g", { user: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/bookAppointment", authenticateDriver, async (req, res) => {
  const { date, time, testType } = req.body;
  try {
    const appointment = await Appointment.findOneAndUpdate(
      { date, time, isTimeSlotAvailable: true, testType },
      { isTimeSlotAvailable: false, user: req.user._id },
      { new: true }
    );
    if (!appointment) {
      return res.status(400).send("Time slot is no longer available.");
    }

    if (req.user.appointment) {
      await Appointment.findByIdAndUpdate(req.user.appointment, {
        isTimeSlotAvailable: true,
        user: null,
      });
    }

    await User.findByIdAndUpdate(req.user._id, {
      appointment: appointment._id,
      testType: testType,
    });

    if (testType === "G") {
      res.redirect("/g");
    } else {
      res.redirect("/g2");
    }
  } catch (error) {
    console.error("Error booking appointment:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/cancelAppointment", authenticateDriver, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.appointment) {
      await Appointment.findByIdAndUpdate(user.appointment, {
        isTimeSlotAvailable: true,
        user: null,
      });
      await User.findByIdAndUpdate(req.user._id, {
        appointment: null,
        testType: null,
      });
    }
    res.redirect(req.body.testType === "G" ? "/g" : "/g2");
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/appointment", authenticateAdmin, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split("T")[0];
    const testType = req.query.testType || "G";
    const appointments = await Appointment.find({ date, testType });
    res.render("appointment", { user: req.user, appointments, date, testType });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/appointment", authenticateAdmin, async (req, res) => {
  const { date, timeSlots, testType } = req.body;
  if (!timeSlots || timeSlots.length === 0) {
    const appointments = await Appointment.find({ date, testType });
    return res.status(400).render("appointment", {
      user: req.user,
      appointments,
      date,
      testType,
      errorMessage: "Please select at least one time slot.",
    });
  }
  try {
    const slots = Array.isArray(timeSlots) ? timeSlots : [timeSlots];
    const appointments = slots.map((time) => ({
      date,
      time,
      isTimeSlotAvailable: true,
      testType,
    }));
    const existingAppointments = await Appointment.find({
      date,
      time: { $in: slots },
      testType,
    });
    const existingTimes = existingAppointments.map(
      (appointment) => appointment.time
    );
    const newAppointments = appointments.filter(
      (appointment) => !existingTimes.includes(appointment.time)
    );

    if (newAppointments.length > 0) {
      await Appointment.insertMany(newAppointments);
    }

    res.redirect(`/appointment?date=${date}&testType=${testType}`);
  } catch (error) {
    console.error("Error creating appointment slots:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/availableSlots", authenticateAdmin, async (req, res) => {
  const { date, testType } = req.query;
  try {
    const availableSlots = await Appointment.find({
      date,
      isTimeSlotAvailable: true,
      testType,
    });
    res.json({ availableSlots });
  } catch (error) {
    console.error("Error fetching available slots:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/examiner", authenticateExaminer, async (req, res) => {
  try {
    const testType = req.query.testType || "";
    let query = {};
    if (testType) {
      query = { testType };
    }
    const appointments = await Appointment.find(query).populate("user");
    res.render("examiner", { user: req.user, appointments, testType });
  } catch (error) {
    console.error("Error fetching appointments for examiner:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/examiner/complete", authenticateExaminer, async (req, res) => {
  const { appointmentId, comment, pass } = req.body;
  try {
    const appointment = await Appointment.findById(appointmentId).populate(
      "user"
    );
    if (!appointment) {
      return res.status(400).send("Appointment not found.");
    }
    const user = appointment.user;
    user.comment = comment;
    user.pass = pass === "true";
    user.appointment = null;
    await user.save();

    await Appointment.findByIdAndDelete(appointmentId);

    res.redirect("/examiner");
  } catch (error) {
    console.error("Error completing test:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/admin/results", authenticateAdmin, async (req, res) => {
  try {
    const passedUsers = await User.find({ pass: true });
    const failedUsers = await User.find({ pass: false });
    res.render("adminResults", { user: req.user, passedUsers, failedUsers });
  } catch (error) {
    console.error("Error fetching results:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(4001, () => {
  console.log("App listening on port 4001");
});
