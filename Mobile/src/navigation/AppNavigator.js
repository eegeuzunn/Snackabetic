import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import DashboardScreen from "../screens/DashboardScreen";
import CameraScreen from "../screens/CameraScreen";
import HistoryScreen from "../screens/HistoryScreen";
import SettingsScreen from "../screens/SettingsScreen";
import PredictionResultScreen from "../screens/PredictionResultScreen";
import DiabetesLogScreen from "../screens/DiabetesLogScreen";
import theme from "../theme";
import { APP_ROUTES, AUTH_ROUTES } from "../constants/routes";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.textPrimary,
    border: theme.colors.border,
    primary: theme.colors.primary,
  },
};

const TAB_ICONS = {
  [APP_ROUTES.DASHBOARD]: "home",
  [APP_ROUTES.CAMERA]:    "camera",
  [APP_ROUTES.HISTORY]:   "clock",
  [APP_ROUTES.SETTINGS]:  "user",
};

function AppTabs({ onSignOut }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarIcon: ({ color, focused }) => (
          <Feather
            name={TAB_ICONS[route.name]}
            size={22}
            color={color}
            style={{ opacity: focused ? 1 : 0.7 }}
          />
        ),
      })}
    >
      <Tab.Screen
        name={APP_ROUTES.DASHBOARD}
        component={DashboardScreen}
        options={{ title: "Home" }}
      />
      <Tab.Screen
        name={APP_ROUTES.CAMERA}
        component={CameraScreen}
        options={{ title: "Kamera" }}
      />
      <Tab.Screen
        name={APP_ROUTES.HISTORY}
        component={HistoryScreen}
        options={{ title: "Geçmiş" }}
      />
      <Tab.Screen
        name={APP_ROUTES.SETTINGS}
        options={{ title: "Profil" }}
      >
        {() => <SettingsScreen onSignOut={onSignOut} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function AppNavigator({ isAuthenticated, onLogin, onSignup, onSignOut }) {
  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="AppTabs">
              {() => <AppTabs onSignOut={onSignOut} />}
            </Stack.Screen>
            <Stack.Screen
              name={APP_ROUTES.PREDICTION_RESULT}
              component={PredictionResultScreen}
              options={{ headerShown: true, title: "Tahmin Sonucu" }}
            />
            <Stack.Screen
              name={APP_ROUTES.DIABETES_LOG}
              component={DiabetesLogScreen}
              options={({ route }) => ({
                headerShown: true,
                title:
                  route.params?.type === "glucose" ? "Glukoz Ölçümü" :
                  route.params?.type === "insulin" ? "İnsülin Dozu" :
                  "Günlük Ekle",
              })}
            />
          </>
        ) : (
          <>
            <Stack.Screen name={AUTH_ROUTES.LOGIN}>
              {({ navigation }) => (
                <LoginScreen
                  onLogin={onLogin}
                  onNavigateSignup={() => navigation.navigate(AUTH_ROUTES.SIGNUP)}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name={AUTH_ROUTES.SIGNUP}>
              {({ navigation }) => (
                <SignupScreen
                  onSignup={onSignup}
                  onNavigateLogin={() => navigation.goBack()}
                />
              )}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
