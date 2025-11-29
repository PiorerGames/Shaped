import { StyleSheet, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, Card, Chip, useTheme } from "react-native-paper";
import { useState, useEffect } from "react";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { useUnits } from "@/lib/unit-context";
import {
  DATABASE_ID,
  databases,
  WORKOUT_SESSIONS_TABLE_ID,
  EXERCISE_SETS_TABLE_ID,
} from "@/lib/appwrite";
import { Query } from "react-native-appwrite";
import { WorkoutSession, ExerciseSet } from "@/types/database.type";

export default function WorkoutHistory() {
  const { sessionId } = useLocalSearchParams();
  const { user } = useAuth();
  const theme = useTheme();
  const { useMetricUnits } = useUnits();
  const [workout, setWorkout] = useState<WorkoutSession | null>(null);
  const [exerciseSets, setExerciseSets] = useState<ExerciseSet[]>([]);
  const [prSets, setPRSets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      fetchWorkoutDetails();
    }
  }, [sessionId]);

  const fetchWorkoutDetails = async () => {
    try {
      setLoading(true);

      // Fetch workout session
      const workoutDoc = await databases.getDocument(
        DATABASE_ID,
        WORKOUT_SESSIONS_TABLE_ID,
        sessionId as string
      );
      setWorkout(workoutDoc as unknown as WorkoutSession);

      // Fetch all exercise sets for this session
      const setsResponse = await databases.listDocuments(
        DATABASE_ID,
        EXERCISE_SETS_TABLE_ID,
        [
          Query.equal("session_id", sessionId as string),
          Query.orderAsc("exercise_name"),
          Query.orderAsc("set_number"),
        ]
      );
      setExerciseSets(setsResponse.documents as unknown as ExerciseSet[]);

      // Detect PRs for this workout
      await detectPRs(
        workoutDoc.$createdAt,
        setsResponse.documents as unknown as ExerciseSet[]
      );
    } catch (error) {
      console.error("Failed to fetch workout details:", error);
    } finally {
      setLoading(false);
    }
  };

  const detectPRs = async (workoutDate: string, sets: ExerciseSet[]) => {
    try {
      const prSetIds = new Set<string>();
      const exerciseIds = [...new Set(sets.map((s) => s.exercise_id))];

      for (const exerciseId of exerciseIds) {
        // Get all completed sets for this exercise before this workout
        const historicalSets = await databases.listDocuments(
          DATABASE_ID,
          EXERCISE_SETS_TABLE_ID,
          [
            Query.equal("user_id", user?.$id ?? ""),
            Query.equal("exercise_id", exerciseId),
            Query.equal("is_completed", true),
            Query.lessThan("$createdAt", workoutDate),
            Query.orderDesc("weight"),
            Query.limit(1),
          ]
        );

        const previousPR =
          historicalSets.documents.length > 0
            ? (historicalSets.documents[0] as unknown as ExerciseSet).weight
            : 0;

        // Check which sets in this workout beat the previous PR
        sets
          .filter((s) => s.exercise_id === exerciseId && s.is_completed)
          .forEach((set) => {
            if (set.weight > previousPR) {
              prSetIds.add(set.$id);
            }
          });
      }

      setPRSets(prSetIds);
    } catch (error) {
      console.error("Failed to detect PRs:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDuration = (minutes?: number) => {
    console.log("Duration value:", minutes, "Type:", typeof minutes);
    if (minutes === undefined || minutes === null) return "N/A";
    if (minutes === 0) return "< 1m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Group sets by exercise
  const exerciseGroups = exerciseSets.reduce((acc, set) => {
    if (!acc[set.exercise_name]) {
      acc[set.exercise_name] = [];
    }
    acc[set.exercise_name].push(set);
    return acc;
  }, {} as Record<string, ExerciseSet[]>);

  const styles = createStyles(theme);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <Text>Loading workout details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!workout) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <Text>Workout not found</Text>
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
            {workout.workout_name}
          </Text>
          <Text variant="bodyLarge" style={styles.date}>
            {formatDate(workout.date)}
          </Text>
        </View>

        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.summaryTitle}>
              Workout Summary
            </Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Duration
                </Text>
                <Text variant="titleLarge" style={styles.statValue}>
                  {formatDuration(workout.duration_minutes)}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Total Volume
                </Text>
                <Text variant="titleLarge" style={styles.statValue}>
                  {workout.total_volume?.toLocaleString() || "0"}{" "}
                  {useMetricUnits ? "kg" : "lbs"}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Exercises
                </Text>
                <Text variant="titleLarge" style={styles.statValue}>
                  {Object.keys(exerciseGroups).length}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Total Sets
                </Text>
                <Text variant="titleLarge" style={styles.statValue}>
                  {exerciseSets.filter((s) => s.is_completed).length}
                </Text>
              </View>
              {prSets.size > 0 && (
                <View style={styles.statBox}>
                  <Text variant="bodySmall" style={styles.statLabel}>
                    🏆 Personal Records
                  </Text>
                  <Text
                    variant="titleLarge"
                    style={[styles.statValue, styles.prStatValue]}
                  >
                    {prSets.size}
                  </Text>
                </View>
              )}
            </View>
            {workout.notes && (
              <View style={styles.notesContainer}>
                <Text variant="bodySmall" style={styles.notesLabel}>
                  Notes:
                </Text>
                <Text variant="bodyMedium">{workout.notes}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        <Text variant="titleLarge" style={styles.sectionTitle}>
          Exercises
        </Text>

        {Object.keys(exerciseGroups).length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>No exercises logged</Text>
            </Card.Content>
          </Card>
        ) : (
          Object.entries(exerciseGroups).map(([exerciseName, sets]) => (
            <Card key={exerciseName} style={styles.exerciseCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.exerciseName}>
                  {exerciseName}
                </Text>
                <View style={styles.setsContainer}>
                  {sets.map((set) => {
                    const isPR = prSets.has(set.$id);
                    return (
                      <View
                        key={set.$id}
                        style={[styles.setRow, isPR && styles.setRowPR]}
                      >
                        <View style={styles.setNumber}>
                          {set.is_warmup ? (
                            <Chip
                              mode="outlined"
                              compact
                              style={styles.warmupChip}
                            >
                              W
                            </Chip>
                          ) : (
                            <Text
                              variant="bodyMedium"
                              style={styles.setNumberText}
                            >
                              {set.set_number}
                            </Text>
                          )}
                        </View>
                        <View style={styles.setDetails}>
                          <Text variant="bodyLarge" style={styles.setWeight}>
                            {set.weight} {set.weight_unit}
                          </Text>
                          <Text variant="bodyMedium" style={styles.setReps}>
                            × {set.reps} reps
                          </Text>
                        </View>
                        {set.rpe && (
                          <View style={styles.rpeContainer}>
                            <Text variant="bodySmall" style={styles.rpeLabel}>
                              RPE
                            </Text>
                            <Text variant="bodyMedium" style={styles.rpeValue}>
                              {set.rpe}
                            </Text>
                          </View>
                        )}
                        {!set.is_completed && (
                          <Chip
                            mode="outlined"
                            compact
                            style={styles.skippedChip}
                          >
                            Skipped
                          </Chip>
                        )}
                        {isPR && (
                          <Chip
                            mode="flat"
                            compact
                            style={styles.prChip}
                            textStyle={styles.prChipText}
                          >
                            PR 🏆
                          </Chip>
                        )}
                      </View>
                    );
                  })}
                </View>
                {sets.some((s) => s.notes) && (
                  <View style={styles.exerciseNotesContainer}>
                    {sets
                      .filter((s) => s.notes)
                      .map((set) => (
                        <Text
                          key={set.$id}
                          variant="bodySmall"
                          style={styles.exerciseNotes}
                        >
                          Set {set.set_number}: {set.notes}
                        </Text>
                      ))}
                  </View>
                )}
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
      marginBottom: 4,
    },
    date: {
      color: theme.colors.onSurfaceVariant,
    },
    summaryCard: {
      backgroundColor: theme.colors.elevation.level1,
      marginBottom: 24,
    },
    summaryTitle: {
      color: theme.colors.onSurface,
      marginBottom: 16,
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
    prStatValue: {
      color: "#FFD700",
    },
    notesContainer: {
      marginTop: 16,
      padding: 12,
      backgroundColor: theme.colors.elevation.level2,
      borderRadius: 8,
    },
    notesLabel: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: 4,
    },
    sectionTitle: {
      color: theme.colors.onSurface,
      fontWeight: "bold",
      marginBottom: 12,
    },
    emptyCard: {
      backgroundColor: theme.colors.elevation.level1,
    },
    emptyText: {
      color: theme.colors.onSurfaceVariant,
      textAlign: "center",
    },
    exerciseCard: {
      backgroundColor: theme.colors.elevation.level1,
      marginBottom: 12,
    },
    exerciseName: {
      color: theme.colors.onSurface,
      fontWeight: "bold",
      marginBottom: 12,
    },
    setsContainer: {
      gap: 8,
    },
    setRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: 8,
      backgroundColor: theme.colors.elevation.level2,
      borderRadius: 8,
      gap: 12,
    },
    setRowPR: {
      backgroundColor: "rgba(255, 215, 0, 0.15)",
      borderColor: "#FFD700",
      borderWidth: 1,
    },
    setNumber: {
      width: 40,
      alignItems: "center",
    },
    setNumberText: {
      color: theme.colors.primary,
      fontWeight: "bold",
      fontSize: 18,
    },
    warmupChip: {
      backgroundColor: theme.colors.elevation.level3,
    },
    setDetails: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    setWeight: {
      color: theme.colors.onSurface,
      fontWeight: "bold",
    },
    setReps: {
      color: theme.colors.onSurfaceVariant,
    },
    rpeContainer: {
      alignItems: "center",
      paddingHorizontal: 8,
    },
    rpeLabel: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 10,
    },
    rpeValue: {
      color: theme.colors.onSurface,
      fontWeight: "bold",
    },
    skippedChip: {
      backgroundColor: theme.colors.elevation.level3,
    },
    prChip: {
      backgroundColor: "#FFD700",
    },
    prChipText: {
      color: "#000000",
      fontWeight: "bold",
      fontSize: 11,
    },
    exerciseNotesContainer: {
      marginTop: 8,
      padding: 8,
      backgroundColor: theme.colors.elevation.level3,
      borderRadius: 4,
    },
    exerciseNotes: {
      color: theme.colors.onSurfaceVariant,
      fontStyle: "italic",
    },
  });
