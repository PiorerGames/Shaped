import {Account, Client, Databases, ID} from "react-native-appwrite";

export const ClientAppwrite = new Client()
.setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!)
.setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!)
.setPlatform(process.env.EXPO_PUBLIC_APPWRITE_PLATFORM!);



export const account = new Account(ClientAppwrite);
export const databases = new Databases(ClientAppwrite);

export const DATABASE_ID = process.env.EXPO_PUBLIC_DB_ID!;
export const MEASUREMENTS_TABLE_ID = process.env.EXPO_PUBLIC_MEASUREMENTS_TABLE!;
export const FOOD_ITEMS_TABLE_ID = process.env.EXPO_PUBLIC_FOOD_ITEMS_TABLE!;
export const MEAL_ENTRIES_TABLE_ID = process.env.EXPO_PUBLIC_MEAL_ENTRIES_TABLE!;