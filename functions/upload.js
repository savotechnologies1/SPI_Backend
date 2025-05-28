const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file?.fieldname === "workInstructionImg") {
      cb(null, "./public/uploads/workInstructionImg");
    } else if (file?.fieldname === "workInstructionVideo") {
      cb(null, "./public/uploads/workInstructionVideo");
    } else if (file?.fieldname === "profileImg") {
      cb(null, "./public/uploads/profileImg");
    } else if (file?.fieldname === "partImg") {
      cb(null, "./public/uploads/partImg");
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
      ["profileImg", "workInstructionImg", "workInstructionVideo","partImg"].includes(
        file?.fieldname
      )
    ) {
      data = uuidv4();
    }
    cb(null, `${data}.${fileExtension}`);
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
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields([
  {
    name: "workInstructionImg",
  },
  { name: "workInstructionVideo" },
  { name: "profileImg" },
  { name: "partImg" },
]);

module.exports = upload;
