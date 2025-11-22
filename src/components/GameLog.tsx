import React, { useEffect, useRef } from 'react';

interface GameLogProps {
  logMessages: string[];
}

export const GameLog: React.FC<GameLogProps> = ({ logMessages }) => {
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logMessages]);

  return (
    <div className="flex-grow bg-gray-900 p-4 rounded-xl shadow-xl overflow-y-auto h-72 border border-gray-700">
      <h3 className="text-medium font-semibold mb-2 border-b border-gray-700 pb-1 text-white">ゲームログ (補助情報)</h3>
      <pre id="message-log" ref={logRef} className="text-small whitespace-pre-wrap text-gray-300">
        {logMessages.join('\n')}
      </pre>
    </div>
  );
};