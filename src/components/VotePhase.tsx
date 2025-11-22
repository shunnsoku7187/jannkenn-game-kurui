import React from 'react';
import { HAND_EMOJIS, HANDS } from '../utils/constants';

interface VotePhaseProps {
  onVote: (hand: string) => void;
}

export const VotePhase: React.FC<VotePhaseProps> = ({ onVote }) => {
  return (
    <div className="text-center space-y-6 w-full max-w-sm">
      <h3 className="text-medium font-bold text-casino-green">YOU の投票</h3>
      <p className="text-small text-gray-400">デッキ構築のための投票を行ってください。</p>
      <div className="flex justify-center space-x-4">
        {HANDS.map(hand => (
          <button
            key={hand}
            onClick={() => onVote(hand)}
            className="vote-button px-6 py-3 text-medium font-bold bg-casino-green hover:bg-green-700 text-white rounded-lg card-button"
          >
            {HAND_EMOJIS[hand]}
          </button>
        ))}
      </div>
    </div>
  );
};