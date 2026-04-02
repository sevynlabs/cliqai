import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const clinic = await prisma.clinic.upsert({
    where: { slug: "clinica-demo" },
    update: {},
    create: {
      name: "Clinica Demo",
      slug: "clinica-demo",
      timezone: "America/Sao_Paulo",
      retentionDays: 365,
    },
  });

  console.log(`Created clinic: ${clinic.name} (${clinic.id})`);

  const user = await prisma.user.upsert({
    where: {
      clinicId_email: {
        clinicId: clinic.id,
        email: "admin@clinica-demo.com",
      },
    },
    update: {},
    create: {
      clinicId: clinic.id,
      email: "admin@clinica-demo.com",
      name: "Admin Demo",
      role: "OWNER",
    },
  });

  console.log(`Created user: ${user.name} (${user.email})`);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
