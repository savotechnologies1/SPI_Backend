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

// const cron = require("node-cron");
// const prisma = require("../config/prisma");

// cron.schedule(
//   "0 0 * * *",
//   async () => {
//     console.log("Running daily midnight CLOCK_OUT + CLOCK_IN job...");

//     try {
//       const now = new Date();
//       const midnight = new Date(now.setHours(0, 0, 0, 0));
//       const midnightPlusOneSec = new Date(midnight.getTime() + 1000);
//       const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

//       const employees = await prisma.employee.findMany();

//       for (const employee of employees) {
//         const lastPunch = await prisma.timeClock.findFirst({
//           where: { employeeId: employee.id },
//           orderBy: { timestamp: "desc" },
//         });

//         // Skip if no punch exists
//         if (!lastPunch) continue;

//         // ⏱ 1. Auto clock out if last punch is over 24 hours ago and not already CLOCK_OUT
//         if (
//           lastPunch.eventType !== "CLOCK_OUT" &&
//           new Date(lastPunch.timestamp) < twentyFourHoursAgo
//         ) {
//           await prisma.timeClock.create({
//             data: {
//               employeeId: employee.id,
//               eventType: "CLOCK_OUT",
//               timestamp: new Date(),
//               notes: "Auto CLOCK_OUT after 24h inactivity.",
//               createdBy: "SYSTEM",
//             },
//           });

//           console.log(
//             `Employee ${employee.id} auto CLOCKED OUT after 24h inactivity.`
//           );
//           continue; // Skip midnight punch to avoid double clock-out
//         }

//         // 🕛 2. Auto clock out & in at midnight (for valid cases)
//         if (lastPunch.eventType === "CLOCK_IN") {
//           await prisma.timeClock.create({
//             data: {
//               employeeId: employee.id,
//               eventType: "CLOCK_OUT",
//               timestamp: midnight,
//               notes: "Auto CLOCK_OUT at midnight.",
//               createdBy: "SYSTEM",
//             },
//           });

//           await prisma.timeClock.create({
//             data: {
//               employeeId: employee.id,
//               eventType: "CLOCK_IN",
//               timestamp: midnightPlusOneSec,
//               notes: "Auto CLOCK_IN at midnight.",
//               createdBy: "SYSTEM",
//             },
//           });

//           console.log(
//             `Employee ${employee.id} CLOCKED_OUT & CLOCKED_IN at midnight.`
//           );
//         }
//       }
//     } catch (error) {
//       console.error("Midnight auto punch failed:", error);
//     }
//   },
//   {
//     timezone: "Asia/Kolkata", // ✅ Use IST if your app runs in India
//   }
// );
// const cron = require("node-cron");
// const prisma = require("../config/prisma");

// cron.schedule(
//   "0 0 * * *",
//   async () => {
//     console.log("Running daily midnight CLOCK_OUT + CLOCK_IN job...");

//     try {
//       const now = new Date();
//       const midnight = new Date(now.setHours(0, 0, 0, 0));
//       const midnightPlusOneSec = new Date(midnight.getTime() + 1000);
//       const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

//       const employees = await prisma.employee.findMany();

//       for (const employee of employees) {
//         const lastPunch = await prisma.timeClock.findFirst({
//           where: { employeeId: employee.id },
//           orderBy: { timestamp: "desc" },
//         });

//         // Skip if no punch exists
//         if (!lastPunch) continue;

//         // ⏱ 1. Auto clock out if last punch is over 24 hours ago and not already CLOCK_OUT
//         if (
//           lastPunch.eventType !== "CLOCK_OUT" &&
//           new Date(lastPunch.timestamp) < twentyFourHoursAgo
//         ) {
//           await prisma.timeClock.create({
//             data: {
//               employeeId: employee.id,
//               eventType: "CLOCK_OUT",
//               timestamp: new Date(),
//               notes: "Auto CLOCK_OUT after 24h inactivity.",
//               createdBy: "SYSTEM",
//             },
//           });

//           console.log(
//             `Employee ${employee.id} auto CLOCKED OUT after 24h inactivity.`
//           );
//           continue; // Skip midnight punch to avoid double clock-out
//         }

//         // 🕛 2. Auto clock out & in at midnight (for valid cases)
//         if (lastPunch.eventType === "CLOCK_IN") {
//           await prisma.timeClock.create({
//             data: {
//               employeeId: employee.id,
//               eventType: "CLOCK_OUT",
//               timestamp: midnight,
//               notes: "Auto CLOCK_OUT at midnight.",
//               createdBy: "SYSTEM",
//             },
//           });

//           await prisma.timeClock.create({
//             data: {
//               employeeId: employee.id,
//               eventType: "CLOCK_IN",
//               timestamp: midnightPlusOneSec,
//               notes: "Auto CLOCK_IN at midnight.",
//               createdBy: "SYSTEM",
//             },
//           });

//           console.log(
//             `Employee ${employee.id} CLOCKED_OUT & CLOCKED_IN at midnight.`
//           );
//         }
//       }
//     } catch (error) {
//       console.error("Midnight auto punch failed:", error);
//     }
//   },
//   {
//     timezone: "Asia/Kolkata", // ✅ Use IST if your app runs in India
//   }
// );
// const cron = require("node-cron");
// const prisma = require("../config/prisma");

// cron.schedule(
//   "0 0 * * *",
//   async () => {
//     console.log("Running daily midnight CLOCK_OUT + CLOCK_IN job...");

//     try {
//       const now = new Date();
//       const midnight = new Date(now.setHours(0, 0, 0, 0));
//       const midnightPlusOneSec = new Date(midnight.getTime() + 1000);
//       const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

//       const employees = await prisma.employee.findMany();

//       for (const employee of employees) {
//         const lastPunch = await prisma.timeClock.findFirst({
//           where: { employeeId: employee.id },
//           orderBy: { timestamp: "desc" },
//         });

//         // Skip if no punch exists
//         if (!lastPunch) continue;

//         // ⏱ 1. Auto clock out if last punch is over 24 hours ago and not already CLOCK_OUT
//         if (
//           lastPunch.eventType !== "CLOCK_OUT" &&
//           new Date(lastPunch.timestamp) < twentyFourHoursAgo
//         ) {
//           await prisma.timeClock.create({
//             data: {
//               employeeId: employee.id,
//               eventType: "CLOCK_OUT",
//               timestamp: new Date(),
//               notes: "Auto CLOCK_OUT after 24h inactivity.",
//               createdBy: "SYSTEM",
//             },
//           });

//           console.log(
//             `Employee ${employee.id} auto CLOCKED OUT after 24h inactivity.`
//           );
//           continue; // Skip midnight punch to avoid double clock-out
//         }

//         // 🕛 2. Auto clock out & in at midnight (for valid cases)
//         if (lastPunch.eventType === "CLOCK_IN") {
//           await prisma.timeClock.create({
//             data: {
//               employeeId: employee.id,
//               eventType: "CLOCK_OUT",
//               timestamp: midnight,
//               notes: "Auto CLOCK_OUT at midnight.",
//               createdBy: "SYSTEM",
//             },
//           });

//           await prisma.timeClock.create({
//             data: {
//               employeeId: employee.id,
//               eventType: "CLOCK_IN",
//               timestamp: midnightPlusOneSec,
//               notes: "Auto CLOCK_IN at midnight.",
//               createdBy: "SYSTEM",
//             },
//           });

//           console.log(
//             `Employee ${employee.id} CLOCKED_OUT & CLOCKED_IN at midnight.`
//           );
//         }
//       }
//     } catch (error) {
//       console.error("Midnight auto punch failed:", error);
//     }
//   },
//   {
//     timezone: "Asia/Kolkata", // ✅ Use IST if your app runs in India
//   }
// );

// cron.schedule(
//   "0 0 * * *",
//   async () => {
//     console.log("⏰ Running daily midnight CLOCK_OUT + CLOCK_IN job...");

//     try {
//       const now = new Date();
//       const midnight = new Date(now.setHours(0, 0, 0, 0));
//       const midnightPlusOneSec = new Date(midnight.getTime() + 1000);
//       const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

//       const employees = await prisma.employee.findMany();

//       for (const employee of employees) {
//         const lastPunch = await prisma.timeClock.findFirst({
//           where: { employeeId: employee.id },
//           orderBy: { timestamp: "desc" },
//         });

//         if (!lastPunch) continue;

//         // 1️⃣ Auto CLOCK_OUT if last punch is older than 24h and not already CLOCK_OUT
//         if (
//           lastPunch.eventType !== "CLOCK_OUT" &&
//           new Date(lastPunch.timestamp) < twentyFourHoursAgo
//         ) {
//           await prisma.timeClock.create({
//             data: {
//               employeeId: employee.id,
//               eventType: "CLOCK_OUT",
//               timestamp: new Date(),
//               notes: "Auto CLOCK_OUT after 24h inactivity.",
//               createdBy: "SYSTEM",
//             },
//           });

//           console.log(
//             `✅ Employee ${employee.id} auto CLOCKED OUT after 24h inactivity.`
//           );
//           continue; // Skip further processing
//         }

//         // 2️⃣ Daily midnight CLOCK_OUT + CLOCK_IN
//         if (lastPunch.eventType === "CLOCK_IN") {
//           await prisma.timeClock.create({
//             data: {
//               employeeId: employee.id,
//               eventType: "CLOCK_OUT",
//               timestamp: midnight,
//               notes: "Auto CLOCK_OUT at midnight.",
//               createdBy: "SYSTEM",
//             },
//           });

//           await prisma.timeClock.create({
//             data: {
//               employeeId: employee.id,
//               eventType: "CLOCK_IN",
//               timestamp: midnightPlusOneSec,
//               notes: "Auto CLOCK_IN at midnight.",
//               createdBy: "SYSTEM",
//             },
//           });

//           console.log(
//             `🌙 Employee ${employee.id} CLOCKED_OUT & CLOCKED_IN at midnight.`
//           );
//         }
//       }
//     } catch (error) {
//       console.error("❌ Midnight auto punch failed:", error);
//     }
//   },
//   {
//     timezone: "Asia/Kolkata", // 👈 Set to your local timezone
//   }
// );

const cron = require("node-cron");
const prisma = require("../config/prisma");
const moment = require("moment-timezone");

cron.schedule(
  "* * * * *",
  async () => {
    console.log(
      "⏰ Running auto CLOCK_OUT for employees who forgot to clock out at midnight..."
    );

    try {
      const employees = await prisma.employee.findMany({
        select: {
          id: true,
        },
      });

      for (const employee of employees) {
        const lastPunch = await prisma.timeClock.findFirst({
          where: { employeeId: employee.id },
          orderBy: { timestamp: "desc" },
        });

        if (!lastPunch) continue;

        const lastPunchTz = lastPunch.timezone || "Asia/Kolkata";
        const now = moment().tz(lastPunchTz);
        const lastPunchTime = moment(lastPunch.timestamp).tz(lastPunchTz);

        // Next midnight after lastPunchTime in employee's timezone
        const nextMidnight = lastPunchTime.clone().add(1, "day").startOf("day");

        // Check if current time is after next midnight (i.e. next day 00:00)
        const isPastNextMidnight = now.isSameOrAfter(nextMidnight);

        // Check if any CLOCK_OUT after last CLOCK_IN
        const clockOutAfterLastIn = await prisma.timeClock.findFirst({
          where: {
            employeeId: employee.id,
            eventType: "CLOCK_OUT",
            timestamp: {
              gt: lastPunch.timestamp,
            },
          },
        });

        if (
          lastPunch.eventType === "CLOCK_IN" &&
          isPastNextMidnight &&
          !clockOutAfterLastIn
        ) {
          await prisma.timeClock.create({
            data: {
              employeeId: employee.id,
              eventType: "CLOCK_OUT",
              timestamp: now.toDate(),
              timezone: lastPunchTz,
              notes: "Auto CLOCK_OUT after midnight if forgot to clock out",
              createdBy: "SYSTEM",
            },
          });

          console.log(
            `✅ Auto CLOCK_OUT done for employee ${employee.id} after midnight (${lastPunchTz})`
          );
        } else {
          console.log(
            `ℹ️ Employee ${employee.id} skipped — lastEvent: ${
              lastPunch.eventType
            }, now: ${now.format()}, nextMidnight: ${nextMidnight.format()}, timezone: ${lastPunchTz}`
          );
        }
      }
    } catch (error) {
      console.error("❌ Auto clock-out job failed:", error);
    }
  },
  {
    timezone: "Etc/UTC",
  }
);
