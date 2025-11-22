import { GameMaster, Player } from '../services/gameLogic';
import { HumanInputProvider, AIInputProvider, HumanInputCallbacks, PrepActionChoice } from '../services/inputProviders';
import { HANDS } from '../utils/constants';
import { BattleResult } from '../services/rules';

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

// Custom Mock Renderer (prevents DOM operations in tests)
class MockRenderer {
  builder = {
    build: (eventType: string, kwargs: any) => {
      // For more detailed logging in tests, we can augment this.
      // E.g., if eventType is related to battle result, log more details.
      if (eventType.startsWith('battle_win') || eventType.startsWith('bluff_')) {
        return `[BATTLE_RESULT] ${eventType} - ${JSON.stringify(kwargs)}`;
      }
      return `[${eventType}] ${JSON.stringify(kwargs)}`;
    },
    replaceWithEmoji: (text: string) => text
  };
  gameMaster: GameMaster | null = null;
  private addLogMessage: (message: string) => void;
  constructor(addLogMessage: (message: string) => void) {
    this.addLogMessage = addLogMessage;
  }
  _send(message: string) { this.addLogMessage(message); }
  renderEvent(event: any, kwargs: any = {}) { this._send(this.builder.build(event.status || event, kwargs)); }
  showMessage(message: string) { this._send(message); }
}

// Custom Mock for HumanInputCallbacks to capture calls and allow setting return values
interface MockHumanInputCallbacks extends HumanInputCallbacks {
  _calls: { [key: string]: any[][] }; // To record calls
  _returns: { [key: string]: any[] }; // To set return values for subsequent calls
  resetMocks(): void;
  mockResolvedValueOnce(methodName: keyof HumanInputCallbacks, value: any): void;
  getCallArgs(methodName: keyof HumanInputCallbacks): any[][];
}

const createMockCallback = (methodName: keyof HumanInputCallbacks): any => {
  const mockFn = function(this: MockHumanInputCallbacks, ...args: any[]) {
    this._calls[methodName].push(args);
    if (this._returns[methodName] && this._returns[methodName].length > 0) {
      return Promise.resolve(this._returns[methodName].shift());
    }
    // Default fallback values if no specific return is set
    switch(methodName) {
      case 'onVoteRequested': return Promise.resolve(HANDS[0]);
      case 'onPrepActionRequested': return Promise.resolve('complete' as PrepActionChoice); // MODIFIED default to 'complete' for PrepActionChoice
      case 'onBluffChoiceRequested': return Promise.resolve(null);
      case 'onSkillChoiceRequested': return Promise.resolve(null);
      case 'onBluffDeclareRequested': return Promise.resolve(null); // Fallback for old
      case 'onSkillChooseRequested': return Promise.resolve(null); // Fallback for old
      case 'onCardChooseRequested': return Promise.resolve(0);
      case 'onShowBattleResultRequested': return Promise.resolve(undefined);
      case 'onShowEndGameRequested': return Promise.resolve(undefined);
      case 'onShowSkillNotificationRequested': return Promise.resolve(undefined);
      default: return Promise.resolve(undefined);
    }
  };
  return mockFn;
};

const createHumanInputMockCallbacks = (): MockHumanInputCallbacks => {
  const mock: Partial<MockHumanInputCallbacks> = {
    _calls: {},
    _returns: {},
    resetMocks() {
      for (const key in this._calls) {
        this._calls[key] = [];
      }
      for (const key in this._returns) {
        this._returns[key] = [];
      }
    },
    mockResolvedValueOnce(methodName: keyof HumanInputCallbacks, value: any) {
      if (!this._returns[methodName]) {
        this._returns[methodName] = [];
      }
      this._returns[methodName].push(value);
    },
    getCallArgs(methodName: keyof HumanInputCallbacks) {
      return this._calls[methodName] || [];
    }
  };

  const callbackNames: (keyof HumanInputCallbacks)[] = [
    'onVoteRequested', 'onPrepActionRequested', 'onBluffChoiceRequested', 'onSkillChoiceRequested',
    'onBluffDeclareRequested', 'onSkillChooseRequested', // Old/compatibility
    'onCardChooseRequested', 'onShowBattleResultRequested',
    'onShowEndGameRequested', 'onShowSkillNotificationRequested'
  ];

  for (const name of callbackNames) {
    mock._calls![name] = []; // Initialize call tracker
    (mock as any)[name] = createMockCallback(name).bind(mock); // Bind `this` for _calls/_returns access
  }

  return mock as MockHumanInputCallbacks;
};


// Custom Mock for AIInputProvider methods
interface MockAIInputProvider extends AIInputProvider {
  _calls: { [key: string]: any[][] };
  _returns: { [key: string]: any[] };
  resetMocks(): void;
  mockResolvedValueOnce(methodName: keyof AIInputProvider, value: any): void;
  getCallArgs(methodName: keyof AIInputProvider): any[][];
}

const createMockAIProviderMethod = (methodName: keyof AIInputProvider): any => {
  const mockFn = function(this: MockAIInputProvider, ...args: any[]) {
    this._calls[methodName].push(args);
    if (this._returns[methodName] && this._returns[methodName].length > 0) {
      return Promise.resolve(this._returns[methodName].shift());
    }
    // Default fallback values
    switch(methodName) {
      case 'chooseVote': return Promise.resolve(HANDS[0]);
      case 'choosePrepAction': return Promise.resolve('complete' as PrepActionChoice); // MODIFIED default to 'complete' for PrepActionChoice
      case 'maybeDeclare': return Promise.resolve(null);
      case 'chooseSkill': return Promise.resolve(null); // Default to not using skill
      case 'chooseCard': return Promise.resolve(0);
      case 'showResult': return Promise.resolve(undefined);
      case 'showEndGame': return Promise.resolve(undefined);
      default: return Promise.resolve(undefined);
    }
  };
  return mockFn;
};


const createMockAIInputProvider = (): MockAIInputProvider => {
  const aiProvider = new AIInputProvider(); // Original instance to ensure proper type
  const mock: Partial<MockAIInputProvider> = aiProvider as Partial<MockAIInputProvider>;
  
  mock._calls = {};
  mock._returns = {};
  mock.resetMocks = function() {
    for (const key in this._calls) {
      this._calls[key] = [];
    }
    for (const key in this._returns) {
      this._returns[key] = [];
    }
  };
  mock.mockResolvedValueOnce = function(methodName: keyof AIInputProvider, value: any) {
    if (!this._returns[methodName]) {
      this._returns[methodName] = [];
    }
    this._returns[methodName].push(value);
  };
  mock.getCallArgs = function(methodName: keyof AIInputProvider) {
    return this._calls[methodName] || [];
  };

  const methodNames: (keyof AIInputProvider)[] = [
    'chooseVote', 'showResult', 'showEndGame',
    'choosePrepAction',
    'maybeDeclare', 'chooseSkill', 'chooseCard'
  ];

  for (const name of methodNames) {
    mock._calls![name] = []; // Initialize call tracker
    (mock as any)[name] = createMockAIProviderMethod(name).bind(mock); // Replace original methods with mock versions
  }

  return mock as MockAIInputProvider;
};


// Helper to set up a clean game master instance for each test
const setupTestGame = (addLogMessage: (message: string) => void) => {
  const mockHumanInputCallbacks = createHumanInputMockCallbacks();
  const humanInputProvider = new HumanInputProvider();
  humanInputProvider.setCallbacks(mockHumanInputCallbacks);

  const gameMaster = new GameMaster(addLogMessage, humanInputProvider);
  gameMaster.renderer = new MockRenderer(addLogMessage) as any;
  gameMaster.renderer.gameMaster = gameMaster; // Set gameMaster reference for MockRenderer

  gameMaster.board.initializePlayers([{ name: "you", is_ai: false }, { name: "CPU", is_ai: true }]);
  const humanPlayer = gameMaster.board.players.find(p => p.name === 'you')!;
  const cpuPlayer = gameMaster.board.players.find(p => p.name === 'CPU')!;
  
  // Replace actual AIInputProvider with our mock
  const mockCpuInputProvider = createMockAIInputProvider();
  cpuPlayer.provider = mockCpuInputProvider; // Assign the mock to the player's provider
  
  humanInputProvider.setGameMaster(gameMaster);
  mockCpuInputProvider.setGameMaster(gameMaster); // Also set GM reference for mock AI

  // Store original methods for cleanup
  const originalInitial = gameMaster.initial;
  const originalVote = gameMaster.vote;
  const originalTurnLoop = gameMaster.turnLoop;
  const originalEndGame = gameMaster.endGame;
  const originalBoardSetHands = gameMaster.board.setHands; // Store original board.setHands

  // Mock gameMaster's internal flow methods that we don't need to test directly here
  gameMaster.initial = async () => {
    gameMaster.turnCount = 0;
    humanPlayer.life = 5;
    cpuPlayer.life = 5;
    humanPlayer.skillHand = [];
    cpuPlayer.skillHand = [];
    humanPlayer.hand = [];
    cpuPlayer.hand = [];
    humanPlayer.bluffDeclared = null;
    cpuPlayer.bluffDeclared = null;
    humanPlayer.skillChosenForTurn = null;
    cpuPlayer.skillChosenForTurn = null;
    addLogMessage('[Test Setup] GameMaster.initial mocked.');
  };
  gameMaster.vote = async () => {
    addLogMessage('[Test Setup] GameMaster.vote mocked. Skipping actual vote phase.');
    gameMaster.board.buildDeck([HANDS[0], HANDS[1], HANDS[2]]); // Ensure a basic deck
  };
  gameMaster.turnLoop = async () => {
    addLogMessage('[Test Setup] GameMaster.turnLoop mocked. Will only run one turn.');
  };
  gameMaster.endGame = async () => {
    addLogMessage('[Test Setup] GameMaster.endGame mocked. Skipping actual end game.');
  };
  // Mock board.setHands to use specific test hands instead of drawing from deck
  gameMaster.board.setHands = () => {
    addLogMessage('[Test Setup] Board.setHands mocked.');
    // Set specific hands for testing
  };

  // Return original methods for proper cleanup
  const cleanup = () => {
    gameMaster.initial = originalInitial;
    gameMaster.vote = originalVote;
    gameMaster.turnLoop = originalTurnLoop;
    gameMaster.endGame = originalEndGame;
    gameMaster.board.setHands = originalBoardSetHands;
  };

  return { gameMaster, humanPlayer, cpuPlayer, mockHumanInputCallbacks, mockCpuInputProvider, cleanup };
};


// Fix: Export `runTestsForSkill`
export const runTestsForSkill = async (skillName: string, addLogMessage: (message: string) => void): Promise<TestResult[]> => {
  addLogMessage(`\n=== Running tests for skill: ${skillName} ===`);
  const results: TestResult[] = [];

  // --- Test Case 1: Skill "矛" (Spear) activates on win, increases damage ---
  if (skillName === "矛") {
    addLogMessage('--- Test Case: "矛" activated on human win ---');
    const { gameMaster, humanPlayer, cpuPlayer, mockHumanInputCallbacks, mockCpuInputProvider, cleanup } = setupTestGame(addLogMessage);
    try {
      // Set up scenario: Human uses "矛", wins battle
      humanPlayer.skillHand = ["矛"];
      humanPlayer.life = 5;
      cpuPlayer.life = 5;
      gameMaster.board.setHands = () => {
        humanPlayer.hand = ["グー", "グー", "グー", "グー", "グー"]; // Human wins with Gu
        cpuPlayer.hand = ["チョキ", "チョキ", "チョキ", "チョキ", "チョキ"]; // CPU plays Choki
      };

      // Mock human input for prep and battle
      mockHumanInputCallbacks.mockResolvedValueOnce('onPrepActionRequested', 'skill'); // Choose to enter skill selection
      mockHumanInputCallbacks.mockResolvedValueOnce('onSkillChoiceRequested', '矛'); // Choose skill '矛'
      mockHumanInputCallbacks.mockResolvedValueOnce('onPrepActionRequested', 'complete'); // Complete prep phase
      mockHumanInputCallbacks.mockResolvedValueOnce('onCardChooseRequested', 0); // Play "グー"
      mockHumanInputCallbacks.mockResolvedValueOnce('onShowBattleResultRequested', undefined); // Acknowledge result

      // Mock CPU input
      mockCpuInputProvider.mockResolvedValueOnce('choosePrepAction', 'complete'); // CPU completes prep
      mockCpuInputProvider.mockResolvedValueOnce('chooseCard', 0); // CPU plays "チョキ"

      await gameMaster.executeTurn();

      // Assertions
      const expectedDamage = 2; // Normal 1 damage + 1 from矛
      const newCpuLife = 5 - expectedDamage;

      const resultCallArgs = mockHumanInputCallbacks.getCallArgs('onShowBattleResultRequested');
      const battleResult: BattleResult = resultCallArgs[0]?.[0];

      if (battleResult && battleResult.winner === 'you' && battleResult.damage === expectedDamage && cpuPlayer.life === newCpuLife) {
        results.push({ name: '矛 on win', passed: true, message: `矛が正しく発動し、ダメージが ${expectedDamage} になりました。CPUライフ: ${cpuPlayer.life}` });
      } else {
        results.push({ name: '矛 on win', passed: false, message: `矛が期待通りに発動しませんでした。Winner: ${battleResult?.winner}, Damage: ${battleResult?.damage}, CPUライフ: ${cpuPlayer.life}. 期待: winner=you, damage=${expectedDamage}, life=${newCpuLife}` });
      }
      if (!humanPlayer.skillHand.includes('矛')) {
        results.push({ name: '矛 consumed', passed: true, message: '矛スキルは消費されました。' });
      } else {
        results.push({ name: '矛 consumed', passed: false, message: '矛スキルが消費されていません。' });
      }
    } catch (e: any) {
      results.push({ name: '矛 on win (exception)', passed: false, message: `例外が発生しました: ${e.message}` });
    } finally {
      cleanup();
    }

    addLogMessage('--- Test Case: "矛" not activated on human lose ---');
    const { gameMaster: gm2, humanPlayer: hp2, cpuPlayer: cp2, mockHumanInputCallbacks: mhc2, mockCpuInputProvider: mcp2, cleanup: cl2 } = setupTestGame(addLogMessage);
    try {
      // Set up scenario: Human uses "矛", loses battle
      hp2.skillHand = ["矛"];
      hp2.life = 5;
      cp2.life = 5;
      gm2.board.setHands = () => {
        hp2.hand = ["チョキ", "チョキ", "チョキ", "チョキ", "チョキ"]; // Human loses to Gu
        cp2.hand = ["グー", "グー", "グー", "グー", "グー"]; // CPU plays Gu
      };

      // Mock human input for prep and battle
      mhc2.mockResolvedValueOnce('onPrepActionRequested', 'skill'); // Choose to enter skill selection
      mhc2.mockResolvedValueOnce('onSkillChoiceRequested', '矛'); // Choose skill '矛'
      mhc2.mockResolvedValueOnce('onPrepActionRequested', 'complete'); // Complete prep phase
      mhc2.mockResolvedValueOnce('onCardChooseRequested', 0); // Play "チョキ"
      mhc2.mockResolvedValueOnce('onShowBattleResultRequested', undefined); // Acknowledge result

      // Mock CPU input
      mcp2.mockResolvedValueOnce('choosePrepAction', 'complete'); // CPU completes prep
      mcp2.mockResolvedValueOnce('chooseCard', 0); // CPU plays "グー"

      await gm2.executeTurn();

      // Assertions
      const expectedDamage = 1; // Normal 1 damage, 矛 should not activate
      const newHumanLife = 5 - expectedDamage;

      const resultCallArgs = mhc2.getCallArgs('onShowBattleResultRequested');
      const battleResult: BattleResult = resultCallArgs[0]?.[0];

      if (battleResult && battleResult.winner === 'CPU' && battleResult.damage === expectedDamage && hp2.life === newHumanLife) {
        results.push({ name: '矛 not activated on lose', passed: true, message: `矛は人間敗北時に発動せず、ダメージは ${expectedDamage} のままでした。YOUライフ: ${hp2.life}` });
      } else {
        results.push({ name: '矛 not activated on lose', passed: false, message: `矛が期待通りに発動したかチェック。Winner: ${battleResult?.winner}, Damage: ${battleResult?.damage}, YOUライフ: ${hp2.life}. 期待: winner=CPU, damage=${expectedDamage}, life=${newHumanLife}` });
      }
      if (!hp2.skillHand.includes('矛')) {
        results.push({ name: '矛 consumed (lose)', passed: true, message: '矛スキルは消費されました。' });
      } else {
        results.push({ name: '矛 consumed (lose)', passed: false, message: '矛スキルが消費されていません。' });
      }

    } catch (e: any) {
      results.push({ name: '矛 not activated on lose (exception)', passed: false, message: `例外が発生しました: ${e.message}` });
    } finally {
      cl2();
    }
  }

  // --- Test Case 2: Skill "盾" (Shield) activates on lose, reduces damage ---
  if (skillName === "盾") {
    addLogMessage('--- Test Case: "盾" activated on human lose ---');
    const { gameMaster, humanPlayer, cpuPlayer, mockHumanInputCallbacks, mockCpuInputProvider, cleanup } = setupTestGame(addLogMessage);
    try {
      // Set up scenario: Human uses "盾", loses battle
      humanPlayer.skillHand = ["盾"];
      humanPlayer.life = 5;
      cpuPlayer.life = 5;
      gameMaster.board.setHands = () => {
        humanPlayer.hand = ["チョキ", "チョキ", "チョキ", "チョキ", "チョキ"]; // Human loses to Gu
        cpuPlayer.hand = ["グー", "グー", "グー", "グー", "グー"]; // CPU plays Gu
      };

      // Mock human input for prep and battle
      mockHumanInputCallbacks.mockResolvedValueOnce('onPrepActionRequested', 'skill'); // Choose to enter skill selection
      mockHumanInputCallbacks.mockResolvedValueOnce('onSkillChoiceRequested', '盾'); // Choose skill '盾'
      mockHumanInputCallbacks.mockResolvedValueOnce('onPrepActionRequested', 'complete'); // Complete prep phase
      mockHumanInputCallbacks.mockResolvedValueOnce('onCardChooseRequested', 0); // Play "チョキ"
      mockHumanInputCallbacks.mockResolvedValueOnce('onShowBattleResultRequested', undefined); // Acknowledge result

      // Mock CPU input
      mockCpuInputProvider.mockResolvedValueOnce('choosePrepAction', 'complete'); // CPU completes prep
      mockCpuInputProvider.mockResolvedValueOnce('chooseCard', 0); // CPU plays "グー"

      await gameMaster.executeTurn();

      // Assertions
      const expectedDamage = 0; // Normal 1 damage - 1 from 盾
      const newHumanLife = 5 - expectedDamage;

      const resultCallArgs = mockHumanInputCallbacks.getCallArgs('onShowBattleResultRequested');
      const battleResult: BattleResult = resultCallArgs[0]?.[0];

      if (battleResult && battleResult.loser === 'you' && battleResult.damage === expectedDamage && humanPlayer.life === newHumanLife) {
        results.push({ name: '盾 on lose', passed: true, message: `盾が正しく発動し、ダメージが ${expectedDamage} になりました。YOUライフ: ${humanPlayer.life}` });
      } else {
        results.push({ name: '盾 on lose', passed: false, message: `盾が期待通りに発動しませんでした。Loser: ${battleResult?.loser}, Damage: ${battleResult?.damage}, YOUライフ: ${humanPlayer.life}. 期待: loser=you, damage=${expectedDamage}, life=${newHumanLife}` });
      }
      if (!humanPlayer.skillHand.includes('盾')) {
        results.push({ name: '盾 consumed', passed: true, message: '盾スキルは消費されました。' });
      } else {
        results.push({ name: '盾 consumed', passed: false, message: '盾スキルが消費されていません。' });
      }
    } catch (e: any) {
      results.push({ name: '盾 on lose (exception)', passed: false, message: `例外が発生しました: ${e.message}` });
    } finally {
      cleanup();
    }

    addLogMessage('--- Test Case: "盾" not activated on human win ---');
    const { gameMaster: gm2, humanPlayer: hp2, cpuPlayer: cp2, mockHumanInputCallbacks: mhc2, mockCpuInputProvider: mcp2, cleanup: cl2 } = setupTestGame(addLogMessage);
    try {
      // Set up scenario: Human uses "盾", wins battle
      hp2.skillHand = ["盾"];
      hp2.life = 5;
      cp2.life = 5;
      gm2.board.setHands = () => {
        hp2.hand = ["グー", "グー", "グー", "グー", "グー"]; // Human wins with Gu
        cp2.hand = ["チョキ", "チョキ", "チョキ", "チョキ", "チョキ"]; // CPU plays Choki
      };

      // Mock human input for prep and battle
      mhc2.mockResolvedValueOnce('onPrepActionRequested', 'skill'); // Choose to enter skill selection
      mhc2.mockResolvedValueOnce('onSkillChoiceRequested', '盾'); // Choose skill '盾'
      mhc2.mockResolvedValueOnce('onPrepActionRequested', 'complete'); // Complete prep phase
      mhc2.mockResolvedValueOnce('onCardChooseRequested', 0); // Play "グー"
      mhc2.mockResolvedValueOnce('onShowBattleResultRequested', undefined); // Acknowledge result

      // Mock CPU input
      mcp2.mockResolvedValueOnce('choosePrepAction', 'complete'); // CPU completes prep
      mcp2.mockResolvedValueOnce('chooseCard', 0); // CPU plays "チョキ"

      await gm2.executeTurn();

      // Assertions
      const expectedDamage = 1; // Normal 1 damage, 盾 should not activate
      const newCpuLife = 5 - expectedDamage;

      const resultCallArgs = mhc2.getCallArgs('onShowBattleResultRequested');
      const battleResult: BattleResult = resultCallArgs[0]?.[0];

      if (battleResult && battleResult.winner === 'you' && battleResult.damage === expectedDamage && cp2.life === newCpuLife) {
        results.push({ name: '盾 not activated on win', passed: true, message: `盾は人間勝利時に発動せず、ダメージは ${expectedDamage} のままでした。CPUライフ: ${cp2.life}` });
      } else {
        results.push({ name: '盾 not activated on win', passed: false, message: `盾が期待通りに発動したかチェック。Winner: ${battleResult?.winner}, Damage: ${battleResult?.damage}, CPUライフ: ${cp2.life}. 期待: winner=you, damage=${expectedDamage}, life=${newCpuLife}` });
      }
      if (!hp2.skillHand.includes('盾')) {
        results.push({ name: '盾 consumed (win)', passed: true, message: '盾スキルは消費されました。' });
      } else {
        results.push({ name: '盾 consumed (win)', passed: false, message: '盾スキルが消費されていません。' });
      }
    } catch (e: any) {
      results.push({ name: '盾 not activated on win (exception)', passed: false, message: `例外が発生しました: ${e.message}` });
    } finally {
      cl2();
    }
  }


  if (!['矛', '盾'].includes(skillName)) { // Only include actual skill names here
    results.push({ name: 'Unhandled Skill', passed: false, message: `テストケースが用意されていないスキル: ${skillName}` });
  }

  addLogMessage(`\n=== Tests for skill: ${skillName} finished ===`);
  return results;
};