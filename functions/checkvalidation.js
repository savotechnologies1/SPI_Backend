module.exports.checkValidations = (errors) => {
    return new Promise(async function (resolve, reject) {
      try {
        if (!errors.isEmpty()) {
          return resolve({
            type: "error",
            errors: errors.errors[0],
          });
        }
        return resolve({
          type: "success",
        });
      } catch (error) {
        return reject(error);
      }
    });
  };
  