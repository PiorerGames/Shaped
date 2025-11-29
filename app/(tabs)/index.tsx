import {
  StyleSheet,
  View,
  ScrollView,
  FlatList,
  Dimensions,
} from "react-native";
import { Button, useTheme, Text, Card, ProgressBar } from "react-native-paper";
import { useEffect, useState, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import MeasurementChart from "@/components/MeasurementChart";
import MeasurementDetailsModal from "@/components/MeasurementDetailsModal";
import {
  DATABASE_ID,
  databases,
  MEASUREMENTS_TABLE_ID,
  MEAL_ENTRIES_TABLE_ID,
  USER_DATA_TABLE_ID,
} from "@/lib/appwrite";
import { Query } from "react-native-appwrite";
import { useAuth } from "@/lib/auth-context";
import { Measurement, MealEntry } from "@/types/database.type";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo } from "react";
import Svg, { Circle } from "react-native-svg";
import { router } from "expo-router";
import InitialSetupModal from "@/components/InitialSetupModal";

export default function Index() {
  const theme = useTheme();
  const { user } = useAuth();

  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [todayCalories, setTodayCalories] = useState(0);
  const [todayProtein, setTodayProtein] = useState(0);
  const [todayFats, setTodayFats] = useState(0);
  const [todayCarbs, setTodayCarbs] = useState(0);
  const [todayMeals, setTodayMeals] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showInitialSetup, setShowInitialSetup] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  const [userData, setUserData] = useState<any>(null);

  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [proteinGoal, setProteinGoal] = useState(150);
  const [fatsGoal, setFatsGoal] = useState(65);
  const [carbsGoal, setCarbsGoal] = useState(250);

  const styles = createStyles(theme);

  // Dynamic color calculations based on percentage
  const caloriesColor = useMemo(() => {
    const percentage = (todayCalories / calorieGoal) * 100;
    if (percentage < 90) return theme.colors.onSurface;
    if (percentage <= 120) return "#4CAF50";
    return "#ff5252";
  }, [todayCalories, calorieGoal, theme.colors.onSurface]);

  const proteinColor = useMemo(() => {
    const percentage = (todayProtein / proteinGoal) * 100;
    if (percentage < 90) return theme.colors.onSurface;
    if (percentage <= 120) return "#4CAF50";
    return "#ff5252";
  }, [todayProtein, proteinGoal, theme.colors.onSurface]);

  const fatsColor = useMemo(() => {
    const percentage = (todayFats / fatsGoal) * 100;
    if (percentage < 90) return theme.colors.onSurface;
    if (percentage <= 120) return "#4CAF50";
    return "#ff5252";
  }, [todayFats, fatsGoal, theme.colors.onSurface]);

  const carbsColor = useMemo(() => {
    const percentage = (todayCarbs / carbsGoal) * 100;
    if (percentage < 90) return theme.colors.onSurface;
    if (percentage <= 120) return "#4CAF50";
    return "#ff5252";
  }, [todayCarbs, carbsGoal, theme.colors.onSurface]);

  useEffect(() => {
    if (user) {
      checkUserData();
      fetchMeasurements();
      fetchTodayMeals();
    }
  }, [user]);

  const checkUserData = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        USER_DATA_TABLE_ID,
        [Query.equal("user_id", user!.$id)]
      );

      if (response.documents.length === 0) {
        setShowInitialSetup(true);
      } else {
        const data = response.documents[0];
        setUserData(data);
        calculateNutritionGoals(data);
      }
    } catch (error) {
      console.log("Error checking user data:", error);
      setShowInitialSetup(true);
    }
  };

  const calculateNutritionGoals = (data: any) => {
    const { age, weight, height, sex, goal, goal_speed } = data;

    if (!age || !weight || !height || !sex) return;

    // Calculate BMR using Mifflin-St Jeor Equation
    let bmr;
    if (sex === "male") {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Apply activity multiplier (assuming moderate activity)
    const tdee = bmr * 1.55;

    // Adjust for goal
    let targetCalories = tdee;
    if (goal === "lose") {
      const deficit =
        goal_speed === "fast" ? 750 : goal_speed === "moderate" ? 500 : 250;
      targetCalories = tdee - deficit;
    } else if (goal === "gain") {
      const surplus =
        goal_speed === "fast" ? 500 : goal_speed === "moderate" ? 300 : 200;
      targetCalories = tdee + surplus;
    }

    // Calculate macros (40% carbs, 30% protein, 30% fat)
    const proteinCals = targetCalories * 0.3;
    const fatsCals = targetCalories * 0.3;
    const carbsCals = targetCalories * 0.4;

    setCalorieGoal(Math.round(targetCalories));
    setProteinGoal(Math.round(proteinCals / 4)); // 4 cal per gram
    setFatsGoal(Math.round(fatsCals / 9)); // 9 cal per gram
    setCarbsGoal(Math.round(carbsCals / 4)); // 4 cal per gram
  };

  const handleSetupComplete = () => {
    setShowInitialSetup(false);
    checkUserData();
  };

  useFocusEffect(
    useCallback(() => {
      if (user) {
        checkUserData(); // Reload nutrition goals
        fetchTodayMeals();
        fetchMeasurements(); // Reload measurements
      }
    }, [user])
  );

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

  const fetchTodayMeals = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await databases.listDocuments(
        DATABASE_ID,
        MEAL_ENTRIES_TABLE_ID,
        [Query.equal("user_id", user?.$id ?? ""), Query.equal("date", today)]
      );
      const meals = response.documents as unknown as MealEntry[];
      const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
      const totalProtein = meals.reduce((sum, meal) => sum + meal.protein, 0);
      const totalFats = meals.reduce((sum, meal) => sum + meal.fats, 0);
      const totalCarbs = meals.reduce((sum, meal) => sum + meal.carbs, 0);
      setTodayCalories(totalCalories);
      setTodayProtein(totalProtein);
      setTodayFats(totalFats);
      setTodayCarbs(totalCarbs);
      setTodayMeals(meals.length);
    } catch (error: any) {
      // Table doesn't exist yet - silently ignore
      if (error?.code === 404 || error?.message?.includes("not be found")) {
        console.log("Meal entries table not created yet");
      } else {
        console.error("Failed to fetch today's meals:", error);
      }
    }
  };

  // group measurement types
  const types = Array.from(new Set(measurements.map((m) => m.type)));

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            Dashboard
          </Text>
        </View>

        <Card style={styles.calorieCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              Today's Nutrition
            </Text>

            {/* Circular Calorie Chart */}
            <View style={styles.circularChartContainer}>
              <Svg width="200" height="200" style={styles.circularChart}>
                {/* Background circle */}
                <Circle
                  cx="100"
                  cy="100"
                  r="80"
                  stroke={theme.colors.surfaceVariant}
                  strokeWidth="16"
                  fill="none"
                />
                {/* Progress circle */}
                <Circle
                  cx="100"
                  cy="100"
                  r="80"
                  stroke={theme.colors.primary}
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 80}`}
                  strokeDashoffset={`${
                    2 *
                    Math.PI *
                    80 *
                    (1 - Math.min(todayCalories / calorieGoal, 1))
                  }`}
                  strokeLinecap="round"
                  transform="rotate(-90 100 100)"
                />
                {/* Red overlay for exceeded calories (only if > 110%) */}
                {todayCalories > calorieGoal * 1.1 && (
                  <Circle
                    cx="100"
                    cy="100"
                    r="80"
                    stroke="#ff5252"
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 80}`}
                    strokeDashoffset={`${
                      2 *
                      Math.PI *
                      80 *
                      (1 -
                        Math.min(
                          (todayCalories - calorieGoal) / calorieGoal,
                          1
                        ))
                    }`}
                    strokeLinecap="round"
                    transform="rotate(-90 100 100)"
                  />
                )}
              </Svg>
              <View style={styles.circularChartText}>
                <Text
                  variant="displaySmall"
                  style={[styles.calorieNumber, { color: caloriesColor }]}
                >
                  {todayCalories}
                </Text>
                <Text variant="bodyMedium" style={styles.calorieGoal}>
                  / {calorieGoal}
                </Text>
                <Text variant="bodySmall" style={styles.calorieLabel}>
                  calories
                </Text>
              </View>
            </View>

            {/* Macro Bars */}
            <View style={styles.macroContainer}>
              {/* Protein Bar */}
              <View style={styles.macroBar}>
                <Text variant="labelLarge" style={styles.macroTitle}>
                  Protein
                </Text>
                <View style={styles.verticalBarContainer}>
                  <View style={styles.verticalBarBackground}>
                    <View
                      style={[
                        styles.verticalBarFill,
                        {
                          height: `${Math.min(
                            (todayProtein / proteinGoal) * 100,
                            100
                          )}%`,
                          backgroundColor: "#4CAF50",
                        },
                      ]}
                    />
                    {todayProtein > proteinGoal * 1.1 && (
                      <View
                        style={[
                          styles.verticalBarOverlay,
                          {
                            height: `${Math.min(
                              ((todayProtein - proteinGoal) / proteinGoal) *
                                100,
                              100
                            )}%`,
                            backgroundColor: "#ff5252",
                          },
                        ]}
                      />
                    )}
                  </View>
                </View>
                <Text
                  variant="bodyMedium"
                  style={[styles.macroValue, { color: proteinColor }]}
                >
                  {todayProtein.toFixed(0)}g
                </Text>
                <Text variant="bodySmall" style={styles.macroGoal}>
                  / {proteinGoal}g
                </Text>
              </View>

              {/* Fats Bar */}
              <View style={styles.macroBar}>
                <Text variant="labelLarge" style={styles.macroTitle}>
                  Fats
                </Text>
                <View style={styles.verticalBarContainer}>
                  <View style={styles.verticalBarBackground}>
                    <View
                      style={[
                        styles.verticalBarFill,
                        {
                          height: `${Math.min(
                            (todayFats / fatsGoal) * 100,
                            100
                          )}%`,
                          backgroundColor: "#FFC107",
                        },
                      ]}
                    />
                    {todayFats > fatsGoal * 1.1 && (
                      <View
                        style={[
                          styles.verticalBarOverlay,
                          {
                            height: `${Math.min(
                              ((todayFats - fatsGoal) / fatsGoal) * 100,
                              100
                            )}%`,
                            backgroundColor: "#ff5252",
                          },
                        ]}
                      />
                    )}
                  </View>
                </View>
                <Text
                  variant="bodyMedium"
                  style={[styles.macroValue, { color: fatsColor }]}
                >
                  {todayFats.toFixed(0)}g
                </Text>
                <Text variant="bodySmall" style={styles.macroGoal}>
                  / {fatsGoal}g
                </Text>
              </View>

              {/* Carbs Bar */}
              <View style={styles.macroBar}>
                <Text variant="labelLarge" style={styles.macroTitle}>
                  Carbs
                </Text>
                <View style={styles.verticalBarContainer}>
                  <View style={styles.verticalBarBackground}>
                    <View
                      style={[
                        styles.verticalBarFill,
                        {
                          height: `${Math.min(
                            (todayCarbs / carbsGoal) * 100,
                            100
                          )}%`,
                          backgroundColor: "#9C27B0",
                        },
                      ]}
                    />
                    {todayCarbs > carbsGoal * 1.1 && (
                      <View
                        style={[
                          styles.verticalBarOverlay,
                          {
                            height: `${Math.min(
                              ((todayCarbs - carbsGoal) / carbsGoal) * 100,
                              100
                            )}%`,
                            backgroundColor: "#ff5252",
                          },
                        ]}
                      />
                    )}
                  </View>
                </View>
                <Text
                  variant="bodyMedium"
                  style={[styles.macroValue, { color: carbsColor }]}
                >
                  {todayCarbs.toFixed(0)}g
                </Text>
                <Text variant="bodySmall" style={styles.macroGoal}>
                  / {carbsGoal}g
                </Text>
              </View>
            </View>

            <Text variant="bodySmall" style={styles.mealsCount}>
              {todayMeals} meal{todayMeals !== 1 ? "s" : ""} logged today
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.measurementsCard}>
          <Card.Content>
            <View style={styles.measurementsHeader}>
              <Text variant="titleLarge">Measurements</Text>
              <Button
                mode="outlined"
                onPress={() => router.push("/measurements")}
                compact
                style={styles.viewAllButton}
              >
                View All
              </Button>
            </View>

            {measurements.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No measurements found.</Text>
                <Button
                  mode="contained"
                  onPress={() => router.push("/measurements")}
                  style={styles.addFirstButton}
                >
                  Add Measurement
                </Button>
              </View>
            ) : (
              <>
                <FlatList
                  data={types}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={Dimensions.get("window").width - 64}
                  decelerationRate="fast"
                  contentContainerStyle={styles.chartSlideshow}
                  onScroll={(e) => {
                    const slideIndex = Math.round(
                      e.nativeEvent.contentOffset.x /
                        (Dimensions.get("window").width - 64)
                    );
                    setCurrentSlide(slideIndex);
                  }}
                  scrollEventThrottle={16}
                  renderItem={({ item }) => (
                    <View
                      style={[
                        styles.chartSlide,
                        { width: Dimensions.get("window").width - 64 },
                      ]}
                    >
                      <MeasurementChart
                        measurements={measurements}
                        type={item}
                        onPress={() => {
                          setSelectedType(item);
                          setDetailsVisible(true);
                        }}
                      />
                    </View>
                  )}
                  keyExtractor={(item) => item}
                  ref={(ref) => {
                    if (ref) {
                      (ref as any).scrollToIndex = (params: {
                        index: number;
                        animated?: boolean;
                      }) => {
                        ref.scrollToOffset({
                          offset:
                            params.index *
                            (Dimensions.get("window").width - 64),
                          animated: params.animated ?? true,
                        });
                      };
                    }
                  }}
                />
                <View style={styles.paginationContainer}>
                  {types.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.paginationDot,
                        currentSlide === index && styles.paginationDotActive,
                      ]}
                    />
                  ))}
                </View>
              </>
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      <InitialSetupModal
        visible={showInitialSetup}
        userId={user?.$id ?? ""}
        onComplete={handleSetupComplete}
      />

      <MeasurementDetailsModal
        visible={detailsVisible}
        onDismiss={() => setDetailsVisible(false)}
        measurements={measurements}
        type={selectedType}
        onRefresh={fetchMeasurements}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.background,
      justifyContent: "flex-start",
      alignItems: "stretch",
      height: "100%",
    },
    header: {
      flexDirection: "column",
      alignItems: "center",
      marginBottom: 8,
      marginTop: 0,
    },
    scroll: {
      paddingBottom: 24,
      paddingTop: 16,
    },
    measurementsCard: {
      backgroundColor: theme.colors.elevation.level1,
      marginTop: 16,
    },
    measurementsHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    viewAllButton: {
      borderColor: theme.colors.primary,
    },
    emptyContainer: {
      padding: 16,
      alignItems: "center",
    },
    emptyText: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: 16,
    },
    addFirstButton: {
      marginTop: 8,
    },
    chartSlideshow: {
      paddingVertical: 8,
    },
    chartSlide: {
      paddingHorizontal: 4,
    },
    paginationContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 16,
      gap: 8,
    },
    paginationDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.surfaceDisabled,
    },
    paginationDotActive: {
      backgroundColor: theme.colors.primary,
      width: 24,
    },
    calorieCard: {
      backgroundColor: theme.colors.elevation.level1,
      marginBottom: 16,
    },
    cardTitle: {
      textAlign: "center",
      marginBottom: 16,
    },
    circularChartContainer: {
      alignItems: "center",
      justifyContent: "center",
      marginVertical: 16,
      position: "relative",
    },
    circularChart: {},
    circularChartText: {
      position: "absolute",
      alignItems: "center",
      justifyContent: "center",
    },
    calorieNumber: {
      fontSize: 48,
      fontWeight: "bold",
      color: theme.colors.primary,
      lineHeight: 48,
    },
    calorieGoal: {
      color: theme.colors.onSurfaceVariant,
      marginTop: 4,
    },
    calorieLabel: {
      color: theme.colors.outline,
      marginTop: 2,
    },
    macroContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: 24,
      marginBottom: 16,
    },
    macroBar: {
      alignItems: "center",
      flex: 1,
    },
    macroTitle: {
      marginBottom: 8,
      color: theme.colors.onSurface,
      fontWeight: "bold",
    },
    verticalBarContainer: {
      height: 120,
      width: 40,
      marginVertical: 8,
    },
    verticalBarBackground: {
      flex: 1,
      backgroundColor: theme.colors.elevation.level3,
      borderRadius: 20,
      overflow: "hidden",
      justifyContent: "flex-end",
    },
    verticalBarFill: {
      width: "100%",
      borderRadius: 20,
    },
    verticalBarOverlay: {
      position: "absolute",
      bottom: 0,
      width: "100%",
      borderRadius: 20,
    },
    macroValue: {
      fontWeight: "bold",
      marginTop: 4,
    },
    macroGoal: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 11,
    },
    mealsCount: {
      textAlign: "center",
      color: theme.colors.onSurfaceVariant,
      marginTop: 8,
    },
    title: {
      textAlign: "center",
      marginVertical: 0,
      color: theme.colors.onBackground,
      fontWeight: "400",
    },
  });
