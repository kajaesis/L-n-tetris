import React from 'react';

interface UnicornProps {
  show: boolean;
  onAnimationEnd: () => void;
}

export const Unicorn: React.FC<UnicornProps> = ({ show, onAnimationEnd }) => {
  if (!show) return null;

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-50 flex items-center animate-unicorn"
      onAnimationEnd={onAnimationEnd}
    >
      <div className="text-[150px] filter drop-shadow-2xl">
        🦄
      </div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl font-bold text-white drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] whitespace-nowrap">
        Skvělá práce!
      </div>
    </div>
  );
};