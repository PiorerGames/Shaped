import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, Button, TextInput, Card, Chip } from "react-native-paper";
import { useState } from "react";
import { Stack, router } from "expo-router";
import { useExerciseSelection } from "@/lib/exercise-selection-context";
import {
  searchExercises,
  getExercisesByMuscle,
  MUSCLE_GROUPS,
  BASIC_EXERCISES,
  ExerciseSearchResult,
} from "@/lib/exerciseAPI";

export default function ExerciseBrowserPage() {
  const { setSelectedExercise } = useExerciseSelection();
  const [searchQuery, setSearchQuery] = useState("");
  const [exercises, setExercises] =
    useState<ExerciseSearchResult[]>(BASIC_EXERCISES);
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setExercises(BASIC_EXERCISES);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchExercises(searchQuery);
      setExercises(results);
    } catch (error) {
      console.error("Search error:", error);
      setExercises(BASIC_EXERCISES);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMuscleFilter = async (muscleId: string) => {
    if (selectedMuscle === muscleId) {
      setSelectedMuscle(null);
      setExercises(BASIC_EXERCISES);
    } else {
      setSelectedMuscle(muscleId);
      setIsSearching(true);
      try {
        const results = await getExercisesByMuscle(muscleId);
        setExercises(results);
      } catch (error) {
        console.error("Muscle filter error:", error);
        const filtered = BASIC_EXERCISES.filter((ex) =>
          ex.muscles.some((m) =>
            m.toLowerCase().includes(muscleId.toLowerCase())
          )
        );
        setExercises(filtered);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleSelectExercise = (exercise: ExerciseSearchResult) => {
    // Set the selected exercise in context and navigate back
    setSelectedExercise(exercise);
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Text variant="headlineSmall">Browse Exercises</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.closeButton}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.searchBar}>
          <TextInput
            mode="outlined"
            placeholder="Search exercises..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            style={styles.searchInput}
          />
          <Button mode="contained" onPress={handleSearch} loading={isSearching}>
            Search
          </Button>
        </View>

        <View style={styles.divider} />

        <Text variant="labelLarge" style={styles.sectionLabel}>
          Filter by Muscle Group
        </Text>
        <View style={styles.muscleGroupsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.muscleGroupsContent}
          >
            {MUSCLE_GROUPS.map((muscle) => (
              <Chip
                key={muscle.id}
                selected={selectedMuscle === muscle.id}
                onPress={() => handleMuscleFilter(muscle.id)}
                style={styles.muscleChip}
                compact
              >
                {muscle.icon} {muscle.name}
              </Chip>
            ))}
          </ScrollView>
        </View>

        <View style={styles.divider} />

        <ScrollView style={styles.exerciseList}>
          {exercises.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>No exercises found</Text>
              </Card.Content>
            </Card>
          ) : (
            exercises.map((exercise, index) => (
              <Card key={`${exercise.id}-${index}`} style={styles.exerciseCard}>
                <Card.Content>
                  <View style={styles.exerciseHeader}>
                    <View style={styles.exerciseInfo}>
                      <Text
                        variant="titleMedium"
                        style={styles.exerciseName}
                        onPress={() =>
                          router.push({
                            pathname: "/exercise-detail",
                            params: {
                              exerciseId: exercise.id,
                              exerciseName: exercise.name,
                            },
                          })
                        }
                      >
                        {exercise.name}
                      </Text>
                      <View style={styles.tags}>
                        <Chip
                          mode="outlined"
                          compact
                          style={styles.categoryTag}
                        >
                          📂 {exercise.category}
                        </Chip>
                        {exercise.equipment &&
                          exercise.equipment.length > 0 && (
                            <Chip
                              mode="outlined"
                              compact
                              style={styles.equipmentTag}
                            >
                              🏋️ {exercise.equipment[0]}
                            </Chip>
                          )}
                      </View>
                      {exercise.muscles && exercise.muscles.length > 0 && (
                        <Text variant="bodySmall" style={styles.muscles}>
                          💪 {exercise.muscles.slice(0, 3).join(", ")}
                          {exercise.muscles.length > 3 && " +more"}
                        </Text>
                      )}
                    </View>
                    <Button
                      mode="contained"
                      onPress={() => handleSelectExercise(exercise)}
                      style={styles.addButton}
                    >
                      Add
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1e1e1e",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
  },
  closeButton: {
    fontSize: 24,
    color: "#ffffff",
    fontWeight: "bold",
  },
  searchBar: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 16,
    gap: 8,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    height: 50,
  },
  divider: {
    height: 1,
    backgroundColor: "#333333",
    marginVertical: 12,
  },
  sectionLabel: {
    paddingHorizontal: 16,
    marginBottom: 8,
    color: "#ffffff",
    fontWeight: "600",
  },
  muscleGroupsContainer: {
    marginBottom: 8,
    paddingVertical: 12,
  },
  muscleGroupsContent: {
    paddingHorizontal: 16,
    gap: 6,
  },
  muscleChip: {
    marginRight: 0,
    marginBottom: 0,
  },
  exerciseList: {
    flex: 1,
    padding: 16,
    paddingTop: 8,
  },
  emptyCard: {
    backgroundColor: "#2a2a2a",
  },
  emptyText: {
    textAlign: "center",
    color: "#999999",
    padding: 20,
  },
  exerciseCard: {
    marginBottom: 12,
    backgroundColor: "#2a2a2a",
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  exerciseInfo: {
    flex: 1,
    gap: 8,
  },
  exerciseName: {
    color: "#2196F3",
    fontWeight: "600",
    fontSize: 16,
    textDecorationLine: "underline",
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  categoryTag: {
    backgroundColor: "#3a3a3a",
  },
  equipmentTag: {
    backgroundColor: "#3a3a3a",
  },
  muscles: {
    color: "#cccccc",
    fontSize: 13,
    lineHeight: 18,
  },
  addButton: {
    minWidth: 80,
  },
});
