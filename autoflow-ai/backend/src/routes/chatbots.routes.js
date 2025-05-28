const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth.middleware');

const prisma = new PrismaClient();
const router = express.Router();

// POST /api/chatbots - Creates a new chatbot
router.post('/', authenticateToken, async (req, res) => {
  const { name, description, model, temperature, instructions, workspaceId, settings, promptTemplate, maxTokens } = req.body;
  const userId = req.user.userId; // From authenticateToken middleware

  if (!name) {
    return res.status(400).json({ message: 'Chatbot name is required' });
  }

  try {
    // Optional: Validate workspaceId if provided and workspace logic is in place
    // For now, we'll allow it to be null or set if provided.
    if (workspaceId) {
        const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }});
        if (!workspace) {
            return res.status(404).json({ message: `Workspace with id ${workspaceId} not found.`});
        }
        // Further check if user is part of this workspace can be added here
    }

    const newChatbot = await prisma.chatbot.create({
      data: {
        name,
        description,
        model, // Will use schema default if not provided
        temperature, // Will use schema default if not provided
        promptTemplate: instructions, // Assuming 'instructions' maps to 'promptTemplate'
        maxTokens, // Will use schema default if not provided
        userId, // Link to the creator user
        workspaceId, // Optional, can be null
        // status: 'DRAFT' // Default from schema
        // settings: settings ? JSON.stringify(settings) : undefined, // Default from schema is Json?
        // knowledgeBases will be linked separately, not as a direct JSON field
      },
    });
    res.status(201).json(newChatbot);
  } catch (error) {
    console.error('Error creating chatbot:', error);
    // Check for specific Prisma errors if needed, e.g., P2002 for unique constraint
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// GET /api/chatbots - Retrieves all chatbots for the logged-in user
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const chatbots = await prisma.chatbot.findMany({
      where: { userId }, // Filter by the user who created/owns them
      // Add orderBy or pagination if needed
    });
    res.json(chatbots);
  } catch (error) {
    console.error('Error fetching chatbots:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/chatbots/:id - Retrieves a specific chatbot by its ID
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  try {
    const chatbot = await prisma.chatbot.findUnique({
      where: { id },
    });

    if (!chatbot) {
      return res.status(404).json({ message: 'Chatbot not found' });
    }
    // In our schema, Chatbot is directly linked to User via `userId`
    // If we used a different relation for ownership, we'd check that.
    // For now, this implies only the creator can fetch, which might be fine for MVP.
    // If chatbots are workspace-level entities, access control might be via workspace membership.
    if (chatbot.userId !== userId) {
        // This check assumes chatbots are user-owned.
        // If they are primarily workspace-owned, this logic needs adjustment.
        // For now, let's assume if a workspaceId is present, user must be part of that workspace.
        // However, the current schema has `userId` on Chatbot, not `creatorId`.
        // Let's stick to `userId` for ownership check for now.
       return res.status(403).json({ message: 'Forbidden: Chatbot does not belong to user or user is not authorized' });
    }

    res.json(chatbot);
  } catch (error) {
    console.error(`Error fetching chatbot ${id}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/chatbots/:id - Updates a specific chatbot
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  const { name, description, model, temperature, promptTemplate, status, maxTokens, settings, workspaceId } = req.body;

  try {
    const chatbot = await prisma.chatbot.findUnique({ where: { id } });
    if (!chatbot) {
      return res.status(404).json({ message: 'Chatbot not found' });
    }
    if (chatbot.userId !== userId) { // Ownership check
      return res.status(403).json({ message: 'Forbidden: You do not own this chatbot' });
    }

    // Validate workspaceId if provided
    if (workspaceId && workspaceId !== chatbot.workspaceId) {
        const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }});
        if (!workspace) {
            return res.status(404).json({ message: `Workspace with id ${workspaceId} not found.`});
        }
        // Further check if user is part of this workspace can be added here
    }

    const dataToUpdate = {
        name,
        description,
        model,
        temperature,
        promptTemplate, // Renamed from 'instructions'
        status,
        maxTokens,
        settings, // Prisma handles JSON conversion
        workspaceId,
    };

    // Remove undefined fields to avoid overwriting with null
    Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);


    const updatedChatbot = await prisma.chatbot.update({
      where: { id },
      data: dataToUpdate,
    });
    res.json(updatedChatbot);
  } catch (error) {
    console.error(`Error updating chatbot ${id}:`, error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// DELETE /api/chatbots/:id - Deletes a specific chatbot
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const chatbot = await prisma.chatbot.findUnique({ where: { id } });
    if (!chatbot) {
      return res.status(404).json({ message: 'Chatbot not found' });
    }
    if (chatbot.userId !== userId) { // Ownership check
      return res.status(403).json({ message: 'Forbidden: You do not own this chatbot' });
    }

    // Add checks for related entities if cascading delete is not set (e.g., Conversations)
    // For instance, delete related conversations first or handle via Prisma schema (onDelete: Cascade)
    await prisma.message.deleteMany({ where: { conversation: { chatbotId: id } } });
    await prisma.conversation.deleteMany({ where: { chatbotId: id } });
    // If KnowledgeBase <-> Chatbot is many-to-many, Prisma handles join table records automatically on delete if relation is set up.
    // If it's one-to-many from Chatbot to KnowledgeBase (unlikely), those would need handling.

    await prisma.chatbot.delete({ where: { id } });
    res.status(204).send(); // No content
  } catch (error) {
    console.error(`Error deleting chatbot ${id}:`, error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

module.exports = router;
