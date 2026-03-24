const cron = require("node-cron");
const prisma = require("../config/prisma");
const moment = require("moment-timezone");

cron.schedule(
  "* * * * *",
  async () => {
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

        const nextMidnight = lastPunchTime.clone().add(1, "day").startOf("day");

        const isPastNextMidnight = now.isSameOrAfter(nextMidnight);

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
        } else {
          console.log(
            `Employee ${employee.id} skipped — lastEvent: ${
              lastPunch.eventType
            }, now: ${now.format()}, nextMidnight: ${nextMidnight.format()}, timezone: ${lastPunchTz}`,
          );
        }
      }
    } catch (error) {
      console.error("❌ Auto clock-out job failed:", error);
    }
  },
  {
    timezone: "Etc/UTC",
  },
);
