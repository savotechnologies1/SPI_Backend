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

// const importParts = async (req, res) => {
//   try {
//     const fileData = await fileUploadFunc(req, res);
//     if (fileData.type === "fileNotFound" || fileData.data === undefined) {
//       res.status(400).json({
//         success: true,
//         error: "CSV file is required with product tree fields",
//       });
//     }

//     console.log("fileDatafileData", fileData);
//     const getCsvFile = fileData?.data?.filter(
//       (file) => file.fieldname === "ImportFile"
//     );
//     const filePath = getCsvFile[0].path;
//     const csvData = []; // Renamed from results to csvData
//     let successCount = 0;
//     let errorCount = 0;
//     const errors = [];

//     // Read and parse CSV
//     fs.createReadStream(filePath)
//       .pipe(csv())
//       .on("data", (data) => {
//         csvData.push(data); // Using csvData instead of results
//       })
//       .on("end", async () => {
//         if (
//           !csvData[0]?.fileName ||
//           csvData[0]?.fileName.toLowerCase() !== "part"
//         ) {
//           console.log("csvDatacsvData", csvData);

//           fs.unlinkSync(filePath);
//           return res.status(400).json({
//             success: false,
//             message: `Invalid file type. Expected 'process', but got '${
//               csvData[0]?.fileName || "undefined"
//             }'`,
//           });
//         }
//         const promises = csvData.map((row, index) => {
//           // Using csvData instead of results

//           return new Promise(async (resolve, reject) => {
//             try {
//               let isError = false;
//               if (row?.type !== "part" && row?.type !== "product") {
//                 isError = true;
//                 reject({
//                   status: "rejected",
//                   reason: `Part type is not correct`,
//                   index,
//                 });
//               }
//               const existingActivePart = await prisma.partNumber.findFirst({
//                 where: {
//                   partNumber: row.partNumber,
//                   isDeleted: false,
//                 },
//               });
//               const isProces = await prisma.process.findFirst({
//                 where: {
//                   id: row.processId,
//                   isDeleted: false,
//                 },
//               });

//               if (!isProces) {
//                 isError = true;
//                 reject({
//                   status: "rejected",
//                   reason: `Process id is not exists ${row.processId}`,
//                   index,
//                 });
//               }

//               if (existingActivePart) {
//                 isError = true;
//                 reject({
//                   status: "rejected",
//                   reason: `product/Part Number is already exists ${row.partNumber}`,
//                   index,
//                 });
//               }

//               if (!isError) {
//                 const getId = uuidv4().slice(0, 8);
//                 await prisma.partNumber.create({
//                   data: {
//                     part_id: getId,
//                     partFamily: row.partFamily,
//                     partNumber: row.partNumber,
//                     partDescription: row.partDescription,
//                     cost: parseFloat(row.cost),
//                     leadTime: parseInt(row.leadTime),
//                     supplierOrderQty: parseInt(row.supplierOrderQty),
//                     companyName: row.companyName,
//                     minStock: parseInt(row?.minStock),
//                     availStock: parseInt(row?.availStock),
//                     cycleTime: row?.cycleTime,
//                     processOrderRequired: row.processOrderRequired === "TRUE",
//                     // processId: row?.processId,
//                     processName: row.processName,
//                     processDesc: row.processDesc,
//                     type: row.type,
//                     submittedBy: req?.user?.id,
//                     createdBy: req?.user?.id,
//                   },
//                 });
//                 resolve({ status: "fulfilled", index });
//               }
//             } catch (error) {
//               let reason = error.message;
//               if (error?.code == "P2002") {
//                 reason = `something wrong in ${error.meta.modelName}. it maybe duplicate or wrong value.`;
//               }
//               reject({ status: "rejected", reason: reason, index });
//             }
//           });
//         });

//         // Wait for all promises to settle (complete or fail)
//         const settledResults = await Promise.allSettled(promises); // Renamed to settledResults

//         // Process the results
//         settledResults.forEach((result) => {
//           // Using settledResults instead of results
//           if (result.status === "fulfilled") {
//             successCount++;
//           } else {
//             errorCount++;
//             errors.push(
//               `Row ${result.reason.index + 2}: ${result.reason.reason}`
//             );
//           }
//         });

//         fs.unlinkSync(filePath);
//         res.json({
//           success: true,
//           message: "CSV import completed.",
//           summary: {
//             totalRows: csvData.length, // Using csvData instead of results
//             successCount,
//             errorCount,
//             errors: errors.length > 0 ? errors : undefined,
//           },
//         });
//       });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };
const importParts = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);
    if (fileData.type === "fileNotFound" || fileData.data === undefined) {
      return res.status(400).json({
        success: false,
        error: "CSV file is required with product tree fields",
      });
    }

    const getCsvFile = fileData?.data?.filter(
      (file) => file.fieldname === "ImportFile"
    );
    const filePath = getCsvFile[0].path;
    const csvData = [];
    const errors = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        csvData.push(data);
      })
      .on("end", async () => {
        // Validate file type
        if (
          !csvData[0]?.fileName ||
          csvData[0]?.fileName.toLowerCase() !== "part"
        ) {
          fs.unlinkSync(filePath);
          return res.status(400).json({
            success: false,
            message: `Invalid file type. Expected 'part', but got '${
              csvData[0]?.fileName || "undefined"
            }'`,
          });
        }

        const validatedData = [];

        // Validate each row
        for (let index = 0; index < csvData.length; index++) {
          const row = csvData[index];
          const rowErrors = [];

          // Type validation
          if (row?.type !== "part" && row?.type !== "product") {
            rowErrors.push("Part type is not correct.");
          }

          // Existing part number check
          const existingActivePart = await prisma.partNumber.findFirst({
            where: {
              partNumber: row.partNumber,
              isDeleted: false,
            },
          });
          if (existingActivePart) {
            rowErrors.push(`Part Number already exists: ${row.partNumber}`);
          }

          // Process name validation from process table (not processId)
          const matchedProcess = await prisma.process.findFirst({
            where: {
              processName: row.processName?.trim(),
              isDeleted: false,
            },
          });

          if (!matchedProcess) {
            rowErrors.push(
              `Process name not found or deleted: ${row.processName}`
            );
          }

          // Collect row errors
          if (rowErrors.length > 0) {
            errors.push(`Row ${index + 2}: ${rowErrors.join(", ")}`);
          } else {
            validatedData.push({
              ...row,
              matchedProcessId: matchedProcess?.id,
            });
          }
        }

        // If any error found, abort the import
        if (errors.length > 0) {
          fs.unlinkSync(filePath);
          return res.status(400).json({
            success: false,
            message: "CSV import failed due to errors.",
            errors,
          });
        }

        // All rows are valid — proceed with insert
        for (const row of validatedData) {
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
              processId: row.matchedProcessId,
              processName: row.processName,
              processDesc: row.processDesc,
              type: row.type,
              submittedBy: req?.user?.id,
              createdBy: req?.user?.id,
            },
          });
        }

        fs.unlinkSync(filePath);
        return res.status(201).json({
          success: true,
          message: "All parts imported successfully.",
          totalImported: validatedData.length,
        });
      });
  } catch (error) {
    return res.status(500).json({
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
      return res.status(400).json({
        success: false,
        error: "CSV file is required with product/part fields",
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
          csvData[0]?.fileName.toLowerCase().trim() !== "product"
        ) {
          fs.unlinkSync(filePath);
          return res.status(400).json({
            success: false,
            message: `Invalid file type. Expected 'product', but got '${
              csvData[0]?.fileName || "undefined"
            }'`,
          });
        }

        for (let index = 0; index < csvData.length; index++) {
          const row = csvData[index];

          const product = await prisma.partNumber.findFirst({
            where: {
              partNumber: row.product_number?.trim(),
              isDeleted: false,
              type: "product",
            },
          });

          const part = await prisma.partNumber.findFirst({
            where: {
              partNumber: row.part_number?.trim(),
              isDeleted: false,
              type: "part",
            },
          });

          if (!part) {
            errorCount++;
            errors.push(
              `Row ${index + 2}: Part not found (${row.part_number})`
            );
            continue;
          }
          let getId = uuidv4().slice(0, 6);
          const existingTree = await prisma.productTree.findFirst({
            where: {
              part_id: getId,
            },
          });

          console.log(")))))wwwwwwwww))))))))))", row);
          console.log("existingTreeexistingTree", existingTree);
          if (existingTree) {
            errorCount++;
            errors.push(
              `Row ${index + 2}: Product/Part tree already exists (${
                row.product_number
              }/${row.part_number})`
            );
            continue;
          }
          console.log(")))))))))))))))", row);

          const data = await prisma.partNumber.create({
            data: {
              part_id: getId,
              partNumber: row.product_number,
              partFamily: row.partFamily,
              partDescription: row.partDescription,
              processOrderRequired: part.processOrderRequired,
              cost: part.cost,
              minStock: part.minStock,
              leadTime: part.leadTime,
              availStock: part.availStock,
              cycleTime: part.cycleTime,
              processName: part.processName,
              processDesc: part.processDesc,
              companyName: part.companyName,
              instructionRequired:
                row.instructionRequired?.trim().toUpperCase() === "TRUE",
              type: "product",

              // ✅ Correct way to link to existing process by ID
              ...(part?.processId && {
                process: {
                  connect: {
                    id: part.processId,
                  },
                },
              }),
            },
          });
          console.log(")datadatadatadata))))))))", data);

          await prisma.productTree.create({
            data: {
              product_id: getId,
              part_id: part.part_id,

              partQuantity: part.availStock,
              processOrderRequired: part.processOrderRequired,
              instructionRequired:
                row.instructionRequired?.trim().toUpperCase() === "TRUE",

              // ✅ Only connect process if processId is available
              ...(part?.processId && {
                process: {
                  connect: {
                    id: part.processId,
                  },
                },
              }),
            },
          });
        }

        fs.unlinkSync(filePath);

        return res.status(200).json({
          success: true,
          message: "CSV import completed.",
          summary: {
            totalRows: csvData.length,
            successCount,
            errorCount,
            errors: errors.length > 0 ? errors : undefined,
          },
        });
      });
  } catch (error) {
    return res.status(500).json({
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
