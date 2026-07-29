import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { FONTS } from "../theme";

/**
 * 镜头1 · 苹果发布会版：收藏≠学会（0-3s / 90f）
 * 设计语言：纯黑场 + 超大细体 + 单句渐进 + 极致克制。
 * 没有碎片、没有界面、没有装饰——只有一句话的力量。
 * 动效唯一：词与词之间的呼吸浮现 + 一次极缓的推近。
 */

export const Shot1Apple: React.FC = () => {
  const frame = useCurrentFrame();

  // 整帧一次极缓的推近（0.94 → 1.0），苹果的标志性「缓慢呼吸」
  const push = interpolate(frame, [0, 90], [0.94, 1.0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 词组渐进：收藏 → ≠ → 学会，各自错峰呼吸浮现
  const w1 = interpolate(frame, [8, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const w2 = interpolate(frame, [26, 44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const w3 = interpolate(frame, [40, 62], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // 英文小字最后极轻地浮现
  const en = interpolate(frame, [64, 84], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // 呼吸感：浮现时带一点上浮 + 去模糊
  const rise = (t: number) => interpolate(t, [0, 1], [26, 0]);
  const blur = (t: number) => interpolate(t, [0, 1], [14, 0]);

  return (
    <AbsoluteFill
      style={{
        background: "#000000",
        justifyContent: "center",
        alignItems: "center",
        transform: `scale(${push})`,
      }}
    >
      {/* 主句：一行超大细体 */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "0.18em",
          fontFamily: FONTS.zh,
          fontWeight: 200, // 极细，苹果的轻盈感
          fontSize: 220,
          letterSpacing: "0.01em",
          color: "#F5F5F7", // 苹果常用的近白
          lineHeight: 1,
        }}
      >
        <span
          style={{
            opacity: w1,
            transform: `translateY(${rise(w1)}px)`,
            filter: `blur(${blur(w1)}px)`,
          }}
        >
          收藏
        </span>
        <span
          style={{
            opacity: w2,
            transform: `translateY(${rise(w2)}px)`,
            filter: `blur(${blur(w2)}px)`,
            fontWeight: 100,
            color: "#86868B", // 苹果灰，弱化连接符
            fontSize: 180,
          }}
        >
          ≠
        </span>
        <span
          style={{
            opacity: w3,
            transform: `translateY(${rise(w3)}px)`,
            filter: `blur(${blur(w3)}px)`,
          }}
        >
          学会
        </span>
      </div>

      {/* 英文小字：极轻、极松字距，最后浮现 */}
      <div
        style={{
          marginTop: 48,
          fontFamily: FONTS.zh,
          fontWeight: 300,
          fontSize: 30,
          letterSpacing: "0.5em",
          color: "#86868B",
          opacity: en,
          transform: `translateY(${rise(en) * 0.4}px)`,
          textIndent: "0.5em", // 补偿字距居中
        }}
      >
        收藏，不等于学会
      </div>
    </AbsoluteFill>
  );
};
