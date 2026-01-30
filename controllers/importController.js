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
      (file) => file.fieldname === "ImportFile",
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
              `Row ${result.reason.index + 2}: ${result.reason.reason}`,
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
//   let filePath = null;
//   try {
//     const fileData = await fileUploadFunc(req, res);
//     if (fileData.type === "fileNotFound" || !fileData.data) {
//       return res
//         .status(400)
//         .json({ success: false, message: "CSV file is required" });
//     }

//     const csvFile = fileData.data.find((f) => f.fieldname === "ImportFile");
//     filePath = csvFile.path;
//     const csvData = [];

//     const stream = fs.createReadStream(filePath).pipe(csv());
//     for await (const row of stream) {
//       csvData.push(row);
//     }

//     if (
//       !csvData[0]?.fileName ||
//       csvData[0].fileName.toLowerCase().trim() !== "part"
//     ) {
//       if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
//       return res.status(400).json({
//         success: false,
//         message: "Invalid file type. Expected 'part'",
//       });
//     }

//     const errors = [];
//     const validatedData = [];

//     for (let index = 0; index < csvData.length; index++) {
//       const row = csvData[index];
//       const rowNum = index + 2;
//       const partNum = row.partNumber?.trim();
//       const rowLabel = `Row ${rowNum} (${partNum || "N/A"})`;

//       try {
//         if (!["part", "product"].includes(row.type)) {
//           errors.push(`${rowLabel}: Invalid type (must be part or product)`);
//           continue;
//         }

//         const existingPart = await prisma.partNumber.findFirst({
//           where: { partNumber: partNum, isDeleted: false },
//         });
//         if (existingPart) {
//           errors.push(
//             `${rowLabel}: PartNumber '${partNum}' already exists in database`,
//           );
//           continue;
//         }

//         const process = await prisma.process.findFirst({
//           where: { processName: row.processName?.trim(), isDeleted: false },
//         });
//         if (!process) {
//           errors.push(`${rowLabel}: Process '${row.processName}' not found`);
//           continue; // Skip this row
//         }

//         // Agar sab sahi hai toh validated list mein daalein
//         validatedData.push({ ...row, processId: process.id });
//       } catch (err) {
//         errors.push(`${rowLabel}: Internal error - ${err.message}`);
//       }
//     }
//     console.log("instructionRequiredinstructionRequired", validatedData);
//     let successCount = 0;
//     for (const row of validatedData) {
//       try {
//         await prisma.partNumber.create({
//           data: {
//             part_id: uuidv4(),
//             partFamily: row.partFamily,
//             partNumber: row.partNumber,
//             partDescription: row.partDescription,
//             type: row.type,
//             cost: parseFloat(row.cost) || 0,
//             leadTime: parseInt(row.leadTime) || 0,
//             minStock: parseInt(row.minStock) || 0,
//             availStock: parseInt(row.availStock) || 0,
//             supplierOrderQty: parseInt(row.supplierOrderQty) || 0,
//             cycleTime: row.cycleTime,
//             processOrderRequired: row.processOrderRequired === "TRUE",
//             instructionRequired: row.instructionRequired === "TRUE",
//             processDesc: row.processDesc,
//             companyName: row.companyName,
//             processId: row.processId,
//             submittedBy: req.user?.id,
//             createdBy: req.user?.id,
//           },
//         });
//         successCount++;
//       } catch (dbErr) {
//         errors.push(
//           `Row ${row.partNumber}: Failed to save to database (${dbErr.message})`,
//         );
//       }
//     }

//     if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

//     // --- STEP 3: Return Standardized Summary ---
//     // Agar kuch success hua hai toh 201/200, agar sab fail toh 400
//     const finalStatus = successCount > 0 ? 201 : 400;
//     const finalMessage =
//       successCount > 0
//         ? `Import completed: ${successCount} parts added.`
//         : "Import failed: All rows were invalid or already exist.";

//     return res.status(finalStatus).json({
//       success: successCount > 0,
//       message: finalMessage,
//       summary: {
//         total: csvData.length,
//         success: successCount,
//         errorCount: errors.length,
//         errors: errors,
//       },
//     });
//   } catch (error) {
//     if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
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

    // Basic Validation: Check if it's the correct file template
    if (
      !csvData[0]?.fileName ||
      csvData[0].fileName.toLowerCase().trim() !== "part"
    ) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: "Invalid file type. Expected template for 'part'",
      });
    }

    const errors = [];
    const validatedData = [];
    console.log("csvDatacsvData", csvData);

    for (let index = 0; index < csvData.length; index++) {
      const row = csvData[index];
      const rowNum = index + 2;
      const partNum = row.partNumber?.trim();
      const csvCompName = row.companyName?.trim();
      const rowLabel = `Row ${rowNum} (${partNum || "N/A"})`;

      try {
        if (!["part", "product"].includes(row.type)) {
          errors.push(`${rowLabel}: Invalid type (must be part or product)`);
          continue;
        }

        const existingPart = await prisma.partNumber.findFirst({
          where: { partNumber: partNum, isDeleted: false },
        });
        if (existingPart) {
          errors.push(`${rowLabel}: PartNumber '${partNum}' already exists`);
          continue;
        }

        // --- 1. Supplier (Company) ID Lookup ---
        let supplierId = null;
        if (csvCompName) {
          // नाम को स्पेस से अलग करें (e.g., "testsupplier jatav" -> ["testsupplier", "jatav"])
          const nameParts = csvCompName.split(" ");
          const firstPart = nameParts[0];
          const lastPart =
            nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

          const supplier = await prisma.suppliers.findFirst({
            where: {
              OR: [
                // 1. अगर पूरा नाम firstName में मैच हो जाए
                { companyName: { contains: csvCompName } },
                // 3. अगर पहला हिस्सा firstName में और आखिरी lastName में हो
                {
                  AND: [
                    { firstName: { contains: firstPart } },
                    { lastName: { contains: lastPart } },
                  ],
                },
              ],
              isDeleted: false,
            },
          });

          if (supplier) {
            supplierId = supplier.id;
          } else {
            errors.push(
              `${rowLabel}: Supplier '${csvCompName}' not found in database`,
            );
            continue;
          }
        }
        console.log("rowrow", row);
        // --- 2. Process ID Lookup ---
        let processId = null;
        if (row.processName) {
          const process = await prisma.process.findFirst({
            where: { processName: row.processName.trim(), isDeleted: false },
          });
          if (process) {
            processId = process.id;
          } else {
            errors.push(`${rowLabel}: Process '${row.processName}' not found`);
            continue;
          }
        }

        validatedData.push({
          ...row,
          processId: processId,
          companyId: supplierId,
        });
      } catch (err) {
        errors.push(`${rowLabel}: Internal error - ${err.message}`);
      }
    }

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
            processOrderRequired:
              row.processOrderRequired?.toUpperCase() === "TRUE",
            instructionRequired:
              row.instructionRequired?.toUpperCase() === "TRUE",
            processDesc: row.processDesc,
            companyName: row.companyId, // Saving the ID here
            processId: row.processId,
            submittedBy: req.user?.id,
            createdBy: req.user?.id,
          },
        });
        successCount++;
      } catch (dbErr) {
        errors.push(`Row ${row.partNumber}: Failed to save - ${dbErr.message}`);
      }
    }

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    return res.status(successCount > 0 ? 201 : 400).json({
      success: successCount > 0,
      message: `Import completed: ${successCount} entries added.`,
      summary: {
        total: csvData.length,
        success: successCount,
        errorCount: errors.length,
        errors,
      },
    });
  } catch (error) {
    console.log("errorerror", error);
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return res.status(500).json({ success: false, message: error.message });
  }
};
// const importProductTree = async (req, res) => {
//   try {
//     // 1. File Upload handling (Multipart)
//     const fileData = await fileUploadFunc(req, res);
//     if (!fileData || !fileData.data) {
//       return res
//         .status(400)
//         .json({ success: false, message: "CSV file missing" });
//     }
//     let rowIndex = 2;
//     // CSV file aur Images ko alag alag nikaalna (Jaise createProductNumber me hai)
//     const csvFile = fileData.data.find((f) => f.fieldname === "ImportFile");
//     console.log("csvFilecsvFile", csvFile);
//     const getPartImages = fileData.data.filter(
//       (file) => file.fieldname === "partImages",
//     );

//     if (!csvFile) {
//       return res
//         .status(400)
//         .json({ success: false, message: "ImportFile field is required" });
//     }

//     const isConfirmed =
//       req.body.confirmChanges === "true" || req.body.confirmChanges === true;
//     const filePath = csvFile.path;
//     const csvData = [];
//     const stream = fs.createReadStream(filePath).pipe(csv());

//     for await (const row of stream) {
//       csvData.push(row);
//     }

//     // 2. Grouping Products
//     const groupedProducts = csvData.reduce((acc, row) => {
//       const pNum = row.product_number?.trim();
//       if (pNum) {
//         if (!acc[pNum]) acc[pNum] = { details: row, bomItems: [] };
//         acc[pNum].bomItems.push(row);
//       }
//       return acc;
//     }, {});

//     const conflicts = [];

//     // --- STEP 2: Conflict Check (Compare Old vs New) ---
//     if (!isConfirmed) {
//       for (const [pNumber, group] of Object.entries(groupedProducts)) {
//         const existing = await prisma.partNumber.findUnique({
//           where: { partNumber: pNumber },
//         });

//         if (existing) {
//           const d = group.details;
//           const differences = [];
//           const fieldsToCompare = [
//             { key: "minStock", label: "Min Stock" },
//             { key: "leadTime", label: "Lead Time" },
//             { key: "supplierOrderQty", label: "Supplier Order Qty" },
//             { key: "availStock", label: "Available Stock" },
//             { key: "cost", label: "Cost" },
//           ];

//           fieldsToCompare.forEach((field) => {
//             const newValue = parseFloat(d[field.key]) || 0;
//             const oldValue = parseFloat(existing[field.key]) || 0;
//             if (newValue !== oldValue) {
//               differences.push({
//                 field: field.label,
//                 oldValue: oldValue,
//                 newValue: newValue,
//               });
//             }
//           });
//           if (differences.length > 0) {
//             conflicts.push({
//               productNumber: pNumber,
//               csvRow: rowIndex, // Ye row number frontend ko bhejein
//               message: `Product "${pNumber}" already exists...`,
//               changes: differences,
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
//         message: "Some products have existing data that will be overwritten.",
//         conflicts: conflicts,
//       });
//     }

//     // --- STEP 3: Saving Logic (Upsert) ---
//     let successCount = 0;
//     const errors = [];

//     for (const [pNumber, group] of Object.entries(groupedProducts)) {
//       try {
//         const d = group.details;

//         // Process ID find karna (agar processName diya hai)
//         let mainProcId = d.processId || null;
//         if (d.processName) {
//           const p = await prisma.process.findFirst({
//             where: { processName: d.processName.trim(), isDeleted: false },
//           });
//           if (p) mainProcId = p.id;
//         }

//         // Common mapping jo Create aur Update dono me kaam aayegi
//         const commonUpdateData = {
//           partFamily: d.partFamily,
//           partDescription: d.product_description || d.partDescription,
//           cost: parseFloat(d.cost) || 0,
//           leadTime: parseInt(d.leadTime) || 0,
//           supplierOrderQty: parseInt(d.supplierOrderQty) || 0,
//           companyName: d.companyName || "Default",
//           minStock: parseInt(d.minStock) || 0,
//           availStock: parseInt(d.availStock) || 0,
//           processId: mainProcId,
//           type: "product",
//           // isProductSchedule: d.isProductSchedule?.toUpperCase() === "TRUE",

//           processOrderRequired:
//             d.processOrderRequired?.toString().toLowerCase() === "true" ||
//             d.processOrderRequired === "1",
//           instructionRequired:
//             d.instructionRequired?.toString().toLowerCase() === "true" ||
//             d.instructionRequired === "1",

//           isDeleted: false,
//         };

//         const product = await prisma.partNumber.upsert({
//           where: { partNumber: pNumber },
//           update: commonUpdateData,
//           create: {
//             ...commonUpdateData,
//             part_id: uuidv4().slice(0, 6),
//             partNumber: pNumber,
//             submittedBy: req.user.id,
//             // Naya product banne par images add hongi
//             partImages: {
//               create: getPartImages?.map((img) => ({
//                 imageUrl: img.filename,
//                 type: "product",
//               })),
//             },
//           },
//         });

//         // BOM Update logic: Pehle purane relations delete karein
//         await prisma.productTree.deleteMany({
//           where: { product_id: product.part_id },
//         });

//         // Naye BOM items insert karein
//         for (const item of group.bomItems) {
//           const bomPartNum = item.part_number?.trim();
//           if (!bomPartNum) continue;

//           // Check if component exists
//           const componentPart = await prisma.partNumber.findFirst({
//             where: { partNumber: bomPartNum, isDeleted: false },
//           });

//           if (componentPart) {
//             console.log("componentPart", componentPart);
//             await prisma.productTree.create({
//               data: {
//                 id: uuidv4().slice(0, 6),
//                 product_id: product.part_id,
//                 part_id: componentPart.part_id,
//                 partQuantity: Number(item.part_qty) || 1,
//                 // Inhe component se fetch kar rahe hain jaise first function me tha
//                 processId: componentPart.processId,
//                 processOrderRequired:
//                   componentPart.processOrderRequired
//                     ?.toString()
//                     .toLowerCase() === "true" ||
//                   componentPart.processOrderRequired === "1",
//                 instructionRequired:
//                   componentPart.instructionRequired
//                     ?.toString()
//                     .toLowerCase() === "true" ||
//                   componentPart.instructionRequired === "1",

//                 createdBy: req.user.id,
//               },
//             });
//           }
//         }
//         successCount++;
//       } catch (err) {
//         errors.push(`Error in ${pNumber}: ${err.message}`);
//       }
//     }

//     // Cleanup CSV file
//     if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

//     return res.status(200).json({
//       success: true,
//       summary: { success: successCount, errors },
//     });
//   } catch (error) {
//     console.error("Import Error:", error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };
const importProductTree = async (req, res) => {
  let filePath = null;
  try {
    const fileData = await fileUploadFunc(req, res);
    if (!fileData || !fileData.data) {
      return res
        .status(400)
        .json({ success: false, message: "CSV file missing" });
    }

    const csvFile = fileData.data.find((f) => f.fieldname === "ImportFile");
    const getPartImages = fileData.data.filter(
      (f) => f.fieldname === "partImages",
    );

    if (!csvFile) {
      return res
        .status(400)
        .json({ success: false, message: "ImportFile field is required" });
    }

    filePath = csvFile.path;
    const isConfirmed =
      req.body.confirmChanges === "true" || req.body.confirmChanges === true;
    const csvData = [];
    const stream = fs.createReadStream(filePath).pipe(csv());

    for await (const row of stream) {
      csvData.push(row);
    }

    // Grouping rows by Product Number
    const groupedProducts = csvData.reduce((acc, row) => {
      const pNum = row.product_number?.trim();
      if (pNum) {
        if (!acc[pNum]) acc[pNum] = { details: row, bomItems: [] };
        acc[pNum].bomItems.push(row);
      }
      return acc;
    }, {});

    // Conflict Check
    const conflicts = [];
    if (!isConfirmed) {
      for (const [pNumber, group] of Object.entries(groupedProducts)) {
        const existing = await prisma.partNumber.findUnique({
          where: { partNumber: pNumber },
        });
        if (existing) {
          const d = group.details;
          const diffs = [];
          if (parseFloat(d.minStock) !== existing.minStock)
            diffs.push("Min Stock");
          if (parseFloat(d.cost) !== existing.cost) diffs.push("Cost");
          if (diffs.length > 0)
            conflicts.push({ productNumber: pNumber, changes: diffs });
        }
      }
    }

    if (conflicts.length > 0 && !isConfirmed) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res
        .status(409)
        .json({ success: false, requiresConfirmation: true, conflicts });
    }

    let successCount = 0;
    const errors = [];

    for (const [pNumber, group] of Object.entries(groupedProducts)) {
      try {
        const d = group.details;
        const csvCompName = d.companyName?.trim();

        // --- 1. Supplier (Company) ID Lookup ---
        let supplierId = null;
        if (csvCompName) {
          // नाम को Split करें (e.g., "testsupplier jatav" -> fPart: "testsupplier", lPart: "jatav")
          const nameParts = csvCompName.split(" ");
          const fPart = nameParts[0];
          const lPart =
            nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

          const foundSupplier = await prisma.suppliers.findFirst({
            where: {
              OR: [
                { companyName: { contains: csvCompName } }, // पूरा नाम firstName में हो

                {
                  AND: [
                    { firstName: { contains: fPart } }, // पहला हिस्सा firstName में
                    { lastName: { contains: lPart } }, // आखिरी हिस्सा lastName में
                  ],
                },
              ],
              isDeleted: false,
            },
          });
          if (foundSupplier) {
            supplierId = foundSupplier.id;
          }
        }

        // --- 2. Main Process Lookup ---
        let mainProcId = null;
        if (d.processName) {
          const p = await prisma.process.findFirst({
            where: { processName: d.processName.trim(), isDeleted: false },
          });
          if (p) mainProcId = p.id;
        }

        const commonData = {
          partFamily: d.partFamily,
          partDescription: d.product_description || d.partDescription,
          cost: parseFloat(d.cost) || 0,
          leadTime: parseInt(d.leadTime) || 0,
          supplierOrderQty: parseInt(d.supplierOrderQty) || 0,
          companyName: supplierId, // यहाँ ID स्टोर कर रहे हैं
          cycleTime: d.cycleTime, // यहाँ ID स्टोर कर रहे हैं
          minStock: parseInt(d.minStock) || 0,
          availStock: parseInt(d.availStock) || 0,
          processId: mainProcId,
          type: "product",
          processOrderRequired:
            d.processOrderRequired?.toLowerCase() === "true",
          instructionRequired: d.instructionRequired?.toLowerCase() === "true",
          isDeleted: false,
        };

        const product = await prisma.partNumber.upsert({
          where: { partNumber: pNumber },
          update: commonData,
          create: {
            ...commonData,
            part_id: uuidv4().slice(0, 6),
            partNumber: pNumber,
            submittedBy: req.user.id,
            partImages: {
              create: getPartImages?.map((img) => ({
                imageUrl: img.filename,
                type: "product",
              })),
            },
          },
        });

        // BOM Update logic: Delete old relations
        await prisma.productTree.deleteMany({
          where: { product_id: product.part_id },
        });

        // Insert New BOM items
        for (const item of group.bomItems) {
          const bomPartNum = item.part_number?.trim();
          if (!bomPartNum) continue;

          const componentPart = await prisma.partNumber.findFirst({
            where: { partNumber: bomPartNum, isDeleted: false },
          });

          if (componentPart) {
            await prisma.productTree.create({
              data: {
                id: uuidv4().slice(0, 6),
                product_id: product.part_id,
                part_id: componentPart.part_id,
                partQuantity: Number(item.part_qty) || 1,
                processId: componentPart.processId,
                processOrderRequired: componentPart.processOrderRequired,
                instructionRequired: componentPart.instructionRequired,
                createdBy: req.user.id,
              },
            });
          }
        }
        successCount++;
      } catch (err) {
        errors.push(`Error in Product ${pNumber}: ${err.message}`);
      }
    }

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    return res.status(200).json({
      success: true,
      summary: { success: successCount, errors },
    });
  } catch (error) {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
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
      (file) => file.fieldname === "ImportFile",
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
              `Row ${result.reason.index + 2}: ${result.reason.reason}`,
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
      (file) => file.fieldname === "ImportFile",
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
                    companyName: row.companyName,
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
              `Row ${result.reason.index + 2}: ${result.reason.reason}`,
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
      (file) => file.fieldname === "ImportFile",
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
              `Row ${result.reason.index + 2}: ${result.reason.reason}`,
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
