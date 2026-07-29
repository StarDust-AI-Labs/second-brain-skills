import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, mulberry32 } from "../theme";

/**
 * HUD 组件库 —— 全片复用的界面骨架
 * 铁律：1px 细线 / 单色青光 / 网格对齐 / 不做大面积光晕
 */

/** 四角取景括弧框 + 刻度 */
export const HudFrame: React.FC<{ inset?: number; opacity?: number }> = ({
  inset = 48,
  opacity = 0.55,
}) => {
  const L = 26; // 括弧臂长
  const c = COLORS.cyan;
  const corner: React.CSSProperties = {
    position: "absolute",
    width: L,
    height: L,
    borderColor: c,
    borderStyle: "solid",
    borderWidth: 0,
  };
  return (
    <AbsoluteFill style={{ opacity, pointerEvents: "none" }}>
      {/* 四角 */}
      <div style={{ ...corner, left: inset, top: inset, borderLeftWidth: 1.5, borderTopWidth: 1.5 }} />
      <div style={{ ...corner, right: inset, top: inset, borderRightWidth: 1.5, borderTopWidth: 1.5 }} />
      <div style={{ ...corner, left: inset, bottom: inset, borderLeftWidth: 1.5, borderBottomWidth: 1.5 }} />
      <div style={{ ...corner, right: inset, bottom: inset, borderRightWidth: 1.5, borderBottomWidth: 1.5 }} />
      {/* 四边中点刻度 */}
      {(["top", "bottom"] as const).map((v) => (
        <div
          key={v}
          style={{
            position: "absolute",
            [v]: inset,
            left: "50%",
            width: 1.5,
            height: 8,
            background: c,
            transform: "translateX(-50%)",
          }}
        />
      ))}
      {(["left", "right"] as const).map((v) => (
        <div
          key={v}
          style={{
            position: "absolute",
            [v]: inset,
            top: "50%",
            height: 1.5,
            width: 8,
            background: c,
            transform: "translateY(-50%)",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

/** 扫描线纹理（最顶层，5% 透明） */
export const Scanlines: React.FC<{ opacity?: number }> = ({ opacity = 0.05 }) => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      opacity,
      background:
        "repeating-linear-gradient(0deg, rgba(0,229,255,0.6) 0px, rgba(0,229,255,0.6) 1px, transparent 1px, transparent 4px)",
      mixBlendMode: "overlay",
    }}
  />
);

/** 左上角界面标注：// SYS.LOG_01 */
export const HudTag: React.FC<{
  text: string;
  x?: number;
  y?: number;
  appear?: number; // 从第几帧开始打字
}> = ({ text, x = 64, y = 56, appear = 0 }) => {
  const frame = useCurrentFrame();
  const shown = Math.max(0, Math.floor((frame - appear) * 0.9));
  const typed = text.slice(0, shown);
  const cursorOn = Math.floor(frame / 8) % 2 === 0;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 18,
        letterSpacing: "0.18em",
        color: COLORS.cyan,
        opacity: 0.85,
        textTransform: "uppercase",
      }}
    >
      <span style={{ opacity: 0.6 }}>{"// "}</span>
      {typed}
      <span style={{ opacity: cursorOn ? 1 : 0 }}>▌</span>
    </div>
  );
};

/** 背景数据流：低速流动的字符列，制造「系统运转」生命感 */
export const DataStream: React.FC<{
  columns?: number;
  seed?: number;
  opacity?: number;
  speed?: number;
}> = ({ columns = 14, seed = 7, opacity = 0.08, speed = 30 }) => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const rand = mulberry32(seed);
  const cols = Array.from({ length: columns }, (_, i) => {
    const r = mulberry32(seed * 31 + i * 7);
    const x = (i + 0.5) * (100 / columns);
    const chars = "01<>[]{}#$%&*+=/\\|";
    const len = 14 + Math.floor(r() * 10);
    const offset = r() * 200;
    const drift = ((frame * speed) / 30 + offset) % 120;
    return { x, chars, len, drift, key: i };
  });
  return (
    <AbsoluteFill style={{ opacity, pointerEvents: "none", overflow: "hidden" }}>
      {cols.map((col) => (
        <div
          key={col.key}
          style={{
            position: "absolute",
            left: `${col.x}%`,
            top: -col.drift * 6,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            lineHeight: 1.9,
            color: COLORS.cyan,
            whiteSpace: "pre",
            textAlign: "center",
          }}
        >
          {Array.from({ length: col.len }, (_, j) => {
            const idx = Math.floor(
              mulberry32(col.key * 91 + j * 13 + Math.floor(frame / 6))() *
                col.chars.length
            );
            return (
              <div key={j} style={{ opacity: 1 - j / col.len }}>
                {col.chars[idx]}
              </div>
            );
          })}
        </div>
      ))}
    </AbsoluteFill>
  );
};

/** 1px 发光细线（横/纵） */
export const GlowLine: React.FC<{
  vertical?: boolean;
  length?: number | string;
  opacity?: number;
  color?: string;
}> = ({ vertical = false, length = "100%", opacity = 0.6, color = COLORS.cyan }) => (
  <div
    style={{
      width: vertical ? 1 : length,
      height: vertical ? length : 1,
      background: `linear-gradient(${vertical ? "180deg" : "90deg"}, transparent, ${color}, transparent)`,
      boxShadow: `0 0 6px ${color}66`,
      opacity,
    }}
  />
);

/** 故障 glitch：返回 {x,y,on}，on 为 true 的本帧应用位移 */
export function useGlitch(frame: number, windowStart: number, windowLen: number, seed = 3) {
  const inWin = frame >= windowStart && frame < windowStart + windowLen;
  const r = mulberry32(seed * 977 + Math.floor(frame / 2));
  const on = inWin && Math.floor(frame / 2) % 2 === 0;
  return {
    on,
    x: on ? (r() - 0.5) * 18 : 0,
    y: on ? (r() - 0.5) * 8 : 0,
    shift: on ? (r() - 0.5) * 6 : 0, // 色差
  };
}

/** 进入扫描：0-1 的进度，配合 clipPath 做「扫过点亮」 */
export function scanReveal(frame: number, start: number, dur: number) {
  return interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}
