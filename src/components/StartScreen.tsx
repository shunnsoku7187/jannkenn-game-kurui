import React from 'react';

interface StartScreenProps {
  onStartGame: () => void;
  onDebugModeSelected: () => void; // New prop for debug mode
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStartGame, onDebugModeSelected }) => {
  return (
    <div className="text-center space-y-4">
      <h2 className="text-medium font-bold text-white mb-6">モードを選択</h2>
      <button
        onClick={onStartGame}
        className="px-8 py-3 bg-red-800 text-medium text-white font-bold rounded-lg hover:bg-red-600 transition shadow-md hover:shadow-xl card-button w-full max-w-xs mb-4"
      >
        ゲーム開始
      </button>
      <button
        onClick={onDebugModeSelected}
        className="px-8 py-3 bg-blue-700 text-medium text-white font-bold rounded-lg hover:bg-blue-600 transition shadow-md hover:shadow-xl card-button w-full max-w-xs"
      >
        デバッグモード
      </button>
    </div>
  );
};