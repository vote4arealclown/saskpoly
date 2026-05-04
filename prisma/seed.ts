import { prisma } from "../src/lib/prisma";

async function main() {
  const markets = [
    {
      title: "Will Saskatoon Blades win the WHL Championship?",
      description: "The Saskatoon Blades are competing in the WHL playoffs. Will they take home the championship trophy?",
      category: "Hockey",
      yesPool: 12500,
      noPool: 8700,
      totalVolume: 21200,
      vigPercent: 2.5,
    },
    {
      title: "Saskatchewan to get over 30°C in May 2026?",
      description: "Will any weather station in Saskatchewan record a temperature above 30°C during May 2026?",
      category: "Weather",
      yesPool: 3400,
      noPool: 5600,
      totalVolume: 9000,
      vigPercent: 2.5,
    },
    {
      title: "Regina Rams win Hardy Cup?",
      description: "Will the Regina Rams football team win the U Sports Hardy Cup this season?",
      category: "Football",
      yesPool: 4500,
      noPool: 3200,
      totalVolume: 7700,
      vigPercent: 2.5,
    },
    {
      title: "Saskatoon Darts League: The Rat wins weekly?",
      description: "Will 'The Rat' win the Saskatoon Darts League weekly tournament this Thursday?",
      category: "Darts",
      yesPool: 800,
      noPool: 1200,
      totalVolume: 2000,
      vigPercent: 2.5,
    },
    {
      title: "Saskatchewan Party wins next provincial election?",
      description: "Will the Saskatchewan Party win the majority in the next provincial election?",
      category: "Politics",
      yesPool: 15000,
      noPool: 5000,
      totalVolume: 20000,
      vigPercent: 2.5,
    },
  ];

  // Create a system user for seed markets
  const systemUser = await prisma.user.upsert({
    where: { email: "system@saskpoly.local" },
    update: {},
    create: {
      email: "system@saskpoly.local",
      name: "SaskPoly System",
      role: "ADMIN",
    },
  });

  for (const market of markets) {
    await prisma.market.upsert({
      where: { id: market.title.replace(/\s+/g, "-").toLowerCase().slice(0, 20) + "-seed" },
      update: {},
      create: {
        ...market,
        creatorId: systemUser.id,
      },
    });
  }

  console.log("Seeded successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
