const request = require('supertest');
const app = require('../index'); // Assuming index.js exports app for test environment
const { prisma, cleanDatabase } = require('../../jest.setup'); // Adjust path if needed

// Hold a token for authenticated requests
let authToken;
let testUserId;

describe('Auth Endpoints', () => {
  beforeAll(async () => {
    // Ensure the NODE_ENV is 'test' or similar to connect to the test DB
    // process.env.DATABASE_URL should be set to the test database
    await cleanDatabase(); // Clean before all tests in this suite
  });

  afterAll(async () => {
    await cleanDatabase(); // Clean after all tests in this suite
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'testuser@example.com',
          password: 'password123',
          name: 'Test User',
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe('testuser@example.com');
      expect(res.body.plan).toBe('FREE'); // Default plan
      expect(res.body).not.toHaveProperty('password');
      testUserId = res.body.id; // Save for later tests
    });

    it('should fail to register a user with a duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'testuser@example.com', // Duplicate email
          password: 'password1234',
          name: 'Another Test User',
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe('User with this email already exists');
    });

    it('should fail to register a user with missing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          // email: 'missing@example.com',
          password: 'password123',
          name: 'Missing Email User',
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe('Email and password are required');
    });

    it('should fail to register a user with missing password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          // password: 'password123',
          name: 'Missing Password User',
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe('Email and password are required');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login an existing user successfully and return a token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'password123',
        });
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('testuser@example.com');
      expect(res.body.user).not.toHaveProperty('password');
      authToken = res.body.token; // Save token for authenticated requests
    });

    it('should fail to login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'wrongpassword',
        });
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should fail to login a non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nouser@example.com',
          password: 'password123',
        });
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Invalid credentials');
    });
  });

  describe('Protected Route Access', () => {
    // First, create a simple protected route for testing
    // This should be added to your actual Express app routes if it doesn't exist
    // For example, in index.js or a dedicated test route file:
    // app.get('/api/test-auth', authenticateToken, (req, res) => res.json({ message: 'Authenticated!', user: req.user }));
    
    // Let's assume we add this test route to the main app (index.js)
    // For the purpose of this test, we will assume it's there.
    // If not, this test will fail or need adjustment.
    // We'll use an existing protected route: GET /api/integrations (as it uses authenticateToken)

    it('should access a protected route with a valid token', async () => {
      expect(authToken).toBeDefined(); // Ensure token was acquired
      const res = await request(app)
        .get('/api/integrations') // Using an existing protected route
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toEqual(200);
      // Further checks can be done on the response body if needed
    });

    it('should fail to access a protected route without a token', async () => {
      const res = await request(app)
        .get('/api/integrations');
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Authorization token required');
    });

    it('should fail to access a protected route with an invalid token', async () => {
      const res = await request(app)
        .get('/api/integrations')
        .set('Authorization', 'Bearer invalidtoken123');
      expect(res.statusCode).toEqual(403); // Or 401 depending on middleware specifics
      expect(res.body.message).toBe('Token is not valid or has expired');
    });
  });
});
