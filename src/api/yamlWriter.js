// yamlWriter.js - Direct file writer for YAML configuration
// This script is executed directly by Node.js to modify YAML files

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

// Parse command line arguments
const args = process.argv.slice(2);
const action = args[0];
const paramValue = args[1];

// Path to the YAML file
const yamlFilePath = '/home/share/data/rival_param.yaml';
const yamlDir = path.dirname(yamlFilePath);

// Ensure the directory exists
if (!fs.existsSync(yamlDir)) {
  try {
    fs.mkdirSync(yamlDir, { recursive: true });
    console.log(`Created directory: ${yamlDir}`);
  } catch (error) {
    console.error(`Failed to create directory: ${error.message}`);
    process.exit(1);
  }
}

// Handle the 'update-radius' action
if (action === 'update-radius') {
  if (!paramValue || isNaN(parseFloat(paramValue))) {
    console.error('Invalid radius value. Please provide a number.');
    process.exit(1);
  }

  const radius = parseFloat(paramValue);
  
  // Initialize the YAML data
  let data = { 
    rival_parameters: {
      rival_inscribed_radius: radius
    }
  };

  try {
    // Check if file exists and read it
    if (fs.existsSync(yamlFilePath)) {
      const fileContent = fs.readFileSync(yamlFilePath, 'utf8');
      try {
        const existingData = yaml.parse(fileContent);
        if (existingData) {
          // Update only the radius field, preserving other data
          if (!existingData.rival_parameters) {
            existingData.rival_parameters = {};
          }
          existingData.rival_parameters.rival_inscribed_radius = radius;
          data = existingData;
        }
      } catch (parseError) {
        console.warn(`Could not parse existing YAML: ${parseError.message}`);
        // Continue with the default data
      }
    }

    // Write the updated config back to the file
    fs.writeFileSync(yamlFilePath, yaml.stringify(data));
    console.log(`Updated rival_inscribed_radius to ${radius}`);
    process.exit(0);
  } catch (error) {
    console.error(`Failed to update YAML file: ${error.message}`);
    process.exit(1);
  }
} else {
  console.error(`Unknown action: ${action}`);
  console.log('Available actions: update-radius');
  process.exit(1);
} 