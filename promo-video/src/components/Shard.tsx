import React from "react";
import { COLORS, mulberry32 } from "../theme";

/**
 * 可复用信息碎片（镜头1/2/3 共用同一套视觉语言）
 * 多种形态：文本卡 / 带图卡 / 链接卡 / 代码卡 / 语音条
 * 冷色调各异 + 青色发光描边，像悬浮的数据卡片
 */

export type ShardKind = "text" | "image" | "link" | "code" | "voice";

export interface ShardSeed {
  kind: ShardKind;
  hue: string; // 主色（冷色系）
  glow: string; // 发光描边色
  angle: number;
  dist: number;
  finalX: number;
  finalY: number;
  rot: number;
  w: number;
  h: number;
  depth: number;
  delay: number;
  hasNotif: boolean;
  phase: number;
}

const KINDS: ShardKind[] = ["text", "image", "link", "code", "voice"];

// 冷色板（保持痛点冷峻，但有层次）
const PALETTE = [
  { hue: "#2E3A66", glow: COLORS.cyan }, // 蓝
  { hue: "#3A2E5C", glow: "#8B7CFF" }, // 紫
  { hue: "#1E4450", glow: COLORS.cyanSoft }, // 青
  { hue: "#2A3A55", glow: "#4FC3F7" }, // 浅蓝
  { hue: "#33355A", glow: "#7C9CFF" }, // 靛
];

export function makeShardSeed(index: number): ShardSeed {
  const rand = mulberry32(index * 137 + 11);
  const kind = KINDS[Math.floor(rand() * KINDS.length)];
  const pal = PALETTE[Math.floor(rand() * PALETTE.length)];
  const spread = 1 - rand() * 0.55;
  const w = 130 + rand() * 120;
  return {
    kind,
    hue: pal.hue,
    glow: pal.glow,
    angle: rand() * Math.PI * 2,
    dist: 750 + rand() * 550,
    finalX: (rand() - 0.5) * 1500 * spread,
    finalY: (rand() - 0.5) * 880 * spread,
    rot: (rand() - 0.5) * 70,
    w,
    h: kind === "voice" ? 56 : w * (0.55 + rand() * 0.35),
    depth: 0.6 + rand() * 0.7,
    delay: index * 1.6,
    hasNotif: rand() > 0.6,
    phase: rand() * Math.PI * 2,
  };
}

const line = (w: number, h: number, color: string, mb: number) => (
  <div
    style={{
      width: `${w * 100}%`,
      height: h,
      borderRadius: h / 2,
      background: color,
      marginBottom: mb,
    }}
  />
);

export const ShardCard: React.FC<{
  seed: ShardSeed;
  x: number;
  y: number;
  rot: number;
  scale: number;
  opacity: number;
  gray?: number; // 0-1 失活变灰程度
}> = ({ seed, x, y, rot, scale, opacity, gray = 0 }) => {
  if (opacity <= 0.01) return null;
  const { kind, hue, glow, w, h, hasNotif } = seed;
  const dead = gray > 0.4;
  const glowCol = dead ? "#2A2D3A" : glow;
  const lineCol = dead ? "#3A3D4A" : "#8A94C4";
  const notifColor = dead ? "#5A3540" : "#FF3B5C";

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: w,
        height: h,
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rot}deg) scale(${scale})`,
        opacity,
        background: `linear-gradient(135deg, ${hue} 0%, ${COLORS.bgPanel} 130%)`,
        borderRadius: 10,
        border: `1.5px solid ${glowCol}${dead ? "33" : "88"}`,
        boxShadow: dead
          ? "0 4px 14px rgba(0,0,0,0.5)"
          : `0 0 ${14 * (1 - gray)}px ${glowCol}44, 0 6px 20px rgba(0,0,0,0.55), inset 0 1px 0 ${glowCol}33`,
        padding: 10,
        overflow: "hidden",
        filter: gray > 0 ? `grayscale(${gray}) brightness(${1 - gray * 0.25})` : undefined,
      }}
    >
      {/* 顶部高光条（玻璃感） */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${glowCol}${dead ? "22" : "aa"}, transparent)`,
        }}
      />

      {/* 各形态内部结构 */}
      {kind === "text" && (
        <>
          {line(0.6, 8, lineCol, 7)}
          {line(0.92, 5, lineCol + "88", 5)}
          {line(0.75, 5, lineCol + "88", 5)}
          {line(0.85, 5, lineCol + "88", 0)}
        </>
      )}

      {kind === "image" && (
        <>
          <div
            style={{
              width: "100%",
              height: h * 0.5,
              borderRadius: 6,
              background: `linear-gradient(120deg, ${glowCol}${dead ? "22" : "55"}, ${hue})`,
              marginBottom: 7,
            }}
          />
          {line(0.7, 6, lineCol, 5)}
          {line(0.5, 5, lineCol + "88", 0)}
        </>
      )}

      {kind === "link" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 4,
                background: glowCol + (dead ? "33" : "cc"),
                flexShrink: 0,
              }}
            />
            {line(0.55, 7, lineCol, 0)}
          </div>
          {line(0.9, 5, lineCol + "77", 5)}
          {line(0.65, 5, lineCol + "77", 0)}
        </>
      )}

      {kind === "code" && (
        <div style={{ fontFamily: "monospace", fontSize: 9, lineHeight: 1.7 }}>
          {[0.5, 0.8, 0.65, 0.75].map((lw, i) => (
            <div
              key={i}
              style={{
                width: `${lw * 100}%`,
                height: 5,
                borderRadius: 2,
                marginLeft: i % 2 === 1 ? 12 : 0,
                background: i === 0 ? glowCol + (dead ? "44" : "bb") : lineCol + "77",
                marginBottom: 5,
              }}
            />
          ))}
        </div>
      )}

      {kind === "voice" && (
        <div style={{ display: "flex", alignItems: "center", gap: 3, height: "100%" }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: glowCol + (dead ? "33" : "cc"),
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              color: COLORS.bgBase,
            }}
          >
            ▶
          </div>
          {Array.from({ length: 12 }, (_, i) => {
            const bh = 6 + Math.abs(Math.sin(i * 1.3 + seed.phase)) * 16;
            return (
              <div
                key={i}
                style={{
                  width: 3,
                  height: bh,
                  borderRadius: 2,
                  background: lineCol + "aa",
                }}
              />
            );
          })}
        </div>
      )}

      {/* 未读红点 */}
      {hasNotif && (
        <div
          style={{
            position: "absolute",
            top: -5,
            right: -5,
            width: 17,
            height: 17,
            borderRadius: "50%",
            background: notifColor,
            boxShadow: dead ? "none" : `0 0 12px ${notifColor}`,
            border: "2px solid " + COLORS.bgBase,
          }}
        />
      )}
    </div>
  );
};
