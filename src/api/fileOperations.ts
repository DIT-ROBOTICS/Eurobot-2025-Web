// fileOperations.ts - Functions for reading and writing to configuration files

/**
 * Read the rival robot parameters from the YAML file
 * @returns The rival inscribed radius in centimeters
 */
export async function getRivalRadius(): Promise<number> {
  try {
    const response = await fetch('/api/rival-radius');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    // Convert from meters to centimeters for display
    return data.radius * 100;
  } catch (error) {
    console.error('Error fetching rival radius:', error);
    // Return a default value in case of error
    return 22;
  }
}

/**
 * Update the rival robot parameters in the YAML file
 * @param radiusCm The rival inscribed radius in centimeters
 * @returns Success status and message
 */
export async function updateRivalRadius(radiusCm: number): Promise<{ success: boolean; message: string }> {
  try {
    // Convert from centimeters to meters for storage
    const radiusM = radiusCm / 100;
    
    const response = await fetch('/api/rival-radius', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ radius: radiusM }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating rival radius:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get the button states from the server
 * @returns Object with button states (key: button number, value: boolean)
 */
export async function getButtonStates(): Promise<Record<number, boolean>> {
  try {
    console.log('Fetching button states from server');
    const response = await fetch('/api/button-states');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Button states received:', data);
    
    if (data.success && data.states) {
      return data.states;
    } else {
      throw new Error('Invalid response format from server');
    }
  } catch (error) {
    console.error('Error fetching button states:', error);
    // Return default states (all false) in case of error
    return Object.fromEntries([...Array(20).keys()].map(num => [num, false]));
  }
}

/**
 * Update the button states on the server
 * @param states Object with button states (key: button number, value: boolean)
 * @returns Success status and message
 */
export async function updateButtonStates(states: Record<number, boolean>): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Sending button states to server:', states);
    const response = await fetch('/api/button-states', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ states }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Server response:', result);
    return result;
  } catch (error) {
    console.error('Error updating button states:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Reset all button states to false
 * @returns Success status and message
 */
export async function resetButtonStates(): Promise<{ success: boolean; message: string }> {
  // Create an object with all button states set to false
  const resetStates = Object.fromEntries([...Array(20).keys()].map(num => [num, false]));
  
  // Update the button states on the server
  return await updateButtonStates(resetStates);
} 