const prisma = require("../config/prisma");
const { v4: uuidv4 } = require("uuid");
const {
  fileUploadFunc,
  pagination,
  paginationQuery,
} = require("../functions/common");

const workInstructionProcess = async (req, res) => {
  try {
    // const usedProcesses = await prisma.workInstruction.findMany({
    //   select: {
    //     processId: true,
    //   },
    //   where: {
    //     isDeleted: false,
    //   },
    // });

    // const usedProcessIds = usedProcesses.map((item) => item.processId);

    const process = await prisma.process.findMany({
      select: {
        id: true,
        processName: true,
      },
      where: {
        isDeleted: false,
        // id: {
        //   notIn: usedProcessIds,
        // },
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
// const createWorkInstructionDetail = async (req, res) => {
//   try {
//     const fileData = await fileUploadFunc(req, res);
//     const getWorkImages = fileData?.data?.workInstructionImg || [];
//     const getWorkVideo = fileData?.data;

//     const { stepNumber, processId, partId, title, instruction } = req.body;
//     console.log("partIdpartId", String(partId));
//     console.log("Creating workInstruction with partId:", partId);
//     const partCheck = await prisma.partNumber.findUnique({
//       where: { par: partId },
//     });
//     if (!partCheck) {
//       return res
//         .status(400)
//         .json({ message: "Invalid partId. Not found in DB." });
//     }

//     await prisma.workInstruction.create({
//       data: {
//         stepNumber: Number(stepNumber),
//         processId,
//         part_id: String(partId), // <-- Ensure this is not an array
//         title,
//         instruction,
//       },
//     });

//     return res.status(201).send({
//       message: "Work instruction created successfully!",
//     });
//   } catch (error) {
//     console.log("errorerror", error);

//     return res.status(500).send({
//       message: "Something went wrong. Please try again later.",
//     });
//   }
// };

// const createWorkInstructionDetail = async (req, res) => {
//   try {
//     const fileData = await fileUploadFunc(req, res);
//     const getWorkImages = fileData?.data?.workInstructionImg || [];
//     // const getWorkVideo = fileData?.data?.workInstructionVideo || null;
//     const getWorkVideo =
//       (fileData?.data?.workInstructionVideo || [])[0] || null;

//     console.log("getWorkImagesgetWorkImages", getWorkImages);
//     console.log("getWorkVideogetWorkVideo", req.files);

//     const {
//       stepNumber,
//       processId,
//       workInstructionId,
//       partId,
//       title,
//       instruction,
//     } = req.body;
//     console.log("workInstructionId being used:", workInstructionId);

//     const detail = await prisma.workInstructionDetail.create({
//       data: {
//         stepNumber: Number(stepNumber),
//         processId,
//         partId,
//         title,
//         instruction,
//         createdBy: req.user.id,
//         instructionVideos: getWorkVideo?.path || null,

//         // WorkInstruction: {
//         //   connect: { id: workInstructionId },
//         // },
//         // part: {
//         //   connect: { part_id: partId },
//         // },
//         // ...(processId && {
//         //   process: {
//         //     connect: { id: processId },
//         //   },
//         // }),
//       },
//     });

//     if (getWorkImages.length > 0) {
//       const imageData = getWorkImages.map((img) => ({
//         workInstructionDetailId: detail.id,
//         imagePath: img.path,
//       }));
//       await prisma.instructionImage.createMany({ data: imageData });
//     }
//     if (getWorkVideo) {
//       await prisma.instructionVideos.create({
//         data: {
//           workInstructionDetailId: detail.id,
//           videoPath: getWorkVideo.path,
//         },
//       });
//     }

//     // if (getWorkVideos.length > 0) {
//     //   const videoData = getWorkVideos.map((video) => ({
//     //     workInstructionDetailId: detail.id,
//     //     videoPath: video.path,
//     //   }));
//     //   await prisma.instructionVideo.createMany({ data: videoData });
//     // }

//     return res.status(200).json({
//       message: "Work Instruction Step saved successfully.",
//     });
//   } catch (error) {
//     console.log("error in createWorkInstructionDetail:", error);
//     return res.status(500).json({
//       message: "Something went wrong. Please try again later.",
//     });
//   }
// };

const createWorkInstructionDetail = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);
    console.log("fileData?.datafileData?.data", fileData?.data);

    const getWorkImages = fileData?.data?.workInstructionImg || [];
    const getWorkVideo =
      (fileData?.data?.workInstructionVideo || [])[0] || null;

    const { processId, part_id, stepNumber, title, instruction } = req.body;

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

    // Create each instruction individually so we get its ID
    const createdInstructions = await Promise.all(
      stepNumbers.map((stepNo, i) =>
        prisma.workInstruction.create({
          data: {
            processId,
            part_id,
            stepNumber: Number(stepNo),
            title: titles[i],
            instruction: instructions[i],
          },
        })
      )
    );
    console.log("11111");

    console.log("getWorkImagesgetWorkImages", getWorkImages);
    // Add image(s) to the first instruction (or you can loop over if image per step)
    if (getWorkImages.length > 0) {
      const imageData = getWorkImages.map((img) => ({
        workInstructionId: createdInstructions[0].id, // change if needed
        imagePath: img.filename,
      }));
      console.log("imageDataimageData", imageData);

      await prisma.instructionImage.createMany({ data: imageData });
    }

    // Add video to the first instruction (or loop if video per step)
    if (getWorkVideo) {
      await prisma.instructionVideo.create({
        data: {
          workInstructionId: createdInstructions[0].id, // change if needed
          videoPath: getWorkVideo.filename,
        },
      });
    }

    res.status(201).json({
      message: "✅ Work instructions created successfully",
      data: createdInstructions,
    });
  } catch (error) {
    console.error("❌ Error creating work instruction:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

const allWorkInstructions = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);
    const [allWorkInstructions, totalCount] = await Promise.all([
      prisma.workInstructionDetail.findMany({
        where: {
          isDeleted: false,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: paginationData.skip,
        take: paginationData.pageSize,
      }),
      prisma.workInstructionDetail.count({
        where: {
          isDeleted: false,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    const getPagination = await pagination({
      page: paginationData.page,
      pageSize: paginationData.pageSize,
      total: totalCount,
    });
    return res.status(200).json({
      message: "All work instructions retrieved successfully!",
      data: allWorkInstructions,
      totalCount,
      pagination: getPagination,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
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
module.exports = {
  workInstructionProcess,
  createWorkInstruction,
  createWorkInstructionDetail,
  productRelatedParts,
  allWorkInstructions,
  selectInstructionPartNumber,
};
