import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Better Auth manages user/session/account/organization tables.
  // Seed only creates a demo organization and clinic settings for development.
  const org = await prisma.organization.upsert({
    where: { slug: "clinica-demo" },
    update: {},
    create: {
      id: "demo-org-001",
      name: "Clinica Demo",
      slug: "clinica-demo",
      createdAt: new Date(),
    },
  });

  console.log(`Created organization: ${org.name} (${org.id})`);

  const settings = await prisma.clinicSettings.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      timezone: "America/Sao_Paulo",
      retentionDays: 365,
    },
  });

  console.log(`Created clinic settings: timezone=${settings.timezone}`);
  console.log("Seed complete.");
  console.log(
    "Note: Users are created via Better Auth signup, not seeds.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
