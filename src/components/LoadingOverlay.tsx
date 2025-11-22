import React from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div id="loading-overlay" className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-80 flex justify-center items-center z-1000">
      <div className="text-center text-white">
        <div className="spinner mx-auto mb-4"></div>
        <p className="text-medium">処理中...</p>
      </div>
    </div>
  );
};