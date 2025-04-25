const Admin = require("../models/adminModel");

const login = async (req, res) => {
  try {
    const { name, password } = req.body;
    const users = await Admin.findOne(
      { name: name.trim(), isDeleted: false },
      { tokens: 0, createdAt: 0, updatedAt: 0 }
    ).lean(true);

    if (users && users.password === md5(password)) {
      const token = jwt.sign({ user: users }, process.env.ACCESS_TOKEN_SECERT, {
        expiresIn: "5d",
      });

      Admin.updateOne(
        {
          _id: users._id,
          isDeleted: false,
        },
        { $push: { tokens: token } },
        { new: true }
      ).then();

      return res.status(200).send({
        token: token,
        message: "Login Successfully",
      });
    }
    return res.status(400).send({ message: "Invalid Username and Password" });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

module.exports = { login };
