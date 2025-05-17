import fs from 'fs';
import yaml from 'yaml';

// Path to the YAML file
const YAML_FILE_PATH = '/home/share/data/rival_param.yaml';

/**
 * Handler for getting the current rival robot radius from the YAML file
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getRivalRadius(req, res) {
  try {
    // Check if file exists
    if (!fs.existsSync(YAML_FILE_PATH)) {
      // Return default value if file doesn't exist
      return res.status(200).json({
        success: true,
        radius: 0.22, // Default 22cm in meters
        radiusCm: 22  // Default in cm
      });
    }

    // Read the YAML file
    const fileContent = fs.readFileSync(YAML_FILE_PATH, 'utf8');
    
    if (fileContent.trim() === '') {
      // Empty file, return default
      return res.status(200).json({
        success: true,
        radius: 0.22,
        radiusCm: 22
      });
    }

    // Parse YAML data
    const data = yaml.parse(fileContent);
    
    // Extract radius or use default
    let radius = 0.22; // Default 22cm in meters
    
    if (data && data.rival_parameters && typeof data.rival_parameters.rival_inscribed_radius === 'number') {
      radius = data.rival_parameters.rival_inscribed_radius;
    }
    
    // Convert to cm for frontend
    const radiusCm = Math.round(radius * 100);
    
    return res.status(200).json({
      success: true,
      radius: radius,
      radiusCm: radiusCm
    });
  } catch (error) {
    console.error('Error reading rival radius:', error);
    
    // Return default on error
    return res.status(500).json({
      success: false,
      message: `Failed to read rival radius: ${error.message}`,
      radius: 0.22,
      radiusCm: 22
    });
  }
}

export default getRivalRadius; 