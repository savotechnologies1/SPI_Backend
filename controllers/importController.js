const fs = require("fs");
const csv = require("csv-parser");
const { fileUploadFunc } = require("../functions/common");
const prisma = require("../config/prisma");
const { v4: uuidv4 } = require("uuid");

const importProcess = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);
    if (fileData.type === "fileNotFound" || fileData.data === undefined) {
      res.status(400).json({
        success: true,
        error: "CSV file is required with process fields",
      });
    }
    const getCsvFile = fileData?.data?.filter(
      (file) => file.fieldname === "ImportFile"
    );
    const filePath = getCsvFile[0].path;
    const csvData = [];
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        csvData.push(data);
      })
      .on("end", async () => {
        if (
          !csvData[0]?.fileName ||
          csvData[0]?.fileName.toLowerCase() !== "process"
        ) {
          console.log("csvDatacsvData", csvData);

          fs.unlinkSync(filePath);
          return res.status(400).json({
            success: false,
            message: `Invalid file type. Expected 'process', but got '${
              csvData[0]?.fileName || "undefined"
            }'`,
          });
        }
        const promises = csvData.map((row, index) => {
          console.log("rowrowrow", row);

          return new Promise(async (resolve, reject) => {
            try {
              const trimmedProcessName = row.processName;
              const checkExistingProcess = await prisma.process.findFirst({
                where: {
                  isDeleted: false,
                  processName: {
                    equals: trimmedProcessName,
                  },
                },
              });

              if (checkExistingProcess) {
                reject({
                  status: "rejected",
                  reason: `Process name is already exists ${trimmedProcessName}`,
                  index,
                });
              } else {
                const isProcessRequired =
                  String(row.isProcessReq).toLowerCase() === "true";
                const getId = uuidv4().slice(0, 8);

                await prisma.process.create({
                  data: {
                    id: getId,
                    processName: row.processName,
                    machineName: row.machineName,
                    ratePerHour: Number(row.ratePerHour),
                    partFamily: row.partFamily,
                    processDesc: row.processDesc,
                    cycleTime: row.cycleTime,
                    isProcessReq: Boolean(isProcessRequired),
                    orderNeeded: Boolean(isProcessRequired),
                    createdBy: req.user?.id,
                  },
                });
                resolve({ status: "fulfilled", index });
              }
            } catch (error) {
              reject({ status: "rejected", reason: error.message, index });
            }
          });
        });

        // Wait for all promises to settle (complete or fail)
        const settledResults = await Promise.allSettled(promises); // Renamed to settledResults

        // Process the results
        settledResults.forEach((result) => {
          // Using settledResults instead of results
          if (result.status === "fulfilled") {
            successCount++;
          } else {
            errorCount++;
            errors.push(
              `Row ${result.reason.index + 2}: ${result.reason.reason}`
            );
          }
        });

        fs.unlinkSync(filePath);
        res.json({
          success: true,
          message: "CSV import completed.",
          summary: {
            totalRows: csvData.length, // Using csvData instead of results
            successCount,
            errorCount,
            errors: errors.length > 0 ? errors : undefined,
          },
        });
      });
  } catch (error) {
    console.log("errorerror", error);

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const importParts = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);
    if (fileData.type === "fileNotFound" || fileData.data === undefined) {
      res.status(400).json({
        success: true,
        error: "CSV file is required with product tree fields",
      });
    }
    const getCsvFile = fileData?.data?.filter(
      (file) => file.fieldname === "ImportFile"
    );
    const filePath = getCsvFile[0].path;
    const csvData = []; // Renamed from results to csvData
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Read and parse CSV
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        csvData.push(data); // Using csvData instead of results
      })
      .on("end", async () => {
        if (
          !csvData[0]?.fileName ||
          csvData[0]?.fileName.toLowerCase() !== "part"
        ) {
          console.log("csvDatacsvData", csvData);

          fs.unlinkSync(filePath);
          return res.status(400).json({
            success: false,
            message: `Invalid file type. Expected 'process', but got '${
              csvData[0]?.fileName || "undefined"
            }'`,
          });
        }
        const promises = csvData.map((row, index) => {
          // Using csvData instead of results

          return new Promise(async (resolve, reject) => {
            try {
              let isError = false;
              if (row?.type !== "part" && row?.type !== "product") {
                isError = true;
                reject({
                  status: "rejected",
                  reason: `Part type is not correct`,
                  index,
                });
              }
              const existingActivePart = await prisma.partNumber.findFirst({
                where: {
                  partNumber: row.partNumber,
                  isDeleted: false,
                },
              });
              const isProces = await prisma.process.findFirst({
                where: {
                  id: row.processId,
                  isDeleted: false,
                },
              });

              if (!isProces) {
                isError = true;
                reject({
                  status: "rejected",
                  reason: `Process id is not exists ${row.processId}`,
                  index,
                });
              }

              if (existingActivePart) {
                isError = true;
                reject({
                  status: "rejected",
                  reason: `product/Part Number is already exists ${row.partNumber}`,
                  index,
                });
              }

              if (!isError) {
                const getId = uuidv4().slice(0, 8);
                await prisma.partNumber.create({
                  data: {
                    part_id: getId,
                    partFamily: row.partFamily,
                    partNumber: row.partNumber,
                    partDescription: row.partDescription,
                    cost: parseFloat(row.cost),
                    leadTime: parseInt(row.leadTime),
                    supplierOrderQty: parseInt(row.supplierOrderQty),
                    companyName: row.companyName,
                    minStock: parseInt(row?.minStock),
                    availStock: parseInt(row?.availStock),
                    cycleTime: row?.cycleTime,
                    processOrderRequired: row.processOrderRequired === "TRUE",
                    processId: row.processId,
                    processDesc: row.processDesc,
                    type: row.type,
                    submittedBy: req?.user?.id,
                    createdBy: req?.user?.id,
                  },
                });
                resolve({ status: "fulfilled", index });
              }
            } catch (error) {
              let reason = error.message;
              if (error?.code == "P2002") {
                reason = `something wrong in ${error.meta.modelName}. it maybe duplicate or wrong value.`;
              }
              reject({ status: "rejected", reason: reason, index });
            }
          });
        });

        // Wait for all promises to settle (complete or fail)
        const settledResults = await Promise.allSettled(promises); // Renamed to settledResults

        // Process the results
        settledResults.forEach((result) => {
          // Using settledResults instead of results
          if (result.status === "fulfilled") {
            successCount++;
          } else {
            errorCount++;
            errors.push(
              `Row ${result.reason.index + 2}: ${result.reason.reason}`
            );
          }
        });

        fs.unlinkSync(filePath);
        res.json({
          success: true,
          message: "CSV import completed.",
          summary: {
            totalRows: csvData.length, // Using csvData instead of results
            successCount,
            errorCount,
            errors: errors.length > 0 ? errors : undefined,
          },
        });
      });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const importProductTree = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);
    if (fileData.type === "fileNotFound" || fileData.data === undefined) {
      res.status(400).json({
        success: true,
        error: "CSV file is required with product/part fields",
      });
    }
    const getCsvFile = fileData?.data?.filter(
      (file) => file.fieldname === "ImportFile"
    );
    const filePath = getCsvFile[0].path;
    const csvData = []; // Renamed from results to csvData
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Read and parse CSV
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        csvData.push(data); // Using csvData instead of results
      })
      .on("end", async () => {
        if (
          !csvData[0]?.fileName ||
          csvData[0]?.fileName.toLowerCase() !== "product"
        ) {
          console.log("csvDatacsvData", csvData);

          fs.unlinkSync(filePath);
          return res.status(400).json({
            success: false,
            message: `Invalid file type. Expected 'process', but got '${
              csvData[0]?.fileName || "undefined"
            }'`,
          });
        }
        const promises = csvData.map((row, index) => {
          // Using csvData instead of results

          return new Promise(async (resolve, reject) => {
            try {
              let isError = false;
              const product = await prisma.partNumber.findFirst({
                where: {
                  partNumber: row.product_number,
                  isDeleted: false,
                },
              });
              const part = await prisma.partNumber.findFirst({
                where: {
                  partNumber: row.part_number,
                  isDeleted: false,
                },
              });

              if (!product || !part) {
                isError = true;
                reject({
                  status: "rejected",
                  reason: `product/Part not found with given number ${row.product_number}/${row.part_number}`,
                  index,
                });
              }

              const productTree = await prisma.productTree.findFirst({
                where: {
                  product_id: product?.part_id,
                  part_id: part?.part_id,
                },
              });

              if (productTree) {
                isError = true;
                reject({
                  status: "rejected",
                  reason: `Product/Part tree is already exists ${row.product_number}/${row.part_number}`,
                  index,
                });
              }

              if (!isError) {
                const getId = uuidv4().slice(0, 8);
                await prisma.productTree.create({
                  data: {
                    product_id: product.part_id,
                    processId: part.processId,
                    part_id: part.part_id,
                    partQuantity: part.availStock,
                    processOrderRequired: part.processOrderRequired,
                    instructionRequired:
                      row.instructionRequired === "TRUE" ? true : false,
                  },
                });
                resolve({ status: "fulfilled", index });
              }
            } catch (error) {
              const reason = `something wrong in ${error.meta.modelName}. it maybe duplicate or wrong value.`;
              reject({ status: "rejected", reason: reason, index });
            }
          });
        });

        // Wait for all promises to settle (complete or fail)
        const settledResults = await Promise.allSettled(promises); // Renamed to settledResults

        // Process the results
        settledResults.forEach((result) => {
          // Using settledResults instead of results
          if (result.status === "fulfilled") {
            successCount++;
          } else {
            errorCount++;
            errors.push(
              `Row ${result.reason.index + 2}: ${result.reason.reason}`
            );
          }
        });

        fs.unlinkSync(filePath);
        res.json({
          success: true,
          message: "CSV import completed.",
          summary: {
            totalRows: csvData.length, // Using csvData instead of results
            successCount,
            errorCount,
            errors: errors.length > 0 ? errors : undefined,
          },
        });
      });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const importEmp = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);
    if (fileData.type === "fileNotFound" || fileData.data === undefined) {
      res.status(400).json({
        success: true,
        error: "CSV file is required with Employee fields",
      });
    }
    const getCsvFile = fileData?.data?.filter(
      (file) => file.fieldname === "ImportFile"
    );
    const filePath = getCsvFile[0].path;
    const csvData = []; // Renamed from results to csvData
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Read and parse CSV
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        csvData.push(data); // Using csvData instead of results
      })
      .on("end", async () => {
        if (
          !csvData[0]?.fileName ||
          csvData[0]?.fileName.toLowerCase() !== "employee"
        ) {
          console.log("csvDatacsvData", csvData);

          fs.unlinkSync(filePath);
          return res.status(400).json({
            success: false,
            message: `Invalid file type. Expected 'process', but got '${
              csvData[0]?.fileName || "undefined"
            }'`,
          });
        }
        const promises = csvData.map((row, index) => {
          // Using csvData instead of results
          return new Promise(async (resolve, reject) => {
            try {
              let isError = false;
              const existingEmployee = await prisma.employee.findFirst({
                where: {
                  isDeleted: false,
                  email: row.email,
                },
              });

              if (existingEmployee) {
                isError = true;
                reject({
                  status: "rejected",
                  reason: `Employee email is already exists ${row.email}`,
                  index,
                });
              }
              if (!isError) {
                const getId = uuidv4().slice(0, 6);
                await prisma.employee.create({
                  data: {
                    firstName: row.firstName,
                    lastName: row.lastName,
                    fullName: row.fullName,
                    email: row.email,
                    employeeId: `EMP${getId}`,
                    hourlyRate: row.hourlyRate,
                    shift: row.shift,
                    startDate: row.startDate,
                    pin: row.pin,
                    role: row.role,
                    processLogin: Boolean(row.processLogin),
                    termsAccepted: Boolean(1),
                    status: row.status,
                    password: "",
                    createdBy: req.user.id,
                  },
                });
              }

              resolve({ status: "fulfilled", index });
            } catch (error) {
              let reason = error.message;
              if (error?.code == "P2002") {
                reason = `something wrong in ${error.meta.modelName}. it maybe duplicate or wrong value.`;
              }
              reject({ status: "rejected", reason: reason, index });
            }
          });
        });

        // Wait for all promises to settle (complete or fail)
        const settledResults = await Promise.allSettled(promises); // Renamed to settledResults

        // Process the results
        settledResults.forEach((result) => {
          // Using settledResults instead of results
          if (result.status === "fulfilled") {
            successCount++;
          } else {
            errorCount++;
            errors.push(
              `Row ${result.reason.index + 2}: ${result.reason.reason}`
            );
          }
        });

        fs.unlinkSync(filePath);
        res.json({
          success: true,
          message: "CSV import completed.",
          summary: {
            totalRows: csvData.length, // Using csvData instead of results
            successCount,
            errorCount,
            errors: errors.length > 0 ? errors : undefined,
          },
        });
      });
  } catch (error) {
    console.log("errorerror", error);

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const importSupp = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);
    if (fileData.type === "fileNotFound" || fileData.data === undefined) {
      res.status(400).json({
        success: true,
        error: "CSV file is required with Supplier fields",
      });
    }
    const getCsvFile = fileData?.data?.filter(
      (file) => file.fieldname === "ImportFile"
    );
    const filePath = getCsvFile[0].path;
    const csvData = []; // Renamed from results to csvData
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Read and parse CSV
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        csvData.push(data); // Using csvData instead of results
      })
      .on("end", async () => {
        if (
          !csvData[0]?.fileName ||
          csvData[0]?.fileName.toLowerCase() !== "supplier"
        ) {
          console.log("csvDatacsvData", csvData);

          fs.unlinkSync(filePath);
          return res.status(400).json({
            success: false,
            message: `Invalid file type. Expected 'process', but got '${
              csvData[0]?.fileName || "undefined"
            }'`,
          });
        }
        const promises = csvData.map((row, index) => {
          // Using csvData instead of results
          return new Promise(async (resolve, reject) => {
            try {
              let isError = false;
              const existingSupp = await prisma.suppliers.findFirst({
                where: {
                  isDeleted: false,
                  email: row.email,
                },
              });

              if (existingSupp) {
                isError = true;
                reject({
                  status: "rejected",
                  reason: `Supplier email is already exists ${row.email}`,
                  index,
                });
              }
              if (!isError) {
                const getId = uuidv4().slice(0, 6);
                await prisma.suppliers.create({
                  data: {
                    id: getId,
                    firstName: row.firstName,
                    lastName: row.lastName,
                    email: row.email,
                    address: row.address,
                    billingTerms: row.billingTerms,
                    createdBy: req.user.id,
                  },
                });
              }

              resolve({ status: "fulfilled", index });
            } catch (error) {
              let reason = error.message;
              if (error?.code == "P2002") {
                reason = `something wrong in ${error.meta.modelName}. it maybe duplicate or wrong value.`;
              }
              reject({ status: "rejected", reason: reason, index });
            }
          });
        });

        // Wait for all promises to settle (complete or fail)
        const settledResults = await Promise.allSettled(promises); // Renamed to settledResults

        // Process the results
        settledResults.forEach((result) => {
          // Using settledResults instead of results
          if (result.status === "fulfilled") {
            successCount++;
          } else {
            errorCount++;
            errors.push(
              `Row ${result.reason.index + 2}: ${result.reason.reason}`
            );
          }
        });

        fs.unlinkSync(filePath);
        res.json({
          success: true,
          message: "CSV import completed.",
          summary: {
            totalRows: csvData.length, // Using csvData instead of results
            successCount,
            errorCount,
            errors: errors.length > 0 ? errors : undefined,
          },
        });
      });
  } catch (error) {
    console.log("errorerror", error);

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const importCust = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);
    if (fileData.type === "fileNotFound" || fileData.data === undefined) {
      res.status(400).json({
        success: true,
        error: "CSV file is required with Customer fields",
      });
    }
    const getCsvFile = fileData?.data?.filter(
      (file) => file.fieldname === "ImportFile"
    );
    const filePath = getCsvFile[0].path;
    const csvData = []; // Renamed from results to csvData
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Read and parse CSV
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        csvData.push(data); // Using csvData instead of results
      })
      .on("end", async () => {
        if (
          !csvData[0]?.fileName ||
          csvData[0]?.fileName.toLowerCase() !== "customer"
        ) {
          console.log("csvDatacsvData", csvData);

          fs.unlinkSync(filePath);
          return res.status(400).json({
            success: false,
            message: `Invalid file type. Expected 'process', but got '${
              csvData[0]?.fileName || "undefined"
            }'`,
          });
        }
        const promises = csvData.map((row, index) => {
          // Using csvData instead of results
          return new Promise(async (resolve, reject) => {
            try {
              let isError = false;
              const existingCustomer = await prisma.customers.findFirst({
                where: {
                  isDeleted: false,
                  OR: [
                    { email: row.email },
                    { customerPhone: row.customerPhone },
                  ],
                },
              });
              if (existingCustomer) {
                isError = true;
                reject({
                  status: "rejected",
                  reason: `Customer with this email(${row.email}) or phone number(${row.customerPhone}) already exists `,
                  index,
                });
              }

              if (!isError) {
                const getId = uuidv4().slice(0, 6);
                await prisma.customers.create({
                  data: {
                    id: getId,
                    firstName: row.firstName,
                    lastName: row.lastName,
                    email: row.email,
                    address: row.address,
                    billingTerms: row.billingTerms,
                    customerPhone: row.customerPhone,
                    createdBy: req.user.id,
                  },
                });
              }
              resolve({ status: "fulfilled", index });
            } catch (error) {
              let reason = error.message;
              if (error?.code == "P2002") {
                reason = `something wrong in ${error.meta.modelName}. it maybe duplicate or wrong value.`;
              }
              reject({ status: "rejected", reason: reason, index });
            }
          });
        });

        // Wait for all promises to settle (complete or fail)
        const settledResults = await Promise.allSettled(promises); // Renamed to settledResults

        // Process the results
        settledResults.forEach((result) => {
          // Using settledResults instead of results
          if (result.status === "fulfilled") {
            successCount++;
          } else {
            errorCount++;
            errors.push(
              `Row ${result.reason.index + 2}: ${result.reason.reason}`
            );
          }
        });

        fs.unlinkSync(filePath);
        res.json({
          success: true,
          message: "CSV import completed.",
          summary: {
            totalRows: csvData.length, // Using csvData instead of results
            successCount,
            errorCount,
            errors: errors.length > 0 ? errors : undefined,
          },
        });
      });
  } catch (error) {
    console.log("errorerror", error);

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  importProcess,
  importParts,
  importProductTree,
  importEmp,
  importSupp,
  importCust,
};
