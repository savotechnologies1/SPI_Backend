const multer = require("multer");
const mongoose = require("mongoose");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('filefilefile342334',file);
    
    if (file?.fieldname === "jobImg") {
      cb(null, "./public/uploads/jobImg");
    } else if (file?.fieldname === "uteImages") {
      cb(null, "./public/uploads/uteImages");
    } else if (file?.fieldname === "profileImg") {
      cb(null, "./public/uploads/profileImg");
    } else if (file?.fieldname === "coverImg") {
      cb(null, "./public/uploads/coverImg");
    } else if (file?.fieldname === "blogImg") {
      cb(null, "./public/uploads/blogImg");
    }else if (file?.fieldname === "jobBookingImg") {
      cb(null, "./public/uploads/jobBookingImg");
    } else {
      cb(new Error("Invalid file fieldname"), false);
    } 
  },
  // filename: function (req, file, cb) {
  //   const fileExtension = path.extname(file.originalname).slice(1);
  //   const data =
  //     file.fieldname === "jobImg" || "uteImages" || "profileImg"
  //       ? new mongoose.Types.ObjectId()
  //       : req?.user?._id;
  //   cb(null, `${data}.${fileExtension}`);
  // },

  filename: function (req, file, cb) {
    const fileExtension = file.originalname.substr(
      file.originalname.lastIndexOf(".") + 1,
      file.originalname.length
    );
    let data = req?.user?._id;
    if (
      ["profileImg", "coverImg", "uteImages", "jobImg","blogImg","jobBookingImg"].includes(
        file?.fieldname
      )
    ) {
      data = new mongoose.Types.ObjectId();
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
    name: "uteImages",
  },
  { name: "profileImg" },
  { name: "coverImg" },
  { name:"blogImg"},
  {name:"jobBookingImg"}
]);

module.exports = upload;
