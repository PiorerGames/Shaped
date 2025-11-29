import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { UnitProvider, useUnits } from "@/lib/unit-context";
import { ExerciseSelectionProvider } from "@/lib/exercise-selection-context";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { databases, DATABASE_ID, USER_SETTINGS_TABLE_ID } from "@/lib/appwrite";
import { Query } from "react-native-appwrite";

function UserSettingsLoader() {
  const { user } = useAuth();
  const { setThemeMode } = useTheme();
  const { setUseMetricUnits } = useUnits();

  useEffect(() => {
    if (user) {
      loadUserSettings();
    }
  }, [user]);

  const loadUserSettings = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        USER_SETTINGS_TABLE_ID,
        [Query.equal("user_id", user!.$id)]
      );

      if (response.documents.length > 0) {
        const settings = response.documents[0];

        // Load and apply theme mode
        if (settings.theme_mode) {
          setThemeMode(
            settings.theme_mode as "system" | "light" | "dark" | "highContrast"
          );
        }

        // Load and apply unit preference
        if (settings.use_metric_units !== undefined) {
          setUseMetricUnits(settings.use_metric_units);
        }
      }
    } catch (error) {
      console.log("Error loading user settings:", error);
    }
  };

  return null;
}

function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoadingUser } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    const inAuthGroup = segments[0] === "auth";
    if (!user && !inAuthGroup && !isLoadingUser) {
      router.replace("/auth");
    } else if (user && inAuthGroup && !isLoadingUser) {
      router.replace("/");
    }
  }, [user, isLoadingUser, segments, router]);

  return <>{children}</>;
}

function AppContent() {
  const { theme } = useTheme();

  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <UserSettingsLoader />
        <RouteGuard>
          <Stack>
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="measurements"
              options={{ headerShown: false }}
            />
            <Stack.Screen name="workout" options={{ headerShown: false }} />
            <Stack.Screen
              name="exercise-browser"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="create-workout"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="workout-history"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="exercise-detail"
              options={{ headerShown: false }}
            />
          </Stack>
        </RouteGuard>
      </SafeAreaProvider>
    </PaperProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <UnitProvider>
          <ExerciseSelectionProvider>
            <AppContent />
          </ExerciseSelectionProvider>
        </UnitProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
