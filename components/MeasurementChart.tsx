import React, { useMemo } from "react";
import { View, StyleSheet, useWindowDimensions, Pressable } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { LineChart, Grid, YAxis, XAxis } from "react-native-svg-charts";
import { Text as SvgText } from "react-native-svg";
import { Measurement } from "@/types/database.type";
import { useUnits } from "@/lib/unit-context";

type Props = {
  measurements: Measurement[];
  type: string;
  onPress?: () => void;
};

function kgToLbs(v: number) {
  return v * 2.2046226218;
}
function lbsToKg(v: number) {
  return v / 2.2046226218;
}
function cmToIn(v: number) {
  return v * 0.3937007874;
}
function inToCm(v: number) {
  return v / 0.3937007874;
}
function cmToFt(v: number) {
  return v / 30.48;
}
function ftToCm(v: number) {
  return v * 30.48;
}
function inToFt(v: number) {
  return v / 12;
}
function ftToIn(v: number) {
  return v * 12;
}

export default function MeasurementChart({
  measurements,
  type,
  onPress,
}: Props) {
  const theme = useTheme();
  const { useMetricUnits } = useUnits();
  const windowDimensions = useWindowDimensions();

  const chartHeight = windowDimensions.width > 900 ? 280 : 220;

  // Filter measurements for this type and sort by date
  const dataPoints = useMemo(() => {
    const list = measurements
      .filter((m) => m.type === type)
      .map((m) => ({
        date: new Date(
          (m as any)["$createdAt"] || m.$createdAt || m.$updatedAt
        ),
        value: m.value,
        unit: m.unit,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return list;
  }, [measurements, type]);

  if (!dataPoints.length) return null;

  const getUnitInfo = () => {
    const sampleUnit = dataPoints[0].unit || "";
    if (type === "Weight") return { metric: "kg", imperial: "lbs" };
    if (type === "Height") return { metric: "cm", imperial: "ft" };
    const lengthTypes = [
      "Neck",
      "Chest",
      "Biceps",
      "Waist",
      "Hips",
      "Thigh",
      "Calf",
    ];
    if (lengthTypes.includes(type)) return { metric: "cm", imperial: "in" };
    if (type === "BodyFat") return { metric: "%", imperial: "%" };
    return { metric: sampleUnit, imperial: sampleUnit };
  };

  const unitInfo = getUnitInfo();
  const targetUnit = useMetricUnits ? unitInfo.metric : unitInfo.imperial;

  // Helper to convert values
  function convertValue(v: number, fromUnit: string, toUnit: string): number {
    if (fromUnit === toUnit) return v;
    if (fromUnit === "kg" && toUnit === "lbs") return kgToLbs(v);
    if (fromUnit === "lbs" && toUnit === "kg") return lbsToKg(v);
    if (fromUnit === "cm" && toUnit === "in") return cmToIn(v);
    if (fromUnit === "in" && toUnit === "cm") return inToCm(v);
    if (fromUnit === "cm" && toUnit === "ft") return cmToFt(v);
    if (fromUnit === "ft" && toUnit === "cm") return ftToCm(v);
    if (fromUnit === "in" && toUnit === "ft") return inToFt(v);
    if (fromUnit === "ft" && toUnit === "in") return ftToIn(v);
    return v;
  }

  // Prepare chart data with time-based positioning
  const { chartData, xAxisData, yValues, minY, maxY } = useMemo(() => {
    // Convert values to target unit
    const convertedPoints = dataPoints.map((p) => ({
      date: p.date,
      value: convertValue(p.value, p.unit, targetUnit),
      timestamp: p.date.getTime(),
    }));

    const minTime = convertedPoints[0].timestamp;
    const maxTime = convertedPoints[convertedPoints.length - 1].timestamp;
    const timeRange = maxTime - minTime;

    // Map each data point to a position from 0 to 1 based on time
    const data = convertedPoints.map((p) => ({
      x: timeRange === 0 ? 0 : (p.timestamp - minTime) / timeRange,
      y: p.value,
      date: p.date,
    }));

    // Create evenly spaced X-axis labels (not tied to data points)
    const numLabels = 5;
    const xAxis = Array.from({ length: numLabels }, (_, i) => {
      const position = i / (numLabels - 1); // 0 to 1
      const timestamp = minTime + position * timeRange;
      const date = new Date(timestamp);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");

      return {
        x: position,
        label: `${day}.${month}`,
      };
    });

    // Get unique Y values for grid
    const uniqueYValues = Array.from(new Set(data.map((d) => d.y))).sort(
      (a, b) => a - b
    );

    // Calculate min and max for consistent scaling
    const minY = Math.min(...data.map((d) => d.y));
    const maxY = Math.max(...data.map((d) => d.y));

    return {
      chartData: data,
      xAxisData: xAxis,
      yValues: uniqueYValues,
      minY,
      maxY,
    };
  }, [dataPoints, targetUnit]);

  // Format Y axis label
  function formatYLabel(value: number): string {
    if (type === "Height" && targetUnit === "ft") {
      const feet = Math.floor(value);
      let inches = Math.round((value - feet) * 12);
      if (inches === 12) return `${feet + 1}'0\"`;
      return `${feet}'${inches}\"`;
    }
    return value.toFixed(2);
  }

  // Check if high contrast mode
  const isHighContrast =
    theme.colors.primary === "#ffffff" || theme.colors.primary === "#FFFFFF";
  const lineColor = isHighContrast ? "#ffffff" : theme.colors.primary;

  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.surface,
            padding: 16,
            borderRadius: 12,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Text variant="titleSmall" style={{ fontSize: 24, margin: 8 }}>
            {type}
          </Text>
          <Text
            variant="bodyLarge"
            style={{
              marginRight: 16,
              fontWeight: "600",
              fontSize: 18,
              color: theme.colors.onSurface,
            }}
          >
            {targetUnit}
          </Text>
        </View>

        <View
          style={{
            height: chartHeight,
            flexDirection: "row",
            paddingVertical: 20,
          }}
        >
          {/* Y Axis */}
          <YAxis
            data={yValues}
            contentInset={{ top: 20, bottom: 20 }}
            svg={{
              fill: theme.colors.onSurface,
              fontSize: 10,
            }}
            min={minY}
            max={maxY}
            numberOfTicks={yValues.length}
            formatLabel={(value: any) => {
              const matchesDataValue = yValues.some(
                (yVal: number) => Math.abs(yVal - value) < 0.01
              );
              return matchesDataValue ? formatYLabel(value) : "";
            }}
            style={{ marginRight: 10 }}
          />

          {/* Chart */}
          <View style={{ flex: 1 }}>
            <LineChart
              style={{ flex: 1 }}
              data={chartData}
              contentInset={{ top: 20, bottom: 20, left: 20, right: 20 }}
              svg={{
                stroke: lineColor,
                strokeWidth: 3,
              }}
              yMin={minY}
              yMax={maxY}
              xAccessor={({ item }: any) => item.x}
              yAccessor={({ item }: any) => item.y}
            >
              <Grid
                svg={{
                  stroke: theme.colors.outline,
                  strokeOpacity: 0.2,
                }}
                direction={Grid.Direction.HORIZONTAL}
                ticks={yValues}
              />
            </LineChart>

            {/* X Axis */}
            <XAxis
              data={xAxisData}
              xAccessor={({ item }: any) => item.x}
              formatLabel={(value: any, index: any) =>
                xAxisData[index]?.label || ""
              }
              contentInset={{ left: 20, right: 20 }}
              svg={{
                fill: theme.colors.onSurface,
                fontSize: 10,
              }}
              style={{ marginTop: 10 }}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 16, paddingBottom: 8 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
});
