import { KeyboardAvoidingView, Platform, View, StyleSheet } from "react-native";
import {
  Button,
  PaperProvider,
  Text,
  TextInput,
  useTheme,
  MD3DarkTheme,
} from "react-native-paper";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { router, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const theme = useTheme();
  const router = useRouter();

  const { signIn, signUp } = useAuth();

  const handleAuth = async () => {
    if (isSignUp && (!username || !email || !password || !confirmPassword)) {
      setError("Please fill in all fields.");
      return;
    }
    if (!isSignUp && (!email || !password)) {
      setError("Please fill in all fields.");
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setError(null);

    if (isSignUp) {
      const error = await signUp(email, password, username);
      if (error) {
        setError(error);
        return;
      }
    } else {
      const error = await signIn(email, password);
      if (error) {
        setError(error);
        return;
      }

      router.replace("/");
    }
  };

  const handleSwitchMode = () => {
    setIsSignUp((prev) => !prev);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <Text style={styles.title} variant="headlineMedium">
            {" "}
            {isSignUp ? "Create account!" : "Log In"}
          </Text>

          {isSignUp && (
            <TextInput
              label="Username"
              placeholder="username"
              autoCapitalize="none"
              mode="outlined"
              style={styles.input}
              onChangeText={setUsername}
            />
          )}
          <TextInput
            label={isSignUp ? "E-mail" : "E-mail or Username"}
            placeholder={isSignUp ? "example@gmail.com" : "email or username"}
            autoCapitalize="none"
            keyboardType={isSignUp ? "email-address" : "default"}
            mode="outlined"
            style={styles.input}
            onChangeText={setEmail}
          />
          <TextInput
            label="Password"
            autoCapitalize="none"
            secureTextEntry
            mode="outlined"
            style={styles.input}
            onChangeText={setPassword}
          />
          {isSignUp && (
            <TextInput
              label="Confirm Password"
              autoCapitalize="none"
              secureTextEntry
              mode="outlined"
              style={styles.input}
              onChangeText={setConfirmPassword}
            />
          )}

          {error && (
            <Text style={{ color: theme.colors.error, marginBottom: 16 }}>
              {error}
            </Text>
          )}

          <Button mode="contained" onPress={handleAuth} style={styles.button}>
            {isSignUp ? "Sign Up" : "Log In"}
          </Button>

          <Button
            mode="text"
            onPress={handleSwitchMode}
            style={styles.switchModebutton}
          >
            {isSignUp ? "Already have an account? Log In" : "Create account!"}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  switchModebutton: {
    marginTop: 16,
  },
});
