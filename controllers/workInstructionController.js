const prisma = require("../config/prisma");

const createWorkInstruction = async (req, res) => {
  try {
    const {
      processId,
      productId,
      partNumber,
      title,
      stepNumber,
      instruction,
      instructionImage,
      instructionVideo,
    } = req.body;
    await prisma.workInstruction.create({
      data: {
        processId: processId,
        productId: productId,
        partNumber: partNumber,
        title: title,
        stepNumber: stepNumber,
        instruction: instruction,
        // instructionImage: instructionImage,
        // instructionVideo: instructionVideo,
        createdBy: req.user.id,
      },
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

module.exports = { createWorkInstruction };
