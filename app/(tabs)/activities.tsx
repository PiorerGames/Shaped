import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Animated,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Text,
  Card,
  Portal,
  Chip,
  useTheme,
  IconButton,
} from "react-native-paper";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useUnits } from "@/lib/unit-context";
import {
  DATABASE_ID,
  databases,
  WORKOUT_SESSIONS_TABLE_ID,
  CARDIO_ACTIVITIES_TABLE_ID,
  WORKOUT_TEMPLATES_TABLE_ID,
} from "@/lib/appwrite";
import { Query, ID } from "react-native-appwrite";
import {
  WorkoutSession,
  CardioActivity,
  WorkoutTemplate,
} from "@/types/database.type";
import { CARDIO_ACTIVITIES } from "@/lib/exerciseAPI";
import StartWorkoutModal from "@/components/StartWorkoutModal";
import LogCardioModal from "@/components/LogCardioModal";
import { router, useFocusEffect } from "expo-router";
import { useCustomAlert } from "@/components/CustomAlert";

export default function Activities() {
  const { user } = useAuth();
  const { useMetricUnits } = useUnits();
  const theme = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [activeWorkout, setActiveWorkout] = useState<WorkoutSession | null>(
    null
  );
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutSession[]>([]);
  const [recentCardio, setRecentCardio] = useState<CardioActivity[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(
    new Set()
  );
  const [selectedTab, setSelectedTab] = useState<"workouts" | "cardio">(
    "workouts"
  );
  const [showMenu, setShowMenu] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [startWorkoutVisible, setStartWorkoutVisible] = useState(false);
  const [logCardioVisible, setLogCardioVisible] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const styles = createStyles(theme);
  const menuAnimation = useRef(new Animated.Value(0)).current;
  const fabRotation = useRef(new Animated.Value(0)).current;
  const currentAnimation = useRef<Animated.CompositeAnimation | null>(null);

  const toggleMenu = () => {
    // Stop any ongoing animation
    if (currentAnimation.current) {
      currentAnimation.current.stop();
      currentAnimation.current = null;
    }

    if (!showMenu) {
      // Opening menu
      setShowMenu(true);
      setMenuVisible(true);
      currentAnimation.current = Animated.parallel([
        Animated.spring(menuAnimation, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }),
        Animated.spring(fabRotation, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }),
      ]);
      currentAnimation.current.start(() => {
        currentAnimation.current = null;
      });
    } else {
      // Closing menu
      setShowMenu(false);
      currentAnimation.current = Animated.parallel([
        Animated.spring(menuAnimation, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }),
        Animated.spring(fabRotation, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }),
      ]);
      currentAnimation.current.start(() => {
        setMenuVisible(false);
        currentAnimation.current = null;
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchRecentActivities();
      checkActiveWorkout();
      fetchTemplates();
    }
  }, [user]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchRecentActivities();
        checkActiveWorkout();
        fetchTemplates();
      }
    }, [user])
  );

  useEffect(() => {
    if (activeWorkout?.start_time) {
      const interval = setInterval(() => {
        const start = new Date(
          `${activeWorkout.date}T${activeWorkout.start_time}`
        );
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [activeWorkout]);

  const fetchRecentActivities = async () => {
    try {
      // Fetch recent workouts
      const workoutsResponse = await databases.listDocuments(
        DATABASE_ID,
        WORKOUT_SESSIONS_TABLE_ID,
        [
          Query.equal("user_id", user?.$id ?? ""),
          Query.equal("is_active", false),
          Query.orderDesc("$createdAt"),
          Query.limit(20),
        ]
      );
      setRecentWorkouts(
        workoutsResponse.documents as unknown as WorkoutSession[]
      );

      // Fetch recent cardio
      const cardioResponse = await databases.listDocuments(
        DATABASE_ID,
        CARDIO_ACTIVITIES_TABLE_ID,
        [
          Query.equal("user_id", user?.$id ?? ""),
          Query.orderDesc("$createdAt"),
          Query.limit(20),
        ]
      );
      setRecentCardio(cardioResponse.documents as unknown as CardioActivity[]);
    } catch (error: any) {
      if (error?.code === 404 || error?.message?.includes("not be found")) {
        console.log("Workout tables not created yet");
      } else {
        console.error("Failed to fetch activities:", error);
      }
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        WORKOUT_TEMPLATES_TABLE_ID,
        [Query.equal("user_id", user?.$id ?? ""), Query.orderDesc("$createdAt")]
      );
      setTemplates(response.documents as unknown as WorkoutTemplate[]);
    } catch (error: any) {
      if (error?.code === 404 || error?.message?.includes("not be found")) {
        console.log("Workout templates table not created yet");
      } else {
        console.error("Failed to fetch templates:", error);
      }
    }
  };

  const checkActiveWorkout = async () => {
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
      console.log(
        "Checking for active workouts, found:",
        response.documents.length
      );
      if (response.documents.length > 0) {
        console.log(
          "Active workout:",
          response.documents[0].$id,
          "is_active:",
          response.documents[0].is_active
        );
        setActiveWorkout(response.documents[0] as unknown as WorkoutSession);
      } else {
        console.log("No active workout found, clearing state");
        setActiveWorkout(null);
      }
    } catch (error) {
      console.log("No active workout");
      setActiveWorkout(null);
    }
  };

  const formatDuration = (minutes?: number) => {
    if (minutes === undefined || minutes === null) return "N/A";
    if (minutes === 0) return "< 1m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
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

  const handleStopWorkout = async () => {
    if (!activeWorkout) return;

    try {
      const now = new Date();
      const endTime = now.toTimeString().split(" ")[0];
      const start = new Date(
        `${activeWorkout.date}T${activeWorkout.start_time}`
      );
      const durationMinutes = Math.floor(
        (now.getTime() - start.getTime()) / 60000
      );

      await databases.updateDocument(
        DATABASE_ID,
        WORKOUT_SESSIONS_TABLE_ID,
        activeWorkout.$id,
        {
          end_time: endTime,
          duration_minutes: durationMinutes,
          is_active: false,
        }
      );

      showAlert("Success", "Workout stopped");
      setActiveWorkout(null);
      fetchRecentActivities();
    } catch (error) {
      console.error("Failed to stop workout:", error);
      showAlert("Error", "Failed to stop workout");
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    showAlert(
      "Delete Template",
      "Are you sure you want to delete this workout template?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await databases.deleteDocument(
                DATABASE_ID,
                WORKOUT_TEMPLATES_TABLE_ID,
                templateId
              );
              fetchTemplates();
            } catch (error) {
              console.error("Failed to delete template:", error);
              showAlert("Error", "Failed to delete template");
            }
          },
        },
      ]
    );
  };

  const handleStartWorkoutFromTemplate = async (template: WorkoutTemplate) => {
    if (activeWorkout) {
      showAlert(
        "Workout Already Active",
        "You already have an active workout in progress. Please finish or stop it before starting a new one.",
        [{ text: "OK" }]
      );
      return;
    }

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

      checkActiveWorkout();
      router.push("/workout");
    } catch (error) {
      console.error("Failed to start workout:", error);
      showAlert("Error", "Failed to start workout");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text variant="headlineSmall" style={styles.title}>
          Activities
        </Text>

        {activeWorkout && (
          <Card style={styles.activeWorkoutCard}>
            <Card.Content>
              <View style={styles.activeHeader}>
                <View>
                  <Text variant="titleMedium" style={styles.activeTitle}>
                    🏋️ Workout in Progress
                  </Text>
                  <Text variant="bodyLarge" style={styles.workoutName}>
                    {activeWorkout.workout_name}
                  </Text>
                  <Text variant="titleLarge" style={styles.timer}>
                    {formatTime(elapsedTime)}
                  </Text>
                </View>
                <Chip mode="flat" style={styles.liveChip}>
                  LIVE
                </Chip>
              </View>
              <View style={styles.activeButtons}>
                <Button
                  mode="contained"
                  onPress={() => router.push("/workout")}
                  style={styles.continueButton}
                >
                  Continue Workout
                </Button>
                <Button
                  mode="outlined"
                  onPress={handleStopWorkout}
                  textColor="#ef5350"
                  style={styles.stopButton}
                >
                  Stop Workout
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        <View style={styles.tabsContainer}>
          <Pressable
            style={[styles.tab, selectedTab === "workouts" && styles.activeTab]}
            onPress={() => setSelectedTab("workouts")}
          >
            <Text
              variant="titleMedium"
              style={[
                styles.tabText,
                selectedTab === "workouts" && styles.activeTabText,
              ]}
            >
              Workouts
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, selectedTab === "cardio" && styles.activeTab]}
            onPress={() => setSelectedTab("cardio")}
          >
            <Text
              variant="titleMedium"
              style={[
                styles.tabText,
                selectedTab === "cardio" && styles.activeTabText,
              ]}
            >
              Cardio
            </Text>
          </Pressable>
        </View>

        {selectedTab === "workouts" && (
          <>
            {templates.length > 0 && (
              <>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  My Workout Routines
                </Text>
                {templates.map((template) => (
                  <Card key={template.$id} style={styles.templateCard}>
                    <Card.Content>
                      <View style={styles.templateHeader}>
                        <View style={styles.templateInfo}>
                          <Text
                            variant="titleMedium"
                            style={styles.templateName}
                          >
                            {template.name}
                          </Text>
                          {template.description && (
                            <>
                              <Text
                                variant="bodySmall"
                                style={styles.templateDescription}
                              >
                                {expandedDescriptions.has(template.$id)
                                  ? template.description
                                  : template.description.length > 80
                                  ? template.description.substring(0, 80) +
                                    "..."
                                  : template.description}
                              </Text>
                              {template.description.length > 80 && (
                                <Pressable
                                  onPress={() => {
                                    setExpandedDescriptions((prev) => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(template.$id)) {
                                        newSet.delete(template.$id);
                                      } else {
                                        newSet.add(template.$id);
                                      }
                                      return newSet;
                                    });
                                  }}
                                >
                                  <Text style={styles.showMoreText}>
                                    {expandedDescriptions.has(template.$id)
                                      ? "Show less"
                                      : "Show more"}
                                  </Text>
                                </Pressable>
                              )}
                            </>
                          )}
                          <Text
                            variant="bodySmall"
                            style={styles.templateExercises}
                          >
                            {(() => {
                              const exercises =
                                typeof template.exercises === "string"
                                  ? JSON.parse(template.exercises)
                                  : template.exercises;
                              return exercises?.length || 0;
                            })()}{" "}
                            exercises
                          </Text>
                        </View>
                      </View>
                      <View style={styles.templateActions}>
                        <Button
                          mode="contained"
                          onPress={() =>
                            handleStartWorkoutFromTemplate(template)
                          }
                          style={styles.templateStartButton}
                          compact
                        >
                          Start
                        </Button>
                        <Button
                          mode="outlined"
                          onPress={() => {
                            router.push({
                              pathname: "/create-workout",
                              params: { templateId: template.$id },
                            });
                          }}
                          style={styles.templateEditButton}
                          compact
                        >
                          Edit
                        </Button>
                        <Button
                          mode="text"
                          onPress={() => handleDeleteTemplate(template.$id)}
                          textColor="#ef5350"
                          compact
                        >
                          Delete
                        </Button>
                      </View>
                    </Card.Content>
                  </Card>
                ))}
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Completed Workouts
                </Text>
              </>
            )}
            {recentWorkouts.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Text style={styles.emptyText}>
                    No workouts yet. Start your first workout!
                  </Text>
                </Card.Content>
              </Card>
            ) : (
              <>
                {recentWorkouts.map((workout) => (
                  <Card
                    key={workout.$id}
                    style={styles.workoutCard}
                    onPress={() => {
                      if (!workout.is_active) {
                        router.push({
                          pathname: "/workout-history",
                          params: { sessionId: workout.$id },
                        });
                      }
                    }}
                  >
                    <Card.Content>
                      <View style={styles.workoutHeader}>
                        <View style={styles.workoutInfo}>
                          <Text
                            variant="titleMedium"
                            style={styles.workoutName}
                          >
                            {workout.workout_name}
                          </Text>
                          <Text variant="bodySmall" style={styles.workoutDate}>
                            {formatDate(workout.date)}
                          </Text>
                        </View>
                        {!workout.is_active && (
                          <Text
                            variant="bodySmall"
                            style={styles.completedBadge}
                          >
                            ✓ Completed
                          </Text>
                        )}
                      </View>
                      <View style={styles.workoutStats}>
                        <View style={styles.statItem}>
                          <Text variant="bodySmall" style={styles.statLabel}>
                            Duration
                          </Text>
                          <Text variant="bodyMedium" style={styles.statValue}>
                            {formatDuration(workout.duration_minutes)}
                          </Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text variant="bodySmall" style={styles.statLabel}>
                            Total Volume
                          </Text>
                          <Text variant="bodyMedium" style={styles.statValue}>
                            {workout.total_volume?.toLocaleString() || "0"}{" "}
                            {useMetricUnits ? "kg" : "lbs"}
                          </Text>
                        </View>
                      </View>
                    </Card.Content>
                  </Card>
                ))}
              </>
            )}
          </>
        )}

        {selectedTab === "cardio" && (
          <>
            {recentCardio.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Text style={styles.emptyText}>
                    No cardio activities yet. Log your first activity!
                  </Text>
                </Card.Content>
              </Card>
            ) : (
              <>
                {recentCardio.map((activity) => {
                  const activityType = CARDIO_ACTIVITIES.find(
                    (a) => a.id === activity.activity_type
                  );
                  return (
                    <Card key={activity.$id} style={styles.cardioCard}>
                      <Card.Content>
                        <View style={styles.cardioHeader}>
                          <Text variant="titleMedium" style={styles.cardioName}>
                            {activityType?.name || activity.activity_type}
                          </Text>
                          <Text variant="bodySmall" style={styles.cardioDate}>
                            {formatDate(activity.date)}
                          </Text>
                        </View>
                        <View style={styles.cardioStats}>
                          <View style={styles.statItem}>
                            <Text variant="bodySmall" style={styles.statLabel}>
                              Duration
                            </Text>
                            <Text variant="bodyMedium" style={styles.statValue}>
                              {formatDuration(activity.duration_minutes)}
                            </Text>
                          </View>
                          {activity.distance && (
                            <View style={styles.statItem}>
                              <Text
                                variant="bodySmall"
                                style={styles.statLabel}
                              >
                                Distance
                              </Text>
                              <Text
                                variant="bodyMedium"
                                style={styles.statValue}
                              >
                                {activity.distance.toFixed(2)} km
                              </Text>
                            </View>
                          )}
                          {activity.calories_burned && (
                            <View style={styles.statItem}>
                              <Text
                                variant="bodySmall"
                                style={styles.statLabel}
                              >
                                Calories
                              </Text>
                              <Text
                                variant="bodyMedium"
                                style={styles.statValue}
                              >
                                {activity.calories_burned} kcal
                              </Text>
                            </View>
                          )}
                        </View>
                      </Card.Content>
                    </Card>
                  );
                })}
              </>
            )}
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fabContainer}
        onPress={toggleMenu}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.fab,
            {
              transform: [
                {
                  rotate: fabRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "45deg"],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.fabIcon}>+</Text>
        </Animated.View>
      </TouchableOpacity>

      {menuVisible && (
        <Animated.View
          style={[
            styles.fabMenu,
            {
              opacity: menuAnimation,
              transform: [
                {
                  translateY: menuAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
                {
                  scale: menuAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              if (activeWorkout) {
                showAlert(
                  "Workout Already Active",
                  "You already have an active workout in progress. Please finish or stop it before starting a new one.",
                  [{ text: "OK" }]
                );
                toggleMenu();
                return;
              }
              toggleMenu();
              setStartWorkoutVisible(true);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.menuItemContent}>
              <IconButton
                icon="dumbbell"
                size={20}
                iconColor={theme.colors.onPrimary}
                style={styles.menuItemIconButton}
              />
              <Text style={styles.menuItemLabel}>Start Workout</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              toggleMenu();
              setLogCardioVisible(true);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.menuItemContent}>
              <IconButton
                icon="heart-pulse"
                size={20}
                iconColor={theme.colors.onPrimary}
                style={styles.menuItemIconButton}
              />
              <Text style={styles.menuItemLabel}>Log Cardio</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              toggleMenu();
              router.push("/create-workout");
            }}
            activeOpacity={0.8}
          >
            <View style={styles.menuItemContent}>
              <IconButton
                icon="clipboard-text"
                size={20}
                iconColor={theme.colors.onPrimary}
                style={styles.menuItemIconButton}
              />
              <Text style={styles.menuItemLabel}>Create Workout</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      <StartWorkoutModal
        visible={startWorkoutVisible}
        onDismiss={() => setStartWorkoutVisible(false)}
        onWorkoutStarted={() => {
          fetchRecentActivities();
          checkActiveWorkout();
          router.push("/workout");
        }}
      />

      <LogCardioModal
        visible={logCardioVisible}
        onDismiss={() => setLogCardioVisible(false)}
        onCardioLogged={() => {
          fetchRecentActivities();
        }}
      />
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
    scroll: {
      padding: 16,
      paddingBottom: 100,
    },
    title: {
      textAlign: "center",
      marginBottom: 16,
      color: theme.colors.onBackground,
    },
    activeWorkoutCard: {
      backgroundColor: theme.dark ? "#1e3a1e" : "#e8f5e9",
      marginBottom: 16,
      borderColor: "#4caf50",
      borderWidth: 2,
    },
    activeHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    activeTitle: {
      color: "#4caf50",
      marginBottom: 4,
    },
    workoutName: {
      color: theme.colors.onSurface,
      fontWeight: "bold",
    },
    timer: {
      color: theme.colors.primary,
      fontWeight: "bold",
      marginTop: 4,
    },
    liveChip: {
      backgroundColor: "#4caf50",
    },
    activeButtons: {
      flexDirection: "row",
      gap: 8,
    },
    continueButton: {
      backgroundColor: "#4caf50",
      flex: 1,
    },
    stopButton: {
      borderColor: "#ef5350",
      flex: 1,
    },
    tabsContainer: {
      flexDirection: "row",
      marginBottom: 16,
      backgroundColor: theme.colors.elevation.level1,
      borderRadius: 8,
      padding: 4,
    },
    tab: {
      flex: 1,
      padding: 12,
      alignItems: "center",
      borderRadius: 6,
    },
    activeTab: {
      backgroundColor: theme.colors.primary,
    },
    tabText: {
      color: theme.colors.onSurfaceVariant,
    },
    activeTabText: {
      color: theme.colors.onPrimary,
      fontWeight: "bold",
    },
    emptyCard: {
      backgroundColor: theme.colors.elevation.level1,
      marginTop: 16,
    },
    emptyText: {
      textAlign: "center",
      color: theme.colors.onSurfaceVariant,
      padding: 20,
    },
    sectionTitle: {
      marginTop: 16,
      marginBottom: 12,
      color: theme.colors.onBackground,
      fontWeight: "600",
    },
    templateCard: {
      marginBottom: 12,
      backgroundColor: theme.colors.elevation.level2,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
    },
    templateHeader: {
      marginBottom: 12,
    },
    templateInfo: {
      flex: 1,
    },
    templateName: {
      color: theme.colors.onSurface,
      fontWeight: "600",
      marginBottom: 4,
    },
    templateDescription: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: 4,
    },
    showMoreText: {
      color: theme.colors.primary,
      fontSize: 12,
      marginTop: 4,
      marginBottom: 4,
    },
    templateExercises: {
      color: theme.colors.outline,
      fontSize: 12,
    },
    templateActions: {
      flexDirection: "row",
      gap: 8,
    },
    templateStartButton: {
      flex: 1,
    },
    templateEditButton: {
      flex: 1,
    },
    workoutCard: {
      backgroundColor: theme.colors.elevation.level1,
      marginBottom: 12,
    },
    workoutHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    workoutInfo: {
      flex: 1,
    },
    workoutDate: {
      color: theme.colors.onSurfaceVariant,
      marginTop: 4,
    },
    completedBadge: {
      color: "#4caf50",
      fontWeight: "bold",
    },
    workoutStats: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.elevation.level3,
    },
    statItem: {
      alignItems: "center",
    },
    statLabel: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: 4,
    },
    statValue: {
      color: theme.colors.onSurface,
      fontWeight: "bold",
    },
    cardioCard: {
      backgroundColor: theme.colors.elevation.level1,
      marginBottom: 12,
    },
    cardioHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    cardioName: {
      color: theme.colors.onSurface,
    },
    cardioDate: {
      color: theme.colors.onSurfaceVariant,
    },
    cardioStats: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.elevation.level3,
    },
    fabContainer: {
      position: "absolute",
      right: 16,
      bottom: 16,
    },
    fab: {
      backgroundColor: theme.colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      width: 56,
      height: 56,
      borderRadius: 28,
      elevation: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      gap: 8,
    },
    fabIcon: {
      color: theme.colors.onPrimary,
      fontSize: 32,
      fontWeight: "bold",
      lineHeight: 32,
    },
    fabLabel: {
      color: theme.colors.onPrimary,
      fontSize: 14,
      fontWeight: "600",
    },
    fabMenu: {
      position: "absolute",
      right: 16,
      bottom: 90,
      gap: 12,
    },
    fabMenuItem: {
      backgroundColor: theme.colors.primary,
      borderRadius: 28,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
    },
    menuItemContent: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 12,
    },
    menuItemIconButton: {
      margin: 0,
    },
    menuItemLabel: {
      color: theme.colors.onPrimary,
      fontSize: 14,
      fontWeight: "600",
    },
  });
