import { useState } from 'react';

interface FileAccessResponse {
  success: boolean;
  message: string;
}

export function useDirectFileAccess() {
  const [loading, setLoading] = useState(false);
  
  /**
   * Updates the rival robot parameters in the YAML file
   * @param radiusCm Radius in centimeters
   * @returns Status of the update operation
   */
  const updateRivalRadius = async (radiusCm: number): Promise<FileAccessResponse> => {
    setLoading(true);
    
    try {
      // Convert from cm to m
      const radiusM = radiusCm / 100;
      
      // Use the fetch API to call a command that will update the YAML file
      // This assumes you have set up a simple API endpoint to execute commands 
      const response = await fetch('/api/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: `mkdir -p /home/share/data && cat > /home/share/data/rival_param.yaml << EOF
rival_parameters:
  rival_inscribed_radius: ${radiusM.toFixed(2)}
EOF`
        }),
      });
      
      const result = await response.json();
      
      setLoading(false);
      return {
        success: result.success,
        message: result.success ? 'Rival radius updated successfully' : result.message || 'Failed to update'
      };
    } catch (error) {
      setLoading(false);
      console.error('Error updating rival radius:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };
  
  return {
    updateRivalRadius,
    loading
  };
} 