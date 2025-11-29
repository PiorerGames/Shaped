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

export interface TemplateExercise {
  exercise_id: string;
  exercise_name: string;
  sets: number;
  reps: number | number[]; // Single number or array for individual set reps
  rest_seconds?: number;
  notes?: string;
}

// Workout Types
export interface WorkoutTemplate extends Models.Document {
  user_id: string;
  name: string;
  description?: string;
  exercises: TemplateExercise[];
  is_favorite: boolean;
}

export interface Exercise extends Models.Document {
  name: string;
  category: string;
  equipment?: string;
  muscle_groups: string[];
  instructions?: string;
  is_custom: boolean;
  user_id?: string;
}

export interface WorkoutSession extends Models.Document {
  user_id: string;
  template_id?: string;
  workout_name: string;
  date: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  total_volume: number;
  notes?: string;
  is_active: boolean;
}

export interface ExerciseSet extends Models.Document {
  user_id: string;
  session_id: string;
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  reps: number;
  weight: number;
  weight_unit: string;
  is_warmup: boolean;
  is_completed: boolean;
  rpe?: number;
  notes?: string;
}

export interface CardioActivity extends Models.Document {
  user_id: string;
  date: string;
  activity_type: string;
  duration_minutes: number;
  distance?: number;
  calories_burned?: number;
  avg_heart_rate?: number;
  notes?: string;
}
