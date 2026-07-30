import React from "react";
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from "remotion";
import {COLORS, FONTS, mulberry32} from "../theme";

const DURATION = 210;
const clamp = {extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const};
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

const phase = (frame: number, from: number, to: number, easing = easeOut) =>
  interpolate(frame, [from, to], [0, 1], {...clamp, easing});

const transactions = [
  {start: 16, command: "记一下：这个选题可以做成视频", label: "CAPTURE IDEA", y: 382},
  {start: 76, command: "保存这篇文章", label: "SAVE SOURCE", y: 562},
  {start: 136, command: "帮我写一个大纲", label: "CREATE OUTLINE", y: 742},
] as const;

const ambientNodes = Array.from({length: 28}, (_, i) => {
  const rand = mulberry32(7117 + i * 631);
  return {x: 80 + rand() * 1760, y: 80 + rand() * 900, opacity: 0.04 + rand() * 0.14, phase: rand() * Math.PI * 2};
});

const handoffNodes = [
  {x: 1110, y: 324, tx: 1325, ty: 415}, {x: 1270, y: 350, tx: 1390, ty: 350},
  {x: 1500, y: 410, tx: 1460, ty: 430}, {x: 1170, y: 548, tx: 1340, ty: 520},
  {x: 1440, y: 582, tx: 1450, ty: 550}, {x: 1180, y: 738, tx: 1320, ty: 640},
  {x: 1380, y: 784, tx: 1410, ty: 660}, {x: 1600, y: 720, tx: 1490, ty: 625},
] as const;

export const IntentToResults: React.FC = () => {
  const frame = useCurrentFrame();
  const handoff = phase(frame, 192, 209, easeInOut);
  const cameraScale = interpolate(frame, [0, 20, 190, DURATION - 1], [1.08, 1, 1.012, 1.055], {...clamp, easing: easeInOut});
  return (
    <AbsoluteFill style={{overflow: "hidden", background: `radial-gradient(ellipse at 68% 50%, #101A29 0%, ${COLORS.bgBase} 36%, ${COLORS.bgDeep} 74%, #02040A 100%)`, color: COLORS.textPrimary, fontFamily: FONTS.zh}}>
      <Background frame={frame} />
      <CarryFromShot04 frame={frame} />
      <AbsoluteFill style={{transform: `scale(${cameraScale})`, transformOrigin: "66% 52%"}}>
        <Narrative frame={frame} />
        <Conversation frame={frame} />
        <RoutingPaths frame={frame} />
        <VaultWorkspace frame={frame} handoff={handoff} />
      </AbsoluteFill>
      <Handoff frame={frame} progress={handoff} />
      <AbsoluteFill style={{pointerEvents: "none", background: "radial-gradient(ellipse at 64% 52%, transparent 48%, rgba(1,3,9,.28) 78%, rgba(0,0,0,.68) 100%)"}} />
    </AbsoluteFill>
  );
};

const Background: React.FC<{frame: number}> = ({frame}) => (
  <AbsoluteFill>
    {ambientNodes.map((node, i) => (
      <div key={i} style={{position: "absolute", left: node.x + Math.cos(frame / 43 + node.phase) * 5, top: node.y + Math.sin(frame / 51 + node.phase) * 4, width: i % 7 === 0 ? 2 : 1, height: i % 7 === 0 ? 2 : 1, background: i % 7 === 0 ? COLORS.textSecondary : COLORS.cyan, opacity: node.opacity, boxShadow: i % 7 === 0 ? "none" : `0 0 4px ${COLORS.cyan}`}} />
    ))}
    <div style={{position: "absolute", left: 794, top: 104, bottom: 100, width: 1, background: "linear-gradient(transparent, rgba(0,229,255,.2), transparent)"}} />
    <div style={{position: "absolute", left: 80, right: 80, bottom: 88, height: 1, background: "linear-gradient(90deg, transparent, rgba(38,54,74,.9), transparent)"}} />
  </AbsoluteFill>
);

const CarryFromShot04: React.FC<{frame: number}> = ({frame}) => {
  const settle = phase(frame, 0, 20, easeInOut);
  const fade = 1 - phase(frame, 12, 30, easeInOut);
  return (
    <div style={{position: "absolute", left: interpolate(settle, [0, 1], [1254, 1030], clamp), top: interpolate(settle, [0, 1], [200, 220], clamp), width: interpolate(settle, [0, 1], [666, 680], clamp), height: interpolate(settle, [0, 1], [516, 700], clamp), border: `1px solid ${COLORS.cyan}`, background: "rgba(5,9,16,.76)", opacity: fade, boxShadow: "0 0 28px rgba(0,229,255,.2)"}}>
      <div style={{position: "absolute", left: 32, top: 34, fontFamily: FONTS.mono, fontSize: 12, color: COLORS.cyan, letterSpacing: 0}}>VIDEO SCRIPT</div>
      <div style={{position: "absolute", left: 32, top: 78, fontSize: 34, fontWeight: 760}}>视频脚本</div>
    </div>
  );
};

const Narrative: React.FC<{frame: number}> = ({frame}) => {
  const titleIn = phase(frame, 12, 30);
  const supportIn = phase(frame, 34, 52);
  const dim = interpolate(frame, [192, 209], [1, 0.62], clamp);
  return (
    <div style={{position: "absolute", left: 112, top: 112, width: 620, opacity: dim}}>
      <div style={{width: interpolate(titleIn, [0, 1], [0, 150], clamp), height: 1, background: `linear-gradient(90deg, ${COLORS.cyan}, transparent)`}} />
      <div style={{marginTop: 28, fontSize: 58, lineHeight: 1.14, fontWeight: 800, clipPath: `inset(0 ${100 - titleIn * 100}% 0 0)`, opacity: titleIn}}>你只负责<br />表达意图。</div>
      <div style={{marginTop: 28, fontSize: 17, color: COLORS.textSecondary, opacity: supportIn}}>路由 · 提炼 · 关联 · 写入，由 Agent 完成</div>
    </div>
  );
};

const Conversation: React.FC<{frame: number}> = ({frame}) => (
  <div style={{position: "absolute", left: 112, top: 320, width: 620, height: 570}}>
    {transactions.map((transaction, i) => {
      const typedProgress = interpolate(frame, [transaction.start, transaction.start + 24], [0, transaction.command.length], clamp);
      const shown = transaction.command.slice(0, Math.floor(typedProgress));
      const enter = phase(frame, transaction.start - 6, transaction.start + 8);
      const routed = phase(frame, transaction.start + 30, transaction.start + 48, easeInOut);
      const activeEnd = i < transactions.length - 1 ? transactions[i + 1].start + 12 : 190;
      const active = 1 - phase(frame, activeEnd - 10, activeEnd + 8, easeInOut) * 0.55;
      const cursor = frame >= transaction.start && frame < transaction.start + 26 && Math.floor(frame / 4) % 2 === 0;
      return (
        <div key={transaction.label} style={{position: "absolute", left: 0, top: transaction.y - 320, width: 620, height: 132, opacity: enter * active, transform: `translateY(${interpolate(enter, [0, 1], [18, 0], clamp)}px)`}}>
          <div style={{display: "flex", alignItems: "center", gap: 12, fontFamily: FONTS.mono, fontSize: 11, color: routed > 0.2 ? COLORS.cyan : COLORS.textDim, letterSpacing: 0}}>
            <span style={{width: 6, height: 6, background: routed > 0.2 ? COLORS.cyan : "#425069", boxShadow: routed > 0.2 ? `0 0 7px ${COLORS.cyan}` : "none"}} />
            {transaction.label}
            <span style={{marginLeft: "auto", opacity: routed}}>ROUTED</span>
          </div>
          <div style={{marginTop: 16, padding: "18px 22px", minHeight: 64, borderLeft: `2px solid ${routed > 0.5 ? COLORS.cyan : "#425069"}`, background: "linear-gradient(90deg, rgba(14,24,38,.82), rgba(5,9,16,.18))", fontSize: 23, lineHeight: 1.25}}>
            <span style={{fontFamily: FONTS.mono, color: COLORS.cyan, marginRight: 12}}>&gt;</span>{shown}<span style={{opacity: cursor ? 1 : 0, color: COLORS.cyan}}>▌</span>
          </div>
        </div>
      );
    })}
  </div>
);

const RoutingPaths: React.FC<{frame: number}> = ({frame}) => (
  <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{position: "absolute", inset: 0, pointerEvents: "none"}}>
    {transactions.map((transaction, i) => {
      const draw = phase(frame, transaction.start + 30, transaction.start + 48, easeInOut);
      const pulse = phase(frame, transaction.start + 42, transaction.start + 58, Easing.linear);
      const y = transaction.y + 38;
      const targetY = 288 + i * 238;
      const d = `M 712 ${y} C 820 ${y}, 860 ${targetY}, 938 ${targetY}`;
      return <g key={transaction.label}>
        <path d={d} fill="none" stroke="#32435A" strokeWidth="1" opacity={draw * 0.72} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - draw} />
        <path d={d} fill="none" stroke={COLORS.cyan} strokeWidth="1.4" opacity={draw * 0.58} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - draw} />
        {pulse > 0 && pulse < 1 ? <path d={d} fill="none" stroke="#D8FCFF" strokeWidth="2.4" opacity="0.95" pathLength="1" strokeDasharray="0.012 0.988" strokeDashoffset={pulse} style={{filter: `drop-shadow(0 0 5px ${COLORS.cyan})`}} /> : null}
      </g>;
    })}
  </svg>
);

const VaultWorkspace: React.FC<{frame: number; handoff: number}> = ({frame, handoff}) => {
  const shellIn = phase(frame, 14, 34, easeInOut);
  return (
    <div style={{position: "absolute", left: 930, top: 130, width: 850, height: 820, opacity: shellIn * (1 - handoff * 0.42), transform: `translateX(${interpolate(shellIn, [0, 1], [80, 0], clamp)}px)`, border: "1px solid rgba(58,76,99,.68)", background: "linear-gradient(145deg, rgba(11,19,31,.94), rgba(3,7,13,.88))", boxShadow: "0 32px 90px rgba(0,0,0,.36)"}}>
      <div style={{position: "absolute", left: 28, right: 28, top: 24, height: 52, display: "flex", alignItems: "center", borderBottom: "1px solid rgba(58,76,99,.55)"}}>
        <span style={{width: 7, height: 7, background: COLORS.cyan, boxShadow: `0 0 8px ${COLORS.cyan}`}} />
        <span style={{marginLeft: 13, fontFamily: FONTS.mono, fontSize: 13, color: COLORS.cyan, letterSpacing: 0}}>LOCAL VAULT / OBSIDIAN</span>
        <span style={{marginLeft: "auto", fontFamily: FONTS.mono, fontSize: 11, color: COLORS.textDim, letterSpacing: 0}}>MARKDOWN / SAFE WRITE</span>
      </div>
      <MarkdownResult frame={frame} />
      <SourceResult frame={frame} />
      <OutlineResult frame={frame} />
    </div>
  );
};

const ResultShell: React.FC<{top: number; height: number; opacity: number; active: boolean; children: React.ReactNode}> = ({top, height, opacity, active, children}) => (
  <div style={{position: "absolute", left: 28, right: 28, top, height, opacity, borderLeft: `2px solid ${active ? COLORS.cyan : "#33445B"}`, borderTop: "1px solid rgba(58,76,99,.48)", borderBottom: "1px solid rgba(58,76,99,.26)", background: active ? "linear-gradient(90deg, rgba(0,229,255,.055), rgba(5,9,16,.18))" : "rgba(5,9,16,.22)", padding: "18px 22px"}}>{children}</div>
);

const MarkdownResult: React.FC<{frame: number}> = ({frame}) => {
  const enter = phase(frame, 50, 68, easeInOut);
  const active = frame < 92;
  return <ResultShell top={102} height={200} opacity={enter * (active ? 1 : 0.62)} active={active}>
    <div style={{display: "flex", alignItems: "center", fontFamily: FONTS.mono, fontSize: 11, color: COLORS.cyan, letterSpacing: 0}}><span>WRITE / MARKDOWN</span><span style={{marginLeft: "auto"}}>SUCCESS</span></div>
    <div style={{marginTop: 13, fontSize: 22, fontWeight: 720}}>视频选题.md</div>
    <div style={{marginTop: 9, fontFamily: FONTS.mono, fontSize: 12, color: COLORS.textSecondary, letterSpacing: 0}}>Projects/AI Agent项目/视频选题.md</div>
    <div style={{marginTop: 14, display: "grid", gridTemplateColumns: "116px 1fr", gap: "7px 12px", fontSize: 13, color: COLORS.textSecondary}}>
      <span>project</span><span style={{color: COLORS.textPrimary}}>第二大脑宣传片</span>
      <span>idea</span><span style={{color: COLORS.textPrimary}}>把 CODE 做成可见工作流</span>
    </div>
  </ResultShell>;
};

const SourceResult: React.FC<{frame: number}> = ({frame}) => {
  const enter = phase(frame, 110, 128, easeInOut);
  const active = frame >= 100 && frame < 152;
  return <ResultShell top={320} height={214} opacity={enter * (active ? 1 : 0.62)} active={active}>
    <div style={{display: "flex", alignItems: "center", fontFamily: FONTS.mono, fontSize: 11, color: COLORS.cyan, letterSpacing: 0}}><span>EXTRACT / DISTILL</span><span style={{marginLeft: "auto"}}>1,842 字</span></div>
    <div style={{marginTop: 13, fontSize: 22, fontWeight: 720}}>Agent 工作流设计文章</div>
    <div style={{marginTop: 13, fontSize: 15, lineHeight: 1.55, color: COLORS.textSecondary}}>正文已提取。核心观点：方法论必须转化为可执行步骤，才能稳定产生结果。</div>
    <div style={{marginTop: 14, display: "flex", gap: 18, fontFamily: FONTS.mono, fontSize: 11, color: COLORS.cyan, letterSpacing: 0}}><span>PARA / RESOURCE</span><span>SUMMARY / READY</span><span>LINKED / 01</span></div>
  </ResultShell>;
};

const OutlineResult: React.FC<{frame: number}> = ({frame}) => {
  const enter = phase(frame, 168, 188, easeInOut);
  const itemA = phase(frame, 172, 184);
  const itemB = phase(frame, 178, 190);
  const itemC = phase(frame, 184, 196);
  return <ResultShell top={552} height={238} opacity={enter} active={frame >= 160}>
    <div style={{display: "flex", alignItems: "center", fontFamily: FONTS.mono, fontSize: 11, color: COLORS.cyan, letterSpacing: 0}}><span>RETRIEVE 02 / GENERATE</span><span style={{marginLeft: "auto"}}>OUTLINE READY</span></div>
    <div style={{marginTop: 13, fontSize: 22, fontWeight: 720}}>第二大脑宣传片大纲</div>
    <div style={{marginTop: 15, display: "grid", gap: 10, fontSize: 15}}>
      <div style={{opacity: itemA, transform: `translateX(${interpolate(itemA, [0, 1], [18, 0], clamp)}px)`}}><span style={{fontFamily: FONTS.mono, color: COLORS.cyan, marginRight: 14}}>01</span>从收藏过载切入真实痛点</div>
      <div style={{opacity: itemB, transform: `translateX(${interpolate(itemB, [0, 1], [18, 0], clamp)}px)`}}><span style={{fontFamily: FONTS.mono, color: COLORS.cyan, marginRight: 14}}>02</span>展示 Hub 与 CODE 执行链</div>
      <div style={{opacity: itemC, transform: `translateX(${interpolate(itemC, [0, 1], [18, 0], clamp)}px)`}}><span style={{fontFamily: FONTS.mono, color: COLORS.cyan, marginRight: 14}}>03</span>让知识在结晶中走向创造</div>
    </div>
    <div style={{position: "absolute", right: 22, bottom: 18, fontFamily: FONTS.mono, fontSize: 11, color: COLORS.textDim, letterSpacing: 0}}>USED: 视频选题.md + 文章摘要.md</div>
  </ResultShell>;
};

const Handoff: React.FC<{frame: number; progress: number}> = ({frame, progress}) => (
  <AbsoluteFill style={{pointerEvents: "none", opacity: progress}}>
    <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{position: "absolute", inset: 0}}>
      {handoffNodes.map((node, i) => {
        const local = phase(frame, 192 + i * 0.8, 208, easeInOut);
        const x = interpolate(local, [0, 1], [node.x, node.tx], clamp);
        const y = interpolate(local, [0, 1], [node.y, node.ty], clamp);
        return <line key={i} x1={x} y1={y} x2={1410} y2={535} stroke={COLORS.cyan} strokeWidth="1" opacity={local * 0.26} />;
      })}
    </svg>
    {handoffNodes.map((node, i) => {
      const local = phase(frame, 192 + i * 0.8, 208, easeInOut);
      return <div key={i} style={{position: "absolute", left: interpolate(local, [0, 1], [node.x, node.tx], clamp), top: interpolate(local, [0, 1], [node.y, node.ty], clamp), width: i % 3 === 0 ? 8 : 5, height: i % 3 === 0 ? 8 : 5, transform: "translate(-50%, -50%)", background: i % 3 === 0 ? "#D8FCFF" : COLORS.cyan, boxShadow: `0 0 ${i % 3 === 0 ? 10 : 6}px ${COLORS.cyan}`}} />;
    })}
    <div style={{position: "absolute", left: 1410, top: 535, width: 22 + progress * 24, height: 22 + progress * 24, transform: "translate(-50%, -50%) rotate(45deg)", border: `1px solid ${COLORS.cyan}`, boxShadow: "0 0 18px rgba(0,229,255,.24)"}} />
  </AbsoluteFill>
);
