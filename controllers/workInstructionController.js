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
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};
// const createWorkInstructionDetail = async (req, res) => {
//   try {
//     const fileData = await fileUploadFunc(req, res);
//     const uploadedFiles = fileData?.data || [];

//     const { processId, productId, instructionTitle, instructionSteps } =
//       req.body;

//     const steps = JSON.parse(instructionSteps);

//     const workInstruction = await prisma.workInstruction.create({
//       data: {
//         processId,
//         productId,
//         instructionTitle,
//         type: "original",
//       },
//     });

//     const workInstructionId = workInstruction.id;
//     for (let i = 0; i < steps.length; i++) {
//       const step = steps[i];
//       const stepId = uuidv4();

//       await prisma.workInstructionSteps.create({
//         data: {
//           id: stepId,
//           workInstructionId,
//           stepNumber: step.stepNumber,
//           title: step.title,
//           instruction: step.workInstruction,
//           processId,
//         },
//       });

//       const imageFiles = uploadedFiles.filter(
//         (file) =>
//           file.fieldname === `instructionSteps[${i}][workInstructionImgs]`
//       );

//       for (const img of imageFiles) {
//         await prisma.instructionImage.create({
//           data: {
//             stepId,
//             imagePath: img.filename,
//           },
//         });
//       }

//       const videoFile = uploadedFiles.find(
//         (file) =>
//           file.fieldname === `instructionSteps[${i}][workInstructionVideo]`
//       );

//       if (videoFile) {
//         await prisma.instructionVideo.create({
//           data: {
//             stepId,
//             workInstructionId,
//             videoPath: videoFile.filename,
//           },
//         });
//       }
//     }

//     return res
//       .status(200)
//       .json({ message: " Work instruction created successfully!" });
//   } catch (error) {
//     console.log("errorerror", error);

//     return res
//       .status(500)
//       .json({ error: "Something went wrong", details: error.message });
//   }
// };

// const allWorkInstructions = async (req, res) => {
//   try {
//     const paginationData = await paginationQuery(req.query);

//     const [allWorkInstructions, totalCount] = await Promise.all([
//       prisma.workInstruction.findMany({
//         where: {
//           isDeleted: false,
//         },
//         include: {
//           PartNumber: {
//             select: { partNumber: true },
//           },
//           process: {
//             select: { processName: true },
//           },
//           steps: {
//             where: {
//               isDeleted: false,
//             },
//             select: {
//               id: true,
//               title: true,
//               stepNumber: true,
//               instruction: true,
//               part: {
//                 select: { partNumber: true },
//               },
//               images: {
//                 select: {
//                   id: true,
//                   imagePath: true,
//                 },
//               },
//               videos: {
//                 select: {
//                   id: true,
//                   videoPath: true,
//                 },
//               },
//             },
//             orderBy: {
//               stepNumber: "asc",
//             },
//           },
//         },
//         orderBy: {
//           createdAt: "desc",
//         },
//         skip: paginationData.skip,
//         take: paginationData.pageSize,
//       }),

//       prisma.workInstruction.count({
//         where: {
//           isDeleted: false,
//         },
//       }),
//     ]);

//     const getPagination = await pagination({
//       page: paginationData.page,
//       pageSize: paginationData.pageSize,
//       total: totalCount,
//     });

//     return res.status(200).json({
//       message: "All work instructions retrieved successfully!",
//       data: allWorkInstructions,
//       totalCount,
//       pagination: getPagination,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: "Something went wrong. Please try again later.",
//       error: error.message,
//     });
//   }
// };

// const createWorkInstructionDetail = async (req, res) => {
//   try {
//     const fileData = await fileUploadFunc(req, res);
//     const uploadedFiles = fileData?.data || [];

//     const { processId, productId, instructionTitle, instructionSteps } =
//       req.body;

//     // It's good practice to wrap JSON.parse in a try-catch, but for now this is fine.
//     const steps = JSON.parse(instructionSteps);

//     const workInstruction = await prisma.workInstruction.create({
//       data: {
//         processId,
//         productId,
//         instructionTitle,
//         type: "original",
//       },
//     });

//     const workInstructionId = workInstruction.id;

//     for (let i = 0; i < steps.length; i++) {
//       const step = steps[i];
//       const stepId = uuidv4();

//       await prisma.workInstructionSteps.create({
//         data: {
//           id: stepId,
//           workInstructionId,
//           // --- THIS IS THE RECOMMENDED CHANGE ---
//           // Use the loop index 'i' to guarantee the step number is always correct (1, 2, 3...).
//           stepNumber: i + 1,
//           // --- END OF CHANGE ---
//           title: step.title,
//           instruction: step.workInstruction,
//           processId,
//         },
//       });

//       const imageFiles = uploadedFiles.filter(
//         (file) =>
//           file.fieldname === `instructionSteps[${i}][workInstructionImgs]`
//       );

//       for (const img of imageFiles) {
//         await prisma.instructionImage.create({
//           data: {
//             stepId,
//             imagePath: img.filename,
//           },
//         });
//       }

//       const videoFile = uploadedFiles.find(
//         (file) =>
//           file.fieldname === `instructionSteps[${i}][workInstructionVideo]`
//       );

//       if (videoFile) {
//         await prisma.instructionVideo.create({
//           data: {
//             stepId,
//             workInstructionId,
//             videoPath: videoFile.filename,
//           },
//         });
//       }
//     }

//     return res
//       .status(200)
//       .json({ message: "Work instruction created successfully!" });
//   } catch (error) {
//     console.log("errorerror", error);

//     return res
//       .status(500)
//       .json({ error: "Something went wrong", details: error.message });
//   }
// };

const createWorkInstructionDetail = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);
    const uploadedFiles = fileData?.data || [];
    const { processId, productId, instructionTitle, instructionSteps } =
      req.body;

    const existingInstruction = await prisma.workInstruction.findFirst({
      where: {
        processId: processId,
        productId: productId,
      },
    });

    if (existingInstruction) {
      return res.status(409).json({
        error:
          "You have already created a work instruction for this process and product combination.",
      });
    }

    const steps = JSON.parse(instructionSteps);

    const workInstruction = await prisma.workInstruction.create({
      data: {
        processId,
        productId,
        instructionTitle,
        type: "original",
      },
    });

    const workInstructionId = workInstruction.id;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepId = uuidv4();

      await prisma.workInstructionSteps.create({
        data: {
          id: stepId,
          workInstructionId,
          stepNumber: i + 1,
          title: step.title,
          instruction: step.workInstruction,
          processId,
        },
      });

      const imageFiles = uploadedFiles.filter(
        (file) =>
          file.fieldname === `instructionSteps[${i}][workInstructionImgs]`
      );

      for (const img of imageFiles) {
        await prisma.instructionImage.create({
          data: {
            stepId,
            imagePath: img.filename,
          },
        });
      }

      const videoFile = uploadedFiles.find(
        (file) =>
          file.fieldname === `instructionSteps[${i}][workInstructionVideo]`
      );

      if (videoFile) {
        await prisma.instructionVideo.create({
          data: {
            stepId,
            workInstructionId,
            videoPath: videoFile.filename,
          },
        });
      }
    }

    return res
      .status(201)
      .json({ message: "Work instruction created successfully!" });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Something went wrong", details: error.message });
  }
};

const allWorkInstructions = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);
    const { search = "", productId = "", type = "all" } = req.query;

    const orConditions = [];
    if (search) {
      orConditions.push({
        instructionTitle: {
          contains: search,
          mode: "insensitive",
        },
      });
    }
    if (productId) {
      orConditions.push({
        productId: {
          contains: productId,
        },
      });
    }

    const commonWhereFilter = {
      isDeleted: false,
      ...(orConditions.length > 0 ? { OR: orConditions } : {}),
    };

    let workInstructions = [];
    let appliedInstructions = [];

    if (type === "original" || type === "all") {
      workInstructions = await prisma.workInstruction.findMany({
        where: commonWhereFilter,
        include: {
          PartNumber: { select: { partNumber: true } },
          process: { select: { processName: true } },
          steps: {
            where: { isDeleted: false },
            select: {
              id: true,
              title: true,
              stepNumber: true,
              instruction: true,
              images: { select: { id: true, imagePath: true } },
              videos: { select: { id: true, videoPath: true } },
            },
            orderBy: { stepNumber: "asc" },
          },
        },
      });
    }

    if (type === "applied" || type === "all") {
      appliedInstructions = await prisma.workInstructionApply.findMany({
        where: commonWhereFilter,
        include: {
          PartNumber: { select: { partNumber: true } },
          process: { select: { processName: true } },
          steps: {
            where: { isDeleted: false },
            select: {
              id: true,
              title: true,
              stepNumber: true,
              instruction: true,
              images: { select: { id: true, imagePath: true } },
              videos: { select: { id: true, videoPath: true } },
            },
            orderBy: { stepNumber: "asc" },
          },
        },
      });
    }

    const formattedWI = workInstructions.map((item) => ({
      ...item,
      type: "original",
    }));

    const formattedApply = appliedInstructions.map((item) => ({
      ...item,
      type: "applied",
    }));

    const mergedData = [...formattedWI, ...formattedApply].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const totalCount = mergedData.length;

    const paginatedData = mergedData.slice(
      paginationData.skip,
      paginationData.skip + paginationData.pageSize
    );

    const getPagination = await pagination({
      page: paginationData.page,
      pageSize: paginationData.pageSize,
      total: totalCount,
    });

    return res.status(200).json({
      message:
        "All work instructions (original + applied) fetched successfully!",
      data: paginatedData,
      totalCount,
      pagination: getPagination,
    });
  } catch (error) {
    console.error("Work Instruction Fetch Error:", error);
    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
      error: error.message,
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
    res.status(500).json({ message: "Something went wrong ." });
  }
};

const selectWorkInstruction = async (req, res) => {
  try {
    const process = await prisma.workInstruction.findMany({
      select: {
        id: true,
        instructionTitle: true,
      },
      where: {
        isDeleted: false,
      },
    });

    const formattedProcess = process.map((process) => ({
      id: process.id,
      title: process.instructionTitle,
    }));
    res.status(200).json({
      data: formattedProcess,
    });
    res.status(500).json({ message: "Server error" });
  } catch (error) {}
};

const updateWorkInstructionDetail = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);
    const uploadedFiles = fileData?.data || [];
    const {
      workInstructionId,
      processId,
      productId,
      instructionTitle,
      instructionSteps,
      type,
    } = req.body;

    const steps = JSON.parse(instructionSteps);
    if (type === "original") {
      await prisma.workInstruction.update({
        where: { id: workInstructionId },
        data: { processId, productId, instructionTitle },
      });
    } else if (type === "applied") {
      await prisma.workInstructionApply.update({
        where: { id: workInstructionId },
        data: { processId, productId, instructionTitle },
      });
    } else {
      return res.status(400).json({ message: "Invalid type provided" });
    }

    const existingStepsInDb = await prisma.workInstructionSteps.findMany({
      where:
        type === "original"
          ? { workInstructionId }
          : { workInstructionApplyId: workInstructionId },
      select: { id: true },
    });

    const existingStepIdsInDb = new Set(existingStepsInDb?.map((s) => s.id));
    const incomingStepIds = new Set();
    const originalInstructionId = await getOriginalInstructionId(
      type,
      workInstructionId
    );
    if (!originalInstructionId) {
      return res
        .status(404)
        .json({ message: "Original Work Instruction not found." });
    }
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      let currentStepId;
      const stepData = {
        stepNumber: i + 1,
        title: step.title,
        instruction: step.workInstruction,
        processId,
      };

      if (step.id && existingStepIdsInDb.has(step.id)) {
        currentStepId = step.id;
        await prisma.workInstructionSteps.update({
          where: { id: currentStepId },
          data: stepData,
        });
        incomingStepIds.add(currentStepId);
      } else {
        const newStep = await prisma.workInstructionSteps.create({
          data: {
            ...stepData,
            id: uuidv4(),
            workInstructionId: originalInstructionId,
            ...(type === "applied"
              ? { workInstructionApplyId: workInstructionId }
              : {}),
          },
        });
        currentStepId = newStep.id;
        incomingStepIds.add(currentStepId);
      }
      const imageFiles = uploadedFiles.filter(
        (file) =>
          file.fieldname === `instructionSteps[${i}][workInstructionImgs]`
      );

      for (const img of imageFiles) {
        await prisma.instructionImage.create({
          data: {
            stepId: currentStepId,
            imagePath: img.filename,
          },
        });
      }

      const videoFile = uploadedFiles.find(
        (file) =>
          file.fieldname === `instructionSteps[${i}][workInstructionVideo]`
      );

      if (videoFile) {
        await prisma.instructionVideo.deleteMany({
          where: { stepId: currentStepId },
        });

        await prisma.instructionVideo.create({
          data: {
            stepId: currentStepId,
            workInstructionId: originalInstructionId,
            videoPath: videoFile.filename,
          },
        });
      }

      const stepsToDelete = [...existingStepIdsInDb].filter(
        (id) => !incomingStepIds.has(id)
      );

      if (stepsToDelete.length > 0) {
        await prisma.instructionImage.updateMany({
          where: { stepId: { in: stepsToDelete } },
          data: { stepId: currentStepId },
        });

        await prisma.instructionVideo.deleteMany({
          where: { stepId: { in: stepsToDelete } },
        });
        await prisma.workInstructionSteps.deleteMany({
          where: { id: { in: stepsToDelete } },
        });
      }
    }

    return res.status(200).json({
      message: `Work instruction (${type}) updated successfully!`,
    });
  } catch (error) {
    console.error("Update Error:", error);
    return res.status(500).json({
      message: "An error occurred during the update.",
      error: error.message,
    });
  }
};

const getOriginalInstructionId = async (type, workInstructionId, step) => {
  if (type === "original") return workInstructionId;
  if (step?.originalWorkInstructionId) return step?.originalWorkInstructionId;

  const appliedData = await prisma.workInstructionApply.findUnique({
    where: { id: workInstructionId },
    select: { instructionId: true },
  });
  return appliedData?.instructionId;
};

// const getWorkInstructionDetail = async (req, res) => {
//   const { id } = req.params;

//   try {
//     let workInstruction = await prisma.workInstruction.findUnique({
//       where: { id },
//       include: {
//         steps: {
//           where: { isDeleted: false },
//           orderBy: { stepNumber: "asc" },
//           include: {
//             images: true,
//             videos: true,
//           },
//         },
//       },
//     });

//     let source = "original";
//     let allSteps = [];

//     if (workInstruction) {
//       allSteps = workInstruction.steps;
//     } else {
//       const applyInstruction = await prisma.workInstructionApply.findUnique({
//         where: { id },
//         include: {
//           steps: {
//             where: { isDeleted: false },
//             orderBy: { stepNumber: "asc" },
//             include: {
//               images: true,
//               videos: true,
//             },
//           },
//           workInstruction: {
//             include: {
//               steps: {
//                 where: { isDeleted: false },
//                 orderBy: { stepNumber: "asc" },
//                 include: {
//                   images: true,
//                   videos: true,
//                 },
//               },
//             },
//           },
//         },
//       });

//       if (!applyInstruction) {
//         return res.status(404).json({ message: "Work instruction not found" });
//       }

//       source = "applied";
//       workInstruction = applyInstruction;

//       const originalSteps = applyInstruction.workInstruction?.steps || [];
//       const appliedSteps = applyInstruction.steps;

//       // ✅ Combine and remove duplicates by step ID
//       const combined = [...originalSteps, ...appliedSteps];
//       const seen = new Set();
//       allSteps = combined.filter((step) => {
//         if (seen.has(step.id)) return false;
//         seen.add(step.id);
//         return true;
//       });
//     }

//     const formattedSteps = allSteps.map((step) => ({
//       id: step.id,
//       part_id: step.part_id,
//       processId: step.processId,
//       productTreeId: step.productTreeId,
//       stepNumber: step.stepNumber,
//       title: step.title,
//       instruction: step.instruction,
//       workInstructionImg: step.images?.map((img) => img.imagePath) || [],
//       workInstructionVideo: step.videos?.map((vid) => vid.videoPath) || [],
//     }));

//     return res.status(200).json({
//       message: `✅ Work Instruction fetched from ${source}`,
//       workInstructionId: workInstruction.id,
//       instructionTitle: workInstruction.instructionTitle,
//       processId: workInstruction.processId,
//       productId: workInstruction.productId,
//       type: source,
//       steps: formattedSteps,
//     });
//   } catch (error) {
//     console.error(" Error fetching work instruction detail:", error);
//     return res.status(500).json({
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };

const getWorkInstructionDetail = async (req, res) => {
  const { id } = req.params;
  try {
    let source = "original";
    let workInstruction = null;
    let allSteps = [];
    const original = await prisma.workInstruction.findUnique({
      where: { id },
      include: {
        steps: {
          where: { isDeleted: false },
          orderBy: { stepNumber: "asc" },
          include: {
            images: true,
            videos: true,
          },
        },
      },
    });

    if (original) {
      source = "original";
      workInstruction = original;
      allSteps = original.steps;
    } else {
      const applied = await prisma.workInstructionApply.findUnique({
        where: { id },
        include: {
          steps: {
            where: { isDeleted: false },
            orderBy: { stepNumber: "asc" },
            include: {
              images: {
                where: {
                  isDeleted: false,
                },
              },
              videos: true,
            },
          },
        },
      });

      if (!applied) {
        return res.status(404).json({ message: "Work instruction not found" });
      }
      source = "applied";
      workInstruction = applied;
      allSteps = applied.steps;
    }
    const formattedSteps = allSteps.map((step) => ({
      id: step.id,
      part_id: step.part_id,
      processId: step.processId,
      productTreeId: step.productTreeId,
      stepNumber: step.stepNumber,
      title: step.title,
      instruction: step.instruction,
      workInstructionImg:
        step.images?.map((img) => ({
          id: img.id,
          name: img.imagePath,
          workInstructionId: step.id,
        })) || [],
      workInstructionVideo: step.videos?.map((vid) => vid.videoPath) || [],
    }));

    return res.status(200).json({
      message: ` Work Instruction fetched from ${source}`,
      workInstructionId: workInstruction.id,
      instructionTitle: workInstruction.instructionTitle,
      processId: workInstruction.processId,
      productId: workInstruction.productId,
      type: source,
      steps: formattedSteps,
    });
  } catch (error) {
    console.error(" Error fetching work instruction detail:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const deleteWorkInstruction = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;
    if (type === "applied") {
      await prisma.workInstructionApply.update({
        where: { id },
        data: { isDeleted: true },
      });
      await prisma.workInstructionSteps.updateMany({
        where: {
          workInstructionApplyId: id,
        },
        data: {
          isDeleted: true,
        },
      });
      await prisma.instructionVideo.updateMany({
        where: {
          workInstructionApplyId: id,
        },
        data: {
          videoPath: "",
        },
      });

      return res.status(200).json({
        message: "Work instruction deleted successfully!",
      });
    } else {
      await prisma.workInstruction.update({
        where: { id },
        data: { isDeleted: true },
      });

      return res.status(200).json({
        message: "Work instruction has been removed successfully!",
      });
    }
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
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
    res.status(500).json({ message: "Server error" });
  }
};

const applyWorkInstruction = async (req, res) => {
  try {
    const { workInstructionId, processId, productId } = req.body;
    const newTitle = await prisma.workInstruction.findFirst({
      where: {
        id: workInstructionId,
        isDeleted: false,
      },
      select: {
        instructionTitle: true,
      },
    });
    const existingSteps = await prisma.workInstructionSteps.findMany({
      where: {
        workInstructionId,
        isDeleted: false,
      },
      include: {
        images: true,
        videos: true,
      },
    });

    if (!existingSteps || existingSteps.length === 0) {
      return res.status(404).json({
        message: "No steps found for the given Work Instruction ID.",
      });
    }

    const newWorkInstruction = await prisma.workInstructionApply.create({
      data: {
        processId,
        productId,
        instructionTitle: newTitle.instructionTitle,
        instructionId: workInstructionId.trim(),
        type: "applied",
      },
    });

    // const newWorkInstructionId = newWorkInstruction.id;

    // for (const step of existingSteps) {
    //   const stepId = uuidv4();

    //   await prisma.workInstructionSteps.create({
    //     data: {
    //       id: stepId,
    //       workInstructionId: newWorkInstructionId,
    //       part_id: step.part_id,
    //       stepNumber: step.stepNumber,
    //       title: step.title,
    //       instruction: step.instruction,
    //       processId,
    //     },
    //   });
    //   for (const img of step.images || []) {
    //     await prisma.instructionImage.create({
    //       data: {
    //         stepId,
    //         imagePath: img.imagePath,
    //       },
    //     });
    //   }

    //   for (const vid of step.videos || []) {
    //     await prisma.instructionVideo.create({
    //       data: {
    //         stepId,
    //         workInstructionId: newWorkInstructionId,
    //         videoPath: vid.videoPath,
    //       },
    //     });
    //   }
    // }

    return res.status(201).json({
      message: " Work Instruction copied successfully!",
      newWorkInstruction,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Something went wrong",
      details: error.message,
    });
  }
};

const selectByProductNumberOrDesc = async (req, res) => {
  try {
    const process = await prisma.partNumber.findMany({
      select: {
        part_id: true,
        partNumber: true,
        partDescription: true,
      },
      where: {
        type: "product",
        isDeleted: false,
      },
    });

    const formattedProcess = process.map((part) => ({
      id: part.part_id,
      partNumber: part.partNumber,
      partDescription: part.partDescription,
    }));
    res.status(200).json({
      data: formattedProcess,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const deleteWorkInstructionImg = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.instructionImage.delete({
      where: {
        id: id,
        isDeleted: false,
      },
    });

    return res.status(200).json({
      message: "Image deleted succesfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const deleteWorkInstructionStepsById = async (req, res) => {
  try {
    const id = req.params.id;
    await prisma.workInstructionSteps.update({
      where: {
        id: id,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
      },
    });

    return res.status(200).json({
      message: "workInstructionStep deleted successfully !",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong . please try again later .",
    });
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
  deleteWorkInstructionImg,
  selectWorkInstruction,
  selectByProductNumberOrDesc,
  deleteWorkInstructionStepsById,
};
