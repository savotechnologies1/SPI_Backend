const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname.includes("workInstructionImg")) {
      cb(null, "./public/uploads/workInstructionImg");
    } else if (file.fieldname.includes("workInstructionVideo")) {
      cb(null, "./public/uploads/workInstructionVideo");
    } else if (file.fieldname === "profileImg") {
      cb(null, "./public/uploads/profileImg");
    } else if (file.fieldname === "partImages") {
      cb(null, "./public/uploads/partImages");
    } else {
      cb(new Error("Invalid file fieldname"), false);
    }
  },

  // filename: function (req, file, cb) {
  //   const fileExtension = file.originalname.substr(
  //     file.originalname.lastIndexOf(".") + 1,
  //     file.originalname.length
  //   );
  //   let data = req?.user?.id;
  //   if (
  //     ["workInstructionImg", "workInstructionVideo", "partImages"].includes(
  //       file?.fieldname
  //     )
  //   ) {
  //     data = uuidv4();
  //   }
  //   console.log("22222222222222", data, fileExtension);

  //   cb(null, `${data}.${fileExtension}`);
  // },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];
  const allowedVideoTypes = [
    "video/mp4",
    "video/mpeg",
    "video/webm",
    "video/ogg",
  ];
  console.log("file.mimetypefile.mimetype", file.mimetype);

  if (
    allowedImageTypes.includes(file.mimetype) ||
    allowedVideoTypes.includes(file.mimetype)
  ) {
    return cb(null, true);
  }

  return cb(new Error("Invalid file type"), false);
};
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
}).any();

module.exports = upload;
