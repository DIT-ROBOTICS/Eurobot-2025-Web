import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// Set data directory
const dataDir = '/home/share/data';
console.log('API routes - Using data directory:', dataDir);

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  console.log('Creating data directory:', dataDir);
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Data directory created successfully');
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
}

// Set file paths
const rivalParamPath = path.join(dataDir, 'rival_param.yaml');
const buttonStatesPath = path.join(dataDir, 'button.json');

console.log('Rival param path:', rivalParamPath);
console.log('Button states path:', buttonStatesPath);

// GET endpoint to retrieve rival radius
router.get('/rival-radius', (req, res) => {
  try {
    // Check if file exists
    if (!fs.existsSync(rivalParamPath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Configuration file not found' 
      });
    }

    // Read and parse the YAML file
    const fileContent = fs.readFileSync(rivalParamPath, 'utf8');
    const data = yaml.load(fileContent);

    // Extract the radius value
    const radius = data?.rival_parameters?.rival_inscribed_radius || 0.22;

    res.json({ success: true, radius });
  } catch (error) {
    console.error('Error reading rival radius:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error reading configuration file',
      error: error.message
    });
  }
});

// POST endpoint to update rival radius
router.post('/rival-radius', (req, res) => {
  try {
    const { radius } = req.body;
    console.log('Update rival radius API called with:', req.body);

    if (radius === undefined || isNaN(radius)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid radius value'
      });
    }

    // Ensure the radius is within reasonable bounds (0.0m to 0.5m)
    const validRadius = Math.max(0.0, Math.min(0.5, radius));
    console.log('Validated radius:', validRadius + 'm');

    // Check if file exists, create a default if not
    let data = { rival_parameters: { rival_inscribed_radius: validRadius } };

    if (fs.existsSync(rivalParamPath)) {
      // Read existing file
      console.log('Reading YAML content:');
      const fileContent = fs.readFileSync(rivalParamPath, 'utf8');
      data = yaml.load(fileContent) || data;
    } else {
      console.log('YAML file does not exist, will create new file');
    }
    
    // Update the radius value
    console.log('Empty YAML file, using default data');
    if (!data.rival_parameters) {
      data.rival_parameters = {};
    }
    data.rival_parameters.rival_inscribed_radius = validRadius;

    // Ensure the directory exists
    const dir = path.dirname(rivalParamPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write the updated configuration back to the file
    console.log('Writing YAML content:', data);
    fs.writeFileSync(rivalParamPath, yaml.dump(data));
    console.log('YAML file updated successfully');

    res.json({ 
      success: true, 
      message: 'Rival radius updated successfully', 
      radius: validRadius 
    });
  } catch (error) {
    console.error('Error updating rival radius:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating configuration file',
      error: error.message
    });
  }
});

// GET endpoint to retrieve button states
router.get('/button-states', (req, res) => {
  try {
    console.log('Button states API called');
    
    // Check if file exists
    if (!fs.existsSync(buttonStatesPath)) {
      console.log('Button states file does not exist, returning default states');
      // Return default (all false) button states if file doesn't exist
      const defaultStates = Object.fromEntries([...Array(20).keys()].map(num => [num, false]));
      return res.json({ success: true, states: defaultStates });
    }

    // Read and parse the JSON file
    console.log('Reading button states from:', buttonStatesPath);
    const fileContent = fs.readFileSync(buttonStatesPath, 'utf8');
    const data = JSON.parse(fileContent);
    console.log('Button states loaded:', data);

    res.json({ success: true, states: data });
  } catch (error) {
    console.error('Error reading button states:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error reading button states file',
      error: error.message
    });
  }
});

// POST endpoint to update button states
router.post('/button-states', (req, res) => {
  try {
    console.log('Update button states API called with:', req.body);
    const { states } = req.body;

    if (!states || typeof states !== 'object') {
      console.error('Invalid button states provided:', states);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid button states'
      });
    }

    // Ensure the directory exists
    const dir = path.dirname(buttonStatesPath);
    console.log('Checking directory:', dir);
    if (!fs.existsSync(dir)) {
      console.log('Directory does not exist, creating it');
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write the button states to the file
    console.log('Writing button states to file:', buttonStatesPath);
    fs.writeFileSync(buttonStatesPath, JSON.stringify(states, null, 2));
    console.log('Button states updated successfully');

    res.json({ 
      success: true, 
      message: 'Button states updated successfully'
    });
  } catch (error) {
    console.error('Error updating button states:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating button states file',
      error: error.message
    });
  }
});

export default router; 