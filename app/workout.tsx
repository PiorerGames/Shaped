import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Text,
  Card,
  Button,
  TextInput,
  IconButton,
  Chip,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useUnits } from "@/lib/unit-context";
import { useExerciseSelection } from "@/lib/exercise-selection-context";
import {
  DATABASE_ID,
  databases,
  WORKOUT_SESSIONS_TABLE_ID,
  EXERCISE_SETS_TABLE_ID,
  WORKOUT_TEMPLATES_TABLE_ID,
} from "@/lib/appwrite";
import { Query, ID } from "react-native-appwrite";
import {
  WorkoutSession,
  TemplateExercise,
  ExerciseSet,
} from "@/types/database.type";
import { router, Stack } from "expo-router";
import { ExerciseSearchResult } from "@/lib/exerciseAPI";
import { useCustomAlert } from "@/components/CustomAlert";

export default function ActiveWorkout() {
  const { user } = useAuth();
  const theme = useTheme();
  const { useMetricUnits } = useUnits();
  const { selectedExercise, setSelectedExercise } = useExerciseSelection();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [exerciseSets, setExerciseSets] = useState<{
    [key: string]: ExerciseSet[];
  }>({});
  const [exercisePRs, setExercisePRs] = useState<{
    [key: string]: number;
  }>({});
  const [newPRs, setNewPRs] = useState<{
    [key: string]: number;
  }>({});
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    loadActiveWorkout();
  }, []);

  const loadExercisePRs = async (exerciseIds: string[]) => {
    try {
      const prs: { [key: string]: number } = {};

      for (const exerciseId of exerciseIds) {
        // Get all completed sets for this exercise for the user
        const response = await databases.listDocuments(
          DATABASE_ID,
          EXERCISE_SETS_TABLE_ID,
          [
            Query.equal("user_id", user?.$id ?? ""),
            Query.equal("exercise_id", exerciseId),
            Query.equal("is_completed", true),
            Query.orderDesc("weight"),
            Query.limit(1),
          ]
        );

        if (response.documents.length > 0) {
          const maxWeightSet = response.documents[0] as unknown as ExerciseSet;
          prs[exerciseId] = maxWeightSet.weight || 0;
        } else {
          prs[exerciseId] = 0;
        }
      }

      // Merge with existing PRs instead of replacing
      setExercisePRs((prev) => ({ ...prev, ...prs }));
    } catch (error) {
      console.error("Failed to load exercise PRs:", error);
    }
  };

  useEffect(() => {
    if (selectedExercise) {
      handleAddExercise(selectedExercise);
      setSelectedExercise(null);
    }
  }, [selectedExercise]);

  useEffect(() => {
    if (session?.start_time) {
      const interval = setInterval(() => {
        const start = new Date(`${session.date}T${session.start_time}`);
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [session]);

  const loadActiveWorkout = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        WORKOUT_SESSIONS_TABLE_ID,
        [
          Query.equal("user_id", user?.$id ?? ""),
          Query.equal("is_active", true),
          Query.limit(1),
        ]
      );

      if (response.documents.length > 0) {
        const activeSession = response
          .documents[0] as unknown as WorkoutSession;
        setSession(activeSession);

        // Load template exercises if template_id exists
        if (activeSession.template_id) {
          const templateDoc = await databases.getDocument(
            DATABASE_ID,
            WORKOUT_TEMPLATES_TABLE_ID,
            activeSession.template_id
          );
          const exercisesData =
            typeof templateDoc.exercises === "string"
              ? JSON.parse(templateDoc.exercises)
              : templateDoc.exercises;
          setExercises(exercisesData);

          // Load PRs for template exercises
          const exerciseIds = exercisesData.map(
            (ex: TemplateExercise) => ex.exercise_id
          );
          await loadExercisePRs(exerciseIds);

          // Load existing sets first
          await loadExerciseSets(activeSession.$id);

          // Auto-create sets from template if no sets exist yet
          const existingSetsResponse = await databases.listDocuments(
            DATABASE_ID,
            EXERCISE_SETS_TABLE_ID,
            [Query.equal("session_id", activeSession.$id), Query.limit(1)]
          );

          if (existingSetsResponse.documents.length === 0) {
            // No sets exist, create them from template
            const newSetsMap: { [key: string]: ExerciseSet[] } = {};

            for (const exercise of exercisesData) {
              const numberOfSets =
                typeof exercise.sets === "number" ? exercise.sets : 3;
              const exerciseSetsArray: ExerciseSet[] = [];

              for (let i = 1; i <= numberOfSets; i++) {
                const newSet = await databases.createDocument(
                  DATABASE_ID,
                  EXERCISE_SETS_TABLE_ID,
                  ID.unique(),
                  {
                    user_id: user?.$id,
                    session_id: activeSession.$id,
                    exercise_id: exercise.exercise_id,
                    exercise_name: exercise.exercise_name,
                    set_number: i,
                    reps: Array.isArray(exercise.reps)
                      ? exercise.reps[i - 1] || 10
                      : exercise.reps,
                    weight: 0,
                    weight_unit: useMetricUnits ? "kg" : "lbs",
                    is_warmup: false,
                    is_completed: false,
                  }
                );
                exerciseSetsArray.push(newSet as unknown as ExerciseSet);
              }

              newSetsMap[exercise.exercise_id] = exerciseSetsArray;
            }

            setExerciseSets(newSetsMap);
          }
        } else {
          // Load existing sets for quick workout (no template)
          const loadedExercises = await loadExerciseSets(activeSession.$id);
          setExercises(loadedExercises);

          // Load PRs for loaded exercises
          const exerciseIds = loadedExercises.map((ex) => ex.exercise_id);
          await loadExercisePRs(exerciseIds);
        }
      } else {
        router.back();
      }
    } catch (error) {
      console.error("Failed to load active workout:", error);
      router.back();
    }
  };

  const loadExerciseSets = async (sessionId: string) => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        EXERCISE_SETS_TABLE_ID,
        [Query.equal("session_id", sessionId), Query.orderAsc("set_number")]
      );

      const setsMap: { [key: string]: ExerciseSet[] } = {};
      const exercisesMap: { [key: string]: TemplateExercise } = {};

      response.documents.forEach((doc) => {
        const set = doc as unknown as ExerciseSet;
        if (!setsMap[set.exercise_id]) {
          setsMap[set.exercise_id] = [];
          // Create a TemplateExercise from the first set of each exercise
          exercisesMap[set.exercise_id] = {
            exercise_id: set.exercise_id,
            exercise_name: set.exercise_name,
            sets: 0, // Will be updated with actual count
            reps: [], // Will be built from sets
            rest_seconds: 60,
          };
        }
        setsMap[set.exercise_id].push(set);
      });

      // Update the sets count and reps for each exercise
      Object.keys(exercisesMap).forEach((exerciseId) => {
        const sets = setsMap[exerciseId];
        exercisesMap[exerciseId].sets = sets.length;
        exercisesMap[exerciseId].reps = sets.map((s) => s.reps);
      });

      setExerciseSets(setsMap);

      // Return the exercises array for quick workouts
      return Object.values(exercisesMap);
    } catch (error) {
      console.error("Failed to load exercise sets:", error);
      return [];
    }
  };

  const handleAddSet = async (
    exercise: TemplateExercise,
    setNumber: number
  ) => {
    if (!session) return;

    try {
      const newSet = await databases.createDocument(
        DATABASE_ID,
        EXERCISE_SETS_TABLE_ID,
        ID.unique(),
        {
          user_id: user?.$id,
          session_id: session.$id,
          exercise_id: exercise.exercise_id,
          exercise_name: exercise.exercise_name,
          set_number: setNumber,
          reps: Array.isArray(exercise.reps)
            ? exercise.reps[setNumber - 1] || 10
            : exercise.reps,
          weight: 0,
          weight_unit: useMetricUnits ? "kg" : "lbs",
          is_warmup: false,
          is_completed: false,
        }
      );

      setExerciseSets((prev) => ({
        ...prev,
        [exercise.exercise_id]: [
          ...(prev[exercise.exercise_id] || []),
          newSet as unknown as ExerciseSet,
        ],
      }));
    } catch (error) {
      console.error("Failed to add set:", error);
      showAlert("Error", "Failed to add set");
    }
  };

  const handleUpdateSet = async (
    setId: string,
    exerciseId: string,
    field: keyof ExerciseSet,
    value: any
  ) => {
    // Update local state immediately for instant feedback
    setExerciseSets((prev) => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((s) => {
        if (s.$id === setId) {
          const updatedSet = { ...s, [field]: value };

          // Check for new PR when marking set as complete
          if (field === "is_completed" && value === true) {
            const weight = updatedSet.weight || 0;
            const currentPR = exercisePRs[exerciseId] || 0;
            const currentNewPR = newPRs[exerciseId] || currentPR;

            if (weight > currentNewPR) {
              setNewPRs((prevPRs) => ({
                ...prevPRs,
                [exerciseId]: weight,
              }));
            }
          }

          return updatedSet;
        }
        return s;
      }),
    }));

    // Update database in the background
    try {
      await databases.updateDocument(
        DATABASE_ID,
        EXERCISE_SETS_TABLE_ID,
        setId,
        { [field]: value }
      );
    } catch (error) {
      console.error("Failed to update set:", error);
      // Optionally: revert the change if database update fails
    }
  };

  const handleDeleteSet = async (setId: string, exerciseId: string) => {
    const setsForExercise = exerciseSets[exerciseId] || [];
    const isLastSet = setsForExercise.length === 1;

    if (isLastSet) {
      // Find the exercise name
      const exercise = exercises.find((ex) => ex.exercise_id === exerciseId);
      const exerciseName = exercise?.exercise_name || "this exercise";

      showAlert(
        "Remove Exercise?",
        `This is the last set for ${exerciseName}. Removing it will delete the entire exercise from this workout.`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Remove Exercise",
            style: "destructive",
            onPress: async () => {
              try {
                await databases.deleteDocument(
                  DATABASE_ID,
                  EXERCISE_SETS_TABLE_ID,
                  setId
                );

                // Remove from state
                setExerciseSets((prev) => {
                  const newState = { ...prev };
                  delete newState[exerciseId];
                  return newState;
                });

                // Remove exercise from exercises array
                setExercises((prev) =>
                  prev.filter((ex) => ex.exercise_id !== exerciseId)
                );
              } catch (error) {
                console.error("Failed to delete set:", error);
                showAlert("Error", "Failed to delete set");
              }
            },
          },
        ]
      );
    } else {
      try {
        await databases.deleteDocument(
          DATABASE_ID,
          EXERCISE_SETS_TABLE_ID,
          setId
        );

        setExerciseSets((prev) => ({
          ...prev,
          [exerciseId]: prev[exerciseId].filter((s) => s.$id !== setId),
        }));
      } catch (error) {
        console.error("Failed to delete set:", error);
        showAlert("Error", "Failed to delete set");
      }
    }
  };

  const handleAddExercise = async (exercise: ExerciseSearchResult) => {
    const newExercise: TemplateExercise = {
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      sets: 3,
      reps: [10, 10, 10],
      rest_seconds: 60,
    };
    setExercises((prev) => [...prev, newExercise]);

    // Load PR for this exercise
    await loadExercisePRs([exercise.id]);

    // Automatically add one set for the new exercise
    if (session) {
      try {
        const newSet = await databases.createDocument(
          DATABASE_ID,
          EXERCISE_SETS_TABLE_ID,
          ID.unique(),
          {
            user_id: user?.$id,
            session_id: session.$id,
            exercise_id: exercise.id,
            exercise_name: exercise.name,
            set_number: 1,
            reps: 10,
            weight: 0,
            weight_unit: useMetricUnits ? "kg" : "lbs",
            is_warmup: false,
            is_completed: false,
          }
        );

        setExerciseSets((prev) => ({
          ...prev,
          [exercise.id]: [newSet as unknown as ExerciseSet],
        }));
      } catch (error) {
        console.error("Failed to create initial set:", error);
      }
    }
  };

  const handleFinishWorkout = async () => {
    if (!session) return;

    // Check if there are any incomplete sets
    let totalIncompleteSets = 0;
    Object.values(exerciseSets).forEach((sets) => {
      sets.forEach((set) => {
        if (!set.is_completed) {
          totalIncompleteSets++;
        }
      });
    });

    if (totalIncompleteSets > 0) {
      showAlert(
        "Incomplete Sets",
        `You have ${totalIncompleteSets} incomplete set(s). Are you sure you want to finish?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Finish Anyway",
            style: "destructive",
            onPress: () => finishWorkoutConfirmed(),
          },
        ]
      );
      return;
    }

    finishWorkoutConfirmed();
  };

  const handleCancelWorkout = async () => {
    showAlert(
      "Cancel Workout",
      "Are you sure you want to cancel this workout? All progress will be lost and PRs will not be saved.",
      [
        {
          text: "Keep Workout",
          style: "cancel",
        },
        {
          text: "Cancel Workout",
          style: "destructive",
          onPress: () => cancelWorkoutConfirmed(),
        },
      ]
    );
  };

  const cancelWorkoutConfirmed = async () => {
    if (!session) return;

    setIsFinishing(true);
    try {
      // Delete all exercise sets for this session
      const setsToDelete = Object.values(exerciseSets).flat();
      for (const set of setsToDelete) {
        await databases.deleteDocument(
          DATABASE_ID,
          EXERCISE_SETS_TABLE_ID,
          set.$id
        );
      }

      // Delete the workout session
      await databases.deleteDocument(
        DATABASE_ID,
        WORKOUT_SESSIONS_TABLE_ID,
        session.$id
      );

      showAlert("Success", "Workout cancelled");
      router.back();
    } catch (error) {
      console.error("Failed to cancel workout:", error);
      showAlert("Error", "Failed to cancel workout");
    } finally {
      setIsFinishing(false);
    }
  };

  const finishWorkoutConfirmed = async () => {
    if (!session) return;

    setIsFinishing(true);
    try {
      const now = new Date();
      const endTime = now.toTimeString().split(" ")[0];
      const start = new Date(`${session.date}T${session.start_time}`);
      const durationMinutes = Math.floor(
        (now.getTime() - start.getTime()) / 60000
      );

      // Calculate total volume
      let totalVolume = 0;
      Object.values(exerciseSets).forEach((sets) => {
        sets.forEach((set) => {
          if (set.is_completed && set.weight && set.reps) {
            totalVolume += set.weight * set.reps;
          }
        });
      });

      await databases.updateDocument(
        DATABASE_ID,
        WORKOUT_SESSIONS_TABLE_ID,
        session.$id,
        {
          end_time: endTime,
          duration_minutes: durationMinutes,
          total_volume: totalVolume,
          is_active: false,
        }
      );

      // Update PRs in our tracking
      if (Object.keys(newPRs).length > 0) {
        setExercisePRs((prev) => ({
          ...prev,
          ...newPRs,
        }));
      }

      console.log(
        "Workout finished, is_active set to false for session:",
        session.$id
      );

      const prCount = Object.keys(newPRs).length;
      const message =
        prCount > 0
          ? `Workout completed! 💪\n🏆 ${prCount} new personal record${
              prCount > 1 ? "s" : ""
            }!`
          : "Workout completed! 💪";

      showAlert("Success", message);
      router.back();
    } catch (error) {
      console.error("Failed to finish workout:", error);
      showAlert("Error", "Failed to finish workout");
    } finally {
      setIsFinishing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const areAllSetsCompleted = (exerciseId: string) => {
    const sets = exerciseSets[exerciseId] || [];
    if (sets.length === 0) return false;
    return sets.every((set) => set.is_completed);
  };

  const isNewPR = (
    exerciseId: string,
    weight: number,
    isCompleted: boolean
  ) => {
    if (!isCompleted || weight <= 0) return false;
    const currentPR = exercisePRs[exerciseId] || 0;
    return weight > currentPR;
  };

  const styles = createStyles(theme);

  if (!session) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <IconButton icon="arrow-left" onPress={() => router.back()} />
          <View style={styles.headerInfo}>
            <Text variant="headlineSmall" style={styles.title}>
              {session.workout_name}
            </Text>
            <Text variant="titleLarge" style={styles.timer}>
              {formatTime(elapsedTime)}
            </Text>
          </View>
          <Chip mode="flat" style={styles.liveChip}>
            LIVE
          </Chip>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {exercises.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>
                  This is an empty workout. Start logging exercises!
                </Text>
              </Card.Content>
            </Card>
          ) : (
            exercises.map((exercise, exerciseIndex) => {
              const allSetsCompleted = areAllSetsCompleted(
                exercise.exercise_id
              );
              return (
                <Card
                  key={exerciseIndex}
                  style={[
                    styles.exerciseCard,
                    allSetsCompleted && styles.exerciseCardCompleted,
                  ]}
                >
                  <Card.Content>
                    <Text
                      variant="titleMedium"
                      style={styles.exerciseName}
                      onPress={() =>
                        router.push({
                          pathname: "/exercise-detail",
                          params: {
                            exerciseId: exercise.exercise_id,
                            exerciseName: exercise.exercise_name,
                          },
                        })
                      }
                    >
                      {exercise.exercise_name}
                    </Text>
                    <Text variant="bodySmall" style={styles.exerciseTarget}>
                      Target: {exercise.sets} sets ×{" "}
                      {Array.isArray(exercise.reps)
                        ? exercise.reps.join(", ")
                        : exercise.reps}{" "}
                      reps
                    </Text>

                    {(exerciseSets[exercise.exercise_id] || []).length > 0 && (
                      <View style={styles.headerRow}>
                        <Text style={styles.headerLabel}>Set</Text>
                        <Text style={styles.headerLabelReps}>Reps</Text>
                        <Text style={styles.headerLabelWeight}>Weight</Text>
                        <Text style={styles.headerLabelComplete}>Done</Text>
                        <View style={styles.headerLabelDelete} />
                      </View>
                    )}

                    {(exerciseSets[exercise.exercise_id] || []).map(
                      (set, setIndex) => {
                        const isPR = isNewPR(
                          exercise.exercise_id,
                          set.weight,
                          set.is_completed
                        );
                        return (
                          <View
                            key={set.$id}
                            style={[
                              styles.setRow,
                              set.is_completed && styles.setRowCompleted,
                              isPR && styles.setRowPR,
                            ]}
                          >
                            <Text style={styles.setNumber}>
                              {set.set_number}
                            </Text>
                            <TextInput
                              mode="outlined"
                              value={set.reps > 0 ? set.reps.toString() : ""}
                              placeholder="0"
                              onChangeText={(val) =>
                                handleUpdateSet(
                                  set.$id,
                                  exercise.exercise_id,
                                  "reps",
                                  parseInt(val) || 0
                                )
                              }
                              keyboardType="numeric"
                              style={styles.repsInput}
                              dense
                            />
                            <TextInput
                              mode="outlined"
                              label={useMetricUnits ? "kg" : "lbs"}
                              value={
                                set.weight > 0 ? set.weight.toString() : ""
                              }
                              placeholder="0"
                              onChangeText={(val) =>
                                handleUpdateSet(
                                  set.$id,
                                  exercise.exercise_id,
                                  "weight",
                                  parseFloat(val) || 0
                                )
                              }
                              keyboardType="decimal-pad"
                              style={styles.weightInput}
                              dense
                            />
                            <IconButton
                              icon={
                                set.is_completed
                                  ? "check-circle"
                                  : "circle-outline"
                              }
                              iconColor={
                                set.is_completed
                                  ? "#4caf50"
                                  : theme.colors.outline
                              }
                              size={28}
                              style={styles.iconButtonCompact}
                              onPress={() =>
                                handleUpdateSet(
                                  set.$id,
                                  exercise.exercise_id,
                                  "is_completed",
                                  !set.is_completed
                                )
                              }
                            />
                            <IconButton
                              icon="delete"
                              iconColor={theme.colors.error}
                              size={18}
                              style={styles.iconButtonCompact}
                              onPress={() =>
                                handleDeleteSet(set.$id, exercise.exercise_id)
                              }
                            />
                          </View>
                        );
                      }
                    )}

                    <Button
                      mode="outlined"
                      icon="plus"
                      onPress={() =>
                        handleAddSet(
                          exercise,
                          (exerciseSets[exercise.exercise_id]?.length || 0) + 1
                        )
                      }
                      style={styles.addSetButton}
                    >
                      Add Set
                    </Button>
                  </Card.Content>
                </Card>
              );
            })
          )}

          <Button
            mode="contained-tonal"
            icon="plus"
            onPress={() => router.push("/exercise-browser")}
            style={styles.addExerciseButton}
          >
            Add Exercise
          </Button>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            mode="outlined"
            onPress={handleCancelWorkout}
            disabled={isFinishing}
            textColor="#ef5350"
            style={styles.cancelButton}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleFinishWorkout}
            loading={isFinishing}
            disabled={isFinishing}
            style={styles.finishButton}
          >
            Finish Workout
          </Button>
        </View>
      </KeyboardAvoidingView>
      <AlertComponent />
    </SafeAreaView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      paddingTop: 48,
      backgroundColor: theme.colors.elevation.level1,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
    },
    headerInfo: {
      flex: 1,
    },
    title: {
      color: theme.colors.onSurface,
    },
    timer: {
      color: theme.colors.primary,
      fontWeight: "bold",
    },
    liveChip: {
      backgroundColor: "#4caf50",
    },
    content: {
      flex: 1,
      padding: 16,
    },
    emptyCard: {
      backgroundColor: theme.colors.elevation.level2,
    },
    emptyText: {
      textAlign: "center",
      color: theme.colors.onSurfaceVariant,
      padding: 20,
    },
    exerciseCard: {
      backgroundColor: theme.colors.elevation.level2,
      marginBottom: 16,
    },
    exerciseCardCompleted: {
      backgroundColor: "rgba(76, 175, 80, 0.2)",
      borderColor: "#4caf50",
      borderWidth: 1,
    },
    exerciseName: {
      color: theme.colors.primary,
      marginBottom: 4,
      textDecorationLine: "underline",
    },
    exerciseTarget: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: 12,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
      paddingBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
      gap: 6,
    },
    headerLabel: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 11,
      fontWeight: "bold",
      width: 35,
    },
    headerLabelReps: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 11,
      fontWeight: "bold",
      flex: 1.5,
      textAlign: "center",
    },
    headerLabelWeight: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 11,
      fontWeight: "bold",
      flex: 2.5,
      textAlign: "center",
    },
    headerLabelComplete: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 11,
      fontWeight: "bold",
      width: 30,
      textAlign: "center",
    },
    headerLabelDelete: {
      width: 30,
    },
    setRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
      gap: 6,
      padding: 8,
      borderRadius: 8,
      backgroundColor: "transparent",
    },
    setRowCompleted: {
      backgroundColor: "rgba(76, 175, 80, 0.15)",
    },
    setRowPR: {
      backgroundColor: "rgba(255, 215, 0, 0.25)",
      borderColor: "#FFD700",
      borderWidth: 1,
    },
    setNumber: {
      color: theme.colors.onSurface,
      width: 35,
      fontSize: 11,
    },
    repsInput: {
      flex: 1.5,
      height: 40,
    },
    weightInput: {
      flex: 2.5,
      height: 40,
    },
    iconButtonCompact: {
      margin: 0,
      marginHorizontal: -4,
    },
    addSetButton: {
      marginTop: 8,
    },
    addExerciseButton: {
      margin: 4,
      marginBottom: 16,
    },
    footer: {
      padding: 16,
      backgroundColor: theme.colors.elevation.level1,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline,
      flexDirection: "row",
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      borderColor: "#ef5350",
    },
    finishButton: {
      flex: 2,
      backgroundColor: "#4caf50",
    },
  });
