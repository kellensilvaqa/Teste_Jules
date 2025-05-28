const request = require('supertest');
const app = require('../index'); // Assuming index.js exports app for test environment
const { prisma, cleanDatabase } = require('../../jest.setup'); // Adjust path if needed

describe('Plan Limitation Endpoints', () => {
  let testUserToken;
  let testUserId;
  let createdWorkflowIds = [];

  beforeAll(async () => {
    await cleanDatabase();
    // Register a new user for these tests
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'planlimituser@example.com',
        password: 'password123',
        name: 'Plan Limit User',
      });
    expect(regRes.statusCode).toEqual(201);
    testUserId = regRes.body.id;

    // Login to get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'planlimituser@example.com',
        password: 'password123',
      });
    expect(loginRes.statusCode).toEqual(200);
    testUserToken = loginRes.body.token;
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });
  
  afterEach(async () => {
    // Clean up workflows created during tests
    for (const wfId of createdWorkflowIds) {
      try {
        await prisma.workflow.delete({ where: { id: wfId }});
      } catch (error) {
        // ignore if already deleted or error
      }
    }
    createdWorkflowIds = [];
    // Clear usage records specifically for EXECUTIONS for the test user
    try {
        await prisma.usage.deleteMany({ where: { userId: testUserId, metric: 'EXECUTIONS' }});
    } catch (error) {
        // ignore
    }
  });


  describe('Active Workflow Limit (Free Plan)', () => {
    it('should allow activating up to 3 workflows for a FREE plan user', async () => {
      for (let i = 1; i <= 3; i++) {
        const wfRes = await request(app)
          .post('/api/workflows')
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({
            name: `Active Workflow Test ${i}`,
            workspaceId: null, // Or a valid workspaceId if your setup requires
          });
        expect(wfRes.statusCode).toEqual(201);
        createdWorkflowIds.push(wfRes.body.id);

        const activateRes = await request(app)
          .put(`/api/workflows/${wfRes.body.id}`)
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({ isActive: true });
        expect(activateRes.statusCode).toEqual(200);
        expect(activateRes.body.isActive).toBe(true);
      }
    });

    it('should prevent activating a 4th workflow for a FREE plan user', async () => {
      // First, ensure 3 workflows are active
      for (let i = 1; i <= 3; i++) {
        const wfRes = await request(app)
          .post('/api/workflows')
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({ name: `Pre-existing Active Workflow ${i}` });
        expect(wfRes.statusCode).toEqual(201);
        createdWorkflowIds.push(wfRes.body.id);
        const activateRes = await request(app)
          .put(`/api/workflows/${wfRes.body.id}`)
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({ isActive: true });
        expect(activateRes.statusCode).toEqual(200);
      }

      // Attempt to create and activate a 4th workflow
      const wf4Res = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ name: 'Fourth Workflow' });
      expect(wf4Res.statusCode).toEqual(201);
      createdWorkflowIds.push(wf4Res.body.id);

      const activate4Res = await request(app)
        .put(`/api/workflows/${wf4Res.body.id}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ isActive: true });
      expect(activate4Res.statusCode).toEqual(403);
      expect(activate4Res.body.message).toBe('Free plan users are limited to 3 active workflows.');
    });
  });

  describe('Workflow Execution Limit (Free Plan)', () => {
    let activeWorkflowId;

    beforeEach(async () => {
      // Create and activate one workflow for execution tests
      const wfRes = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ name: 'Execution Test Workflow' });
      expect(wfRes.statusCode).toEqual(201);
      activeWorkflowId = wfRes.body.id;
      createdWorkflowIds.push(activeWorkflowId); // Add to cleanup

      const activateRes = await request(app)
        .put(`/api/workflows/${activeWorkflowId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ isActive: true });
      expect(activateRes.statusCode).toEqual(200);
      expect(activateRes.body.isActive).toBe(true);
    });

    it('should allow up to 1000 workflow executions for a FREE plan user in a month', async () => {
      // For test speed, we'll set usage to near limit and test the last few.
      const period = new Date().toISOString().slice(0, 7); // YYYY-MM
      await prisma.usage.upsert({
        where: { userId_metric_period: { userId: testUserId, metric: 'EXECUTIONS', period } },
        update: { value: 998 },
        create: { userId: testUserId, metric: 'EXECUTIONS', period, value: 998 },
      });

      // Execute 2 times
      for (let i = 0; i < 2; i++) {
        const execRes = await request(app)
          .post(`/api/workflows/${activeWorkflowId}/execute-mock`)
          .set('Authorization', `Bearer ${testUserToken}`);
        expect(execRes.statusCode).toEqual(200);
        expect(execRes.body.message).toContain('mock execution successful');
      }

      // Check usage record
      const usage = await prisma.usage.findUnique({
        where: { userId_metric_period: { userId: testUserId, metric: 'EXECUTIONS', period } },
      });
      expect(usage.value).toBe(1000);
    });
    
    it('should prevent more than 1000 workflow executions for a FREE plan user in a month', async () => {
      const period = new Date().toISOString().slice(0, 7); // YYYY-MM
      await prisma.usage.upsert({
        where: { userId_metric_period: { userId: testUserId, metric: 'EXECUTIONS', period } },
        update: { value: 1000 },
        create: { userId: testUserId, metric: 'EXECUTIONS', period, value: 1000 },
      });

      // Attempt to execute one more time
      const execRes = await request(app)
        .post(`/api/workflows/${activeWorkflowId}/execute-mock`)
        .set('Authorization', `Bearer ${testUserToken}`);
      expect(execRes.statusCode).toEqual(403);
      expect(execRes.body.message).toBe('Monthly execution limit (1000) reached for Free plan.');
    });
  });
});
