const User = require("./models/user");

const authenticateDriver = async (req, res, next) => {
  try {
    if (
      req.session &&
      req.session.user &&
      req.session.user.userType === "Driver"
    ) {
      const user = await User.findById(req.session.user._id);
      if (user) {
        req.user = user;
        return next();
      }
    }
    res.redirect("/login");
  } catch (error) {
    console.error("Error authenticating driver:", error);
    res.status(500).send("Internal Server Error");
  }
};

const authenticateAdmin = async (req, res, next) => {
  try {
    if (
      req.session &&
      req.session.user &&
      req.session.user.userType === "Admin"
    ) {
      const user = await User.findById(req.session.user._id);
      if (user) {
        req.user = user;
        return next();
      }
    }
    res.redirect("/login");
  } catch (error) {
    console.error("Error authenticating admin:", error);
    res.status(500).send("Internal Server Error");
  }
};

const authenticateExaminer = async (req, res, next) => {
  try {
    if (
      req.session &&
      req.session.user &&
      req.session.user.userType === "Examiner"
    ) {
      const user = await User.findById(req.session.user._id);
      if (user) {
        req.user = user;
        return next();
      }
    }
    res.redirect("/login");
  } catch (error) {
    console.error("Error authenticating examiner:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  authenticateDriver,
  authenticateAdmin,
  authenticateExaminer,
};
