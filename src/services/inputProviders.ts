import { HANDS, HAND_EMOJIS } from '../utils/constants';
import { GameMaster, Player } from './gameLogic';
import { BattleResult } from './rules';

// InputProviderの抽象クラス（またはインターフェース）は省略し、具体的な実装を直接定義します

// MODIFIED: onPrepActionRequested now resolves with 'bluff', 'skill', or 'complete'
export type PrepActionChoice = 'bluff' | 'skill' | 'complete';

export type HumanInputCallbacks = {
    onVoteRequested: (player: Player) => Promise<string>;
    // MODIFIED: onPrepActionRequested now resolves with 'bluff', 'skill', or 'complete'
    onPrepActionRequested: (player: Player, canDeclareBluff: boolean, canUseSkill: boolean) => Promise<PrepActionChoice>;
    
    // NEW: Specific resolvers for different input types
    onBluffChoiceRequested: (player: Player, canDeclareBluff: boolean, humanHand: string[]) => Promise<string | null>;
    onSkillChoiceRequested: (player: Player, canUseSkill: boolean, humanSkillHand: string[]) => Promise<string | null>;

    onBluffDeclareRequested: (player: Player) => Promise<string | null>; // Kept for compatibility, though onBluffChoiceRequested will be primary
    onCardChooseRequested: (player: Player, cpuPlayer: Player, wasPreviousBattleDraw: boolean) => Promise<number>;
    onSkillChooseRequested: (player: Player) => Promise<string | null>; // Kept for compatibility, though onSkillChoiceRequested will be primary
    onShowBattleResultRequested: (result: BattleResult, human: Player, cpu: Player) => Promise<void>;
    onShowEndGameRequested: (title: string, message: string) => Promise<void>;
    onShowSkillNotificationRequested: (message: string) => Promise<void>; // New callback
}

export class HumanInputProvider {
    // MODIFIED: prepActionInputResolver resolves with 'bluff', 'skill', or 'complete'
    prepActionInputResolver: ((value: PrepActionChoice) => void) | null = null;
    
    // NEW: Specific resolvers for different input types
    voteInputResolver: ((value: string) => void) | null = null;
    bluffInputResolver: ((value: string | null) => void) | null = null;
    skillInputResolver: ((value: string | null) => void) | null = null;
    cardInputResolver: ((value: number) => void) | null = null;
    battleResultAcknowledgedResolver: ((value: 'ok') => void) | null = null;
    endGameAcknowledgedResolver: ((value: 'end') => void) | null = null;
    skillNotificationResolver: ((value: 'ok') => void) | null = null;

    private gameMaster: GameMaster | null = null;
    private callbacks: HumanInputCallbacks | null = null;

    setGameMaster(gameMaster: GameMaster) {
        this.gameMaster = gameMaster;
    }

    setCallbacks(callbacks: HumanInputCallbacks) {
        this.callbacks = callbacks;
    }

    async chooseVote(player: Player): Promise<string> {
        if (!this.callbacks?.onVoteRequested) {
            console.error("onVoteRequested callback not set.");
            return HANDS[0]; // Fallback
        }
        const choice = await this.callbacks.onVoteRequested(player);
        this.gameMaster?.renderer.showMessage(this.gameMaster.renderer.builder.build('player_vote', { name: player.name, vote: choice }));
        return choice;
    }

    // MODIFIED: choosePrepAction now returns PrepActionChoice
    async choosePrepAction(player: Player, canDeclareBluff: boolean, canUseSkill: boolean): Promise<PrepActionChoice> {
        if (!this.callbacks?.onPrepActionRequested) {
            console.error("onPrepActionRequested callback not set.");
            return 'complete'; // Fallback to complete
        }
        const choice = await this.callbacks.onPrepActionRequested(player, canDeclareBluff, canUseSkill);
        return choice;
    }

    // MODIFIED: maybeDeclare now directly interacts with bluffInputResolver via onBluffChoiceRequested
    async maybeDeclare(player: Player, canDeclareBlbluff: boolean): Promise<string | null> {
        if (!this.callbacks?.onBluffChoiceRequested) { // Use new callback
            console.error("onBluffChoiceRequested callback not set.");
            return null; // Fallback
        }
        // UIにブラフ選択を促し、解決されるのを待つ
        const choice = await this.callbacks.onBluffChoiceRequested(player, canDeclareBlbluff, player.hand);
        return choice;
    }

    // MODIFIED: chooseSkill now directly interacts with skillInputResolver via onSkillChoiceRequested
    async chooseSkill(player: Player, canUseSkill: boolean): Promise<string | null> {
        if (!this.callbacks?.onSkillChoiceRequested) { // Use new callback
            console.error("onSkillChoiceRequested callback not set.");
            return null; // Fallback
        }
        // UIにスキル選択を促し、解決されるのを待つ
        const choice = await this.callbacks.onSkillChoiceRequested(player, canUseSkill, player.skillHand);
        return choice;
    }

    async chooseCard(player: Player, cpuPlayer: Player, wasPreviousBattleDraw: boolean): Promise<number> {
        if (!this.callbacks?.onCardChooseRequested) {
            console.error("onCardChooseRequested callback not set.");
            return 0; // Fallback
        }
        const index = await this.callbacks.onCardChooseRequested(player, cpuPlayer, wasPreviousBattleDraw);
        return index;
    }

    async showResult(title: string, logMessage: string, resultStatus: string, result: BattleResult, human: Player, cpu: Player): Promise<void> {
        if (!this.callbacks?.onShowBattleResultRequested) {
            console.error("onShowBattleResultRequested callback not set.");
            await new Promise(r => setTimeout(r, 1500)); // Simulate delay
            return;
        }
        await this.callbacks.onShowBattleResultRequested(result, human, cpu);
    }

    async showEndGame(title: string, message: string): Promise<void> {
        if (!this.callbacks?.onShowEndGameRequested) {
            console.error("onShowEndGameRequested callback not set.");
            await new Promise(r => setTimeout(r, 1000)); // Simulate delay
            return;
        }
        await this.callbacks.onShowEndGameRequested(title, message);
    }

    async showSkillNotification(message: string): Promise<void> { // New method
      if (!this.callbacks?.onShowSkillNotificationRequested) {
        console.error("onShowSkillNotificationRequested callback not set.");
        await new Promise(r => setTimeout(r, 1000)); // Simulate delay
        return;
      }
      await this.callbacks.onShowSkillNotificationRequested(message);
    }
}

export class AIInputProvider {
    gameMaster: GameMaster | null = null; // GameMasterインスタンスへの参照を追加

    setGameMaster(gameMaster: GameMaster) {
        this.gameMaster = gameMaster;
    }

    async chooseVote(player: Player): Promise<string> {
        const hand = HANDS[Math.floor(Math.random() * HANDS.length)];
        await new Promise(r => setTimeout(r, 500));
        this.gameMaster?.renderer.showMessage(`[AI_${player.name}] の選択: ${HAND_EMOJIS[hand]}`);
        return hand;
    }
    async showResult(): Promise<void> { await new Promise(r => setTimeout(r, 1500)); }
    async showEndGame(): Promise<void> { await new Promise(r => setTimeout(r, 1000)); }

    // MODIFIED: choosePrepAction for AI now returns PrepActionChoice
    async choosePrepAction(player: Player, canDeclareBluff: boolean, canUseSkill: boolean): Promise<PrepActionChoice> {
        await new Promise(r => setTimeout(r, 500)); // Simulate thinking

        // AIの行動は一度きりの決定ではなく、選択画面への遷移を指示するため、常に'bluff' or 'skill' or 'complete'を返す
        // GameMasterのループ内で、AIも同様に現在の状態に基づいて動的に判断する
        const opponent = this.gameMaster?.board.players.find(p => p.name !== player.name);
        const playerIsLosingLife = player.life < (opponent?.life || player.life + 1);

        // まずブラフを検討
        if (canDeclareBluff && playerIsLosingLife && Math.random() < 0.7) {
            this.gameMaster?.renderer.showMessage(`[AI_${player.name}] はブラフを検討します。`);
            return 'bluff';
        }

        // 次にスキルを検討 (スキルが手札にあり、まだ選択していない場合)
        if (canUseSkill && player.skillChosenForTurn === null && Math.random() < 0.5) { // 50% chance to use skill if available and not already chosen
            this.gameMaster?.renderer.showMessage(`[AI_${player.name}] はイカサマを検討します。`);
            return 'skill';
        }

        this.gameMaster?.renderer.showMessage(`[AI_${player.name}] は仕込みフェイズを完了します。`);
        return 'complete';
    }

    // MODIFIED: maybeDeclare now takes canDeclareBluff
    async maybeDeclare(player: Player, canDeclareBlbluff: boolean): Promise<string | null> {
        await new Promise(r => setTimeout(r, 500));
        if (canDeclareBlbluff) {
            const opponent = this.gameMaster?.board.players.find(p => p.name !== player.name);
            const playerIsLosingLife = player.life < (opponent?.life || player.life + 1);
            if (playerIsLosingLife && Math.random() < 0.7) { // CPUは70%の確率でブラフを宣言
                const declaredHand = HANDS[Math.floor(Math.random() * HANDS.length)];
                this.gameMaster?.renderer.showMessage(
                    this.gameMaster?.renderer.builder.build('cpu_declare_public_log', { declared: declaredHand }) || ''
                );
                return declaredHand;
            }
        }
        this.gameMaster?.renderer.showMessage(`[AI_${player.name}] はブラフを宣言しません。`);
        return null;
    }

    // MODIFIED: chooseSkill now takes canUseSkill
    async chooseSkill(player: Player, canUseSkill: boolean): Promise<string | null> {
        await new Promise(r => setTimeout(r, 500));
        if (canUseSkill) { // canUseSkill は手札にスキルがあるかどうかを示す
            // AIはここで具体的なスキル選択を行う
            if (player.skillHand.length > 0 && Math.random() < 0.7) { // 70%の確率でスキルを使用
                const skillToUse = player.skillHand[Math.floor(Math.random() * player.skillHand.length)];
                this.gameMaster?.renderer.showMessage(`[AI_${player.name}] はイカサマ「**${skillToUse}**」を使用します。`);
                return skillToUse;
            }
        }
        this.gameMaster?.renderer.showMessage(`[AI_${player.name}] はイカサマを使用しません。`);
        return null;
    }

    async chooseCard(player: Player, opponent: Player, wasPreviousBattleDraw: boolean = false): Promise<number> {
        if (!player.hand.length) return 0; // 手札がなければ0を返す（本来はありえない）

        let chosenIndex = Math.floor(Math.random() * player.hand.length);

        // CPUのブラフ宣言があった場合、勝てる手があれば優先する（簡易AI）
        if (opponent.bluffDeclared) {
            const winMap: { [key: string]: string } = { "グー": "チョキ", "チョキ": "パー", "パー": "グー" };
            const counterHand = winMap[opponent.bluffDeclared];
            const winningCardIndex = player.hand.findIndex(card => card === counterHand);
            if (winningCardIndex !== -1) {
                chosenIndex = winningCardIndex;
            }
        }
        // 自分のブラフ宣言があった場合、宣言した手を出せるなら優先する
        else if (player.bluffDeclared) {
            const declaredCardIndex = player.hand.findIndex(card => card === player.bluffDeclared);
            if (declaredCardIndex !== -1) {
                chosenIndex = declaredCardIndex;
            }
        }


        await new Promise(r => setTimeout(r, 500));
        this.gameMaster?.renderer.showMessage(`[AI_${player.name}] は ${chosenIndex + 1}番目 (${HAND_EMOJIS[player.hand[chosenIndex]]}) を選択`);
        return chosenIndex;
    }
}