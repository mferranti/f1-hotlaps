import { useState } from "react";
import { Text, View } from "react-native";
import Svg, { Line, Polyline, Text as SvgText } from "react-native-svg";

import { axisTicks } from "@/ui/axis-ticks";
import { colors } from "@/ui/theme";

export interface ChartPoint {
  x: number;
  y: number;
}

export interface ChartSeries {
  points: readonly ChartPoint[];
  color: string;
}

const PAD_LEFT = 40;
const PAD_RIGHT = 10;
const PAD_TOP = 10;
const PAD_BOTTOM = 24;
const HEIGHT = 160;
const TICKS = 5;

const CAPTION = 18;

export function LineChart({
  series,
  xLabel,
  yLabel,
  height,
}: {
  series: readonly ChartSeries[];
  xLabel: string;
  yLabel: string;
  /** Total height including the axis caption. Defaults to a compact preview. */
  height?: number;
}) {
  const [width, setWidth] = useState(0);
  const svgH = height != null ? Math.max(1, height - CAPTION) : HEIGHT;
  const points = series.flatMap((item) => item.points);
  if (points.length < 2) return <View style={{ height: height ?? HEIGHT }} />;

  const xMin = Math.min(...points.map((point) => point.x));
  const xMax = Math.max(...points.map((point) => point.x));
  const yMin = Math.min(...points.map((point) => point.y));
  const yMax = Math.max(...points.map((point) => point.y));
  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 1;
  const plotW = Math.max(1, width - PAD_LEFT - PAD_RIGHT);
  const plotH = svgH - PAD_TOP - PAD_BOTTOM;

  const toX = (x: number) => PAD_LEFT + ((x - xMin) / xSpan) * plotW;
  const toY = (y: number) => PAD_TOP + plotH - ((y - yMin) / ySpan) * plotH;
  const xTicks = axisTicks(xMin, xMax, TICKS);
  const yTicks = axisTicks(yMin, yMax, TICKS);

  return (
    <View style={{ alignSelf: "stretch" }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`}>
          {yTicks.map((tick, index) => (
            <Line
              key={`grid-y-${index}`}
              x1={PAD_LEFT}
              y1={toY(tick)}
              x2={PAD_LEFT + plotW}
              y2={toY(tick)}
              stroke={colors.border}
              strokeWidth={1}
            />
          ))}
          {xTicks.map((tick, index) => (
            <Line
              key={`grid-x-${index}`}
              x1={toX(tick)}
              y1={PAD_TOP}
              x2={toX(tick)}
              y2={PAD_TOP + plotH}
              stroke={colors.border}
              strokeWidth={1}
            />
          ))}
          {yTicks.map((tick, index) => (
            <SvgText
              key={`label-y-${index}`}
              x={PAD_LEFT - 4}
              y={toY(tick) + 3}
              fill={colors.muted}
              fontSize={8}
              textAnchor="end"
            >
              {formatTick(tick)}
            </SvgText>
          ))}
          {xTicks.map((tick, index) => (
            <SvgText
              key={`label-x-${index}`}
              x={toX(tick)}
              y={svgH - 6}
              fill={colors.muted}
              fontSize={8}
              textAnchor="middle"
            >
              {formatTick(tick)}
            </SvgText>
          ))}
          {series.map((item, index) => (
            <Polyline
              key={`series-${index}`}
              points={item.points.map((point) => `${toX(point.x)},${toY(point.y)}`).join(" ")}
              fill="none"
              stroke={item.color}
              strokeWidth={2}
            />
          ))}
        </Svg>
      ) : (
        <View style={{ height: svgH }} />
      )}
      <Text style={{ color: colors.muted, fontSize: 11 }}>
        {yLabel} · {xLabel}
      </Text>
    </View>
  );
}

function formatTick(value: number): string {
  if (Math.abs(value) >= 100) return String(Math.round(value));
  if (Math.abs(value) >= 10) return value.toFixed(0);
  return value.toFixed(2);
}
