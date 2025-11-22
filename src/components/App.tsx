import React from 'react';
import { useGame } from '../hooks/useGame';
import { LoadingOverlay } from './LoadingOverlay';
import { Header } from './Header';
import { PlayerStatus } from './PlayerStatus';
import { GameLog } from './GameLog';
import { StartScreen } from './StartScreen';
import { VotePhase } from './VotePhase';
// Fix: Correct import syntax from '=>' to 'from'
import { BattlePhase } from './BattlePhase';
import { GamePhase } from '../utils/constants';
import { SkillNotificationModal } from './SkillNotificationModal';
import { DebugModeScreen } from './DebugModeScreen'; // DebugModeScreenをインポート

export const App: React.FC = () => {
  const {
    currentPhase,
    players,
    gameLog, // gameLogをuseGameから取得
    isLoading,
    // Fix: `startGame` is no longer exported, replaced by `startNormalGame`
    // startGame,
    humanPlayer,
    cpuPlayer,
    handleVote,
    handleDeclareBluff,
    handleUseSkill,
    handleChooseCard,
    handleBattleResultAcknowledged,
    handleEndGameAcknowledged,
    gameResultTitle,
    gameResultMessage,
    showBattleResultUI,
    showEndGameUI,
    battleResult,
    canHumanDeclareBluff,
    humanHand,
    humanSkillHand,
    opponentDeclaredBluff,
    humanPlayerBluff, // NEW: Human's declared bluff
    humanPlayerSkillChosen, // NEW: Human's chosen skill for the turn
    chosenPrepAction, // ADDED: Prep phase UI now uses this
    handleChoosePrepAction, // ADDED: Prep phase UI now uses this
    handlePrepPhaseConfirmed, // NEW: Prep phase completion
    showSkillNotification,
    skillNotificationMessage,
    handleSkillNotificationAcknowledged,
    wasPreviousBattleDraw,
    currentMode, // New: 現在のモード
    setCurrentMode, // Fix: `setCurrentMode`を`useGame`から取得
    startDebugMode, // New: デバッグモード開始ハンドラ
    startNormalGame, // New: 通常ゲーム開始ハンドラ
    runSkillTests, // New: スキルテスト実行ハンドラ
    debugTestResults, // New: デバッグテスト結果
    isTestingDebugSkill, // New: デバッグスキルテスト中かどうかのフラグ
  } = useGame();

  const renderContent = () => {
    if (currentMode === 'initial') {
      return (
        <StartScreen onStartGame={startNormalGame} onDebugModeSelected={startDebugMode} />
      );
    } else if (currentMode === 'debug') {
      return (
        <DebugModeScreen
          onRunSkillTest={runSkillTests}
          testResults={debugTestResults}
          isTesting={isTestingDebugSkill}
          // Fix: `setCurrentMode`を使って初期モードに戻す
          onBackToStart={() => setCurrentMode('initial')}
          onSwitchToInitialMode={startNormalGame}
          debugLogMessages={gameLog} // gameLogをDebugModeScreenに渡す
        />
      );
    } else { // currentMode === 'game'
      return (
        <>
          <div id="game-status" className="flex justify-around p-4 rounded-xl shadow-2xl">
            {humanPlayer && <PlayerStatus player={humanPlayer} borderColor="border-you-fixed" />}
            {cpuPlayer && <PlayerStatus player={cpuPlayer} borderColor="border-cpu-fixed" />}
          </div>

          <div id="main-phase-container" className="min-h-[300px] flex items-center justify-center p-4 bg-gray-900 rounded-xl shadow-2xl">
            {currentPhase === GamePhase.VOTE && humanPlayer && (
              <VotePhase onVote={handleVote} />
            )}
            {currentPhase === GamePhase.PREP && humanPlayer && (
              <BattlePhase
                phase="prep"
                canDeclareBluff={canHumanDeclareBluff}
                humanHand={humanHand}
                humanSkillHand={humanSkillHand}
                humanPlayerBluff={humanPlayerBluff} // NEW
                humanPlayerSkillChosen={humanPlayerSkillChosen} // NEW
                onDeclareBluff={handleDeclareBluff}
                onUseSkill={handleUseSkill}
                chosenPrepAction={chosenPrepAction} // ADDED
                onChoosePrepAction={handleChoosePrepAction} // ADDED
                onPrepPhaseConfirmed={handlePrepPhaseConfirmed} // NEW
                showBattleResultUI={false}
                showEndGameUI={false}
              />
            )}
            {currentPhase === GamePhase.BATTLE && humanPlayer && (
              <BattlePhase
                phase="battle"
                humanHand={humanHand}
                humanSkillHand={[]} // Battle phase doesn't use skillHand directly
                humanDeclaredBluff={humanPlayerBluff} // Use humanPlayerBluff from useGame
                opponentDeclaredBluff={opponentDeclaredBluff}
                onChooseCard={handleChooseCard}
                showBattleResultUI={showBattleResultUI}
                battleResult={battleResult}
                onBattleResultAcknowledged={handleBattleResultAcknowledged}
                showEndGameUI={showEndGameUI}
                gameResultTitle={gameResultTitle}
                gameResultMessage={gameResultMessage}
                onEndGameAcknowledged={handleEndGameAcknowledged}
                canDeclareBluff={false} // Battle phase doesn't declare bluff
                onUseSkill={() => {}} // Not relevant for battle phase
                onChoosePrepAction={() => {}} // ADDED: Not relevant for battle phase
                onPrepPhaseConfirmed={() => {}} // Not relevant for battle phase // NEW
                wasPreviousBattleDraw={wasPreviousBattleDraw} // New prop
              />
            )}
            {currentPhase === GamePhase.END_GAME && showEndGameUI && (
              <BattlePhase
                phase="end_game"
                humanHand={[]} // Not relevant for end game
                humanSkillHand={[]} // Not relevant for end game
                humanDeclaredBluff={null}
                opponentDeclaredBluff={null}
                onChooseCard={() => {}} // Not relevant for end game
                showBattleResultUI={false}
                battleResult={null}
                onBattleResultAcknowledged={() => {}}
                showEndGameUI={showEndGameUI}
                gameResultTitle={gameResultTitle}
                gameResultMessage={gameResultMessage}
                onEndGameAcknowledged={() => {}}
                canDeclareBluff={false}
                onUseSkill={() => {}} // Not relevant for end game
                onChoosePrepAction={() => {}} // ADDED: Not relevant for end game
                onPrepPhaseConfirmed={() => {}} // Not relevant for end game // NEW
              />
            )}
          </div>
        </>
      );
    }
  };


  return (
    <div className="game-container mx-auto flex flex-col space-y-6">
      <LoadingOverlay isLoading={isLoading || isTestingDebugSkill} />
      {showSkillNotification && ( // スキル告知モーダルを表示
        <SkillNotificationModal
          isOpen={showSkillNotification}
          message={skillNotificationMessage}
          onAcknowledge={handleSkillNotificationAcknowledged}
        />
      )}
      <Header />

      {renderContent()}

      {currentMode !== 'debug' && <GameLog logMessages={gameLog} />} {/* デバッグモードではGameLogを非表示に */}
    </div>
  );
};