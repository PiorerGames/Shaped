import React, { useMemo, useState } from "react";
import { View, StyleSheet, Dimensions, Platform, useWindowDimensions } from "react-native";
import { Text, SegmentedButtons, useTheme } from "react-native-paper";
import { LineChart } from "react-native-chart-kit";
import { Measurement } from "@/types/database.type";

// Suppress known web SVG warnings from react-native-chart-kit
if (Platform.OS === "web") {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("transform-origin") ||
        args[0].includes("onStartShouldSetResponder") ||
        args[0].includes("onResponderTerminationRequest") ||
        args[0].includes("onResponderGrant") ||
        args[0].includes("onResponderMove") ||
        args[0].includes("onResponderRelease") ||
        args[0].includes("onResponderTerminate") ||
        args[0].includes("onPress"))
    ) {
      return;
    }
    originalError(...args);
  };
}

type Props = {
  measurements: Measurement[];
  type: string;
};

function kgToLbs(v: number) { return v * 2.2046226218; }
function lbsToKg(v: number) { return v / 2.2046226218; }
function cmToIn(v: number) { return v * 0.3937007874; }
function inToCm(v: number) { return v / 0.3937007874; }
function cmToFt(v: number) { return v / 30.48; }
function ftToCm(v: number) { return v * 30.48; }
function inToFt(v: number) { return v / 12; }
function ftToIn(v: number) { return v * 12; }

export default function MeasurementChart({ measurements, type }: Props) {
  const theme = useTheme();
  const [unitSystem, setUnitSystem] = useState<"european" | "american">("european");
  const windowDimensions = useWindowDimensions();
  
  // Calculate responsive dimensions
  const chartWidth = Math.min(windowDimensions.width - 32, 800);
  const chartHeight = windowDimensions.width > 900 ? 280 : 220;

  // Filter measurements for this type and sort by date
  const dataPoints = useMemo(() => {
    const list = measurements
      .filter(m => m.type === type)
      .map(m => ({
        date: new Date((m as any)["$createdAt"] || m.$createdAt || m.$updatedAt),
        value: m.value,
        unit: m.unit,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return list;
  }, [measurements, type]);

  if (!dataPoints.length) return null;

  // compute target unit and button labels
  const getUnitInfo = () => {
    const sampleUnit = dataPoints[0].unit || "";
    if (type === "Weight") return { metric: "kg", imperial: "lbs", needsSelector: true };
    if (type === "Height") return { metric: "cm", imperial: "ft", needsSelector: true };
    // body parts use length
    const lengthTypes = ["Neck","Chest","Biceps","Waist","Hips","Thigh","Calf"];
    if (lengthTypes.includes(type)) return { metric: "cm", imperial: "in", needsSelector: true };
    if (type === "BodyFat") return { metric: "%", imperial: "%", needsSelector: false };
    return { metric: sampleUnit, imperial: sampleUnit, needsSelector: true };
  };

  const unitInfo = getUnitInfo();
  const targetUnit = unitSystem === "european" ? unitInfo.metric : unitInfo.imperial;

  // Prepare data with time-proportional spacing using interpolation
  const { chartData, labels } = useMemo(() => {
    if (dataPoints.length === 0) return { chartData: { labels: [], datasets: [{ data: [] }] }, labels: [] };
    if (dataPoints.length === 1) {
      const converted = convertValue(dataPoints[0].value, dataPoints[0].unit, targetUnit);
      return {
        chartData: { labels: [formatDateLabel(dataPoints[0].date)], datasets: [{ data: [converted] }] },
        labels: [formatDateLabel(dataPoints[0].date)]
      };
    }

    // Convert values
    const convertedPoints = dataPoints.map(p => ({
      date: p.date,
      value: convertValue(p.value, p.unit, targetUnit),
      timestamp: p.date.getTime()
    }));

    // Calculate time span and create proportional points
    const minTime = convertedPoints[0].timestamp;
    const maxTime = convertedPoints[convertedPoints.length - 1].timestamp;
    const timeRange = maxTime - minTime;
    
    // Target number of display points (more for better proportionality)
    const targetPoints = Math.max(dataPoints.length * 3, 20);
    const timeStep = timeRange / (targetPoints - 1);
    
    const interpolatedData: number[] = [];
    const interpolatedLabels: string[] = [];
    
    for (let i = 0; i < targetPoints; i++) {
      const currentTime = minTime + (i * timeStep);
      
      // Find surrounding real data points
      let beforeIdx = 0;
      let afterIdx = convertedPoints.length - 1;
      
      for (let j = 0; j < convertedPoints.length - 1; j++) {
        if (convertedPoints[j].timestamp <= currentTime && convertedPoints[j + 1].timestamp >= currentTime) {
          beforeIdx = j;
          afterIdx = j + 1;
          break;
        }
      }
      
      // Linear interpolation
      const before = convertedPoints[beforeIdx];
      const after = convertedPoints[afterIdx];
      const timeDiff = after.timestamp - before.timestamp;
      const ratio = timeDiff === 0 ? 0 : (currentTime - before.timestamp) / timeDiff;
      const interpolatedValue = before.value + (after.value - before.value) * ratio;
      
      interpolatedData.push(parseFloat(interpolatedValue.toFixed(2)));
      
      // Show labels only at real data points
      let label = "";
      const tolerance = timeStep / 2;
      for (const point of convertedPoints) {
        if (Math.abs(point.timestamp - currentTime) < tolerance) {
          label = formatDateLabel(point.date);
          break;
        }
      }
      interpolatedLabels.push(label);
    }
    
    return {
      chartData: { labels: interpolatedLabels, datasets: [{ data: interpolatedData }] },
      labels: interpolatedLabels
    };
  }, [dataPoints, targetUnit]);

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

  // Format date labels
  function formatDateLabel(date: Date): string {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}.${month}`;
  }

  // Format Y axis labels for feet+inches if applicable
  function formatYLabel(value: string): string {
    const v = parseFloat(value);
    if (Number.isNaN(v)) return value;
    if (type === "Height" && targetUnit === "ft") {
      const feet = Math.floor(v);
      let inches = Math.round((v - feet) * 12);
      if (inches === 12) return `${feet + 1}'0\"`;
      return `${feet}'${inches}\"`;
    }
    return value;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, padding: 12, borderRadius: 12, overflow: "hidden" }] }>
      <View style={styles.headerRow}>
        <Text variant="titleSmall" style={{fontSize: 24, margin: 8, padding: 8}}>{type}</Text>
        {unitInfo.needsSelector ? (
          <SegmentedButtons
            value={unitSystem}
            onValueChange={(v) => setUnitSystem(v as any)}
            buttons={[
              { value: "european", label: unitInfo.metric },
              { value: "american", label: unitInfo.imperial },
            ]}
            style={styles.segment}
          />
        ) : (
          <Text variant="headlineSmall" style={{ marginRight: 16, fontWeight: "600", fontSize: 24 }}>%</Text>
        )}
      </View>

      <View style={{ position: "relative", borderRadius: 8, overflow: "hidden" }}>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={chartHeight}
          formatYLabel={formatYLabel}
          chartConfig={{
            backgroundGradientFrom: theme.colors.surface,
            backgroundGradientTo: theme.colors.surface,
            backgroundGradientFromOpacity: 0,
            backgroundGradientToOpacity: 0,
            fillShadowGradient: "transparent",
            fillShadowGradientOpacity: 0,
            color: (opacity = 1) => `rgba(33,150,243, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255,255,255, ${opacity})`,
            decimalPlaces: 2,
            propsForDots: {
              r: "0", // Hide all dots since we have interpolated points
            },
            propsForBackgroundLines: {
              stroke: "rgba(255,255,255,0.06)",
            },
          }}
          bezier
          style={{ borderRadius: 8, backgroundColor: "transparent", marginBottom: 20 }}
          withDots={false}
        />
        <View style={{ position: "absolute", bottom: 0, left: 4, paddingHorizontal: 6, paddingVertical: 3, backgroundColor: "rgba(42,42,42,0.9)", borderRadius: 4 }}>
          <Text variant="labelSmall" style={{ color: "rgba(255,255,255,0.7)", fontSize: 10 }}>Date</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 16, paddingBottom: 8 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8},
  segment: { width: 150 }
});
