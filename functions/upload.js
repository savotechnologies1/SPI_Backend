const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const allowedTypes = ["image/jpg", "image/png", "image/jpeg", "image/webp"];

    if (
      file?.fieldname === "partImages" &&
      allowedTypes.includes(file.mimetype)
    ) {
      return cb(null, "./public/uploads/partImages");
    }

    cb(new Error("Invalid file type"), false);
  },

  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueId = uuidv4();

    cb(null, `${uniqueId}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpg", "image/png", "image/jpeg", "image/webp"];

  if (["partImages"].includes(file.fieldname)) {
    if (allowedTypes.includes(file.mimetype)) {
      return cb(null, true);
    } else {
      req.fileValidationError = "Invalid file format.";
      return cb(null, false);
    }
  }

  req.fileValidationError = "Unexpected field";
  return cb(null, false);
};

const upload = multer({
  storage,
  fileFilter,
}).fields([{ name: "partImages", maxCount: 5 }]);

module.exports = upload;
