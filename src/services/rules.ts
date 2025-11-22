import { Player } from './gameLogic'; // Playerクラスをインポート

// =================================================================
// 1. ルールと結果 (Rules and Results)
// =================================================================

export class BattleResult {
    status: string;
    winner: string | null;
    loser: string | null;
    damage: number;
    declared: string | null;
    cardA: string | null;
    cardB: string | null;

    constructor(status: string, winner: string | null = null, loser: string | null = null, damage: number = 0, declared: string | null = null, cardA: string | null = null, cardB: string | null = null) {
        this.status = status;
        this.winner = winner;
        this.loser = loser;
        this.damage = damage;
        this.declared = declared;
        this.cardA = cardA;
        this.cardB = cardB;
    }
}

export class BluffRule {
    judgeDamage(cardA: string, cardB: string, playerA: Player, playerB: Player): BattleResult {
        if (cardA === cardB) { return new BattleResult("battle_draw", null, null, 0, null, cardA, cardB); }

        const winMap: { [key: string]: string } = { "グー": "チョキ", "チョキ": "パー", "パー": "グー" };
        const players = [{ p: playerA, c: cardA, o: playerB, oc: cardB }, { p: playerB, c: cardB, o: playerA, oc: cardA }];

        for (const { p, c, o, oc } of players) {
            if (p.bluffDeclared) {
                // ブラフ成功条件: 宣言した手を実際に出し、それで勝つ
                if (p.bluffDeclared === c && winMap[c] === oc) {
                    return new BattleResult("bluff_success", p.name, o.name, 2, p.bluffDeclared, cardA, cardB);
                }
                // ブラフ失敗条件: 宣言した手以外を出して負ける
                if (p.bluffDeclared !== c && winMap[oc] === c) {
                    // 敗者はブラフ宣言した p
                    return new BattleResult("bluff_fail", o.name, p.name, 2, p.bluffDeclared, cardA, cardB);
                }
            }
        }

        // ブラフ条件を満たさなければ通常判定
        if (winMap[cardA] === cardB) {
            return new BattleResult("battle_win", playerA.name, playerB.name, 1, null, cardA, cardB);
        } else {
            return new BattleResult("battle_win", playerB.name, playerA.name, 1, null, cardA, cardB);
        }
    }
}
