// storage.ts - Utility functions for managing browser storage

/**
 * Type definition for the storage keys used in the application
 * This ensures type safety when accessing storage keys
 */
export type StorageKey = 'activePanel' | 'verticalPanel' | 'isHalfScreen';

/**
 * Get a value from localStorage with proper type conversion
 * @param key - The key to retrieve from storage
 * @param defaultValue - Default value to return if key doesn't exist
 * @returns The stored value or the default value
 */
export function getStorageItem<T>(key: StorageKey, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    
    // Parse the item based on the type of defaultValue
    if (typeof defaultValue === 'number') {
      return Number(item) as unknown as T;
    } else if (typeof defaultValue === 'boolean') {
      return (item === 'true') as unknown as T;
    } else if (typeof defaultValue === 'object') {
      return JSON.parse(item) as T;
    } else {
      return item as unknown as T;
    }
  } catch (error) {
    console.error(`Error retrieving ${key} from localStorage:`, error);
    return defaultValue;
  }
}

/**
 * Save a value to localStorage with proper type handling
 * @param key - The key to store the value under
 * @param value - The value to store
 */
export function setStorageItem<T>(key: StorageKey, value: T): void {
  try {
    if (typeof value === 'object') {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      localStorage.setItem(key, String(value));
    }
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
}

/**
 * Remove an item from localStorage
 * @param key - The key to remove
 */
export function removeStorageItem(key: StorageKey): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing ${key} from localStorage:`, error);
  }
}

/**
 * Clear all items from localStorage
 */
export function clearStorage(): void {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
}