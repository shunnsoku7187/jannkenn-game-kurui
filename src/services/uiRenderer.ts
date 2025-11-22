import { BattleResult } from './rules';
import { HAND_EMOJIS } from '../utils/constants';
import { GameMaster } from './gameLogic';

// =================================================================
// 2. メッセージ出力 (Renderer)
// =================================================================

export class MessageBuilder {
    templates: { [lang: string]: { [key: string]: string } };

    constructor() {
        this.templates = {
            "ja": {
                "phase_start": "--- [ {phase}フェイズ開始 ] ---",
                "battle_result_win": "**{cardA}** vs **{cardB}** (ターン勝敗)",
                "battle_draw": "👉 あいこ！ 続行",
                "battle_win": "✅ {winner}の勝利！<br>{loser} が {damage} ダメージ！",
                "bluff_success": "💥 {winner}はブラフ成功 ({declared})！<br>{loser} に {damage} ダメージ！",
                "bluff_fail": "💀 {loser}はブラフ失敗 ({declared})！<br>{loser} に {damage} ダメージ！（自傷）",
                "deck_out": "🃏 デッキ切れ！ 残りライフで勝敗を決定します。", // deck_draw から deck_out に変更
                "game_over_win": "🏆 ゲーム終了！ **あなたの勝利**！",
                "game_over_lose": "💀 ゲーム終了！ **あなたの敗北**！",
                "game_draw": "🤝 ゲーム終了！ 引き分け！",
                "result_header": "--- バトル結果 (ターン{turn}) ---",
                "life_status": "--- ライフ: You={you_life} | CPU={cpu_life} ---",
                "player_vote": "[{name}] が {vote} に投票しました。",
                "player_declare": "[{name}] が {declared} を宣言しました。",
                "player_play": "[{name}] は {card} をプレイしました。",
                "cpu_declare_public_log": "🔥 [CPU] が {declared} を宣言しました。",
                "player_skill_use_request": "[{name}] はイカサマの使用を検討しています。", // スキル使用要求メッセージ
                "player_skill_use": "[{name}] はイカサマ「**{skill}**」を使用します。", // プレイヤーのスキル使用メッセージ
                "player_skill_use_none": "[{name}] はイカサマを使用しません。", // NEW: プレイヤーが「使用しない」を選択したメッセージ
                "skill_activate_spear": "💥 [{name}] のイカサマ「**矛**」が発動！<br>与えるダメージが＋１されます！", // 矛スキル発動メッセージ
                "skill_activate_shield": "🛡️ [{name}] のイカサマ「**盾**」が発動！<br>受けるダメージが―１されます！", // 盾スキル発動メッセージ
                "player_gain_skill": "✨ [{name}] はライフ損失によりイカサマ「**{skill}**」を獲得しました。", // NEW: ライフ損失時のスキル獲得メッセージ
                "player_prep_action_request": "[{name}] は仕込みフェイズの行動を選択しています。", // New
                "player_prep_action": "[{name}] は「**{action}**」を選択しました。", // New
                "player_pass_prep": "[{name}] は仕込みフェイズを完了しました。", // New
                "player_bluff_selection_request": "[{name}] はブラフの内容を選択しています。", // NEW: Specific bluff selection message
                "player_skill_selection_request": "[{name}] はイカサマの内容を選択しています。", // NEW: Specific skill selection message
                "skill_returned_to_hand": "↩️ [{name}] は以前選択したイカサマ「**{skill}**」を手札に戻しました。", // NEW: 選択済みスキルが手札に戻されたメッセージ
            }
        };
    }

    replaceWithEmoji(text: string): string {
        return text
            .replace(/グー/g, HAND_EMOJIS["グー"])
            .replace(/パー/g, HAND_EMOJIS["パー"])
            .replace(/チョキ/g, HAND_EMOJIS["チョキ"]);
    }

    build(eventType: string, kwargs: { [key: string]: any }): string {
        let template = this.templates["ja"][eventType] || `[未定義イベント: ${eventType}]`;
        for (const key in kwargs) {
            template = template.replace(new RegExp(`{${key}}`, 'g'), kwargs[key] !== null && kwargs[key] !== undefined ? kwargs[key].toString() : '');
        }
        return this.replaceWithEmoji(template);
    }
}

export class Renderer {
    builder: MessageBuilder;
    gameMaster: GameMaster | null = null; // GameMasterへの参照を可能にする
    private addLogMessage: (message: string) => void;

    constructor(addLogMessage: (message: string) => void) {
        this.builder = new MessageBuilder();
        this.addLogMessage = addLogMessage;
    }

    _send(message: string) {
        this.addLogMessage(message);
    }

    // ReactのPlayerStatusコンポーネントが直接stateを購読するため、このメソッドは不要になる可能性が高い
    // updateStatus(board: Board) {
    //     // UIコンポーネントは直接ボードの状態を監視するため、ここではログ出力のみ
    // }

    renderEvent(event: string | BattleResult, kwargs: { [key: string]: any } = {}) {
        let eventType: string;
        if (event instanceof BattleResult) {
            eventType = event.status;
            kwargs = {
                winner: event.winner,
                loser: event.loser,
                damage: event.damage,
                declared: event.declared,
                cardA: event.cardA,
                cardB: event.cardB,
                ...kwargs
            };
        } else {
            eventType = event;
        }
        this._send(this.builder.build(eventType, kwargs));
    }

    showMessage(message: string) {
        this._send(message);
    }
}