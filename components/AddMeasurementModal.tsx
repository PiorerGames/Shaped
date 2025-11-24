import { StyleSheet, View, Pressable, ScrollView } from "react-native";
import { Button, Modal, TextInput, useTheme, Text, Portal, Dialog, SegmentedButtons } from "react-native-paper";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { DATABASE_ID, databases, MEASUREMENTS_TABLE_ID } from "@/lib/appwrite";
import { ID, Permission, Role } from "react-native-appwrite";

const TYPES = ["Weight", "Height", "Neck", "Chest", "Biceps", "Waist", "Hips", "Thigh", "Calf", "BodyFat"];

type Types = (typeof TYPES)[number];

// Define unit options for each type
const UNIT_MAP: Record<Types, { european: string; american: string }> = {
  Weight: { european: "kg", american: "lbs" },
  Height: { european: "cm", american: "ft" },
  Neck: { european: "cm", american: "in" },
  Chest: { european: "cm", american: "in" },
  Biceps: { european: "cm", american: "in" },
  Waist: { european: "cm", american: "in" },
  Hips: { european: "cm", american: "in" },
  Thigh: { european: "cm", american: "in" },
  Calf: { european: "cm", american: "in" },
  BodyFat: { european: "%", american: "%" },
};

type UnitSystem = "european" | "american";

interface AddMeasurementModalProps {
  visible: boolean;
  onDismiss: () => void;
  onMeasurementAdded?: () => void;
}

export default function AddMeasurementModal({ visible, onDismiss, onMeasurementAdded }: AddMeasurementModalProps) {
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [type, setType] = useState<Types>(TYPES[0]);
  const [valueDisplay, setValueDisplay] = useState<string>('');
  const [value, setValue] = useState<number | null>(null);
  const [feetDisplay, setFeetDisplay] = useState<string>('');
  const [inchesDisplay, setInchesDisplay] = useState<string>('');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("european");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);
  const { user } = useAuth();
  const theme = useTheme();

  const currentUnits = UNIT_MAP[type];
  const selectedUnit = unitSystem === "european" ? currentUnits.european : currentUnits.american;

  const handleSubmit = async () => {
    if (!user) return;
    try {
      setLoading(true);
      console.log("Creating measurement for user:", user.$id);
      const doc = await databases.createDocument(
        DATABASE_ID,
        MEASUREMENTS_TABLE_ID,
        ID.unique(),
        {
          user_id: user.$id,
          type,
          value,
          unit: selectedUnit,
        },
        [
          Permission.write(Role.user(user.$id)),
          Permission.read(Role.user(user.$id)),
        ]
      );

      console.log("Created document:", doc);
      // Reset form
      setTitle('');
      setValueDisplay('');
      setValue(null);
      setFeetDisplay('');
      setInchesDisplay('');
      setType(TYPES[0]);
      setUnitSystem("european");
      setError(null);
      onMeasurementAdded?.();
      onDismiss();
    } catch (error) {
      console.error("createDocument error:", error);
      if (error instanceof Error) {
        setError(error.message);
        return;
      }
      try {
        setError(JSON.stringify(error));
      } catch {
        setError("An unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setTitle('');
    setValueDisplay('');
    setValue(null);
    setFeetDisplay('');
    setInchesDisplay('');
    setType(TYPES[0]);
    setUnitSystem("european");
    setError(null);
    onDismiss();
  };

  return (
    <Modal visible={visible} onDismiss={handleClose} contentContainerStyle={styles.modal}>
      <View style={styles.content}>
        <Text variant="headlineSmall" style={styles.title}>Add Measurement</Text>

        <Pressable 
          onPress={() => setTypeMenuVisible(true)}
          style={styles.typeSelector}
        >
          <Text style={styles.typeSelectorLabel}>Type: <Text style={styles.typeSelectorValue}>{type}</Text></Text>
        </Pressable>

        <Portal>
          <Dialog visible={typeMenuVisible} onDismiss={() => setTypeMenuVisible(false)}>
            <Dialog.Title>Select Type</Dialog.Title>
            <Dialog.Content>
              <ScrollView style={styles.typeList}>
                {TYPES.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => {
                      setType(t as Types);
                      setTypeMenuVisible(false);
                    }}
                    style={styles.typeItem}
                  >
                    <Text style={type === t ? styles.typeItemSelected : styles.typeItemText}>
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Dialog.Content>
          </Dialog>
        </Portal>

        {type === "Height" && unitSystem === "american" ? (
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <TextInput
              label="Feet"
              mode="outlined"
              onChangeText={(text) => {
                // allow only digits
                const cleaned = text.replace(/[^0-9]/g, '');
                setFeetDisplay(cleaned);
                const feetNum = cleaned ? parseInt(cleaned, 10) : 0;
                const inchesNum = inchesDisplay ? parseInt(inchesDisplay || '0', 10) : 0;
                const totalFeet = feetNum + (inchesNum / 12);
                setValue(totalFeet > 0 ? parseFloat(totalFeet.toFixed(3)) : null);
              }}
              value={feetDisplay}
              keyboardType="numeric"
              placeholder="5"
              style={[styles.input, { flex: 1 }]}
              editable={!loading}
            />
            <TextInput
              label="Inches"
              mode="outlined"
              onChangeText={(text) => {
                // allow only digits and cap at 11
                const cleaned = text.replace(/[^0-9]/g, '');
                let num = cleaned ? parseInt(cleaned, 10) : 0;
                if (num > 11) num = 11;
                const display = num === 0 ? (cleaned === '' ? '' : '0') : String(num);
                setInchesDisplay(display);
                const feetNum = feetDisplay ? parseInt(feetDisplay || '0', 10) : 0;
                const inchesNum = num;
                const totalFeet = feetNum + (inchesNum / 12);
                setValue(totalFeet > 0 ? parseFloat(totalFeet.toFixed(3)) : null);
              }}
              value={inchesDisplay}
              keyboardType="numeric"
              placeholder="7"
              style={[styles.input, { width: 100 }]}
              editable={!loading}
            />
          </View>
        ) : (
          <TextInput
            label="Value"
            mode="outlined"
            onChangeText={(text) => {
              // Convert comma to dot for decimal separator
              let normalized = text.replace(',', '.');
              // Remove any non-numeric characters except decimal point
              const cleaned = normalized.replace(/[^0-9.]/g, '');

              // Check if there's a decimal point
              const decimalIndex = cleaned.indexOf('.');
              let filtered = cleaned;

              if (decimalIndex !== -1) {
                // Split at first decimal point only
                const intPart = cleaned.substring(0, decimalIndex);
                const decPart = cleaned.substring(decimalIndex + 1);
                // Limit decimal part to 2 digits max
                const limitedDecPart = decPart.slice(0, 2);
                filtered = intPart + '.' + limitedDecPart;
              }

              setValueDisplay(filtered);
              setValue(filtered && !filtered.endsWith('.') ? parseFloat(filtered) : null);
            }}
            value={valueDisplay}
            keyboardType="numbers-and-punctuation"
            placeholder="Enter measurement value (e.g., 150.5)"
            style={styles.input}
            editable={!loading}
          />
        )}

        {type !== "BodyFat" ? (
          <View style={styles.unitContainer}>
            <Text style={styles.unitLabel}>Unit System</Text>
            <SegmentedButtons
              value={unitSystem}
              onValueChange={(value) => setUnitSystem(value as UnitSystem)}
              buttons={[
                {
                  value: "european",
                  label: `European (${currentUnits.european})`,
                },
                {
                  value: "american",
                  label: `American (${currentUnits.american})`,
                },
              ]}
              style={styles.segmentedButtons}
            />
          </View>
        ) : (
          <View style={styles.unitContainer}>
            <Text style={styles.unitLabel}>Unit</Text>
            <Text variant="headlineSmall" style={{ marginTop: 8, fontWeight: "600", fontSize: 24 }}>%</Text>
          </View>
        )}

        {error && <Text style={{ color: theme.colors.error, marginBottom: 16 }}>{error}</Text>}

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={value === null || loading}
            style={styles.button}
            loading={loading}
          >
            Add Measurement
          </Button>
          <Button
            mode="outlined"
            onPress={handleClose}
            disabled={loading}
            style={styles.button}
          >
            Cancel
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: "#1e1e1e",
    margin: 16,
    marginTop: 80,
    borderRadius: 8,
    padding: 16,
  },
  content: {
    gap: 16,
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
  },
  input: {
    marginBottom: 0,
  },
  unitContainer: {
    gap: 8,
  },
  unitLabel: {
    fontSize: 12,
    color: "#888888",
    fontWeight: "500",
  },
  segmentedButtons: {
    marginTop: 4,
    width: "100%",
  },
  typeSelector: {
    borderWidth: 1,
    borderColor: "#424242",
    borderRadius: 4,
    padding: 12,
    backgroundColor: "#2c2c2c",
  },
  typeSelectorLabel: {
    fontSize: 14,
    color: "#888888",
  },
  typeSelectorValue: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  typeList: {
    maxHeight: 300,
  },
  typeItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
  },
  typeItemText: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  typeItemSelected: {
    fontSize: 14,
    color: "#2196F3",
    fontWeight: "600",
  },
  buttonContainer: {
    gap: 8,
    marginTop: 8,
  },
  button: {},
});
