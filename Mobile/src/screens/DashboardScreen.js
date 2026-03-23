import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import MiniLineChart from "../components/MiniLineChart";
import { getTodayMeals, getGlucoseTrend } from "../services/dashboardService";
import { APP_ROUTES } from "../constants/routes";
import theme from "../theme";

export default function DashboardScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalCarbsG, setTotalCarbsG] = useState(null);
  const [glucoseTrend, setGlucoseTrend] = useState([]);
  const [lastGlucose, setLastGlucose] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const [meals, trend] = await Promise.all([
        getTodayMeals(),
        getGlucoseTrend(7),
      ]);

      // Sum totalCarbsG from all meals today
      const carbs = (meals ?? []).reduce(
        (sum, m) => sum + (parseFloat(m.totalCarbsG) || 0),
        0,
      );
      setTotalCarbsG(Math.round(carbs * 10) / 10);

      setGlucoseTrend(trend);

      // Last available glucose reading
      const todayValues = trend[trend.length - 1];
      setLastGlucose(todayValues?.avg ?? null);
    } catch (e) {
      setError(e.message || "Veriler yüklenemedi.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh on focus (so data updates after saving a meal/glucose)
  useEffect(() => {
    const unsub = navigation.addListener("focus", () => load(true));
    return unsub;
  }, [navigation, load]);

  function onRefresh() {
    setIsRefreshing(true);
    load(true);
  }

  // ── Loading state ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const chartWidth = width - theme.spacing.lg * 2;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
        />
      }
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <Text style={styles.greeting}>Snackabetic</Text>
      <Text style={styles.date}>{formatDate(new Date())}</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* ── Carb summary card ───────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Bugünkü Karbonhidrat</Text>
        <View style={styles.carbRow}>
          <Text style={styles.carbValue}>
            {totalCarbsG != null ? totalCarbsG : "—"}
          </Text>
          <Text style={styles.carbUnit}>g</Text>
        </View>
        <View style={[styles.progressBar]}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(((totalCarbsG ?? 0) / 200) * 100, 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.progressHint}>Günlük hedef: 200 g</Text>
      </View>

      {/* ── Glucose card ────────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardLabel}>Son 7 Gün Kan Şekeri</Text>
          {lastGlucose != null && (
            <View style={glucoseBadgeStyle(lastGlucose)}>
              <Text style={styles.glucoseBadgeText}>{lastGlucose} mg/dL</Text>
            </View>
          )}
        </View>

        {glucoseTrend.every((d) => d.avg == null) ? (
          <Text style={styles.emptyText}>
            Henüz kan şekeri kaydı yok.
          </Text>
        ) : (
          <MiniLineChart
            data={glucoseTrend}
            width={chartWidth - theme.spacing.lg * 2}
            height={130}
          />
        )}
      </View>

      {/* ── Quick actions ────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
      <View style={styles.quickRow}>
        <QuickButton
          emoji="📷"
          label="Yemek Tara"
          color={theme.colors.primary}
          onPress={() => navigation.navigate(APP_ROUTES.CAMERA)}
        />
        <QuickButton
          emoji="📋"
          label="Günlüğe Ekle"
          color="#0D9488"
          onPress={() => navigation.navigate(APP_ROUTES.DIABETES_LOG)}
        />
      </View>
    </ScrollView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function QuickButton({ emoji, label, color, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.quickBtn, { backgroundColor: color }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={styles.quickBtnEmoji}>{emoji}</Text>
      <Text style={styles.quickBtnLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(date) {
  return date.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function glucoseBadgeStyle(value) {
  let bg = "#22C55E22"; // normal green tint
  if (value < 70) bg = "#EF444422"; // low — red tint
  else if (value > 180) bg = "#F9731622"; // high — orange tint
  return [styles.glucoseBadge, { backgroundColor: bg }];
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },

  // Header
  greeting: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
  },
  date: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textTransform: "capitalize",
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    marginBottom: theme.spacing.md,
  },

  // Cards
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  cardLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },

  // Carbs
  carbRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    marginBottom: theme.spacing.md,
  },
  carbValue: {
    fontSize: 48,
    fontWeight: "700",
    lineHeight: 56,
    color: theme.colors.primary,
  },
  carbUnit: {
    ...theme.typography.heading,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  progressHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },

  // Glucose badge
  glucoseBadge: {
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  glucoseBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    fontWeight: "700",
  },

  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: "center",
    paddingVertical: theme.spacing.lg,
  },

  // Quick actions
  sectionTitle: {
    ...theme.typography.body,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  quickRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  quickBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: theme.spacing.xl,
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  quickBtnEmoji: { fontSize: 32 },
  quickBtnLabel: {
    ...theme.typography.caption,
    color: "#fff",
    fontWeight: "700",
  },
});
