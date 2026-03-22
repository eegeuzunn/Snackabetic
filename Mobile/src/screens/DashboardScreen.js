import React from "react";
import { StyleSheet, Text, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import theme from "../theme";

export default function DashboardScreen() {
  return (
    <ScreenContainer>
      <View style={styles.wrapper}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.description}>
          Bugünkü özet ve hızlı işlemler burada gösterilecek.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
});
