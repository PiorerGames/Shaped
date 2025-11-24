import { StyleSheet, View, Text, Pressable } from "react-native";
import { useEffect, useState } from "react";
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from "react-native-vision-camera";
import { Button } from "react-native-paper";

interface BarcodeScannerProps {
  onBarCodeScanned: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({
  onBarCodeScanned,
  onClose,
}: BarcodeScannerProps) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const device = useCameraDevice("back");

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === "granted");
    })();
  }, []);

  const codeScanner = useCodeScanner({
    codeTypes: [
      "ean-13",
      "ean-8",
      "upc-a",
      "upc-e",
      "code-128",
      "code-39",
      "qr",
    ],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && codes[0].value) {
        setIsActive(false);
        onBarCodeScanned(codes[0].value);
      }
    },
  });

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission not granted</Text>
        <Button mode="contained" onPress={onClose} style={styles.button}>
          Close
        </Button>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No camera device found</Text>
        <Button mode="contained" onPress={onClose} style={styles.button}>
          Close
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        codeScanner={codeScanner}
      />
      <View style={styles.overlay}>
        <View style={styles.topOverlay} />
        <View style={styles.middleRow}>
          <View style={styles.sideOverlay} />
          <View style={styles.scanArea} />
          <View style={styles.sideOverlay} />
        </View>
        <View style={styles.bottomOverlay}>
          <Text style={styles.instructionText}>Point camera at barcode</Text>
          <Button mode="contained" onPress={onClose} style={styles.closeButton}>
            Cancel
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  text: {
    color: "white",
    fontSize: 18,
    textAlign: "center",
    padding: 20,
  },
  button: {
    margin: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  topOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  middleRow: {
    flexDirection: "row",
    height: 250,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  scanArea: {
    width: 300,
    borderWidth: 2,
    borderColor: "white",
    backgroundColor: "transparent",
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 40,
  },
  instructionText: {
    color: "white",
    fontSize: 16,
    marginBottom: 20,
  },
  closeButton: {
    minWidth: 120,
  },
});
