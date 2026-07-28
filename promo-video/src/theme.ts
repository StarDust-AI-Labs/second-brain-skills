/**
 * 设计 Tokens —— 第二大脑 SKILL 宣传片
 * 风格：赛博科技 + 暖芯冷边能量大脑（方案C：金青双色平衡）
 * 来源：从第二大脑概念海报提取，全片统一复用
 */

export const COLORS = {
  // 背景：深空蓝黑
  bgDeep: "#070A1A",
  bgBase: "#0A0E27",
  bgPanel: "#11162E",

  // 能量主光：暖金 → 暖橙渐变（大脑光核 / 宝石 / 升华）
  warmCore: "#FFD9A0",
  warmGold: "#FFB74D",
  warmAmber: "#FF8A65",
  warmDeep: "#F2672E",

  // 青光：神经网络连线 / 辅助光晕 / 科技感
  cyan: "#00E5FF",
  cyanSoft: "#5CE1E6",
  cyanDim: "#1B6E7E",

  // 文字
  textPrimary: "#F2F5FF",
  textSecondary: "#9AA5CE",
  textDim: "#5A648C",

  // 碎片（痛点段）：冷灰调，无生命力
  shard: "#3A4266",
  shardDim: "#262C47",
} as const;

export const FONTS = {
  // 中文粗黑做标题，英文窄体做点缀
  zh: "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  en: "'Cinzel', 'Didot', 'Times New Roman', serif",
  mono: "'JetBrains Mono', 'Courier New', monospace",
} as const;

// 动效性格 tokens：活力大胆（startup/科技感）
// 参考 pipeline 预设：主时长 ~18f，入场 bezier(0.16,1,0.3,1)，带过冲
export const MOTION = {
  enterMs: 600,
  overshoot: 1.12,
  easingOut: [0.16, 1, 0.3, 1] as const,
  easingInOut: [0.4, 0, 0.2, 1] as const,
} as const;

// 确定性伪随机（铁律：禁 Math.random）
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
