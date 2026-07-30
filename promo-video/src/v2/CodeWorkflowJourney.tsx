import React from "react";
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from "remotion";
import {COLORS, FONTS, mulberry32} from "../theme";

const DURATION = 240;
const clamp = {extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const};
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

const phase = (frame: number, from: number, to: number, easing = easeOut) =>
  interpolate(frame, [from, to], [0, 1], {...clamp, easing});

const stageOpacity = (frame: number, enter: number, exit: number) =>
  phase(frame, enter - 12, enter + 4, easeInOut) * (1 - phase(frame, exit - 10, exit + 8, easeInOut));

const dust = Array.from({length: 42}, (_, i) => {
  const rand = mulberry32(4409 + i * 811);
  return {
    x: 90 + rand() * 1740,
    y: 70 + rand() * 920,
    size: 0.8 + rand() * 1.6,
    opacity: 0.06 + rand() * 0.2,
    phase: rand() * Math.PI * 2,
  };
});

const captureItems = [
  {kind: "VOICE", label: "选题可以做成视频", x: 220, y: 330, delay: 0},
  {kind: "URL", label: "agent-native workflow", x: 1680, y: 420, delay: 5},
  {kind: "PDF", label: "知识管理研究.pdf", x: 280, y: 690, delay: 10},
  {kind: "NOTE", label: "关于创造的零碎想法", x: 1600, y: 760, delay: 15},
] as const;

const paraLanes = [
  {cn: "项目", en: "PROJECT", y: 330, color: "#D8FCFF"},
  {cn: "领域", en: "AREA", y: 455, color: COLORS.cyanSoft},
  {cn: "资源", en: "RESOURCE", y: 580, color: COLORS.cyan},
  {cn: "存档", en: "ARCHIVE", y: 705, color: COLORS.cyanDim},
] as const;

const articleLines = [0.96, 0.72, 0.88, 0.62, 0.84, 0.76, 0.54, 0.9, 0.68];

const outputs = [
  {title: "文章大纲", en: "ARTICLE", x: 1190, y: 300, w: 430, h: 154},
  {title: "视频脚本", en: "VIDEO SCRIPT", x: 1280, y: 492, w: 470, h: 154},
  {title: "项目方案", en: "PROJECT PLAN", x: 1190, y: 684, w: 430, h: 154},
] as const;

export const CodeWorkflowJourney: React.FC = () => {
  const frame = useCurrentFrame();
  const cameraPush = interpolate(frame, [0, 18, 228, DURATION - 1], [0.96, 1.02, 1.075, 1.13], {...clamp, easing: easeInOut});
  const cameraX = interpolate(frame, [0, 60, 120, 180, DURATION - 1], [0, -18, 12, -14, 0], {...clamp, easing: easeInOut});
  const cameraY = interpolate(frame, [0, 60, 120, 180, DURATION - 1], [0, 8, -6, 10, 0], {...clamp, easing: easeInOut});

  return (
    <AbsoluteFill style={{overflow: "hidden", background: `radial-gradient(ellipse at 50% 52%, #101A29 0%, ${COLORS.bgBase} 34%, ${COLORS.bgDeep} 72%, #02040A 100%)`, color: COLORS.textPrimary, fontFamily: FONTS.zh}}>
      <Background frame={frame} />
      <AbsoluteFill style={{transform: `translate(${cameraX}px, ${cameraY}px) scale(${cameraPush})`, transformOrigin: "50% 52%"}}>
        <CaptureStage frame={frame} />
        <OrganizeStage frame={frame} />
        <DistillStage frame={frame} />
        <ExpressStage frame={frame} />
      </AbsoluteFill>
      <EntryIris frame={frame} />
      <StageIdentity frame={frame} />
      <NarrativeCopy frame={frame} />
      <CodeRail frame={frame} />
      <AbsoluteFill style={{pointerEvents: "none", background: "radial-gradient(ellipse at 50% 52%, transparent 50%, rgba(1,3,9,.28) 78%, rgba(0,0,0,.72) 100%)"}} />
    </AbsoluteFill>
  );
};

const Background: React.FC<{frame: number}> = ({frame}) => {
  const horizon = interpolate(frame, [0, DURATION - 1], [610, 560], clamp);
  const gridShift = (frame * 8) % 96;
  return (
    <AbsoluteFill>
      {dust.map((particle, i) => (
        <div key={i} style={{position: "absolute", left: particle.x + Math.cos(frame / 41 + particle.phase) * 7, top: particle.y + Math.sin(frame / 47 + particle.phase) * 5, width: particle.size, height: particle.size, background: i % 9 === 0 ? COLORS.textSecondary : COLORS.cyan, opacity: particle.opacity * (0.72 + Math.sin(frame / 15 + particle.phase) * 0.28), boxShadow: i % 9 === 0 ? "none" : `0 0 5px ${COLORS.cyan}`}} />
      ))}
      <div style={{position: "absolute", left: 0, right: 0, top: horizon, height: 520, opacity: 0.13, transform: "perspective(700px) rotateX(68deg)", transformOrigin: "top center", backgroundImage: `linear-gradient(rgba(0,229,255,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,.12) 1px, transparent 1px)`, backgroundSize: `96px 72px`, backgroundPosition: `0 ${gridShift}px`, maskImage: "linear-gradient(to bottom, rgba(0,0,0,.9), transparent 76%)"}} />
      <div style={{position: "absolute", left: 240, right: 240, top: horizon, height: 1, background: "linear-gradient(90deg, transparent, rgba(0,229,255,.36), transparent)", boxShadow: "0 0 12px rgba(0,229,255,.18)"}} />
    </AbsoluteFill>
  );
};

const EntryIris: React.FC<{frame: number}> = ({frame}) => {
  const prepare = phase(frame, 0, 5, easeInOut);
  const open = phase(frame, 5, 22, easeInOut);
  const fade = 1 - phase(frame, 18, 34, easeInOut);
  const gap = interpolate(open, [0, 1], [3, 480], clamp);
  const recoil = interpolate(prepare, [0, 1], [1, 0.84], clamp);
  const crackGlow = interpolate(frame, [0, 5, 13, 28], [0.7, 1, 0.78, 0], clamp);
  return (
    <AbsoluteFill style={{opacity: fade, pointerEvents: "none"}}>
      <div style={{position: "absolute", left: 0, top: 0, bottom: 0, width: `calc(50% - ${gap / 2}px)`, background: "linear-gradient(90deg, #010205, #07101A 78%, #122432)", clipPath: "polygon(0 0, 100% 0, 96% 18%, 100% 37%, 95% 51%, 100% 68%, 96% 84%, 100% 100%, 0 100%)", transform: `scaleX(${recoil})`, transformOrigin: "left center", boxShadow: "16px 0 40px rgba(0,229,255,.08)"}} />
      <div style={{position: "absolute", right: 0, top: 0, bottom: 0, width: `calc(50% - ${gap / 2}px)`, background: "linear-gradient(270deg, #010205, #07101A 78%, #122432)", clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 4% 84%, 0 68%, 5% 51%, 0 37%, 4% 18%)", transform: `scaleX(${recoil})`, transformOrigin: "right center", boxShadow: "-16px 0 40px rgba(0,229,255,.08)"}} />
      <div style={{position: "absolute", left: "50%", top: 54, bottom: 54, width: 3 + open * 2, transform: `translateX(-50%) scaleY(${0.94 + prepare * 0.06})`, background: COLORS.cyan, opacity: crackGlow, boxShadow: "0 0 8px #00E5FF, 0 0 22px rgba(0,229,255,.55)"}} />
    </AbsoluteFill>
  );
};

const CaptureStage: React.FC<{frame: number}> = ({frame}) => {
  const opacity = stageOpacity(frame, 0, 72);
  const gateIn = phase(frame, 14, 29);
  const gateOpen = phase(frame, 36, 54, easeInOut);
  return (
    <AbsoluteFill style={{opacity}}>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{position: "absolute", inset: 0}}>
        <path d="M 680 190 Q 960 510 1240 190" fill="none" stroke="#26364A" strokeWidth="1" opacity={gateIn * 0.75} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - gateIn} />
        <path d="M 680 890 Q 960 570 1240 890" fill="none" stroke="#26364A" strokeWidth="1" opacity={gateIn * 0.75} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - gateIn} />
        <path d="M 960 240 L 960 840" fill="none" stroke={COLORS.cyan} strokeWidth="1.4" opacity={gateIn * (1 - gateOpen * 0.7)} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - gateIn} style={{filter: "drop-shadow(0 0 6px rgba(0,229,255,.48))"}} />
      </svg>
      {captureItems.map((item, i) => {
        const travel = phase(frame, 16 + item.delay, 48 + item.delay, easeInOut);
        const accepted = phase(frame, 42 + item.delay, 58 + item.delay, easeInOut);
        const targetY = 456 + i * 56;
        const x = interpolate(travel, [0, 0.78, 1], [item.x, 960 + (item.x < 960 ? -38 : 38), 1120], clamp);
        const y = interpolate(travel, [0, 0.78, 1], [item.y, 510 + (i - 1.5) * 34, targetY], clamp);
        const itemScale = interpolate(accepted, [0, 1], [1, 0.28], clamp);
        return (
          <div key={item.kind} style={{position: "absolute", left: x, top: y, width: 250, height: 58, transform: `translate(-50%, -50%) scale(${itemScale}) rotate(${interpolate(travel, [0, 1], [item.x < 960 ? -3 : 3, 0], clamp)}deg)`, opacity: 1 - accepted * 0.15, borderLeft: `2px solid ${accepted > 0.2 ? COLORS.cyan : "#52617A"}`, background: "linear-gradient(90deg, rgba(13,22,35,.9), rgba(5,9,16,.28))", padding: "10px 14px"}}>
            <div style={{fontFamily: FONTS.mono, fontSize: 11, color: COLORS.cyan, letterSpacing: 0}}>{item.kind}</div>
            <div style={{marginTop: 5, fontSize: 16, color: COLORS.textSecondary, whiteSpace: "nowrap"}}>{item.label}</div>
          </div>
        );
      })}
      <div style={{position: "absolute", left: 1122, top: 434, width: 310, fontFamily: FONTS.mono, fontSize: 13, color: COLORS.cyan, opacity: phase(frame, 42, 56), letterSpacing: 0}}>VALUE FILTER / PASSED</div>
    </AbsoluteFill>
  );
};

const OrganizeStage: React.FC<{frame: number}> = ({frame}) => {
  const opacity = stageOpacity(frame, 58, 132);
  const local = frame - 58;
  const railIn = phase(local, 0, 20, easeInOut);
  return (
    <AbsoluteFill style={{opacity}}>
      <div style={{position: "absolute", left: 350, top: 250, width: 1180, height: 560, transform: "perspective(1100px) rotateY(-8deg)", transformStyle: "preserve-3d"}}>
        {paraLanes.map((lane, i) => {
          const route = phase(local, 12 + i * 7, 34 + i * 7, easeInOut);
          const pulse = phase(local, 28 + i * 7, 50 + i * 7, Easing.linear);
          return (
            <React.Fragment key={lane.en}>
              <div style={{position: "absolute", left: 90, right: 40, top: lane.y - 250, height: 1, transform: `scaleX(${railIn})`, transformOrigin: "left center", background: `linear-gradient(90deg, rgba(38,54,74,.3), ${lane.color}, rgba(38,54,74,.25))`, opacity: 0.28 + route * 0.55, boxShadow: route > 0.4 ? `0 0 7px ${lane.color}66` : "none"}} />
              <div style={{position: "absolute", left: 0, top: lane.y - 274, width: 190, textAlign: "right", opacity: railIn, transform: `translateX(${interpolate(railIn, [0, 1], [22, 0])}px)`}}>
                <div style={{fontSize: 22, fontWeight: 700}}>{lane.cn}</div>
                <div style={{marginTop: 5, fontFamily: FONTS.mono, fontSize: 11, color: lane.color, letterSpacing: 0}}>{lane.en}</div>
              </div>
              <div style={{position: "absolute", left: interpolate(route, [0, 1], [300, 1020], clamp), top: lane.y - 260, width: interpolate(route, [0, 0.7, 1], [72, 132, 98], clamp), height: 12, transform: `translate(-50%, -50%) skewX(-24deg) scaleX(${0.55 + route * 0.45})`, background: lane.color, opacity: route * 0.82, boxShadow: `0 0 10px ${lane.color}88`}} />
              {pulse > 0 && pulse < 1 ? <div style={{position: "absolute", left: interpolate(pulse, [0, 1], [280, 1110], clamp), top: lane.y - 262, width: 3, height: 3, background: "#F2FEFF", boxShadow: `0 0 7px ${lane.color}`}} /> : null}
            </React.Fragment>
          );
        })}
        <div style={{position: "absolute", left: 232, top: 16, bottom: 16, width: 1, background: "linear-gradient(transparent, rgba(0,229,255,.5), transparent)", opacity: railIn}} />
      </div>
    </AbsoluteFill>
  );
};

const DistillStage: React.FC<{frame: number}> = ({frame}) => {
  const opacity = stageOpacity(frame, 116, 194);
  const local = frame - 116;
  const sheetIn = phase(local, 0, 18, easeInOut);
  const highlight = phase(local, 16, 48, easeInOut);
  const compress = phase(local, 42, 70, easeInOut);
  return (
    <AbsoluteFill style={{opacity}}>
      <div style={{position: "absolute", left: 512, top: 154, width: 760, height: 620, transform: `perspective(1200px) rotateY(${interpolate(sheetIn, [0, 1], [12, -5], clamp)}deg) translateX(${interpolate(sheetIn, [0, 1], [90, 0], clamp)}px) scale(${interpolate(compress, [0, 1], [1, 0.92], clamp)})`, transformOrigin: "center center", opacity: sheetIn}}>
        <div style={{position: "absolute", inset: 0, border: "1px solid rgba(79,105,132,.62)", background: "linear-gradient(145deg, rgba(15,25,39,.96), rgba(4,8,15,.92))", boxShadow: "0 30px 80px rgba(0,0,0,.42)"}} />
        <div style={{position: "absolute", left: 48, top: 42, fontFamily: FONTS.mono, fontSize: 12, color: COLORS.cyan, letterSpacing: 0}}>SOURCE / KNOWLEDGE-WORKFLOW.MD</div>
        <div style={{position: "absolute", left: 48, top: 92, fontSize: 30, fontWeight: 760}}>让信息成为可复用的知识</div>
        <div style={{position: "absolute", left: 48, right: 48, top: 160}}>
          {articleLines.map((width, i) => {
            const lineFocus = phase(local, 18 + i * 2.4, 28 + i * 2.4);
            const retained = i === 1 || i === 4 || i === 7;
            const dim = retained ? 1 : 1 - compress * 0.7;
            return <div key={i} style={{position: "relative", width: `${width * 100}%`, height: 12, marginBottom: 26, background: `linear-gradient(90deg, rgba(154,165,206,${0.42 * dim}), rgba(90,100,140,${0.18 * dim}))`}}>
              {retained ? <div style={{position: "absolute", left: -8, top: -7, width: `${interpolate(highlight, [0, 1], [0, 108], clamp)}%`, height: 26, background: "linear-gradient(90deg, rgba(0,229,255,.08), rgba(0,229,255,.24), rgba(0,229,255,.05))", borderLeft: `2px solid ${COLORS.cyan}`, opacity: lineFocus, boxShadow: "0 0 10px rgba(0,229,255,.08)"}} /> : null}
            </div>;
          })}
        </div>
      </div>
      <div style={{position: "absolute", left: 1240, top: 386, width: 500, height: 278, opacity: compress, transform: `translateX(${interpolate(compress, [0, 1], [110, 0], clamp)}px)`}}>
        <div style={{fontFamily: FONTS.mono, fontSize: 12, color: COLORS.cyan, letterSpacing: 0}}>DISTILLED OUTPUT</div>
        <div style={{marginTop: 22, padding: "22px 0", borderTop: "1px solid rgba(0,229,255,.48)", borderBottom: "1px solid rgba(38,54,74,.7)"}}>
          <div style={{fontSize: 20, color: COLORS.textSecondary}}>摘要</div>
          <div style={{marginTop: 9, fontSize: 27, fontWeight: 720}}>知识只有进入行动，才真正产生价值。</div>
        </div>
        <div style={{marginTop: 22, display: "flex", alignItems: "center", gap: 14}}>
          <span style={{width: 7, height: 7, background: COLORS.cyan, boxShadow: `0 0 8px ${COLORS.cyan}`}} />
          <span style={{fontSize: 18}}>核心观点 / 可直接用于创作</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ExpressStage: React.FC<{frame: number}> = ({frame}) => {
  const opacity = stageOpacity(frame, 174, 252);
  const local = frame - 174;
  const networkIn = phase(local, 0, 24, easeInOut);
  const finalPush = phase(local, 52, 66, easeInOut);
  const nodes = [
    {x: 520, y: 360}, {x: 650, y: 520}, {x: 500, y: 690}, {x: 790, y: 300},
    {x: 840, y: 520}, {x: 760, y: 740}, {x: 990, y: 415}, {x: 1010, y: 650},
  ];
  return (
    <AbsoluteFill style={{opacity}}>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{position: "absolute", inset: 0}}>
        {nodes.map((node, i) => {
          const output = outputs[i % outputs.length];
          const draw = phase(local, 6 + i * 2.2, 28 + i * 2.2, easeInOut);
          const targetX = output.x;
          const targetY = output.y + output.h / 2;
          const d = `M ${node.x} ${node.y} C ${node.x + 120} ${node.y}, ${targetX - 170} ${targetY}, ${targetX} ${targetY}`;
          return <path key={i} d={d} fill="none" stroke={i % 3 === 0 ? "#D8FCFF" : COLORS.cyan} strokeWidth={i % 3 === 0 ? 1.4 : 1} opacity={draw * (0.24 + (i % 3) * 0.12)} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - draw} />;
        })}
      </svg>
      {nodes.map((node, i) => {
        const nodeIn = phase(local, i * 2, 12 + i * 2);
        return <div key={i} style={{position: "absolute", left: node.x, top: node.y, width: i % 3 === 0 ? 9 : 6, height: i % 3 === 0 ? 9 : 6, transform: `translate(-50%, -50%) scale(${nodeIn})`, background: i % 3 === 0 ? "#D8FCFF" : COLORS.cyan, opacity: networkIn, boxShadow: `0 0 ${i % 3 === 0 ? 10 : 6}px ${COLORS.cyan}`}} />;
      })}
      {outputs.map((output, i) => {
        const outputIn = phase(local, 18 + i * 8, 38 + i * 8, easeInOut);
        const scale = i === 1 ? interpolate(finalPush, [0, 1], [1, 1.16], clamp) : 1 - finalPush * 0.08;
        const fadeForPush = i === 1 ? 1 : 1 - finalPush * 0.75;
        return (
          <div key={output.en} style={{position: "absolute", left: output.x, top: output.y, width: output.w, height: output.h, transform: `translateY(${interpolate(outputIn, [0, 1], [28, 0], clamp)}px) scale(${scale})`, transformOrigin: "center center", opacity: outputIn * fadeForPush, border: `1px solid ${i === 1 ? "rgba(0,229,255,.72)" : "rgba(79,105,132,.62)"}`, background: "linear-gradient(135deg, rgba(14,24,38,.92), rgba(4,8,14,.7))", boxShadow: i === 1 ? "0 0 24px rgba(0,229,255,.12)" : "none"}}>
            <div style={{position: "absolute", left: 24, top: 22, fontFamily: FONTS.mono, fontSize: 11, color: COLORS.cyan, letterSpacing: 0}}>{output.en}</div>
            <div style={{position: "absolute", left: 24, top: 49, fontSize: 25, fontWeight: 740}}>{output.title}</div>
            <div style={{position: "absolute", left: 24, right: 24, bottom: 23, display: "flex", gap: 9}}>
              {[0.78, 0.5, 0.66].map((w, j) => <span key={j} style={{display: "block", width: `${w * 31}%`, height: 3, background: j === 0 ? COLORS.cyan : "#46536A", opacity: 0.66}} />)}
            </div>
          </div>
        );
      })}
      <div style={{position: "absolute", left: 1280, top: 466, width: 470, height: 206, border: `1px solid ${COLORS.cyan}`, opacity: finalPush * 0.78, transform: `scale(${interpolate(finalPush, [0, 1], [0.82, 1.26], clamp)})`, boxShadow: "0 0 28px rgba(0,229,255,.22)", pointerEvents: "none"}} />
    </AbsoluteFill>
  );
};

const stageMeta = [
  {from: 0, to: 60, index: "01", en: "CAPTURE", cn: "捕获"},
  {from: 60, to: 120, index: "02", en: "ORGANIZE", cn: "组织"},
  {from: 120, to: 180, index: "03", en: "DISTILL", cn: "提炼"},
  {from: 180, to: 240, index: "04", en: "EXPRESS", cn: "表达"},
] as const;

const StageIdentity: React.FC<{frame: number}> = ({frame}) => (
  <div style={{position: "absolute", left: 112, top: 94, width: 720, height: 92}}>
    {stageMeta.map((stage) => {
      const opacity = phase(frame, stage.from - 4, stage.from + 4, easeInOut) * (1 - phase(frame, stage.to - 4, stage.to + 4, easeInOut));
      const enter = phase(frame, stage.from - 4, stage.from + 10);
      return <div key={stage.en} style={{position: "absolute", inset: 0, opacity, transform: `translateY(${interpolate(enter, [0, 1], [12, 0], clamp)}px)`}}>
        <div style={{display: "flex", alignItems: "center", gap: 16, fontFamily: FONTS.mono, color: COLORS.cyan, letterSpacing: 0}}>
          <span style={{fontSize: 14}}>CODE / {stage.index}</span>
          <span style={{width: 84, height: 1, background: "linear-gradient(90deg, rgba(0,229,255,.8), transparent)"}} />
          <span style={{fontSize: 14}}>{stage.en}</span>
        </div>
        <div style={{marginTop: 12, fontSize: 34, fontWeight: 760}}>{stage.cn}</div>
      </div>;
    })}
  </div>
);

const NarrativeCopy: React.FC<{frame: number}> = ({frame}) => {
  const firstIn = phase(frame, 22, 38);
  const firstOut = 1 - phase(frame, 104, 122, easeInOut);
  const secondIn = phase(frame, 130, 148);
  const secondDim = interpolate(frame, [228, 239], [1, 0.72], clamp);
  return (
    <div style={{position: "absolute", left: 112, bottom: 116, width: 920, height: 150}}>
      <div style={{position: "absolute", inset: 0, fontSize: 48, lineHeight: 1.18, fontWeight: 780, opacity: firstIn * firstOut, clipPath: `inset(0 ${100 - firstIn * 100}% 0 0)`}}>方法论，<br />不只告诉你怎么做。</div>
      <div style={{position: "absolute", inset: 0, fontSize: 54, lineHeight: 1.16, fontWeight: 800, opacity: secondIn * secondDim, clipPath: `inset(0 ${100 - secondIn * 100}% 0 0)`}}>Agent 直接替你推进。</div>
    </div>
  );
};

const CodeRail: React.FC<{frame: number}> = ({frame}) => (
  <div style={{position: "absolute", right: 104, top: 88, display: "flex", gap: 18, alignItems: "center"}}>
    {stageMeta.map((stage, i) => {
      const active = frame >= stage.from && frame < stage.to;
      const done = frame >= stage.to - 8;
      return <React.Fragment key={stage.en}>
        {i > 0 ? <span style={{width: 34, height: 1, background: "#34445A", opacity: 0.7}} /> : null}
        <div style={{display: "flex", alignItems: "center", gap: 8, fontFamily: FONTS.mono, fontSize: 12, color: active ? COLORS.textPrimary : COLORS.textDim, letterSpacing: 0}}>
          <span style={{width: 6, height: 6, background: active || done ? COLORS.cyan : "#34445A", boxShadow: active ? `0 0 8px ${COLORS.cyan}` : "none"}} />
          {stage.en}
        </div>
      </React.Fragment>;
    })}
  </div>
);
