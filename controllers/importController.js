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
// const importParts = async (req, res) => {
//   try {
//     const fileData = await fileUploadFunc(req, res);

//     if (fileData.type === "fileNotFound" || !fileData.data) {
//       return res.status(400).json({
//         success: false,
//         message: "CSV file is required",
//       });
//     }

//     const csvFile = fileData.data.find(
//       (file) => file.fieldname === "ImportFile"
//     );

//     if (!csvFile) {
//       return res.status(400).json({
//         success: false,
//         message: "ImportFile not found",
//       });
//     }

//     const filePath = csvFile.path;
//     const csvData = [];
//     const errors = [];

//     fs.createReadStream(filePath)
//       .pipe(csv())
//       .on("data", (row) => {
//         csvData.push(row);
//       })
//       .on("end", async () => {
//         // 🔹 File type validation
//         if (
//           !csvData[0]?.fileName ||
//           csvData[0].fileName.toLowerCase() !== "part"
//         ) {
//           fs.unlinkSync(filePath);
//           return res.status(400).json({
//             success: false,
//             message: "Invalid file type. Expected 'part'",
//           });
//         }

//         const validatedData = [];

//         // 🔹 Row validations
//         for (let index = 0; index < csvData.length; index++) {
//           const row = csvData[index];
//           const rowErrors = [];

//           // Type validation
//           if (!["part", "product"].includes(row.type)) {
//             rowErrors.push("Invalid type (must be part or product)");
//           }

//           // Duplicate partNumber check
//           const existingPart = await prisma.partNumber.findFirst({
//             where: {
//               partNumber: row.partNumber,
//               isDeleted: false,
//             },
//           });

//           if (existingPart) {
//             rowErrors.push(`PartNumber already exists: ${row.partNumber}`);
//           }

//           // 🔹 Process validation (BY NAME)
//           const process = await prisma.process.findFirst({
//             where: {
//               processName: row.processName?.trim(),
//               isDeleted: false,
//             },
//           });

//           if (!process) {
//             rowErrors.push(`Process not found: ${row.processName}`);
//           }

//           if (rowErrors.length > 0) {
//             errors.push(`Row ${index + 2}: ${rowErrors.join(", ")}`);
//           } else {
//             validatedData.push({
//               ...row,
//               processId: process.id,
//             });
//           }
//         }

//         // ❌ Abort if errors
//         if (errors.length > 0) {
//           fs.unlinkSync(filePath);
//           return res.status(400).json({
//             success: false,
//             message: "CSV import failed",
//             errors,
//           });
//         }

//         // ✅ Insert records
//         for (const row of validatedData) {
//           await prisma.partNumber.create({
//             data: {
//               part_id: uuidv4(),
//               partFamily: row.partFamily,
//               partNumber: row.partNumber,
//               partDescription: row.partDescription,
//               type: row.type,
//               cost: parseFloat(row.cost),
//               leadTime: parseInt(row.leadTime),
//               minStock: parseInt(row.minStock) || 0,
//               availStock: parseInt(row.availStock) || 0,
//               supplierOrderQty: parseInt(row.supplierOrderQty) || 0,
//               cycleTime: row.cycleTime,
//               processOrderRequired: row.processOrderRequired === "TRUE",
//               processDesc: row.processDesc,
//               companyName: row.companyName,

//               // ✅ FK saved here
//               processId: row.processId,

//               submittedBy: req.user?.id,
//               createdBy: req.user?.id,
//             },
//           });
//         }

//         fs.unlinkSync(filePath);

//         return res.status(201).json({
//           success: true,
//           message: "Parts imported successfully",
//           totalImported: validatedData.length,
//         });
//       });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };

// const importProductTree = async (req, res) => {
//   try {
//     const fileData = await fileUploadFunc(req, res);

//     if (fileData.type === "fileNotFound" || !fileData.data) {
//       return res
//         .status(400)
//         .json({ success: false, message: "CSV file is required" });
//     }

//     const csvFile = fileData.data.find(
//       (file) => file.fieldname === "ImportFile"
//     );
//     if (!csvFile) {
//       return res
//         .status(400)
//         .json({ success: false, message: "ImportFile not found" });
//     }

//     const filePath = csvFile.path;
//     const csvData = [];
//     const errors = [];
//     let successCount = 0;

//     // CSV Read karna
//     const stream = fs.createReadStream(filePath).pipe(csv());
//     for await (const row of stream) {
//       csvData.push(row);
//     }

//     // Validation: Check if it's a product file
//     if (
//       !csvData[0]?.fileName ||
//       csvData[0].fileName.toLowerCase().trim() !== "product"
//     ) {
//       if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
//       return res.status(400).json({
//         success: false,
//         message: "Invalid file type. Expected 'product'",
//       });
//     }

//     // 1. Grouping: Product Number ke hisab se data ko group karna
//     const groupedProducts = csvData.reduce((acc, row) => {
//       const pNum = row.product_number?.trim();
//       if (pNum) {
//         if (!acc[pNum]) {
//           acc[pNum] = { details: row, parts: [] };
//         }
//         acc[pNum].parts.push(row);
//       }
//       return acc;
//     }, {});

//     // 2. Processing Each Product (Jese createProductNumber me hota hai)
//     for (const [productNumber, group] of Object.entries(groupedProducts)) {
//       try {
//         const { details, parts } = group;

//         // Check if Product already exists
//         const existingProduct = await prisma.partNumber.findUnique({
//           where: { partNumber: productNumber },
//         });

//         if (existingProduct) {
//           errors.push(`Product ${productNumber} already exists. Skipping.`);
//           continue;
//         }

//         const newProductId = uuidv4().slice(0, 6);

//         // STEP A: Create NEW PRODUCT in PartNumber Table
//         await prisma.partNumber.create({
//           data: {
//             part_id: newProductId,
//             partNumber: productNumber.trim(),
//             partFamily: details.partFamily || "",
//             partDescription: details.partDescription || "",
//             // CSV me ye fields nahi hain to default 0/null rakha hai
//             cost: parseFloat(details.cost) || 0,
//             leadTime: parseInt(details.leadTime) || 0,
//             supplierOrderQty: parseInt(details.supplierOrderQty) || 0,
//             companyName: details.companyName || "Default", // Mandatory field handle
//             minStock: parseInt(details.minStock) || 0,
//             availStock: parseInt(details.availStock) || 0,
//             cycleTime: details.cycleTime || null,
//             processOrderRequired: details.processOrderRequired === "true",
//             processId: details.processId || null,
//             processDesc: details.processDesc || null,
//             type: "product",
//             submittedBy: req.user.id,
//           },
//         });

//         // STEP B: Link EXISTING PARTS in ProductTree
//         for (const partRow of parts) {
//           const partNumInCsv = partRow.part_number?.trim();

//           // Database me existing part ko dhundna
//           const existingPartInDb = await prisma.partNumber.findFirst({
//             where: {
//               partNumber: partNumInCsv,
//               type: "part", // Ye component part hai
//               isDeleted: false,
//             },
//           });

//           if (!existingPartInDb) {
//             errors.push(
//               `Row ${productNumber}: Part ${partNumInCsv} not found in database.`
//             );
//             continue;
//           }

//           // Create Product Tree entry (Link Product + Part)
//           await prisma.productTree.create({
//             data: {
//               id: uuidv4().slice(0, 6),
//               product_id: newProductId, // Naya create kiya hua product
//               part_id: existingPartInDb.part_id, // Purana existing part
//               partQuantity: Number(partRow.partQuantity) || 1,
//               processOrderRequired: details.processOrderRequired === "true",
//               instructionRequired:
//                 partRow.instructionRequired?.trim().toUpperCase() === "TRUE",
//               processId:
//                 details.processId || existingPartInDb.processId || null,
//             },
//           });

//           // Optional: Update Product according to your createProductNumber logic
//           await prisma.partNumber.update({
//             where: { part_id: newProductId },
//             data: {
//               processId: details.processId || existingPartInDb.processId,
//               processOrderRequired: details.processOrderRequired === "true",
//               instructionRequired:
//                 partRow.instructionRequired?.trim().toUpperCase() === "TRUE",
//             },
//           });
//         }

//         successCount++;
//       } catch (err) {
//         errors.push(`Error creating Product ${productNumber}: ${err.message}`);
//       }
//     }

//     if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

//     return res.status(200).json({
//       success: true,
//       message: "Product creation and mapping completed via CSV",
//       summary: {
//         totalProductsInCsv: Object.keys(groupedProducts).length,
//         successfullyCreated: successCount,
//         errorCount: errors.length,
//         errors: errors,
//       },
//     });
//   } catch (error) {
//     console.error(error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Server error", error: error.message });
//   }
// };

// const importProductTree = async (req, res) => {
//   try {
//     const fileData = await fileUploadFunc(req, res);
//     if (!fileData.data)
//       return res
//         .status(400)
//         .json({ success: false, message: "CSV file missing" });

//     const csvFile = fileData.data.find((f) => f.fieldname === "ImportFile");
//     const filePath = csvFile.path;
//     const csvData = [];
//     const stream = fs.createReadStream(filePath).pipe(csv());
//     for await (const row of stream) {
//       csvData.push(row);
//     }

//     if (csvData[0]?.fileName?.toLowerCase().trim() !== "product") {
//       if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid file type." });
//     }

//     const groupedProducts = csvData.reduce((acc, row) => {
//       const pNum = row.product_number?.trim();
//       if (pNum) {
//         if (!acc[pNum]) acc[pNum] = { details: row, bomItems: [] };
//         acc[pNum].bomItems.push(row);
//       }
//       return acc;
//     }, {});

//     let successCount = 0;
//     const errors = [];

//     for (const [pNumber, group] of Object.entries(groupedProducts)) {
//       try {
//         const d = group.details;

//         // --- DYNAMIC PROCESS FIND ---
//         let mainProcId = null;
//         if (d.processName) {
//           const p = await prisma.process.findFirst({
//             where: { processName: d.processName.trim() }, // HARDCODING HATAYI
//           });
//           console.log("pp", p);
//           mainProcId = p?.id || null;
//         }
//         console.log("mainProcIdmainProcId", mainProcId);
//         const product = await prisma.partNumber.upsert({
//           where: { partNumber: pNumber },
//           update: {
//             partFamily: d.partFamily,
//             partDescription: d.partDescription,
//             cost: parseFloat(d.cost) || 0,
//             leadTime: parseInt(d.leadTime) || 0,
//             supplierOrderQty: parseInt(d.supplierOrderQty) || 0,
//             companyName: d.companyName,
//             minStock: parseInt(d.minStock) || 0,
//             availStock: parseInt(d.availStock) || 0,
//             cycleTime: d.cycleTime?.toString(),
//             processOrderRequired:
//               d.processOrderRequired?.toUpperCase() === "TRUE",
//             instructionRequired:
//               d.instructionRequired?.toUpperCase() === "TRUE",
//             processId: mainProcId,
//             processDesc: d.processDesc,
//           },
//           create: {
//             part_id: uuidv4().slice(0, 6),
//             partNumber: pNumber,
//             partFamily: d.partFamily,
//             partDescription: d.partDescription,
//             cost: parseFloat(d.cost) || 0,
//             leadTime: parseInt(d.leadTime) || 0,
//             supplierOrderQty: parseInt(d.supplierOrderQty) || 0,
//             companyName: d.companyName || "Default",
//             minStock: parseInt(d.minStock) || 0,
//             availStock: parseInt(d.availStock) || 0,
//             cycleTime: d.cycleTime?.toString(),
//             processOrderRequired:
//               d.processOrderRequired?.toUpperCase() === "TRUE",
//             instructionRequired:
//               d.instructionRequired?.toUpperCase() === "TRUE",
//             processId: mainProcId,
//             processDesc: d.processDesc,
//             type: "product",
//             submittedBy: req.user.id,
//           },
//         });

//         await prisma.productTree.deleteMany({
//           where: { product_id: product.part_id },
//         });

//         for (const item of group.bomItems) {
//           const bomPartNum = item.bom_partNumber?.trim();
//           if (!bomPartNum) continue;

//           const componentPart = await prisma.partNumber.findFirst({
//             where: { partNumber: bomPartNum, type: "part", isDeleted: false },
//           });

//           if (!componentPart) {
//             errors.push(`Row ${pNumber}: Part ${bomPartNum} not found.`);
//             continue;
//           }

//           // --- BOM PROCESS FIX ---
//           let bomProcId = null;
//           if (item.bom_process) {
//             const bp = await prisma.process.findFirst({
//               where: { processName: item.bom_process.trim() }, // 'name' ko 'processName' kiya
//             });
//             bomProcId = bp?.id || null;
//           }

//           await prisma.productTree.create({
//             data: {
//               id: uuidv4().slice(0, 6),
//               product_id: product.part_id,
//               part_id: componentPart.part_id,
//               partQuantity: parseFloat(item.bom_qty) || 1,
//               instructionRequired:
//                 item.bom_workInstruction?.toUpperCase() === "YES",
//               processId: bomProcId || componentPart.processId,
//             },
//           });
//         }
//         successCount++;
//       } catch (err) {
//         errors.push(`Error creating ${pNumber}: ${err.message}`);
//       }
//     }

//     if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
//     return res.status(200).json({
//       success: true,
//       summary: {
//         total: Object.keys(groupedProducts).length,
//         success: successCount,
//         errors,
//       },
//     });
//   } catch (error) {
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };
const importParts = async (req, res) => {
  let filePath = null;
  try {
    const fileData = await fileUploadFunc(req, res);
    if (fileData.type === "fileNotFound" || !fileData.data) {
      return res
        .status(400)
        .json({ success: false, message: "CSV file is required" });
    }

    const csvFile = fileData.data.find((f) => f.fieldname === "ImportFile");
    filePath = csvFile.path;
    const csvData = [];

    const stream = fs.createReadStream(filePath).pipe(csv());
    for await (const row of stream) {
      csvData.push(row);
    }

    if (
      !csvData[0]?.fileName ||
      csvData[0].fileName.toLowerCase().trim() !== "part"
    ) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: "Invalid file type. Expected 'part'",
      });
    }

    const errors = [];
    const validatedData = [];

    // --- STEP 1: Validation Loop (Partial Success Logic) ---
    for (let index = 0; index < csvData.length; index++) {
      const row = csvData[index];
      const rowNum = index + 2;
      const partNum = row.partNumber?.trim();
      const rowLabel = `Row ${rowNum} (${partNum || "N/A"})`;

      try {
        // 1. Basic Type Validation
        if (!["part", "product"].includes(row.type)) {
          errors.push(`${rowLabel}: Invalid type (must be part or product)`);
          continue; // Skip this row, move to next
        }

        // 2. Duplicate Check
        const existingPart = await prisma.partNumber.findFirst({
          where: { partNumber: partNum, isDeleted: false },
        });
        if (existingPart) {
          errors.push(
            `${rowLabel}: PartNumber '${partNum}' already exists in database`
          );
          continue; // Skip this row, move to next
        }

        // 3. Process Validation
        const process = await prisma.process.findFirst({
          where: { processName: row.processName?.trim(), isDeleted: false },
        });
        if (!process) {
          errors.push(`${rowLabel}: Process '${row.processName}' not found`);
          continue; // Skip this row
        }

        // Agar sab sahi hai toh validated list mein daalein
        validatedData.push({ ...row, processId: process.id });
      } catch (err) {
        errors.push(`${rowLabel}: Internal error - ${err.message}`);
      }
    }

    // --- STEP 2: Insert Only Validated Rows ---
    let successCount = 0;
    for (const row of validatedData) {
      try {
        await prisma.partNumber.create({
          data: {
            part_id: uuidv4(),
            partFamily: row.partFamily,
            partNumber: row.partNumber,
            partDescription: row.partDescription,
            type: row.type,
            cost: parseFloat(row.cost) || 0,
            leadTime: parseInt(row.leadTime) || 0,
            minStock: parseInt(row.minStock) || 0,
            availStock: parseInt(row.availStock) || 0,
            supplierOrderQty: parseInt(row.supplierOrderQty) || 0,
            cycleTime: row.cycleTime,
            processOrderRequired: row.processOrderRequired === "TRUE",
            processDesc: row.processDesc,
            companyName: row.companyName,
            processId: row.processId,
            submittedBy: req.user?.id,
            createdBy: req.user?.id,
          },
        });
        successCount++;
      } catch (dbErr) {
        errors.push(
          `Row ${row.partNumber}: Failed to save to database (${dbErr.message})`
        );
      }
    }

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // --- STEP 3: Return Standardized Summary ---
    // Agar kuch success hua hai toh 201/200, agar sab fail toh 400
    const finalStatus = successCount > 0 ? 201 : 400;
    const finalMessage =
      successCount > 0
        ? `Import completed: ${successCount} parts added.`
        : "Import failed: All rows were invalid or already exist.";

    return res.status(finalStatus).json({
      success: successCount > 0,
      message: finalMessage,
      summary: {
        total: csvData.length,
        success: successCount,
        errorCount: errors.length,
        errors: errors,
      },
    });
  } catch (error) {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return res.status(500).json({ success: false, message: error.message });
  }
};
// const importProductTree = async (req, res) => {
//   try {
//     const fileData = await fileUploadFunc(req, res);
//     if (!fileData.data) {
//       return res
//         .status(400)
//         .json({ success: false, message: "CSV file missing" });
//     }

//     // Frontend se confirmation flag check karna
//     const isConfirmed = req.body.confirmChanges === "true";

//     const csvFile = fileData.data.find((f) => f.fieldname === "ImportFile");
//     const filePath = csvFile.path;
//     const csvData = [];
//     const stream = fs.createReadStream(filePath).pipe(csv());
//     for await (const row of stream) {
//       csvData.push(row);
//     }
//     console.log("csvDatacsvData", csvData);
//     // 1. Grouping Products (CSV se data nikalna)
//     const groupedProducts = csvData.reduce((acc, row) => {
//       // NOTE: CSV Header ka naam 'product_number' hona chahiye
//       const pNum = row.product_number?.trim();
//       if (pNum) {
//         if (!acc[pNum]) acc[pNum] = { details: row, bomItems: [] };
//         acc[pNum].bomItems.push(row);
//       }
//       return acc;
//     }, {});

//     const conflicts = [];
//     console.log("groupedProductsgroupedProducts", groupedProducts);
//     // --- STEP 2: Existence and Comparison Logic ---
//     if (!isConfirmed) {
//       for (const [pNumber, group] of Object.entries(groupedProducts)) {
//         const d = group.details;

//         // Database mein check karein
//         const existing = await prisma.partNumber.findUnique({
//           where: { partNumber: pNumber },
//         });

//         if (existing) {
//           let changes = [];

//           // Helper function to compare values (CSV string vs DB number)
//           const checkChange = (csvVal, dbVal, label) => {
//             const parsedCsv = parseInt(csvVal);
//             if (!isNaN(parsedCsv) && parsedCsv !== dbVal) {
//               return `${label} (Old: ${dbVal} -> New: ${parsedCsv})`;
//             }
//             return null;
//           };

//           const minStockChange = checkChange(
//             d.minStock,
//             existing.minStock,
//             "Minimum Stock"
//           );
//           const leadTimeChange = checkChange(
//             d.leadTime,
//             existing.leadTime,
//             "Lead Days"
//           );
//           const availStockChange = checkChange(
//             d.availStock,
//             existing.availStock,
//             "Available Stock"
//           );
//           // CSV mein header 'supplierOrderQty' ya jo bhi ho use yahan check karein
//           const supplierQtyChange = checkChange(
//             d.supplierOrderQty,
//             existing.supplierOrderQty,
//             "Supplier Order Qty"
//           );

//           if (minStockChange) changes.push(minStockChange);
//           if (leadTimeChange) changes.push(leadTimeChange);
//           if (availStockChange) changes.push(availStockChange);
//           if (supplierQtyChange) changes.push(supplierQtyChange);

//           // Agar product exist karta hai AUR values change ho rahi hain
//           if (changes.length > 0) {
//             conflicts.push({
//               productNumber: pNumber,
//               message: ` Product "${pNumber}" is ALREADY AVAILABLE. You are changing: ${changes.join(
//                 ", "
//               )}.`,
//             });
//           }
//         }
//       }
//     }

//     // --- STEP 3: Agar confirmation chahiye toh 409 bhejien ---
//     if (conflicts.length > 0 && !isConfirmed) {
//       if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
//       return res.status(409).json({
//         success: false,
//         requiresConfirmation: true,
//         conflicts: conflicts,
//         message:
//           "Some products already exist with different values. Confirmation needed.",
//       });
//     }

//     // --- STEP 4: Saving Logic (Agar No conflicts ya Confirmed hai) ---
//     let successCount = 0;
//     const errors = [];

//     for (const [pNumber, group] of Object.entries(groupedProducts)) {
//       try {
//         const d = group.details;

//         let mainProcId = null;
//         if (d.processName) {
//           const p = await prisma.process.findFirst({
//             where: { processName: d.processName.trim(), isDeleted: false },
//           });
//           mainProcId = p?.id || null;
//         }

//         const product = await prisma.partNumber.upsert({
//           where: { partNumber: pNumber },
//           update: {
//             partFamily: d.partFamily,
//             partDescription: d.product_description,
//             cost: parseFloat(d.cost) || 0,
//             leadTime: parseInt(d.leadTime) || 0,
//             supplierOrderQty: parseInt(d.supplierOrderQty) || 0,
//             companyName: d.companyName,
//             minStock: parseInt(d.minStock) || 0,
//             availStock: parseInt(d.availStock) || 0,
//             cycleTime: d.cycleTime?.toString(),
//             processOrderRequired:
//               d.processOrderRequired?.toUpperCase() === "TRUE",
//             instructionRequired:
//               d.instructionRequired?.toUpperCase() === "TRUE",
//             processId: mainProcId,
//             processDesc: d.processDesc,
//             type: "product",
//           },
//           create: {
//             part_id: uuidv4().slice(0, 6),
//             partNumber: pNumber,
//             partFamily: d.partFamily,
//             partDescription: d.product_description,
//             cost: parseFloat(d.cost) || 0,
//             leadTime: parseInt(d.leadTime) || 0,
//             supplierOrderQty: parseInt(d.supplierOrderQty) || 0,
//             companyName: d.companyName || "Default",
//             minStock: parseInt(d.minStock) || 0,
//             availStock: parseInt(d.availStock) || 0,
//             cycleTime: d.cycleTime?.toString(),
//             processOrderRequired:
//               d.processOrderRequired?.toUpperCase() === "TRUE",
//             instructionRequired:
//               d.instructionRequired?.toUpperCase() === "TRUE",
//             processId: mainProcId,
//             processDesc: d.processDesc,
//             type: "product",
//             submittedBy: req.user.id,
//           },
//         });
//         console.log(" d", d);
//         await prisma.productTree.deleteMany({
//           where: { product_id: product.part_id },
//         });
//         const bomDataToInsert = [];

//         for (const item of group.bomItems) {
//           const bomPartNum = item.part_number?.trim();
//           const partInDb = await prisma.partNumber.findFirst({
//             where: { partNumber: bomPartNum, type: "part", isDeleted: false },
//           });

//           if (partInDb) {
//             bomDataToInsert.push({
//               id: uuidv4().slice(0, 6),
//               product_id: product.part_id,
//               part_id: partInDb.part_id,
//               quantity: parseFloat(item.part_qty) || 1,
//               processId: partInDb.processId || mainProcId,
//             });
//           }
//         }

//         if (bomDataToInsert.length > 0) {
//           await prisma.productTree.createMany({ data: bomDataToInsert });
//         }
//         successCount++;
//       } catch (err) {
//         errors.push(`Error in ${pNumber}: ${err.message}`);
//       }
//     }

//     if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
//     return res
//       .status(200)
//       .json({ success: true, summary: { success: successCount, errors } });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// const importProductTree = async (req, res) => {
//   try {
//     const fileData = await fileUploadFunc(req, res);
//     if (!fileData.data) {
//       return res
//         .status(400)
//         .json({ success: false, message: "CSV file missing" });
//     }

//     const isConfirmed = req.body.confirmChanges === "true";
//     const csvFile = fileData.data.find((f) => f.fieldname === "ImportFile");
//     const filePath = csvFile.path;
//     const csvData = [];
//     const stream = fs.createReadStream(filePath).pipe(csv());

//     for await (const row of stream) {
//       csvData.push(row);
//     }

//     // 1. Grouping Products
//     const groupedProducts = csvData.reduce((acc, row) => {
//       const pNum = row.product_number?.trim();
//       if (pNum) {
//         if (!acc[pNum]) acc[pNum] = { details: row, bomItems: [] };
//         acc[pNum].bomItems.push(row);
//       }
//       return acc;
//     }, {});
//     console.log("groupedProductsgroupedProducts", groupedProducts);
//     const conflicts = [];

//     // --- STEP 2: Existence and Comparison Logic (Keeping it as requested) ---
//     if (!isConfirmed) {
//       for (const [pNumber, group] of Object.entries(groupedProducts)) {
//         const d = group.details;
//         const existing = await prisma.partNumber.findUnique({
//           where: { partNumber: pNumber },
//         });

//         if (existing) {
//           let changes = [];
//           const checkChange = (csvVal, dbVal, label) => {
//             const parsedCsv = parseInt(csvVal);
//             if (!isNaN(parsedCsv) && parsedCsv !== dbVal) {
//               return `${label} (Old: ${dbVal} -> New: ${parsedCsv})`;
//             }
//             return null;
//           };

//           const minStockChange = checkChange(
//             d.minStock,
//             existing.minStock,
//             "Minimum Stock"
//           );
//           const leadTimeChange = checkChange(
//             d.leadTime,
//             existing.leadTime,
//             "Lead Days"
//           );
//           const availStockChange = checkChange(
//             d.availStock,
//             existing.availStock,
//             "Available Stock"
//           );
//           const supplierQtyChange = checkChange(
//             d.supplierOrderQty,
//             existing.supplierOrderQty,
//             "Supplier Order Qty"
//           );

//           if (minStockChange) changes.push(minStockChange);
//           if (leadTimeChange) changes.push(leadTimeChange);
//           if (availStockChange) changes.push(availStockChange);
//           if (supplierQtyChange) changes.push(supplierQtyChange);

//           if (changes.length > 0) {
//             conflicts.push({
//               productNumber: pNumber,
//               message: ` Product "${pNumber}" is ALREADY AVAILABLE. You are changing: ${changes.join(
//                 ", "
//               )}.`,
//             });
//           }
//         }
//       }
//     }

//     if (conflicts.length > 0 && !isConfirmed) {
//       if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
//       return res.status(409).json({
//         success: false,
//         requiresConfirmation: true,
//         conflicts: conflicts,
//         message:
//           "Some products already exist with different values. Confirmation needed.",
//       });
//     }

//     // --- STEP 3: Saving Logic (Mirroring createProductNumber style) ---
//     let successCount = 0;
//     const errors = [];

//     for (const [pNumber, group] of Object.entries(groupedProducts)) {
//       try {
//         const d = group.details;
//         console.log("ths is d,,,,,", d);
//         // Process ID find karna (CSV mein processName hona chahiye)
//         let mainProcId = null;
//         if (d.processName) {
//           const p = await prisma.process.findFirst({
//             where: { processName: d.processName.trim(), isDeleted: false },
//           });
//           mainProcId = p?.id || null;
//         }

//         // Parent Product ko Upsert karna
//         const product = await prisma.partNumber.upsert({
//           where: { partNumber: pNumber },
//           update: {
//             partFamily: d.partFamily,
//             partDescription: d.product_description,
//             cost: parseFloat(d.cost) || 0,
//             leadTime: parseInt(d.leadTime) || 0,
//             supplierOrderQty: parseInt(d.supplierOrderQty) || 0,
//             companyName: d.companyName,
//             minStock: parseInt(d.minStock) || 0,
//             availStock: parseInt(d.availStock) || 0,
//             cycleTime: d.cycleTime?.toString(),
//             processOrderRequired:
//               d.processOrderRequired?.toUpperCase() === "TRUE",
//             instructionRequired:
//               d.instructionRequired?.toUpperCase() === "TRUE",
//             processId: mainProcId,
//             processDesc: d.processDesc,
//             type: "product",
//           },
//           create: {
//             part_id: uuidv4().slice(0, 6),
//             partNumber: pNumber,
//             partFamily: d.partFamily,
//             partDescription: d.product_description,
//             cost: parseFloat(d.cost) || 0,
//             leadTime: parseInt(d.leadTime) || 0,
//             supplierOrderQty: parseInt(d.supplierOrderQty) || 0,
//             companyName: d.companyName || "Default",
//             minStock: parseInt(d.minStock) || 0,
//             availStock: parseInt(d.availStock) || 0,
//             cycleTime: d.cycleTime?.toString(),
//             processOrderRequired:
//               d.processOrderRequired?.toUpperCase() === "TRUE",
//             instructionRequired:
//               d.instructionRequired?.toUpperCase() === "TRUE",
//             processId: mainProcId,
//             processDesc: d.processDesc,
//             type: "product",
//             submittedBy: req.user.id,
//           },
//         });

//         // Purane BOM items delete karna
//         await prisma.productTree.deleteMany({
//           where: { product_id: product.part_id },
//         });

//         // --- BOM Items Loop (Adding parts as per create API) ---
//         for (const item of group.bomItems) {
//           const bomPartNum = item.part_number?.trim();
//           if (!bomPartNum) continue;

//           // Part Table se part find karna (Jaise create API mein ho raha hai)
//           const partInDb = await prisma.partNumber.findFirst({
//             where: {
//               partNumber: bomPartNum,
//               type: "part",
//               isDeleted: false,
//             },
//           });

//           if (partInDb) {
//             // 1. Create Product Tree entry
//             await prisma.productTree.create({
//               data: {
//                 id: uuidv4().slice(0, 6),
//                 product_id: product.part_id,
//                 part_id: partInDb.part_id,
//                 processId: mainProcId,

//                 partQuantity: parseFloat(item.part_qty) || 1, // field name matched with your create API
//                 processOrderRequired:
//                   item.processOrderRequired?.toUpperCase() === "TRUE",
//                 instructionRequired:
//                   item.instructionRequired?.toUpperCase() === "TRUE",
//               },
//             });

//             // 2. Update Parent Product flags (Jaise aapki create API loop ke andar karti hai)
//             await prisma.partNumber.update({
//               where: { part_id: product.part_id },
//               data: {
//                 processId: mainProcId,
//                 processOrderRequired:
//                   item.processOrderRequired?.toUpperCase() === "TRUE",
//                 instructionRequired:
//                   item.instructionRequired?.toUpperCase() === "TRUE",
//               },
//             });
//           } else {
//             console.log(`Part ${bomPartNum} not found for product ${pNumber}`);
//           }
//         }
//         successCount++;
//       } catch (err) {
//         errors.push(`Error in ${pNumber}: ${err.message}`);
//       }
//     }

//     if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
//     return res.status(200).json({
//       success: true,
//       summary: { success: successCount, errors },
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };
// const importProductTree = async (req, res) => {
//   try {
//     const fileData = await fileUploadFunc(req, res);
//     if (!fileData.data) {
//       return res
//         .status(400)
//         .json({ success: false, message: "CSV file missing" });
//     }

//     const isConfirmed = req.body.confirmChanges === "true";
//     const csvFile = fileData.data.find((f) => f.fieldname === "ImportFile");
//     const filePath = csvFile.path;
//     const csvData = [];
//     const stream = fs.createReadStream(filePath).pipe(csv());

//     for await (const row of stream) {
//       csvData.push(row);
//     }

//     // 1. Grouping Products (CSV se data nikalna)
//     const groupedProducts = csvData.reduce((acc, row) => {
//       const pNum = row.product_number?.trim();
//       if (pNum) {
//         if (!acc[pNum]) acc[pNum] = { details: row, bomItems: [] };
//         acc[pNum].bomItems.push(row);
//       }
//       return acc;
//     }, {});

//     const conflicts = [];

//     // --- STEP 2: Existence and Comparison Logic (Quantity Check Added) ---
//     if (!isConfirmed) {
//       for (const [pNumber, group] of Object.entries(groupedProducts)) {
//         // Database mein product aur uske existing parts (BOM) ko fetch karein
//         const existing = await prisma.partNumber.findUnique({
//           where: { partNumber: pNumber },
//           include: {
//             ProductTree: {
//               include: { part: true }, // Part ki details bhi chahiye comparison ke liye
//             },
//           },
//         });

//         if (existing) {
//           let changes = [];
//           const checkChange = (csvVal, dbVal, label) => {
//             const parsedCsv = parseInt(csvVal);
//             if (!isNaN(parsedCsv) && parsedCsv !== dbVal) {
//               return `${label} (Old: ${dbVal} -> New: ${parsedCsv})`;
//             }
//             return null;
//           };

//           // Basic fields check
//           const fields = [
//             {
//               csv: group.details.minStock,
//               db: existing.minStock,
//               lbl: "Min Stock",
//             },
//             {
//               csv: group.details.leadTime,
//               db: existing.leadTime,
//               lbl: "Lead Days",
//             },
//             {
//               csv: group.details.availStock,
//               db: existing.availStock,
//               lbl: "Avail Stock",
//             },
//             {
//               csv: group.details.supplierOrderQty,
//               db: existing.supplierOrderQty,
//               lbl: "Supplier Qty",
//             },
//           ];

//           fields.forEach((f) => {
//             const msg = checkChange(f.csv, f.db, f.lbl);
//             if (msg) changes.push(msg);
//           });

//           // --- Part Quantity Change Detection ---
//           for (const csvItem of group.bomItems) {
//             const csvPartNum = csvItem.part_number?.trim();
//             const csvQty = parseInt(csvItem.part_qty) || 0;

//             // Database mein check karein ki kya ye part is product mein pehle se hai
//             const existingBOMEntry = existing.ProductTree.find(
//               (pt) => pt.part?.partNumber === csvPartNum
//             );

//             if (existingBOMEntry) {
//               if (existingBOMEntry.partQuantity !== csvQty) {
//                 changes.push(
//                   `Qty for ${csvPartNum} (Old: ${existingBOMEntry.partQuantity} -> New: ${csvQty})`
//                 );
//               }
//             }
//           }

//           if (changes.length > 0) {
//             conflicts.push({
//               productNumber: pNumber,
//               message: `Product "${pNumber}" changes detected: ${changes.join(
//                 ", "
//               )}`,
//             });
//           }
//         }
//       }
//     }

//     if (conflicts.length > 0 && !isConfirmed) {
//       if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
//       return res.status(409).json({
//         success: false,
//         requiresConfirmation: true,
//         conflicts: conflicts,
//         message: "Some quantities or values have changed. Confirmation needed.",
//       });
//     }

//     // --- STEP 3: Saving Logic (Creating Product and updating BOM Qty) ---
//     let successCount = 0;
//     const errors = [];

//     for (const [pNumber, group] of Object.entries(groupedProducts)) {
//       try {
//         const d = group.details;
//         let mainProcId = null;
//         if (d.processName) {
//           const p = await prisma.process.findFirst({
//             where: { processName: d.processName.trim(), isDeleted: false },
//           });
//           mainProcId = p?.id || null;
//         }

//         // 1. Parent Product ko Upsert karein
//         const product = await prisma.partNumber.upsert({
//           where: { partNumber: pNumber },
//           update: {
//             partFamily: d.partFamily,
//             partDescription: d.product_description,
//             cost: parseFloat(d.cost) || 0,
//             leadTime: parseInt(d.leadTime) || 0,
//             supplierOrderQty: parseInt(d.supplierOrderQty) || 0,
//             companyName: d.companyName,
//             minStock: parseInt(d.minStock) || 0,
//             availStock: parseInt(d.availStock) || 0,
//             processId: mainProcId,
//             processDesc: d.processDesc,
//             type: "product",
//             processOrderRequired:
//               d.processOrderRequired?.toUpperCase() === "TRUE",
//             instructionRequired:
//               d.instructionRequired?.toUpperCase() === "TRUE",
//           },
//           create: {
//             part_id: uuidv4().slice(0, 6),
//             partNumber: pNumber,
//             partFamily: d.partFamily,
//             partDescription: d.product_description,
//             cost: parseFloat(d.cost) || 0,
//             leadTime: parseInt(d.leadTime) || 0,
//             supplierOrderQty: parseInt(d.supplierOrderQty) || 0,
//             companyName: d.companyName || "Default",
//             minStock: parseInt(d.minStock) || 0,
//             availStock: parseInt(d.availStock) || 0,
//             processId: mainProcId,
//             processDesc: d.processDesc,
//             type: "product",
//             submittedBy: req.user.id,
//             processOrderRequired:
//               d.processOrderRequired?.toUpperCase() === "TRUE",
//             instructionRequired:
//               d.instructionRequired?.toUpperCase() === "TRUE",
//           },
//         });

//         // 2. Purane Product Tree (BOM) ko delete karein taaki nayi qty replace ho sake
//         await prisma.ProductTree.deleteMany({
//           where: { product_id: product.part_id },
//         });

//         // 3. Naye BOM items add karein
//         for (const item of group.bomItems) {
//           const bomPartNum = item.part_number?.trim();
//           if (!bomPartNum) continue;

//           // Part Table se part find karein uski part_id nikalne ke liye
//           const partInDb = await prisma.partNumber.findFirst({
//             where: { partNumber: bomPartNum, type: "part", isDeleted: false },
//           });

//           if (partInDb) {
//             await prisma.ProductTree.create({
//               data: {
//                 id: uuidv4().slice(0, 6),
//                 product_id: product.part_id,
//                 part_id: partInDb.part_id,
//                 partQuantity: parseInt(item.part_qty) || 1, // Yahan replace ho rahi hai qty
//                 processId: mainProcId,
//                 processOrderRequired:
//                   item.processOrderRequired?.toUpperCase() === "TRUE",
//                 instructionRequired:
//                   item.instructionRequired?.toUpperCase() === "TRUE",
//               },
//             });

//             // Parent Product ko update karein flags ke liye (Jaise create API mein tha)
//             await prisma.partNumber.update({
//               where: { part_id: product.part_id },
//               data: {
//                 processOrderRequired:
//                   item.processOrderRequired?.toUpperCase() === "TRUE",
//                 instructionRequired:
//                   item.instructionRequired?.toUpperCase() === "TRUE",
//               },
//             });
//           }
//         }
//         successCount++;
//       } catch (err) {
//         errors.push(`Error in ${pNumber}: ${err.message}`);
//       }
//     }

//     if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
//     return res
//       .status(200)
//       .json({ success: true, summary: { success: successCount, errors } });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// const importProductTree = async (req, res) => {
//   try {
//     const fileData = await fileUploadFunc(req, res);
//     if (!fileData.data) {
//       return res
//         .status(400)
//         .json({ success: false, message: "CSV file missing" });
//     }

//     const isConfirmed = req.body.confirmChanges === "true";
//     const csvFile = fileData.data.find((f) => f.fieldname === "ImportFile");
//     const filePath = csvFile.path;
//     const csvData = [];
//     const stream = fs.createReadStream(filePath).pipe(csv());

//     for await (const row of stream) {
//       csvData.push(row);
//     }

//     // 1. Grouping Products
//     const groupedProducts = csvData.reduce((acc, row) => {
//       const pNum = row.product_number?.trim();
//       if (pNum) {
//         if (!acc[pNum]) acc[pNum] = { details: row, bomItems: [] };
//         acc[pNum].bomItems.push(row);
//       }
//       return acc;
//     }, {});

//     const conflicts = [];

//     // --- STEP 2: Conflict Check (Ab isme Part ka minStock comparison bhi hai) ---
//     if (!isConfirmed) {
//       for (const [pNumber, group] of Object.entries(groupedProducts)) {
//         const d = group.details;
//         const existingProduct = await prisma.partNumber.findUnique({
//           where: { partNumber: pNumber },
//         });

//         let changes = [];

//         // Product Level Check (Min Stock, Lead Time etc.)
//         if (existingProduct) {
//           const checkChange = (csvVal, dbVal, label) => {
//             const parsedCsv = parseInt(csvVal);
//             if (!isNaN(parsedCsv) && parsedCsv !== dbVal) {
//               return `${label} (Old: ${dbVal} -> New: ${parsedCsv})`;
//             }
//             return null;
//           };

//           const pMinStock = checkChange(
//             d.minStock,
//             existingProduct.minStock,
//             "Product Min Stock"
//           );
//           if (pMinStock) changes.push(pMinStock);
//         }

//         // --- Part Level Check: Kya part_qty purane part ke minStock se alag hai? ---
//         for (const item of group.bomItems) {
//           const partInDb = await prisma.partNumber.findFirst({
//             where: {
//               partNumber: item.part_number?.trim(),
//               type: "part",
//               isDeleted: false,
//             },
//           });

//           if (partInDb) {
//             const csvPartQty = parseInt(item.part_qty) || 0;
//             if (partInDb.minStock !== csvPartQty) {
//               changes.push(
//                 `Part ${item.part_number} MinStock (Old: ${partInDb.minStock} -> New: ${csvPartQty})`
//               );
//             }
//           }
//         }

//         if (changes.length > 0) {
//           conflicts.push({
//             productNumber: pNumber,
//             message: `Changes: ${changes.join(", ")}`,
//           });
//         }
//       }
//     }

//     if (conflicts.length > 0 && !isConfirmed) {
//       if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
//       return res
//         .status(409)
//         .json({ success: false, requiresConfirmation: true, conflicts });
//     }

//     // --- STEP 3: Saving Logic ---
//     let successCount = 0;
//     const errors = [];

//     for (const [pNumber, group] of Object.entries(groupedProducts)) {
//       try {
//         const d = group.details;
//         let mainProcId = null;
//         if (d.processName) {
//           const p = await prisma.process.findFirst({
//             where: { processName: d.processName.trim(), isDeleted: false },
//           });
//           mainProcId = p?.id || null;
//         }

//         // 1. Upsert Parent Product
//         const product = await prisma.partNumber.upsert({
//           where: { partNumber: pNumber },
//           update: {
//             partFamily: d.partFamily,
//             partDescription: d.product_description,
//             minStock: parseInt(d.minStock) || 0, // Product ka minStock CSV ke minStock column se
//             cost: parseFloat(d.cost) || 0,
//             processId: mainProcId,
//             isProductSchedule: d.isProductSchedule,
//             type: "product",
//           },
//           create: {
//             part_id: uuidv4().slice(0, 6),
//             partNumber: pNumber,
//             partFamily: d.partFamily,
//             partDescription: d.product_description,
//             minStock: parseInt(d.minStock) || 0,
//             cost: parseFloat(d.cost) || 0,
//             processId: mainProcId,
//             isProductSchedule: d.isProductSchedule,
//             type: "product",
//             companyName: d.companyName || "Default",
//             submittedBy: req.user.id,
//           },
//         });

//         // 2. BOM Items process karein
//         await prisma.ProductTree.deleteMany({
//           where: { product_id: product.part_id },
//         });

//         for (const item of group.bomItems) {
//           const bomPartNum = item.part_number?.trim();
//           const csvPartQty = parseInt(item.part_qty) || 1; // Ye value part ka minStock banegi

//           if (!bomPartNum) continue;

//           // A. Database mein us Part Number ko dhundein aur uska minStock update karein
//           const partInDb = await prisma.partNumber.findFirst({
//             where: { partNumber: bomPartNum, type: "part", isDeleted: false },
//           });

//           if (partInDb) {
//             // Part table mein minStock update kar rahe hain as per your requirement
//             await prisma.partNumber.update({
//               where: { part_id: partInDb.part_id },
//               data: { minStock: csvPartQty },
//             });

//             // B. Product Tree (BOM) mein entry karein
//             await prisma.ProductTree.create({
//               data: {
//                 id: uuidv4().slice(0, 6),
//                 product_id: product.part_id,
//                 part_id: partInDb.part_id,
//                 partQuantity: csvPartQty, // ProductTree mein bhi wahi qty
//                 processId: partInDb.processId || mainProcId,
//                 processOrderRequired:
//                   item.processOrderRequired?.toUpperCase() === "TRUE",
//                 instructionRequired:
//                   item.instructionRequired?.toUpperCase() === "TRUE",
//               },
//             });
//           }
//         }
//         successCount++;
//       } catch (err) {
//         errors.push(`Error in ${pNumber}: ${err.message}`);
//       }
//     }

//     if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
//     return res
//       .status(200)
//       .json({ success: true, summary: { success: successCount, errors } });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

const importProductTree = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);
    if (!fileData.data) {
      return res
        .status(400)
        .json({ success: false, message: "CSV file missing" });
    }

    const isConfirmed = req.body.confirmChanges === "true";
    const csvFile = fileData.data.find((f) => f.fieldname === "ImportFile");
    const filePath = csvFile.path;
    const csvData = [];
    const stream = fs.createReadStream(filePath).pipe(csv());

    for await (const row of stream) {
      csvData.push(row);
    }

    // 1. Grouping Products (CSV se data extract karna)
    const groupedProducts = csvData.reduce((acc, row) => {
      const pNum = row.product_number?.trim();
      if (pNum) {
        if (!acc[pNum]) acc[pNum] = { details: row, bomItems: [] };
        acc[pNum].bomItems.push(row);
      }
      return acc;
    }, {});

    const conflicts = [];

    // --- STEP 2: Conflict Check (Sirf reference ke liye) ---
    if (!isConfirmed) {
      for (const [pNumber, group] of Object.entries(groupedProducts)) {
        const existing = await prisma.partNumber.findUnique({
          where: { partNumber: pNumber },
        });

        if (existing) {
          // Aap chahen toh yahan purane changes check kar sakte hain
          // Filhal basic conflict alert bhej rahe hain
          conflicts.push({
            productNumber: pNumber,
            message: `Product "${pNumber}" already exists. Importing will overwrite its BOM.`,
          });
        }
      }
    }

    if (conflicts.length > 0 && !isConfirmed) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res
        .status(409)
        .json({ success: false, requiresConfirmation: true, conflicts });
    }

    // --- STEP 3: Saving Logic (createProductNumber ke jaisa) ---
    let successCount = 0;
    const errors = [];

    for (const [pNumber, group] of Object.entries(groupedProducts)) {
      try {
        const d = group.details;

        // Process ID find karna (CSV mein processName column hona chahiye)
        let mainProcId = null;
        if (d.processName) {
          const p = await prisma.process.findFirst({
            where: { processName: d.processName.trim(), isDeleted: false },
          });
          mainProcId = p?.id || null;
        }

        // 1. Product ko Upsert karein (Type: product)
        const product = await prisma.partNumber.upsert({
          where: { partNumber: pNumber },
          update: {
            partFamily: d.partFamily,
            partDescription: d.product_description,
            cost: parseFloat(d.cost) || 0,
            leadTime: parseInt(d.leadTime) || 0,
            supplierOrderQty: parseInt(d.supplierOrderQty) || 0,
            companyName: d.companyName,
            minStock: parseInt(d.minStock) || 0,
            availStock: parseInt(d.availStock) || 0,
            processId: mainProcId || d.processId,
            processDesc: d.processDesc,
            type: "product",
            isProductSchedule: d.isProductSchedule?.toUpperCase() === "TRUE",
            processOrderRequired:
              d.processOrderRequired?.toUpperCase() === "TRUE",
            instructionRequired:
              d.instructionRequired?.toUpperCase() === "TRUE",
          },
          create: {
            part_id: uuidv4().slice(0, 6),
            partNumber: pNumber,
            partFamily: d.partFamily,
            partDescription: d.product_description,
            cost: parseFloat(d.cost) || 0,
            leadTime: parseInt(d.leadTime) || 0,
            supplierOrderQty: parseInt(d.supplierOrderQty) || 0,
            companyName: d.companyName || "Default",
            minStock: parseInt(d.minStock) || 0,
            availStock: parseInt(d.availStock) || 0,
            processId: mainProcId || d.processId,
            processDesc: d.processDesc,
            type: "product",
            isProductSchedule: d.isProductSchedule?.toUpperCase() === "TRUE",
            processOrderRequired:
              d.processOrderRequired?.toUpperCase() === "TRUE",
            instructionRequired:
              d.instructionRequired?.toUpperCase() === "TRUE",
            submittedBy: req.user.id,
          },
        });

        // 2. Purane BOM items (ProductTree) delete karein
        await prisma.productTree.deleteMany({
          where: { product_id: product.part_id },
        });

        // 3. Naye Parts ko ProductTree mein link karein (Original Part touch nahi hoga)
        for (const item of group.bomItems) {
          const bomPartNum = item.part_number?.trim();
          if (!bomPartNum) continue;

          // Check karein ki component part exist karta hai
          const componentPart = await prisma.partNumber.findFirst({
            where: { partNumber: bomPartNum, type: "part", isDeleted: false },
          });

          if (componentPart) {
            await prisma.productTree.create({
              data: {
                id: uuidv4().slice(0, 6),
                product_id: product.part_id, // Parent Product ID
                part_id: componentPart.part_id, // Original Component ID
                partQuantity: Number(item.part_qty) || 1, // Quantity from CSV
                processId: componentPart.processId || mainProcId,
                processOrderRequired: componentPart.processOrderRequired,
                instructionRequired:
                  item.instructionRequired?.toUpperCase() === "TRUE",
              },
            });
            // Yahan humne prisma.partNumber.update nahi chalaya,
            // toh original part ka minStock/data change nahi hoga.
          } else {
            console.log(
              `Component part ${bomPartNum} not found in DB for product ${pNumber}`
            );
          }
        }
        successCount++;
      } catch (err) {
        errors.push(`Error in ${pNumber}: ${err.message}`);
      }
    }

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return res
      .status(200)
      .json({ success: true, summary: { success: successCount, errors } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
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
            message: `Invalid file type. Expected 'employee', but got '${
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
                  reason: `Customer with this email(${row.email}) or phone number(${row.customerPhone}) already exists. `,
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
