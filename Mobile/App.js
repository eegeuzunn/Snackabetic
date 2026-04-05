import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import AppNavigator from "./src/navigation/AppNavigator";
import useAuth from "./src/hooks/useAuth";
import theme from "./src/theme";
import NetworkDebugOverlay from "./src/components/NetworkDebugOverlay";

export default function App() {
  const { isAuthenticated, isLoading, needsOnboarding, signIn, signUp, signOut, completeOnboarding } = useAuth();
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  if (isLoading || !fontsLoaded) {
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
          needsOnboarding={needsOnboarding}
          onLogin={signIn}
          onSignup={signUp}
          onSignOut={signOut}
          onOnboardingComplete={completeOnboarding}
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
