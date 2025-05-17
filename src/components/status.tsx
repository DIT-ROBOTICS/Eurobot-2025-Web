import { useState, useEffect } from "react";
import Status3DModel from "./Status3DModel";
import { useRosConnection } from "../utils/useRosConnection";

export default function RobotDashboard() {
  const [batteryVoltage, setBatteryVoltage] = useState(20.25);
  const [filteredVoltage, setFilteredVoltage] = useState(20.25); // Filtered voltage value
  const [plugConnected, setPlugConnected] = useState(false); // Ready signal over plug interface
  const [lastPlugTrueTime, setLastPlugTrueTime] = useState(0); // Time when the last true plug signal was received
  const [isHalfScreen, setIsHalfScreen] = useState(false); // New state for half-screen mode
  const [simaStatuses, setSimaStatuses] = useState([
    { id: "01", connected: false, url: "http://dit-sima-01.local/" },
    { id: "02", connected: false, url: "http://dit-sima-02.local/" },
    { id: "03", connected: false, url: "http://dit-sima-03.local/" },
    { id: "04", connected: false, url: "http://dit-sima-04.local/" },
    { id: "05", connected: false, url: "http://dit-sima-05.local/" },
    { id: "06", connected: false, url: "http://dit-sima-06.local/" },
    { id: "07", connected: false, url: "http://dit-sima-07.local/" },
    { id: "08", connected: false, url: "http://dit-sima-08.local/" },
  ]);
  const [isSettingOpen, setIsSettingOpen] = useState(false);
  const [hostnameInput, setHostnameInput] = useState("");
  const [hostname, setHostname] = useState(() => {
    // Get saved hostname from localStorage, use default if not found
    const saved = localStorage.getItem('bms-hostname');
    return saved || "DIT-2025-10";
  });
  // Use the shared ROS connection hook
  const { connected: rosConnected, getTopicHandler } = useRosConnection();
  const [isVoltageAvailable, setIsVoltageAvailable] = useState(true);
  // Long press reload state
  const [pressTimer, setPressTimer] = useState<any>(null);
  const [pressProgress, setPressProgress] = useState(0);
  // Device status (from ROS2 topics)
  const [deviceStatus, setDeviceStatus] = useState({
    chassis: false,
    mission: false,
    lidar: false,
    esp32: false,
    imu: false
  });
  const [rivalRadius, setRivalRadius] = useState(22); // Default rival radius in cm
  const [updateStatus, setUpdateStatus] = useState<{ 
    message: string; 
    isError: boolean; 
    visible: boolean 
  }>({ message: '', isError: false, visible: false });

  // Define the type for device status
  type DeviceStatusType = typeof deviceStatus;

  // Extract host number from hostname for connection URLs
  const hostNumber = hostname.split('-')[2] || "";
  const bmsUrl = `http://dit-2025-${hostNumber}-esp.local/`;

  // Detect half-screen mode
  useEffect(() => {
    try {
      const savedValue = localStorage.getItem('isHalfScreen');
      setIsHalfScreen(savedValue === 'true');
      
      // Listen for changes to half-screen mode from other components
      const checkHalfScreen = () => {
        try {
          const savedValue = localStorage.getItem('isHalfScreen');
          setIsHalfScreen(savedValue === 'true');
        } catch (error) {
          console.warn('Could not detect half screen mode:', error);
        }
      };

      // Add event listener for storage events
      window.addEventListener('storage', checkHalfScreen);
      document.addEventListener('visibilitychange', checkHalfScreen);
      
      // Also set up a polling mechanism to check periodically
      const interval = setInterval(checkHalfScreen, 1000);
      
      return () => {
        window.removeEventListener('storage', checkHalfScreen);
        document.removeEventListener('visibilitychange', checkHalfScreen);
        clearInterval(interval);
      };
    } catch (error) {
      console.warn('Could not detect half screen mode:', error);
    }
  }, []);

  // Subscribe to ROS topics using our shared connection
  useEffect(() => {
    if (!rosConnected || typeof window === 'undefined' || !window.ROSLIB) {
      return;
    }

      // Subscribe to battery voltage topic
    const batteryTopic = getTopicHandler('/robot_status/battery_voltage', 'std_msgs/msg/Float32');
    if (batteryTopic) {
      batteryTopic.subscribe((message: any) => {
        const voltage = parseFloat(message.data);
        if (!isNaN(voltage)) {
          setBatteryVoltage(parseFloat(voltage.toFixed(1)));
        }
      });
    }

      // Subscribe to device status topics
      const deviceTopicNames = {
        chassis: '/robot_status/usb/chassis',
        mission: '/robot_status/usb/mission',
        lidar: '/robot_status/usb/lidar',
        esp32: '/robot_status/usb/esp',
        imu: '/robot_status/usb/imu'
      };

      // Create topics and subscribe
    const deviceTopics: Record<string, any> = {};
      Object.entries(deviceTopicNames).forEach(([device, topicName]) => {
      const topic = getTopicHandler(topicName, 'std_msgs/msg/Bool');
      if (topic) {
        topic.subscribe((message: any) => {
          setDeviceStatus((prev: DeviceStatusType) => ({
            ...prev,
            [device]: message.data
          }));
        });
        deviceTopics[device] = topic;
      }
    });

    // Subscribe to robot ready signal (over plug interface)
    const plugTopic = getTopicHandler('/robot/startup/plug', 'std_msgs/msg/Bool');
    if (plugTopic) {
      plugTopic.subscribe((message: any) => {
        if (message.data) {
          // If we receive a true signal, update the connected status and record the timestamp
          setPlugConnected(true);
          setLastPlugTrueTime(Date.now());
        } else {
          // If we receive false, immediately set to false
          setPlugConnected(false);
        }
      });
      }

    // Cleanup function
    return () => {
      if (batteryTopic) {
        try {
          batteryTopic.unsubscribe();
        } catch (e) {
          console.error("Error unsubscribing from battery topic:", e);
        }
      }
      
      // Unsubscribe from all device topics
      Object.values(deviceTopics).forEach((topic: any) => {
        if (topic) {
          try {
            topic.unsubscribe();
          } catch (e) {
            console.error("Error unsubscribing from topic:", e);
          }
        }
      });
      
      // Unsubscribe from plug topic
      if (plugTopic) {
        try {
          plugTopic.unsubscribe();
        } catch (e) {
          console.error("Error unsubscribing from plug topic:", e);
        }
      }
    };
  }, [rosConnected, getTopicHandler]);

  // Add a timeout effect to reset plugConnected to false if no true signal received for 5 seconds
  useEffect(() => {
    // Skip if not currently connected
    if (!plugConnected) return;

    // Set up interval to check for timeout
    const intervalId = setInterval(() => {
      const now = Date.now();
      const timeSinceLastTrue = now - lastPlugTrueTime;
      
      // If it's been more than 5 seconds since the last true signal, set to false
      if (timeSinceLastTrue > 5000) {
        setPlugConnected(false);
      }
    }, 1000); // Check every second
    
    // Clean up interval on unmount or when plugConnected changes
    return () => clearInterval(intervalId);
  }, [plugConnected, lastPlugTrueTime]);

  // Fallback: handle disconnected state
  useEffect(() => {
    // When connection status changes
    if (rosConnected) {
      setIsVoltageAvailable(true);
    } else {
      // When disconnected, immediately reset all voltage values to zero
      setIsVoltageAvailable(false);
      setBatteryVoltage(0);
      setFilteredVoltage(0); // Immediately reset filtered voltage as well
    }
  }, [rosConnected]);

  // Apply low-pass filter to stabilize voltage readings (reduce jitter)
  useEffect(() => {
    // Skip filtering if voltage not available or zero
    if (!isVoltageAvailable || batteryVoltage === 0) {
      return;
    }
    
    // Low-pass filter - alpha determines how much new readings affect the filtered value
    // Lower alpha means more smoothing but slower response to real changes
    const alpha = 0.5;
    setFilteredVoltage((prev: number) => {
      return parseFloat((prev * (1 - alpha) + batteryVoltage * alpha).toFixed(1));
    });
  }, [batteryVoltage, isVoltageAvailable]);

  // Add monitoring for battery topic specific disconnections
  useEffect(() => {
    if (!rosConnected) return;
    
    // Create a reference for the last time we received data
    let lastUpdateTime = Date.now();
    
    // This function will be called whenever new battery data is received
    const updateTimestamp = () => {
      lastUpdateTime = Date.now();
      // Make sure voltage is marked as available when we get updates
      setIsVoltageAvailable(true);
    };
    
    // Set up an observer to watch battery voltage changes
    const batteryObserver = () => {
      // Only update timestamp if we have a positive voltage and are connected
      if (batteryVoltage > 0) {
        updateTimestamp();
      }
    };
    
    // Call observer when battery voltage changes
    batteryObserver();
    
    // Check periodically if we're still receiving updates
    const checkInterval = setInterval(() => {
      if (!rosConnected) return;
      
      const timeSinceLastUpdate = Date.now() - lastUpdateTime;
      // If no updates for 8 seconds (more tolerant), consider battery data unavailable
      if (timeSinceLastUpdate > 8000) {
        setIsVoltageAvailable(false);
      }
    }, 5000);
    
    return () => clearInterval(checkInterval);
  }, [batteryVoltage, rosConnected]);

  // Calculate battery percentage based on voltage (15V-21V range)
  const getBatteryPercentage = () => {
    if (!isVoltageAvailable) return 0;
    
    const percentage = ((filteredVoltage - 15) / (21 - 15)) * 100;
    return Math.max(0, Math.min(100, Math.round(percentage)));
  };

  // Get battery color based on percentage
  const getBatteryColor = () => {
    if (!isVoltageAvailable) return "#444444";
    
    const percentage = getBatteryPercentage();
    if (percentage > 70) return "#3bab72";
    if (percentage > 30) return "#e6a919";
    return "#d64045";
  };

  // Save hostname to localStorage
  const saveHostname = () => {
    if (hostnameInput.trim()) {
      const newHostname = hostnameInput.trim();
      setHostname(newHostname);
      localStorage.setItem('bms-hostname', newHostname);
      setIsSettingOpen(false);
      setHostnameInput("");
    }
  };

  // Check SIMA connectivity
  useEffect(() => {
    // Function to check a single SIMA device connectivity
    const checkSimaConnectivity = async (simaUrl: string) => {
      try {
        // Use fetch with a timeout to check connectivity
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
        
        const response = await fetch(simaUrl, { 
          method: 'HEAD',
          mode: 'no-cors', // This allows us to ping the URL without CORS issues
          signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        return true; // If we get here, the connection succeeded
      } catch (error) {
        return false; // Connection failed
      }
    };

    // Check all SIMA devices simultaneously
    const checkAllSimas = async () => {
      try {
        // Create an array of promises for all SIMA checks
        const checkPromises = simaStatuses.map((sima) => 
          checkSimaConnectivity(sima.url)
            .then(isConnected => ({ ...sima, connected: isConnected }))
        );
        
        // Wait for all promises to resolve in parallel
        const results = await Promise.all(checkPromises);
        
        // Update state with all results at once
        setSimaStatuses(results);
      } catch (error) {
        // Silent fail - no logging
      }
    };

    // Initial check
    checkAllSimas();
    
    // Set up periodic checks every 3 seconds
    const intervalId = setInterval(checkAllSimas, 3000);
    
    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Fetch current rival radius from backend on component mount
  useEffect(() => {
    const fetchRivalRadius = async () => {
      try {
        const response = await fetch('/api/rival-radius');
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.radius) {
          // Convert from meters to centimeters
          setRivalRadius(data.radius * 100);
        }
      } catch (error) {
        console.error("Error fetching rival radius:", error);
        // Keep using default value on error
      }
    };
    
    fetchRivalRadius();
  }, []); // Empty dependency array means this runs once on mount

  // Function to update rival radius
  const handleUpdateRivalRadius = async (newRadius: number) => {
    try {
      setUpdateStatus({ message: 'Updating...', isError: false, visible: true });
      
      // Convert from cm to m for storage
      const radiusM = newRadius / 100;
      console.log(`Sending radius update request: ${radiusM}m`);
      
      // Direct file update via API
      const response = await fetch('/api/rival-radius', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ radius: radiusM }),
      });
      
      // Check if the response is OK
      if (!response.ok) {
        // Try to parse error response
        let errorMessage = 'Failed to update radius';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = `Network error (${response.status}): ${response.statusText}`;
          console.error('Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }
      
      // Parse success response
      const jsonResponse = await response.json();
      console.log('Update response:', jsonResponse);
      
      // Set success message
      setUpdateStatus({ 
        message: `Radius updated to ${Math.round(jsonResponse.radius * 100)}cm!`, 
        isError: false, 
        visible: true 
      });
      
      // Hide the status message after 3 seconds
      setTimeout(() => {
        setUpdateStatus((prev) => ({ ...prev, visible: false }));
      }, 3000);
      
    } catch (error) {
      console.error("Error updating rival radius:", error);
      setUpdateStatus({ 
        message: error instanceof Error ? error.message : 'Error updating radius', 
        isError: true, 
        visible: true 
      });
      
      // Hide error message after 3 seconds
      setTimeout(() => {
        setUpdateStatus((prev) => ({ ...prev, visible: false }));
      }, 3000);
    }
  };

  return (
    <div className="h-full w-full bg-[#0e0e0e] p-6 overflow-y-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Status Indicators */}
          <StatusPanel title="System Status">
            <StatusItem color="green" label="MAIN" />
            <StatusItem color="yellow" label="CAMERA" />
            <StatusItem color="green" label="NAVIGATION" />
            <StatusItem color="red" label="LOCALIZATION" />
          </StatusPanel>

          {/* Checkboxes */}
          <StatusPanel title="Device Status">
            <CheckboxItem label="CHASSIS" checked={deviceStatus.chassis} />
            <CheckboxItem label="MISSION" checked={deviceStatus.mission} />
            <CheckboxItem label="LIDAR" checked={deviceStatus.lidar} />
            <CheckboxItem label="IMU" checked={deviceStatus.imu} />
            <CheckboxItem label="ESP32" checked={deviceStatus.esp32} />
          </StatusPanel>
          
          {/* 3D Model */}
          <Status3DModel />
        </div>

        <div className="space-y-6">

          {/* Robot Ready Signal Status */}
          <StatusPanel title="">
            <div className="flex items-center space-x-6">
              <div className="relative w-28 h-28 flex items-center justify-center">
                {/* Banter Loader Animation */}
                <div className={`banter-loader ${!plugConnected && 'banter-loader--inactive'}`}>
                  <div className="banter-loader__box"></div>
                  <div className="banter-loader__box"></div>
                  <div className="banter-loader__box"></div>
                  <div className="banter-loader__box"></div>
                  <div className="banter-loader__box"></div>
                  <div className="banter-loader__box"></div>
                  <div className="banter-loader__box"></div>
                  <div className="banter-loader__box"></div>
                  <div className="banter-loader__box"></div>
                </div>
              </div>
              
              <div className="flex flex-col">
                <div className="text-2xl font-bold text-white">Startup Signal</div>
                <div className={`text-xl font-mono ${plugConnected ? 'text-[#ff4d4d]' : 'text-[#777]'}`}>
                  {plugConnected ? 'READY' : 'STANDBY'}
                </div>
              </div>
            </div>
          </StatusPanel>
          
          {/* SIMA Status */}
          <StatusPanel title="SIMA Status">
            <div className="grid grid-cols-2 gap-4 min-w-[300px]">
              {simaStatuses.map((sima) => (
                <div 
                  key={sima.id} 
                  className="flex items-center space-x-3 mb-2"
                >
                  <div className={`w-6 h-6 rounded-full ${sima.connected ? "bg-[#4caf50]" : "bg-[#f44336]"} flex-shrink-0`}></div>
                  <div className="text-[#e0e0e0] uppercase text-3xl">
                    SIMA {sima.id}
                  </div>
                </div>
              ))}
            </div>
          </StatusPanel>

          {/* Battery Status */}
          <StatusPanel title="BAT STATUS">
            <div className="flex items-center gap-20 min-w-[300px]">
              <div className="text-[#ffffff] text-7xl font-bold text-left py-5 relative">
                {isVoltageAvailable ? (
                  <span className="relative">
                    {filteredVoltage.toFixed(1)} <span className="text-5xl absolute bottom-2 -right-10">V</span>
                  </span>
                ) : (
                  <span className="relative text-[#888888]">N/A</span>
                )}
                <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[#ff4d4d] to-transparent w-full opacity-70"></div>
              </div>
              
              {/* Battery Icon - New Design */}
              <div className="relative w-24 h-32">
                {/* Battery body/outline */}
                <div className="absolute inset-0 rounded-md border-2 border-[#555] bg-[#111] overflow-hidden flex flex-col">
                  {/* Battery terminals at top */}
                  <div className="h-3 w-full bg-[#333] border-b border-[#444] flex justify-center items-center">
                    <div className="w-6 h-1.5 bg-[#666] rounded-sm"></div>
                  </div>
                  
                  {/* Battery level container */}
                  <div className="flex-1 relative p-0.5">
                    {/* Battery level fill */}
                    <div 
                      className="absolute bottom-0 left-0 right-0 transition-all duration-1000"
                      style={{ 
                        height: `${getBatteryPercentage()}%`,
                        background: isVoltageAvailable 
                          ? `linear-gradient(to top, ${getBatteryColor()}, ${getBatteryColor()}88)`
                          : 'linear-gradient(to top, #333, #444)',
                        opacity: isVoltageAvailable ? 1 : 0.5
                      }}
                    ></div>
                    
                    {/* Digital display overlay */}
                    <div className="absolute inset-0 flex flex-col justify-center items-center">
                      <div className="text-center">
                        <div className="font-mono text-lg font-bold text-white mb-1">
                          {isVoltageAvailable ? `${getBatteryPercentage()}%` : "N/A"}
                        </div>
                        {isVoltageAvailable && (
                          <div className="w-full h-0.5 bg-white opacity-30 mb-2"></div>
                        )}
                        <div className="flex justify-center">
                          {isVoltageAvailable && [...Array(Math.min(5, Math.ceil(getBatteryPercentage() / 20)))].map((_, i) => (
                            <div key={i} className="w-1 h-3 bg-white mx-0.5 opacity-80"></div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Battery grid pattern */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-6 gap-[1px] pointer-events-none opacity-10">
                      {[...Array(18)].map((_, i) => (
                        <div key={i} className="border border-[#fff]"></div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Glowing indicator */}
                <div 
                  className="absolute top-2 right-2 w-2 h-2 rounded-full transition-colors duration-300"
                  style={{ 
                    backgroundColor: getBatteryColor(),
                    boxShadow: isVoltageAvailable ? `0 0 8px ${getBatteryColor()}` : 'none',
                    opacity: isVoltageAvailable ? 1 : 0.3
                  }}
                ></div>
              </div>
            </div>
          </StatusPanel>
          
          {/* BMS Panel Button (replaces Debug Panel) */}
          <StatusPanel title="BMS Panel">
            <div className="relative">
              {isSettingOpen && (
                <div className="bg-[#242424] p-4 rounded-md mb-4 relative">
                  <div className="flex flex-col">
                    <label className="text-[#e0e0e0] text-xl mb-2">Hostname (e.g. DIT-2025-10)</label>
                    <input 
                      type="text" 
                      value={hostnameInput} 
                      onChange={(e) => setHostnameInput(e.target.value)}
                      placeholder={hostname}
                      className="bg-[#333333] border border-[#444444] text-white px-3 py-2 rounded-md text-xl mb-3"
                    />
                    <div className="flex space-x-2">
                      <button 
                        onClick={saveHostname}
                        className="bg-[#d32f2f] text-white px-4 py-2 rounded-md hover:bg-[#ff4d4d]"
                      >
                        SAVE
                      </button>
                      <button 
                        onClick={() => setIsSettingOpen(false)}
                        className="bg-[#333333] text-white px-4 py-2 rounded-md hover:bg-[#444444]"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-[#e0e0e0] text-xl">Host: {hostname}</div>
                  <button 
                    onClick={() => setIsSettingOpen(!isSettingOpen)}
                    className="bg-[#333333] text-white p-2 rounded-md hover:bg-[#444444] text-xl flex items-center justify-center"
                    aria-label="Settings"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
                
                <a 
                  href={bmsUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-[#d32f2f] text-white text-2xl font-bold py-4 px-6 rounded-md w-full block text-center uppercase tracking-wider hover:bg-[#ff4d4d] transition-colors duration-300"
                >
                  CONNECT TO BMS
                </a>
              </div>
            </div>
          </StatusPanel>

          {/* Rival Robot Parameters Panel */}
          <StatusPanel title="Rival Parameters">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-[#e0e0e0] text-xl">Rival Robot Radius:</div>
                <div className="text-white text-xl font-bold">{rivalRadius} cm</div>
              </div>
              
              <div className="flex flex-col space-y-2">
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={rivalRadius}
                  onChange={(e) => setRivalRadius(parseInt(e.target.value))}
                  className="w-full h-3 bg-[#333] rounded-lg appearance-none cursor-pointer"
                />
                
                <div className="flex justify-between text-[#999] text-sm">
                  <span>0 cm</span>
                  <span>25 cm</span>
                  <span>50 cm</span>
                </div>
              </div>
              
              {updateStatus.visible && (
                <div className={`text-center py-2 rounded-md text-lg ${updateStatus.isError ? 'bg-[#3a0909] text-[#ff6b6b]' : 'bg-[#0a2e0a] text-[#6bff6b]'}`}>
                  {updateStatus.message}
                </div>
              )}
              
              <button
                onClick={() => handleUpdateRivalRadius(rivalRadius)}
                className="bg-[#d32f2f] text-white text-xl font-bold py-3 px-5 rounded-md w-full block text-center uppercase tracking-wider hover:bg-[#ff4d4d] transition-colors duration-300 mt-4"
              >
                UPDATE RADIUS
              </button>
            </div>
          </StatusPanel>
        </div>
      </div>

      {/* Floating Bridge Status Indicator - Now a refresh button */}
      <div 
        className={`fixed ${isHalfScreen ? 'bottom-40' : 'bottom-10'} right-10 z-50 flex items-center gap-8 bg-black/70 backdrop-blur-md rounded-2xl px-8 py-5 border-2 border-[#444] shadow-2xl transition-all duration-300 hover:bg-black/80 cursor-pointer select-none`}
        onMouseDown={() => {
          // Start long-press timer
          const timer = setInterval(() => {
            setPressProgress(prev => {
              const newProgress = prev + (100/30); // Complete in 3 seconds (30×100ms)
              if (newProgress >= 100) {
                // Reload the page
                window.location.reload();
                clearInterval(timer);
                return 0;
              }
              return newProgress;
            });
          }, 100);
          setPressTimer(timer);
        }}
        onMouseUp={() => {
          // Cancel long-press
          if (pressTimer) {
            clearInterval(pressTimer);
            setPressTimer(null);
            setPressProgress(0);
          }
        }}
        onMouseLeave={() => {
          // Also cancel on mouse leave
          if (pressTimer) {
            clearInterval(pressTimer);
            setPressTimer(null);
            setPressProgress(0);
          }
        }}
        onTouchStart={() => {
          // Start long-press timer (touch screen)
          const timer = setInterval(() => {
            setPressProgress(prev => {
              const newProgress = prev + (100/30); // Complete in 3 seconds
              if (newProgress >= 100) {
                // Reload the page
                window.location.reload();
                clearInterval(timer);
                return 0;
              }
              return newProgress;
            });
          }, 100);
          setPressTimer(timer);
        }}
        onTouchEnd={() => {
          // Cancel long-press (touch screen)
          if (pressTimer) {
            clearInterval(pressTimer);
            setPressTimer(null);
            setPressProgress(0);
          }
        }}
      >
        <div className="relative">
          <div className={`w-8 h-8 rounded-full ${rosConnected ? "bg-[#d32f2f]" : "bg-[#444]"}`}></div>
          {rosConnected && (
            <div className="absolute inset-0 w-8 h-8 rounded-full bg-[#d32f2f] animate-ping opacity-75"></div>
          )}
        </div>
        <div className="flex flex-col">
          <div className="text-white text-2xl font-mono font-bold leading-tight">
            ROS Bridge
          </div>
          <div className={`text-xl font-mono ${rosConnected ? "text-[#ff4d4d]" : "text-[#999]"}`}>
            {rosConnected ? "Connected" : "Press to refresh"}
          </div>
        </div>
        
        {/* Long-press progress indicator */}
        {pressProgress > 0 && (
          <div className="absolute bottom-0 left-0 h-1 bg-[#ff4d4d] rounded-b-xl" style={{ width: `${pressProgress}%` }}></div>
        )}
      </div>

      {/* Add extra bottom space to prevent content from being hidden behind fixed elements */}
      <div className="h-32 md:h-40 w-full"></div>

      <style jsx={true} global={true}>{`
        ::-webkit-scrollbar {
          display: none;
        }
        
        * {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(400%); }
        }
        
        .animate-scan {
          animation: scan 2s linear infinite;
        }
        
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .animate-spin-slow {
          animation: spin-slow 15s linear infinite;
        }

        /* Banter Loader Animation */
        .banter-loader {
          position: relative;
          width: 72px;
          height: 72px;
          transform: scale(0.7);
          transition: opacity 0.5s ease;
        }

        .banter-loader__box {
          float: left;
          position: relative;
          width: 20px;
          height: 20px;
          margin-right: 6px;
        }

        .banter-loader__box:before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background: white;
          transition: opacity 0.5s ease, transform 0.3s ease;
        }

        .banter-loader--inactive {
          opacity: 0.4;
        }

        .banter-loader--inactive .banter-loader__box:before {
          background: white;
        }

        .banter-loader__box:nth-child(3n) {
          margin-right: 0;
          margin-bottom: 6px;
        }

        .banter-loader__box:nth-child(1):before, .banter-loader__box:nth-child(4):before {
          margin-left: 26px;
        }

        .banter-loader__box:nth-child(3):before {
          margin-top: 52px;
        }

        .banter-loader__box:last-child {
          margin-bottom: 0;
        }

        @keyframes moveBox-1 {
          9.0909090909% { transform: translate(-26px, 0); }
          18.1818181818% { transform: translate(0px, 0); }
          27.2727272727% { transform: translate(0px, 0); }
          36.3636363636% { transform: translate(26px, 0); }
          45.4545454545% { transform: translate(26px, 26px); }
          54.5454545455% { transform: translate(26px, 26px); }
          63.6363636364% { transform: translate(26px, 26px); }
          72.7272727273% { transform: translate(26px, 0px); }
          81.8181818182% { transform: translate(0px, 0px); }
          90.9090909091% { transform: translate(-26px, 0px); }
          100% { transform: translate(0px, 0px); }
        }

        .banter-loader__box:nth-child(1) {
          animation: moveBox-1 4s infinite;
        }
        
        .banter-loader--inactive .banter-loader__box:nth-child(1) {
          animation: none;
        }

        @keyframes moveBox-2 {
          9.0909090909% { transform: translate(0, 0); }
          18.1818181818% { transform: translate(26px, 0); }
          27.2727272727% { transform: translate(0px, 0); }
          36.3636363636% { transform: translate(26px, 0); }
          45.4545454545% { transform: translate(26px, 26px); }
          54.5454545455% { transform: translate(26px, 26px); }
          63.6363636364% { transform: translate(26px, 26px); }
          72.7272727273% { transform: translate(26px, 26px); }
          81.8181818182% { transform: translate(0px, 26px); }
          90.9090909091% { transform: translate(0px, 26px); }
          100% { transform: translate(0px, 0px); }
        }

        .banter-loader__box:nth-child(2) {
          animation: moveBox-2 4s infinite;
        }
        
        .banter-loader--inactive .banter-loader__box:nth-child(2) {
          animation: none;
        }

        @keyframes moveBox-3 {
          9.0909090909% { transform: translate(-26px, 0); }
          18.1818181818% { transform: translate(-26px, 0); }
          27.2727272727% { transform: translate(0px, 0); }
          36.3636363636% { transform: translate(-26px, 0); }
          45.4545454545% { transform: translate(-26px, 0); }
          54.5454545455% { transform: translate(-26px, 0); }
          63.6363636364% { transform: translate(-26px, 0); }
          72.7272727273% { transform: translate(-26px, 0); }
          81.8181818182% { transform: translate(-26px, -26px); }
          90.9090909091% { transform: translate(0px, -26px); }
          100% { transform: translate(0px, 0px); }
        }

        .banter-loader__box:nth-child(3) {
          animation: moveBox-3 4s infinite;
        }
        
        .banter-loader--inactive .banter-loader__box:nth-child(3) {
          animation: none;
        }

        @keyframes moveBox-4 {
          9.0909090909% { transform: translate(-26px, 0); }
          18.1818181818% { transform: translate(-26px, 0); }
          27.2727272727% { transform: translate(-26px, -26px); }
          36.3636363636% { transform: translate(0px, -26px); }
          45.4545454545% { transform: translate(0px, 0px); }
          54.5454545455% { transform: translate(0px, -26px); }
          63.6363636364% { transform: translate(0px, -26px); }
          72.7272727273% { transform: translate(0px, -26px); }
          81.8181818182% { transform: translate(26px, -26px); }
          90.9090909091% { transform: translate(26px, 0px); }
          100% { transform: translate(0px, 0px); }
        }

        .banter-loader__box:nth-child(4) {
          animation: moveBox-4 4s infinite;
        }
        
        .banter-loader--inactive .banter-loader__box:nth-child(4) {
          animation: none;
        }

        @keyframes moveBox-5 {
          9.0909090909% { transform: translate(0, 0); }
          18.1818181818% { transform: translate(0, 0); }
          27.2727272727% { transform: translate(0, 0); }
          36.3636363636% { transform: translate(26px, 0); }
          45.4545454545% { transform: translate(26px, 0); }
          54.5454545455% { transform: translate(26px, 0); }
          63.6363636364% { transform: translate(26px, 0); }
          72.7272727273% { transform: translate(26px, 0); }
          81.8181818182% { transform: translate(26px, -26px); }
          90.9090909091% { transform: translate(0px, -26px); }
          100% { transform: translate(0px, 0px); }
        }

        .banter-loader__box:nth-child(5) {
          animation: moveBox-5 4s infinite;
        }
        
        .banter-loader--inactive .banter-loader__box:nth-child(5) {
          animation: none;
        }

        @keyframes moveBox-6 {
          9.0909090909% { transform: translate(0, 0); }
          18.1818181818% { transform: translate(-26px, 0); }
          27.2727272727% { transform: translate(-26px, 0); }
          36.3636363636% { transform: translate(0px, 0); }
          45.4545454545% { transform: translate(0px, 0); }
          54.5454545455% { transform: translate(0px, 0); }
          63.6363636364% { transform: translate(0px, 0); }
          72.7272727273% { transform: translate(0px, 26px); }
          81.8181818182% { transform: translate(-26px, 26px); }
          90.9090909091% { transform: translate(-26px, 0px); }
          100% { transform: translate(0px, 0px); }
        }

        .banter-loader__box:nth-child(6) {
          animation: moveBox-6 4s infinite;
        }
        
        .banter-loader--inactive .banter-loader__box:nth-child(6) {
          animation: none;
        }

        @keyframes moveBox-7 {
          9.0909090909% { transform: translate(26px, 0); }
          18.1818181818% { transform: translate(26px, 0); }
          27.2727272727% { transform: translate(26px, 0); }
          36.3636363636% { transform: translate(0px, 0); }
          45.4545454545% { transform: translate(0px, -26px); }
          54.5454545455% { transform: translate(26px, -26px); }
          63.6363636364% { transform: translate(0px, -26px); }
          72.7272727273% { transform: translate(0px, -26px); }
          81.8181818182% { transform: translate(0px, 0px); }
          90.9090909091% { transform: translate(26px, 0px); }
          100% { transform: translate(0px, 0px); }
        }

        .banter-loader__box:nth-child(7) {
          animation: moveBox-7 4s infinite;
        }
        
        .banter-loader--inactive .banter-loader__box:nth-child(7) {
          animation: none;
        }

        @keyframes moveBox-8 {
          9.0909090909% { transform: translate(0, 0); }
          18.1818181818% { transform: translate(-26px, 0); }
          27.2727272727% { transform: translate(-26px, -26px); }
          36.3636363636% { transform: translate(0px, -26px); }
          45.4545454545% { transform: translate(0px, -26px); }
          54.5454545455% { transform: translate(0px, -26px); }
          63.6363636364% { transform: translate(0px, -26px); }
          72.7272727273% { transform: translate(0px, -26px); }
          81.8181818182% { transform: translate(26px, -26px); }
          90.9090909091% { transform: translate(26px, 0px); }
          100% { transform: translate(0px, 0px); }
        }

        .banter-loader__box:nth-child(8) {
          animation: moveBox-8 4s infinite;
        }
        
        .banter-loader--inactive .banter-loader__box:nth-child(8) {
          animation: none;
        }

        @keyframes moveBox-9 {
          9.0909090909% { transform: translate(-26px, 0); }
          18.1818181818% { transform: translate(-26px, 0); }
          27.2727272727% { transform: translate(0px, 0); }
          36.3636363636% { transform: translate(-26px, 0); }
          45.4545454545% { transform: translate(0px, 0); }
          54.5454545455% { transform: translate(0px, 0); }
          63.6363636364% { transform: translate(-26px, 0); }
          72.7272727273% { transform: translate(-26px, 0); }
          81.8181818182% { transform: translate(-52px, 0); }
          90.9090909091% { transform: translate(-26px, 0); }
          100% { transform: translate(0px, 0); }
        }

        .banter-loader__box:nth-child(9) {
          animation: moveBox-9 4s infinite;
        }
        
        .banter-loader--inactive .banter-loader__box:nth-child(9) {
          animation: none;
        }
      `}</style>
    </div>
  );
}

function StatusPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#181818] p-6 rounded-lg shadow-md mb-6 w-full min-w-[300px]">
      {title && <h3 className="text-4xl font-bold text-[#ff4d4d] mb-6 uppercase">{title}</h3>}
      <div>{children}</div>
    </div>
  );
}

function StatusItem({ color, label }: { color: string; label: string }) {
  const colorMap = {
    green: "bg-[#4caf50]",
    yellow: "bg-[#ffb74d]",
    red: "bg-[#f44336]",
  };

  return (
    <div className="flex items-center space-x-5 mb-5">
      <div
        className={`w-8 h-8 rounded-full ${colorMap[color as keyof typeof colorMap]} flex-shrink-0`}
      ></div>
      <div className="text-[#e0e0e0] tracking-wider uppercase text-3xl min-w-[180px] break-words">
        {label}
      </div>
    </div>
  );
}

// Checkbox item component
function CheckboxItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center space-x-5 mb-5">
      <div className="w-8 h-8 border border-[#d32f2f] flex items-center justify-center flex-shrink-0">
        {checked ? (
          <div className="w-5 h-5 bg-[#d32f2f]"></div>
        ) : (
          <div className="w-5 h-5 bg-transparent"></div>
        )}
      </div>
      <div className="text-[#e0e0e0] tracking-wider uppercase text-3xl min-w-[180px] break-words">
        {label}
      </div>
    </div>
  );
}
