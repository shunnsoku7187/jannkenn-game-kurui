import { useState, useEffect, useCallback, useRef } from 'react';
import { GameMaster, Player } from '../services/gameLogic';
import { GamePhase, HANDS, CHEAT_SKILLS } from '../utils/constants';
import { BattleResult } from '../services/rules';
import { HumanInputProvider, PrepActionChoice } from '../services/inputProviders';
import { MessageBuilder } from '../services/uiRenderer'; // MessageBuilderをインポート
// Fix: `runTestsForSkill` needs to be exported from '../utils/skillTestRunner'
import { runTestsForSkill, TestResult } from '../utils/skillTestRunner'; // New: スキルテストランナーをインポート

type AppMode = 'initial' | 'game' | 'debug';

export const useGame = () => {
  const [currentMode, setCurrentMode] = useState<AppMode>('initial'); // New: ゲームモード管理
  const [currentPhase, setCurrentPhase] = useState<GamePhase>(GamePhase.INITIAL);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showBattleResultUI, setShowBattleResultUI] = useState<boolean>(false);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [showEndGameUI, setShowEndGameUI] = useState<boolean>(false);
  const [gameResultTitle, setGameResultTitle] = useState<string>('');
  const [gameResultMessage, setGameResultMessage] = useState<string>('');
  const [canHumanDeclareBluff, setCanHumanDeclareBluff] = useState<boolean>(false);
  const [humanHand, setHumanHand] = useState<string[]>([]);
  const [humanSkillHand, setHumanSkillHand] = useState<string[]>([]);
  const [opponentDeclaredBluff, setOpponentDeclaredBluff] = useState<string | null>(null);
  const [humanPlayerBluff, setHumanPlayerBluff] = useState<string | null>(null); // NEW: Human's declared bluff
  const [humanPlayerSkillChosen, setHumanPlayerSkillChosen] = useState<string | null>(null); // NEW: Human's chosen skill for the turn
  const [chosenPrepAction, setChosenPrepAction] = useState<'bluff' | 'skill' | null>(null); // MODIFIED: 'pass' removed, null for main screen
  const [showSkillNotification, setShowSkillNotification] = useState<boolean>(false);
  const [skillNotificationMessage, setSkillNotificationMessage] = useState<string>('');
  const [wasPreviousBattleDraw, setWasPreviousBattleDraw] = useState<boolean>(false);

  // Debug Mode related states
  const [debugTestResults, setDebugTestResults] = useState<{ [skill: string]: TestResult[] }>({}); // New
  const [isTestingDebugSkill, setIsTestingDebugSkill] = useState<boolean>(false); // New

  const gameMasterRef = useRef<GameMaster | null>(null);
  const humanInputProviderRef = useRef<HumanInputProvider | null>(null);

  // ログメッセージを追加する関数
  const addLogMessage = useCallback((message: string) => {
    setGameLog((prev) => {
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      return [...prev, `[${time}] ${message}`];
    });
  }, []);

  // スキル告知モーダルを閉じるハンドラ
  const handleSkillNotificationAcknowledged = useCallback(() => {
    setShowSkillNotification(false);
    setSkillNotificationMessage('');
    if (humanInputProviderRef.current?.skillNotificationResolver) { // Use new resolver
      humanInputProviderRef.current.skillNotificationResolver('ok');
      humanInputProviderRef.current.skillNotificationResolver = null;
    }
  }, []);

  // GameMasterの初期化とコールバック設定
  const initializeGameMaster = useCallback(() => {
    if (gameMasterRef.current && humanInputProviderRef.current) {
        // 既に存在する場合はリセット
        gameMasterRef.current.resetGame();
    } else {
        // 初回起動時のGameMaster生成
        humanInputProviderRef.current = new HumanInputProvider();
        gameMasterRef.current = new GameMaster(addLogMessage, humanInputProviderRef.current);
        gameMasterRef.current.renderer.gameMaster = gameMasterRef.current;
    }

    humanInputProviderRef.current?.setCallbacks({
      onVoteRequested: (player) => {
        setIsLoading(false);
        setCurrentPhase(GamePhase.VOTE);
        return new Promise(resolve => {
          (humanInputProviderRef.current as HumanInputProvider).voteInputResolver = resolve;
        });
      },
      // MODIFIED: onPrepActionRequested now resolves with 'bluff', 'skill', or 'complete'
      onPrepActionRequested: (player, canDeclareBluffParam, canUseSkillParam) => {
        setIsLoading(false);
        setCanHumanDeclareBluff(canDeclareBluffParam);
        setHumanSkillHand([...player.skillHand]);
        setHumanHand([...player.hand]);
        setHumanPlayerBluff(player.bluffDeclared); // Update UI with current bluff
        setHumanPlayerSkillChosen(player.skillChosenForTurn); // Update UI with current skill
        setChosenPrepAction(null); // Reset to main choice screen
        setCurrentPhase(GamePhase.PREP);
        return new Promise(resolve => {
          (humanInputProviderRef.current as HumanInputProvider).prepActionInputResolver = resolve;
        });
      },
      onBluffChoiceRequested: (player, canDeclareBluffParam, humanHandParam) => {
        setIsLoading(false);
        setCanHumanDeclareBluff(canDeclareBluffParam);
        setHumanHand([...humanHandParam]); // Update hand for bluff options
        setHumanPlayerBluff(player.bluffDeclared); // Ensure current bluff is reflected
        // No need to set currentPhase here as it's already PREP.
        return new Promise(resolve => {
          (humanInputProviderRef.current as HumanInputProvider).bluffInputResolver = resolve;
        });
      },
      onSkillChoiceRequested: (player, canUseSkillParam, humanSkillHandParam) => {
        setIsLoading(false);
        setHumanSkillHand([...humanSkillHandParam]); // Update skill hand for skill options
        setHumanPlayerSkillChosen(player.skillChosenForTurn); // Ensure current skill is reflected
        // No need to set currentPhase here as it's already PREP.
        return new Promise(resolve => {
          (humanInputProviderRef.current as HumanInputProvider).skillInputResolver = resolve;
        });
      },

      onCardChooseRequested: (player, cpuPlayer, wasDraw) => {
        setIsLoading(false);
        setHumanHand([...player.hand]);
        setOpponentDeclaredBluff(cpuPlayer.bluffDeclared);
        setChosenPrepAction(null); // Clear prep action state for next turn
        setWasPreviousBattleDraw(wasDraw);
        setCurrentPhase(GamePhase.BATTLE);
        return new Promise(resolve => {
          (humanInputProviderRef.current as HumanInputProvider).cardInputResolver = resolve;
        });
      },
      onShowBattleResultRequested: async (result: BattleResult, human: Player, cpu: Player) => {
        setIsLoading(false);
        setBattleResult(result);
        setShowBattleResultUI(true);
        return new Promise(resolve => {
          (humanInputProviderRef.current as HumanInputProvider).battleResultAcknowledgedResolver = resolve;
        });
      },
      onShowEndGameRequested: async (title: string, message: string) => {
        setIsLoading(false);
        setGameResultTitle(title);
        setGameResultMessage(message);
        setShowEndGameUI(true);
        return new Promise(resolve => {
          (humanInputProviderRef.current as HumanInputProvider).endGameAcknowledgedResolver = resolve;
        });
      },
      onShowSkillNotificationRequested: async (message: string) => {
        setIsLoading(false);
        setSkillNotificationMessage(message);
        setShowSkillNotification(true);
        return new Promise(resolve => {
          (humanInputProviderRef.current as HumanInputProvider).skillNotificationResolver = resolve;
        });
      }
    });

  }, [addLogMessage]);


  useEffect(() => {
    initializeGameMaster(); // 初回レンダリング時とaddLogMessageの変更時にGameMasterを初期化

    const interval = setInterval(() => {
        if (gameMasterRef.current) {
            setPlayers([...gameMasterRef.current.board.players]);
            const human = gameMasterRef.current.board.players.find(p => p.name === 'you');
            if (human) {
                setHumanSkillHand([...human.skillHand]);
                setHumanHand([...human.hand]); // Update human hand in App.tsx
                setHumanPlayerBluff(human.bluffDeclared); // Keep bluff updated for UI
                setHumanPlayerSkillChosen(human.skillChosenForTurn); // Keep skill updated for UI
            }
        }
    }, 200);

    return () => clearInterval(interval);
  }, [addLogMessage, initializeGameMaster]);


  // ゲーム開始ハンドラ (通常ゲーム)
  const startNormalGame = useCallback(async () => {
    setCurrentMode('game'); // New: ゲームモードに切り替え
    setIsLoading(true);
    setGameLog([]);
    setShowEndGameUI(false);
    setBattleResult(null);
    setShowBattleResultUI(false);
    setHumanSkillHand([]);
    setHumanPlayerBluff(null); // NEW
    setHumanPlayerSkillChosen(null); // NEW
    setChosenPrepAction(null); // ADDED
    setShowSkillNotification(false);
    setSkillNotificationMessage('');
    setWasPreviousBattleDraw(false);
    setCurrentPhase(GamePhase.INITIAL);

    initializeGameMaster(); // リセットとコールバックの再設定

    try {
      await gameMasterRef.current?.startGame();
    } catch (error) {
      console.error("ゲームの開始中にエラーが発生しました:", error);
      addLogMessage(`ゲームエラー: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // setIsLoading(false); // This will be set by the first interactive phase (vote)
    }
  }, [addLogMessage, initializeGameMaster]);

  // デバッグモード開始ハンドラ
  const startDebugMode = useCallback(() => {
    setCurrentMode('debug');
    setGameLog([]); // デバッグモードではログをクリア
    setDebugTestResults({}); // デバッグテスト結果をクリア
    setIsLoading(false); // UIを表示するためローディングは解除
  }, []);

  // スキルテスト実行ハンドラ
  const runSkillTests = useCallback(async (skillName: string) => {
    setIsTestingDebugSkill(true);
    setGameLog([]); // テストログをクリア
    
    const results = await runTestsForSkill(skillName, addLogMessage);

    setDebugTestResults(prev => ({ ...prev, [skillName]: results }));
    setIsTestingDebugSkill(false);
    addLogMessage(`[テスト] スキル「${skillName}」のテストが完了しました。`);
  }, [addLogMessage]);


  // 投票ハンドラ
  const handleVote = useCallback((hand: string) => {
    setIsLoading(true);
    if (humanInputProviderRef.current?.voteInputResolver) { // Use new resolver
      humanInputProviderRef.current.voteInputResolver(hand);
      humanInputProviderRef.current.voteInputResolver = null;
    }
  }, []);

  // 仕込みフェイズでの行動選択ハンドラ (ブラフ、イカサマ、またはメイン画面に戻る)
  // This is called when "ブラフを宣言する" or "イカサマを使用する" is clicked on the main prep screen.
  // It sets the chosenPrepAction for UI, and resolves `prepActionInputResolver` for GameMaster to continue the loop.
  const handleChoosePrepAction = useCallback((action: 'bluff' | 'skill' | null) => {
    setChosenPrepAction(action); // Update local state for UI rendering
    // If action is null, it means '戻る' or '決定' was clicked on sub-screen. Don't resolve prepActionInputResolver here.
    // If action is 'bluff' or 'skill', it means the user wants to enter that sub-screen,
    // so we resolve the prepActionInputResolver to let GameMaster proceed to request bluff/skill choice.
    if (action !== null && humanInputProviderRef.current?.prepActionInputResolver) {
      humanInputProviderRef.current.prepActionInputResolver(action);
      // prepActionInputResolver is not nulled here, as it will be resolved with 'complete' later
      // when handlePrepPhaseConfirmed is called, or if the user cancels out of the sub-screen.
    }
  }, []);

  // ブラフ宣言ハンドラ
  // This is called when "決定" is clicked on the bluff selection screen.
  const handleDeclareBluff = useCallback((bluff: string | null) => {
    if (humanInputProviderRef.current?.bluffInputResolver) { // Use new resolver
      humanInputProviderRef.current.bluffInputResolver(bluff);
      humanInputProviderRef.current.bluffInputResolver = null;
    }
    setChosenPrepAction(null); // Return to main prep screen
  }, []);

  // スキル使用ハンドラ
  // This is called when "決定" is clicked on the skill selection screen.
  const handleUseSkill = useCallback((skill: string | null) => {
    if (humanInputProviderRef.current?.skillInputResolver) { // Use new resolver
      humanInputProviderRef.current.skillInputResolver(skill);
      humanInputProviderRef.current.skillInputResolver = null;
    }
    setChosenPrepAction(null); // Return to main prep screen
  }, []);

  // 仕込みフェイズ確定ハンドラ ("完了"ボタン)
  // This is called when "完了" is clicked on the main prep screen.
  // It resolves the `prepActionInputResolver` to signal the game master that the prep phase is complete.
  const handlePrepPhaseConfirmed = useCallback(() => {
    // If a bluff/skill resolver is still pending (e.g., entered screen but went back, or never entered),
    // resolve it with null to ensure game logic doesn't hang.
    if (humanInputProviderRef.current?.bluffInputResolver) {
      humanInputProviderRef.current.bluffInputResolver(null);
      humanInputProviderRef.current.bluffInputResolver = null;
    }
    if (humanInputProviderRef.current?.skillInputResolver) {
      humanInputProviderRef.current.skillInputResolver(null);
      humanInputProviderRef.current.skillInputResolver = null;
    }
    // Resolve the main prep action resolver with 'complete' to exit the loop in GameMaster.
    if (humanInputProviderRef.current?.prepActionInputResolver) {
      humanInputProviderRef.current.prepActionInputResolver('complete');
      humanInputProviderRef.current.prepActionInputResolver = null;
    }
    setChosenPrepAction(null); // Ensure UI returns to main prep view, though phase should change soon.
  }, []);


  // カード選択ハンドラ
  const handleChooseCard = useCallback((cardIndex: number) => {
    setIsLoading(true);
    if (humanInputProviderRef.current?.cardInputResolver) { // Use new resolver
      humanInputProviderRef.current.cardInputResolver(cardIndex);
      humanInputProviderRef.current.cardInputResolver = null;
    }
  }, []);

  // バトル結果承認ハンドラ
  const handleBattleResultAcknowledged = useCallback(() => {
    setIsLoading(true);
    setShowBattleResultUI(false);
    setBattleResult(null);
    if (humanInputProviderRef.current?.battleResultAcknowledgedResolver) { // Use new resolver
      humanInputProviderRef.current.battleResultAcknowledgedResolver('ok');
      humanInputProviderRef.current.battleResultAcknowledgedResolver = null;
    }
  }, []);

  // ゲーム終了承認ハンドラ
  const handleEndGameAcknowledged = useCallback(() => {
    // setIsLoading(true); // <--- REMOVE THIS LINE
    setShowEndGameUI(false);
    setGameResultTitle('');
    setGameResultMessage('');
    setCurrentPhase(GamePhase.INITIAL);
    setCurrentMode('initial'); // New: ゲーム終了後は初期モードに戻す
    if (humanInputProviderRef.current?.endGameAcknowledgedResolver) { // Use new resolver
      humanInputProviderRef.current.endGameAcknowledgedResolver('end');
      humanInputProviderRef.current.endGameAcknowledgedResolver = null;
    }
    setIsLoading(false); // <--- ADD THIS LINE
  }, []);

  const humanPlayer = players.find(p => p.name === 'you');
  const cpuPlayer = players.find(p => p.name === 'CPU');

  return {
    currentMode, // New
    setCurrentMode, // Fix: Add setCurrentMode to returned values
    currentPhase,
    players,
    gameLog, // gameLogを戻り値に追加
    isLoading,
    // startGame, // Renamed to startNormalGame
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
    humanPlayerBluff, // NEW
    humanPlayerSkillChosen, // NEW
    chosenPrepAction, // ADDED
    handleChoosePrepAction, // ADDED
    handlePrepPhaseConfirmed, // NEW
    showSkillNotification,
    skillNotificationMessage,
    handleSkillNotificationAcknowledged,
    wasPreviousBattleDraw,
    startNormalGame, // New
    startDebugMode, // New
    runSkillTests, // New
    debugTestResults, // New
    isTestingDebugSkill, // New
  };
};