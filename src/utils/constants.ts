// =================================================================
// 0. グローバル定数とユーティリティ
// =================================================================
export const HANDS = ["グー", "パー", "チョキ"];
export const HAND_EMOJIS: { [key: string]: string } = { "グー": "✊", "パー": "✋", "チョキ": "✌️" };

export enum GamePhase {
  INITIAL = 'initial',
  VOTE = 'vote',
  SETUP = 'setup', // ブラフ宣言等の準備フェーズ
  DRAW = 'draw',
  PREP = 'prep', // 仕込み（ブラフ宣言）
  BATTLE = 'battle',
  TURN_END = 'turn_end',
  END_GAME = 'end_game',
}

export enum SkillTiming {
  PREP_PHASE_END = 'prep_phase_end',     // 仕込みフェイズ終了後すぐ
  BATTLE_RESULT_AFTER = 'battle_result_after', // バトルの勝敗確定後
  NEXT_TURN_START = 'next_turn_start',   // 次ターンの開始時
}

export const CHEAT_SKILLS: { [key: string]: SkillTiming } = {
  "矛": SkillTiming.BATTLE_RESULT_AFTER,
  "盾": SkillTiming.BATTLE_RESULT_AFTER,
};

export const ALL_SKILLS = Object.keys(CHEAT_SKILLS); // NEW: 利用可能な全てのスキルリスト