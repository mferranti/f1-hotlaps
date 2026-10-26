import { useState } from "react";
import { Text, View } from "react-native";
import Svg, { Line, Polyline, Text as SvgText } from "react-native-svg";

import { axisTicks, centeredDomain } from "@/ui/axis-ticks";
import { colors } from "@/ui/theme";

export interface ChartPoint {
  x: number;
  y: number;
}

export interface ChartSeries {
  points: readonly ChartPoint[];
  color: string;
}

export interface ChartMarker {
  x: number;
  label: string;
}

const PAD_LEFT = 40;
const PAD_RIGHT = 10;
const PAD_TOP = 16;
const PAD_BOTTOM = 24;
const HEIGHT = 160;
const TICKS = 5;

const LABEL_H = 16;

export function LineChart({
  series,
  xLabel,
  yLabel,
  height,
  markers = [],
  centerZero = false,
}: {
  series: readonly ChartSeries[];
  xLabel: string;
  yLabel: string;
  /** Total height including the axis captions. Defaults to a compact preview. */
  height?: number;
  /** Vertical lines, labeled on top. Their x value is labeled on the bottom axis. */
  markers?: readonly ChartMarker[];
  /** Keep 0 in the middle of the vertical axis. */
  centerZero?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const svgH = height != null ? Math.max(1, height - LABEL_H * 2) : HEIGHT;
  const points = series.flatMap((item) => item.points);
  if (points.length < 2) return <View style={{ height: height ?? HEIGHT }} />;

  const xMin = Math.min(...points.map((point) => point.x));
  const xMax = Math.max(...points.map((point) => point.x));
  const rawMin = Math.min(...points.map((point) => point.y));
  const rawMax = Math.max(...points.map((point) => point.y));
  const domain = centerZero ? centeredDomain(rawMin, rawMax) : { min: rawMin, max: rawMax };
  const yMin = domain.min;
  const yMax = domain.max;
  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 1;
  const plotW = Math.max(1, width - PAD_LEFT - PAD_RIGHT);
  const plotH = svgH - PAD_TOP - PAD_BOTTOM;

  const toX = (x: number) => PAD_LEFT + ((x - xMin) / xSpan) * plotW;
  const toY = (y: number) => PAD_TOP + plotH - ((y - yMin) / ySpan) * plotH;
  const drawnMarkers = markers.filter((marker) => marker.x >= xMin && marker.x <= xMax);
  const xTicks = axisTicks(xMin, xMax, TICKS).filter((tick) =>
    drawnMarkers.every((marker) => Math.abs(marker.x - tick) > xSpan * 0.06),
  );
  const yTicks = axisTicks(yMin, yMax, TICKS);

  return (
    <View style={height != null ? { height } : undefined} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <Text style={caption} numberOfLines={1}>
        {yLabel}
      </Text>
      {width > 0 ? (
        <Svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`}>
          {yTicks.map((tick, index) => (
            <Line
              key={`grid-y-${index}`}
              x1={PAD_LEFT}
              y1={toY(tick)}
              x2={PAD_LEFT + plotW}
              y2={toY(tick)}
              stroke={centerZero && tick === 0 ? colors.muted : colors.border}
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
          {drawnMarkers.map((marker) => (
            <Line
              key={`sector-${marker.label}`}
              x1={toX(marker.x)}
              y1={PAD_TOP}
              x2={toX(marker.x)}
              y2={PAD_TOP + plotH}
              stroke={colors.muted}
              strokeWidth={1}
              strokeDasharray="4 3"
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
          {drawnMarkers.map((marker) => {
            const x = toX(marker.x);
            const anchor = textAnchor(x, PAD_LEFT, PAD_LEFT + plotW);
            return (
              <SvgText
                key={`sector-top-${marker.label}`}
                x={x}
                y={11}
                fill={colors.text}
                fontSize={9}
                textAnchor={anchor}
              >
                {marker.label}
              </SvgText>
            );
          })}
          {drawnMarkers.map((marker) => {
            const x = toX(marker.x);
            return (
              <SvgText
                key={`sector-bottom-${marker.label}`}
                x={x}
                y={svgH - 6}
                fill={colors.muted}
                fontSize={8}
                textAnchor={textAnchor(x, PAD_LEFT, PAD_LEFT + plotW)}
              >
                {formatTick(marker.x)}
              </SvgText>
            );
          })}
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
      <Text style={caption} numberOfLines={1}>
        {xLabel}
      </Text>
    </View>
  );
}

const caption = { color: colors.muted, fontSize: 11, lineHeight: LABEL_H };

function textAnchor(x: number, left: number, right: number): "start" | "middle" | "end" {
  if (x < left + 14) return "start";
  if (x > right - 14) return "end";
  return "middle";
}

function formatTick(value: number): string {
  if (value === 0) return "0";
  if (Math.abs(value) >= 100) return String(Math.round(value));
  if (Math.abs(value) >= 10) return value.toFixed(0);
  return value.toFixed(2);
}
