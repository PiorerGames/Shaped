import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { MD3DarkTheme, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";




function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoadingUser } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    const inAuthGroup = segments[0] === "auth";
    if (!user && !inAuthGroup && !isLoadingUser) {
      router.replace("/auth");
    }
    else if (user && inAuthGroup && !isLoadingUser) {
      router.replace("/");
    }
  }, [user, isLoadingUser, segments, router]);

  return <>{children}</>;
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <PaperProvider theme={MD3DarkTheme}>
        <SafeAreaProvider>
          <RouteGuard>
            <Stack>
              <Stack.Screen name="auth" options={{headerShown: false}} />
              <Stack.Screen name="(tabs)" options={{headerShown: false}} />
              <Stack.Screen name="measurements" options={{headerShown: false}} />
            </Stack>
          </RouteGuard>
        </SafeAreaProvider>
      </PaperProvider>
    </AuthProvider>
  );
}

