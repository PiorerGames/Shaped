import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import { Button, Text, Card, ProgressBar, FAB, Portal } from "react-native-paper";
import { useState, useEffect } from "react";
import { Calendar } from "react-native-calendars";
import { useAuth } from "@/lib/auth-context";
import { DATABASE_ID, databases, MEAL_ENTRIES_TABLE_ID } from "@/lib/appwrite";
import { Query } from "react-native-appwrite";
import { MealEntry } from "@/types/database.type";
import AddMealModal from "@/components/AddMealModal";

export default function Meals() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [dailyTotals, setDailyTotals] = useState({
    calories: 0,
    protein: 0,
    fats: 0,
    carbs: 0,
  });

  // Daily goals
  const GOALS = {
    calories: 2000,
    protein: 150,
    fats: 65,
    carbs: 250,
  };

  useEffect(() => {
    if (user) {
      fetchMeals();
    }
  }, [user, selectedDate]);

  const fetchMeals = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        MEAL_ENTRIES_TABLE_ID,
        [
          Query.equal("user_id", user?.$id ?? ""),
          Query.equal("date", selectedDate),
          Query.orderDesc("$createdAt")
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
      await databases.deleteDocument(DATABASE_ID, MEAL_ENTRIES_TABLE_ID, mealId);
      fetchMeals();
    } catch (error) {
      console.error("Failed to delete meal:", error);
    }
  };

  const markedDates = {
    [selectedDate]: {
      selected: true,
      selectedColor: "#2196F3",
    },
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text variant="headlineSmall" style={styles.title}>
          Calorie Tracker
        </Text>

        <Calendar
          current={selectedDate}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          markedDates={markedDates}
          theme={{
            calendarBackground: "#1e1e1e",
            textSectionTitleColor: "#ffffff",
            selectedDayBackgroundColor: "#2196F3",
            selectedDayTextColor: "#ffffff",
            todayTextColor: "#2196F3",
            dayTextColor: "#ffffff",
            textDisabledColor: "#666666",
            monthTextColor: "#ffffff",
            arrowColor: "#2196F3",
          }}
          style={styles.calendar}
        />

        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.summaryTitle}>
              Daily Summary - {new Date(selectedDate).toLocaleDateString()}
            </Text>

            <View style={styles.macroRow}>
              <View style={styles.macroItem}>
                <Text variant="headlineMedium" style={styles.calorieNumber}>
                  {dailyTotals.calories}
                </Text>
                <Text variant="bodySmall">/ {GOALS.calories} kcal</Text>
                <ProgressBar
                  progress={Math.min(dailyTotals.calories / GOALS.calories, 1)}
                  color="#2196F3"
                  style={styles.progressBar}
                />
              </View>
            </View>

            <View style={styles.macroGrid}>
              <View style={styles.macroBox}>
                <Text variant="labelSmall" style={styles.macroLabel}>
                  Protein
                </Text>
                <Text variant="titleLarge">{dailyTotals.protein.toFixed(1)}g</Text>
                <Text variant="bodySmall">/ {GOALS.protein}g</Text>
                <ProgressBar
                  progress={Math.min(dailyTotals.protein / GOALS.protein, 1)}
                  color="#4CAF50"
                  style={styles.smallProgress}
                />
              </View>

              <View style={styles.macroBox}>
                <Text variant="labelSmall" style={styles.macroLabel}>
                  Fats
                </Text>
                <Text variant="titleLarge">{dailyTotals.fats.toFixed(1)}g</Text>
                <Text variant="bodySmall">/ {GOALS.fats}g</Text>
                <ProgressBar
                  progress={Math.min(dailyTotals.fats / GOALS.fats, 1)}
                  color="#FF9800"
                  style={styles.smallProgress}
                />
              </View>

              <View style={styles.macroBox}>
                <Text variant="labelSmall" style={styles.macroLabel}>
                  Carbs
                </Text>
                <Text variant="titleLarge">{dailyTotals.carbs.toFixed(1)}g</Text>
                <Text variant="bodySmall">/ {GOALS.carbs}g</Text>
                <ProgressBar
                  progress={Math.min(dailyTotals.carbs / GOALS.carbs, 1)}
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
              <Text style={styles.emptyText}>No meals logged for this day</Text>
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
                      {meal.servings} serving{meal.servings !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => deleteMeal(meal.$id)}
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
                    <Text variant="titleSmall">{meal.protein.toFixed(1)}g</Text>
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

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        label="Add Meal"
      />

      <Portal>
        <AddMealModal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          selectedDate={selectedDate}
          onMealAdded={fetchMeals}
        />
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  scroll: {
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    textAlign: "center",
    marginBottom: 16,
    color: "#ffffff",
  },
  calendar: {
    marginBottom: 16,
    borderRadius: 8,
  },
  summaryCard: {
    marginBottom: 16,
    backgroundColor: "#1e1e1e",
  },
  summaryTitle: {
    marginBottom: 16,
    textAlign: "center",
  },
  macroRow: {
    marginBottom: 16,
  },
  macroItem: {
    alignItems: "center",
  },
  calorieNumber: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#2196F3",
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
    color: "#999999",
  },
  smallProgress: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  sectionTitle: {
    marginVertical: 16,
    color: "#ffffff",
  },
  emptyCard: {
    backgroundColor: "#1e1e1e",
  },
  emptyText: {
    textAlign: "center",
    color: "#999999",
  },
  mealCard: {
    marginBottom: 12,
    backgroundColor: "#1e1e1e",
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  mealType: {
    color: "#2196F3",
    marginTop: 4,
    textTransform: "capitalize",
  },
  servings: {
    color: "#999999",
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
  },
  deleteText: {
    fontSize: 20,
    color: "#ff5252",
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#333333",
  },
  nutritionItem: {
    alignItems: "center",
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "#2196F3",
  },
});
