import { BattleResult, BluffRule } from './rules';
import { AIInputProvider, HumanInputProvider, PrepActionChoice } from './inputProviders';
import { Renderer } from './uiRenderer';
import { HAND_EMOJIS, HANDS, GamePhase, CHEAT_SKILLS, SkillTiming, ALL_SKILLS } from '../utils/constants'; // ALL_SKILLSをインポート

// =================================================================
// 4. プレイヤーと盤面 (Player and Board)
// =================================================================

export class Player {
  name: string;
  isAi: boolean;
  provider: HumanInputProvider | AIInputProvider;
  life: number;
  hand: string[];
  bluffDeclared: string | null;
  vote: string | null;
  skillHand: string[]; // スキル札
  skillChosenForTurn: string | null; // 今ターンで選択したスキル
  chosenPrepAction: 'bluff' | 'skill' | 'pass' | null = null; // ADDED: Prep phase UI now uses this
  gameMaster: GameMaster | null; // 循環参照のため null で初期化、後で設定

  constructor(name: string, isAi: boolean, gameMaster: GameMaster) {
    this.name = name;
    this.isAi = isAi;
    this.gameMaster = gameMaster;
    // this.provider = isAi ? new AIInputProvider() : gameMaster.humanInputProvider; // HumanInputProviderをGameMasterから取得
    // Fix: Provider needs gameMaster on creation, but cannot pass `this` (gameMaster) to constructor if `this` is not fully initialized.
    // Instead, set gameMaster to provider after construction.
    if (isAi) {
      const aiProvider = new AIInputProvider();
      aiProvider.setGameMaster(gameMaster);
      this.provider = aiProvider;
    } else {
      this.provider = gameMaster.humanInputProvider;
      (this.provider as HumanInputProvider).setGameMaster(gameMaster);
    }

    this.life = 5;
    this.hand = [];
    this.bluffDeclared = null;
    this.vote = null;
    this.skillHand = []; // スキル札の初期化
    this.skillChosenForTurn = null; // 選択スキルを初期化
    this.chosenPrepAction = null; // ADDED
  }

  initialize() {
    this.life = 5;
    this.hand = [];
    this.vote = null;
    this.bluffDeclared = null;
    this.skillHand = []; // ゲームリセット時にもスキル札をクリア
    this.skillChosenForTurn = null; // 選択スキルをクリア
    this.chosenPrepAction = null; // ADDED
    // 初期スキル札を3枚配布
    for (let i = 0; i < 3; i++) {
      this.gainRandomSkill();
    }
    this.gameMaster?.renderer.showMessage(`[DEBUG] ${this.name} を ${this.isAi ? 'AI' : 'Human'}で設定`);
  }

  drawSkills(skills: string[]) {
    this.skillHand.push(...skills);
    this.gameMaster?.renderer.showMessage(`[盤面] ${this.name} はスキル札 [${this.skillHand.map(s => `**${s}**`).join(', ')}] を受け取りました。`);
  }

  gainRandomSkill() {
    if (ALL_SKILLS.length > 0) {
      const randomSkill = ALL_SKILLS[Math.floor(Math.random() * ALL_SKILLS.length)];
      this.skillHand.push(randomSkill);
      this.gameMaster?.renderer.showMessage(`[盤面] ${this.name} はスキル札「**${randomSkill}**」を獲得しました。(合計: ${this.skillHand.length}枚)`);
    } else {
      this.gameMaster?.renderer.showMessage(`[盤面] スキルが定義されていないため、${this.name} はスキル札を獲得できませんでした。`);
    }
  }

  async chooseVote(): Promise<string> {
    const chosenVote = await this.provider.chooseVote(this);
    this.vote = chosenVote;
    return chosenVote;
  }

  receiveCards(cards: string[]) {
    this.hand.push(...cards);
  }

  async showBattleResult(result: BattleResult, playerYou: Player, playerCpu: Player): Promise<void> {
    let resultStatus = 'draw';
    if (result.winner === playerYou.name) {
      resultStatus = 'you_win';
    } else if (result.loser === playerYou.name) {
      resultStatus = 'you_lose';
    }

    const logMessage = [
      "---------------------------------------",
      this.gameMaster?.renderer.builder.build("result_header", { turn: this.gameMaster.turnCount }),
      this.gameMaster?.renderer.builder.build("battle_result_win", { cardA: result.cardA, cardB: result.cardB }),
      this.gameMaster?.renderer.builder.build(result.status, {
        winner: result.winner,
        loser: result.loser,
        damage: result.damage,
        declared: result.declared
      }),
      // Fix: Used playerCpu.life instead of undefined cpuPlayer.life
      this.gameMaster?.renderer.builder.build("life_status", { you_life: playerYou.life, cpu_life: playerCpu.life }),
      "---------------------------------------"
    ].join('\n');

    this.gameMaster?.renderer.showMessage(logMessage);

    if (!this.isAi) {
      await (this.provider as HumanInputProvider).showResult(
        `バトル結果 (ターン ${this.gameMaster?.turnCount})`,
        logMessage, // HTML整形はコンポーネント側で行う
        resultStatus,
        result, // BattleResultオブジェクトをそのまま渡す
        playerYou, playerCpu
      );
    } else {
      // Fix: Explicitly cast to AIInputProvider as it takes no arguments for showResult
      await (this.provider as AIInputProvider).showResult();
    }
  }

  // MODIFIED: requestPrep now orchestrates independent bluff and skill choices until "完了"
  async requestPrep(initialCanDeclareBluff: boolean, initialCanUseSkill: boolean): Promise<void> {
    const opponent = this.gameMaster?.board.players.find(p => p.name !== this.name);
    
    let prepCompleted = false;
    while (!prepCompleted) {
        // 各ループイテレーションの開始時に、ブラフとスキル使用の可否を動的に再評価
        const currentCanDeclareBluff = this.life < (opponent?.life || this.life + 1);
        const currentCanUseSkill = this.skillHand.length > 0; // 手札にスキルがあるならいつでも選択画面には入れる

        this.gameMaster?.renderer.showMessage(this.gameMaster.renderer.builder.build('player_prep_action_request', { name: this.name }));

        // この`choosePrepAction`の呼び出しは、UIのメイン仕込み画面での選択を待ちます。
        // UI側で「ブラフ」「イカサマ」「完了」のいずれかが選択されると解決されます。
        const chosenActionType: PrepActionChoice = await this.provider.choosePrepAction(this, currentCanDeclareBluff, currentCanUseSkill);

        if (chosenActionType === 'bluff') {
            this.gameMaster?.renderer.showMessage(this.gameMaster.renderer.builder.build('player_bluff_selection_request', { name: this.name }));
            // `maybeDeclare`はUIのブラフ選択画面で「決定」が押されるまでブロックします。
            const declaredHand = await this.provider.maybeDeclare(this, currentCanDeclareBluff);
            this.bluffDeclared = declaredHand; // プレイヤーのブラフ宣言を更新
            if (this.bluffDeclared) {
                this.gameMaster?.renderer.showMessage(this.gameMaster.renderer.builder.build('player_declare', { name: this.name, declared: this.bluffDeclared }));
            } else {
                this.gameMaster?.renderer.showMessage(this.gameMaster.renderer.builder.build('player_declare', { name: this.name, declared: '宣言しない' }));
            }
            // `maybeDeclare`が解決されると、UIはメイン仕込み画面に戻ります。
            // ループは再開し、次の行動選択（ブラフ、イカサマ、完了）を待ちます。

        } else if (chosenActionType === 'skill') {
            this.gameMaster?.renderer.showMessage(this.gameMaster.renderer.builder.build('player_skill_selection_request', { name: this.name }));
            
            // `chooseSkill`はUIのスキル選択画面で「決定」が押されるまでブロックします。
            const chosenSkill = await this.provider.chooseSkill(this, currentCanUseSkill);

            // 既にスキルを選択済みの場合、そのスキルを手札に戻す
            if (this.skillChosenForTurn !== null) {
                this.skillHand.push(this.skillChosenForTurn);
                this.gameMaster?.renderer.showMessage(this.gameMaster.renderer.builder.build('skill_returned_to_hand', { name: this.name, skill: this.skillChosenForTurn }));
            }

            this.skillChosenForTurn = chosenSkill; // 新しい選択スキルを設定 (nullの場合もあり)

            if (this.skillChosenForTurn) {
                // 選択したスキルを手札から削除
                const skillIndex = this.skillHand.indexOf(this.skillChosenForTurn);
                if (skillIndex !== -1) {
                    this.skillHand.splice(skillIndex, 1); 
                } else {
                    this.gameMaster?.renderer.showMessage(`[WARN] ${this.name}: 選択したスキル「${this.skillChosenForTurn}」が手札に見つかりませんでした。`);
                }
                this.gameMaster?.renderer.showMessage(this.gameMaster.renderer.builder.build('player_skill_use', { name: this.name, skill: this.skillChosenForTurn }));
            } else {
                this.gameMaster?.renderer.showMessage(this.gameMaster.renderer.builder.build('player_skill_use_none', { name: this.name })); // 「使用しない」を選択
            }
            // `chooseSkill`が解決されると、UIはメイン仕込み画面に戻ります。
            // ループは再開し、次の行動選択を待ちます。

        } else if (chosenActionType === 'complete') { // UIで「完了」ボタンが押された場合
            this.gameMaster?.renderer.showMessage(this.gameMaster.renderer.builder.build('player_pass_prep', { name: this.name }));
            prepCompleted = true; // ループを終了し、仕込みフェイズを完了
        }
    }
  }


  async maybeDeclare(player: Player, canDeclareBluff: boolean): Promise<string | null> {
    // maybeDeclareはrequestPrepから呼び出されるので、ログ出力はrequestPrep側で
    const declaredHand = await this.provider.maybeDeclare(player, canDeclareBluff);
    return declaredHand;
  }

  async chooseSkill(player: Player, canUseSkill: boolean): Promise<string | null> {
    // chooseSkillはrequestPrepから呼び出されるので、ログ出力はrequestPrep側で
    const chosenSkill = await this.provider.chooseSkill(player, canUseSkill);
    
    // スキル選択はrequestPrep内で処理されるため、重複するロジックを削除
    // if (chosenSkill) {
    //     const skillIndex = this.skillHand.indexOf(chosenSkill);
    //     if (skillIndex !== -1) {
    //         this.skillHand.splice(skillIndex, 1); // 使用したスキルは手札から削除
    //     }
    // }
    return chosenSkill;
  }


  async requestPlayCard(wasPreviousBattleDraw: boolean = false): Promise<string | null> {
    const index = await this.provider.chooseCard(this, this.gameMaster?.board.players.find(p => p.name !== this.name)!, wasPreviousBattleDraw);

    if (index === null || index === undefined || index < 0 || index >= this.hand.length) {
      this.gameMaster?.renderer.showMessage(`[DEBUG] [プレイヤー${this.name}] のエラー: 手札切れまたは無効な選択`);
      return null;
    }
    const card = this.hand.splice(index, 1)[0];
    this.gameMaster?.renderer.showMessage(this.gameMaster?.renderer.builder.build('player_play', { name: this.name, card: card }) || '');
    return card;
  }
}

export class Board {
  deck: string[];
  discard: string[];
  players: Player[];
  renderer: Renderer;
  rule: BluffRule;
  gameMaster: GameMaster;

  constructor(renderer: Renderer, gameMaster: GameMaster) {
    this.deck = [];
    this.discard = [];
    this.players = [];
    this.renderer = renderer;
    this.rule = new BluffRule();
    this.gameMaster = gameMaster;
  }

  reset() {
    this.deck = [];
    this.discard = [];
    this.players.forEach(p => p.initialize());
  }

  initializePlayers(playerInfos: { name: string; is_ai: boolean }[]) {
    // Fix: Pass `this.gameMaster` to Player constructor
    this.players = playerInfos.map(info => new Player(info.name, info.is_ai, this.gameMaster));
    this.players.forEach(p => p.initialize()); // Player.initialize() now handles initial skill distribution
    this.renderer.showMessage(`[盤面] 参加プレイヤー一覧: ${this.players.map(p => p.name).join(', ')}`);
  }

  async voteAndBuild(): Promise<void> {
    this.renderer.showMessage("[盤面] 投票受付");
    const votePromises = this.players.map(p => p.chooseVote());
    await Promise.all(votePromises);

    const votes = this.players.map(p => p.vote);
    this.renderer.showMessage(`[盤面] 投票結果: [${votes.join(', ')}]`);
    this.buildDeck(votes.filter((v): v is string => v !== null)); // nullを除外
    this.renderer.showMessage(`[盤面] デッキ枚数: ${this.deck.length} 枚`);
  }

  buildDeck(votes: string[]) {
    const base: { [key: string]: number } = { "グー": 1, "パー": 1, "チョキ": 1 };
    votes.forEach(v => { base[v] = (base[v] || 0) + 1; }); // nullチェックと初期値設定
    this.deck = [];
    for (const hand in base) {
      for (let i = 0; i < base[hand] * 20; i++) { this.deck.push(hand); }
    }
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
    this.renderer.showMessage("[盤面] デッキを構築しました");
  }

  resetBluff() {
    this.players.forEach(p => { p.bluffDeclared = null; });
  }

  draw(player: Player, num = 5) {
    const drawn = this.deck.splice(0, num);
    player.receiveCards(drawn);
    return drawn;
  }

  discardHand(player: Player) {
    this.discard.push(...player.hand);
    player.hand = [];
  }

  setHands() {
    this.players.forEach(p => {
      this.discardHand(p);
      this.draw(p, 5);
      this.renderer.showMessage(`[盤面] ${p.name} の手札: [${p.hand.map(h => HAND_EMOJIS[h]).join(', ')}]`);
    });
  }

  // NOTE: requestPrepPlayers is removed as prep logic is now handled in GameMaster.executeTurn
  // and Player.requestPrep handles its own internal flow.

  /**
   * 1ターンのバトルフェイズを実行し、最終的なバトル結果を返します。
   * ダメージ適用と結果表示はGameMasterの責任となります。
   */
  async phaseBattle(): Promise<BattleResult> {
    this.renderer.showMessage("[盤面] バトルスタート");
    const [a, b] = this.players;
    if (!a || !b) {
        return new BattleResult("error");
    }

    let isDrawDetected = false; // 直前のミニバトルがあいこだったかを示すフラグ

    while (true) { // Loop indefinitely until explicit break or return
      if (a.hand.length === 0 || b.hand.length === 0) {
        // Hands are empty, this is a deck_out situation
        return new BattleResult("deck_out");
      }

      this.renderer.showMessage("--- カード選択 ---");

      const [cardA, cardB] = await Promise.all([
        a.requestPlayCard(isDrawDetected),
        b.requestPlayCard(isDrawDetected)
      ]);

      if (cardA === null || cardB === null) {
          // Should not happen if hands are non-empty, but for safety
          return new BattleResult("error");
      }

      const result = this.rule.judgeDamage(cardA, cardB, a, b);
      
      if (result.status !== "battle_draw") {
          // A definitive winner/loser was found in this mini-battle
          return result;
      }
      // If it's a draw, continue to next mini-battle if cards remain
      isDrawDetected = true;
      this.renderer.showMessage("--- あいこ！次のカード選択へ ---");
    }
  }

  isEmpty(): boolean { return this.deck.length === 0; }
  hasPlayerWithZeroLife(): boolean { return this.players.some(p => p.life <= 0); }

  judgeGame(): string | null {
    const [a, b] = this.players;
    if (!a || !b) return null;
    this.renderer.showMessage(`[盤面] ゲーム結果: ${a.name}=${a.life} | ${b.name}=${b.life}`);
    if (a.life > b.life) return a.name;
    if (b.life > a.life) return b.name;
    return null; // Draw
  }
}

// =================================================================
// 5. ゲームマスター (GameMaster) - 進行役
// =================================================================

export class GameMaster {
  renderer: Renderer;
  board: Board;
  running: boolean;
  turnCount: number;
  addLogMessage: (message: string) => void;
  humanInputProvider: HumanInputProvider;

  constructor(addLogMessage: (message: string) => void, humanInputProvider: HumanInputProvider) {
    this.addLogMessage = addLogMessage;
    this.humanInputProvider = humanInputProvider;
    this.renderer = new Renderer(addLogMessage);
    this.board = new Board(this.renderer, this);
    this.running = false;
    this.turnCount = 0;
  }

  resetGame() {
    this.running = false;
    this.turnCount = 0;
    this.board.reset();
  }

  async startGame() {
    this.addLogMessage("=== ゲーム開始 ===");
    this.running = true;
    await this.initial();
    await this.vote();
    await this.turnLoop();
    await this.endGame();
  }

  async initial() {
    this.renderer.renderEvent("phase_start", { phase: "初期化" });
    this.turnCount = 0;
    const playerInfos = [{ name: "you", is_ai: false }, { name: "CPU", is_ai: true }];
    this.board.initializePlayers(playerInfos);

    // REMOVED: Humanプレイヤーにスキル札を配布 (ダミースキルを廃棄し、矛2枚と盾2枚を配布)
    // Player.initialize() now handles initial skill distribution
    // const humanPlayer = this.board.players.find(p => p.name === 'you');
    // if (humanPlayer) {
    //   humanPlayer.drawSkills(["矛", "矛", "盾", "盾"]);
    // }

    this.renderer.showMessage("プレイヤーと盤面を初期化しました。");
  }

  async vote() {
    this.renderer.renderEvent("phase_start", { phase: "投票" });
    await this.board.voteAndBuild();
  }

  async turnLoop() {
    this.renderer.showMessage("[ターン開始]");
    while (this.running) {
      this.turnCount += 1;
      this.renderer.showMessage(`\n=== ターン ${this.turnCount} ===`);
      await this.executeTurn();

      if (this.board.isEmpty()) {
        this.running = false;
        this.renderer.renderEvent(new BattleResult("deck_out")); // deck_draw から deck_out に変更
      } else if (this.board.hasPlayerWithZeroLife()) {
        this.running = false;
      }
      if (this.running) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  async executeTurn() {
    const humanPlayer = this.board.players.find(p => !p.isAi);
    const cpuPlayer = this.board.players.find(p => p.isAi);
    if (!humanPlayer || !cpuPlayer) return;

    // 現在のスキル選択はBATTLE_RESULT_AFTERのみなので、NEXT_TURN_STARTは削除
    // C. 次ターンの開始時 (NextTurnStart) のスキル発動 (今回は該当スキルなし)
    // if (humanPlayer.skillChosenForTurn && CHEAT_SKILLS[humanPlayer.skillChosenForTurn] === SkillTiming.NEXT_TURN_START) {
    //   const message = this.renderer.builder.build('skill_activate_dummy', { skill: humanPlayer.skillChosenForTurn, name: humanPlayer.name });
    //   this.renderer.showMessage(message);
    //   await this.humanInputProvider.showSkillNotification(message); // モーダルで通知
    //   humanPlayer.skillChosenForTurn = null; // スキル発動後クリア
    // }

    // 1. セットアップフェイズ
    this.renderer.renderEvent("phase_start", { phase: "セットアップ" });
    this.board.resetBluff();
    // humanPlayer.bluffDeclaredとhumanPlayer.skillChosenForTurnはrequestPrep内で更新されるため、ここでリセット
    humanPlayer.bluffDeclared = null;
    humanPlayer.skillChosenForTurn = null;
    cpuPlayer.bluffDeclared = null;
    cpuPlayer.skillChosenForTurn = null;
    humanPlayer.chosenPrepAction = null; // ADDED: Clear chosenPrepAction
    cpuPlayer.chosenPrepAction = null; // ADDED: Clear chosenPrepAction


    // 各プレイヤーの初期ライフを記録
    const initialHumanLife = humanPlayer.life;
    const initialCpuLife = cpuPlayer.life;


    // 2. ドローフェイズ
    this.renderer.showMessage("[ドローフェイズ]");
    this.board.setHands();

    // 3. 仕込みフェイズ
    this.renderer.renderEvent("phase_start", { phase: "仕込み" });
    
    // requestPrep内で動的に再評価されるため、ここのcanDeclareBluff/canUseSkillは初回の値として使われる
    // ただし、HumanInputProviderのコールバックにはGameMasterが計算した最新の値を渡す
    const initialHumanCanDeclareBluff = humanPlayer.life < cpuPlayer.life;
    const initialHumanCanUseSkill = humanPlayer.skillHand.length > 0;
    const initialCpuCanDeclareBluff = cpuPlayer.life < humanPlayer.life;
    const initialCpuCanUseSkill = cpuPlayer.skillHand.length > 0;

    this.renderer.showMessage(`[DEBUG] YOU: life=${humanPlayer.life}, skillHand=${humanPlayer.skillHand.length}, canBluff=${initialHumanCanDeclareBluff}, canSkill=${initialHumanCanUseSkill}`);
    this.renderer.showMessage(`[DEBUG] CPU: life=${cpuPlayer.life}, skillHand=${cpuPlayer.skillHand.length}, canBluff=${initialCpuCanDeclareBluff}, canSkill=${initialCpuCanUseSkill}`);

    // Modified: ブラフとスキル使用を独立してリクエスト (requestPrepがループを管理)
    const prepPromises: Promise<void>[] = this.board.players.map(p => {
      if (p.name === 'you') {
        return p.requestPrep(initialHumanCanDeclareBluff, initialHumanCanUseSkill);
      } else { // CPU
        return p.requestPrep(initialCpuCanDeclareBluff, initialCpuCanUseSkill);
      }
    });
    
    await Promise.all(prepPromises);

    this.renderer.showMessage(`[DEBUG] YOU bluffDeclared: ${humanPlayer.bluffDeclared}, skillChosenForTurn: ${humanPlayer.skillChosenForTurn}`);
    this.renderer.showMessage(`[DEBUG] CPU bluffDeclared: ${cpuPlayer.bluffDeclared}, skillChosenForTurn: ${cpuPlayer.skillChosenForTurn}`);


    // 現在のスキル選択はBATTLE_RESULT_AFTERのみなので、PREP_PHASE_ENDは削除
    // a. 仕込みフェイズ終了後すぐ (PrepPhaseEnd) のスキル発動 (今回は該当スキルなし)
    // if (humanPlayer.skillChosenForTurn && CHEAT_SKILLS[humanPlayer.skillChosenForTurn] === SkillTiming.PREP_PHASE_END) {
    //   const message = this.renderer.builder.build('skill_activate_dummy', { skill: humanPlayer.skillChosenForTurn, name: humanPlayer.name });
    //   this.renderer.showMessage(message);
    //   await this.humanInputProvider.showSkillNotification(message); // モーダルで通知
    //   humanPlayer.skillChosenForTurn = null; // スキル発動後クリア
    // }

    // 4. バトルフェイズ
    this.renderer.renderEvent("phase_start", { phase: "バトル" });
    const finalBattleResult = await this.board.phaseBattle();

    this.renderer.showMessage(`[DEBUG] BattleResult: status=${finalBattleResult.status}, winner=${finalBattleResult.winner}, loser=${finalBattleResult.loser}, damage=${finalBattleResult.damage}`);

    // b. バトルの勝敗確定後 (BattleResultAfter) のスキル発動と効果適用
    if (humanPlayer.skillChosenForTurn && CHEAT_SKILLS[humanPlayer.skillChosenForTurn] === SkillTiming.BATTLE_RESULT_AFTER) {
      this.renderer.showMessage(`[DEBUG] Human skill '${humanPlayer.skillChosenForTurn}' chosen. Checking activation.`);
      if (humanPlayer.skillChosenForTurn === "矛" && finalBattleResult.winner === humanPlayer.name) {
        finalBattleResult.damage += 1;
        const message = this.renderer.builder.build('skill_activate_spear', { name: humanPlayer.name });
        this.renderer.showMessage(message);
        await this.humanInputProvider.showSkillNotification(message); // モーダルで通知
        this.renderer.showMessage(`[DEBUG] '矛' activated. New damage: ${finalBattleResult.damage}`);
      } else if (humanPlayer.skillChosenForTurn === "盾" && finalBattleResult.loser === humanPlayer.name) {
        finalBattleResult.damage = Math.max(0, finalBattleResult.damage - 1);
        const message = this.renderer.builder.build('skill_activate_shield', { name: humanPlayer.name });
        this.renderer.showMessage(message);
        await this.humanInputProvider.showSkillNotification(message); // モーダルで通知
        this.renderer.showMessage(`[DEBUG] '盾' activated. New damage: ${finalBattleResult.damage}`);
      } else {
        this.renderer.showMessage(`[DEBUG] Human skill '${humanPlayer.skillChosenForTurn}' did not activate based on conditions.`);
      }
      humanPlayer.skillChosenForTurn = null; // スキルは使用済みとして消費
    }
    
    // ダメージ適用
    this.renderer.showMessage(`[DEBUG] Applying damage phase. Current Human Life: ${humanPlayer.life}, CPU Life: ${cpuPlayer.life}`);
    if (finalBattleResult.loser && finalBattleResult.damage > 0) {
        const loser = finalBattleResult.loser === humanPlayer.name ? humanPlayer : cpuPlayer;
        this.renderer.showMessage(`[DEBUG] ${loser.name} will take ${finalBattleResult.damage} damage.`);
        loser.life -= finalBattleResult.damage;
        this.renderer.showMessage(`[DEBUG] ${loser.name} new life: ${loser.life}`);
    } else {
        this.renderer.showMessage(`[DEBUG] No damage applied. Loser: ${finalBattleResult.loser}, Damage: ${finalBattleResult.damage}`);
    }

    // ライフ損失に応じたスキル札獲得
    const lifeLostHuman = initialHumanLife - humanPlayer.life;
    for (let i = 0; i < lifeLostHuman; i++) {
      humanPlayer.gainRandomSkill();
    }
    const lifeLostCpu = initialCpuLife - cpuPlayer.life;
    for (let i = 0; i < lifeLostCpu; i++) {
      cpuPlayer.gainRandomSkill();
    }

    // 最終的なバトル結果を表示
    await humanPlayer.showBattleResult(finalBattleResult, humanPlayer, cpuPlayer);

    // 5. ターン終了フェイズ
    this.renderer.renderEvent("phase_start", { phase: "ターン終了" });
  }

  async endGame() {
    const winner = this.board.judgeGame();
    let title;
    let message;

    if (winner === 'you') {
      this.renderer.renderEvent("game_over_win", { winner: winner });
      title = "ゲーム終了！勝利！";
      message = "🏆 **あなたの勝利**です！おめでとうございます！";
    } else if (winner === 'CPU') {
      this.renderer.renderEvent("game_over_lose", { winner: winner });
      title = "ゲーム終了！敗北...";
      message = "💀 **CPUの勝利**です。残念ですが、次の挑戦をお待ちしています！";
    } else {
      this.renderer.renderEvent("game_draw");
      title = "ゲーム終了！引き分け！";
      message = "🤝 **引き分け**でした！ナイスゲーム！";
    }

    const humanPlayer = this.board.players.find(p => !p.isAi);

    if (humanPlayer) {
      await (humanPlayer.provider as HumanInputProvider).showEndGame(title, message);
    } else {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}