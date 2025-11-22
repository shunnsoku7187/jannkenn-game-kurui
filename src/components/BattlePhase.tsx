import React, { useState } from 'react';
import { HAND_EMOJIS, HANDS } from '../utils/constants';
import { BattleResult } from '../services/rules';
// Fix: Import MessageBuilder directly as an ES module
import { MessageBuilder } from '../services/uiRenderer';

interface BattlePhaseProps {
  phase: 'prep' | 'battle' | 'end_game';
  canDeclareBluff: boolean;
  humanHand: string[];
  humanSkillHand: string[]; // スキル札を追加
  humanPlayerBluff?: string | null; // NEW: Player's currently declared bluff
  humanPlayerSkillChosen?: string | null; // NEW: Player's currently chosen skill for the turn
  humanDeclaredBluff?: string | null; // For Battle Phase display only, now sourced from humanPlayerBluff
  opponentDeclaredBluff?: string | null;
  onDeclareBluff?: (bluff: string | null) => void;
  onUseSkill?: (skill: string | null) => void; // スキル使用を追加
  onChooseCard?: (cardIndex: number) => void;
  showBattleResultUI: boolean;
  battleResult?: BattleResult | null;
  onBattleResultAcknowledged?: () => void;
  showEndGameUI: boolean;
  gameResultTitle?: string;
  gameResultMessage?: string;
  onEndGameAcknowledged?: () => void;
  chosenPrepAction?: 'bluff' | 'skill' | null; // Use prop for initial decision
  onChoosePrepAction?: (action: 'bluff' | 'skill' | null) => void; // MODIFIED: 'pass' removed, null to return to main
  onPrepPhaseConfirmed?: () => void; // NEW: For confirming prep phase completion
  wasPreviousBattleDraw?: boolean; // New prop
}

export const BattlePhase: React.FC<BattlePhaseProps> = ({
  phase,
  canDeclareBluff,
  humanHand,
  humanSkillHand, // スキル札を追加
  humanPlayerBluff, // NEW
  humanPlayerSkillChosen, // NEW
  humanDeclaredBluff, // Kept for battle phase rendering logic
  opponentDeclaredBluff,
  onDeclareBluff,
  onUseSkill, // スキル使用を追加
  onChooseCard,
  showBattleResultUI,
  battleResult,
  onBattleResultAcknowledged,
  showEndGameUI,
  gameResultTitle,
  gameResultMessage,
  onEndGameAcknowledged,
  chosenPrepAction: chosenPrepActionProp, // Use prop for initial decision
  onChoosePrepAction, // ADDED
  onPrepPhaseConfirmed, // NEW
  wasPreviousBattleDraw, // New prop
}) => {
  // Prepフェイズのサブ状態を管理 (具体的にブラフ/スキル選択を行う際に使用)
  const [localBluffSelection, setLocalBluffSelection] = useState<string | null>(humanPlayerBluff || null);
  const [localSkillSelection, setLocalSkillSelection] = useState<string | null>(humanPlayerSkillChosen || null);

  // chosenPrepActionPropの変更に応じてlocalSelectionをリセット
  React.useEffect(() => {
    if (chosenPrepActionProp === 'bluff') {
      setLocalBluffSelection(humanPlayerBluff || null);
    } else if (chosenPrepActionProp === 'skill') {
      setLocalSkillSelection(humanPlayerSkillChosen || null);
    }
  }, [chosenPrepActionProp, humanPlayerBluff, humanPlayerSkillChosen]);

  // フェイズが変わったら状態をリセット
  React.useEffect(() => {
    if (phase !== 'prep') {
      setLocalBluffSelection(null);
      setLocalSkillSelection(null);
    }
  }, [phase]);

  const handleBluffDecide = () => {
    onDeclareBluff?.(localBluffSelection);
    onChoosePrepAction?.(null); // メイン画面に戻る
  };

  const handleSkillDecide = () => {
    onUseSkill?.(localSkillSelection); // localSkillSelection を使用
    onChoosePrepAction?.(null); // メイン画面に戻る
  };

  const handleBack = () => {
    onChoosePrepAction?.(null); // メイン画面に戻る (選択内容をコミットせず)
  };

  const renderInitialPrepActionChoices = () => {
    const declaredBluffStatus = humanPlayerBluff
      ? `${HAND_EMOJIS[humanPlayerBluff]} を宣言中`
      : '未宣言';
    const chosenSkillStatus = humanPlayerSkillChosen
      ? `「${humanPlayerSkillChosen}」を使用予定`
      : '未使用';

    // イカサマボタンのテキストと有効/無効状態
    const canEnterSkillSelection = humanSkillHand.length > 0;
    const skillButtonText = humanPlayerSkillChosen ? `イカサマを変更する (${humanPlayerSkillChosen} 選択中)` : `イカサマを使用する (${humanSkillHand.length}枚)`;
    const skillButtonDisabled = !canEnterSkillSelection;


    return (
      <div className="text-center space-y-6 w-full max-w-md">
        <h3 className="text-medium font-bold text-white">YOU の仕込み</h3>
        <div className="status-display p-4 rounded-lg bg-gray-800 border border-gray-700">
          <p className="text-small text-gray-400 mb-2">現在の宣言/使用予定:</p>
          <p className="text-small text-casino-green mb-1">ブラフ: <span className="font-bold">{declaredBluffStatus}</span></p>
          <p className="text-small text-blue-400">イカサマ: <span className="font-bold">{chosenSkillStatus}</span></p>
        </div>

        <button
          onClick={() => onChoosePrepAction?.('bluff')}
          disabled={!canDeclareBluff}
          className={`w-full px-6 py-3 text-medium font-bold rounded-lg card-button ${canDeclareBluff ? 'bg-casino-green hover:bg-green-700 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
        >
          ブラフを宣言する {canDeclareBluff ? '' : '(ライフ劣勢時のみ)'}
        </button>

        <button
          onClick={() => onChoosePrepAction?.('skill')}
          disabled={skillButtonDisabled}
          className={`w-full px-6 py-3 text-medium font-bold rounded-lg card-button 
            ${!skillButtonDisabled ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
        >
          {skillButtonText}
        </button>

        <button
          onClick={onPrepPhaseConfirmed}
          className="w-full px-6 py-3 text-medium font-bold rounded-lg card-button bg-gray-700 hover:bg-gray-600 text-white"
        >
          完了 (次のフェイズへ)
        </button>
      </div>
    );
  };

  const renderBluffSelection = () => {
    const bluffOptions = [
      { text: "宣言しない", value: null, class: 'bg-gray-700 hover:bg-gray-600' },
      ...HANDS.map(hand => ({
        text: `${HAND_EMOJIS[hand]} を宣言`,
        value: hand,
        class: 'bg-casino-green hover:bg-green-700'
      }))
    ];

    return (
      <div className="text-center space-y-6 w-full max-w-md">
        <h3 className="text-medium font-bold text-casino-green">ブラフ宣言</h3>
        <p className="text-small text-gray-400">ライフが負けているためブラフ権があります。</p>
        <div className="bluff-hand-emojis text-emoji-display mb-4 font-extrabold text-casino-green p-2 rounded-lg bg-gray-900 tracking-widest">
          {humanHand.map(card => HAND_EMOJIS[card]).join('')}
        </div>
        <p className="text-small text-white">現在の選択: {localBluffSelection ? HAND_EMOJIS[localBluffSelection] : '宣言しない'}</p>
        <div className="space-y-2">
          {bluffOptions.map(btn => (
            <button
              key={`bluff-${btn.value}`}
              onClick={() => setLocalBluffSelection(btn.value)}
              className={`w-full px-6 py-3 text-medium font-bold rounded-lg card-button text-white ${btn.class} ${localBluffSelection === btn.value ? 'ring-2 ring-white' : ''}`}
            >
              {btn.text}
            </button>
          ))}
        </div>
        <div className="flex justify-between space-x-4 mt-4">
            <button
            onClick={handleBack}
            className="w-1/2 px-6 py-3 text-medium font-bold rounded-lg card-button bg-gray-700 hover:bg-gray-600 text-white"
            >
            戻る
            </button>
            <button
            onClick={handleBluffDecide}
            className="w-1/2 px-6 py-3 text-medium font-bold rounded-lg card-button bg-casino-green hover:bg-green-700 text-white"
            >
            決定
            </button>
        </div>
      </div>
    );
  };

  const renderSkillSelection = () => {
    const skillOptions = [
      { text: "使用しない", value: null, class: 'bg-gray-700 hover:bg-gray-600' },
      ...(humanSkillHand || []).map(skill => ({
        text: `${skill} を使用`,
        value: skill,
        class: 'bg-blue-700 hover:bg-blue-600'
      }))
    ];

    const handleLocalSkillDecide = () => {
      onUseSkill?.(localSkillSelection); // localSkillSelection を使用
      onChoosePrepAction?.(null); // メイン画面に戻る
    };

    return (
      <div className="text-center space-y-6 w-full max-w-md">
        <h3 className="text-medium font-bold text-blue-400">イカサマ使用</h3>
        <p className="text-small text-gray-400">所持スキル札: {humanSkillHand.length > 0 ? humanSkillHand.join(', ') : 'なし'}</p>
        <p className="text-small text-white">現在の選択: {localSkillSelection ? `「${localSkillSelection}」` : '使用しない'}</p>
        <div className="space-y-2">
          {skillOptions.map(btn => (
            <button
              key={`skill-${btn.value}`}
              onClick={() => setLocalSkillSelection(btn.value)} // setLocalSkillSelection を使用
              className={`w-full px-6 py-3 text-medium font-bold rounded-lg card-button text-white ${btn.class} ${localSkillSelection === btn.value ? 'ring-2 ring-white' : ''} ${btn.value !== null && !humanSkillHand.includes(btn.value) && btn.value !== humanPlayerSkillChosen ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={btn.value !== null && !humanSkillHand.includes(btn.value) && btn.value !== humanPlayerSkillChosen} // Disable if skill not in hand AND not the one currently chosen
            >
              {btn.text}
            </button>
          ))}
        </div>
        <div className="flex justify-between space-x-4 mt-4">
            <button
            onClick={handleBack}
            className="w-1/2 px-6 py-3 text-medium font-bold rounded-lg card-button bg-gray-700 hover:bg-gray-600 text-white"
            >
            戻る
            </button>
            <button
            onClick={handleLocalSkillDecide}
            className="w-1/2 px-6 py-3 text-medium font-bold rounded-lg card-button bg-blue-700 hover:bg-blue-600 text-white"
            >
            決定
            </button>
        </div>
      </div>
    );
  };


  if (phase === 'prep') {
    if (chosenPrepActionProp === 'bluff') {
        return renderBluffSelection();
    } else if (chosenPrepActionProp === 'skill') {
        return renderSkillSelection();
    } else { // chosenPrepActionProp === null (initial state)
        return renderInitialPrepActionChoices();
    }
  }

  // --- 既存のバトルとエンドゲームのレンダリングロジックは変更なし ---
  const renderCardSelection = () => {
    const selfDeclaredStatus = humanDeclaredBluff
      ? `<span class="font-extrabold text-casino-green">${HAND_EMOJIS[humanDeclaredBluff]}</span>`
      : `<span class="text-gray-400">なし</span>`;

    const opponentDeclaredStatus = opponentDeclaredBluff
      ? `<span class="font-extrabold text-casino-red">${HAND_EMOJIS[opponentDeclaredBluff]}</span>`
      : `<span class="text-gray-400">なし</span>`;

    return (
      <div className="text-center space-y-4 w-full px-4">
        <h3 className="text-medium font-bold text-casino-green">YOU のカード選択</h3>
        <div className="flex flex-col w-full mb-6 items-center">
          {/* ブラフ宣言がある場合にのみ表示 */}
          {(humanDeclaredBluff || opponentDeclaredBluff) && (
            <div className="bluff-container flex justify-center w-full max-w-2xl mx-auto">
              {humanDeclaredBluff && (
                <div className="bluff-status-box self-declared w-full flex-none justify-between items-center">
                  <span className="text-medium whitespace-nowrap text-casino-green">【あなたの宣言】</span>
                  <span className="ml-2 text-medium" dangerouslySetInnerHTML={{ __html: selfDeclaredStatus }}></span>
                </div>
              )}
              {opponentDeclaredBluff && (
                <div className="bluff-status-box opponent-declared w-full flex-none justify-between items-center">
                  <span className="text-medium whitespace-nowrap text-casino-red">【CPUの宣言】</span>
                  <span className="ml-2 text-medium" dangerouslySetInnerHTML={{ __html: opponentDeclaredStatus }}></span>
                </div>
              )}
            </div>
          )}
          {wasPreviousBattleDraw && ( // Display draw message here
            <p className="text-small font-bold text-white mb-2 p-2 rounded-md bg-gray-700 border border-white">
              直前のバトルがあいこでした！<br/>もう一度カードを選んでください。
            </p>
          )}
          <p className="text-small text-white mt-4 mb-3 font-semibold">手札から出すカードを選んでください。</p>
        </div>
        <div className="card-grid max-w-4xl mx-auto">
          {humanHand.map((card, index) => (
            <button
              key={index}
              onClick={() => onChooseCard?.(index)}
              className="card-select-button card-item-button text-emoji-display bg-casino-green hover:bg-green-700 text-white rounded-lg card-button"
            >
              {HAND_EMOJIS[card]}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderBattleResult = () => {
    if (!battleResult) return null;

    let headerClass = '';
    let resultTitle = 'バトル結果';
    let buttonClass = 'bg-gray-700 hover:bg-gray-600';
    let formattedMessage = '';

    const isYouWinner = battleResult.winner === 'you';
    const isYouLoser = battleResult.winner === 'CPU'; // Corrected to check winner for loser

    if (battleResult.status === 'battle_draw') {
      resultTitle = 'あいこ！';
      formattedMessage = '<span class="result-header-draw">👉 あいこ！ 続行</span>';
    } else if (isYouWinner) {
      headerClass = 'result-header-win';
      resultTitle = 'ターン勝利！';
      buttonClass = 'bg-casino-green hover:bg-green-700';
    } else if (isYouLoser) { // Now correctly checks if CPU won, implying 'you' lost
      headerClass = 'result-header-lose';
      resultTitle = 'ターン敗北...';
      buttonClass = 'bg-casino-red hover:bg-red-700';
    }

    // メッセージの整形
    // Fix: Use the imported MessageBuilder
    const builder = new MessageBuilder();
    let logMessage = [
        builder.build("battle_result_win", { cardA: battleResult.cardA, cardB: battleResult.cardB }),
        builder.build(battleResult.status, {
            winner: battleResult.winner,
            loser: battleResult.loser,
            damage: battleResult.damage,
            declared: battleResult.declared
        }),
    ].join('<br>');

    if (isYouWinner) {
        logMessage = logMessage.replace(/✅(.*?)ダメージ！/g, '<span class="result-text-win">✅$1ダメージ！</span>');
        logMessage = logMessage.replace(/💥(.*?)ダメージ！/g, '<span class="result-text-win">💥$1ダメージ！</span>');
    } else if (isYouLoser) {
        logMessage = logMessage.replace(/✅(.*?)ダメージ！/g, '<span class="result-text-lose">✅$1ダメージ！</span>');
        logMessage = logMessage.replace(/💀(.*?)ダメージ！/g, '<span class="result-text-lose">💀$1ダメージ！</span>');
    } else if (battleResult.status === 'battle_draw') {
        logMessage = logMessage.replace(/👉 (.*)/g, '<span class="result-header-draw">👉 $1</span>');
    }
    logMessage = logMessage.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

    formattedMessage = logMessage;


    return (
      <div className="text-center space-y-6 w-full max-w-2xl">
        <div className="result-box p-4 rounded-lg">
          <h3 className={`text-medium font-extrabold ${headerClass} mb-4`}>{resultTitle}</h3>
          <div className="text-medium text-gray-200 space-y-2" dangerouslySetInnerHTML={{ __html: formattedMessage }}>
          </div>
        </div>
        <button
          onClick={onBattleResultAcknowledged}
          className={`w-full px-6 py-3 text-medium font-bold text-white rounded-lg card-button ${buttonClass}`}
        >
          OK (次のカード選択へ)
        </button>
      </div>
    );
  };

  const renderEndGame = () => {
    let buttonClass = 'bg-gray-700 hover:bg-gray-600';
    if (gameResultTitle?.includes('勝利')) {
         buttonClass = 'bg-casino-green hover:bg-green-700';
    } else if (gameResultTitle?.includes('敗北')) {
         buttonClass = 'bg-casino-red hover:bg-red-700';
    }

    const htmlMessage = gameResultMessage?.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

    return (
      <div className="text-center space-y-6 w-full max-w-2xl">
        <div className="result-box p-4 rounded-lg">
          <h3 className="text-medium font-extrabold text-white mb-4">{gameResultTitle}</h3>
          <div className="text-medium text-gray-200 space-y-2" dangerouslySetInnerHTML={{ __html: htmlMessage }}>
          </div>
        </div>
        <button
          onClick={onEndGameAcknowledged}
          className={`w-full px-6 py-3 text-medium font-bold text-white rounded-lg card-button ${buttonClass}`}
        >
          ゲームを終了する
        </button>
      </div>
    );
  };

  if (showEndGameUI) {
    return renderEndGame();
  }

  if (showBattleResultUI) {
    return renderBattleResult();
  }

  if (phase === 'battle') {
    return renderCardSelection();
  }

  return null;
};