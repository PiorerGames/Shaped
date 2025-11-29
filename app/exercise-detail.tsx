import { StyleSheet, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, Card, Chip, useTheme } from "react-native-paper";
import { useState, useEffect } from "react";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { useUnits } from "@/lib/unit-context";
import { DATABASE_ID, databases, EXERCISE_SETS_TABLE_ID } from "@/lib/appwrite";
import { Query } from "react-native-appwrite";
import { ExerciseSet } from "@/types/database.type";

export default function ExerciseDetail() {
  const { exerciseId, exerciseName } = useLocalSearchParams();
  const { user } = useAuth();
  const theme = useTheme();
  const { useMetricUnits } = useUnits();
  const [exerciseSets, setExerciseSets] = useState<ExerciseSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [exerciseInfo, setExerciseInfo] = useState<any>(null);

  useEffect(() => {
    if (exerciseId) {
      fetchExerciseHistory();
      fetchExerciseInfo();
    }
  }, [exerciseId]);

  const fetchExerciseHistory = async () => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(
        DATABASE_ID,
        EXERCISE_SETS_TABLE_ID,
        [
          Query.equal("user_id", user?.$id ?? ""),
          Query.equal("exercise_id", exerciseId as string),
          Query.equal("is_completed", true),
          Query.orderDesc("$createdAt"),
          Query.limit(50),
        ]
      );
      setExerciseSets(response.documents as unknown as ExerciseSet[]);
    } catch (error) {
      console.error("Failed to fetch exercise history:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExerciseInfo = async () => {
    try {
      // Try to fetch exercise details from exercises table
      const response = await databases.listDocuments(DATABASE_ID, "exercises", [
        Query.equal("$id", exerciseId as string),
        Query.limit(1),
      ]);
      if (response.documents.length > 0) {
        setExerciseInfo(response.documents[0]);
      }
    } catch (error) {
      console.log("Exercise info not available");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Calculate statistics
  const maxWeight =
    exerciseSets.length > 0
      ? Math.max(...exerciseSets.map((s) => s.weight))
      : 0;
  const totalVolume = exerciseSets.reduce(
    (sum, set) => sum + set.weight * set.reps,
    0
  );
  const totalSets = exerciseSets.length;
  const averageReps =
    totalSets > 0
      ? Math.round(
          exerciseSets.reduce((sum, set) => sum + set.reps, 0) / totalSets
        )
      : 0;

  // Group sets by session (date)
  const sessionGroups: { [key: string]: ExerciseSet[] } = {};
  exerciseSets.forEach((set) => {
    const dateKey = formatDate(set.$createdAt);
    if (!sessionGroups[dateKey]) {
      sessionGroups[dateKey] = [];
    }
    sessionGroups[dateKey].push(set);
  });

  const styles = createStyles(theme);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <Text>Loading exercise details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text
            variant="headlineSmall"
            style={styles.backButton}
            onPress={() => router.back()}
          >
            ← Back
          </Text>
          <Text variant="headlineMedium" style={styles.title}>
            {exerciseName || "Exercise Details"}
          </Text>
        </View>

        {exerciseInfo && (
          <Card style={styles.infoCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Description
              </Text>
              {exerciseInfo.instructions && (
                <Text variant="bodyMedium" style={styles.description}>
                  {exerciseInfo.instructions}
                </Text>
              )}
              {exerciseInfo.muscle_groups && (
                <View style={styles.musclesContainer}>
                  <Text variant="bodySmall" style={styles.musclesLabel}>
                    Muscle Groups:
                  </Text>
                  <View style={styles.chipsContainer}>
                    {exerciseInfo.muscle_groups.map(
                      (muscle: string, index: number) => (
                        <Chip key={index} mode="outlined" style={styles.chip}>
                          {muscle}
                        </Chip>
                      )
                    )}
                  </View>
                </View>
              )}
              {exerciseInfo.equipment && (
                <Text variant="bodySmall" style={styles.equipment}>
                  Equipment: {exerciseInfo.equipment}
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

        <Card style={styles.statsCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Statistics
            </Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Max Weight
                </Text>
                <Text variant="titleLarge" style={styles.statValue}>
                  {maxWeight} {useMetricUnits ? "kg" : "lbs"}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Total Volume
                </Text>
                <Text variant="titleLarge" style={styles.statValue}>
                  {totalVolume.toLocaleString()} {useMetricUnits ? "kg" : "lbs"}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Total Sets
                </Text>
                <Text variant="titleLarge" style={styles.statValue}>
                  {totalSets}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Avg Reps
                </Text>
                <Text variant="titleLarge" style={styles.statValue}>
                  {averageReps}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Text variant="titleLarge" style={styles.sectionTitle}>
          Weight History
        </Text>

        {Object.keys(sessionGroups).length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>
                No history yet. Complete some sets to see your progress!
              </Text>
            </Card.Content>
          </Card>
        ) : (
          Object.entries(sessionGroups).map(([date, sets]) => (
            <Card key={date} style={styles.sessionCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.sessionDate}>
                  {date}
                </Text>
                <View style={styles.setsGrid}>
                  {sets.map((set, index) => (
                    <View key={set.$id} style={styles.setItem}>
                      <Text variant="bodySmall" style={styles.setLabel}>
                        Set {set.set_number}
                      </Text>
                      <Text variant="bodyLarge" style={styles.setValue}>
                        {set.weight} {useMetricUnits ? "kg" : "lbs"} ×{" "}
                        {set.reps}
                      </Text>
                      {set.rpe && (
                        <Text variant="bodySmall" style={styles.rpeText}>
                          RPE: {set.rpe}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scroll: {
      padding: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    header: {
      marginBottom: 16,
    },
    backButton: {
      color: theme.colors.primary,
      marginBottom: 8,
    },
    title: {
      color: theme.colors.onSurface,
      fontWeight: "bold",
    },
    infoCard: {
      backgroundColor: theme.colors.elevation.level1,
      marginBottom: 16,
    },
    sectionTitle: {
      color: theme.colors.onSurface,
      fontWeight: "bold",
      marginBottom: 12,
    },
    description: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: 12,
      lineHeight: 20,
    },
    musclesContainer: {
      marginBottom: 12,
    },
    musclesLabel: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: 8,
    },
    chipsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      backgroundColor: theme.colors.elevation.level2,
    },
    equipment: {
      color: theme.colors.onSurfaceVariant,
    },
    statsCard: {
      backgroundColor: theme.colors.elevation.level1,
      marginBottom: 24,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    statBox: {
      flex: 1,
      minWidth: "45%",
      backgroundColor: theme.colors.elevation.level2,
      padding: 12,
      borderRadius: 8,
    },
    statLabel: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: 4,
    },
    statValue: {
      color: theme.colors.onSurface,
      fontWeight: "bold",
    },
    emptyCard: {
      backgroundColor: theme.colors.elevation.level1,
    },
    emptyText: {
      color: theme.colors.onSurfaceVariant,
      textAlign: "center",
    },
    sessionCard: {
      backgroundColor: theme.colors.elevation.level1,
      marginBottom: 12,
    },
    sessionDate: {
      color: theme.colors.onSurface,
      marginBottom: 12,
    },
    setsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    setItem: {
      backgroundColor: theme.colors.elevation.level2,
      padding: 12,
      borderRadius: 8,
      minWidth: "30%",
    },
    setLabel: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: 4,
    },
    setValue: {
      color: theme.colors.onSurface,
      fontWeight: "bold",
    },
    rpeText: {
      color: theme.colors.primary,
      marginTop: 4,
    },
  });
