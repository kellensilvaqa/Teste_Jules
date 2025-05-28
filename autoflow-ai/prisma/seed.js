const { PrismaClient } = require('@prisma/client');
const sampleIntegrations = require('../backend/src/data/sampleIntegrations'); // Adjust path as needed

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding integrations...');

  for (const integrationData of sampleIntegrations) {
    // Ensure JSON fields are strings if your schema expects that, or objects if it expects Json
    const dataToUpsert = {
      ...integrationData,
      config: integrationData.config ? JSON.stringify(integrationData.config) : undefined,
      auth: integrationData.auth ? JSON.stringify(integrationData.auth) : undefined,
      endpoints: integrationData.endpoints ? JSON.stringify(integrationData.endpoints) : undefined,
      credentials: integrationData.credentials ? JSON.stringify(integrationData.credentials) : undefined,
      settings: integrationData.settings ? JSON.stringify(integrationData.settings) : undefined,
      // workspaceId is optional and not present in sample data, so it will be null
    };

    // Remove fields that are not in the Integration model or are auto-generated if necessary
    // For example, if 'id' is auto-generated and you don't want to specify it:
    // delete dataToUpsert.id; // If using auto-generated IDs and not CUIDs provided in sample

    const integration = await prisma.integration.upsert({
      where: { id: integrationData.id }, // Using the CUID from sample data as the unique identifier
      update: dataToUpsert,
      create: dataToUpsert,
    });
    console.log(`Created/Updated integration with id: ${integration.id} (${integration.name})`);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
