import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONTS, mulberry32 } from "../theme";

/**
 * 镜头1：收藏 ≠ 学会（0-3s / 90f）
 * 画面：黑暗里无数碎片信息（卡片/链接）从四周杂乱涌入、堆积、越来越多逐渐失控。
 * 情绪：压抑、窒息、信息过载。
 * 字卡：收藏 ≠ 学会（压轴砸下）
 */

// 单个信息碎片：一张冷灰调的小卡片（标题条 + 几行文字）
const Shard: React.FC<{
  index: number;
  frame: number;
  fps: number;
}> = ({ index, frame, fps }) => {
  // 每个碎片固定种子，确定性随机
  const rand = mulberry32(index * 137 + 11);
  const angle = rand() * Math.PI * 2; // 从中心向外的方向
  const dist = 700 + rand() * 500; // 起始距离（屏幕外）
  const finalX = (rand() - 0.5) * 1300; // 落点
  const finalY = (rand() - 0.5) * 760;
  const rot = (rand() - 0.5) * 60;
  const w = 120 + rand() * 90;
  const h = w * (0.6 + rand() * 0.3);
  const delay = index * 2.2; // 依次涌入
  const hasNotif = rand() > 0.6; // 部分碎片带红点

  // 飞入：从屏幕外螺旋冲进堆积区
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 18, stiffness: 90, mass: 1 },
  });

  const startX = Math.cos(angle) * dist;
  const startY = Math.sin(angle) * dist;
  const x = interpolate(enter, [0, 1], [startX, finalX]);
  const y = interpolate(enter, [0, 1], [startY, finalY]);
  const scale = interpolate(enter, [0, 1], [0.3, 1]);
  const opacity = interpolate(frame - delay, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 细微漂浮（活物的躁动），固定相位
  const float = Math.sin((frame + index * 40) / 18) * 4;

  if (opacity <= 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: w,
        height: h,
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${
          y + float
        }px)) rotate(${rot}deg) scale(${scale})`,
        opacity,
        background: `linear-gradient(135deg, ${COLORS.shard} 0%, ${COLORS.shardDim} 100%)`,
        borderRadius: 8,
        border: `1px solid ${COLORS.cyanDim}33`,
        boxShadow: "0 4px 18px rgba(0,0,0,0.5)",
        padding: 8,
        overflow: "hidden",
      }}
    >
      {/* 标题条 */}
      <div
        style={{
          width: "60%",
          height: 7,
          borderRadius: 4,
          background: COLORS.textDim,
          marginBottom: 6,
        }}
      />
      {/* 文字行 */}
      {[0.9, 0.7, 0.8].map((lw, i) => (
        <div
          key={i}
          style={{
            width: `${lw * 100}%`,
            height: 4,
            borderRadius: 2,
            background: COLORS.textDim + "66",
            marginBottom: 4,
          }}
        />
      ))}
      {/* 未读红点 */}
      {hasNotif && (
        <div
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#FF3B5C",
            boxShadow: "0 0 10px #FF3B5C",
            border: "2px solid " + COLORS.bgBase,
          }}
        />
      )}
    </div>
  );
};

export const Shot1Clutter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const SHARD_COUNT = 46;

  // 背景：从纯黑微微亮起，随碎片增多渐压抑
  const bgLight = interpolate(frame, [0, 90], [0, 1]);

  // 字卡「收藏 ≠ 学会」：压轴砸下（最后 1s）
  const textEnter = spring({
    frame: frame - 58,
    fps,
    config: { damping: 14, stiffness: 120, mass: 1.2 },
  });
  const textScale = interpolate(textEnter, [0, 1], [2.2, 1]);
  const textOpacity = interpolate(frame - 58, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 字卡出现时，背景碎片整体变暗失焦（突出文字 + 呼应"失控变灰"）
  const shardDim = interpolate(frame, [58, 75], [1, 0.35], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 45%, ${COLORS.bgBase} 0%, ${COLORS.bgDeep} 75%)`,
      }}
    >
      {/* 碎片层 */}
      <AbsoluteFill style={{ opacity: shardDim }}>
        {Array.from({ length: SHARD_COUNT }, (_, i) => (
          <Shard key={i} index={i} frame={frame} fps={fps} />
        ))}
      </AbsoluteFill>

      {/* 暗角，强化压抑 */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 30%, rgba(4,6,15,${
            0.5 + bgLight * 0.2
          }) 100%)`,
        }}
      />

      {/* 字卡 */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          opacity: textOpacity,
        }}
      >
        <div
          style={{
            transform: `scale(${textScale})`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: FONTS.zh,
              fontWeight: 900,
              fontSize: 130,
              color: COLORS.textPrimary,
              letterSpacing: 4,
              textShadow: `0 0 40px ${COLORS.cyan}55, 0 6px 30px rgba(0,0,0,0.8)`,
            }}
          >
            收藏 <span style={{ color: "#FF3B5C" }}>≠</span> 学会
          </div>
          <div
            style={{
              fontFamily: FONTS.en,
              fontSize: 30,
              color: COLORS.textSecondary,
              letterSpacing: 10,
              marginTop: 20,
              textTransform: "uppercase",
            }}
          >
            Saving isn't knowing
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
