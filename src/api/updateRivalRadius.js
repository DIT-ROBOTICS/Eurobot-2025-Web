import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

// Path to the YAML file
const YAML_FILE_PATH = '/home/share/data/rival_param.yaml';

/**
 * Handler for updating the rival robot radius in the YAML file
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateRivalRadius(req, res) {
  try {
    console.log('Update rival radius API called with:', req.body);
    
    const { radius } = req.body;

    if (radius === undefined || isNaN(parseFloat(radius))) {
      console.log('Invalid radius value:', radius);
      return res.status(400).json({
        success: false,
        message: 'Invalid radius value'
      });
    }

    // Ensure radius is within reasonable range (0.1m to 0.5m)
    const validRadius = Math.max(0.1, Math.min(0.5, parseFloat(radius)));
    console.log(`Validated radius: ${validRadius}m`);

    // Ensure directory exists
    const dirPath = path.dirname(YAML_FILE_PATH);
    try {
      if (!fs.existsSync(dirPath)) {
        console.log(`Creating directory: ${dirPath}`);
        fs.mkdirSync(dirPath, { recursive: true });
      }
    } catch (dirError) {
      console.error(`Failed to create directory: ${dirError.message}`);
      return res.status(500).json({
        success: false,
        message: `Cannot create directory: ${dirError.message}`
      });
    }

    // Check file access permissions
    try {
      // Try to access or create file
      if (!fs.existsSync(YAML_FILE_PATH)) {
        console.log('YAML file does not exist, will create new file');
        fs.writeFileSync(YAML_FILE_PATH, '', { flag: 'w' });
      } else {
        fs.accessSync(YAML_FILE_PATH, fs.constants.W_OK);
        console.log('YAML file exists and is writable');
      }
    } catch (accessError) {
      console.error(`File access error: ${accessError.message}`);
      return res.status(500).json({
        success: false,
        message: `Cannot access YAML file: ${accessError.message}. Please check permissions.`
      });
    }

    // Initialize or read existing data
    let data = { rival_parameters: { rival_inscribed_radius: validRadius } };

    if (fs.existsSync(YAML_FILE_PATH)) {
      try {
        const fileContent = fs.readFileSync(YAML_FILE_PATH, 'utf8');
        console.log('Read YAML content:', fileContent);
        
        if (fileContent.trim() === '') {
          console.log('Empty YAML file, using default data');
        } else {
          const existingData = yaml.parse(fileContent);
          console.log('Parsed YAML data:', existingData);

          if (existingData) {
            // Update radius while preserving other data
            if (!existingData.rival_parameters) {
              existingData.rival_parameters = {};
            }
            existingData.rival_parameters.rival_inscribed_radius = validRadius;
            data = existingData;
          }
        }
      } catch (parseError) {
        console.error(`Could not parse existing YAML: ${parseError.message}`);
        // Continue with the default data
      }
    }

    // Write the updated config to file
    const yamlString = yaml.stringify(data);
    console.log('Writing YAML content:', yamlString);
    
    fs.writeFileSync(YAML_FILE_PATH, yamlString);
    console.log('YAML file updated successfully');

    return res.status(200).json({
      success: true,
      message: `Rival radius updated to ${validRadius} meters`,
      radius: validRadius
    });
  } catch (error) {
    console.error('Error updating rival radius:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to update rival radius: ${error.message}`
    });
  }
}

export default updateRivalRadius; 