import { useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import {
  Dialog,
  Portal,
  Text,
  TextInput,
  Button,
  useTheme,
  SegmentedButtons,
} from "react-native-paper";
import { databases, DATABASE_ID, USER_DATA_TABLE_ID } from "@/lib/appwrite";
import { ID } from "react-native-appwrite";

interface InitialSetupModalProps {
  visible: boolean;
  userId: string;
  onComplete: () => void;
}

export default function InitialSetupModal({
  visible,
  userId,
  onComplete,
}: InitialSetupModalProps) {
  const theme = useTheme();
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [sex, setSex] = useState<"male" | "female">("male");
  const [goal, setGoal] = useState<"lose" | "maintain" | "gain">("maintain");
  const [goalSpeed, setGoalSpeed] = useState<"slow" | "moderate" | "fast">(
    "moderate"
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!age || !weight || !height) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    const ageNum = parseInt(age);
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);

    if (ageNum < 13 || ageNum > 120) {
      Alert.alert("Error", "Please enter a valid age between 13 and 120.");
      return;
    }

    if (weightNum < 20 || weightNum > 300) {
      Alert.alert("Error", "Please enter a valid weight.");
      return;
    }

    if (heightNum < 100 || heightNum > 250) {
      Alert.alert("Error", "Please enter a valid height.");
      return;
    }

    setIsLoading(true);

    try {
      await databases.createDocument(
        DATABASE_ID,
        USER_DATA_TABLE_ID,
        ID.unique(),
        {
          user_id: userId,
          age: ageNum,
          weight: weightNum,
          height: heightNum,
          sex: sex,
          goal: goal,
          goal_speed: goalSpeed,
        }
      );

      Alert.alert(
        "Welcome!",
        "Your profile has been set up successfully. You can update these details anytime in Settings.",
        [{ text: "OK", onPress: onComplete }]
      );
    } catch (error) {
      console.log("Error saving initial setup:", error);
      Alert.alert("Error", "Failed to save your data. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Portal>
      <Dialog
        visible={visible}
        dismissable={false}
        style={{ backgroundColor: theme.colors.surface }}
      >
        <Dialog.Title style={{ color: theme.colors.onSurface }}>
          Welcome! Let's Set Up Your Profile
        </Dialog.Title>
        <Dialog.ScrollArea>
          <ScrollView contentContainerStyle={styles.content}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}
            >
              We need some basic information to personalize your fitness
              experience and calculate your daily nutrition goals.
            </Text>

            <TextInput
              label="Age *"
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Weight (kg) *"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Height (cm) *"
              value={height}
              onChangeText={setHeight}
              keyboardType="decimal-pad"
              mode="outlined"
              style={styles.input}
            />

            <Text
              variant="labelLarge"
              style={{ color: theme.colors.onSurface, marginTop: 8 }}
            >
              Sex *
            </Text>
            <SegmentedButtons
              value={sex}
              onValueChange={(value) => setSex(value as "male" | "female")}
              buttons={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ]}
              style={styles.segmented}
            />

            <Text
              variant="labelLarge"
              style={{ color: theme.colors.onSurface, marginTop: 16 }}
            >
              Fitness Goal *
            </Text>
            <SegmentedButtons
              value={goal}
              onValueChange={(value) =>
                setGoal(value as "lose" | "maintain" | "gain")
              }
              buttons={[
                { value: "lose", label: "Lose" },
                { value: "maintain", label: "Maintain" },
                { value: "gain", label: "Gain" },
              ]}
              style={styles.segmented}
            />

            <Text
              variant="labelLarge"
              style={{ color: theme.colors.onSurface, marginTop: 16 }}
            >
              Goal Speed *
            </Text>
            <SegmentedButtons
              value={goalSpeed}
              onValueChange={(value) =>
                setGoalSpeed(value as "slow" | "moderate" | "fast")
              }
              buttons={[
                { value: "slow", label: "Slow" },
                { value: "moderate", label: "Moderate" },
                { value: "fast", label: "Fast" },
              ]}
              style={styles.segmented}
            />
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button
            onPress={handleSubmit}
            mode="contained"
            disabled={isLoading}
            loading={isLoading}
          >
            Complete Setup
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
  },
  input: {
    marginBottom: 12,
  },
  segmented: {
    marginTop: 8,
  },
});
