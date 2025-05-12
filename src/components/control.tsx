import { useState, useEffect } from "react";

interface ControlAreaProps {
  title: string;
  description?: string;
  icon?: string;
  onClick: () => void;
  active: boolean;
  statusOptions?: string[];
}

function ControlArea({ title, description, icon, onClick, active, statusOptions = [] }: ControlAreaProps) {
  const [hoverState, setHoverState] = useState(false);
  
  // Split title into words for better display
  const words = title.split(' ');

  return (
    <div
      className={`bg-[#181818] rounded-lg p-8 md:p-10 shadow-md h-auto min-h-[300px] min-w-[350px] flex flex-col justify-center items-center cursor-pointer transition-all duration-300 border border-[#333333] ${
        active
          ? "border-3 border-[#d32f2f] scale-[1.02] shadow-lg shadow-[#d32f2f]/20"
          : hoverState
          ? "border-2 border-[#ff4d4d] scale-[1.01] shadow-md"
          : "hover:border hover:border-[#ff4d4d] hover:scale-[1.01]"
      }`}
      onClick={onClick}
      onMouseEnter={() => setHoverState(true)}
      onMouseLeave={() => setHoverState(false)}
    >
      {icon && (
        <div className={`mb-6 md:mb-8 text-7xl md:text-8xl ${active ? "text-[#ff4d4d]" : "text-[#e0e0e0]"} transition-colors duration-300 ${hoverState ? "animate-pulse" : ""}`}>
          {icon}
        </div>
      )}
      <div className="text-white text-center min-w-[280px]">
        {words.map((word, index) => (
          <div key={index} className="text-4xl md:text-5xl mb-3 md:mb-4 font-semibold uppercase tracking-wider">
            {word}
          </div>
        ))}
      </div>
      {description && (
        <p className="mt-4 md:mt-5 text-xl md:text-2xl text-center max-w-[320px] md:max-w-[500px] tracking-wide text-[#e0e0e0]">
          {description}
        </p>
      )}
      <div className={`mt-5 h-3 w-24 rounded-full transition-all duration-500 ${
        active ? "bg-[#d32f2f] w-32" : "bg-[#ff4d4d] w-24"
      }`}></div>
      
      {active && statusOptions.length > 0 && (
        <div className="mt-5 md:mt-6 flex flex-wrap gap-3 justify-center">
          {statusOptions.map((option, idx) => (
            <button 
              key={idx}
              className="px-4 py-3 text-xl md:text-2xl bg-[#242424] hover:bg-[#2c2c2c] rounded-md text-white transition-colors uppercase tracking-wide break-words"
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ControlAreas() {
  // State for active control area
  const [activeArea, setActiveArea] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState("");
  const [actionTime, setActionTime] = useState("");
  const [actionHistory, setActionHistory] = useState<Array<{action: string, time: string}>>([]);
  const [robotStatus, setRobotStatus] = useState("online");  // online, standby, offline
  const [batteryLevel, setBatteryLevel] = useState(78);

  // Callback for clicking on a control area
  const handleAreaClick = (area: string) => {
    const action = `Activated ${area} control`;
    const timeString = new Date().toLocaleTimeString();
    
    // If already active, deactivate
    if (activeArea === area) {
      setActiveArea(null);
      setLastAction(`Deactivated ${area} control`);
      setActionTime(timeString);
      setActionHistory(prev => [...prev.slice(-4), {action: `Deactivated ${area} control`, time: timeString}]);
      return;
    }
    
    setActiveArea(area);
    setLastAction(action);
    setActionTime(timeString);
    
    // Add to action history
    setActionHistory(prev => [...prev.slice(-4), {action, time: timeString}]);
    
    // Simulate battery usage
      setBatteryLevel(prev => Math.max(prev - Math.floor(Math.random() * 3), 0));
  };

  // Auto-deactivate areas after 30 seconds of inactivity
  useEffect(() => {
    if (!activeArea) return;
    
    const isDeactivating = true;
    const timer = setTimeout(() => {
      const action = `${activeArea} control timed out`;
      setLastAction(action);
      const timeString = new Date().toLocaleTimeString();
      setActionTime(timeString);
      setActionHistory(prev => [...prev.slice(-4), {action, time: timeString}]);
      setActiveArea(null);
    }, 30000);
    
    return () => clearTimeout(timer);
  }, [activeArea]);
  
  // Battery level simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setBatteryLevel(prev => {
        // Slowly drain battery when any control is active
        if (activeArea) {
          return Math.max(prev - 1, 0);
        }
        // Slowly recharge when no controls are active (unless totally dead)
        else if (prev < 100 && prev > 0) {
          return Math.min(prev + 1, 100);
        }
        return prev;
      });
    }, 10000);
    
    return () => clearInterval(interval);
  }, [activeArea]);
  
  // Random robot status changes
  useEffect(() => {
    const interval = setInterval(() => {
      const random = Math.random();
      if (random < 0.1) {
        const prevStatus = robotStatus;
        const newStatus = random < 0.03 ? "offline" : random < 0.07 ? "standby" : "online";
        if (prevStatus !== newStatus) {
          setRobotStatus(newStatus);
          const action = `Robot status changed to ${newStatus}`;
          setLastAction(action);
          const timeString = new Date().toLocaleTimeString();
          setActionTime(timeString);
          setActionHistory(prev => [...prev.slice(-4), {action, time: timeString}]);
        }
    }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [robotStatus]);

  return (
    <div className="flex flex-col h-full w-full bg-[#0e0e0e] p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-5xl md:text-6xl font-bold text-white pl-2 uppercase tracking-wider break-words">Robot Control Panel</h2>
        
        <div className="flex flex-wrap items-center space-x-5">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full mr-3 ${
              robotStatus === 'online' ? 'bg-white' :
              robotStatus === 'standby' ? 'bg-[#ffb74d]' : 'bg-[#f44336]'
            }`}></div>
            <span className="text-2xl md:text-3xl text-[#e0e0e0] tracking-wide">
              {robotStatus === 'online' ? 'Online' :
               robotStatus === 'standby' ? 'Standby' : 'Offline'}
            </span>
          </div>
          
          <div className="flex items-center">
            <div className="w-36 h-6 bg-[#242424] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000"
                style={{ 
                  width: `${batteryLevel}%`,
                  backgroundColor: batteryLevel > 50 ? '#ffffff' : batteryLevel > 20 ? '#ffb74d' : '#f44336'
                }}
              ></div>
            </div>
            <span className="ml-3 text-xl md:text-2xl text-[#e0e0e0]">{batteryLevel}%</span>
          </div>
        </div>
      </div>
      
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <ControlArea
          title="Strategy Preview"
          description="View and simulate the robot's planned path and strategy"
          icon=""
          onClick={() => handleAreaClick("strategy")}
          active={activeArea === "strategy"}
          statusOptions={["Run Simulation", "Show Path", "Clear"]}
        />
        <ControlArea
          title="Mode Change"
          description="Switch between manual, autonomous, and debug modes"
          icon=""
          onClick={() => handleAreaClick("mode")}
          active={activeArea === "mode"}
          statusOptions={["Manual", "Autonomous", "Debug"]}
        />
        <ControlArea
          title="Plan Select"
          description="Choose between different mission plans and sequences"
          icon=""
          onClick={() => handleAreaClick("plan")}
          active={activeArea === "plan"}
          statusOptions={["Plan A", "Plan B", "Custom"]}
        />
      </div>
      
      <div className="mt-auto">
        {/* Action history log */}
        <div className="mt-6 md:mt-8 p-5 bg-[#181818] rounded-md border border-[#333333]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white text-2xl md:text-3xl font-medium uppercase tracking-wider">Recent Actions</h3>
            <div className="text-lg text-[#ff4d4d]">System Time: {new Date().toLocaleTimeString()}</div>
          </div>
          
          <div className="space-y-4 max-h-32 md:max-h-40 overflow-y-auto">
            {actionHistory.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-xl md:text-2xl border-b border-[#333333] pb-3">
                <span className="text-[#ff4d4d] tracking-wide break-words max-w-[70%]">{item.action}</span>
                <span className="text-[#e0e0e0] text-lg ml-2">{item.time}</span>
              </div>
            ))}
            
            {lastAction && (
              <div className="flex justify-between items-center text-xl md:text-2xl">
                <span className="text-[#ff4d4d] tracking-wide break-words max-w-[70%]">{lastAction}</span>
                <span className="text-[#e0e0e0] text-lg ml-2">{actionTime}</span>
              </div>
            )}
            
            {actionHistory.length === 0 && !lastAction && (
              <div className="text-[#e0e0e0] text-xl md:text-2xl italic">No recent actions</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
