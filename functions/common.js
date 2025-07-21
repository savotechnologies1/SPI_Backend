require('dotenv').config()
const multer = require("multer");
const upload = require("./upload");
const jwt = require('jsonwebtoken');

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
      upload(request, response, (err) => {
        console.log(
          "✅ Full req.files:",
          JSON.stringify(request.files, null, 2)
        );

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



module.exports.generateToken  = async function(id,email)
{
    console.log("generateToken() called");
   
    let payload = {
        id,
        email
    };
    let options ={
        expiresIn:'7d',
    };
    let access_token = await jwt.sign(payload,process.env.ACCESS_TOKEN_SECRET,options);
    
    return access_token
}


module.exports.generateRefreshToken = async (email, userid) => {
    console.log("generateRefreshToken() called");
    let payload = {
        email,
        userid
    };
    let options = {
        issuer: "decoder.com",
        subject: "email", // Change 'audience' to 'subject'
        expiresIn: '15d'
    };
    let refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, options);
    return refreshToken;
}

module.exports.validateToken = async function(token)
{
    console.log("validateToken() called")
    // console.log("Token")
    let isValid = await new Promise((resolve, reject) =>{
        jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,async(err,decoded)=>
        {
            if(err)
            {
                // console.log("Token Expired | ",err);
                // reject(false);
                resolve(false);
            }
            else
            {
                // console.log("Token Valid | ",decoded);
                resolve(decoded);
            }
        })
    })
    // console.log("isValid : ",isValid);
    return isValid;
}

module.exports.validateRefreshToken = async function(token)
{
    console.log("validateRefreshToken() called")
    let isValid = await new Promise((resolve, reject) =>{
        jwt.verify(token,process.env.REFRESH_TOKEN_SECRET,async(err,valid)=>
        {
            if(err)
            {
                console.log("Token Expired | ",err);
                // reject(false);
                resolve(false);
            }
            else
            {
                // console.log("Token Valid | ",valid);
                resolve(valid);
            }
        })
    })
    return isValid;
}