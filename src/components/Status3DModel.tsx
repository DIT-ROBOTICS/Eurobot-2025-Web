import React from 'react';

// Main component
export default function Status3DModel() {
  return (
    <div className="bg-[#181818] p-6 rounded-lg shadow-md mb-6 w-full min-w-[300px]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-4xl font-bold text-[#ff4d4d] uppercase">
          ROBOT 3D MODEL
        </h3>
        <a 
          href="/model-viewer.html" 
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#d32f2f] text-white px-4 py-2 rounded-md hover:bg-[#ff4d4d] flex items-center justify-center"
          aria-label="Open in full screen viewer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h6v6M14 10l7-7M9 21H3v-6M10 14l-7 7"/>
          </svg>
        </a>
      </div>
      
      <div className="relative">
        <iframe 
          src="/embed-model.html" 
          title="Robot 3D Model Viewer"
          className="w-full h-[500px] border-0 rounded-lg bg-[#141414]" 
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
} 