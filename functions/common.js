const multer = require("multer");
const upload = require("./upload");

module.exports.generateRandomOTP = () => {
  try {
    const digits = "0123456789";
    let OTP = "";
    for (let i = 0; i < 6; i++) {
      OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
  } catch (error) {
    throw error;
  }
};

module.exports.paginationQuery = (data) => {
  try {
    const page = parseInt(data?.page) || 1;
    const pageSize = parseInt(data?.limit);
    const validPageSize = isNaN(pageSize) ? 8 : pageSize;
    const skip = (page - 1) * validPageSize;

    return {
      page,
      pageSize: validPageSize,
      skip,
    };
  } catch (error) {
    throw error;
  }
};

module.exports.pagination = (data) => {
  try {
    let obj = {};
    const totalPages = Math.ceil(data.total / data.pageSize);
    if (data.page > totalPages) {
      data.page = 1;
    }
    obj = {
      page: data.page,
      hasPrevious: data.page > 1,
      previous: data.page - 1,
      hasNext: data.page < totalPages,
      next: data.page < totalPages ? data.page + 1 : 0,
      totalPages,
    };
    return obj;
  } catch (error) {
    throw error;
  }
};

module.exports.fileUploadFunc = (request, response) => {
  return new Promise(async function (resolve, reject) {
    try {
      console.log("requestrequest", request);

      upload(request, response, (err) => {
        if (request.files && !Object.keys(request.files).length) {
          return resolve({
            type: "fileNotFound",
            status: 400,
          });
        }

        if (request.fileValidationError) {
          return resolve({
            type: request.fileValidationError,
            status: 400,
          });
        }

        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return resolve({
              type: "Unexpected file field",
              status: 400,
            });
          }
        } else if (err) {
          return resolve({
            type: "File upload failed",
            status: 400,
          });
        }

        return resolve({
          type: "success",
          status: 200,
          data: request.files,
        });
      });
    } catch (error) {
      return reject(error);
    }
  });
};

const isValidPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return false;
  const phoneRegex = /^\d+$/;
  return phoneRegex.test(phoneNumber);
};

module.exports.validatePhoneInput = (res, phoneNumber) => {
  const checkPhone = isValidPhoneNumber(phoneNumber);
  if (!checkPhone) {
    res.status(400).json({
      message: "Phone number must contain digits only (no spaces or symbols).",
    });
    return false;
  }
  return true;
};
