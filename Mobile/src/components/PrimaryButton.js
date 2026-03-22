import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import theme from "../theme";

export default function PrimaryButton({ title, onPress, disabled = false }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.label}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    minHeight: 56,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  buttonPressed: {
    backgroundColor: theme.colors.primaryPressed,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  label: {
    color: theme.colors.surface,
    ...theme.typography.button,
  },
});
