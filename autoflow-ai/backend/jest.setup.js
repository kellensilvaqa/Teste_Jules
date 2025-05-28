const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Global setup and teardown
beforeAll(async () => {
  // It's often better to run migrations and seeding outside of the test suite
  // For now, we'll focus on cleaning.
  // Ensure this matches your DATABASE_URL for testing.
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Helper function to clean the database (call this in specific test suites or tests)
// This is a basic version. More robust solutions might involve transactions or specific reset scripts.
const cleanDatabase = async () => {
  // Order matters due to foreign key constraints.
  // Start with models that are "leaves" in the dependency graph.
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});
  // await prisma.versionTask.deleteMany({}); // If VersionTask exists and is relevant
  // await prisma.version.deleteMany({}); // If Version exists
  // await prisma.task.deleteMany({}); // If Task exists
  // await prisma.project.deleteMany({}); // If Project exists
  await prisma.chatbot.deleteMany({}); // Depends on Workspace, User
  // await prisma.knowledgeBase.deleteMany({}); // Depends on Chatbot (many-to-many handled by Prisma)
  // await prisma.document.deleteMany({}); // Depends on KnowledgeBase

  await prisma.connection.deleteMany({}); // Depends on Integration, User
  // await prisma.integration.deleteMany({}); // Integrations are seeded, maybe don't delete them unless necessary
                                          // Or re-seed after delete. For now, let's assume they persist or are re-seeded separately.
  
  await prisma.usage.deleteMany({}); // Depends on User
  await prisma.workflow.deleteMany({}); // Depends on User, Workspace
  
  // await prisma.apiKey.deleteMany({}); // Depends on User
  // await prisma.notification.deleteMany({}); // Depends on User
  // await prisma.activityLog.deleteMany({}); // Depends on User
  // await prisma.userProfile.deleteMany({}); // Depends on User
  
  // Workspace members relation needs careful handling if Workspaces are deleted.
  // Prisma doesn't automatically clear implicit M-N relations when one side is deleted
  // unless specified in the schema (which it often isn't for implicit tables).
  // For now, we might need to manually clear the _WorkspaceMembers table if deleting all users/workspaces.
  // However, since User is often a core entity, we might not delete all users in all tests.

  // If UserProfile is 1-to-1 with User and User is deleted, UserProfile is usually deleted by cascade if onDelete: Cascade is set.
  // Let's delete users. This will cascade to some related tables if schema is set up for it.
  await prisma.user.deleteMany({}); 
  // Note: If `Integration` has a relation to `Workspace`, and `Workspace` to `User` (owner),
  // the order of deletion or the use of `onDelete: Cascade` in Prisma schema is critical.
  // The current schema for Integration has workspaceId but it's not a mandatory relation in the sample data.
  // Chatbot has workspaceId and userId.
  // Workflow has userId and workspaceId.
  
  // We are not deleting Workspace for now, as it might be more static or require complex setup.
  // If Workspaces were to be deleted:
  // await prisma.workspace.deleteMany({}); // Depends on User (owner)
};

// Expose prisma and cleanDatabase for use in test files
module.exports = {
  prisma,
  cleanDatabase,
};
