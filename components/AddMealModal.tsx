import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Modal as RNModal,
  ActivityIndicator,
  Platform,
  Alert,
  Text as RNText,
} from "react-native";
import {
  Modal,
  Portal,
  Text,
  Button,
  TextInput,
  Card,
  Provider as PaperProvider,
  useTheme,
} from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { CameraView, useCameraPermissions, CameraType } from "expo-camera";
import { useAuth } from "@/lib/auth-context";
import {
  databases,
  DATABASE_ID,
  MEAL_ENTRIES_TABLE_ID,
  FOOD_ITEMS_TABLE_ID,
} from "@/lib/appwrite";
import { ID } from "react-native-appwrite";

type AddMealModalProps = {
  visible: boolean;
  onDismiss: () => void;
  selectedDate: string;
  onMealAdded: () => void;
  initialMode?: "menu" | "search" | "custom" | "barcode";
};

// Minimal shape used in UI
type FoodSearchResult = {
  barcode?: string | null;
  name: string;
  brand?: string | null;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  serving_size?: number | string;
  serving_unit?: string;
  isFromApi?: boolean;
};

const BASIC_FOODS: FoodSearchResult[] = [
  {
    name: "Apple (100g)",
    calories: 52,
    protein: 0.3,
    fats: 0.2,
    carbs: 14,
    serving_size: 100,
    serving_unit: "g",
  },
  {
    name: "Banana (100g)",
    calories: 89,
    protein: 1.1,
    fats: 0.3,
    carbs: 23,
    serving_size: 100,
    serving_unit: "g",
  },
  {
    name: "Orange (100g)",
    calories: 47,
    protein: 0.9,
    fats: 0.1,
    carbs: 12,
    serving_size: 100,
    serving_unit: "g",
  },
  {
    name: "Chicken breast (100g)",
    calories: 165,
    protein: 31,
    fats: 3.6,
    carbs: 0,
    serving_size: 100,
    serving_unit: "g",
  },
  {
    name: "Chicken thigh (100g)",
    calories: 209,
    protein: 26,
    fats: 11,
    carbs: 0,
    serving_size: 100,
    serving_unit: "g",
  },
  {
    name: "Ground beef (100g)",
    calories: 250,
    protein: 26,
    fats: 17,
    carbs: 0,
    serving_size: 100,
    serving_unit: "g",
  },
  {
    name: "Salmon (100g)",
    calories: 208,
    protein: 20,
    fats: 13,
    carbs: 0,
    serving_size: 100,
    serving_unit: "g",
  },
  {
    name: "Eggs (100g)",
    calories: 155,
    protein: 13,
    fats: 11,
    carbs: 1.1,
    serving_size: 100,
    serving_unit: "g",
  },
  {
    name: "White rice cooked (100g)",
    calories: 130,
    protein: 2.7,
    fats: 0.3,
    carbs: 28,
    serving_size: 100,
    serving_unit: "g",
  },
  {
    name: "Brown rice cooked (100g)",
    calories: 112,
    protein: 2.6,
    fats: 0.9,
    carbs: 24,
    serving_size: 100,
    serving_unit: "g",
  },
  {
    name: "Pasta cooked (100g)",
    calories: 131,
    protein: 5,
    fats: 1.1,
    carbs: 25,
    serving_size: 100,
    serving_unit: "g",
  },
  {
    name: "White bread (100g)",
    calories: 265,
    protein: 9,
    fats: 3.2,
    carbs: 49,
    serving_size: 100,
    serving_unit: "g",
  },
  {
    name: "Whole wheat bread (100g)",
    calories: 247,
    protein: 13,
    fats: 3.4,
    carbs: 41,
    serving_size: 100,
    serving_unit: "g",
  },
  {
    name: "Oatmeal (100g)",
    calories: 389,
    protein: 17,
    fats: 6.9,
    carbs: 66,
    serving_size: 100,
    serving_unit: "g",
  },
  {
    name: "Sweet potato (100g)",
    calories: 86,
    protein: 1.6,
    fats: 0.1,
    carbs: 20,
    serving_size: 100,
    serving_unit: "g",
  },
  {
    name: "Broccoli (100g)",
    calories: 34,
    protein: 2.8,
    fats: 0.4,
    carbs: 7,
    serving_size: 100,
    serving_unit: "g",
  },
  {
    name: "Spinach (100g)",
    calories: 23,
    protein: 2.9,
    fats: 0.4,
    carbs: 3.6,
    serving_size: 100,
    serving_unit: "g",
  },
  {
    name: "Milk whole (100ml)",
    calories: 61,
    protein: 3.2,
    fats: 3.3,
    carbs: 4.8,
    serving_size: 100,
    serving_unit: "ml",
  },
  {
    name: "Greek yogurt (100g)",
    calories: 59,
    protein: 10,
    fats: 0.4,
    carbs: 3.6,
    serving_size: 100,
    serving_unit: "g",
  },
  {
    name: "Cheddar cheese (100g)",
    calories: 403,
    protein: 25,
    fats: 33,
    carbs: 1.3,
    serving_size: 100,
    serving_unit: "g",
  },
  {
    name: "Peanut butter (100g)",
    calories: 588,
    protein: 25,
    fats: 50,
    carbs: 20,
    serving_size: 100,
    serving_unit: "g",
  },
  {
    name: "Almonds (100g)",
    calories: 579,
    protein: 21,
    fats: 50,
    carbs: 22,
    serving_size: 100,
    serving_unit: "g",
  },
  {
    name: "Avocado (100g)",
    calories: 160,
    protein: 2,
    fats: 15,
    carbs: 9,
    serving_size: 100,
    serving_unit: "g",
  },
  {
    name: "Olive oil (100ml)",
    calories: 884,
    protein: 0,
    fats: 100,
    carbs: 0,
    serving_size: 100,
    serving_unit: "ml",
  },
];

async function searchProducts(query: string): Promise<FoodSearchResult[]> {
  // Use OpenFoodFacts search endpoint
  try {
    const q = encodeURIComponent(query);
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&page_size=30`;
    const res = await fetch(url);
    const json = await res.json();

    if (!json || !json.products) return [];

    const products = json.products as any[];
    const mapped: FoodSearchResult[] = products.filter(Boolean).map((p) => {
      const nutriments = p.nutriments || {};
      const calories =
        nutriments["energy-kcal_100g"] ??
        nutriments["energy-kcal_value"] ??
        nutriments["energy-kcal"] ??
        0;
      const protein =
        nutriments["proteins_100g"] ?? nutriments["proteins"] ?? 0;
      const fats = nutriments["fat_100g"] ?? nutriments["fat"] ?? 0;
      const carbs =
        nutriments["carbohydrates_100g"] ?? nutriments["carbohydrates"] ?? 0;

      return {
        barcode: p._id || p.code || null,
        name: p.product_name || p.generic_name || "Unnamed product",
        brand: Array.isArray(p.brands_tags)
          ? p.brands_tags[0]
          : p.brands || null,
        calories: Math.round(Number(calories) || 0),
        protein: Math.round(Number(protein) || 0),
        fats: Math.round(Number(fats) || 0),
        carbs: Math.round(Number(carbs) || 0),
        serving_size: p.serving_size || 100,
        serving_unit: p.serving_unit || "g",
        isFromApi: true,
      } as FoodSearchResult;
    });

    // Remove duplicates by barcode/name
    const unique: FoodSearchResult[] = [];
    const seen = new Set<string>();
    for (const item of mapped) {
      const key = (item.barcode ?? item.name).toString();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    return unique;
  } catch (e) {
    console.warn("searchProducts error", e);
    return [];
  }
}

async function searchProductByBarcode(
  barcode: string
): Promise<FoodSearchResult | null> {
  try {
    const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    const res = await fetch(url);
    const json = await res.json();

    if (!json || json.status !== 1) return null;
    const p = json.product || {};
    const nutriments = p.nutriments || {};
    const calories =
      nutriments["energy-kcal_100g"] ?? nutriments["energy-kcal"] ?? 0;
    const protein = nutriments["proteins_100g"] ?? nutriments["proteins"] ?? 0;
    const fats = nutriments["fat_100g"] ?? nutriments["fat"] ?? 0;
    const carbs =
      nutriments["carbohydrates_100g"] ?? nutriments["carbohydrates"] ?? 0;

    return {
      barcode,
      name: p.product_name || p.generic_name || "Scanned product",
      brand: Array.isArray(p.brands_tags) ? p.brands_tags[0] : p.brands || null,
      calories: Math.round(Number(calories) || 0),
      protein: Math.round(Number(protein) || 0),
      fats: Math.round(Number(fats) || 0),
      carbs: Math.round(Number(carbs) || 0),
      serving_size: p.serving_size || 100,
      serving_unit: p.serving_unit || "g",
      isFromApi: true,
    } as FoodSearchResult;
  } catch (e) {
    console.warn("searchProductByBarcode", e);
    return null;
  }
}

// Add a small gradient button wrapper that places a Paper Button on top of a LinearGradient.
// This keeps Paper's ripple/press handling while giving a gradient background and white label.
function GradientButton({
  children,
  onPress,
  icon,
  disabled,
  style,
  contentStyle,
  accessibilityLabel,
  theme,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  icon?: string | ((props: any) => React.ReactNode);
  disabled?: boolean;
  style?: any;
  contentStyle?: any;
  accessibilityLabel?: string;
  theme: any;
}) {
  // Create gradient colors based on theme primary color
  const primaryColor = theme.colors.primary;

  return (
    <LinearGradient
      colors={[primaryColor, primaryColor, primaryColor]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[
        styles.gradientWrap,
        { borderColor: theme.colors.primary },
        style,
      ]}
    >
      <Button
        mode="contained"
        onPress={onPress}
        icon={icon as any}
        disabled={disabled}
        contentStyle={[styles.gradientContent, contentStyle]}
        labelStyle={[styles.gradientLabel, { color: theme.colors.onPrimary }]}
        style={styles.transparentBtn}
        accessibilityLabel={accessibilityLabel}
        // make sure underlying button background is transparent so gradient shows
        buttonColor="transparent"
      >
        {children}
      </Button>
    </LinearGradient>
  );
}

export default function AddMealModal({
  visible,
  onDismiss,
  selectedDate,
  onMealAdded,
  initialMode = "menu",
}: AddMealModalProps) {
  const { user } = useAuth();
  const theme = useTheme();
  // UI mode
  const [mode, setMode] = useState<"menu" | "search" | "custom" | "confirm">(
    "menu"
  );

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(
    null
  );
  const [isSearching, setIsSearching] = useState(false);

  // Custom
  const [servings, setServings] = useState("1");
  const [inputMode, setInputMode] = useState<"servings" | "grams">("servings");
  const [gramsInput, setGramsInput] = useState("");
  const [mealType, setMealType] = useState("");
  const [customName, setCustomName] = useState("");
  const [customCalories, setCustomCalories] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customFats, setCustomFats] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");

  // Camera / scanner state
  const [scannerVisible, setScannerVisible] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanningRef = useRef(false);

  // Reset modal state when it opens
  useEffect(() => {
    if (visible) {
      setIsSearching(false);
    }
  }, [visible]);

  // ---------- Search handlers ----------
  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) {
      Alert.alert("Please enter search term");
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      const results = await searchProducts(q);

      setSearchResults(results);
      setMode("search");

      if (results.length === 0) {
        Alert.alert(
          "No results from OpenFoodFacts",
          "Showing basic foods only. Try scanning barcode or add a custom meal."
        );
      }
    } catch (e) {
      console.error("Search error:", e);
      setSearchResults(BASIC_FOODS);
      Alert.alert("Search failed", "Network error. Showing basic foods only.");
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // ---------- Barcode scanning ----------
  const ensureCameraPermission = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert("Camera not available on web for scanning.");
      return false;
    }
    try {
      if (!permission) {
        const res = await requestPermission();
        return !!res?.granted;
      }
      if (!permission.granted) {
        const res = await requestPermission();
        return !!res?.granted;
      }
      return true;
    } catch (e) {
      console.warn("ensureCameraPermission error", e);
      return false;
    }
  }, [permission, requestPermission]);

  const openScanner = useCallback(async () => {
    const ok = await ensureCameraPermission();
    if (!ok) return;
    scanningRef.current = false;
    setIsProcessingScan(false);
    setScannerVisible(true);
  }, [ensureCameraPermission]);

  const closeScanner = useCallback(() => {
    setScannerVisible(false);
    scanningRef.current = false;
    setIsProcessingScan(false);
    onDismiss();
  }, [onDismiss]);

  // Called by Camera's onBarCodeScanned
  const onBarCodeScanned = useCallback(
    async (event: any) => {
      if (scanningRef.current) return;
      scanningRef.current = true;
      setIsProcessingScan(true);

      const code = event?.data;
      console.log("Barcode scanned:", code);

      const product = await searchProductByBarcode(code);
      if (product) {
        setSelectedFood(product);
        setMode("confirm");
      } else {
        setMode("menu");
      }

      setIsProcessingScan(false);
      scanningRef.current = false;
      closeScanner();
    },
    [closeScanner]
  );

  // ---------- Select / add ----------
  const handleSelectFood = useCallback((food: FoodSearchResult) => {
    setSelectedFood(food);
    setMode("confirm");
  }, []);

  // Set mode based on initialMode when modal opens or initialMode changes
  useEffect(() => {
    if (visible && initialMode === "barcode") {
      openScanner();
    } else if (visible && initialMode === "search") {
      setSearchResults(BASIC_FOODS);
      setMode("search");
    } else if (visible && initialMode === "custom") {
      setMode("custom");
    } else if (visible) {
      setMode("menu");
    }
  }, [visible, initialMode, openScanner]);

  const handleAddMeal = useCallback(async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to add meals");
      return;
    }

    try {
      let multiplier = 1;

      if (inputMode === "servings") {
        multiplier = Math.max(0.01, parseFloat(servings) || 1);
        console.log(
          "Using servings mode:",
          servings,
          "multiplier:",
          multiplier
        );
      } else if (inputMode === "grams" && selectedFood) {
        const grams = Math.max(1, parseFloat(gramsInput) || 100);
        const baseServingSize =
          typeof selectedFood.serving_size === "number"
            ? selectedFood.serving_size
            : 100;
        multiplier = grams / baseServingSize;
        console.log(
          "Using grams mode:",
          gramsInput,
          "grams =",
          grams,
          "baseServingSize =",
          baseServingSize,
          "multiplier:",
          multiplier
        );
      }

      console.log("Input mode:", inputMode, "Final multiplier:", multiplier);

      let calories = 0,
        protein = 0,
        fats = 0,
        carbs = 0,
        foodName = "",
        barcode = null as string | null,
        isCustom = false;

      if (mode === "custom") {
        foodName = customName || "Custom";
        calories = Math.round(Number(customCalories) || 0);
        protein = Math.round(Number(customProtein) || 0);
        fats = Math.round(Number(customFats) || 0);
        carbs = Math.round(Number(customCarbs) || 0);
        isCustom = true;
      } else if (selectedFood) {
        foodName = selectedFood.name;
        calories = Math.round((selectedFood.calories || 0) * multiplier);
        protein = Math.round((selectedFood.protein || 0) * multiplier);
        fats = Math.round((selectedFood.fats || 0) * multiplier);
        carbs = Math.round((selectedFood.carbs || 0) * multiplier);
        barcode = selectedFood.barcode || null;
      } else {
        return;
      }

      // Create or find food item in database
      let foodItemId = ID.unique();

      // sanitize serving_size from API (could be "100 g" or string). Appwrite collection expects plain number.
      const parseServingSize = (v: any) => {
        if (v == null) return 100;
        if (typeof v === "number") return v;
        // extract numeric part (handles "100", "100g", "100 ml", "100,0")
        const n = parseFloat(
          String(v)
            .replace(",", ".")
            .replace(/[^\d.-]/g, "")
        );
        return isNaN(n) ? 100 : n;
      };

      const servingSizeValue =
        mode === "custom" ? 1 : parseServingSize(selectedFood?.serving_size);
      const servingUnitValue =
        mode === "custom"
          ? "serving"
          : selectedFood?.serving_unit
          ? String(selectedFood.serving_unit)
          : "g";

      // Save food item if it's from API or custom (not in database yet)
      if (selectedFood?.isFromApi || isCustom) {
        await databases.createDocument(
          DATABASE_ID,
          FOOD_ITEMS_TABLE_ID,
          foodItemId,
          {
            user_id: user.$id,
            name: foodName,
            barcode: barcode,
            calories:
              mode === "custom" ? calories : selectedFood?.calories || 0,
            protein: mode === "custom" ? protein : selectedFood?.protein || 0,
            fats: mode === "custom" ? fats : selectedFood?.fats || 0,
            carbs: mode === "custom" ? carbs : selectedFood?.carbs || 0,
            // store plain number for serving_size and simple string for unit
            serving_size: Number(servingSizeValue),
            serving_unit: servingUnitValue,
            is_custom: isCustom,
            brand: selectedFood?.brand || null,
          }
        );
      }

      // Create meal entry
      await databases.createDocument(
        DATABASE_ID,
        MEAL_ENTRIES_TABLE_ID,
        ID.unique(),
        {
          user_id: user.$id,
          date: selectedDate,
          food_item_id: foodItemId,
          food_name: foodName,
          servings: multiplier,
          calories: calories,
          protein: protein,
          fats: fats,
          carbs: carbs,
          meal_type: mealType || null,
        }
      );

      // Notify parent that a meal was added
      onMealAdded();
      // Reset local UI
      resetModal();
      onDismiss();
    } catch (e: any) {
      console.warn("handleAddMeal error", e);
      Alert.alert("Failed to add meal", e.message || "Unknown error");
    }
  }, [
    user,
    customCalories,
    customCarbs,
    customFats,
    customName,
    customProtein,
    mode,
    onDismiss,
    onMealAdded,
    servings,
    inputMode,
    gramsInput,
    selectedFood,
    selectedDate,
    mealType,
  ]);

  const resetModal = useCallback(() => {
    setMode("menu");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedFood(null);
    setServings("1");
    setInputMode("servings");
    setGramsInput("");
    setMealType("");
    setCustomName("");
    setCustomCalories("");
    setCustomProtein("");
    setCustomFats("");
    setCustomCarbs("");
    setIsSearching(false);
  }, []);

  // close
  const handleDismiss = useCallback(() => {
    resetModal();
    onDismiss();
  }, [onDismiss, resetModal]);

  // quick derived layout for confirm card
  const servingLabel = useMemo(() => {
    if (!selectedFood) return "";
    return `per ${selectedFood.serving_size ?? 100}${
      selectedFood.serving_unit ?? "g"
    }`;
  }, [selectedFood]);

  return (
    <PaperProvider theme={theme}>
      <Portal>
        {mode !== "menu" && (
          <Modal
            visible={visible}
            onDismiss={handleDismiss}
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
              <Text variant="headlineSmall">Add Meal</Text>
              <Pressable onPress={handleDismiss}>
                <Text
                  style={[
                    styles.closeButton,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  ✕
                </Text>
              </Pressable>
            </View>

            <ScrollView style={styles.content}>
              {mode === "search" && (
                <ScrollView
                  style={styles.searchContener}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.searchBar}>
                    <TextInput
                      mode="outlined"
                      placeholder="Search for food..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      onSubmitEditing={handleSearch}
                      returnKeyType="search"
                      style={styles.searchInput}
                      textColor={theme.colors.onSurface}
                      outlineColor={theme.colors.outline}
                      activeOutlineColor={theme.colors.primary}
                      placeholderTextColor={theme.colors.onSurfaceDisabled}
                    />
                    <GradientButton
                      onPress={handleSearch}
                      style={styles.searchButton}
                      contentStyle={{ height: 50 }}
                      disabled={isSearching}
                      accessibilityLabel="Search foods"
                      theme={theme}
                    >
                      {isSearching ? "..." : "Search"}
                    </GradientButton>
                  </View>

                  {isSearching && (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator
                        size="large"
                        color={theme.colors.primary}
                      />
                      <Text
                        style={[
                          styles.loadingText,
                          { color: theme.colors.onSurfaceDisabled },
                        ]}
                      >
                        Searching products...
                      </Text>
                    </View>
                  )}

                  {!isSearching &&
                    searchResults.map((food, index) => (
                      <Card
                        key={food.barcode ?? `${food.name}-${index}`}
                        style={[
                          styles.foodCard,
                          { backgroundColor: theme.colors.surfaceVariant },
                        ]}
                        onPress={() => handleSelectFood(food)}
                      >
                        <Card.Content>
                          <Text variant="titleMedium">{food.name}</Text>
                          {food.brand && (
                            <Text variant="bodySmall">{food.brand}</Text>
                          )}
                          <View style={styles.nutritionRow}>
                            <RNText
                              style={{ color: theme.colors.onSurfaceVariant }}
                            >
                              {food.calories} kcal | {food.protein}g P |{" "}
                              {food.fats}g F | {food.carbs}g C
                            </RNText>
                          </View>
                          <Text
                            variant="bodySmall"
                            style={[
                              styles.servingInfo,
                              { color: theme.colors.onSurfaceDisabled },
                            ]}
                          >
                            per {food.serving_size}
                            {food.serving_unit}
                          </Text>
                        </Card.Content>
                      </Card>
                    ))}
                </ScrollView>
              )}

              {mode === "custom" && (
                <View>
                  <TextInput
                    mode="outlined"
                    label="Food Name"
                    value={customName}
                    onChangeText={setCustomName}
                    style={styles.input}
                    textColor={theme.colors.onSurface}
                    outlineColor={theme.colors.outline}
                    activeOutlineColor={theme.colors.primary}
                  />
                  <TextInput
                    mode="outlined"
                    label="Calories (kcal)"
                    value={customCalories}
                    onChangeText={setCustomCalories}
                    keyboardType="numeric"
                    style={styles.input}
                    textColor={theme.colors.onSurface}
                    outlineColor={theme.colors.outline}
                    activeOutlineColor={theme.colors.primary}
                  />
                  <TextInput
                    mode="outlined"
                    label="Protein (g)"
                    value={customProtein}
                    onChangeText={setCustomProtein}
                    keyboardType="numeric"
                    style={styles.input}
                    textColor={theme.colors.onSurface}
                    outlineColor={theme.colors.outline}
                    activeOutlineColor={theme.colors.primary}
                  />
                  <TextInput
                    mode="outlined"
                    label="Fats (g)"
                    value={customFats}
                    onChangeText={setCustomFats}
                    keyboardType="numeric"
                    style={styles.input}
                    textColor={theme.colors.onSurface}
                    outlineColor={theme.colors.outline}
                    activeOutlineColor={theme.colors.primary}
                  />
                  <TextInput
                    mode="outlined"
                    label="Carbs (g)"
                    value={customCarbs}
                    onChangeText={setCustomCarbs}
                    keyboardType="numeric"
                    style={styles.input}
                    textColor={theme.colors.onSurface}
                    outlineColor={theme.colors.outline}
                    activeOutlineColor={theme.colors.primary}
                  />

                  <GradientButton
                    onPress={handleAddMeal}
                    style={styles.addButton}
                    disabled={!customName || !customCalories}
                    theme={theme}
                  >
                    Add Meal
                  </GradientButton>

                  <GradientButton
                    onPress={() => setMode("menu")}
                    style={styles.backButton}
                    theme={theme}
                  >
                    Back
                  </GradientButton>
                </View>
              )}

              {mode === "confirm" && selectedFood && (
                <View>
                  <Card
                    style={[
                      styles.confirmCard,
                      { backgroundColor: theme.colors.surfaceVariant },
                    ]}
                  >
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
                          <Text variant="titleMedium">
                            {selectedFood.fats}g
                          </Text>
                        </View>
                        <View style={styles.macroItem}>
                          <Text variant="bodySmall">Carbs</Text>
                          <Text variant="titleMedium">
                            {selectedFood.carbs}g
                          </Text>
                        </View>
                      </View>
                      <Text
                        variant="bodySmall"
                        style={[
                          styles.servingInfo,
                          { color: theme.colors.onSurfaceDisabled },
                        ]}
                      >
                        {servingLabel}
                      </Text>
                    </Card.Content>
                  </Card>

                  <View style={styles.inputModeContainer}>
                    <GradientButton
                      onPress={() => setInputMode("servings")}
                      style={[
                        styles.modeButton,
                        inputMode === "servings" ? styles.modeActive : null,
                        inputMode === "servings"
                          ? { borderColor: theme.colors.primary }
                          : null,
                      ]}
                      theme={theme}
                    >
                      Servings
                    </GradientButton>
                    <GradientButton
                      onPress={() => setInputMode("grams")}
                      style={[
                        styles.modeButton,
                        inputMode === "grams" ? styles.modeActive : null,
                        inputMode === "grams"
                          ? { borderColor: theme.colors.primary }
                          : null,
                      ]}
                      theme={theme}
                    >
                      Grams
                    </GradientButton>
                  </View>

                  {inputMode === "servings" ? (
                    <TextInput
                      mode="outlined"
                      label="Number of Servings"
                      value={servings}
                      onChangeText={setServings}
                      keyboardType="numeric"
                      style={styles.input}
                      textColor={theme.colors.onSurface}
                      outlineColor={theme.colors.outline}
                      activeOutlineColor={theme.colors.primary}
                    />
                  ) : (
                    <TextInput
                      mode="outlined"
                      label="Weight in Grams"
                      value={gramsInput}
                      onChangeText={setGramsInput}
                      keyboardType="numeric"
                      placeholder="e.g., 150"
                      style={styles.input}
                      textColor={theme.colors.onSurface}
                      outlineColor={theme.colors.outline}
                      activeOutlineColor={theme.colors.primary}
                      placeholderTextColor={theme.colors.onSurfaceDisabled}
                    />
                  )}
                  <TextInput
                    mode="outlined"
                    label="Meal Type (optional)"
                    placeholder="e.g., breakfast"
                    value={mealType}
                    onChangeText={setMealType}
                    style={styles.input}
                    textColor={theme.colors.onSurface}
                    outlineColor={theme.colors.outline}
                    activeOutlineColor={theme.colors.primary}
                    placeholderTextColor={theme.colors.onSurfaceDisabled}
                  />

                  <GradientButton
                    onPress={handleAddMeal}
                    style={styles.addButton}
                    theme={theme}
                  >
                    Add Meal
                  </GradientButton>

                  <GradientButton
                    onPress={() => setMode("search")}
                    style={styles.backButton}
                    theme={theme}
                  >
                    Back
                  </GradientButton>
                </View>
              )}
            </ScrollView>
          </Modal>
        )}

        {/* Camera scanner modal (React Native Modal for fullscreen camera) */}
        <RNModal
          visible={scannerVisible}
          animationType="slide"
          onRequestClose={closeScanner}
          presentationStyle="fullScreen"
        >
          <PaperProvider theme={theme}>
            <View
              style={[
                styles.cameraContainer,
                { backgroundColor: theme.colors.background },
              ]}
            >
              {!permission || !permission.granted ? (
                <View style={styles.permissionState}>
                  <RNText
                    style={{
                      color: theme.colors.onSurface,
                      marginBottom: 12,
                    }}
                  >
                    {!permission
                      ? "Requesting camera permission..."
                      : "Camera permission denied."}
                  </RNText>
                  <GradientButton
                    onPress={() => requestPermission()}
                    style={{ marginBottom: 12 }}
                    theme={theme}
                  >
                    Grant permission
                  </GradientButton>

                  <Button
                    mode="contained"
                    onPress={closeScanner}
                    style={{ marginTop: 8 }}
                    buttonColor={theme.colors.primary}
                    textColor={theme.colors.onPrimary}
                  >
                    Close
                  </Button>
                </View>
              ) : (
                <>
                  <CameraView
                    style={styles.camera}
                    facing="back"
                    onBarcodeScanned={
                      isProcessingScan ? undefined : onBarCodeScanned
                    }
                  />

                  <View style={styles.cameraOverlay}>
                    <View style={styles.overlayRow} />
                    <View style={styles.overlayRow}>
                      <View style={styles.overlaySide} />
                      <View
                        style={[
                          styles.overlayFrame,
                          { borderColor: theme.colors.primary },
                        ]}
                      />
                      <View style={styles.overlaySide} />
                    </View>
                    <View style={styles.overlayRow} />
                  </View>

                  {isProcessingScan && (
                    <View
                      style={[
                        styles.scannerLoadingOverlay,
                        { backgroundColor: "rgba(0,0,0,0.5)" },
                      ]}
                    >
                      <ActivityIndicator
                        size="large"
                        color={theme.colors.primary}
                      />
                      <RNText
                        style={[
                          styles.scannerLoadingText,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        Fetching product…
                      </RNText>
                    </View>
                  )}

                  <View
                    style={{
                      position: "absolute",
                      bottom: 40,
                      alignSelf: "center",
                    }}
                  >
                    <Button
                      mode="contained"
                      onPress={closeScanner}
                      buttonColor={theme.colors.primary}
                      textColor={theme.colors.onPrimary}
                    >
                      Close
                    </Button>
                  </View>
                </>
              )}
            </View>
          </PaperProvider>
        </RNModal>
      </Portal>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: 20,
    borderRadius: 8,
    maxHeight: "100%",
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
    padding: 4,
  },
  content: {
    padding: 16,
  },
  menuContainer: {
    // use spacing via margins on children
  },

  /* gradient button wrapper */
  gradientWrap: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
  transparentBtn: {
    backgroundColor: "transparent",
    elevation: 0,
  },
  gradientContent: {
    height: 48,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  gradientLabel: {
    fontWeight: "600",
  },
  searchContener: {
    maxHeight: 550,
  },
  searchBar: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 8,
    height: 50,
  },
  searchInput: {
    flex: 1,
    height: 50,
  },
  searchButton: {
    minWidth: 50,
    paddingHorizontal: 1,
    height: 50,
    width: 125,
    paddingVertical: 0,
  },
  foodCard: {
    marginBottom: 12,
  },
  nutritionRow: {
    marginTop: 8,
  },
  servingInfo: {
    marginTop: 4,
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
  inputModeContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    marginRight: 8,
  },
  modeActive: {
    borderWidth: 1,
  },

  /* camera styles */
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayRow: { flexDirection: "row" },
  overlaySide: { flex: 1 },
  overlayFrame: {
    width: 300,
    height: 160,
    borderWidth: 2,
    borderRadius: 14,
  },
  permissionState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  scannerLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  scannerLoadingText: { marginTop: 10 },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
  },
});
