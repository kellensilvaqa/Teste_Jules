const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth.middleware');

const prisma = new PrismaClient();
const router = express.Router();

// POST /api/connections - Creates a new connection
router.post('/', authenticateToken, async (req, res) => {
  const { integrationId, name, credentials } = req.body;
  const userId = req.user.userId; // From authenticateToken middleware

  if (!integrationId || !name || !credentials) {
    return res.status(400).json({ message: 'integrationId, name, and credentials are required' });
  }

  try {
    // Verify the integration exists
    const integration = await prisma.integration.findUnique({ where: { id: integrationId } });
    if (!integration) {
      return res.status(404).json({ message: 'Integration not found' });
    }

    // For now, store credentials as a JSON string. Encryption should be added later.
    const newConnection = await prisma.connection.create({
      data: {
        userId,
        integrationId,
        name,
        credentials: JSON.stringify(credentials), // Store as JSON string
        // status and settings can be defaulted or set if provided
      },
    });
    res.status(201).json(newConnection);
  } catch (error) {
    console.error('Error creating connection:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/connections - Retrieves all connections for the logged-in user
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const connections = await prisma.connection.findMany({
      where: { userId },
      include: { integration: true }, // Include related integration details
    });
    // Parse credentials string back to object for response
    const parsedConnections = connections.map(conn => ({
        ...conn,
        credentials: conn.credentials ? JSON.parse(conn.credentials) : null
    }));
    res.json(parsedConnections);
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/connections/:id - Retrieves a specific connection by its ID
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  try {
    const connection = await prisma.connection.findUnique({
      where: { id },
      include: { integration: true },
    });

    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }
    if (connection.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden: Connection does not belong to user' });
    }
    // Parse credentials
    const parsedConnection = {
        ...connection,
        credentials: connection.credentials ? JSON.parse(connection.credentials) : null
    };
    res.json(parsedConnection);
  } catch (error) {
    console.error(`Error fetching connection ${id}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/connections/:id - Updates a specific connection
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  const { name, credentials, settings } = req.body; // Allow updating name, credentials, settings

  try {
    const connection = await prisma.connection.findUnique({ where: { id } });
    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }
    if (connection.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden: Connection does not belong to user' });
    }

    const dataToUpdate = {};
    if (name) dataToUpdate.name = name;
    if (credentials) dataToUpdate.credentials = JSON.stringify(credentials);
    if (settings) dataToUpdate.settings = JSON.stringify(settings); // Assuming settings is also JSON

    const updatedConnection = await prisma.connection.update({
      where: { id },
      data: dataToUpdate,
    });
    // Parse credentials
    const parsedConnection = {
        ...updatedConnection,
        credentials: updatedConnection.credentials ? JSON.parse(updatedConnection.credentials) : null,
        settings: updatedConnection.settings ? JSON.parse(updatedConnection.settings) : null,
    };
    res.json(parsedConnection);
  } catch (error) {
    console.error(`Error updating connection ${id}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/connections/:id - Deletes a specific connection
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const connection = await prisma.connection.findUnique({ where: { id } });
    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }
    if (connection.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden: Connection does not belong to user' });
    }

    await prisma.connection.delete({ where: { id } });
    res.status(204).send(); // No content
  } catch (error) {
    console.error(`Error deleting connection ${id}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
