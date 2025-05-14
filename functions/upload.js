const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log("filefilefile342334", file);

    if (file?.fieldname === "workInstructionImg") {
      cb(null, "./public/uploads/workInstructionImg");
    } else if (file?.fieldname === "uteImages") {
      cb(null, "./public/uploads/uteImages");
    } else if (file?.fieldname === "profileImg") {
      cb(null, "./public/uploads/profileImg");
    } else if (file?.fieldname === "coverImg") {
      cb(null, "./public/uploads/coverImg");
    } else if (file?.fieldname === "blogImg") {
      cb(null, "./public/uploads/blogImg");
    } else if (file?.fieldname === "jobBookingImg") {
      cb(null, "./public/uploads/jobBookingImg");
    } else {
      cb(new Error("Invalid file fieldname"), false);
    }
  },

  filename: function (req, file, cb) {
    const fileExtension = file.originalname.substr(
      file.originalname.lastIndexOf(".") + 1,
      file.originalname.length
    );
    let data = req?.user?.id;
    if (
      [
        "profileImg",
        "workInstructionImg",
        "uteImages",
        "jobImg",
        "blogImg",
        "jobBookingImg",
      ].includes(file?.fieldname)
    ) {
      data = uuidv4();
    }
    cb(null, `${data}.${fileExtension}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
      file.mimetype
    )
  ) {
    return cb(null, true);
  }
  return cb(new Error("Invalid file type"), false);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields([
  { name: "jobImg" },
  {
    name: "workInstructionImg",
  },
  { name: "profileImg" },
  { name: "coverImg" },
  { name: "blogImg" },
  { name: "jobBookingImg" },
]);

module.exports = upload;
