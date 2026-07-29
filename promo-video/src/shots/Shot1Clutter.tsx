import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { COLORS, FONTS } from "../theme";
import { makeShardSeed } from "../components/Shard";
import {
  HudFrame,
  Scanlines,
  HudTag,
  DataStream,
  GlowLine,
  scanReveal,
} from "../components/Hud";

/**
 * 镜头1 · HUD版：收藏≠学会（0-3s / 90f）
 * 概念：碎片不是「发光悬浮」，而是「被吸入收集框的故障堆积」——
 * 系统一直在收录，却从未被理解。
 * 版式：左对齐出血大字 + 界面标注，不居中。
 */

const COUNT = 46;

// 收集框（画面右侧的收录目标区）
const BIN = { x: 1380, y: 540, w: 360, h: 460 };

export const Shot1Clutter: React.FC = () => {
  const frame = useCurrentFrame();

  // 字卡扫描进场
  const titleScan = scanReveal(frame, 52, 18);
  const subScan = scanReveal(frame, 66, 14);
  const ruleIn = scanReveal(frame, 46, 10);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.bgDeep} 0%, ${COLORS.bgBase} 100%)`,
        overflow: "hidden",
      }}
    >
      {/* 背景数据流：系统一直在收录 */}
      <DataStream columns={16} seed={11} opacity={0.07} speed={26} />

      {/* 收录目标框 */}
      <AbsoluteFill>
        <CollectBin frame={frame} />
      </AbsoluteFill>

      {/* 碎片：从四周被吸入收集框，越堆越乱 */}
      <AbsoluteFill>
        {Array.from({ length: COUNT }, (_, i) => {
          const s = makeShardSeed(i);
          const t = scanReveal(frame, i * 0.9, 34);
          const startX = Math.cos(s.angle) * s.dist * 1.2;
          const startY = Math.sin(s.angle) * s.dist * 0.9;
          const rand = (k: number) => {
            const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
            return v - Math.floor(v);
          };
          const landX = BIN.x - 960 + (rand(1) - 0.5) * BIN.w * 0.7;
          const landY = BIN.y - 540 + (rand(2) - 0.5) * BIN.h * 0.8 + (i / COUNT) * 60;
          const x = interpolate(t, [0, 1], [startX, landX]);
          const y = interpolate(t, [0, 1], [startY, landY]);
          const rot = interpolate(t, [0, 1], [s.rot * 2, s.rot * 0.4]);
          const scale = interpolate(t, [0, 1], [0.5, 0.9]) * s.depth;
          const op = interpolate(frame - i * 0.9, [0, 4], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <ShardGhost
              key={i}
              seed={s}
              x={x}
              y={y}
              rot={rot}
              scale={scale}
              opacity={op}
            />
          );
        })}
      </AbsoluteFill>

      {/* 左侧出血字卡 */}
      <AbsoluteFill style={{ justifyContent: "center" }}>
        <div style={{ paddingLeft: 96, maxWidth: 900 }}>
          {/* 编号 + 细分隔线 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              opacity: ruleIn,
              marginBottom: 28,
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 20,
                letterSpacing: "0.3em",
                color: COLORS.cyan,
              }}
            >
              01
            </span>
            <GlowLine length={180} opacity={0.7} />
          </div>

          {/* 主标题：扫描点亮 */}
          <div
            style={{
              fontFamily: FONTS.zh,
              fontWeight: 900,
              fontSize: 148,
              lineHeight: 1.04,
              letterSpacing: "-0.02em",
              color: COLORS.textPrimary,
              clipPath: `inset(0 ${(1 - titleScan) * 100}% 0 0)`,
              textShadow: `0 0 24px ${COLORS.cyan}22`,
            }}
          >
            收藏<span style={{ color: COLORS.cyan }}>≠</span>学会
          </div>

          {/* 英文系统判词 */}
          <div
            style={{
              marginTop: 26,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 22,
              letterSpacing: "0.32em",
              color: COLORS.textSecondary,
              textTransform: "uppercase",
              clipPath: `inset(0 ${(1 - subScan) * 100}% 0 0)`,
            }}
          >
            SAVING&nbsp;&nbsp;IS&nbsp;&nbsp;NOT&nbsp;&nbsp;KNOWING
          </div>
        </div>
      </AbsoluteFill>

      {/* 界面骨架：取景框 + 标注 + 扫描线 */}
      <HudFrame inset={44} opacity={0.5} />
      <HudTag text="SYS.LOG // ARCHIVE_OVERFLOW" x={64} y={58} appear={6} />
      <HudTag text="BUFFER 46/∞" x={64} y={1010} appear={20} />
      <Scanlines opacity={0.05} />
    </AbsoluteFill>
  );
};

/** 收录目标框：1px 线稿容器 + 顶部标签 + 内部微光 */
const CollectBin: React.FC<{ frame: number }> = ({ frame }) => {
  const pulse = 0.5 + Math.sin(frame / 9) * 0.12;
  const appear = scanReveal(frame, 4, 14);
  return (
    <div
      style={{
        position: "absolute",
        left: BIN.x - BIN.w / 2,
        top: BIN.y - BIN.h / 2,
        width: BIN.w,
        height: BIN.h,
        opacity: appear,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: `1px solid ${COLORS.cyan}55`,
          borderRadius: 4,
          boxShadow: `inset 0 0 ${30 * pulse}px ${COLORS.cyan}11`,
        }}
      />
      {[
        { l: -1, t: -1, bl: 2, bt: 2 },
        { r: -1, t: -1, br: 2, bt: 2 },
        { l: -1, b: -1, bl: 2, bb: 2 },
        { r: -1, b: -1, br: 2, bb: 2 },
      ].map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 18,
            height: 18,
            left: c.l,
            right: (c as any).r,
            top: c.t,
            bottom: (c as any).b,
            borderLeft: c.bl ? `2px solid ${COLORS.cyan}` : undefined,
            borderRight: (c as any).br ? `2px solid ${COLORS.cyan}` : undefined,
            borderTop: c.bt ? `2px solid ${COLORS.cyan}` : undefined,
            borderBottom: (c as any).bb ? `2px solid ${COLORS.cyan}` : undefined,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          top: -26,
          left: 0,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 15,
          letterSpacing: "0.22em",
          color: COLORS.cyan,
          opacity: 0.8,
        }}
      >
        INBOX //
      </div>
    </div>
  );
};

/** 碎片残影：线稿化碎片（去发光，冷灰 + 1px 青描边） */
const ShardGhost: React.FC<{
  seed: ReturnType<typeof makeShardSeed>;
  x: number;
  y: number;
  rot: number;
  scale: number;
  opacity: number;
}> = ({ seed, x, y, rot, scale, opacity }) => {
  const { w, h } = seed;
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
        background: `linear-gradient(135deg, ${COLORS.shardDim} 0%, ${COLORS.bgPanel} 120%)`,
        border: `1px solid ${COLORS.cyan}2E`,
        borderRadius: 4,
        overflow: "hidden",
        padding: 10,
      }}
    >
      {[0.6, 0.9, 0.72, 0.84].map((lw, i) => (
        <div
          key={i}
          style={{
            width: `${lw * 100}%`,
            height: 4,
            borderRadius: 2,
            background: `${COLORS.textDim}${i === 0 ? "" : "99"}`,
            marginBottom: 7,
            marginTop: i === 0 ? 2 : 0,
          }}
        />
      ))}
    </div>
  );
};
