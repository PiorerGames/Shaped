import { StyleSheet, View, ScrollView } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { useEffect, useState } from "react";
import AddMeasurementModal from "@/components/AddMeasurementModal";
import MeasurementChart from "@/components/MeasurementChart";
import MeasurementDetailsModal from "@/components/MeasurementDetailsModal";
import { DATABASE_ID, databases, MEASUREMENTS_TABLE_ID } from "@/lib/appwrite";
import { Query } from "react-native-appwrite";
import { useAuth } from "@/lib/auth-context";
import { Measurement } from "@/types/database.type";
import { router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Measurements() {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  const { user } = useAuth();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);

  useEffect(() => {
    fetchMeasurements();
  }, [user]);

  const fetchMeasurements = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        MEASUREMENTS_TABLE_ID,
        [Query.equal("user_id", user?.$id ?? "")]
      );
      setMeasurements(response.documents as unknown as Measurement[]);
    } catch (error) {
      console.error("Failed to fetch measurements:", error);
    }
  };

  const types = Array.from(new Set(measurements.map((m) => m.type)));

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
        edges={["top", "left", "right"]}
      >
        <View
          style={[
            styles.container,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.header}>
              <Button
                mode="text"
                onPress={() => router.back()}
                icon="arrow-left"
                style={styles.backButton}
              >
                Back
              </Button>
              <Text variant="headlineMedium" style={styles.title}>
                Measurements
              </Text>
              <View style={{ width: 80 }} />
            </View>

            <Button
              mode="contained"
              onPress={() => setModalVisible(true)}
              style={styles.addButton}
              contentStyle={styles.buttonContent}
              icon="plus"
            >
              Add Measurement
            </Button>

            {measurements.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.colors.onSurfaceDisabled },
                  ]}
                >
                  No measurements found. Create a new one!
                </Text>
              </View>
            ) : (
              types.map((t) => (
                <MeasurementChart
                  key={t}
                  measurements={measurements}
                  type={t}
                  onPress={() => {
                    setSelectedType(t);
                    setDetailsVisible(true);
                  }}
                />
              ))
            )}

            <AddMeasurementModal
              visible={modalVisible}
              onDismiss={() => setModalVisible(false)}
              onMeasurementAdded={fetchMeasurements}
            />

            <MeasurementDetailsModal
              visible={detailsVisible}
              onDismiss={() => setDetailsVisible(false)}
              measurements={measurements}
              type={selectedType}
              onRefresh={fetchMeasurements}
            />
          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backButton: {
    marginLeft: -8,
  },
  title: {
    textAlign: "center",
  },
  addButton: {
    marginBottom: 24,
  },
  buttonContent: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
  },
});
