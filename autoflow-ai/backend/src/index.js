require('dotenv').config({ path: '../.env' }); // Load environment variables from root .env
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const integrationRoutes = require('./routes/integrations.routes');
const connectionRoutes = require('./routes/connections.routes');
const chatbotRoutes = require('./routes/chatbots.routes'); // Added chatbot routes

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/chatbots', chatbotRoutes); // Mounted chatbot routes

app.get('/', (req, res) => {
  res.send('AutoFlow AI Backend is running!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
