const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth.middleware');

const prisma = new PrismaClient();
const router = express.Router();

// POST /api/workflows - Creates a new workflow
router.post('/', authenticateToken, async (req, res) => {
  const { name, description, workspaceId, nodes, edges, trigger } = req.body;
  const userId = req.user.userId;

  if (!name) {
    return res.status(400).json({ message: 'Workflow name is required' });
  }

  try {
    // Optional: Validate workspaceId if provided
    if (workspaceId) {
      const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
      if (!workspace) {
        return res.status(404).json({ message: `Workspace with id ${workspaceId} not found.` });
      }
      // Add check if user is part of this workspace if necessary
    }

    const newWorkflow = await prisma.workflow.create({
      data: {
        name,
        description,
        userId, // Creator of the workflow
        workspaceId, // Optional
        nodes: nodes ? JSON.stringify(nodes) : undefined,
        edges: edges ? JSON.stringify(edges) : undefined,
        trigger: trigger ? JSON.stringify(trigger) : undefined,
        status: 'DRAFT', // Default as per schema
        isActive: false, // Default to false
        // executionCount, lastRunAt, nextRunAt have defaults or are optional
      },
    });
    res.status(201).json(newWorkflow);
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// GET /api/workflows - Lists workflows for the user (or workspace)
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  // const { workspaceId } = req.query; // Optional: filter by workspace

  try {
    // For now, list workflows created by the user.
    // Later, this might expand to workflows in workspaces the user is part of.
    const workflows = await prisma.workflow.findMany({
      where: { userId }, // Or filter by workspaceId if provided
      // orderBy: { createdAt: 'desc' },
    });

    // Parse JSON fields
    const parsedWorkflows = workflows.map(wf => ({
      ...wf,
      nodes: wf.nodes ? JSON.parse(wf.nodes) : null,
      edges: wf.edges ? JSON.parse(wf.edges) : null,
      trigger: wf.trigger ? JSON.parse(wf.trigger) : null,
    }));

    res.json(parsedWorkflows);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/workflows/:id - Gets a specific workflow
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    // Ownership/permission check: User must be creator or part of the workspace
    if (workflow.userId !== userId) {
      // If workspaceId is present, add logic to check if user is member of workflow.workspaceId
      return res.status(403).json({ message: 'Forbidden: You do not have access to this workflow' });
    }
    
    const parsedWorkflow = {
        ...workflow,
        nodes: workflow.nodes ? JSON.parse(workflow.nodes) : null,
        edges: workflow.edges ? JSON.parse(workflow.edges) : null,
        trigger: workflow.trigger ? JSON.parse(workflow.trigger) : null,
    };

    res.json(parsedWorkflow);
  } catch (error) {
    console.error(`Error fetching workflow ${id}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/workflows/:id - Updates a workflow
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  const { name, description, nodes, edges, trigger, isActive, status, workspaceId } = req.body;

  try {
    const workflow = await prisma.workflow.findUnique({ where: { id } });
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }
    if (workflow.userId !== userId) { // Basic ownership check
      // Add workspace membership check if applicable
      return res.status(403).json({ message: 'Forbidden: You do not own this workflow' });
    }

    // Active Workflow Limit Check
    if (isActive === true && workflow.isActive === false) { // Check only when activating
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user && user.plan === 'FREE') {
        const activeWorkflowsCount = await prisma.workflow.count({
          where: {
            userId, // OR workspaceId if workflows are primarily workspace-owned for limits
            isActive: true,
            NOT: { status: 'ARCHIVED' }, // Assuming 'ARCHIVED' means not active
          },
        });
        if (activeWorkflowsCount >= 3) {
          return res.status(403).json({ message: 'Free plan users are limited to 3 active workflows.' });
        }
      }
    }
    
    // Validate workspaceId if being changed
    if (workspaceId && workspaceId !== workflow.workspaceId) {
        const targetWorkspace = await prisma.workspace.findUnique({ where: { id: workspaceId }});
        if (!targetWorkspace) {
            return res.status(404).json({ message: `Target workspace with id ${workspaceId} not found.`});
        }
        // Further check if user is part of this target workspace can be added here
    }


    const dataToUpdate = {
      name,
      description,
      nodes: nodes ? JSON.stringify(nodes) : undefined,
      edges: edges ? JSON.stringify(edges) : undefined,
      trigger: trigger ? JSON.stringify(trigger) : undefined,
      isActive,
      status,
      workspaceId,
    };
    // Remove undefined fields to avoid overwriting with null
    Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);

    const updatedWorkflow = await prisma.workflow.update({
      where: { id },
      data: dataToUpdate,
    });
    
    const parsedWorkflow = {
        ...updatedWorkflow,
        nodes: updatedWorkflow.nodes ? JSON.parse(updatedWorkflow.nodes) : null,
        edges: updatedWorkflow.edges ? JSON.parse(updatedWorkflow.edges) : null,
        trigger: updatedWorkflow.trigger ? JSON.parse(updatedWorkflow.trigger) : null,
    };
    res.json(parsedWorkflow);
  } catch (error) {
    console.error(`Error updating workflow ${id}:`, error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// DELETE /api/workflows/:id - Deletes a workflow
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const workflow = await prisma.workflow.findUnique({ where: { id } });
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }
    if (workflow.userId !== userId) { // Basic ownership check
      // Add workspace membership check if applicable
      return res.status(403).json({ message: 'Forbidden: You do not own this workflow' });
    }

    // Add checks for related entities if cascading delete is not set (e.g., WorkflowExecutions)
    // await prisma.workflowExecution.deleteMany({ where: { workflowId: id }}); // Example

    await prisma.workflow.delete({ where: { id } });
    res.status(204).send(); // No content
  } catch (error) {
    console.error(`Error deleting workflow ${id}:`, error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// POST /api/workflows/:workflowId/execute-mock - Simulates workflow execution
router.post('/:workflowId/execute-mock', authenticateToken, async (req, res) => {
  const { workflowId } = req.params;
  const userId = req.user.userId;

  try {
    const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    // Check ownership or if user has execution rights (e.g., part of the workspace)
    if (workflow.userId !== userId) {
      // Add workspace membership check if applicable
      return res.status(403).json({ message: 'Forbidden: You do not have permission to execute this workflow' });
    }

    if (!workflow.isActive || workflow.status !== 'PUBLISHED') {
        // Assuming only 'PUBLISHED' and 'active' workflows can be executed.
        // Adjust status check as per your workflow lifecycle. 'PUBLISHED' is not in schema, using 'ACTIVE' for now.
        // Let's assume 'isActive' is the primary flag for execution readiness.
        // A workflow might be 'ACTIVE' but in 'DRAFT' or 'ERROR' state in a more complex system.
        // For now, just checking `isActive`.
      if (!workflow.isActive) {
        return res.status(400).json({ message: 'Workflow is not active and cannot be executed.' });
      }
    }
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' }); // Should not happen if token is valid
    }

    if (user.plan === 'FREE') {
      const period = new Date().toISOString().slice(0, 7); // YYYY-MM
      const usageRecord = await prisma.usage.findUnique({
        where: {
          userId_metric_period: {
            userId: userId,
            metric: 'EXECUTIONS',
            period: period,
          },
        },
      });

      if (usageRecord && usageRecord.value >= 1000) {
        return res.status(403).json({ message: 'Monthly execution limit (1000) reached for Free plan.' });
      }

      // Increment usage
      await prisma.usage.upsert({
        where: {
          userId_metric_period: {
            userId: userId,
            metric: 'EXECUTIONS',
            period: period,
          },
        },
        update: { value: { increment: 1 } },
        create: { userId: userId, metric: 'EXECUTIONS', period: period, value: 1 },
      });
      
      // Update workflow execution count and last run time
      await prisma.workflow.update({
        where: { id: workflowId },
        data: {
            executionCount: { increment: 1 },
            lastRunAt: new Date(),
        }
      });

    } else {
      // For paid plans, just update execution count and last run time without usage check for EXECUTIONS
       await prisma.workflow.update({
        where: { id: workflowId },
        data: {
            executionCount: { increment: 1 },
            lastRunAt: new Date(),
        }
      });
    }

    // In a real scenario, you would trigger the workflow execution engine here.
    // For this mock, we just return success.
    res.status(200).json({ message: `Workflow '${workflow.name}' mock execution successful.` });

  } catch (error) {
    console.error(`Error executing workflow ${workflowId}:`, error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});


module.exports = router;
