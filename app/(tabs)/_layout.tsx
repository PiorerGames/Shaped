import { Tabs } from "expo-router";
import { StyleSheet } from "react-native";
import Octicons from "@expo/vector-icons/Octicons";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@/lib/theme-context";

export default function TabsLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerTintColor: theme.colors.onSurface,
        headerStyle: { backgroundColor: theme.colors.background },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.elevation.level2,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: theme.colors.onSurface,
        tabBarInactiveTintColor: theme.colors.outline,
        tabBarActiveBackgroundColor: "transparent",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <Octicons name="home-fill" size={24} color={color} />
            ) : (
              <Octicons name="home" size={24} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: "Meals",
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <Ionicons name="restaurant" size={24} color={color} />
            ) : (
              <Ionicons name="restaurant-outline" size={24} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: "Activities",
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <Ionicons name="fitness" size={24} color={color} />
            ) : (
              <Ionicons name="fitness-outline" size={24} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="options"
        options={{
          title: "Options",
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <Ionicons name="settings" size={24} color={color} />
            ) : (
              <Ionicons name="settings-outline" size={24} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
