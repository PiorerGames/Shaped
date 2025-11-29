import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Text,
  Card,
  ProgressBar,
  Portal,
  useTheme,
  IconButton,
} from "react-native-paper";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Calendar } from "react-native-calendars";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/lib/auth-context";
import {
  DATABASE_ID,
  databases,
  MEAL_ENTRIES_TABLE_ID,
  USER_DATA_TABLE_ID,
} from "@/lib/appwrite";
import { Query } from "react-native-appwrite";
import { MealEntry } from "@/types/database.type";
import AddMealModal from "@/components/AddMealModal";
import { useCustomAlert } from "@/components/CustomAlert";

export default function Meals() {
  const { user } = useAuth();
  const theme = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"search" | "custom" | "barcode">(
    "search"
  );
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const calendarAnim = useRef(
    new Animated.Value(calendarExpanded ? 1 : 0)
  ).current;
  const [showMenu, setShowMenu] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const menuAnimation = useRef(new Animated.Value(0)).current;
  const fabRotation = useRef(new Animated.Value(0)).current;
  const currentAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const [dailyTotals, setDailyTotals] = useState({
    calories: 0,
    protein: 0,
    fats: 0,
    carbs: 0,
  });

  // Dynamic nutrition goals based on user data
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [proteinGoal, setProteinGoal] = useState(150);
  const [fatsGoal, setFatsGoal] = useState(65);
  const [carbsGoal, setCarbsGoal] = useState(250);

  // Dynamic color calculations based on percentage
  const caloriesColor = useMemo(() => {
    const percentage = (dailyTotals.calories / calorieGoal) * 100;
    if (percentage < 90) return theme.colors.onSurface;
    if (percentage <= 120) return "#4CAF50";
    return "#ff5252";
  }, [dailyTotals.calories, calorieGoal, theme.colors.onSurface]);

  const proteinColor = useMemo(() => {
    const percentage = (dailyTotals.protein / proteinGoal) * 100;
    if (percentage < 90) return theme.colors.onSurface;
    if (percentage <= 120) return "#4CAF50";
    return "#ff5252";
  }, [dailyTotals.protein, proteinGoal, theme.colors.onSurface]);

  const fatsColor = useMemo(() => {
    const percentage = (dailyTotals.fats / fatsGoal) * 100;
    if (percentage < 90) return theme.colors.onSurface;
    if (percentage <= 120) return "#4CAF50";
    return "#ff5252";
  }, [dailyTotals.fats, fatsGoal, theme.colors.onSurface]);

  const carbsColor = useMemo(() => {
    const percentage = (dailyTotals.carbs / carbsGoal) * 100;
    if (percentage < 90) return theme.colors.onSurface;
    if (percentage <= 120) return "#4CAF50";
    return "#ff5252";
  }, [dailyTotals.carbs, carbsGoal, theme.colors.onSurface]);

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
      loadUserDataAndCalculateGoals();
      fetchMeals();
    }
  }, [user, selectedDate]);

  // Reload nutrition goals when screen comes into focus (e.g., after changing settings)
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadUserDataAndCalculateGoals();
      }
    }, [user])
  );

  const loadUserDataAndCalculateGoals = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        USER_DATA_TABLE_ID,
        [Query.equal("user_id", user!.$id)]
      );

      if (response.documents.length > 0) {
        const data = response.documents[0];
        calculateNutritionGoals(data);
      }
    } catch (error) {
      console.log("Error loading user data for goals:", error);
      // Keep default values if error
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

  const fetchMeals = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        MEAL_ENTRIES_TABLE_ID,
        [
          Query.equal("user_id", user?.$id ?? ""),
          Query.equal("date", selectedDate),
          Query.orderDesc("$createdAt"),
        ]
      );

      const fetchedMeals = response.documents as unknown as MealEntry[];
      setMeals(fetchedMeals);

      // Calculate totals
      const totals = fetchedMeals.reduce(
        (acc, meal) => ({
          calories: acc.calories + meal.calories,
          protein: acc.protein + meal.protein,
          fats: acc.fats + meal.fats,
          carbs: acc.carbs + meal.carbs,
        }),
        { calories: 0, protein: 0, fats: 0, carbs: 0 }
      );
      setDailyTotals(totals);
    } catch (error: any) {
      // Table doesn't exist yet - silently ignore
      if (error?.code === 404 || error?.message?.includes("not be found")) {
        console.log("Meal entries table not created yet");
      } else {
        console.error("Failed to fetch meals:", error);
      }
    }
  };

  const deleteMeal = async (mealId: string) => {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        MEAL_ENTRIES_TABLE_ID,
        mealId
      );
      fetchMeals();
    } catch (error) {
      console.error("Failed to delete meal:", error);
    }
  };
  const confirmDeleteWithAlert = (meal: MealEntry) => {
    showAlert(
      "Delete Meal?",
      `Are you sure you want to remove "${meal.food_name}" from your daily log?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await databases.deleteDocument(
                DATABASE_ID,
                MEAL_ENTRIES_TABLE_ID,
                meal.$id
              );
              fetchMeals();
            } catch (e) {
              console.error(e);
              showAlert("Error", "Failed to delete the meal.");
            }
          },
        },
      ]
    );
  };

  const markedDates = {
    [selectedDate]: {
      selected: true,
      selectedColor: theme.colors.primary,
    },
  };

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.title}>
              Calorie Tracker
            </Text>
            <Button
              mode="text"
              onPress={() => setCalendarExpanded(!calendarExpanded)}
              icon={calendarExpanded ? "chevron-up" : "chevron-down"}
              textColor={theme.colors.primary}
              style={styles.headerButton}
            >
              {calendarExpanded ? "Hide" : "Show"} Calendar
            </Button>
          </View>

          {!calendarExpanded && (
            <Card style={styles.dateCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.dateText}>
                  {new Date(selectedDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </Card.Content>
            </Card>
          )}

          {calendarExpanded && (
            <Calendar
              current={selectedDate}
              onDayPress={(day) => setSelectedDate(day.dateString)}
              markedDates={markedDates}
              theme={{
                calendarBackground: theme.colors.elevation.level1,
                textSectionTitleColor: theme.colors.onSurface,
                selectedDayBackgroundColor: theme.colors.primary,
                selectedDayTextColor: theme.colors.onPrimary,
                todayTextColor: theme.colors.primary,
                dayTextColor: theme.colors.onSurface,
                textDisabledColor: theme.colors.onSurfaceDisabled,
                monthTextColor: theme.colors.onSurface,
                arrowColor: theme.colors.primary,
              }}
              style={styles.calendar}
            />
          )}

          <Card style={styles.summaryCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.summaryTitle}>
                Daily Summary - {new Date(selectedDate).toLocaleDateString()}
              </Text>

              <View style={styles.macroRow}>
                <View style={styles.macroItem}>
                  <Text
                    variant="headlineMedium"
                    style={[
                      styles.calorieNumber,
                      {
                        color: caloriesColor,
                      },
                    ]}
                  >
                    {dailyTotals.calories}
                  </Text>
                  <Text variant="bodySmall">/ {calorieGoal} kcal</Text>
                  <ProgressBar
                    progress={Math.min(dailyTotals.calories / calorieGoal, 1)}
                    color="#2196F3"
                    style={styles.progressBar}
                  />
                </View>
              </View>

              <View style={styles.macroGrid}>
                <View style={styles.macroBox}>
                  <Text variant="labelSmall" style={styles.proteinLabel}>
                    Protein
                  </Text>
                  <Text
                    variant="titleLarge"
                    style={{
                      color: proteinColor,
                      fontWeight: "bold",
                    }}
                  >
                    {dailyTotals.protein.toFixed(1)}g
                  </Text>
                  <Text variant="bodySmall">/ {proteinGoal}g</Text>
                  <ProgressBar
                    progress={Math.min(dailyTotals.protein / proteinGoal, 1)}
                    color="#4CAF50"
                    style={styles.smallProgress}
                  />
                </View>

                <View style={styles.macroBox}>
                  <Text variant="labelSmall" style={styles.fatsLabel}>
                    Fats
                  </Text>
                  <Text
                    variant="titleLarge"
                    style={{ color: fatsColor, fontWeight: "bold" }}
                  >
                    {dailyTotals.fats.toFixed(1)}g
                  </Text>
                  <Text variant="bodySmall">/ {fatsGoal}g</Text>
                  <ProgressBar
                    progress={Math.min(dailyTotals.fats / fatsGoal, 1)}
                    color="#FF9800"
                    style={styles.smallProgress}
                  />
                </View>

                <View style={styles.macroBox}>
                  <Text variant="labelSmall" style={styles.carbsLabel}>
                    Carbs
                  </Text>
                  <Text
                    variant="titleLarge"
                    style={{
                      color: carbsColor,
                      fontWeight: "bold",
                    }}
                  >
                    {dailyTotals.carbs.toFixed(1)}g
                  </Text>
                  <Text variant="bodySmall">/ {carbsGoal}g</Text>
                  <ProgressBar
                    progress={Math.min(dailyTotals.carbs / carbsGoal, 1)}
                    color="#9C27B0"
                    style={styles.smallProgress}
                  />
                </View>
              </View>
            </Card.Content>
          </Card>

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Meals
          </Text>

          {meals.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>
                  No meals logged for this day
                </Text>
              </Card.Content>
            </Card>
          ) : (
            meals.map((meal) => (
              <Card key={meal.$id} style={styles.mealCard}>
                <Card.Content>
                  <View style={styles.mealHeader}>
                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium">{meal.food_name}</Text>
                      {meal.meal_type && (
                        <Text variant="bodySmall" style={styles.mealType}>
                          {meal.meal_type}
                        </Text>
                      )}
                      <Text variant="bodySmall" style={styles.servings}>
                        {meal.servings} serving{meal.servings !== 1 ? "s" : ""}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => confirmDeleteWithAlert(meal)}
                      style={styles.deleteButton}
                    >
                      <Text style={styles.deleteText}>✕</Text>
                    </Pressable>
                  </View>

                  <View style={styles.nutritionRow}>
                    <View style={styles.nutritionItem}>
                      <Text variant="labelSmall">Calories</Text>
                      <Text variant="titleSmall">{meal.calories}</Text>
                    </View>
                    <View style={styles.nutritionItem}>
                      <Text variant="labelSmall">Protein</Text>
                      <Text variant="titleSmall">
                        {meal.protein.toFixed(1)}g
                      </Text>
                    </View>
                    <View style={styles.nutritionItem}>
                      <Text variant="labelSmall">Fats</Text>
                      <Text variant="titleSmall">{meal.fats.toFixed(1)}g</Text>
                    </View>
                    <View style={styles.nutritionItem}>
                      <Text variant="labelSmall">Carbs</Text>
                      <Text variant="titleSmall">{meal.carbs.toFixed(1)}g</Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))
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
                toggleMenu();
                setModalMode("search");
                setModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.menuItemContent}>
                <IconButton
                  icon="magnify"
                  size={20}
                  iconColor={theme.colors.onPrimary}
                  style={styles.menuItemIconButton}
                />
                <Text style={styles.menuItemLabel}>Search Foods</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={() => {
                toggleMenu();
                setModalMode("custom");
                setModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.menuItemContent}>
                <IconButton
                  icon="plus"
                  size={20}
                  iconColor={theme.colors.onPrimary}
                  style={styles.menuItemIconButton}
                />
                <Text style={styles.menuItemLabel}>Add Custom Meal</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={() => {
                toggleMenu();
                setModalMode("barcode");
                setModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.menuItemContent}>
                <IconButton
                  icon="barcode-scan"
                  size={20}
                  iconColor={theme.colors.onPrimary}
                  style={styles.menuItemIconButton}
                />
                <Text style={styles.menuItemLabel}>Scan Barcode</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        <Portal>
          <AddMealModal
            visible={modalVisible}
            onDismiss={() => setModalVisible(false)}
            selectedDate={selectedDate}
            onMealAdded={fetchMeals}
            initialMode={modalMode}
          />
        </Portal>
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
    scroll: {
      padding: 16,
      paddingBottom: 180,
    },
    header: {
      flexDirection: "column",
      alignItems: "center",
      marginBottom: 8,
    },
    headerButton: {
      marginTop: -10,
      alignSelf: "center",
    },
    title: {
      textAlign: "center",
      marginBottom: 16,
      color: theme.colors.onBackground,
    },
    dateCard: {
      backgroundColor: theme.colors.elevation.level1,
      marginBottom: 16,
    },
    dateText: {
      textAlign: "center",
      color: theme.colors.onSurface,
    },
    calendar: {
      marginBottom: 16,
      borderRadius: 8,
    },
    summaryCard: {
      marginBottom: 0,
      backgroundColor: theme.colors.elevation.level1,
    },
    summaryTitle: {
      marginBottom: 16,
      textAlign: "center",
    },
    macroRow: {
      marginBottom: 0,
    },
    macroItem: {
      alignItems: "center",
    },
    calorieNumber: {
      fontSize: 48,
      fontWeight: "bold",
      color: theme.colors.primary,
      marginVertical: 5,
      paddingTop: 10,
    },
    progressBar: {
      width: "100%",
      height: 8,
      borderRadius: 4,
      marginTop: 8,
    },
    macroGrid: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 8,
    },
    macroBox: {
      flex: 1,
      alignItems: "center",
      padding: 8,
    },
    macroLabel: {
      marginBottom: 4,
      color: theme.colors.onSurfaceVariant,
    },
    proteinLabel: {
      marginBottom: 4,
      color: "#4CAF50",
      fontWeight: "bold",
    },
    fatsLabel: {
      marginBottom: 4,
      color: "#FF9800",
      fontWeight: "bold",
    },
    carbsLabel: {
      marginBottom: 4,
      color: "#9C27B0",
      fontWeight: "bold",
    },
    smallProgress: {
      width: "100%",
      height: 6,
      borderRadius: 3,
      marginTop: 4,
    },
    sectionTitle: {
      marginVertical: 16,
      color: theme.colors.onBackground,
    },
    emptyCard: {
      backgroundColor: theme.colors.elevation.level1,
    },
    emptyText: {
      textAlign: "center",
      color: theme.colors.onSurfaceVariant,
    },
    mealCard: {
      marginBottom: 12,
      backgroundColor: theme.colors.elevation.level2,
    },
    mealHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    mealType: {
      color: theme.colors.primary,
      marginTop: 4,
      textTransform: "capitalize",
    },
    servings: {
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },
    deleteButton: {
      padding: 4,
    },
    deleteText: {
      fontSize: 20,
      color: theme.colors.error,
    },
    nutritionRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline,
    },
    nutritionItem: {
      alignItems: "center",
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
    },
    fabIcon: {
      color: theme.colors.onPrimary,
      fontSize: 32,
      fontWeight: "bold",
      lineHeight: 32,
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
      fontSize: 16,
      fontWeight: "600",
    },
  });
