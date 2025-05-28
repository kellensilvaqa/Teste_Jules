const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth.middleware'); // Correct path

const prisma = new PrismaClient();
const router = express.Router();

// GET /api/integrations - Retrieve all available integrations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const integrations = await prisma.integration.findMany({
      // For MVP, we list all. Later, we might filter by global (workspaceId: null)
      // or specific workspace integrations based on user's context.
    });

    // Parse JSON string fields back into objects for the response
    const parsedIntegrations = integrations.map(int => ({
      ...int,
      config: int.config ? JSON.parse(int.config) : null,
      auth: int.auth ? JSON.parse(int.auth) : null,
      endpoints: int.endpoints ? JSON.parse(int.endpoints) : null,
      credentials: int.credentials ? JSON.parse(int.credentials) : null, // Should not be sent generally
      settings: int.settings ? JSON.parse(int.settings) : null,
    }));

    res.json(parsedIntegrations);
  } catch (error) {
    console.error('Error fetching integrations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/integrations/:slug - Retrieve a single integration by its slug
router.get('/:slug', authenticateToken, async (req, res) => {
  const { slug } = req.params;
  try {
    const integration = await prisma.integration.findUnique({
      where: { slug },
    });

    if (!integration) {
      return res.status(404).json({ message: 'Integration not found' });
    }

    // Parse JSON string fields
    const parsedIntegration = {
        ...integration,
        config: integration.config ? JSON.parse(integration.config) : null,
        auth: integration.auth ? JSON.parse(integration.auth) : null,
        endpoints: integration.endpoints ? JSON.parse(integration.endpoints) : null,
        credentials: integration.credentials ? JSON.parse(integration.credentials) : null,
        settings: integration.settings ? JSON.parse(integration.settings) : null,
    };

    res.json(parsedIntegration);
  } catch (error) {
    console.error(`Error fetching integration ${slug}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


module.exports = router;
