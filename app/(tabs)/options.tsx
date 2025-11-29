import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useUnits } from "@/lib/unit-context";
import { useState, useMemo, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  TextInput,
  Card,
  Switch,
  Divider,
  Avatar,
  Text,
  Dialog,
  Portal,
} from "react-native-paper";
import {
  databases,
  DATABASE_ID,
  USER_SETTINGS_TABLE_ID,
  USER_DATA_TABLE_ID,
  storage,
  BUCKET_ID,
  ClientAppwrite,
  account,
} from "@/lib/appwrite";
import { ID, Query } from "react-native-appwrite";
import { useCustomAlert } from "@/components/CustomAlert";

type TabType = "profile" | "userData" | "settings" | "about";

export default function Options() {
  const { signOut, user } = useAuth();
  const { themeMode, setThemeMode, theme } = useTheme();
  const { useMetricUnits, setUseMetricUnits } = useUnits();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [selectedTab, setSelectedTab] = useState<TabType>("profile");

  // Profile states
  const [username, setUsername] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  // User data states
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [sex, setSex] = useState<"male" | "female" | null>(null);
  const [goal, setGoal] = useState<"lose" | "maintain" | "gain" | null>(null);
  const [goalSpeed, setGoalSpeed] = useState<"slow" | "moderate" | "fast">(
    "moderate"
  );

  // Calorie goal states
  const [caloriesGoalCalculated, setCaloriesGoalCalculated] = useState<
    number | null
  >(null);
  const [useCalculatedCalories, setUseCalculatedCalories] = useState(true);
  const [caloriesGoal, setCaloriesGoal] = useState(""); // editable override

  // Settings states
  const [language, setLanguage] = useState<"en" | "pl">("en");
  const [workoutNotifications, setWorkoutNotifications] = useState(true);

  const [userDataId, setUserDataId] = useState<string | null>(null);
  const [userSettingsId, setUserSettingsId] = useState<string | null>(null);
  const [profilePictureFileId, setProfilePictureFileId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);

  // Password change states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Load user data and settings on mount
  useEffect(() => {
    if (user) {
      loadUserData();
      loadUserSettings();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        USER_DATA_TABLE_ID,
        [Query.equal("user_id", user!.$id)]
      );

      if (response.documents.length > 0) {
        const data = response.documents[0];
        setUserDataId(data.$id);
        setAge(data.age?.toString() || "");
        setWeight(data.weight?.toString() || "");
        setHeight(data.height?.toString() || "");
        setSex(data.sex || null);
        setGoal(data.goal || null);
        setGoalSpeed(data.goal_speed || "moderate");
        setCaloriesGoal(data.calories_goal?.toString() || "");

        // Load profile picture if exists
        if (data.profile_picture_id) {
          setProfilePictureFileId(data.profile_picture_id);
          const fileUrl = `${ClientAppwrite.config.endpoint}/storage/buckets/${BUCKET_ID}/files/${data.profile_picture_id}/view?project=${ClientAppwrite.config.project}`;
          setProfilePicture(fileUrl);
        }
      }
    } catch (error) {
      console.log("Error loading user data:", error);
    }
  };

  const loadUserSettings = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        USER_SETTINGS_TABLE_ID,
        [Query.equal("user_id", user!.$id)]
      );

      if (response.documents.length > 0) {
        const settings = response.documents[0];
        setUserSettingsId(settings.$id);
        setLanguage(settings.language || "en");
        setWorkoutNotifications(settings.workout_notifications ?? true);
        setUseMetricUnits(settings.use_metric_units ?? true);

        // Load and apply theme mode
        if (settings.theme_mode) {
          setThemeMode(
            settings.theme_mode as "system" | "light" | "dark" | "highContrast"
          );
        }
      }
    } catch (error) {
      console.log("Error loading user settings:", error);
    }
  };

  const saveUserData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const dataPayload = {
        user_id: user.$id,
        age: age ? parseInt(age) : null,
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        sex: sex,
        goal: goal,
        goal_speed: goalSpeed,
        profile_picture_id: profilePictureFileId,
        // Store the calorie goal (either calculated or manually entered)
        calories_goal: useCalculatedCalories
          ? caloriesGoalCalculated
          : caloriesGoal
          ? parseInt(caloriesGoal)
          : null,
      };

      if (userDataId) {
        await databases.updateDocument(
          DATABASE_ID,
          USER_DATA_TABLE_ID,
          userDataId,
          dataPayload
        );
      } else {
        const response = await databases.createDocument(
          DATABASE_ID,
          USER_DATA_TABLE_ID,
          ID.unique(),
          dataPayload
        );
        setUserDataId(response.$id);
      }

      showAlert("Success", "User data saved successfully!");
    } catch (error) {
      console.log("Error saving user data:", error);
      showAlert("Error", "Failed to save user data.");
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        showAlert(
          "Permission Denied",
          "We need camera roll permissions to change your profile picture."
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        setIsLoading(true);
        const asset = result.assets[0];

        try {
          // Delete old profile picture if exists
          if (profilePictureFileId) {
            try {
              await storage.deleteFile(BUCKET_ID, profilePictureFileId);
            } catch (error) {
              console.log("Error deleting old profile picture:", error);
            }
          }

          // Upload new profile picture
          const file = {
            name: `profile_${user!.$id}_${Date.now()}.jpg`,
            type: "image/jpeg",
            size: asset.fileSize || 0,
            uri: asset.uri,
          };

          console.log("Uploading file:", file);

          const uploadedFile = await storage.createFile(
            BUCKET_ID,
            ID.unique(),
            file as any
          );

          console.log("File uploaded successfully:", uploadedFile);

          setProfilePictureFileId(uploadedFile.$id);
          const fileUrl = `${ClientAppwrite.config.endpoint}/storage/buckets/${BUCKET_ID}/files/${uploadedFile.$id}/view?project=${ClientAppwrite.config.project}`;
          setProfilePicture(fileUrl);

          // Save to database
          if (userDataId) {
            await databases.updateDocument(
              DATABASE_ID,
              USER_DATA_TABLE_ID,
              userDataId,
              { profile_picture_id: uploadedFile.$id }
            );
          } else {
            const response = await databases.createDocument(
              DATABASE_ID,
              USER_DATA_TABLE_ID,
              ID.unique(),
              {
                user_id: user!.$id,
                profile_picture_id: uploadedFile.$id,
              }
            );
            setUserDataId(response.$id);
          }

          showAlert("Success", "Profile picture updated!");
        } catch (error) {
          console.log("Error uploading profile picture:", error);
          showAlert("Error", "Failed to upload profile picture.");
        } finally {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.log("Error picking image:", error);
      showAlert("Error", "Failed to pick image.");
    }
  };

  const saveUserSettings = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const settingsPayload: any = {
        user_id: user.$id,
        language: language,
        workout_notifications: workoutNotifications,
        use_metric_units: useMetricUnits,
      };

      // Try to include theme_mode, but handle if the attribute doesn't exist yet
      try {
        settingsPayload.theme_mode = themeMode;
      } catch (e) {
        console.log("theme_mode attribute not available yet");
      }

      if (userSettingsId) {
        await databases.updateDocument(
          DATABASE_ID,
          USER_SETTINGS_TABLE_ID,
          userSettingsId,
          settingsPayload
        );
      } else {
        const response = await databases.createDocument(
          DATABASE_ID,
          USER_SETTINGS_TABLE_ID,
          ID.unique(),
          settingsPayload
        );
        setUserSettingsId(response.$id);
      }

      showAlert("Success", "Settings saved successfully!");
    } catch (error: any) {
      console.log("Error saving settings:", error);
      if (error?.message?.includes("theme_mode")) {
        showAlert(
          "Database Update Required",
          "Please add the 'theme_mode' attribute to the user_settings table in Appwrite. See DATABASE_SETUP.md for details."
        );
      } else {
        showAlert("Error", "Failed to save settings.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    showAlert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showAlert("Error", "Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert("Error", "New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      showAlert("Error", "Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      await account.updatePassword(newPassword, currentPassword);

      setShowPasswordDialog(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      showAlert("Success", "Password changed successfully!");
    } catch (error: any) {
      console.log("Error changing password:", error);
      if (error?.message?.includes("Invalid credentials")) {
        showAlert("Error", "Current password is incorrect.");
      } else {
        showAlert("Error", "Failed to change password. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate calories when relevant inputs change
  useEffect(() => {
    const calc = () => {
      const ageNum = parseInt(age);
      const weightNum = parseFloat(weight);
      const heightNum = parseFloat(height);

      if (
        !age ||
        !weight ||
        !height ||
        !sex ||
        isNaN(ageNum) ||
        isNaN(weightNum) ||
        isNaN(heightNum)
      ) {
        setCaloriesGoalCalculated(null);
        return;
      }

      // Convert to metric if needed
      const weightKg = useMetricUnits ? weightNum : weightNum * 0.453592;
      const heightCm = useMetricUnits ? heightNum : heightNum * 2.54;

      // Mifflin-St Jeor BMR
      const bmr =
        10 * weightKg +
        6.25 * heightCm -
        5 * ageNum +
        (sex === "male" ? 5 : -161);

      // Minimal activity factor (no activity selection yet); keep conservative
      const activityFactor = 1.2;

      // Adjustments based on goal speed
      let adjustment = 0;
      if (goal === "lose") {
        adjustment =
          goalSpeed === "slow" ? -250 : goalSpeed === "moderate" ? -500 : -750;
      } else if (goal === "gain") {
        adjustment =
          goalSpeed === "slow" ? 250 : goalSpeed === "moderate" ? 500 : 750;
      }

      const tdee = Math.round(bmr * activityFactor + adjustment);
      setCaloriesGoalCalculated(tdee);

      // If user currently uses calculated value, reflect it in the editable field
      if (useCalculatedCalories) {
        setCaloriesGoal(String(tdee));
      }
    };

    calc();
  }, [
    age,
    weight,
    height,
    sex,
    goal,
    goalSpeed,
    useMetricUnits,
    useCalculatedCalories,
  ]);

  // Dynamic styles based on theme
  const styles = useMemo(() => createStyles(theme), [theme]);

  const renderProfile = () => (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.avatarContainer}>
        {profilePicture ? (
          <Avatar.Image size={80} source={{ uri: profilePicture }} />
        ) : (
          <Avatar.Text
            size={80}
            label={username.substring(0, 2).toUpperCase() || "U"}
          />
        )}
        <Button
          mode="text"
          style={styles.changePhotoButton}
          onPress={pickImage}
          disabled={isLoading}
        >
          {isLoading ? "Uploading..." : "Change Photo"}
        </Button>
      </View>

      <TextInput
        label="Username"
        value={username}
        onChangeText={setUsername}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Email"
        value={email}
        editable={false}
        mode="outlined"
        style={styles.input}
        right={<TextInput.Icon icon="lock" />}
      />

      <Button
        mode="outlined"
        style={styles.button}
        onPress={() => setShowPasswordDialog(true)}
      >
        Change Password
      </Button>

      <Button mode="contained" style={styles.button}>
        Save Changes
      </Button>

      <Divider style={styles.divider} />

      <Button
        mode="contained"
        onPress={handleSignOut}
        icon="logout"
        style={styles.logoutButton}
        buttonColor="#ef5350"
        textColor="#ffffff"
      >
        Sign Out
      </Button>
    </ScrollView>
  );

  const renderUserData = () => (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.scrollContent}
    >
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Personal Information
      </Text>

      <TextInput
        label="Age"
        value={age}
        onChangeText={setAge}
        keyboardType="numeric"
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label={useMetricUnits ? "Weight (kg)" : "Weight (lbs)"}
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label={useMetricUnits ? "Height (cm)" : "Height (inches)"}
        value={height}
        onChangeText={setHeight}
        keyboardType="numeric"
        mode="outlined"
        style={styles.input}
      />

      {/* Calorie goal preview and override */}
      <Text variant="titleSmall" style={styles.label}>
        Daily Calorie Goal
      </Text>
      <Card style={styles.settingCard}>
        <Card.Content>
          <View style={styles.settingRow}>
            <View>
              <Text variant="bodyLarge" style={styles.settingLabel}>
                Calculated
              </Text>
              <Text variant="bodySmall" style={styles.settingDescription}>
                {caloriesGoalCalculated
                  ? `${caloriesGoalCalculated} kcal/day`
                  : "Enter age, weight, height & sex to calculate"}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text variant="bodySmall" style={styles.settingDescription}>
                Use calculated
              </Text>
              <Switch
                value={useCalculatedCalories}
                onValueChange={(v) => setUseCalculatedCalories(v)}
              />
            </View>
          </View>
          <View style={{ marginTop: 12 }}>
            <TextInput
              label="Custom Calorie Goal (kcal/day)"
              value={caloriesGoal}
              onChangeText={setCaloriesGoal}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
              editable={!useCalculatedCalories}
            />
            <Text variant="bodySmall" style={styles.settingDescription}>
              Toggle "Use calculated" to accept computed value, or turn off to
              enter your own.
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Text variant="titleSmall" style={styles.label}>
        Biological Sex
      </Text>
      <View style={styles.buttonGroup}>
        <Pressable
          style={[
            styles.optionButton,
            sex === "male" && styles.optionButtonActive,
          ]}
          onPress={() => setSex("male")}
        >
          <Text
            style={[
              styles.optionText,
              sex === "male" && styles.optionTextActive,
            ]}
          >
            Male
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.optionButton,
            sex === "female" && styles.optionButtonActive,
          ]}
          onPress={() => setSex("female")}
        >
          <Text
            style={[
              styles.optionText,
              sex === "female" && styles.optionTextActive,
            ]}
          >
            Female
          </Text>
        </Pressable>
      </View>

      <Divider style={styles.divider} />

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Fitness Goals
      </Text>

      <Text variant="titleSmall" style={styles.label}>
        Primary Goal
      </Text>
      <View style={styles.buttonGroup}>
        <Pressable
          style={[
            styles.optionButton,
            goal === "lose" && styles.optionButtonActive,
          ]}
          onPress={() => setGoal("lose")}
        >
          <Text
            style={[
              styles.optionText,
              goal === "lose" && styles.optionTextActive,
            ]}
          >
            Lose Weight
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.optionButton,
            goal === "maintain" && styles.optionButtonActive,
          ]}
          onPress={() => setGoal("maintain")}
        >
          <Text
            style={[
              styles.optionText,
              goal === "maintain" && styles.optionTextActive,
            ]}
          >
            Maintain
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.optionButton,
            goal === "gain" && styles.optionButtonActive,
          ]}
          onPress={() => setGoal("gain")}
        >
          <Text
            style={[
              styles.optionText,
              goal === "gain" && styles.optionTextActive,
            ]}
          >
            Gain Weight
          </Text>
        </Pressable>
      </View>

      <Text variant="titleSmall" style={styles.label}>
        Goal Speed
      </Text>
      <View style={styles.buttonGroup}>
        <Pressable
          style={[
            styles.optionButton,
            goalSpeed === "slow" && styles.optionButtonActive,
          ]}
          onPress={() => setGoalSpeed("slow")}
        >
          <Text
            style={[
              styles.optionText,
              goalSpeed === "slow" && styles.optionTextActive,
            ]}
          >
            Slow
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.optionButton,
            goalSpeed === "moderate" && styles.optionButtonActive,
          ]}
          onPress={() => setGoalSpeed("moderate")}
        >
          <Text
            style={[
              styles.optionText,
              goalSpeed === "moderate" && styles.optionTextActive,
            ]}
          >
            Moderate
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.optionButton,
            goalSpeed === "fast" && styles.optionButtonActive,
          ]}
          onPress={() => setGoalSpeed("fast")}
        >
          <Text
            style={[
              styles.optionText,
              goalSpeed === "fast" && styles.optionTextActive,
            ]}
          >
            Fast
          </Text>
        </Pressable>
      </View>

      <Button
        mode="contained"
        style={styles.button}
        onPress={saveUserData}
        disabled={isLoading}
      >
        {isLoading ? "Saving..." : "Save Changes"}
      </Button>
    </ScrollView>
  );

  const renderSettings = () => (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.scrollContent}
    >
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Appearance
      </Text>

      <Card style={styles.settingCard}>
        <Card.Content>
          <View style={styles.settingRow}>
            <View>
              <Text variant="bodyLarge" style={styles.settingLabel}>
                Language
              </Text>
              <Text variant="bodySmall" style={styles.settingDescription}>
                {language === "en" ? "English" : "Polski"}
              </Text>
            </View>
            <View style={styles.buttonGroup}>
              <Pressable
                style={[
                  styles.smallButton,
                  language === "en" && styles.smallButtonActive,
                ]}
                onPress={() => setLanguage("en")}
              >
                <Text
                  style={[
                    styles.smallButtonText,
                    language === "en" && styles.smallButtonTextActive,
                  ]}
                >
                  EN
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.smallButton,
                  language === "pl" && styles.smallButtonActive,
                ]}
                onPress={() => setLanguage("pl")}
              >
                <Text
                  style={[
                    styles.smallButtonText,
                    language === "pl" && styles.smallButtonTextActive,
                  ]}
                >
                  PL
                </Text>
              </Pressable>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.settingCard}>
        <Card.Content>
          <Text variant="bodyLarge" style={styles.settingLabel}>
            Theme Mode
          </Text>
          <Text variant="bodySmall" style={styles.settingDescription}>
            {themeMode === "system"
              ? "System"
              : themeMode === "light"
              ? "Light"
              : themeMode === "dark"
              ? "Dark"
              : "High Contrast"}
          </Text>
          <View style={[styles.buttonGroup, { marginTop: 12 }]}>
            <Pressable
              style={[
                styles.optionButton,
                themeMode === "system" && styles.optionButtonActive,
              ]}
              onPress={() => setThemeMode("system")}
            >
              <Text
                style={[
                  styles.optionText,
                  themeMode === "system" && styles.optionTextActive,
                ]}
              >
                Auto
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.optionButton,
                themeMode === "light" && styles.optionButtonActive,
              ]}
              onPress={() => setThemeMode("light")}
            >
              <Text
                style={[
                  styles.optionText,
                  themeMode === "light" && styles.optionTextActive,
                ]}
              >
                ☀️ Light
              </Text>
            </Pressable>
          </View>
          <View style={styles.buttonGroup}>
            <Pressable
              style={[
                styles.optionButton,
                themeMode === "dark" && styles.optionButtonActive,
              ]}
              onPress={() => setThemeMode("dark")}
            >
              <Text
                style={[
                  styles.optionText,
                  themeMode === "dark" && styles.optionTextActive,
                ]}
              >
                🌙 Dark
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.optionButton,
                themeMode === "highContrast" && styles.optionButtonActive,
              ]}
              onPress={() => setThemeMode("highContrast")}
            >
              <Text
                style={[
                  styles.optionText,
                  themeMode === "highContrast" && styles.optionTextActive,
                ]}
              >
                ⚡ High Contrast
              </Text>
            </Pressable>
          </View>
        </Card.Content>
      </Card>

      <Divider style={styles.divider} />

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Notifications
      </Text>

      <Card style={styles.settingCard}>
        <Card.Content>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyLarge" style={styles.settingLabel}>
                Workout in Progress
              </Text>
              <Text variant="bodySmall" style={styles.settingDescription}>
                Notify when workout is still active
              </Text>
            </View>
            <Switch
              value={workoutNotifications}
              onValueChange={setWorkoutNotifications}
            />
          </View>
        </Card.Content>
      </Card>

      <Divider style={styles.divider} />

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Units
      </Text>

      <Card style={styles.settingCard}>
        <Card.Content>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyLarge" style={styles.settingLabel}>
                Unit System
              </Text>
              <Text variant="bodySmall" style={styles.settingDescription}>
                {useMetricUnits
                  ? "Metric (kg, cm, km)"
                  : "Imperial (lbs, inches, miles)"}
              </Text>
            </View>
            <View style={styles.buttonGroup}>
              <Pressable
                style={[
                  styles.smallButton,
                  useMetricUnits && styles.smallButtonActive,
                ]}
                onPress={() => setUseMetricUnits(true)}
              >
                <Text
                  style={[
                    styles.smallButtonText,
                    useMetricUnits && styles.smallButtonTextActive,
                  ]}
                >
                  Metric
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.smallButton,
                  !useMetricUnits && styles.smallButtonActive,
                ]}
                onPress={() => setUseMetricUnits(false)}
              >
                <Text
                  style={[
                    styles.smallButtonText,
                    !useMetricUnits && styles.smallButtonTextActive,
                  ]}
                >
                  Imperial
                </Text>
              </Pressable>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        style={styles.button}
        onPress={saveUserSettings}
        disabled={isLoading}
      >
        {isLoading ? "Saving..." : "Save Changes"}
      </Button>
    </ScrollView>
  );

  const renderAbout = () => (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.scrollContent}
    >
      <Card style={styles.aboutCard}>
        <Card.Content>
          <Text variant="headlineMedium" style={styles.appName}>
            Shaped
          </Text>
          <Text variant="bodyMedium" style={styles.version}>
            Version 1.1.0
          </Text>
        </Card.Content>
      </Card>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Help & Support
      </Text>

      <Pressable
        style={styles.linkCard}
        onPress={() => Linking.openURL("https://example.com/help")}
      >
        <Card style={styles.settingCard}>
          <Card.Content>
            <View style={styles.settingRow}>
              <Text variant="bodyLarge" style={styles.settingLabel}>
                Help Center
              </Text>
              <Text style={styles.arrow}>›</Text>
            </View>
          </Card.Content>
        </Card>
      </Pressable>

      <Pressable
        style={styles.linkCard}
        onPress={() => Linking.openURL("https://example.com/contact")}
      >
        <Card style={styles.settingCard}>
          <Card.Content>
            <View style={styles.settingRow}>
              <Text variant="bodyLarge" style={styles.settingLabel}>
                Contact Support
              </Text>
              <Text style={styles.arrow}>›</Text>
            </View>
          </Card.Content>
        </Card>
      </Pressable>

      <Pressable
        style={styles.linkCard}
        onPress={() => Linking.openURL("https://example.com/privacy")}
      >
        <Card style={styles.settingCard}>
          <Card.Content>
            <View style={styles.settingRow}>
              <Text variant="bodyLarge" style={styles.settingLabel}>
                Privacy Policy
              </Text>
              <Text style={styles.arrow}>›</Text>
            </View>
          </Card.Content>
        </Card>
      </Pressable>

      <Pressable
        style={styles.linkCard}
        onPress={() => Linking.openURL("https://example.com/terms")}
      >
        <Card style={styles.settingCard}>
          <Card.Content>
            <View style={styles.settingRow}>
              <Text variant="bodyLarge" style={styles.settingLabel}>
                Terms of Service
              </Text>
              <Text style={styles.arrow}>›</Text>
            </View>
          </Card.Content>
        </Card>
      </Pressable>

      <Text variant="bodySmall" style={styles.copyright}>
        © 2025 Shaped. All rights reserved.
      </Text>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text variant="headlineSmall" style={styles.title}>
        Settings
      </Text>

      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, selectedTab === "profile" && styles.activeTab]}
          onPress={() => setSelectedTab("profile")}
        >
          <Text
            variant="titleSmall"
            style={[
              styles.tabText,
              selectedTab === "profile" && styles.activeTabText,
            ]}
          >
            Profile
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, selectedTab === "userData" && styles.activeTab]}
          onPress={() => setSelectedTab("userData")}
        >
          <Text
            variant="titleSmall"
            style={[
              styles.tabText,
              selectedTab === "userData" && styles.activeTabText,
            ]}
          >
            User Data
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, selectedTab === "settings" && styles.activeTab]}
          onPress={() => setSelectedTab("settings")}
        >
          <Text
            variant="titleSmall"
            style={[
              styles.tabText,
              selectedTab === "settings" && styles.activeTabText,
            ]}
          >
            Settings
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, selectedTab === "about" && styles.activeTab]}
          onPress={() => setSelectedTab("about")}
        >
          <Text
            variant="titleSmall"
            style={[
              styles.tabText,
              selectedTab === "about" && styles.activeTabText,
            ]}
          >
            About
          </Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {selectedTab === "profile" && renderProfile()}
        {selectedTab === "userData" && renderUserData()}
        {selectedTab === "settings" && renderSettings()}
        {selectedTab === "about" && renderAbout()}
      </View>

      <Portal>
        <Dialog
          visible={showPasswordDialog}
          onDismiss={() => setShowPasswordDialog(false)}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title style={{ color: theme.colors.onSurface }}>
            Change Password
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              mode="outlined"
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setShowPasswordDialog(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onPress={handleChangePassword} disabled={isLoading}>
              {isLoading ? "Changing..." : "Change"}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <AlertComponent />
    </SafeAreaView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    title: {
      textAlign: "center",
      marginVertical: 16,
      color: theme.colors.onBackground,
    },
    tabsContainer: {
      flexDirection: "row",
      backgroundColor: theme.colors.elevation.level1,
      marginHorizontal: 16,
      borderRadius: 8,
      padding: 4,
    },
    tab: {
      flex: 1,
      padding: 8,
      alignItems: "center",
      borderRadius: 6,
    },
    activeTab: {
      backgroundColor: theme.colors.primary,
    },
    tabText: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
    },
    activeTabText: {
      color: theme.colors.onPrimary,
      fontWeight: "bold",
    },
    content: {
      flex: 1,
    },
    tabContent: {
      flex: 1,
      padding: 16,
    },
    scrollContent: {
      paddingBottom: 100,
    },
    avatarContainer: {
      alignItems: "center",
      marginBottom: 24,
    },
    changePhotoButton: {
      marginTop: 8,
    },
    input: {
      marginBottom: 16,
    },
    button: {
      marginTop: 8,
      marginBottom: 8,
    },
    sectionTitle: {
      color: theme.colors.onBackground,
      marginTop: 8,
      marginBottom: 16,
      fontWeight: "600",
    },
    label: {
      color: theme.colors.onSurfaceVariant,
      marginTop: 8,
      marginBottom: 8,
    },
    buttonGroup: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 16,
    },
    optionButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      backgroundColor: theme.colors.elevation.level1,
      borderWidth: 1,
      borderColor: theme.colors.elevation.level3,
      alignItems: "center",
    },
    optionButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    optionText: {
      color: theme.colors.onSurfaceVariant,
    },
    optionTextActive: {
      color: theme.colors.onPrimary,
      fontWeight: "bold",
    },
    divider: {
      marginVertical: 16,
      backgroundColor: theme.colors.elevation.level3,
    },
    settingCard: {
      backgroundColor: theme.colors.elevation.level1,
      marginBottom: 8,
    },
    settingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    settingLabel: {
      color: theme.colors.onSurface,
      marginBottom: 4,
    },
    settingDescription: {
      color: theme.colors.onSurfaceVariant,
    },
    smallButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.elevation.level2,
      borderWidth: 1,
      borderColor: theme.colors.elevation.level3,
    },
    smallButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    smallButtonText: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
    },
    smallButtonTextActive: {
      color: theme.colors.onPrimary,
      fontWeight: "bold",
    },
    aboutCard: {
      backgroundColor: theme.colors.elevation.level1,
      marginBottom: 24,
      alignItems: "center",
    },
    appName: {
      color: theme.colors.primary,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: 8,
    },
    version: {
      color: theme.colors.onSurfaceVariant,
      textAlign: "center",
    },
    linkCard: {
      marginBottom: 8,
    },
    arrow: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 24,
    },
    copyright: {
      color: theme.colors.outline,
      textAlign: "center",
      marginTop: 24,
      marginBottom: 16,
    },
    logoutButton: {
      marginTop: 8,
      marginBottom: 8,
    },
  });
