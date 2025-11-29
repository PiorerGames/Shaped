import {Account, Client, Databases, ID, Storage} from "react-native-appwrite";

export const ClientAppwrite = new Client()
.setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!)
.setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!)
.setPlatform(process.env.EXPO_PUBLIC_APPWRITE_PLATFORM!);



export const account = new Account(ClientAppwrite);
export const databases = new Databases(ClientAppwrite);
export const storage = new Storage(ClientAppwrite);

export const DATABASE_ID = process.env.EXPO_PUBLIC_DB_ID!;
export const BUCKET_ID = process.env.EXPO_PUBLIC_BUCKET_ID || 'profile_pictures';
export const MEASUREMENTS_TABLE_ID = process.env.EXPO_PUBLIC_MEASUREMENTS_TABLE!;
export const FOOD_ITEMS_TABLE_ID = process.env.EXPO_PUBLIC_FOOD_ITEMS_TABLE!;
export const MEAL_ENTRIES_TABLE_ID = process.env.EXPO_PUBLIC_MEAL_ENTRIES_TABLE!;
// Workout tables
export const WORKOUT_TEMPLATES_TABLE_ID = 'workout_templates';
export const EXERCISES_TABLE_ID = 'exercises';
export const WORKOUT_SESSIONS_TABLE_ID = 'workout_sessions';
export const EXERCISE_SETS_TABLE_ID = 'exercise_sets';
export const CARDIO_ACTIVITIES_TABLE_ID = 'cardio_activities';
// User profiles
export const USER_PROFILES_TABLE_ID = 'user_profiles';
export const USER_SETTINGS_TABLE_ID = 'user_settings';
export const USER_DATA_TABLE_ID = 'user_data';

