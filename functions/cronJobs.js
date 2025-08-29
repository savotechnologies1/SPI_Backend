// const cron = require("node-cron");
// const prisma = require("../config/prisma");

// cron.schedule("*/5 * * * *", async () => {
//   console.log(
//     "Running task to auto clock-out stale entries older than 24 hours..."
//   );
//   try {
//     const twentyFourHoursAgo = new Date();
//     twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

//     const employees = await prisma.employee.findMany();

//     for (const employee of employees) {
//       const lastPunch = await prisma.timeClock.findFirst({
//         where: { employeeId: employee.id },
//         orderBy: { timestamp: "desc" },
//       });

//       if (
//         lastPunch &&
//         lastPunch.eventType !== "CLOCK_OUT" &&
//         lastPunch.timestamp < twentyFourHoursAgo
//       ) {
//         await prisma.timeClock.create({
//           data: {
//             employeeId: employee.id,
//             eventType: "CLOCK_OUT",
//             timestamp: new Date(),
//             notes: "Automatically clocked out after 24 hours of inactivity.",
//             createdBy: "SYSTEM",
//           },
//         });
//         console.log(`Employee ${employee.id} auto clocked out after 24 hours.`);
//       }
//     }
//   } catch (error) {
//     console.error("Error during 24-hour auto clock-out:", error);
//   }
// });

const cron = require("node-cron");
const prisma = require("../config/prisma");

cron.schedule(
  "0 0 * * *",
  async () => {
    console.log("Running daily midnight CLOCK_OUT + CLOCK_IN job (US time)...");

    try {
      const now = new Date();
      const midnight = new Date(now.setHours(0, 0, 0, 0));
      const midnightPlusOneSec = new Date(midnight.getTime() + 1000);

      const employees = await prisma.employee.findMany();

      for (const employee of employees) {
        const lastPunch = await prisma.timeClock.findFirst({
          where: { employeeId: employee.id },
          orderBy: { timestamp: "desc" },
        });

        if (lastPunch && lastPunch.eventType === "CLOCK_IN") {
          // CLOCK_OUT
          await prisma.timeClock.create({
            data: {
              employeeId: employee.id,
              eventType: "CLOCK_OUT",
              timestamp: midnight,
              notes: "Auto CLOCK_OUT at midnight.",
              createdBy: "SYSTEM",
            },
          });

          // CLOCK_IN
          await prisma.timeClock.create({
            data: {
              employeeId: employee.id,
              eventType: "CLOCK_IN",
              timestamp: midnightPlusOneSec,
              notes: "Auto CLOCK_IN at midnight.",
              createdBy: "SYSTEM",
            },
          });

          console.log(
            `Employee ${employee.id} CLOCKED_OUT & CLOCKED_IN at midnight.`
          );
        }
      }
    } catch (error) {
      console.error("Midnight auto punch failed:", error);
    }
  },
  {
    timezone: "America/New_York",
  }
);
