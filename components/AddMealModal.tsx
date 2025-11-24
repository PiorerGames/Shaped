import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import {
  Modal,
  Portal,
  Text,
  Button,
  TextInput,
  Card,
} from "react-native-paper";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  DATABASE_ID,
  databases,
  MEAL_ENTRIES_TABLE_ID,
  FOOD_ITEMS_TABLE_ID,
} from "@/lib/appwrite";
import { ID } from "react-native-appwrite";
import {
  searchProductByBarcode,
  searchProducts,
  BASIC_FOODS,
  FoodSearchResult,
} from "@/lib/openFoodFacts";

interface AddMealModalProps {
  visible: boolean;
  onDismiss: () => void;
  selectedDate: string;
  onMealAdded: () => void;
}

export default function AddMealModal({
  visible,
  onDismiss,
  selectedDate,
  onMealAdded,
}: AddMealModalProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<"menu" | "search" | "custom" | "confirm">(
    "menu"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(
    null
  );
  const [servings, setServings] = useState("1");
  const [mealType, setMealType] = useState("");
  // Custom food fields
  const [customName, setCustomName] = useState("");
  const [customCalories, setCustomCalories] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customFats, setCustomFats] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      alert("Please enter a search term");
      return;
    }
    try {
      console.log("Searching for:", searchQuery);
      const results = await searchProducts(searchQuery);
      console.log("Search results:", results.length);
      // Combine BASIC_FOODS with API results
      const combinedResults = [...BASIC_FOODS, ...results];
      setSearchResults(combinedResults);
      console.log("Total results (basic + API):", combinedResults.length);

      // Show message if no API results but have basic foods
      if (results.length === 0 && BASIC_FOODS.length > 0) {
        alert(
          "Could not fetch results from OpenFoodFacts. Showing basic foods only. You can also use 'Add Custom Meal' to enter nutrition data manually."
        );
      }
    } catch (error) {
      console.error("Search error:", error);
      // Still show basic foods even if API fails
      setSearchResults(BASIC_FOODS);
      alert(
        "OpenFoodFacts search unavailable (network error). Showing basic foods only. You can also use 'Add Custom Meal' to enter your own food data."
      );
    }
  };

  const handleBarCodeScanned = async (barcode: string) => {
    console.log("Barcode scanned:", barcode);
    try {
      const product = await searchProductByBarcode(barcode);
      if (product) {
        setSelectedFood(product);
        setMode("confirm");
      } else {
        alert(
          "Product not found. Try searching manually or add a custom meal."
        );
        setMode("menu");
      }
    } catch (error) {
      console.error("Barcode lookup error:", error);
      alert(
        "Failed to lookup product. Try searching manually or add a custom meal."
      );
      setMode("menu");
    }
  };

  const handleSelectFood = (food: FoodSearchResult) => {
    setSelectedFood(food);
    setMode("confirm");
  };

  const handleAddMeal = async () => {
    if (!selectedFood && mode !== "custom") return;

    try {
      const servingsNum = parseFloat(servings) || 1;

      let calories: number,
        protein: number,
        fats: number,
        carbs: number,
        foodName: string;

      if (mode === "custom") {
        calories = parseFloat(customCalories) || 0;
        protein = parseFloat(customProtein) || 0;
        fats = parseFloat(customFats) || 0;
        carbs = parseFloat(customCarbs) || 0;
        foodName = customName;

        // Save custom food to database
        await databases.createDocument(
          DATABASE_ID,
          FOOD_ITEMS_TABLE_ID,
          ID.unique(),
          {
            user_id: user?.$id,
            name: customName,
            calories,
            protein,
            fats,
            carbs,
            serving_size: 1,
            serving_unit: "serving",
            is_custom: true,
          }
        );
      } else if (selectedFood) {
        calories = selectedFood.calories * servingsNum;
        protein = selectedFood.protein * servingsNum;
        fats = selectedFood.fats * servingsNum;
        carbs = selectedFood.carbs * servingsNum;
        foodName = selectedFood.name;
      } else {
        return;
      }

      // Add meal entry
      await databases.createDocument(
        DATABASE_ID,
        MEAL_ENTRIES_TABLE_ID,
        ID.unique(),
        {
          user_id: user?.$id,
          date: selectedDate,
          food_item_id: selectedFood?.barcode || "custom",
          food_name: foodName,
          servings: servingsNum,
          calories: Math.round(calories),
          protein,
          fats,
          carbs,
          meal_type: mealType || null,
        }
      );

      onMealAdded();
      resetModal();
      onDismiss();
    } catch (error) {
      console.error("Failed to add meal:", error);
      alert("Failed to add meal");
    }
  };

  const resetModal = () => {
    setMode("menu");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedFood(null);
    setServings("1");
    setMealType("");
    setCustomName("");
    setCustomCalories("");
    setCustomProtein("");
    setCustomFats("");
    setCustomCarbs("");
  };

  const handleDismiss = () => {
    resetModal();
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={styles.modal}
      >
        <>
          <View style={styles.header}>
            <Text variant="headlineSmall">Add Meal</Text>
            <Pressable onPress={handleDismiss}>
              <Text style={styles.closeButton}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.content}>
            {mode === "menu" && (
              <View style={styles.menuContainer}>
                <Button
                  mode="contained"
                  onPress={() => {
                    setSearchResults(BASIC_FOODS);
                    setMode("search");
                  }}
                  style={styles.menuButton}
                  icon="magnify"
                >
                  Search Foods (OpenFoodFacts)
                </Button>
                <Button
                  mode="contained"
                  onPress={() => setMode("custom")}
                  style={styles.menuButton}
                  icon="plus"
                >
                  Add Custom Meal
                </Button>
              </View>
            )}

            {mode === "search" && (
              <View>
                <View style={styles.searchBar}>
                  <TextInput
                    mode="outlined"
                    placeholder="Search for food..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                    style={styles.searchInput}
                  />
                  <Button
                    mode="contained"
                    onPress={handleSearch}
                    style={styles.searchButton}
                  >
                    Search
                  </Button>
                </View>

                {searchResults.map((food, index) => (
                  <Card
                    key={index}
                    style={styles.foodCard}
                    onPress={() => handleSelectFood(food)}
                  >
                    <Card.Content>
                      <Text variant="titleMedium">{food.name}</Text>
                      {food.brand && (
                        <Text variant="bodySmall">{food.brand}</Text>
                      )}
                      <View style={styles.nutritionRow}>
                        <Text variant="bodySmall">
                          {food.calories} kcal | {food.protein}g P | {food.fats}
                          g F | {food.carbs}g C
                        </Text>
                      </View>
                      <Text variant="bodySmall" style={styles.servingInfo}>
                        per {food.serving_size}
                        {food.serving_unit}
                      </Text>
                    </Card.Content>
                  </Card>
                ))}

                <Button
                  mode="text"
                  onPress={() => setMode("menu")}
                  style={styles.backButton}
                >
                  Back
                </Button>
              </View>
            )}

            {mode === "custom" && (
              <View>
                <TextInput
                  mode="outlined"
                  label="Food Name"
                  value={customName}
                  onChangeText={setCustomName}
                  style={styles.input}
                />
                <TextInput
                  mode="outlined"
                  label="Calories (kcal)"
                  value={customCalories}
                  onChangeText={setCustomCalories}
                  keyboardType="numeric"
                  style={styles.input}
                />
                <TextInput
                  mode="outlined"
                  label="Protein (g)"
                  value={customProtein}
                  onChangeText={setCustomProtein}
                  keyboardType="numeric"
                  style={styles.input}
                />
                <TextInput
                  mode="outlined"
                  label="Fats (g)"
                  value={customFats}
                  onChangeText={setCustomFats}
                  keyboardType="numeric"
                  style={styles.input}
                />
                <TextInput
                  mode="outlined"
                  label="Carbs (g)"
                  value={customCarbs}
                  onChangeText={setCustomCarbs}
                  keyboardType="numeric"
                  style={styles.input}
                />

                <Button
                  mode="contained"
                  onPress={handleAddMeal}
                  style={styles.addButton}
                  disabled={!customName || !customCalories}
                >
                  Add Meal
                </Button>
                <Button
                  mode="text"
                  onPress={() => setMode("menu")}
                  style={styles.backButton}
                >
                  Back
                </Button>
              </View>
            )}

            {mode === "confirm" && selectedFood && (
              <View>
                <Card style={styles.confirmCard}>
                  <Card.Content>
                    <Text variant="titleLarge">{selectedFood.name}</Text>
                    {selectedFood.brand && (
                      <Text variant="bodyMedium">{selectedFood.brand}</Text>
                    )}
                    <View style={styles.macroGrid}>
                      <View style={styles.macroItem}>
                        <Text variant="bodySmall">Calories</Text>
                        <Text variant="titleMedium">
                          {selectedFood.calories}
                        </Text>
                      </View>
                      <View style={styles.macroItem}>
                        <Text variant="bodySmall">Protein</Text>
                        <Text variant="titleMedium">
                          {selectedFood.protein}g
                        </Text>
                      </View>
                      <View style={styles.macroItem}>
                        <Text variant="bodySmall">Fats</Text>
                        <Text variant="titleMedium">{selectedFood.fats}g</Text>
                      </View>
                      <View style={styles.macroItem}>
                        <Text variant="bodySmall">Carbs</Text>
                        <Text variant="titleMedium">{selectedFood.carbs}g</Text>
                      </View>
                    </View>
                    <Text variant="bodySmall" style={styles.servingInfo}>
                      per {selectedFood.serving_size}
                      {selectedFood.serving_unit}
                    </Text>
                  </Card.Content>
                </Card>

                <TextInput
                  mode="outlined"
                  label="Number of Servings"
                  value={servings}
                  onChangeText={setServings}
                  keyboardType="numeric"
                  style={styles.input}
                />

                <TextInput
                  mode="outlined"
                  label="Meal Type (optional)"
                  placeholder="e.g., breakfast, lunch, dinner"
                  value={mealType}
                  onChangeText={setMealType}
                  style={styles.input}
                />

                <Button
                  mode="contained"
                  onPress={handleAddMeal}
                  style={styles.addButton}
                >
                  Add Meal
                </Button>
                <Button
                  mode="text"
                  onPress={() => setMode("search")}
                  style={styles.backButton}
                >
                  Back
                </Button>
              </View>
            )}
          </ScrollView>
        </>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: "#1e1e1e",
    marginHorizontal: 20,
    borderRadius: 8,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
  },
  closeButton: {
    fontSize: 24,
    color: "#ffffff",
    padding: 4,
  },
  content: {
    padding: 16,
  },
  menuContainer: {
    gap: 12,
  },
  menuButton: {
    marginBottom: 12,
  },
  scannerContainer: {
    alignItems: "center",
  },
  scanner: {
    width: 300,
    height: 300,
    marginBottom: 16,
  },
  scanAgainButton: {
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
  },
  searchButton: {
    justifyContent: "center",
  },
  foodCard: {
    marginBottom: 12,
    backgroundColor: "#2a2a2a",
  },
  nutritionRow: {
    marginTop: 8,
  },
  servingInfo: {
    marginTop: 4,
    color: "#999999",
  },
  input: {
    marginBottom: 12,
  },
  addButton: {
    marginTop: 8,
    marginBottom: 8,
  },
  backButton: {
    marginTop: 8,
  },
  confirmCard: {
    marginBottom: 16,
    backgroundColor: "#2a2a2a",
  },
  macroGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 8,
  },
  macroItem: {
    alignItems: "center",
  },
});
