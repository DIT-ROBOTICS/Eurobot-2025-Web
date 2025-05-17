import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './api/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const API_SERVER_PORT = process.env.API_SERVER_PORT || 3001;

// Middleware
app.use(express.json());

// Only serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

// API routes
app.use('/api', apiRoutes);

// Only handle other routes in production
if (process.env.NODE_ENV === 'production') {
  // Serve the React app for all other routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Start the server
app.listen(API_SERVER_PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${API_SERVER_PORT}, binding to all interfaces`);
  console.log(`API available at: http://localhost:${API_SERVER_PORT}/api`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app; 