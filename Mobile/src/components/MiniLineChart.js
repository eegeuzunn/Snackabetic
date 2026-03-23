import React from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import theme from "../theme";

/**
 * A lightweight SVG line chart for the glucose trend.
 * Props:
 *   data   — array of { date: string, avg: number | null }
 *   width  — chart width
 *   height — chart height
 */
export default function MiniLineChart({ data, width = 300, height = 120 }) {
  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const W = width - padL - padR;
  const H = height - padT - padB;

  // Filter out null values for scale calculation
  const values = data.map((d) => d.avg).filter((v) => v != null);
  if (values.length < 2) {
    return <View style={{ width, height }} />;
  }

  const minY = Math.max(0, Math.min(...values) - 20);
  const maxY = Math.max(...values) + 20;
  const rangeY = maxY - minY || 1;

  // Map data points to SVG coordinates (null → skip)
  const points = data.map((d, i) => ({
    x: padL + (i / (data.length - 1)) * W,
    y: d.avg != null ? padT + H - ((d.avg - minY) / rangeY) * H : null,
    avg: d.avg,
    label: d.date.slice(5), // MM-DD
  }));

  // Build continuous path segments (skip nulls)
  let pathD = "";
  let inPath = false;
  points.forEach((p) => {
    if (p.y == null) {
      inPath = false;
      return;
    }
    if (!inPath) {
      pathD += `M ${p.x} ${p.y} `;
      inPath = true;
    } else {
      pathD += `L ${p.x} ${p.y} `;
    }
  });

  // Y-axis labels (min, mid, max)
  const mid = Math.round((minY + maxY) / 2);
  const yLabels = [
    { val: Math.round(maxY), y: padT },
    { val: mid, y: padT + H / 2 },
    { val: Math.round(minY), y: padT + H },
  ];

  return (
    <Svg width={width} height={height}>
      {/* Y-axis labels */}
      {yLabels.map((l) => (
        <SvgText
          key={l.val}
          x={padL - 4}
          y={l.y + 4}
          fontSize={10}
          fill={theme.colors.textSecondary}
          textAnchor="end"
        >
          {l.val}
        </SvgText>
      ))}

      {/* Baseline */}
      <Line
        x1={padL}
        y1={padT + H}
        x2={padL + W}
        y2={padT + H}
        stroke={theme.colors.border}
        strokeWidth={1}
      />

      {/* Line path */}
      {pathD ? (
        <Path
          d={pathD}
          stroke={theme.colors.primary}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {/* Data points + X labels */}
      {points.map((p, i) => (
        <React.Fragment key={i}>
          {p.y != null && (
            <Circle
              cx={p.x}
              cy={p.y}
              r={4}
              fill={theme.colors.primary}
              stroke={theme.colors.surface}
              strokeWidth={2}
            />
          )}
          <SvgText
            x={p.x}
            y={padT + H + padB - 4}
            fontSize={9}
            fill={theme.colors.textSecondary}
            textAnchor="middle"
          >
            {p.label}
          </SvgText>
        </React.Fragment>
      ))}
    </Svg>
  );
}
