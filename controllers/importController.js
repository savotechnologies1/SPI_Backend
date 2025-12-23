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

    if (fileData.type === "fileNotFound" || !fileData.data) {
      return res.status(400).json({
        success: false,
        message: "CSV file is required",
      });
    }

    const csvFile = fileData.data.find(
      (file) => file.fieldname === "ImportFile"
    );

    if (!csvFile) {
      return res.status(400).json({
        success: false,
        message: "ImportFile not found",
      });
    }

    const filePath = csvFile.path;
    const csvData = [];
    const errors = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        csvData.push(row);
      })
      .on("end", async () => {
        // 🔹 File type validation
        if (
          !csvData[0]?.fileName ||
          csvData[0].fileName.toLowerCase() !== "part"
        ) {
          fs.unlinkSync(filePath);
          return res.status(400).json({
            success: false,
            message: "Invalid file type. Expected 'part'",
          });
        }

        const validatedData = [];

        // 🔹 Row validations
        for (let index = 0; index < csvData.length; index++) {
          const row = csvData[index];
          const rowErrors = [];

          // Type validation
          if (!["part", "product"].includes(row.type)) {
            rowErrors.push("Invalid type (must be part or product)");
          }

          // Duplicate partNumber check
          const existingPart = await prisma.partNumber.findFirst({
            where: {
              partNumber: row.partNumber,
              isDeleted: false,
            },
          });

          if (existingPart) {
            rowErrors.push(`PartNumber already exists: ${row.partNumber}`);
          }

          // 🔹 Process validation (BY NAME)
          const process = await prisma.process.findFirst({
            where: {
              processName: row.processName?.trim(),
              isDeleted: false,
            },
          });

          if (!process) {
            rowErrors.push(`Process not found: ${row.processName}`);
          }

          if (rowErrors.length > 0) {
            errors.push(`Row ${index + 2}: ${rowErrors.join(", ")}`);
          } else {
            validatedData.push({
              ...row,
              processId: process.id,
            });
          }
        }

        // ❌ Abort if errors
        if (errors.length > 0) {
          fs.unlinkSync(filePath);
          return res.status(400).json({
            success: false,
            message: "CSV import failed",
            errors,
          });
        }

        // ✅ Insert records
        for (const row of validatedData) {
          await prisma.partNumber.create({
            data: {
              part_id: uuidv4(),
              partFamily: row.partFamily,
              partNumber: row.partNumber,
              partDescription: row.partDescription,
              type: row.type,
              cost: parseFloat(row.cost),
              leadTime: parseInt(row.leadTime),
              minStock: parseInt(row.minStock) || 0,
              availStock: parseInt(row.availStock) || 0,
              supplierOrderQty: parseInt(row.supplierOrderQty) || 0,
              cycleTime: row.cycleTime,
              processOrderRequired: row.processOrderRequired === "TRUE",
              processDesc: row.processDesc,
              companyName: row.companyName,

              // ✅ FK saved here
              processId: row.processId,

              submittedBy: req.user?.id,
              createdBy: req.user?.id,
            },
          });
        }

        fs.unlinkSync(filePath);

        return res.status(201).json({
          success: true,
          message: "Parts imported successfully",
          totalImported: validatedData.length,
        });
      });
  } catch (error) {
    console.error(error);
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

    if (fileData.type === "fileNotFound" || !fileData.data) {
      return res
        .status(400)
        .json({ success: false, message: "CSV file is required" });
    }

    const csvFile = fileData.data.find(
      (file) => file.fieldname === "ImportFile"
    );
    if (!csvFile) {
      return res
        .status(400)
        .json({ success: false, message: "ImportFile not found" });
    }

    const filePath = csvFile.path;
    const csvData = [];
    const errors = [];
    let successCount = 0;

    // CSV Read karna
    const stream = fs.createReadStream(filePath).pipe(csv());
    for await (const row of stream) {
      csvData.push(row);
    }

    // Validation: Check if it's a product file
    if (
      !csvData[0]?.fileName ||
      csvData[0].fileName.toLowerCase().trim() !== "product"
    ) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: "Invalid file type. Expected 'product'",
      });
    }

    // 1. Grouping: Product Number ke hisab se data ko group karna
    const groupedProducts = csvData.reduce((acc, row) => {
      const pNum = row.product_number?.trim();
      if (pNum) {
        if (!acc[pNum]) {
          acc[pNum] = { details: row, parts: [] };
        }
        acc[pNum].parts.push(row);
      }
      return acc;
    }, {});

    // 2. Processing Each Product (Jese createProductNumber me hota hai)
    for (const [productNumber, group] of Object.entries(groupedProducts)) {
      try {
        const { details, parts } = group;

        // Check if Product already exists
        const existingProduct = await prisma.partNumber.findUnique({
          where: { partNumber: productNumber },
        });

        if (existingProduct) {
          errors.push(`Product ${productNumber} already exists. Skipping.`);
          continue;
        }

        const newProductId = uuidv4().slice(0, 6);

        // STEP A: Create NEW PRODUCT in PartNumber Table
        await prisma.partNumber.create({
          data: {
            part_id: newProductId,
            partNumber: productNumber.trim(),
            partFamily: details.partFamily || "",
            partDescription: details.partDescription || "",
            // CSV me ye fields nahi hain to default 0/null rakha hai
            cost: parseFloat(details.cost) || 0,
            leadTime: parseInt(details.leadTime) || 0,
            supplierOrderQty: parseInt(details.supplierOrderQty) || 0,
            companyName: details.companyName || "Default", // Mandatory field handle
            minStock: parseInt(details.minStock) || 0,
            availStock: parseInt(details.availStock) || 0,
            cycleTime: details.cycleTime || null,
            processOrderRequired: details.processOrderRequired === "true",
            processId: details.processId || null,
            processDesc: details.processDesc || null,
            type: "product",
            submittedBy: req.user.id,
          },
        });

        // STEP B: Link EXISTING PARTS in ProductTree
        for (const partRow of parts) {
          const partNumInCsv = partRow.part_number?.trim();

          // Database me existing part ko dhundna
          const existingPartInDb = await prisma.partNumber.findFirst({
            where: {
              partNumber: partNumInCsv,
              type: "part", // Ye component part hai
              isDeleted: false,
            },
          });

          if (!existingPartInDb) {
            errors.push(
              `Row ${productNumber}: Part ${partNumInCsv} not found in database.`
            );
            continue;
          }

          // Create Product Tree entry (Link Product + Part)
          await prisma.productTree.create({
            data: {
              id: uuidv4().slice(0, 6),
              product_id: newProductId, // Naya create kiya hua product
              part_id: existingPartInDb.part_id, // Purana existing part
              partQuantity: Number(partRow.partQuantity) || 1,
              processOrderRequired: details.processOrderRequired === "true",
              instructionRequired:
                partRow.instructionRequired?.trim().toUpperCase() === "TRUE",
              processId:
                details.processId || existingPartInDb.processId || null,
            },
          });

          // Optional: Update Product according to your createProductNumber logic
          await prisma.partNumber.update({
            where: { part_id: newProductId },
            data: {
              processId: details.processId || existingPartInDb.processId,
              processOrderRequired: details.processOrderRequired === "true",
              instructionRequired:
                partRow.instructionRequired?.trim().toUpperCase() === "TRUE",
            },
          });
        }

        successCount++;
      } catch (err) {
        errors.push(`Error creating Product ${productNumber}: ${err.message}`);
      }
    }

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    return res.status(200).json({
      success: true,
      message: "Product creation and mapping completed via CSV",
      summary: {
        totalProductsInCsv: Object.keys(groupedProducts).length,
        successfullyCreated: successCount,
        errorCount: errors.length,
        errors: errors,
      },
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
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
