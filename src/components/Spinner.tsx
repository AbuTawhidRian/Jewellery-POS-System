import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div className="relative w-16 h-16 mx-auto">
      <svg viewBox="0 0 64 64" className="w-16 h-16">
        <circle cx="32" cy="32" r="24" fill="none" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="5" />
        <g className="animate-spin" style={{ transformOrigin: '32px 32px', animationDuration: '1.1s' }}>
          <circle
            cx="32" cy="32" r="24" fill="none"
            stroke="#C28C46" strokeWidth="5" strokeLinecap="round"
            strokeDasharray="56 150"
          />
          <g transform="translate(32,8)">
            <polygon points="-6,-2 6,-2 3,-6 -3,-6" fill="#E0B276" />
            <polygon points="-6,-2 6,-2 0,9" fill="#C28C46" />
            <line x1="-6" y1="-2" x2="6" y2="-2" stroke="#8A6530" strokeWidth="0.6" />
          </g>
        </g>
      </svg>
    </div>
  );
};

export default Spinner;
