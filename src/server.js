import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './api/index.js';
import fs from 'fs';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const API_SERVER_PORT = process.env.API_SERVER_PORT || 3001;

// Data directory
const dataDir = '/home/share/data';

// Helper function to ensure floating point format for numbers
function formatFloatForYaml(value) {
  // Convert to number first in case it's a string
  const numValue = Number(value);
  
  // For values that are exactly integers (like 1.0), force decimal representation
  if (Number.isInteger(numValue)) {
    // Use a string with .0 to force YAML to show decimal point
    return numValue + 0.0;
  }
  
  // Round to 1 decimal place for non-integer values
  return Math.round(numValue * 10) / 10;
}

// Function to initialize default YAML files
function initializeDefaultFiles() {
  console.log("Initializing default parameter files if needed...");
  
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`Created data directory: ${dataDir}`);
    } catch (error) {
      console.error(`Failed to create data directory: ${error.message}`);
      return;
    }
  }
  
  // Define default file contents
  const defaultFiles = {
    'rival_params.yaml': {
      nav_rival_parameters: {
        rival_inscribed_radius: formatFloatForYaml(0.22)
      },
      dock_rival_parameters: {
        dock_rival_radius: formatFloatForYaml(0.46),
        dock_rival_degree: 120
      }
    },
    'nav_didilong_params.yaml': {
      robot_parameters: {
        max_linear_velocity: formatFloatForYaml(1.5),
        max_angular_velocity: formatFloatForYaml(1.0)
      }
    },
    'nav_fast_params.yaml': {
      robot_parameters: {
        max_linear_velocity: formatFloatForYaml(1.1),
        max_angular_velocity: formatFloatForYaml(12.0)
      }
    },
    'nav_slow_params.yaml': {
      robot_parameters: {
        max_linear_velocity: formatFloatForYaml(0.8),
        max_angular_velocity: formatFloatForYaml(2.0)
      }
    },
    'nav_linearBoost_params.yaml': {
      robot_parameters: {
        max_linear_velocity: formatFloatForYaml(1.1),
        max_angular_velocity: formatFloatForYaml(2.0)
      }
    },
    'nav_angularBoost_params.yaml': {
      robot_parameters: {
        max_linear_velocity: formatFloatForYaml(0.5),
        max_angular_velocity: formatFloatForYaml(12.0)
      }
    }
  };
  
  // Create default JSON files
  const defaultJsonFiles = {
    'sima.json': {
      sima_start_time: 85,
      plan_code: 1,
    }
  };
  
  // Create YAML files if they don't exist
  for (const [fileName, data] of Object.entries(defaultFiles)) {
    const filePath = path.join(dataDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      try {
        // Convert to YAML string first
        let yamlContent = yaml.dump(data);
        
        // Force decimal format for integers by replacing patterns
        if (fileName.includes('nav_')) {
          yamlContent = yamlContent.replace(/(max_linear_velocity|max_angular_velocity): (\d+)$/gm, '$1: $2.0');
        } else if (fileName === 'rival_params.yaml') {
          yamlContent = yamlContent.replace(/(rival_inscribed_radius|dock_rival_radius): (\d+)$/gm, '$1: $2.0');
        }
        
        // Now write the modified content
        fs.writeFileSync(filePath, yamlContent);
        console.log(`Created default ${fileName}`);
      } catch (error) {
        console.error(`Error creating ${fileName}: ${error.message}`);
      }
    }
  }
  
  // Create JSON files if they don't exist
  for (const [fileName, data] of Object.entries(defaultJsonFiles)) {
    const filePath = path.join(dataDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`Created default ${fileName}`);
      } catch (error) {
        console.error(`Error creating ${fileName}: ${error.message}`);
      }
    }
  }
  
  console.log("Default parameter files initialization complete");
}

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

// Initialize default parameter files
initializeDefaultFiles();

// Start the server
app.listen(API_SERVER_PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${API_SERVER_PORT}, binding to all interfaces`);
  console.log(`API available at: http://localhost:${API_SERVER_PORT}/api`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app; 