import playmatImage from "../assets/playmat_2025_FINAL.png";
import { useState, useEffect } from "react";
import { useRosConnection } from "../utils/useRosConnection";

export default function Playmat() {
  const [estimatedScore, setEstimatedScore] = useState(320);
  const [isHalfScreen, setIsHalfScreen] = useState(false);
  const { connected, getTopicHandler } = useRosConnection();
  
  // Detect half-screen mode
  useEffect(() => {
    try {
      const savedValue = localStorage.getItem('isHalfScreen');
      setIsHalfScreen(savedValue === 'true');
    } catch (error) {
      console.warn('Could not detect half screen mode:', error);
    }
    
    // Listen for changes to half-screen mode
    const checkHalfScreen = () => {
      try {
        const savedValue = localStorage.getItem('isHalfScreen');
        setIsHalfScreen(savedValue === 'true');
      } catch (error) {
        console.warn('Could not detect half screen mode:', error);
      }
    };
    
    window.addEventListener('storage', checkHalfScreen);
    return () => window.removeEventListener('storage', checkHalfScreen);
  }, []);

  // Subscribe to score topic from ROS
  useEffect(() => {
    if (!connected || typeof window === 'undefined' || !window.ROSLIB) {
      return;
    }

    // Create topic for score updates
    const scoreTopic = getTopicHandler('/score', 'std_msgs/msg/Int32');
    
    if (scoreTopic) {
      // Subscribe to the score topic
      scoreTopic.subscribe((message: any) => {
        const score = parseInt(message.data);
        if (!isNaN(score)) {
          setEstimatedScore(score);
        }
      });
      
      // Clean up subscription
      return () => {
        try {
          scoreTopic.unsubscribe();
        } catch (e) {
          console.error("Error unsubscribing from score topic:", e);
        }
      };
    }
  }, [connected, getTopicHandler]);
  
  // Use numeric codes (0-19) as button states
  const [toggleStates, setToggleStates] = useState(
    Object.fromEntries([...Array(20).keys()].map(num => [num, false]))
  );

  // Function to toggle button state
  const toggleButton = (button: keyof typeof toggleStates) => {
    setToggleStates(prev => ({
      ...prev,
      [button]: !prev[button]
    }));
  };

  // Set base button sizes
  const buttonSizes = {
    largeSquare: isHalfScreen ? "w-[170px] h-[170px]" : "w-[250px] h-[250px]",
    wideRect: isHalfScreen ? "w-[170px] h-[70px]" : "w-[280px] h-[100px]",
    tallRect: isHalfScreen ? "w-[80px] h-[180px]" : "w-[100px] h-[280px]",
    smallSquare: isHalfScreen ? "w-[500px] h-[85px]" : "w-[100px] h-[100px]"
  };

  // Button font sizes
  const fontSize = {
    large: isHalfScreen ? "text-3xl" : "text-4xl",
    medium: isHalfScreen ? "text-2xl" : "text-3xl"
  };

  // Adjust container for half-screen mode without changing the image
  const containerClasses = isHalfScreen 
    ? "relative flex items-center justify-center h-full bg-[#0e0e0e] transform-gpu origin-center"
    : "relative flex items-center justify-center h-full bg-[#0e0e0e]";

  return (
    <div className={containerClasses}>
      {/* Image container */}
      <div className={isHalfScreen ? "relative transform-gpu scale-[0.92]" : "relative"}>
      <img
        src={playmatImage}
        alt="Eurobot 2025 Playmat"
        className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-lg"
      />

        {/* Change circular buttons to rounded squares (0-9) - using red-black theme */}
        {/* Button 0 - Top right - Blue */}
        <button
          className={`absolute top-[12%] right-[20.5%] ${buttonSizes.wideRect} rounded-xl flex items-center justify-center ${
            toggleStates[0] ? "bg-[#104364] text-white shadow-md" : "bg-[#121212] text-[#30a0d1] border-2 border-[#30a0d1]"
          } transition-all duration-200`}
          onClick={() => toggleButton(0)}
        >
          <span className={`${fontSize.large} font-bold`}>0</span>
        </button>

        {/* Button 1 - Right side - Black */}
        <button
          className={`absolute top-[23.5%] right-[0.5%] ${buttonSizes.tallRect} rounded-xl flex items-center justify-center ${
            toggleStates[1] ? "bg-[#2a2a2a] text-white shadow-md" : "bg-[#121212] text-[#999999] border-2 border-[#444444]"
          } transition-all duration-200`}
          onClick={() => toggleButton(1)}
        >
          <span className={`${fontSize.large} font-bold`}>1</span>
        </button>

        {/* Button 2 - Bottom right - Black */}
        <button
          className={`absolute bottom-[10.5%] right-[0.5%] ${buttonSizes.tallRect} rounded-xl flex items-center justify-center ${
            toggleStates[2] ? "bg-[#2a2a2a] text-white shadow-md" : "bg-[#121212] text-[#999999] border-2 border-[#444444]"
          } transition-all duration-200`}
          onClick={() => toggleButton(2)}
        >
          <span className={`${fontSize.large} font-bold`}>2</span>
        </button>

        {/* Button 3 - Right middle bottom - Black */}
        <button
          className={`absolute bottom-[43%] right-[33%] ${buttonSizes.smallSquare} rounded-xl flex items-center justify-center ${
            toggleStates[3] ? "bg-[#2a2a2a] text-white shadow-md" : "bg-[#121212] text-[#999999] border-2 border-[#444444]"
          } transition-all duration-200`}
          onClick={() => toggleButton(3)}
        >
          <span className={`${fontSize.large} font-bold`}>3</span>
        </button>

        {/* Button 4 - Right bottom side - Black */}
        <button
          className={`absolute bottom-[8%] right-[19%] ${buttonSizes.wideRect} rounded-xl flex items-center justify-center ${
            toggleStates[4] ? "bg-[#2a2a2a] text-white shadow-md" : "bg-[#121212] text-[#999999] border-2 border-[#444444]"
          } transition-all duration-200`}
          onClick={() => toggleButton(4)}
        >
          <span className={`${fontSize.large} font-bold`}>4</span>
        </button>

        {/* Button 5 - Bottom middle left - Black */}
        <button
          className={`absolute bottom-[8%] left-[19%] ${buttonSizes.wideRect} rounded-xl flex items-center justify-center ${
            toggleStates[5] ? "bg-[#2a2a2a] text-white shadow-md" : "bg-[#121212] text-[#999999] border-2 border-[#444444]"
          } transition-all duration-200`}
          onClick={() => toggleButton(5)}
        >
          <span className={`${fontSize.large} font-bold`}>5</span>
        </button>

        {/* Button 6 - Middle bottom - Black */}
        <button
          className={`absolute bottom-[43%] left-[33%] ${buttonSizes.smallSquare} rounded-xl flex items-center justify-center ${
            toggleStates[6] ? "bg-[#2a2a2a] text-white shadow-md" : "bg-[#121212] text-[#999999] border-2 border-[#444444]"
          } transition-all duration-200`}
          onClick={() => toggleButton(6)}
        >
          <span className={`${fontSize.large} font-bold`}>6</span>
        </button>

        {/* Button 7 - Bottom left - Black */}
        <button
          className={`absolute bottom-[10.5%] left-[0.5%] ${buttonSizes.tallRect} rounded-xl flex items-center justify-center ${
            toggleStates[7] ? "bg-[#2a2a2a] text-white shadow-md" : "bg-[#121212] text-[#999999] border-2 border-[#444444]"
          } transition-all duration-200`}
          onClick={() => toggleButton(7)}
        >
          <span className={`${fontSize.large} font-bold`}>7</span>
        </button>

        {/* Button 8 - Left side - Black */}
        <button
          className={`absolute top-[23.5%] left-[0.5%] ${buttonSizes.tallRect} rounded-xl flex items-center justify-center ${
            toggleStates[8] ? "bg-[#2a2a2a] text-white shadow-md" : "bg-[#121212] text-[#999999] border-2 border-[#444444]"
          } transition-all duration-200`}
          onClick={() => toggleButton(8)}
        >
          <span className={`${fontSize.large} font-bold`}>8</span>
        </button>

        {/* Button 9 - Top left - Yellow */}
        <button
          className={`absolute top-[12%] left-[20.5%] ${buttonSizes.wideRect} rounded-xl flex items-center justify-center ${
            toggleStates[9] ? "bg-[#7f6320] text-white shadow-md" : "bg-[#121212] text-[#e3b341] border-2 border-[#e3b341]"
          } transition-all duration-200`}
          onClick={() => toggleButton(9)}
        >
          <span className={`${fontSize.large} font-bold`}>9</span>
        </button>

        {/* Square buttons (10-19) - Using background color scheme */}
        {/* Button 10 - Top left square - Yellow */}
        <button
          className={`absolute top-[2%] left-[6.5%] ${buttonSizes.largeSquare} rounded-xl flex items-center justify-center ${
            toggleStates[10] ? "bg-[#7f6320] text-white shadow-md" : "bg-[#121212] text-[#e3b341] border-2 border-[#e3b341]"
          } transition-all duration-200`}
          onClick={() => toggleButton(10)}
        >
          <span className={`${fontSize.medium} font-bold`}>10</span>
        </button>

        {/* Button 11 - Right side square - Yellow */}
        <button
          className={`absolute top-[47%] right-[1%] ${buttonSizes.largeSquare} rounded-xl flex items-center justify-center ${
            toggleStates[11] ? "bg-[#7f6320] text-white shadow-md" : "bg-[#121212] text-[#e3b341] border-2 border-[#e3b341]"
          } transition-all duration-200`}
          onClick={() => toggleButton(11)}
        >
          <span className={`${fontSize.medium} font-bold`}>11</span>
        </button>

        {/* Button 12 - Bottom right corner square - Yellow */}
        <button
          className={`absolute bottom-[0.5%] right-[0.5%] ${buttonSizes.wideRect} rounded-xl flex items-center justify-center ${
            toggleStates[12] ? "bg-[#7f6320] text-white shadow-md" : "bg-[#121212] text-[#e3b341] border-2 border-[#e3b341]"
          } transition-all duration-200`}
          onClick={() => toggleButton(12)}
        >
          <span className={`${fontSize.medium} font-bold`}>12</span>
        </button>

        {/* Button 13 - Bottom middle square - Yellow */}
        <button
          className={`absolute bottom-[2%] left-[34.8%] ${buttonSizes.largeSquare} rounded-xl flex items-center justify-center ${
            toggleStates[13] ? "bg-[#7f6320] text-white shadow-md" : "bg-[#121212] text-[#e3b341] border-2 border-[#e3b341]"
          } transition-all duration-200`}
          onClick={() => toggleButton(13)}
        >
          <span className={`${fontSize.medium} font-bold`}>13</span>
        </button>

        {/* Button 14 - Bottom left square - Yellow */}
        <button
          className={`absolute bottom-[0.5%] left-[19%] ${buttonSizes.wideRect} rounded-xl flex items-center justify-center ${
            toggleStates[14] ? "bg-[#7f6320] text-white shadow-md" : "bg-[#121212] text-[#e3b341] border-2 border-[#e3b341]"
          } transition-all duration-200`}
          onClick={() => toggleButton(14)}
        >
          <span className={`${fontSize.medium} font-bold`}>14</span>
        </button>

        {/* Button 15 - Left side square - Blue */}
        <button
          className={`absolute top-[47%] left-[1%] ${buttonSizes.largeSquare} rounded-xl flex items-center justify-center ${
            toggleStates[15] ? "bg-[#104364] text-white shadow-md" : "bg-[#121212] text-[#30a0d1] border-2 border-[#30a0d1]"
          } transition-all duration-200`}
          onClick={() => toggleButton(15)}
        >
          <span className={`${fontSize.medium} font-bold`}>15</span>
        </button>

        {/* Button 16 - Bottom left corner square - Blue */}
        <button
          className={`absolute bottom-[0.5%] left-[0.5%] ${buttonSizes.wideRect} rounded-xl flex items-center justify-center ${
            toggleStates[16] ? "bg-[#104364] text-white shadow-md" : "bg-[#121212] text-[#30a0d1] border-2 border-[#30a0d1]"
          } transition-all duration-200`}
          onClick={() => toggleButton(16)}
        >
          <span className={`${fontSize.medium} font-bold`}>16</span>
        </button>

        {/* Button 17 - Bottom right square - Blue */}
        <button
          className={`absolute bottom-[2%] right-[34.8%] ${buttonSizes.largeSquare} rounded-xl flex items-center justify-center ${
            toggleStates[17] ? "bg-[#104364] text-white shadow-md" : "bg-[#121212] text-[#30a0d1] border-2 border-[#30a0d1]"
          } transition-all duration-200`}
          onClick={() => toggleButton(17)}
        >
          <span className={`${fontSize.medium} font-bold`}>17</span>
        </button>

        {/* Button 18 - Bottom right square - Blue */}
        <button
          className={`absolute bottom-[0.5%] right-[19%] ${buttonSizes.wideRect} rounded-xl flex items-center justify-center ${
            toggleStates[18] ? "bg-[#104364] text-white shadow-md" : "bg-[#121212] text-[#30a0d1] border-2 border-[#30a0d1]"
          } transition-all duration-200`}
          onClick={() => toggleButton(18)}
        >
          <span className={`${fontSize.medium} font-bold`}>18</span>
        </button>

        {/* Button 19 - Top right corner square - Blue */}
        <button
          className={`absolute top-[2%] right-[6.5%] ${buttonSizes.largeSquare} rounded-xl flex items-center justify-center ${
            toggleStates[19] ? "bg-[#104364] text-white shadow-md" : "bg-[#121212] text-[#30a0d1] border-2 border-[#30a0d1]"
          } transition-all duration-200`}
          onClick={() => toggleButton(19)}
        >
          <span className={`${fontSize.medium} font-bold`}>19</span>
        </button>

        {/* Position and Time info moved to center-top */}
        <div className="absolute top-[240px] left-1/2 transform -translate-x-1/2 z-10 flex space-x-6">
          <div className="bg-[#181818] px-6 py-2 rounded-xl border border-[#333333]">
            <span className="text-[#e0e0e0] uppercase tracking-wider text-xl">Position: </span>
            <span className="text-white font-mono text-xl">(1250, 780)</span>
          </div>
          
          <div className="bg-[#181818] px-6 py-2 rounded-xl border border-[#333333]">
            <span className="text-[#e0e0e0] uppercase tracking-wider text-xl">Time: </span>
            <span className="text-[#ffb74d] font-mono text-xl">1:32</span>
          </div>
        </div>

        {/* Score display - Smoky dark glass effect */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-15 px-12 py-8 rounded-xl border-0 shadow-lg min-w-[400px] backdrop-blur-lg">
          <div className="text-[#ff4d4d] text-3xl uppercase tracking-wider mb-5 text-center font-bold text-shadow-lg">Estimated Score</div>
          <div className="text-white text-9xl font-bold text-center tracking-wider text-shadow-lg drop-shadow-lg">{estimatedScore}</div>
        </div>

        {/* CSS for text shadow */}
        <style jsx>{`
          .text-shadow-lg {
            text-shadow: 0 0 15px rgba(0, 0, 0, 1), 0 0 8px rgba(0, 0, 0, 1), 0 0 3px rgba(0, 0, 0, 1);
          }
        `}</style>
      </div>
    </div>
  );
}
