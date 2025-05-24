// default_yamlwriter.js - Helper script to create default YAML configuration files

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

// Data directory
const dataDir = '/home/share/data';

// Create default rival_params.yaml
function createRivalParamsYaml() {
  const filePath = path.join(dataDir, 'rival_params.yaml');
  const data = {
    nav_rival_parameters: {
      rival_inscribed_radius: 0.22
    },
    dock_rival_parameters: {
      dock_rival_radius: 0.46,
      dock_rival_degree: 120
    }
  };
  
  if (!fs.existsSync(filePath)) {
    try {
      fs.writeFileSync(filePath, yaml.stringify(data));
      console.log(`Created default rival_params.yaml at ${filePath}`);
    } catch (error) {
      console.error(`Error creating rival_params.yaml: ${error.message}`);
    }
  }
}

// Create default navigation parameter files
function createNavParamsYaml() {
  const profiles = {
    'nav_didilong_params.yaml': {
      robot_parameters: {
        max_linear_velocity: 1.5,
        max_angular_velocity: 1.0
      }
    },
    'nav_fast_params.yaml': {
      robot_parameters: {
        max_linear_velocity: 1.1,
        max_angular_velocity: 12.0
      }
    },
    'nav_slow_params.yaml': {
      robot_parameters: {
        max_linear_velocity: 0.8,
        max_angular_velocity: 2.0
      }
    },
    'nav_linearBoost_params.yaml': {
      robot_parameters: {
        max_linear_velocity: 1.1,
        max_angular_velocity: 2.0
      }
    },
    'nav_angularBoost_params.yaml': {
      robot_parameters: {
        max_linear_velocity: 0.5,
        max_angular_velocity: 12.0
      }
    }
  };
  
  for (const [fileName, data] of Object.entries(profiles)) {
    const filePath = path.join(dataDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      try {
        fs.writeFileSync(filePath, yaml.stringify(data));
        console.log(`Created default ${fileName} at ${filePath}`);
      } catch (error) {
        console.error(`Error creating ${fileName}: ${error.message}`);
      }
    }
  }
}

// Create default SIMA JSON file
function createSimaJson() {
  const filePath = path.join(dataDir, 'sima.json');
  const data = {
    sima_start_time: 85,
    plan_code: 1,
  };
  
  if (!fs.existsSync(filePath)) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`Created default sima.json at ${filePath}`);
    } catch (error) {
      console.error(`Error creating sima.json: ${error.message}`);
    }
  }
}

// Ensure the data directory exists
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created data directory: ${dataDir}`);
  } catch (error) {
    console.error(`Failed to create data directory: ${error.message}`);
    process.exit(1);
  }
}

// Create all default files
createRivalParamsYaml();
createNavParamsYaml();
createSimaJson();

console.log('Default YAML files created successfully'); 