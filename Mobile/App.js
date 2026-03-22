import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import AppNavigator from "./src/navigation/AppNavigator";
import useAuth from "./src/hooks/useAuth";
import theme from "./src/theme";

export default function App() {
  const { isAuthenticated, isLoading, signIn } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return <AppNavigator isAuthenticated={isAuthenticated} onLogin={signIn} />;
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
});
