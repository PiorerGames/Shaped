import React, { useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import {
  Modal,
  Portal,
  Text,
  IconButton,
  useTheme,
  Card,
  DataTable,
} from "react-native-paper";
import { Measurement } from "@/types/database.type";
import { useUnits } from "@/lib/unit-context";
import { databases, DATABASE_ID, MEASUREMENTS_TABLE_ID } from "@/lib/appwrite";
import { useCustomAlert } from "@/components/CustomAlert";

type Props = {
  visible: boolean;
  onDismiss: () => void;
  measurements: Measurement[];
  type: string;
  onRefresh?: () => void;
};

const MEASUREMENT_DESCRIPTIONS: Record<string, string> = {
  Weight:
    "Track your body weight over time to monitor progress towards your fitness goals.",
  Height: "Monitor your height measurements.",
  Neck: "Measure the circumference of your neck at its narrowest point.",
  Shoulders:
    "Measure across the widest part of your shoulders from bone to bone.",
  Chest:
    "Measure around the fullest part of your chest, keeping the tape parallel to the floor.",
  "Left Bicep":
    "Measure around the fullest part of your left bicep when flexed.",
  "Right Bicep":
    "Measure around the fullest part of your right bicep when flexed.",
  "Left Forearm": "Measure around the fullest part of your left forearm.",
  "Right Forearm": "Measure around the fullest part of your right forearm.",
  Waist:
    "Measure around your natural waistline, typically at the narrowest point above your belly button.",
  Hips: "Measure around the widest part of your hips and buttocks.",
  "Left Thigh": "Measure around the fullest part of your left thigh.",
  "Right Thigh": "Measure around the fullest part of your right thigh.",
  "Left Calf": "Measure around the fullest part of your left calf.",
  "Right Calf": "Measure around the fullest part of your right calf.",
};

function kgToLbs(v: number) {
  return v * 2.2046226218;
}
function cmToIn(v: number) {
  return v * 0.3937007874;
}

export default function MeasurementDetailsModal({
  visible,
  onDismiss,
  measurements,
  type,
  onRefresh,
}: Props) {
  const theme = useTheme();
  const { useMetricUnits } = useUnits();
  const { showAlert, AlertComponent } = useCustomAlert();

  const dataPoints = useMemo(() => {
    return measurements
      .filter((m) => m.type === type)
      .map((m) => ({
        date: new Date(m.$createdAt || m.$updatedAt),
        value: m.value,
        unit: m.unit,
        id: m.$id,
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Most recent first
  }, [measurements, type]);

  const formatValue = (value: number, unit: string) => {
    if (type === "Weight") {
      if (useMetricUnits) {
        return unit === "kg"
          ? `${value.toFixed(1)} kg`
          : `${(value / 2.2046226218).toFixed(1)} kg`;
      } else {
        return unit === "lbs"
          ? `${value.toFixed(1)} lbs`
          : `${kgToLbs(value).toFixed(1)} lbs`;
      }
    } else if (type === "Height") {
      if (useMetricUnits) {
        return unit === "cm"
          ? `${value.toFixed(1)} cm`
          : `${(value * 30.48).toFixed(1)} cm`;
      } else {
        const totalInches = unit === "ft" ? value * 12 : value / 0.3937007874;
        const feet = Math.floor(totalInches / 12);
        const inches = Math.round(totalInches % 12);
        return `${feet}'${inches}"`;
      }
    } else {
      // Body parts
      if (useMetricUnits) {
        return unit === "cm"
          ? `${value.toFixed(1)} cm`
          : `${(value / 0.3937007874).toFixed(1)} cm`;
      } else {
        return unit === "in"
          ? `${value.toFixed(1)} in`
          : `${cmToIn(value).toFixed(1)} in`;
      }
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDelete = async (id: string, dateStr: string) => {
    showAlert(
      "Delete Measurement",
      `Are you sure you want to delete the measurement from ${dateStr}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await databases.deleteDocument(
                DATABASE_ID,
                MEASUREMENTS_TABLE_ID,
                id
              );
              if (onRefresh) {
                onRefresh();
              }
              showAlert("Success", "Measurement deleted");
            } catch (error) {
              console.error("Failed to delete measurement:", error);
              showAlert("Error", "Failed to delete measurement");
            }
          },
        },
      ]
    );
  };

  const description =
    MEASUREMENT_DESCRIPTIONS[type] || "Track this measurement over time.";

  const styles = createStyles(theme);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContent}
      >
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            {type}
          </Text>
          <IconButton
            icon="close"
            size={24}
            onPress={onDismiss}
            style={styles.closeButton}
          />
        </View>

        <ScrollView style={styles.scrollView}>
          <Card style={styles.descriptionCard}>
            <Card.Content>
              <Text variant="bodyMedium" style={styles.description}>
                {description}
              </Text>
            </Card.Content>
          </Card>

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Measurement History ({dataPoints.length})
          </Text>

          {dataPoints.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>
                  No measurements recorded yet.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <Card style={styles.tableCard}>
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title>Date</DataTable.Title>
                  <DataTable.Title numeric>Value</DataTable.Title>
                  <DataTable.Title style={{ flex: 0, width: 50 }}>
                    {" "}
                  </DataTable.Title>
                </DataTable.Header>

                {dataPoints.map((point) => (
                  <DataTable.Row key={point.id}>
                    <DataTable.Cell>{formatDate(point.date)}</DataTable.Cell>
                    <DataTable.Cell numeric>
                      {formatValue(point.value, point.unit)}
                    </DataTable.Cell>
                    <DataTable.Cell style={{ flex: 0, width: 50 }}>
                      <IconButton
                        icon="delete"
                        iconColor={theme.colors.error}
                        size={20}
                        onPress={() =>
                          handleDelete(point.id, formatDate(point.date))
                        }
                        style={{ margin: 0 }}
                      />
                    </DataTable.Cell>
                  </DataTable.Row>
                ))}
              </DataTable>
            </Card>
          )}
        </ScrollView>
        <AlertComponent />
      </Modal>
    </Portal>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    modalContent: {
      backgroundColor: theme.colors.surface,
      margin: 20,
      borderRadius: 16,
      maxHeight: "80%",
      maxWidth: 600,
      alignSelf: "center",
      width: "90%",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
    },
    title: {
      flex: 1,
      color: theme.colors.onSurface,
    },
    closeButton: {
      margin: 0,
    },
    scrollView: {
      maxHeight: 500,
    },
    descriptionCard: {
      margin: 16,
      marginBottom: 8,
      backgroundColor: theme.colors.elevation.level2,
    },
    description: {
      color: theme.colors.onSurfaceVariant,
    },
    sectionTitle: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
      color: theme.colors.onSurface,
    },
    tableCard: {
      margin: 16,
      marginTop: 8,
      backgroundColor: theme.colors.elevation.level1,
    },
    emptyCard: {
      margin: 16,
      marginTop: 8,
      backgroundColor: theme.colors.elevation.level2,
    },
    emptyText: {
      textAlign: "center",
      color: theme.colors.onSurfaceVariant,
    },
  });
