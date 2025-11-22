import React from 'react';
import { Player } from '../services/gameLogic';

interface PlayerStatusProps {
  player: Player;
  borderColor: string;
}

export const PlayerStatus: React.FC<PlayerStatusProps> = ({ player, borderColor }) => {
  const renderLife = (life: number) => {
    const hearts = '❤️'.repeat(Math.max(0, life));
    const dead = life <= 0 ? '❌' : '';
    return hearts + dead;
  };

  const nameClass = player.name === 'you' ? 'text-casino-green' : 'text-casino-red';

  return (
    <div className={`text-center p-3 rounded-lg player-status-box w-full mx-2 transition-all duration-300 ${borderColor}`}>
      <h2 className={`text-medium font-bold ${nameClass}`}>{player.name.toUpperCase()}</h2>
      <p className="life-display font-mono mt-1 life-hearts" dangerouslySetInnerHTML={{ __html: renderLife(player.life) }}></p>
    </div>
  );
};