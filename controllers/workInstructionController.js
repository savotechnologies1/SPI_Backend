const prisma = require("../config/prisma");
const { v4: uuidv4 } = require("uuid");
const {
  fileUploadFunc,
  pagination,
  paginationQuery,
} = require("../functions/common");

const workInstructionProcess = async (req, res) => {
  try {
    const process = await prisma.process.findMany({
      select: {
        id: true,
        processName: true,
      },
      where: {
        isDeleted: false,
      },
    });
    console.log("processprocess", process);
    const formattedProcess = process.map((process) => ({
      id: process.id,
      name: process.processName,
    }));

    res.status(200).json(formattedProcess);
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again later." });
  }
};

const productRelatedParts = async (req, res) => {
  try {
    const { productId } = req.query;

    const data = await prisma.productTree.findMany({
      where: {
        product_id: productId,
        isDeleted: false,
      },
      include: {
        part: {
          select: {
            part_id: true,
            partNumber: true,
            partDescription: true,
            type: true,
            cost: true,
          },
        },
      },
    });

    return res.status(200).json({
      message: "All related parts retrieved successfully!",
      data: data,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const createWorkInstruction = async (req, res) => {
  try {
    const { processId, productId } = req.body;
    const getId = uuidv4().slice(0, 6);

    await prisma.workInstruction.create({
      data: {
        id: getId,
        processId: processId,
        productId: productId,
      },
    });
    return res.status(201).send({
      message: "Work Insturtion create successfully !",
      data: {
        processId: processId,
      },
    });
  } catch (error) {
    console.log("errorerror", error);

    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const createWorkInstructionDetail = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);
    const getWorkImages = fileData?.data?.workInstructionImg || [];
    const getWorkVideo =
      (fileData?.data?.workInstructionVideo || [])[0] || null;
    console.log("fileDatafileData", fileData?.data);

    const {
      workInstructionId,
      processId,
      part_id,
      stepNumber,
      title,
      instruction,
    } = req.body;

    const stepNumbers = Array.isArray(stepNumber) ? stepNumber : [stepNumber];
    const titles = Array.isArray(title) ? title : [title];
    const instructions = Array.isArray(instruction)
      ? instruction
      : [instruction];

    const partExists = await prisma.partNumber.findUnique({
      where: { part_id: part_id },
    });
    const processExists = await prisma.process.findUnique({
      where: { id: processId },
    });

    if (!partExists)
      return res.status(400).json({ message: "Invalid part_id" });
    if (!processExists)
      return res.status(400).json({ message: "Invalid processId" });

    const createdInstructions = await Promise.all(
      stepNumbers.map((stepNo, i) =>
        prisma.workInstruction.create({
          data: {
            workInstructionId: workInstructionId,
            processId,
            part_id,
            stepNumber: Number(stepNo),
            title: titles[i],
            instruction: instructions[i],
          },
        })
      )
    );
    if (getWorkImages.length > 0) {
      const imageData = getWorkImages.map((img) => ({
        stepId: createdInstructions[0].id,
        imagePath: img.filename,
      }));
      console.log("imageDataimageData", imageData);

      await prisma.instructionImage.createMany({ data: imageData });
    }

    if (getWorkVideo) {
      await prisma.instructionVideo.create({
        data: {
          stepId: createdInstructions[0].id,
          videoPath: getWorkVideo.filename,
        },
      });
    }

    res.status(201).json({
      message: " Work instructions created successfully",
      data: createdInstructions,
    });
  } catch (error) {
    console.error(" Error creating work instruction:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

const allWorkInstructions = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);

    const [allWorkInstructions, totalCount] = await Promise.all([
      prisma.workInstruction.findMany({
        where: {
          stepNumber: 1,
          isDeleted: false,
        },
        include: {
          PartNumber: {
            select: {
              partNumber: true,
            },
          },
          process: {
            select: {
              processName: true,
            },
          },
          InstructionImage: {
            select: {
              id: true,
              stepId: true,
              imagePath: true,
            },
          },
          InstructionVideo: {
            select: {
              id: true,
              stepId: true,
              videoPath: true,
            },
          },
        },

        skip: paginationData.skip,
        take: paginationData.pageSize,
      }),
      prisma.workInstruction.count({
        where: {
          isDeleted: false,
        },
      }),
    ]);

    const getPagination = await pagination({
      page: paginationData.page,
      pageSize: paginationData.pageSize,
      total: totalCount,
    });
    console.log(
      "allWorkInstructionsallWorkInstructionsallWorkInstructions",
      allWorkInstructions
    );

    return res.status(200).json({
      message: "All work instructions retrieved successfully!",
      data: allWorkInstructions,
      totalCount,
      pagination: getPagination,
    });
  } catch (error) {
    console.error("Error fetching work instructions:", error);
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const selectInstructionPartNumber = async (req, res) => {
  try {
    const process = await prisma.partNumber.findMany({
      select: {
        part_id: true,
        partNumber: true,
      },
      where: {
        isDeleted: false,
      },
    });

    const formattedProcess = process.map((process) => ({
      id: process.part_id,
      partNumber: process.partNumber,
    }));
    res.status(200).json({
      data: formattedProcess,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({ message: "Server error" });
  }
};

// const updateWorkInstructionDetail = async (req, res) => {
//   try {
//     const fileData = await fileUploadFunc(req, res);

//     const getWorkImages = fileData?.data?.workInstructionImg || [];
//     const getWorkVideo = fileData?.data?.workInstructionVideo || [];

//     const {
//       workInstructionId,
//       processId,
//       part_id,
//       stepNumber,
//       title,
//       instruction,
//     } = req.body;

//     const stepNumbers = Array.isArray(stepNumber) ? stepNumber : [stepNumber];
//     const titles = Array.isArray(title) ? title : [title];
//     const instructions = Array.isArray(instruction)
//       ? instruction
//       : [instruction];

//     if (
//       !Array.isArray(stepNumbers) ||
//       !Array.isArray(titles) ||
//       !Array.isArray(instructions)
//     ) {
//       return res.status(400).json({ message: "Step data is malformed" });
//     }

//     // Validate part and process
//     const partExists = await prisma.partNumber.findUnique({
//       where: { part_id },
//     });
//     const processExists = await prisma.process.findUnique({
//       where: { id: processId },
//     });

//     if (!partExists)
//       return res.status(400).json({ message: "Invalid part_id" });
//     if (!processExists)
//       return res.status(400).json({ message: "Invalid processId" });

//     // Soft delete previous instructions
//     await prisma.workInstruction.updateMany({
//       where: { workInstructionId },
//       data: { isDeleted: true },
//     });

//     const updatedInstructions = [];

//     for (let i = 0; i < stepNumbers.length; i++) {
//       const step = await prisma.workInstruction.updateM({
//         data: {
//           workInstructionId,
//           processId,
//           part_id,
//           stepNumber: Number(stepNumbers[i]),
//           title: titles[i],
//           instruction: instructions[i],
//         },
//       });

//       const stepId = step.id;

//       // Delete old media (for this step only)
//       await prisma.instructionImage.deleteMany({ where: { stepId } });
//       await prisma.instructionVideo.deleteMany({ where: { stepId } });

//       // Handle images for this step
//       const stepImages = getWorkImages.filter(
//         (img) => img.fieldname === `steps[${i}][workInstructionImg]`
//       );

//       if (stepImages.length > 0) {
//         const imageData = stepImages.map((img) => ({
//           stepId,
//           imagePath: img.filename,
//         }));
//         await prisma.instructionImage.createMany({ data: imageData });
//       }

//       // Handle video for this step
//       const stepVideo = getWorkVideo.find(
//         (vid) => vid.fieldname === `steps[${i}][workInstructionVideo]`
//       );

//       if (stepVideo) {
//         await prisma.instructionVideo.create({
//           data: {
//             stepId,
//             videoPath: stepVideo.filename,
//           },
//         });
//       }

//       updatedInstructions.push(step);
//     }

//     return res.status(200).json({
//       message: "✅ Work instructions updated successfully",
//       data: updatedInstructions,
//     });
//   } catch (error) {
//     console.error("❌ Error updating work instruction:", error);
//     res.status(500).json({ message: "Internal Server Error", error });
//   }
// };

// const updateWorkInstructionDetail = async (req, res) => {
//   try {
//     const fileData = await fileUploadFunc(req, res);
//     const getWorkImages = fileData?.data?.workInstructionImg || [];
//     const getWorkVideo =
//       (fileData?.data?.workInstructionVideo || [])[0] || null;

//     const {
//       instructionId,
//       workInstructionId,
//       processId,
//       part_id,
//       stepNumber,
//       title,
//       instruction,
//     } = req.body;
//     console.log("req.body;req.body;", req.body);
//     const { id } = req.params;
//     const stepNumbers = Array.isArray(stepNumber) ? stepNumber : [stepNumber];
//     const titles = Array.isArray(title) ? title : [title];
//     const instructions = Array.isArray(instruction)
//       ? instruction
//       : [instruction];

//     const partExists = await prisma.partNumber.findUnique({
//       where: { part_id: part_id },
//     });
//     const processExists = await prisma.process.findUnique({
//       where: { id: processId },
//     });

//     if (!partExists)
//       return res.status(400).json({ message: "Invalid part_id" });
//     if (!processExists)
//       return res.status(400).json({ message: "Invalid processId" });
//     const createdInstructions = await Promise.all(
//       stepNumbers.map((stepNo, i) =>
//         prisma.workInstruction.update({
//           where: {
//             workInstructionId: instructionId,
//           },
//           data: {
//             workInstructionId: workInstructionId,
//             processId,
//             part_id,
//             stepNumber: Number(stepNo),
//             title: titles[i],
//             instruction: instructions[i],
//           },
//         })
//       )
//     );

//     if (getWorkImages.length > 0) {
//       const imageData = getWorkImages.map((img) => ({
//         stepId: createdInstructions[0].id,
//         imagePath: img.filename,
//       }));
//       console.log("imageDataimageData", imageData);

//       await prisma.instructionImage.createMany({ data: imageData });
//     }

//     if (getWorkVideo) {
//       await prisma.instructionVideo.create({
//         data: {
//           stepId: createdInstructions[0].id,
//           videoPath: getWorkVideo.filename,
//         },
//       });
//     }

//     res.status(200).json({
//       message: "✅ Work instructions updated successfully",
//     });
//   } catch (error) {
//     console.error("❌ Error updating work instruction:", error);
//     res.status(500).json({ message: "Internal Server Error", error });
//   }
// };

const updateWorkInstructionDetail = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);
    const getWorkImages = fileData?.data?.workInstructionImg || [];
    const getWorkVideo =
      (fileData?.data?.workInstructionVideo || [])[0] || null;

    const {
      stepId, // optional: if present → update
      workInstructionId,
      processId,
      part_id,
      stepNumber,
      title,
      instruction,
    } = req.body;

    console.log("req.bodyreq.body", req.body);

    const partExists = await prisma.partNumber.findUnique({
      where: { part_id },
    });
    const processExists = await prisma.process.findUnique({
      where: { id: processId },
    });

    if (!partExists)
      return res.status(400).json({ message: "Invalid part_id" });
    if (!processExists)
      return res.status(400).json({ message: "Invalid processId" });

    let stepRecord;
    console.log("instructionIdinstructionId", stepId);

    if (stepId) {
      stepRecord = await prisma.workInstruction.update({
        where: { id: stepId },
        data: {
          workInstructionId,
          processId,
          part_id,
          stepNumber: Number(stepNumber),
          title,
          instruction,
        },
      });
    } else {
      stepRecord = await prisma.workInstruction.create({
        data: {
          workInstructionId,
          processId,
          part_id,
          stepNumber: Number(stepNumber),
          title,
          instruction,
        },
      });
    }

    // 💾 Save images
    if (getWorkImages.length > 0) {
      const imageData = getWorkImages.map((img) => ({
        stepId: stepRecord.id,
        imagePath: img.filename,
      }));
      await prisma.instructionImage.createMany({ data: imageData });
    }

    // 💾 Save video
    if (getWorkVideo) {
      await prisma.instructionVideo.create({
        data: {
          stepId: stepRecord.id,
          videoPath: getWorkVideo.filename,
        },
      });
    }

    res.status(200).json({
      message: "✅ Step processed successfully",
      stepId: stepRecord.id,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

const getWorkInstructionDetail = async (req, res) => {
  const { id } = req.params;
  console.log("idid", id);

  try {
    const workInstructions = await prisma.workInstruction.findMany({
      where: {
        workInstructionId: id,
        isDeleted: false,
      },
      include: {
        InstructionImage: true,
        InstructionVideo: true,
      },
      orderBy: {
        stepNumber: "asc",
      },
    });

    if (!workInstructions.length) {
      return res.status(404).json({ message: "Instruction not found" });
    }
    const { processId, part_id } = workInstructions[0];
    console.log(
      "workInstructionsworkInstructions",
      workInstructions.map((item) =>
        console.log("09-0088", item.InstructionVideo)
      )
    );

    res.status(200).json({
      workInstructionId: id,
      processId,
      part_id,
      steps: workInstructions.map((step) => ({
        id: step.id,
        stepNumber: step.stepNumber,
        title: step.title,
        instruction: step.instruction,
        workInstructionImg:
          step.InstructionImage?.map((img) => img.imagePath) || [],
        workInstructionVideo: step.InstructionVideo?.[0]?.videoPath || null,
      })),
    });
  } catch (error) {
    console.error("❌ Error fetching instruction details:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

const deleteWorkInstruction = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.workInstruction.updateMany({
      where: {
        workInstructionId: id,
      },
      data: {
        isDeleted: true,
      },
    });
    return res.status(200).json({
      message: "Work instruction deleted successfully !",
    });
  } catch (error) {
    console.log("errorerror", error);

    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const selectInstruction = async (req, res) => {
  try {
    const process = await prisma.workInstruction.findMany({
      where: {
        isDeleted: false,
      },
    });

    const formattedInstruction = process.map((process) => ({
      id: process.workInstructionId,
      title: process.title,
    }));
    res.status(200).json({
      data: formattedInstruction,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({ message: "Server error" });
  }
};
const applyWorkInstruction = async (req, res) => {
  try {
    const { workInstructionId, processId, partId } = req.body;
    const existingInstructions = await prisma.workInstruction.findMany({
      where: {
        workInstructionId: workInstructionId,
      },
    });
    if (!existingInstructions || existingInstructions.length === 0) {
      return res.status(404).json({ message: "Work Instruction not found" });
    }

    const { v4: uuidv4 } = require("uuid");
    const newWorkInstructionId = uuidv4().slice(0, 6);

    const createdInstructions = await Promise.all(
      existingInstructions.map((step) =>
        prisma.workInstruction.create({
          data: {
            workInstructionId: newWorkInstructionId,
            processId: processId,
            part_id: partId,
            stepNumber: step.stepNumber,
            title: step.title,

            instruction: step.instruction,
            isDeleted: false,
          },
        })
      )
    );

    return res.status(201).json({
      message: "Successfully copied and applied new work instruction.",
      newWorkInstructionId,
      createdInstructions,
    });
  } catch (error) {
    return res
      .status(500)
      .send("Something went wrong. Please try again later.");
  }
};

module.exports = {
  workInstructionProcess,
  createWorkInstruction,
  createWorkInstructionDetail,
  productRelatedParts,
  allWorkInstructions,
  selectInstructionPartNumber,
  updateWorkInstructionDetail,
  getWorkInstructionDetail,
  deleteWorkInstruction,
  applyWorkInstruction,
  selectInstruction,
  applyWorkInstruction,
};
