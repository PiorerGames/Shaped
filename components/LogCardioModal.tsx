import { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Modal,
  Portal,
  Text,
  Button,
  TextInput,
  Card,
  useTheme,
} from "react-native-paper";
import { useAuth } from "@/lib/auth-context";
import {
  databases,
  DATABASE_ID,
  CARDIO_ACTIVITIES_TABLE_ID,
  USER_DATA_TABLE_ID,
} from "@/lib/appwrite";
import { ID } from "react-native-appwrite";
import { CARDIO_ACTIVITIES } from "@/lib/exerciseAPI";
import { useCustomAlert } from "@/components/CustomAlert";

// MET values for different cardio activities (average intensity)
const MET_VALUES: { [key: string]: number } = {
  running: 9.8,
  cycling: 7.5,
  swimming: 7.0,
  walking: 4.5,
  rowing: 6.0,
  elliptical: 5.0,
  stairmaster: 9.0,
  jump_rope: 12.0,
  hiking: 6.0,
  boxing: 9.0,
  dancing: 5.5,
  yoga: 3.0,
  pilates: 4.0,
  aerobics: 7.0,
  spinning: 8.5,
  basketball: 8.0,
  soccer: 10.0,
  tennis: 7.5,
  kickboxing: 10.0,
  crossfit: 8.0,
  other: 6.0,
};

// Average weight assumption for calculation (70kg / 154lbs)
const AVERAGE_WEIGHT_KG = 70;

interface LogCardioModalProps {
  visible: boolean;
  onDismiss: () => void;
  onCardioLogged: () => void;
}

export default function LogCardioModal({
  visible,
  onDismiss,
  onCardioLogged,
}: LogCardioModalProps) {
  const { user } = useAuth();
  const theme = useTheme();
  const styles = createStyles(theme);
  const { showAlert, AlertComponent } = useCustomAlert();
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState("");
  const [distance, setDistance] = useState("");
  const [avgHeartRate, setAvgHeartRate] = useState("");
  const [notes, setNotes] = useState("");
  const [manualCalories, setManualCalories] = useState("");
  const [isLogging, setIsLogging] = useState(false);
  const [userWeight, setUserWeight] = useState<number | null>(null);
  const [userHeight, setUserHeight] = useState<number | null>(null);
  const [userAge, setUserAge] = useState<number | null>(null);
  const [userGender, setUserGender] = useState<string | null>(null);

  // Fetch user data for calorie calculation
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.$id) return;
      try {
        const response = await databases.listDocuments(
          DATABASE_ID,
          USER_DATA_TABLE_ID
        );
        if (response.documents.length > 0) {
          const data = response.documents[0];
          setUserWeight(data.weight || null);
          setUserHeight(data.height || null);
          setUserAge(data.age || null);
          setUserGender(data.gender || null);
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    };
    if (visible) {
      fetchUserData();
    }
  }, [visible, user]);

  // Calculate calories burned based on activity, duration, and optionally distance
  const calculateCalories = (
    activityType: string,
    duration: number,
    distance?: number,
    weightKg?: number,
    heartRate?: number
  ): number => {
    const weight = weightKg || userWeight || 70; // Use provided weight, user weight, or default 70kg
    const age = userAge || 30;
    const gender = userGender || "male";
    const height = userHeight || 170;

    // Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
    let bmr: number;
    if (gender === "male") {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Get base MET value for activity
    let met = MET_VALUES[activityType] || 6.0;

    // Adjust MET based on heart rate if provided
    if (heartRate && heartRate > 0) {
      const maxHeartRate = 220 - age;
      const heartRatePercentage = (heartRate / maxHeartRate) * 100;

      // Adjust MET based on heart rate zone
      if (heartRatePercentage > 90) {
        met *= 1.3; // Maximum effort zone
      } else if (heartRatePercentage > 80) {
        met *= 1.2; // Anaerobic zone
      } else if (heartRatePercentage > 70) {
        met *= 1.1; // Aerobic zone
      } else if (heartRatePercentage < 50) {
        met *= 0.8; // Light activity zone
      }
    }

    // Calculate speed-based adjustments for distance activities
    if (distance && distance > 0) {
      const hours = duration / 60;
      const speed = distance / hours; // km/h

      switch (activityType) {
        case "running":
          // Adjust based on running speed (pace)
          if (speed > 15) met *= 1.3; // Very fast running (< 4 min/km)
          else if (speed > 12) met *= 1.2; // Fast running (4-5 min/km)
          else if (speed > 9) met *= 1.1; // Moderate running (5.5-6.5 min/km)
          else if (speed < 6) met *= 0.9; // Slow jogging
          break;

        case "cycling":
          // Adjust based on cycling speed
          if (speed > 30) met *= 1.3; // Racing pace
          else if (speed > 25) met *= 1.2; // Fast cycling
          else if (speed > 20) met *= 1.1; // Moderate cycling
          else if (speed < 15) met *= 0.9; // Leisurely cycling
          break;

        case "swimming":
          // Adjust based on swimming pace
          if (speed > 3) met *= 1.3; // Fast swimming
          else if (speed > 2) met *= 1.1; // Moderate swimming
          else if (speed < 1.5) met *= 0.9; // Leisurely swimming
          break;

        case "walking":
          // Adjust based on walking speed
          if (speed > 6) met *= 1.2; // Very brisk walking
          else if (speed > 5) met *= 1.1; // Brisk walking
          else if (speed < 4) met *= 0.9; // Leisurely walking
          break;

        case "rowing":
          // Adjust based on rowing intensity
          if (speed > 5) met *= 1.2; // High intensity
          else if (speed < 3) met *= 0.9; // Low intensity
          break;
      }
    }

    // Formula: Calories = MET × weight (kg) × duration (hours)
    const hours = duration / 60;
    const calories = met * weight * hours;

    return Math.round(calories);
  };

  const resetForm = () => {
    setSelectedActivity(null);
    setDurationMinutes("");
    setDistance("");
    setAvgHeartRate("");
    setNotes("");
    setManualCalories("");
  };

  const handleDismiss = () => {
    resetForm();
    onDismiss();
  };

  const handleLogCardio = async () => {
    if (!selectedActivity) {
      showAlert("Error", "Please select a cardio activity");
      return;
    }

    const duration = parseInt(durationMinutes);
    if (!duration || duration <= 0) {
      showAlert("Error", "Please enter a valid duration");
      return;
    }

    setIsLogging(true);
    try {
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];

      const activityData: any = {
        user_id: user?.$id,
        date: dateStr,
        activity_type: selectedActivity,
        duration_minutes: duration,
      };

      if (distance) {
        activityData.distance = parseFloat(distance);
      }

      // Calculate and add calories
      let calories: number;
      if (selectedActivity === "other" && manualCalories) {
        // Use manual calories input for "Other Cardio"
        calories = parseInt(manualCalories);
      } else {
        // Calculate calories for other activities
        calories = calculateCalories(
          selectedActivity,
          duration,
          distance ? parseFloat(distance) : undefined,
          undefined,
          avgHeartRate ? parseInt(avgHeartRate) : undefined
        );
      }
      activityData.calories_burned = calories;

      if (avgHeartRate) {
        activityData.avg_heart_rate = parseInt(avgHeartRate);
      }
      if (notes.trim()) {
        activityData.notes = notes.trim();
      }

      await databases.createDocument(
        DATABASE_ID,
        CARDIO_ACTIVITIES_TABLE_ID,
        ID.unique(),
        activityData
      );

      showAlert("Success", "Cardio activity logged successfully!");
      handleDismiss();
      onCardioLogged();
    } catch (error) {
      console.error("Failed to log cardio:", error);
      showAlert("Error", "Failed to log cardio activity");
    } finally {
      setIsLogging(false);
    }
  };

  const selectedActivityData = CARDIO_ACTIVITIES.find(
    (a) => a.id === selectedActivity
  );

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={styles.modal}
      >
        <View style={styles.header}>
          <Text variant="headlineSmall">Log Cardio Activity</Text>
          <Pressable onPress={handleDismiss}>
            <Text style={styles.closeButton}>✕</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView style={styles.content}>
            {!selectedActivity ? (
              <>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Select Activity Type
                </Text>
                <View style={styles.activitiesList}>
                  {CARDIO_ACTIVITIES.map((activity) => {
                    const caloriesPer60Min = calculateCalories(activity.id, 60);
                    return (
                      <Pressable
                        key={activity.id}
                        style={styles.activityCard}
                        onPress={() => setSelectedActivity(activity.id)}
                      >
                        <Card style={styles.activityCardInner}>
                          <Card.Content style={styles.activityContent}>
                            <View style={styles.activityTextContainer}>
                              <Text
                                variant="bodyLarge"
                                style={styles.activityName}
                              >
                                {activity.name}
                              </Text>
                              <Text
                                variant="bodySmall"
                                style={styles.activityCalories}
                              >
                                ~{caloriesPer60Min} kcal/hour
                              </Text>
                            </View>
                          </Card.Content>
                        </Card>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <View style={styles.selectedActivity}>
                  <Text variant="titleLarge" style={styles.selectedName}>
                    {selectedActivityData?.name}
                  </Text>
                  <Button
                    mode="text"
                    onPress={() => setSelectedActivity(null)}
                    compact
                  >
                    Change Activity
                  </Button>
                </View>

                <TextInput
                  label="Duration (minutes) *"
                  value={durationMinutes}
                  onChangeText={setDurationMinutes}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.input}
                />

                {selectedActivityData?.hasDistance && (
                  <TextInput
                    label="Distance (km)"
                    value={distance}
                    onChangeText={setDistance}
                    keyboardType="decimal-pad"
                    mode="outlined"
                    style={styles.input}
                  />
                )}

                {selectedActivity === "other" ? (
                  <TextInput
                    label="Calories Burned *"
                    value={manualCalories}
                    onChangeText={setManualCalories}
                    keyboardType="numeric"
                    mode="outlined"
                    style={styles.input}
                    placeholder="Enter calories burned"
                  />
                ) : (
                  <>
                    {durationMinutes && parseInt(durationMinutes) > 0 && (
                      <Card style={styles.caloriesCard}>
                        <Card.Content>
                          <Text
                            variant="bodySmall"
                            style={styles.caloriesLabel}
                          >
                            Estimated Calories Burned
                          </Text>
                          <Text
                            variant="headlineMedium"
                            style={styles.caloriesValue}
                          >
                            {calculateCalories(
                              selectedActivity!,
                              parseInt(durationMinutes),
                              distance ? parseFloat(distance) : undefined,
                              undefined,
                              avgHeartRate ? parseInt(avgHeartRate) : undefined
                            )}{" "}
                            kcal
                          </Text>
                        </Card.Content>
                      </Card>
                    )}

                    <TextInput
                      label="Average Heart Rate (bpm)"
                      value={avgHeartRate}
                      onChangeText={setAvgHeartRate}
                      keyboardType="numeric"
                      mode="outlined"
                      style={styles.input}
                    />
                  </>
                )}

                <TextInput
                  label="Notes"
                  value={notes}
                  onChangeText={setNotes}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  style={styles.input}
                />

                <Button
                  mode="contained"
                  onPress={handleLogCardio}
                  loading={isLogging}
                  disabled={isLogging}
                  style={styles.logButton}
                >
                  Log Activity
                </Button>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
      <AlertComponent />
    </Portal>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    modal: {
      backgroundColor: theme.colors.surface,
      margin: 20,
      borderRadius: 12,
      maxHeight: "85%",
      minHeight: 500,
      elevation: 8,
    },
    keyboardView: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
    },
    closeButton: {
      fontSize: 24,
      color: theme.colors.onSurface,
      padding: 4,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    sectionTitle: {
      color: theme.colors.onSurface,
      marginBottom: 16,
      fontWeight: "600",
    },
    activitiesList: {
      gap: 10,
      paddingBottom: 20,
    },
    activityCard: {
      width: "100%",
      marginBottom: 8,
    },
    activityCardInner: {
      backgroundColor: theme.colors.surfaceVariant,
      elevation: 2,
    },
    activityContent: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    activityTextContainer: {
      flex: 1,
    },
    activityName: {
      color: theme.colors.onSurfaceVariant,
      fontWeight: "600",
      marginBottom: 4,
    },
    activityCalories: {
      color: theme.colors.onSurfaceVariant,
      opacity: 0.7,
    },
    selectedActivity: {
      alignItems: "center",
      marginBottom: 24,
      padding: 20,
      backgroundColor: theme.colors.primaryContainer,
      borderRadius: 12,
      elevation: 2,
    },
    selectedName: {
      color: theme.colors.onPrimaryContainer,
      marginBottom: 8,
      fontWeight: "600",
    },
    caloriesCard: {
      backgroundColor: theme.colors.secondaryContainer,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
      elevation: 2,
    },
    caloriesLabel: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: 4,
    },
    caloriesValue: {
      color: theme.colors.primary,
      fontWeight: "bold",
    },
    input: {
      marginBottom: 16,
    },
    logButton: {
      marginTop: 8,
      marginBottom: 16,
    },
  });
