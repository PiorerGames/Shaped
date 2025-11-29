import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import {
  Modal,
  Portal,
  Text,
  Button,
  Card,
  Chip,
  List,
  useTheme,
} from "react-native-paper";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  DATABASE_ID,
  databases,
  WORKOUT_TEMPLATES_TABLE_ID,
  WORKOUT_SESSIONS_TABLE_ID,
} from "@/lib/appwrite";
import { Query, ID } from "react-native-appwrite";
import { WorkoutTemplate } from "@/types/database.type";

interface StartWorkoutModalProps {
  visible: boolean;
  onDismiss: () => void;
  onWorkoutStarted: () => void;
}

export default function StartWorkoutModal({
  visible,
  onDismiss,
  onWorkoutStarted,
}: StartWorkoutModalProps) {
  const { user } = useAuth();
  const theme = useTheme();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (visible && user) {
      fetchTemplates();
    }
  }, [visible, user]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        WORKOUT_TEMPLATES_TABLE_ID,
        [Query.equal("user_id", user?.$id ?? ""), Query.orderDesc("$createdAt")]
      );
      setTemplates(response.documents as unknown as WorkoutTemplate[]);
    } catch (error) {
      console.error("Failed to fetch workout templates:", error);
      alert("Failed to load workout templates");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartWorkout = async (template: WorkoutTemplate) => {
    setIsStarting(true);
    try {
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toTimeString().split(" ")[0];

      await databases.createDocument(
        DATABASE_ID,
        WORKOUT_SESSIONS_TABLE_ID,
        ID.unique(),
        {
          user_id: user?.$id,
          template_id: template.$id,
          workout_name: template.name,
          date: dateStr,
          start_time: timeStr,
          is_active: true,
        }
      );

      alert(`Started: ${template.name}`);
      onWorkoutStarted();
      onDismiss();
    } catch (error) {
      console.error("Failed to start workout:", error);
      alert("Failed to start workout. Make sure the database table exists.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleStartEmpty = async () => {
    setIsStarting(true);
    try {
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toTimeString().split(" ")[0];

      await databases.createDocument(
        DATABASE_ID,
        WORKOUT_SESSIONS_TABLE_ID,
        ID.unique(),
        {
          user_id: user?.$id,
          workout_name: "Quick Workout",
          date: dateStr,
          start_time: timeStr,
          is_active: true,
        }
      );

      alert("Started empty workout");
      onWorkoutStarted();
      onDismiss();
    } catch (error) {
      console.error("Failed to start empty workout:", error);
      alert("Failed to start workout. Make sure the database table exists.");
    } finally {
      setIsStarting(false);
    }
  };

  return (
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
          <Text variant="headlineSmall">Start Workout</Text>
          <Pressable onPress={onDismiss}>
            <Text
              style={[styles.closeButton, { color: theme.colors.onSurface }]}
            >
              ✕
            </Text>
          </Pressable>
        </View>

        <ScrollView style={styles.content}>
          <Button
            mode="contained"
            icon="lightning-bolt"
            onPress={handleStartEmpty}
            loading={isStarting}
            disabled={isStarting}
            style={styles.quickStartButton}
          >
            Quick Start (Empty Workout)
          </Button>

          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
          >
            Your Templates ({templates.length})
          </Text>

          {isLoading ? (
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
                  Loading templates...
                </Text>
              </Card.Content>
            </Card>
          ) : templates.length === 0 ? (
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
                  No workout templates yet. Create one first!
                </Text>
              </Card.Content>
            </Card>
          ) : (
            templates.map((template) => {
              const exercises =
                typeof template.exercises === "string"
                  ? JSON.parse(template.exercises)
                  : template.exercises;

              return (
                <Card
                  key={template.$id}
                  style={[
                    styles.templateCard,
                    { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                >
                  <Card.Content>
                    <View style={styles.templateHeader}>
                      <View style={styles.templateInfo}>
                        <Text
                          variant="titleMedium"
                          style={[
                            styles.templateName,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          {template.name}
                        </Text>
                        {template.description && (
                          <Text
                            variant="bodySmall"
                            style={[
                              styles.description,
                              { color: theme.colors.onSurfaceVariant },
                            ]}
                          >
                            {template.description}
                          </Text>
                        )}
                        <View style={styles.tags}>
                          <Pressable
                            onPress={() =>
                              setExpandedTemplate(
                                expandedTemplate === template.$id
                                  ? null
                                  : template.$id
                              )
                            }
                          >
                            <Chip
                              mode="outlined"
                              compact
                              style={[
                                styles.tag,
                                { backgroundColor: theme.colors.surface },
                              ]}
                            >
                              {exercises.length} exercises
                            </Chip>
                          </Pressable>
                          {template.is_favorite && (
                            <Chip
                              mode="outlined"
                              compact
                              style={[
                                styles.favoriteTag,
                                { backgroundColor: theme.colors.tertiary },
                              ]}
                            >
                              ⭐ Favorite
                            </Chip>
                          )}
                        </View>
                      </View>
                      <Button
                        mode="contained"
                        onPress={() => handleStartWorkout(template)}
                        loading={isStarting}
                        disabled={isStarting}
                      >
                        Start
                      </Button>
                    </View>

                    {expandedTemplate === template.$id && (
                      <View
                        style={[
                          styles.exercisesList,
                          { borderTopColor: theme.colors.outlineVariant },
                        ]}
                      >
                        {exercises.map((ex: any, idx: number) => (
                          <View key={idx} style={styles.exerciseItem}>
                            <Text
                              style={[
                                styles.exerciseItemName,
                                { color: theme.colors.onSurface },
                              ]}
                            >
                              {idx + 1}. {ex.exercise_name}
                            </Text>
                            <Text
                              style={[
                                styles.exerciseItemDetails,
                                { color: theme.colors.onSurfaceVariant },
                              ]}
                            >
                              {ex.sets} sets ×{" "}
                              {Array.isArray(ex.reps)
                                ? ex.reps.join(", ")
                                : ex.reps}{" "}
                              reps
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </Card.Content>
                </Card>
              );
            })
          )}
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: 20,
    marginVertical: 40,
    borderRadius: 8,
    maxHeight: "85%",
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
  quickStartButton: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  emptyCard: {
    marginBottom: 16,
  },
  emptyText: {
    textAlign: "center",
    padding: 20,
  },
  templateCard: {
    marginBottom: 12,
  },
  templateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    marginBottom: 4,
  },
  description: {
    marginBottom: 8,
  },
  tags: {
    flexDirection: "row",
    gap: 8,
  },
  tag: {},
  favoriteTag: {},
  exercisesList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  exerciseItem: {
    marginBottom: 8,
  },
  exerciseItemName: {
    marginBottom: 2,
  },
  exerciseItemDetails: {
    fontSize: 12,
  },
});
