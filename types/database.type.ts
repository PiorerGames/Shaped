import { Models } from "react-native-appwrite";

export interface Measurement extends Models.Document {
    user_id: string;
    type: string;
    value: number;
    unit: string;
}

export interface FoodItem extends Models.Document {
  user_id: string;
  name: string;
  barcode?: string;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  serving_size: number;
  serving_unit: string;
  is_custom: boolean;
  brand?: string;
}

export interface MealEntry extends Models.Document {
  user_id: string;
  date: string; // YYYY-MM-DD format
  food_item_id: string;
  food_name: string;
  servings: number;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  meal_type?: string; // breakfast, lunch, dinner, snack
}