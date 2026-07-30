import React from "react";
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from "remotion";
import {COLORS, FONTS, mulberry32} from "../theme";

const DURATION = 90;
const SIZE = 500;
const LOCAL_CENTER = 250;
const clamp = {extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const};
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

const phase = (frame: number, from: number, to: number, easing = easeOut) =>
  interpolate(frame, [from, to], [0, 1], {...clamp, easing});

const outerPoints = [
  [250, 18], [358, 46], [449, 126], [482, 238], [448, 358], [348, 452],
  [224, 482], [108, 442], [24, 344], [18, 218], [72, 102], [166, 40],
] as const;

const networkNodes = Array.from({length: 18}, (_, i) => {
  const rand = mulberry32(9901 + i * 733);
  return {x: 80 + rand() * 1760, y: 100 + rand() * 860, phase: rand() * Math.PI * 2, opacity: 0.03 + rand() * 0.09};
});

export const BrandLockup: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeToBlack = 1 - phase(frame, 80, 89, easeInOut);
  return (
    <AbsoluteFill style={{overflow: "hidden", background: `radial-gradient(ellipse at 36% 50%, #111824 0%, ${COLORS.bgBase} 34%, ${COLORS.bgDeep} 72%, #02040A 100%)`, color: COLORS.textPrimary, fontFamily: FONTS.zh}}>
      <AbsoluteFill style={{opacity: fadeToBlack}}>
        <Background frame={frame} />
        <BrandMark frame={frame} />
        <BrandCopy frame={frame} />
        <AbsoluteFill style={{pointerEvents: "none", background: "radial-gradient(ellipse at 38% 50%, transparent 40%, rgba(1,3,9,.24) 74%, rgba(0,0,0,.66) 100%)"}} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: "#000", opacity: 1 - fadeToBlack, pointerEvents: "none"}} />
    </AbsoluteFill>
  );
};

const Background: React.FC<{frame: number}> = ({frame}) => {
  const settle = phase(frame, 20, 48, easeInOut);
  return (
    <AbsoluteFill>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{position: "absolute", inset: 0, opacity: 0.18 * settle}}>
        {networkNodes.map((node, i) => {
          if (i === 0) return null;
          const previous = networkNodes[(i * 7) % networkNodes.length];
          return <line key={i} x1={node.x} y1={node.y} x2={previous.x} y2={previous.y} stroke={i % 4 === 0 ? COLORS.warmGold : COLORS.cyan} strokeWidth="0.7" opacity={i % 4 === 0 ? 0.2 : 0.12} />;
        })}
      </svg>
      {networkNodes.map((node, i) => <div key={i} style={{position: "absolute", left: node.x + Math.cos(frame / 37 + node.phase) * 4, top: node.y + Math.sin(frame / 43 + node.phase) * 3, width: i % 6 === 0 ? 3 : 1, height: i % 6 === 0 ? 3 : 1, background: i % 4 === 0 ? COLORS.warmGold : COLORS.cyan, opacity: node.opacity * settle, boxShadow: i % 6 === 0 ? `0 0 6px ${i % 4 === 0 ? COLORS.warmGold : COLORS.cyan}` : "none"}} />)}
      <div style={{position: "absolute", left: 90, right: 90, top: 540, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,183,77,.12), rgba(0,229,255,.09), transparent)", opacity: settle}} />
    </AbsoluteFill>
  );
};

const BrandMark: React.FC<{frame: number}> = ({frame}) => {
  const settle = phase(frame, 0, 28, easeInOut);
  const x = interpolate(settle, [0, 1], [1230, 470], clamp);
  const y = interpolate(settle, [0, 1], [520, 520], clamp);
  const scale = interpolate(settle, [0, 0.78, 1], [1.01, 0.56, 0.58], clamp);
  const yaw = interpolate(frame, [0, 28, 80], [-23, -12, -8], {...clamp, easing: easeInOut});
  const breath = frame > 42 ? 1 + Math.sin((frame - 42) / 9) * 0.008 : 1;
  return (
    <div style={{position: "absolute", left: x, top: y, width: SIZE, height: SIZE, transform: `translate(-50%, -50%) perspective(1200px) rotateY(${yaw}deg) scale(${scale * breath})`, transformStyle: "preserve-3d"}}>
      <svg width={SIZE} height={SIZE} viewBox="0 0 500 500" style={{overflow: "visible"}}>
        <defs>
          {outerPoints.map((_, i) => <linearGradient key={i} id={`brand-facet-${i}`} x1={i % 2 ? "0" : "1"} y1="0" x2={i % 2 ? "1" : "0"} y2="1"><stop offset="0" stopColor={i % 3 === 0 ? "#5D3D1D" : "#1B1A1A"} /><stop offset="0.38" stopColor="#08090D" /><stop offset="0.52" stopColor={i % 2 === 0 ? "#E2A34E" : "#74502A"} /><stop offset="0.61" stopColor="#0A0B0F" /><stop offset="1" stopColor="#020306" /></linearGradient>)}
          <radialGradient id="brand-core" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#FFD9A0" stopOpacity="0.84" /><stop offset="0.3" stopColor="#FFB74D" stopOpacity="0.38" /><stop offset="1" stopColor="#020306" stopOpacity="0" /></radialGradient>
        </defs>
        <circle cx="250" cy="250" r="110" fill="url(#brand-core)" opacity="0.54" />
        {outerPoints.map((point, i) => {
          const next = outerPoints[(i + 1) % outerPoints.length];
          return <polygon key={i} points={`${LOCAL_CENTER},${LOCAL_CENTER} ${point[0]},${point[1]} ${next[0]},${next[1]}`} fill={`url(#brand-facet-${i})`} stroke="#87663D" strokeWidth="0.8" style={{filter: "drop-shadow(0 10px 18px rgba(0,0,0,.46))"}} />;
        })}
        <polygon points={outerPoints.map((point) => point.join(",")).join(" ")} fill="none" stroke="#A77A43" strokeWidth="1" opacity="0.7" />
      </svg>
      <div style={{position: "absolute", left: "50%", top: "50%", width: 66, height: 66, transform: "translate(-50%, -50%) rotate(45deg)", border: "1px solid rgba(255,217,160,.8)", boxShadow: "0 0 14px rgba(255,183,77,.28)"}} />
    </div>
  );
};

const BrandCopy: React.FC<{frame: number}> = ({frame}) => {
  const titleIn = phase(frame, 18, 36);
  const subtitleIn = phase(frame, 30, 48);
  const ctaIn = phase(frame, 42, 60);
  const tagsIn = phase(frame, 54, 70);
  return (
    <div style={{position: "absolute", left: 760, top: 316, width: 990}}>
      <div style={{display: "flex", alignItems: "center", gap: 16, opacity: titleIn, fontFamily: FONTS.mono, fontSize: 13, color: COLORS.warmGold, letterSpacing: 0}}>
        <span style={{width: 7, height: 7, background: COLORS.warmGold, boxShadow: `0 0 8px ${COLORS.warmGold}`}} />
        SECOND BRAIN / SKILL ECOSYSTEM
      </div>
      <div style={{marginTop: 28, fontSize: 70, lineHeight: 1.12, fontWeight: 820, clipPath: `inset(0 ${100 - titleIn * 100}% 0 0)`, opacity: titleIn}}>第二大脑 · Skill 生态</div>
      <div style={{marginTop: 26, fontSize: 27, color: COLORS.textSecondary, opacity: subtitleIn, transform: `translateY(${interpolate(subtitleIn, [0, 1], [12, 0], clamp)}px)`}}>AI Agent 驱动的个人知识工作流系统</div>
      <div style={{marginTop: 68, display: "flex", alignItems: "center", gap: 22, opacity: ctaIn}}>
        <span style={{width: interpolate(ctaIn, [0, 1], [0, 130], clamp), height: 1, background: `linear-gradient(90deg, ${COLORS.warmGold}, transparent)`}} />
        <span style={{fontSize: 30, fontWeight: 720}}>让知识，从收藏走向<span style={{color: COLORS.warmCore}}>创造</span></span>
      </div>
      <div style={{marginTop: 46, fontFamily: FONTS.mono, fontSize: 13, color: COLORS.cyan, opacity: tagsIn, letterSpacing: 0}}>OBSIDIAN / MARKDOWN / AGENT-NATIVE</div>
    </div>
  );
};
