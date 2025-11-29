import React from "react";
import { StyleSheet, View, Modal, Pressable } from "react-native";
import { Text, Button, useTheme } from "react-native-paper";

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onDismiss?: () => void;
}

export const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  buttons = [{ text: "OK", style: "default" }],
  onDismiss,
}) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    if (onDismiss) {
      onDismiss();
    }
  };

  const getButtonMode = (style?: string) => {
    if (style === "cancel") return "outlined";
    if (style === "destructive") return "contained";
    return "contained";
  };

  const getButtonColor = (style?: string) => {
    if (style === "destructive") return "#ef5350";
    return undefined;
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable
          style={styles.alertContainer}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.alertContent}>
            <Text variant="titleLarge" style={styles.title}>
              {title}
            </Text>
            {message && (
              <Text variant="bodyMedium" style={styles.message}>
                {message}
              </Text>
            )}
            <View style={styles.buttonContainer}>
              {buttons.map((button, index) => (
                <Button
                  key={index}
                  mode={getButtonMode(button.style)}
                  onPress={() => handleButtonPress(button)}
                  style={[
                    styles.button,
                    buttons.length === 1 && styles.singleButton,
                  ]}
                  buttonColor={getButtonColor(button.style)}
                  textColor={
                    button.style === "destructive"
                      ? "#ffffff"
                      : button.style === "cancel"
                      ? theme.colors.onSurface
                      : undefined
                  }
                >
                  {button.text}
                </Button>
              ))}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// Hook for easier usage
export const useCustomAlert = () => {
  const [alertConfig, setAlertConfig] = React.useState<{
    visible: boolean;
    title: string;
    message?: string;
    buttons?: AlertButton[];
  }>({
    visible: false,
    title: "",
    message: "",
    buttons: [],
  });

  const showAlert = (
    title: string,
    message?: string,
    buttons?: AlertButton[]
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons: buttons || [{ text: "OK", style: "default" }],
    });
  };

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  const AlertComponent = () => (
    <CustomAlert
      visible={alertConfig.visible}
      title={alertConfig.title}
      message={alertConfig.message}
      buttons={alertConfig.buttons}
      onDismiss={hideAlert}
    />
  );

  return { showAlert, AlertComponent };
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    alertContainer: {
      width: "80%",
      maxWidth: 400,
      backgroundColor: theme.colors.elevation.level3,
      borderRadius: 12,
      padding: 24,
      elevation: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    alertContent: {
      gap: 16,
    },
    title: {
      fontWeight: "bold",
      color: theme.colors.onSurface,
      textAlign: "center",
    },
    message: {
      color: theme.colors.onSurfaceVariant,
      textAlign: "center",
      lineHeight: 20,
    },
    buttonContainer: {
      flexDirection: "row",
      gap: 12,
      marginTop: 8,
    },
    button: {
      flex: 1,
    },
    singleButton: {
      flex: 1,
    },
  });
