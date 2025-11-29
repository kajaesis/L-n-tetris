import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  icon, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "flex items-center justify-center gap-2 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform touch-manipulation select-none";
  
  const variants = {
    primary: "bg-blue-500 hover:bg-blue-400 text-white border-b-4 border-blue-700 active:border-b-0 active:translate-y-1",
    secondary: "bg-slate-600 hover:bg-slate-500 text-white border-b-4 border-slate-800 active:border-b-0 active:translate-y-1",
    danger: "bg-rose-500 hover:bg-rose-400 text-white border-b-4 border-rose-700 active:border-b-0 active:translate-y-1",
    success: "bg-green-500 hover:bg-green-400 text-white border-b-4 border-green-700 active:border-b-0 active:translate-y-1",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      {...props}
    >
      {icon && <span className="text-xl">{icon}</span>}
      {children}
    </button>
  );
};