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

// Set file paths - Use only rival_params.yaml for all parameters
const rivalParamsPath = path.join(dataDir, 'rival_params.yaml');
const buttonStatesPath = path.join(dataDir, 'button.json');
const simaJSONPath = path.join(dataDir, 'sima.json');

// Set navigation parameter file paths
const navProfiles = {
  didilong: path.join(dataDir, 'nav_didilong_params.yaml'),
  fast: path.join(dataDir, 'nav_fast_params.yaml'),
  slow: path.join(dataDir, 'nav_slow_params.yaml'),
  linearBoost: path.join(dataDir, 'nav_linearBoost_params.yaml'),
  angularBoost: path.join(dataDir, 'nav_angularBoost_params.yaml')
};

// Default values for all parameters
const DEFAULT_VALUES = {
  nav_rival_radius: 0.22,
  dock_rival_radius: 0.46,
  dock_rival_degree: 120,
  nav_profiles: {
    didilong: { linear: 1.5, angular: 1.0 },
    fast: { linear: 1.1, angular: 12.0 },
    slow: { linear: 0.8, angular: 2.0 },
    linearBoost: { linear: 1.1, angular: 2.0 },
    angularBoost: { linear: 0.5, angular: 12.0 }
  },
  sima_start_time: 85
};

console.log('Rival params path:', rivalParamsPath);
console.log('Button states path:', buttonStatesPath);
console.log('SIMA JSON path:', simaJSONPath);

// Global YAML options for consistent formatting
const yamlOptions = {
  lineWidth: -1, // Don't wrap long lines
  quotingType: '"', // Use double quotes when necessary
  forceQuotes: false, // Only quote when necessary
  schema: yaml.DEFAULT_SCHEMA, // Use default schema
  styles: {
    '!!float': 'decimal' // Ensure floats have decimal representation
  }
};

// Helper function to ensure floating point format for numbers
function formatFloatForYaml(value) {
  // Convert to number first in case it's a string
  const numValue = Number(value);
  
  // For values that are exactly integers (like 1.0), force decimal representation
  if (Number.isInteger(numValue)) {
    // Use a string with .0 to force YAML to show decimal point
    return numValue + 0.0;
  }
  
  // Preserve the actual value without rounding/truncating
  return numValue;
}

// Helper function for JSON responses - returns formatted number with original precision
function formatFloatForJSON(value) {
  // Convert to number first in case it's a string
  const numValue = Number(value);
  // Use 2 decimal places for consistent formatting without rounding
  return numValue.toFixed(2).replace(/\.?0+$/, '');
}

// GET endpoint to retrieve rival radius
router.get('/rival-radius', (req, res) => {
  try {
    // Check if file exists
    if (!fs.existsSync(rivalParamsPath)) {
      // Create default file with rival radius
      const defaultData = {
        nav_rival_parameters: {
          rival_inscribed_radius: formatFloatForYaml(DEFAULT_VALUES.nav_rival_radius)
        },
        dock_rival_parameters: {
          dock_rival_radius: formatFloatForYaml(DEFAULT_VALUES.dock_rival_radius),
          dock_rival_degree: DEFAULT_VALUES.dock_rival_degree
        }
      };
      
      // Ensure the directory exists
      const dir = path.dirname(rivalParamsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(rivalParamsPath, yaml.dump(defaultData));
      console.log('Created default rival_params.yaml');
      
      return res.json({ 
        success: true, 
        message: 'Using default rival radius',
        radius: formatFloatForJSON(DEFAULT_VALUES.nav_rival_radius)
      });
    }

    // Read and parse the YAML file
    const fileContent = fs.readFileSync(rivalParamsPath, 'utf8');
    let data;
    
    try {
      data = yaml.load(fileContent);
    } catch (parseError) {
      console.error('Error parsing YAML:', parseError);
      return res.json({
        success: true,
        message: 'Error parsing file, using default radius',
        radius: formatFloatForJSON(DEFAULT_VALUES.nav_rival_radius)
      });
    }

    // Extract the radius value
    const radius = data?.nav_rival_parameters?.rival_inscribed_radius || DEFAULT_VALUES.nav_rival_radius;
    
    // Format radius for response
    const formattedRadius = formatFloatForJSON(radius);

    res.json({ 
      success: true, 
      message: 'Retrieved rival radius successfully',
      radius: formattedRadius 
    });
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
    const validRadius = Math.max(0.0, Math.min(0.5, parseFloat(radius)));
    console.log('Validated radius:', validRadius + 'm');

    // Convert to float format for YAML
    const yamlRadius = formatFloatForYaml(validRadius);

    // Default data structure if file doesn't exist
    let data = { 
      nav_rival_parameters: { 
        rival_inscribed_radius: yamlRadius 
      },
      dock_rival_parameters: { 
        dock_rival_radius: formatFloatForYaml(DEFAULT_VALUES.dock_rival_radius), 
        dock_rival_degree: DEFAULT_VALUES.dock_rival_degree 
      }
    };

    if (fs.existsSync(rivalParamsPath)) {
      // Read existing file
      console.log('Reading YAML content:');
      const fileContent = fs.readFileSync(rivalParamsPath, 'utf8');
      
      try {
        const existingData = yaml.load(fileContent);
        if (existingData) data = existingData;
      } catch (parseError) {
        console.warn(`Could not parse existing YAML: ${parseError.message}`);
      }
    } else {
      console.log('YAML file does not exist, will create new file');
    }
    
    // Update the radius value
    if (!data.nav_rival_parameters) {
      data.nav_rival_parameters = {};
    }
    data.nav_rival_parameters.rival_inscribed_radius = yamlRadius;

    // Ensure the directory exists
    const dir = path.dirname(rivalParamsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write the updated configuration back to the file
    console.log('Writing YAML content:', data);
    let yamlContent = yaml.dump(data, yamlOptions);
    yamlContent = yamlContent.replace(/(rival_inscribed_radius|dock_rival_radius): (\d+)$/gm, '$1: $2.0');
    fs.writeFileSync(rivalParamsPath, yamlContent);
    console.log('YAML file updated successfully');

    // Format radius for response
    const formattedRadius = formatFloatForJSON(validRadius);

    res.json({ 
      success: true, 
      message: 'Rival radius updated successfully', 
      radius: formattedRadius
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

// GET endpoint to retrieve dock rival parameters
router.get('/dock-rival-params', (req, res) => {
  try {
    // Check if file exists
    if (!fs.existsSync(rivalParamsPath)) {
      // Create default file with all parameters
      const defaultData = {
        nav_rival_parameters: {
          rival_inscribed_radius: formatFloatForYaml(DEFAULT_VALUES.nav_rival_radius)
        },
        dock_rival_parameters: {
          dock_rival_radius: formatFloatForYaml(DEFAULT_VALUES.dock_rival_radius),
          dock_rival_degree: DEFAULT_VALUES.dock_rival_degree
        }
      };
      
      // Ensure the directory exists
      const dir = path.dirname(rivalParamsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(rivalParamsPath, yaml.dump(defaultData));
      console.log('Created default rival_params.yaml for dock parameters');
      
      return res.json({ 
        success: true, 
        message: 'Using default dock parameters',
        radius: formatFloatForJSON(DEFAULT_VALUES.dock_rival_radius),
        degree: DEFAULT_VALUES.dock_rival_degree 
      });
    }

    // Read and parse the YAML file
    const fileContent = fs.readFileSync(rivalParamsPath, 'utf8');
    let data;
    
    try {
      data = yaml.load(fileContent);
    } catch (parseError) {
      console.error('Error parsing YAML:', parseError);
      return res.json({
        success: true,
        message: 'Error parsing file, using default dock parameters',
        radius: formatFloatForJSON(DEFAULT_VALUES.dock_rival_radius),
        degree: DEFAULT_VALUES.dock_rival_degree
      });
    }

    // Extract parameters
    const radius = data?.dock_rival_parameters?.dock_rival_radius || DEFAULT_VALUES.dock_rival_radius;
    const degree = data?.dock_rival_parameters?.dock_rival_degree || DEFAULT_VALUES.dock_rival_degree;
    
    // Format for consistent decimal places
    const formattedRadius = formatFloatForJSON(radius);

    res.json({ 
      success: true, 
      message: 'Retrieved dock parameters successfully',
      radius: formattedRadius, 
      degree 
    });
  } catch (error) {
    console.error('Error reading dock rival parameters:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error reading configuration file',
      error: error.message,
      radius: formatFloatForJSON(DEFAULT_VALUES.dock_rival_radius), // Default values on error
      degree: DEFAULT_VALUES.dock_rival_degree
    });
  }
});

// POST endpoint to update dock rival parameters
router.post('/dock-rival-params', (req, res) => {
  try {
    const { radius, degree } = req.body;
    console.log('Update dock rival parameters API called with:', req.body);

    if ((radius === undefined || isNaN(radius)) && (degree === undefined || isNaN(degree))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid parameters'
      });
    }

    // Ensure the values are within reasonable bounds
    const validRadius = radius !== undefined ? Math.max(0.0, Math.min(0.5, parseFloat(radius))) : DEFAULT_VALUES.dock_rival_radius;
    const validDegree = degree !== undefined ? Math.max(0, Math.min(360, parseInt(degree))) : DEFAULT_VALUES.dock_rival_degree;
    
    // Format radius for YAML
    const yamlRadius = formatFloatForYaml(validRadius);
    
    console.log(`Validated dock rival params: radius=${yamlRadius}m, degree=${validDegree}°`);

    // Check if file exists, create a default if not
    let data = { 
      nav_rival_parameters: { 
        rival_inscribed_radius: formatFloatForYaml(DEFAULT_VALUES.nav_rival_radius) 
      },
      dock_rival_parameters: { 
        dock_rival_radius: yamlRadius, 
        dock_rival_degree: validDegree 
      }
    };

    if (fs.existsSync(rivalParamsPath)) {
      // Read existing file
      console.log('Reading rival_params.yaml content');
      try {
        const fileContent = fs.readFileSync(rivalParamsPath, 'utf8');
        const loadedData = yaml.load(fileContent);
        if (loadedData) data = loadedData;
        
        // Make sure sections exist
        if (!data.dock_rival_parameters) {
          data.dock_rival_parameters = {};
        }
      } catch (parseError) {
        console.warn(`Could not parse existing YAML: ${parseError.message}`);
      }
    } else {
      console.log('rival_params.yaml file does not exist, will create new file');
      
      // Ensure the directory exists
      const dir = path.dirname(rivalParamsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    
    // Update the values
    data.dock_rival_parameters.dock_rival_radius = yamlRadius;
    data.dock_rival_parameters.dock_rival_degree = validDegree;

    // Write the updated configuration back to the file
    console.log('Writing YAML content:', data);
    let yamlContent = yaml.dump(data, yamlOptions);
    yamlContent = yamlContent.replace(/(rival_inscribed_radius|dock_rival_radius): (\d+)$/gm, '$1: $2.0');
    fs.writeFileSync(rivalParamsPath, yamlContent);
    console.log('YAML file updated successfully');

    // Format radius for response
    const formattedRadius = formatFloatForJSON(validRadius);

    res.json({ 
      success: true, 
      message: 'Dock rival parameters updated successfully', 
      radius: formattedRadius,
      degree: validDegree
    });
  } catch (error) {
    console.error('Error updating dock rival parameters:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating configuration file',
      error: error.message
    });
  }
});

// GET endpoint to retrieve navigation parameters
router.get('/nav-params', (req, res) => {
  try {
    // Get requested profile or default to slow
    const profile = req.query.profile || 'slow';
    
    // Ensure valid profile
    if (!navProfiles[profile]) {
      return res.status(400).json({
        success: false,
        message: `Invalid profile: ${profile}`
      });
    }
    
    const profilePath = navProfiles[profile];
    
    // Get default values for this profile
    const defaultLinear = DEFAULT_VALUES.nav_profiles[profile]?.linear || 0.8;
    const defaultAngular = DEFAULT_VALUES.nav_profiles[profile]?.angular || 2.0;
    
    // Check if file exists
    if (!fs.existsSync(profilePath)) {
      // Create default file with profile-specific values
      const defaultData = {
        robot_parameters: {
          max_linear_velocity: formatFloatForYaml(defaultLinear),
          max_angular_velocity: formatFloatForYaml(defaultAngular)
        }
      };
      
      // Ensure the directory exists
      const dir = path.dirname(profilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(profilePath, yaml.dump(defaultData));
      console.log(`Created default ${profile} profile with linear=${defaultLinear}, angular=${defaultAngular}`);
      
      return res.json({ 
        success: true, 
        profile, 
        linearVelocity: formatFloatForJSON(defaultLinear), 
        angularVelocity: formatFloatForJSON(defaultAngular) 
      });
    }

    // Read and parse the YAML file
    try {
      const fileContent = fs.readFileSync(profilePath, 'utf8');
      const data = yaml.load(fileContent);

      // Extract values
      let linearVelocity = defaultLinear;
      let angularVelocity = defaultAngular;
      
      if (data?.robot_parameters) {
        if (typeof data.robot_parameters.max_linear_velocity === 'number') {
          linearVelocity = data.robot_parameters.max_linear_velocity;
        }
        if (typeof data.robot_parameters.max_angular_velocity === 'number') {
          angularVelocity = data.robot_parameters.max_angular_velocity;
        }
      }
      
      // Format for response
      const formattedLinear = Number.isInteger(linearVelocity) ? linearVelocity.toFixed(1) : linearVelocity;
      const formattedAngular = Number.isInteger(angularVelocity) ? angularVelocity.toFixed(1) : angularVelocity;

      res.json({ 
        success: true, 
        profile, 
        linearVelocity: formattedLinear, 
        angularVelocity: formattedAngular 
      });
    } catch (parseError) {
      console.error(`Error parsing ${profile} profile:`, parseError);
      // Use default values on error
      res.json({ 
        success: true, 
        profile, 
        linearVelocity: formatFloatForJSON(defaultLinear), 
        angularVelocity: formatFloatForJSON(defaultAngular) 
      });
    }
  } catch (error) {
    console.error(`Error reading navigation parameters:`, error);
    res.status(500).json({ 
      success: false, 
      message: 'Error reading navigation parameters',
      error: error.message
    });
  }
});

// POST endpoint to update navigation parameters
router.post('/nav-params', (req, res) => {
  try {
    const { profile, linearVelocity, angularVelocity } = req.body;
    console.log('Update navigation parameters API called with:', req.body);

    if (!profile || !navProfiles[profile]) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid profile: ${profile}`
      });
    }

    if ((linearVelocity === undefined || isNaN(linearVelocity)) && 
        (angularVelocity === undefined || isNaN(angularVelocity))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid parameters'
      });
    }

    const profilePath = navProfiles[profile];
    
    // Get default values for this profile
    const defaultLinear = DEFAULT_VALUES.nav_profiles[profile]?.linear || 0.8;
    const defaultAngular = DEFAULT_VALUES.nav_profiles[profile]?.angular || 2.0;
    
    // Ensure the values are within reasonable bounds
    const validLinearVelocity = linearVelocity !== undefined 
      ? Math.max(0.1, Math.min(1.6, parseFloat(linearVelocity))) 
      : defaultLinear;
      
    const validAngularVelocity = angularVelocity !== undefined 
      ? Math.max(1.0, Math.min(15.0, parseFloat(angularVelocity))) 
      : defaultAngular;
    
    // Format for YAML
    const yamlLinear = formatFloatForYaml(validLinearVelocity);
    const yamlAngular = formatFloatForYaml(validAngularVelocity);
    
    console.log(`Validated nav params: profile=${profile}, linear=${yamlLinear}, angular=${yamlAngular}`);

    // Default data structure
    let data = { 
      robot_parameters: { 
        max_linear_velocity: yamlLinear, 
        max_angular_velocity: yamlAngular 
      } 
    };

    if (fs.existsSync(profilePath)) {
      // Read existing file
      console.log(`Reading ${profile} profile YAML content`);
      const fileContent = fs.readFileSync(profilePath, 'utf8');
      
      try {
        const existingData = yaml.load(fileContent);
        if (existingData) data = existingData;
      } catch (parseError) {
        console.warn(`Could not parse existing YAML: ${parseError.message}`);
      }
    } else {
      console.log(`${profile} profile file does not exist, will create new file`);
    }
    
    // Make sure robot_parameters section exists
    if (!data.robot_parameters) {
      data.robot_parameters = {};
    }
    
    // Update the values
    data.robot_parameters.max_linear_velocity = yamlLinear;
    data.robot_parameters.max_angular_velocity = yamlAngular;

    // Ensure the directory exists
    const dir = path.dirname(profilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write the updated configuration back to the file
    console.log('Writing navigation YAML content:', data);
    let yamlContent = yaml.dump(data, yamlOptions);
    yamlContent = yamlContent.replace(/(max_linear_velocity|max_angular_velocity): (\d+)$/gm, '$1: $2.0');
    fs.writeFileSync(profilePath, yamlContent);
    console.log(`${profile} profile file updated successfully`);

    // Format for response
    const formattedLinear = validLinearVelocity.toFixed(1);
    const formattedAngular = validAngularVelocity.toFixed(1);

    res.json({ 
      success: true, 
      message: 'Navigation parameters updated successfully',
      profile,
      linearVelocity: formattedLinear,
      angularVelocity: formattedAngular
    });
  } catch (error) {
    console.error('Error updating navigation parameters:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating navigation parameters',
      error: error.message
    });
  }
});

// GET endpoint to retrieve SIMA start offset
router.get('/sima-start-offset', (req, res) => {
  try {
    // Default offset
    let offset = 85;
    
    // Check if file exists
    if (!fs.existsSync(simaJSONPath)) {
      // Create default file
      const defaultData = { sima_start_time: offset };
      
      // Ensure the directory exists
      const dir = path.dirname(simaJSONPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(simaJSONPath, JSON.stringify(defaultData, null, 2));
      console.log('Created default sima.json with start_time:', offset);
      
      return res.json({ success: true, offset });
    }

    // Read and parse the JSON file
    try {
      const fileContent = fs.readFileSync(simaJSONPath, 'utf8');
      const data = JSON.parse(fileContent);

      // Extract offset value
      if (data && typeof data.sima_start_time === 'number') {
        offset = data.sima_start_time;
      }
    } catch (parseError) {
      console.error('Error parsing SIMA JSON:', parseError);
      // Use default value on error
    }

    res.json({ success: true, offset });
  } catch (error) {
    console.error('Error reading SIMA start offset:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error reading SIMA configuration',
      error: error.message,
      offset: 85 // Default on error
    });
  }
});

// POST endpoint to update SIMA start offset
router.post('/sima-start-offset', (req, res) => {
  try {
    const { offset } = req.body;
    console.log('Update SIMA start offset API called with:', req.body);

    if (offset === undefined || isNaN(offset)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid offset value'
      });
    }

    // Ensure the offset is within reasonable bounds (0 to 100)
    const validOffset = Math.max(0, Math.min(100, parseInt(offset)));
    console.log('Validated SIMA start offset:', validOffset);

    // Create data structure
    const data = { sima_start_time: validOffset };

    // Ensure the directory exists
    const dir = path.dirname(simaJSONPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write the updated configuration back to the file
    console.log('Writing SIMA JSON content:', data);
    fs.writeFileSync(simaJSONPath, JSON.stringify(data, null, 2));
    console.log('SIMA JSON file updated successfully');

    res.json({ 
      success: true, 
      message: 'SIMA start offset updated successfully', 
      offset: validOffset 
    });
  } catch (error) {
    console.error('Error updating SIMA start offset:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating SIMA configuration',
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
      // Return default (all false) button states and empty sequence if file doesn't exist
      const defaultStates = Object.fromEntries([...Array(20).keys()].map(num => [num, false]));
      return res.json({ success: true, states: defaultStates, sequence: [] });
    }

    // Read and parse the JSON file
    console.log('Reading button states from:', buttonStatesPath);
    const fileContent = fs.readFileSync(buttonStatesPath, 'utf8');
    const data = JSON.parse(fileContent);
    console.log('Button states loaded:', data);

    res.json({ 
      success: true, 
      states: data.states || data, // For backward compatibility
      sequence: data.sequence || [] 
    });
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
    const { states, sequence } = req.body;

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

    // Write both states and sequence to the file
    console.log('Writing button states and sequence to file:', buttonStatesPath);
    fs.writeFileSync(buttonStatesPath, JSON.stringify({ 
      states, 
      sequence: sequence || [] 
    }, null, 2));
    console.log('Button states and sequence updated successfully');

    res.json({ 
      success: true, 
      message: 'Button states and sequence updated successfully'
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

// POST endpoint to reset all parameters to default values
router.post('/reset-to-defaults', (req, res) => {
  try {
    console.log('Reset all parameters to defaults API called');
    
    // 1. Reset rival_params.yaml
    const rivalDefaultData = {
      nav_rival_parameters: {
        rival_inscribed_radius: formatFloatForYaml(DEFAULT_VALUES.nav_rival_radius)
      },
      dock_rival_parameters: {
        dock_rival_radius: formatFloatForYaml(DEFAULT_VALUES.dock_rival_radius),
        dock_rival_degree: DEFAULT_VALUES.dock_rival_degree
      }
    };
    
    // Ensure the directory exists
    if (!fs.existsSync(dataDir)) {
      console.log('Creating data directory:', dataDir);
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Write rival_params.yaml with formatted values
    let yamlContent = yaml.dump(rivalDefaultData, yamlOptions);

    // Force decimal format for integers by replacing "x:" with "x.0:"
    yamlContent = yamlContent.replace(/(rival_inscribed_radius|dock_rival_radius): (\d+)$/gm, '$1: $2.0');

    // Now write the modified content to file
    fs.writeFileSync(rivalParamsPath, yamlContent);
    console.log('Reset rival_params.yaml');
    
    // 2. Reset all navigation profiles
    const navProfiles = Object.keys(DEFAULT_VALUES.nav_profiles);
    for (const profile of navProfiles) {
      const profilePath = path.join(dataDir, `nav_${profile}_params.yaml`);
      
      // Use numeric values for floats
      const profileData = {
        robot_parameters: {
          max_linear_velocity: formatFloatForYaml(DEFAULT_VALUES.nav_profiles[profile].linear),
          max_angular_velocity: formatFloatForYaml(DEFAULT_VALUES.nav_profiles[profile].angular)
        }
      };
      
      // Write YAML content to a string first
      let yamlContent = yaml.dump(profileData, yamlOptions);
      
      // Force decimal format for integers by replacing "x:" with "x.0:"
      yamlContent = yamlContent.replace(/(max_angular_velocity|max_linear_velocity): (\d+)$/gm, '$1: $2.0');
      
      // Now write the modified content to file
      fs.writeFileSync(profilePath, yamlContent);
      console.log(`Reset ${profile} navigation profile`);
    }
    
    // 3. Reset SIMA start time
    fs.writeFileSync(simaJSONPath, JSON.stringify({
      start_time_offset: DEFAULT_VALUES.sima_start_time
    }, null, 2));
    
    // Format values for response to ensure consistent decimal places
    const responseData = {
      success: true,
      message: 'All parameters reset to defaults',
      nav_rival_radius: formatFloatForJSON(DEFAULT_VALUES.nav_rival_radius),
      dock_rival_radius: formatFloatForJSON(DEFAULT_VALUES.dock_rival_radius),
      dock_rival_degree: DEFAULT_VALUES.dock_rival_degree,
      nav_profiles: {},
      sima_start_time: DEFAULT_VALUES.sima_start_time
    };
    
    // Format navigation profiles
    for (const profile in DEFAULT_VALUES.nav_profiles) {
      responseData.nav_profiles[profile] = {
        linear: formatFloatForJSON(DEFAULT_VALUES.nav_profiles[profile].linear),
        angular: formatFloatForJSON(DEFAULT_VALUES.nav_profiles[profile].angular)
      };
    }
    
    res.json(responseData);
  } catch (error) {
    console.error('Error resetting parameters:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error resetting parameters',
      error: error.message
    });
  }
});

export default router; 