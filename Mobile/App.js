import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import useAuth from "./src/hooks/useAuth";
import theme from "./src/theme";
import NetworkDebugOverlay from "./src/components/NetworkDebugOverlay";

export default function App() {
  const { isAuthenticated, isLoading, signIn, signUp } = useAuth();

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <AppNavigator
          isAuthenticated={isAuthenticated}
          onLogin={signIn}
          onSignup={signUp}
        />
        <NetworkDebugOverlay />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
});
