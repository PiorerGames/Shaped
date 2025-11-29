import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import {
  Modal,
  Portal,
  Text,
  Button,
  TextInput,
  Card,
  IconButton,
  useTheme,
} from "react-native-paper";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  DATABASE_ID,
  databases,
  WORKOUT_TEMPLATES_TABLE_ID,
} from "@/lib/appwrite";
import { ID } from "react-native-appwrite";
import { TemplateExercise } from "@/types/database.type";
import { ExerciseSearchResult } from "@/lib/exerciseAPI";
import ExerciseBrowser from "@/components/ExerciseBrowser";

interface CreateWorkoutModalProps {
  visible: boolean;
  onDismiss: () => void;
  onWorkoutCreated: () => void;
}

export default function CreateWorkoutModal({
  visible,
  onDismiss,
  onWorkoutCreated,
}: CreateWorkoutModalProps) {
  const { user } = useAuth();
  const theme = useTheme();
  const [workoutName, setWorkoutName] = useState("");
  const [description, setDescription] = useState("");
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [exerciseBrowserVisible, setExerciseBrowserVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddExercise = (exercise: ExerciseSearchResult) => {
    const newExercise: TemplateExercise = {
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      sets: 3,
      reps: [10, 10, 10],
      rest_seconds: 60,
    };
    setExercises([...exercises, newExercise]);
  };

  const handleRemoveExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleUpdateExercise = (
    index: number,
    field: keyof TemplateExercise,
    value: any
  ) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const handleUpdateSets = (index: number, newSets: number) => {
    const updated = [...exercises];
    const currentReps = updated[index].reps;
    const repsArray = Array.isArray(currentReps) ? currentReps : [currentReps];
    const defaultRep = repsArray[0] || 10;

    // Adjust reps array to match new number of sets
    const newReps = Array(newSets)
      .fill(0)
      .map((_, i) => repsArray[i] || defaultRep);
    updated[index] = { ...updated[index], sets: newSets, reps: newReps };
    setExercises(updated);
  };

  const handleUpdateSetReps = (
    exerciseIndex: number,
    setIndex: number,
    reps: number
  ) => {
    const updated = [...exercises];
    const currentReps = updated[exerciseIndex].reps;
    const repsArray = Array.isArray(currentReps)
      ? [...currentReps]
      : [currentReps];
    repsArray[setIndex] = reps;
    updated[exerciseIndex] = { ...updated[exerciseIndex], reps: repsArray };
    setExercises(updated);
  };

  const handleSaveWorkout = async () => {
    if (!workoutName.trim()) {
      alert("Please enter a workout name");
      return;
    }

    if (exercises.length === 0) {
      alert("Please add at least one exercise");
      return;
    }

    // Check if any exercise has 0 sets
    const hasInvalidSets = exercises.some((ex) => ex.sets === 0);
    if (hasInvalidSets) {
      alert("All exercises must have at least 1 set");
      return;
    }

    setIsSaving(true);
    try {
      await databases.createDocument(
        DATABASE_ID,
        WORKOUT_TEMPLATES_TABLE_ID,
        ID.unique(),
        {
          user_id: user?.$id,
          name: workoutName,
          description: description || null,
          exercises: JSON.stringify(exercises),
          is_favorite: false,
        }
      );

      alert("Workout template created successfully!");
      resetForm();
      onWorkoutCreated();
      onDismiss();
    } catch (error) {
      console.error("Failed to create workout template:", error);
      alert(
        "Failed to create workout template. Make sure the database table exists in Appwrite."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setWorkoutName("");
    setDescription("");
    setExercises([]);
  };

  return (
    <>
      <Portal>
        <Modal
          visible={visible}
          onDismiss={onDismiss}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <View
            style={[
              styles.header,
              { borderBottomColor: theme.colors.outlineVariant },
            ]}
          >
            <Text variant="headlineSmall">Create Workout Template</Text>
            <Pressable onPress={onDismiss}>
              <Text
                style={[styles.closeButton, { color: theme.colors.onSurface }]}
              >
                ✕
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.content}>
            <TextInput
              mode="outlined"
              label="Workout Name"
              value={workoutName}
              onChangeText={setWorkoutName}
              placeholder="e.g., Push Day, Leg Day"
              style={styles.input}
              textColor={theme.colors.onSurface}
              outlineColor={theme.colors.outline}
              activeOutlineColor={theme.colors.primary}
              placeholderTextColor={theme.colors.onSurfaceDisabled}
            />

            <TextInput
              mode="outlined"
              label="Description (Optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="e.g., Upper body push exercises"
              multiline
              numberOfLines={2}
              style={styles.input}
              textColor={theme.colors.onSurface}
              outlineColor={theme.colors.outline}
              activeOutlineColor={theme.colors.primary}
              placeholderTextColor={theme.colors.onSurfaceDisabled}
            />

            <View style={styles.sectionHeader}>
              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                Exercises ({exercises.length})
              </Text>
              <Button
                mode="contained"
                icon="plus"
                onPress={() => setExerciseBrowserVisible(true)}
              >
                Add Exercise
              </Button>
            </View>

            {exercises.length === 0 ? (
              <Card
                style={[
                  styles.emptyCard,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                <Card.Content>
                  <Text
                    style={[
                      styles.emptyText,
                      { color: theme.colors.onSurfaceDisabled },
                    ]}
                  >
                    No exercises added yet. Tap "Add Exercise" to get started.
                  </Text>
                </Card.Content>
              </Card>
            ) : (
              exercises.map((exercise, index) => (
                <Card
                  key={index}
                  style={[
                    styles.exerciseCard,
                    { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                >
                  <Card.Content>
                    <View style={styles.exerciseHeader}>
                      <Text
                        variant="titleMedium"
                        style={[
                          styles.exerciseName,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        {index + 1}. {exercise.exercise_name}
                      </Text>
                      <IconButton
                        icon="delete"
                        size={20}
                        onPress={() => handleRemoveExercise(index)}
                      />
                    </View>

                    <View style={styles.exerciseDetails}>
                      <View style={styles.detailItem}>
                        <Text
                          variant="labelSmall"
                          style={[
                            styles.detailLabel,
                            { color: theme.colors.onSurfaceVariant },
                          ]}
                        >
                          Sets
                        </Text>
                        <TextInput
                          mode="outlined"
                          value={exercise.sets.toString()}
                          onChangeText={(val) =>
                            handleUpdateSets(index, parseInt(val) || 0)
                          }
                          keyboardType="numeric"
                          style={styles.smallInput}
                          textColor={theme.colors.onSurface}
                          outlineColor={theme.colors.outline}
                          activeOutlineColor={theme.colors.primary}
                        />
                      </View>

                      <View style={styles.detailItem}>
                        <Text
                          variant="labelSmall"
                          style={[
                            styles.detailLabel,
                            { color: theme.colors.onSurfaceVariant },
                          ]}
                        >
                          Rest (sec)
                        </Text>
                        <TextInput
                          mode="outlined"
                          value={exercise.rest_seconds?.toString() || "60"}
                          onChangeText={(val) =>
                            handleUpdateExercise(
                              index,
                              "rest_seconds",
                              parseInt(val) || 60
                            )
                          }
                          keyboardType="numeric"
                          style={styles.smallInput}
                          textColor={theme.colors.onSurface}
                          outlineColor={theme.colors.outline}
                          activeOutlineColor={theme.colors.primary}
                        />
                      </View>
                    </View>

                    <View style={styles.setsContainer}>
                      <Text
                        variant="labelSmall"
                        style={[
                          styles.setsLabel,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        Reps per Set:
                      </Text>
                      {Array.isArray(exercise.reps) &&
                        exercise.reps.map((reps, setIndex) => (
                          <View key={setIndex} style={styles.setRow}>
                            <Text
                              style={[
                                styles.setNumber,
                                { color: theme.colors.onSurface },
                              ]}
                            >
                              Set {setIndex + 1}
                            </Text>
                            <TextInput
                              mode="outlined"
                              value={reps.toString()}
                              onChangeText={(val) =>
                                handleUpdateSetReps(
                                  index,
                                  setIndex,
                                  parseInt(val) || 0
                                )
                              }
                              keyboardType="numeric"
                              style={styles.setInput}
                              dense
                              textColor={theme.colors.onSurface}
                              outlineColor={theme.colors.outline}
                              activeOutlineColor={theme.colors.primary}
                            />
                            <Text style={styles.repsText}>reps</Text>
                          </View>
                        ))}
                    </View>

                    <TextInput
                      mode="outlined"
                      label="Notes (Optional)"
                      value={exercise.notes || ""}
                      onChangeText={(val) =>
                        handleUpdateExercise(index, "notes", val)
                      }
                      placeholder="e.g., Focus on form"
                      style={styles.notesInput}
                      dense
                      textColor={theme.colors.onSurface}
                      outlineColor={theme.colors.outline}
                      activeOutlineColor={theme.colors.primary}
                      placeholderTextColor={theme.colors.onSurfaceDisabled}
                    />
                  </Card.Content>
                </Card>
              ))
            )}

            <Button
              mode="contained"
              onPress={handleSaveWorkout}
              loading={isSaving}
              disabled={isSaving}
              style={styles.saveButton}
            >
              Save Workout Template
            </Button>
          </ScrollView>
        </Modal>
      </Portal>

      <ExerciseBrowser
        visible={exerciseBrowserVisible}
        onDismiss={() => setExerciseBrowserVisible(false)}
        onSelectExercise={handleAddExercise}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: 20,
    marginVertical: 40,
    borderRadius: 8,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    fontSize: 24,
    fontWeight: "bold",
  },
  content: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {},
  emptyCard: {
    marginBottom: 16,
  },
  emptyText: {
    textAlign: "center",
    padding: 20,
  },
  exerciseCard: {
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  exerciseName: {
    flex: 1,
  },
  exerciseDetails: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
  },
  setsContainer: {
    marginBottom: 12,
  },
  setsLabel: {
    marginBottom: 8,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  setNumber: {
    width: 50,
  },
  setInput: {
    flex: 1,
    height: 40,
  },
  repsText: {
    width: 40,
  },
  detailLabel: {
    marginBottom: 4,
  },
  smallInput: {
    height: 40,
  },
  notesInput: {
    marginTop: 8,
  },
  saveButton: {
    marginTop: 8,
    marginBottom: 16,
  },
});
