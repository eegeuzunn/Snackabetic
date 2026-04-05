import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import ProfileSetupScreen from "../screens/ProfileSetupScreen";
import DashboardScreen from "../screens/DashboardScreen";
import AddMealScreen from "../screens/AddMealScreen";
import CameraScreen from "../screens/CameraScreen";
import HistoryScreen from "../screens/HistoryScreen";
import SettingsScreen from "../screens/SettingsScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import PredictionResultScreen from "../screens/PredictionResultScreen";
import DiabetesLogScreen from "../screens/DiabetesLogScreen";
import theme from "../theme";
import { APP_ROUTES, AUTH_ROUTES, STACK_ROUTES } from "../constants/routes";


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
  [APP_ROUTES.ADD_MEAL]:  "plus-circle",
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
          fontFamily: "Outfit_600SemiBold",
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
        name={APP_ROUTES.ADD_MEAL}
        component={AddMealScreen}
        options={{ title: "Öğün" }}
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

export default function AppNavigator({ isAuthenticated, needsOnboarding, onLogin, onSignup, onSignOut, onOnboardingComplete }) {
  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            {needsOnboarding && (
              <Stack.Screen name="ProfileSetup">
                {() => <ProfileSetupScreen onComplete={onOnboardingComplete} />}
              </Stack.Screen>
            )}
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
            <Stack.Screen
              name={STACK_ROUTES.EDIT_PROFILE}
              component={EditProfileScreen}
              options={{ headerShown: true, title: "Profili Düzenle" }}
            />
            <Stack.Screen
              name={STACK_ROUTES.CAMERA}
              component={CameraScreen}
              options={{ headerShown: false }}
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
