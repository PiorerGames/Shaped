import { StyleSheet, View, ScrollView, FlatList, Dimensions } from "react-native";
import { Button, useTheme, Text, Card, ProgressBar } from "react-native-paper";
import { useEffect, useState, useRef } from "react";
import MeasurementChart from "@/components/MeasurementChart";
import { DATABASE_ID, databases, MEASUREMENTS_TABLE_ID, MEAL_ENTRIES_TABLE_ID } from "@/lib/appwrite";
import { Query } from "react-native-appwrite";
import { useAuth } from "@/lib/auth-context";
import { Measurement, MealEntry } from "@/types/database.type";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import Svg, { Circle } from "react-native-svg";
import { router } from "expo-router";

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

  const CALORIE_GOAL = 2000;
  const PROTEIN_GOAL = 150;
  const FATS_GOAL = 65;
  const CARBS_GOAL = 250;

  useEffect(() => {
    fetchMeasurements();
    fetchTodayMeals();
  }, [user])

  useFocusEffect(
    useCallback(() => {
      fetchTodayMeals();
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
  }

  const fetchTodayMeals = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await databases.listDocuments(
        DATABASE_ID,
        MEAL_ENTRIES_TABLE_ID,
        [
          Query.equal("user_id", user?.$id ?? ""),
          Query.equal("date", today)
        ]
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
  }

  // group measurement types
  const types = Array.from(new Set(measurements.map(m => m.type)));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={{alignItems: "center", marginBottom: 8 }}>
          <Text variant="headlineSmall">Dashboard</Text>
        </View>

        <Card style={styles.calorieCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>Today's Nutrition</Text>
            
            {/* Circular Calorie Chart */}
            <View style={styles.circularChartContainer}>
              <Svg width="200" height="200" style={styles.circularChart}>
                {/* Background circle */}
                <Circle
                  cx="100"
                  cy="100"
                  r="80"
                  stroke="#333333"
                  strokeWidth="16"
                  fill="none"
                />
                {/* Progress circle */}
                <Circle
                  cx="100"
                  cy="100"
                  r="80"
                  stroke="#2196F3"
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 80}`}
                  strokeDashoffset={`${2 * Math.PI * 80 * (1 - Math.min(todayCalories / CALORIE_GOAL, 1))}`}
                  strokeLinecap="round"
                  transform="rotate(-90 100 100)"
                />
                {/* Red overlay for exceeded calories (only if > 110%) */}
                {todayCalories > CALORIE_GOAL * 1.1 && (
                  <Circle
                    cx="100"
                    cy="100"
                    r="80"
                    stroke="#ff5252"
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 80}`}
                    strokeDashoffset={`${2 * Math.PI * 80 * (1 - Math.min((todayCalories - CALORIE_GOAL) / CALORIE_GOAL, 1))}`}
                    strokeLinecap="round"
                    transform="rotate(-90 100 100)"
                  />
                )}
              </Svg>
              <View style={styles.circularChartText}>
                <Text variant="displaySmall" style={styles.calorieNumber}>
                  {todayCalories}
                </Text>
                <Text variant="bodyMedium" style={styles.calorieGoal}>
                  / {CALORIE_GOAL}
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
                <Text variant="labelLarge" style={styles.macroTitle}>Protein</Text>
                <View style={styles.verticalBarContainer}>
                  <View style={styles.verticalBarBackground}>
                    <View 
                      style={[
                        styles.verticalBarFill, 
                        { 
                          height: `${Math.min((todayProtein / PROTEIN_GOAL) * 100, 100)}%`,
                          backgroundColor: '#4CAF50'
                        }
                      ]} 
                    />
                    {todayProtein > PROTEIN_GOAL * 1.1 && (
                      <View 
                        style={[
                          styles.verticalBarOverlay, 
                          { 
                            height: `${Math.min(((todayProtein - PROTEIN_GOAL) / PROTEIN_GOAL) * 100, 100)}%`,
                            backgroundColor: '#ff5252'
                          }
                        ]} 
                      />
                    )}
                  </View>
                </View>
                <Text variant="bodyMedium" style={styles.macroValue}>
                  {todayProtein.toFixed(0)}g
                </Text>
                <Text variant="bodySmall" style={styles.macroGoal}>
                  / {PROTEIN_GOAL}g
                </Text>
              </View>

              {/* Fats Bar */}
              <View style={styles.macroBar}>
                <Text variant="labelLarge" style={styles.macroTitle}>Fats</Text>
                <View style={styles.verticalBarContainer}>
                  <View style={styles.verticalBarBackground}>
                    <View 
                      style={[
                        styles.verticalBarFill, 
                        { 
                          height: `${Math.min((todayFats / FATS_GOAL) * 100, 100)}%`,
                          backgroundColor: '#FFC107'
                        }
                      ]} 
                    />
                    {todayFats > FATS_GOAL * 1.1 && (
                      <View 
                        style={[
                          styles.verticalBarOverlay, 
                          { 
                            height: `${Math.min(((todayFats - FATS_GOAL) / FATS_GOAL) * 100, 100)}%`,
                            backgroundColor: '#ff5252'
                          }
                        ]} 
                      />
                    )}
                  </View>
                </View>
                <Text variant="bodyMedium" style={styles.macroValue}>
                  {todayFats.toFixed(0)}g
                </Text>
                <Text variant="bodySmall" style={styles.macroGoal}>
                  / {FATS_GOAL}g
                </Text>
              </View>

              {/* Carbs Bar */}
              <View style={styles.macroBar}>
                <Text variant="labelLarge" style={styles.macroTitle}>Carbs</Text>
                <View style={styles.verticalBarContainer}>
                  <View style={styles.verticalBarBackground}>
                    <View 
                      style={[
                        styles.verticalBarFill, 
                        { 
                          height: `${Math.min((todayCarbs / CARBS_GOAL) * 100, 100)}%`,
                          backgroundColor: '#9C27B0'
                        }
                      ]} 
                    />
                    {todayCarbs > CARBS_GOAL * 1.1 && (
                      <View 
                        style={[
                          styles.verticalBarOverlay, 
                          { 
                            height: `${Math.min(((todayCarbs - CARBS_GOAL) / CARBS_GOAL) * 100, 100)}%`,
                            backgroundColor: '#ff5252'
                          }
                        ]} 
                      />
                    )}
                  </View>
                </View>
                <Text variant="bodyMedium" style={styles.macroValue}>
                  {todayCarbs.toFixed(0)}g
                </Text>
                <Text variant="bodySmall" style={styles.macroGoal}>
                  / {CARBS_GOAL}g
                </Text>
              </View>
            </View>

            <Text variant="bodySmall" style={styles.mealsCount}>
              {todayMeals} meal{todayMeals !== 1 ? 's' : ''} logged today
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
                  snapToInterval={Dimensions.get('window').width - 64}
                  decelerationRate="fast"
                  contentContainerStyle={styles.chartSlideshow}
                  onScroll={(e) => {
                    const slideIndex = Math.round(
                      e.nativeEvent.contentOffset.x / (Dimensions.get('window').width - 64)
                    );
                    setCurrentSlide(slideIndex);
                  }}
                  scrollEventThrottle={16}
                  renderItem={({ item }) => (
                    <View style={[styles.chartSlide, { width: Dimensions.get('window').width - 64 }]}>
                      <MeasurementChart measurements={measurements} type={item} />
                    </View>
                  )}
                  keyExtractor={(item) => item}
                  ref={(ref) => {
                    if (ref) {
                      (ref as any).scrollToIndex = (params: { index: number; animated?: boolean }) => {
                        ref.scrollToOffset({
                          offset: params.index * (Dimensions.get('window').width - 64),
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
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#121212",
    justifyContent: "flex-start",
    alignItems: "stretch",
  },
  scroll: {
    paddingBottom: 24,
  },
  measurementsCard: {
    backgroundColor: "#1e1e1e",
    marginTop: 16,
  },
  measurementsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  viewAllButton: {
    borderColor: "#2196F3",
  },
  emptyContainer: {
    padding: 16,
    alignItems: "center",
  },
  emptyText: {
    color: "#999999",
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
    backgroundColor: "#666666",
  },
  paginationDotActive: {
    backgroundColor: "#2196F3",
    width: 24,
  },
  calorieCard: {
    backgroundColor: "#1e1e1e",
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
  circularChart: {
    transform: [{ scaleX: -1 }],
  },
  circularChartText: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  calorieNumber: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#2196F3",
    lineHeight: 48,
  },
  calorieGoal: {
    color: "#999999",
    marginTop: 4,
  },
  calorieLabel: {
    color: "#666666",
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
    color: "#ffffff",
  },
  verticalBarContainer: {
    height: 120,
    width: 40,
    marginVertical: 8,
  },
  verticalBarBackground: {
    flex: 1,
    backgroundColor: "#333333",
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
    color: "#999999",
    fontSize: 11,
  },
  mealsCount: {
    textAlign: "center",
    color: "#999999",
    marginTop: 8,
  },
});
