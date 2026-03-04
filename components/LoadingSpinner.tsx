import React from 'react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="relative w-20 h-20">
      <div className="absolute inset-0 border-4 border-stone-700 rounded-full"></div>
      <div className="absolute inset-0 border-4 border-t-sky-500 border-l-sky-500 rounded-full animate-spin"></div>
    </div>
  );
};