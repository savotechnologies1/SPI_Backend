const md5 = require("md5");
const prisma = require("./prisma");
const { v4: uuidv4 } = require("uuid");


const connectDB = async () => {
  try {
    await prisma.$connect();
    const getId = uuidv4().slice(0, 6);
    const convertedPass =md5("Admin@123")
    const adminCount = await prisma.admin.count();
    if (adminCount === 0) {
      await prisma.admin.create({
        data: {
          id :getId,
          name: "Admin",
          email: "spiadmin@gmail.com",
          password: convertedPass,
          roles: "superAdmin",
          phoneNumber: "+911111111111",
        },
      });
      console.log("Default super admin created.");
    }

  } catch (error) {
    console.error(" Database connection error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
