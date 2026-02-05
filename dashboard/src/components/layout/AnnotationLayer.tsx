import React, { useState } from 'react';

/**
 * AnnotationLayer: Transparent overlay for pinning feedback onto the UI.
 */
const AnnotationLayer = ({ activeComponent }: any) => {
  const [pins, setPins] = useState<any[]>([]);

  const handleDropPin = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newPin = {
      id: Date.now(),
      x, y,
      target: activeComponent?.id || 'unknown',
      comment: ''
    };
    
    setPins([...pins, newPin]);
    console.log(`[Annotation] Pin dropped on ${newPin.target} at (${x}, ${y})`);
  };

  return (
    <div 
      className="absolute inset-0 cursor-crosshair z-30"
      onClick={handleDropPin}
    >
      {pins.map(pin => (
        <div 
          key={pin.id}
          className="absolute w-6 h-6 bg-blue-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center -translate-x-1/2 -translate-y-1/2 group"
          style={{ left: pin.x, top: pin.y }}
        >
          <span className="text-[10px] text-white font-bold">!</span>
          <div className="hidden group-hover:block absolute top-8 left-0 w-48 bg-white p-2 rounded-lg shadow-xl border border-slate-100 text-[10px] text-slate-600">
            <textarea 
              autoFocus
              className="w-full border-none outline-none resize-none h-12"
              placeholder="What should I change here?"
            />
            <button className="mt-1 w-full bg-[#0F172A] text-white py-1 rounded font-bold uppercase">Send to Agent</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AnnotationLayer;
