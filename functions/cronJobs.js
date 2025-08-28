const cron = require("node-cron");
const prisma = require("../config/prisma");

cron.schedule("*/5 * * * *", async () => {
  console.log(
    "Running task to auto clock-out stale entries older than 24 hours..."
  );
  try {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const employees = await prisma.employee.findMany();

    for (const employee of employees) {
      const lastPunch = await prisma.timeClock.findFirst({
        where: { employeeId: employee.id },
        orderBy: { timestamp: "desc" },
      });

      if (
        lastPunch &&
        lastPunch.eventType !== "CLOCK_OUT" &&
        lastPunch.timestamp < twentyFourHoursAgo
      ) {
        await prisma.timeClock.create({
          data: {
            employeeId: employee.id,
            eventType: "CLOCK_OUT",
            timestamp: new Date(),
            notes: "Automatically clocked out after 24 hours of inactivity.",
            createdBy: "SYSTEM",
          },
        });
        console.log(`Employee ${employee.id} auto clocked out after 24 hours.`);
      }
    }
  } catch (error) {
    console.error("Error during 24-hour auto clock-out:", error);
  }
});
