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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MiniLineChart from "../components/MiniLineChart";
import { getDashboardData } from "../services/dashboardService";
import { APP_ROUTES } from "../constants/routes";
import theme from "../theme";

export default function DashboardScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [summary, setSummary] = useState({
    totalCarbsG: null,
    totalCalories: null,
    mealCount: 0,
    totalInsulinUnits: null,
  });
  const [glucoseTrend, setGlucoseTrend] = useState([]);
  const [recentMeals, setRecentMeals] = useState([]);
  const [dailyStats, setDailyStats] = useState(null);
  const [glucoseTarget, setGlucoseTarget] = useState({ min: 70, max: 180 });
  const [error, setError] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const {
        totalCarbsG,
        totalCalories,
        mealCount,
        totalInsulinUnits,
        profile,
        dailyStats: stats,
        glucoseTrend: trend,
        recentMeals,
      } = await getDashboardData(7);

      setSummary({ totalCarbsG, totalCalories, mealCount, totalInsulinUnits });
      setGlucoseTrend(trend);
      setRecentMeals(recentMeals);
      if (stats) setDailyStats(stats);
      if (profile?.targetGlucoseMin && profile?.targetGlucoseMax) {
        setGlucoseTarget({ min: profile.targetGlucoseMin, max: profile.targetGlucoseMax });
      }
    } catch (e) {
      setError(e.message || "Veriler yüklenemedi.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => load(true));
    return unsub;
  }, [navigation, load]);

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const chartWidth = width - theme.spacing.lg * 4;
  const avgGlucose = dailyStats?.avg ?? null;
  const glucoseStatus = getGlucoseStatus(avgGlucose, glucoseTarget);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + theme.spacing.lg }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => { setIsRefreshing(true); load(true); }}
          tintColor={theme.colors.primary}
        />
      }
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <Text style={styles.greeting}>Snackabetic</Text>
      <Text style={styles.date}>{formatDate(new Date())}</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* ── Bugünün Özeti ──────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bugünün Özeti</Text>

        {/* Satır 1: Karbonhidrat + Kalori */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryTile}>
            <Text style={styles.tileValue}>
              {summary.totalCarbsG != null ? summary.totalCarbsG : "—"}
              <Text style={styles.tileUnit}> g</Text>
            </Text>
            <Text style={styles.tileLabel}>Karbonhidrat</Text>
          </View>

          <View style={styles.tileDivider} />

          <View style={styles.summaryTile}>
            <Text style={styles.tileValue}>
              {summary.totalCalories != null ? summary.totalCalories : "—"}
              <Text style={styles.tileUnit}> kcal</Text>
            </Text>
            <Text style={styles.tileLabel}>Kalori</Text>
          </View>
        </View>

        <View style={styles.rowDivider} />

        {/* Satır 2: Kan şekeri + İnsülin */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryTile}>
            <Text style={[styles.tileValue, { color: avgGlucose != null ? glucoseStatus.color : theme.colors.textPrimary }]}>
              {avgGlucose != null ? avgGlucose : "—"}
              {avgGlucose != null && <Text style={styles.tileUnit}> mg/dL</Text>}
            </Text>
            <Text style={styles.tileLabel}>
              Kan Şekeri Ort.{avgGlucose != null ? ` · ${glucoseStatus.label}` : ""}
            </Text>
          </View>

          <View style={styles.tileDivider} />

          <View style={styles.summaryTile}>
            <Text style={styles.tileValue}>
              {summary.totalInsulinUnits > 0 ? summary.totalInsulinUnits : "—"}
              {summary.totalInsulinUnits > 0 && <Text style={styles.tileUnit}> ü</Text>}
            </Text>
            <Text style={styles.tileLabel}>İnsülin</Text>
          </View>
        </View>

        <View style={styles.rowDivider} />

        {/* Öğün sayısı */}
        <Text style={styles.mealCountText}>
          {summary.mealCount > 0
            ? `Bugün ${summary.mealCount} öğün kaydedildi`
            : "Bugün henüz öğün kaydedilmedi"}
        </Text>
      </View>

      {/* ── Hızlı İşlemler ─────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
      <View style={styles.quickRow}>
        <QuickButton
          label="Yemek Tara"
          color={theme.colors.primary}
          onPress={() => navigation.navigate(APP_ROUTES.CAMERA)}
        />
        <QuickButton
          label="Glukoz Ekle"
          color="#EF4444"
          onPress={() => navigation.navigate(APP_ROUTES.DIABETES_LOG, { type: "glucose" })}
        />
        <QuickButton
          label="İnsülin Ekle"
          color="#8B5CF6"
          onPress={() => navigation.navigate(APP_ROUTES.DIABETES_LOG, { type: "insulin" })}
        />
      </View>

      {/* ── Son Yenilenler ──────────────────────────────────────── */}
      {recentMeals.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Son Yenilenler</Text>
          {recentMeals.map((meal, index) => (
            <View key={meal.id}>
              <View style={styles.recentMealRow}>
                <View style={styles.recentMealInfo}>
                  <Text style={styles.recentMealType}>{formatMealType(meal.mealType)}</Text>
                  <Text style={styles.recentMealTime}>{formatRelativeTime(meal.mealTime)}</Text>
                </View>
                <View style={styles.recentMealValues}>
                  {meal.totalCarbsG != null && (
                    <Text style={styles.recentMealCarbs}>{parseFloat(meal.totalCarbsG).toFixed(0)} g karb</Text>
                  )}
                  {meal.totalCalories != null && (
                    <Text style={styles.recentMealCal}>{Math.round(meal.totalCalories)} kcal</Text>
                  )}
                </View>
              </View>
              {index < recentMeals.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      )}

      {/* ── 7 günlük kan şekeri trendi ─────────────────────────── */}
      <View style={{ height: theme.spacing.md }} />
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Son 7 Gün Kan Şekeri</Text>
          {avgGlucose != null && (
            <View style={[styles.badge, { backgroundColor: glucoseStatus.bg }]}>
              <Text style={styles.badgeText}>{glucoseStatus.label}</Text>
            </View>
          )}
        </View>
        {glucoseTrend.every((d) => d.avg == null) ? (
          <Text style={styles.emptyText}>Henüz kan şekeri kaydı yok.</Text>
        ) : (
          <MiniLineChart data={glucoseTrend} width={chartWidth} height={130} />
        )}
      </View>

    </ScrollView>
  );
}

function QuickButton({ label, color, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.quickBtn, { backgroundColor: color }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={styles.quickBtnLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function formatMealType(type) {
  const map = { BREAKFAST: "Kahvaltı", LUNCH: "Öğle", DINNER: "Akşam", SNACK: "Atıştırmalık" };
  return map[type] ?? type;
}

function formatRelativeTime(isoString) {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

function formatDate(date) {
  return date.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
}

function getGlucoseStatus(val, target) {
  if (val == null) return { label: "—", color: theme.colors.textSecondary, bg: theme.colors.border };
  if (val < target.min) return { label: "Düşük", color: "#EF4444", bg: "#FEE2E2" };
  if (val > target.max) return { label: "Yüksek", color: "#F97316", bg: "#FEF3C7" };
  return { label: "Normal", color: "#22C55E", bg: "#D1FAE5" };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl, paddingTop: theme.spacing.lg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background },

  greeting: { ...theme.typography.title, color: theme.colors.textPrimary },
  date: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textTransform: "capitalize",
  },
  errorText: { ...theme.typography.caption, color: theme.colors.danger, marginBottom: theme.spacing.md },

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
  cardTitle: {
    ...theme.typography.caption,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },

  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryTile: { flex: 1, alignItems: "center", paddingVertical: theme.spacing.sm },
  tileDivider: { width: 1, height: 48, backgroundColor: theme.colors.border },
  tileValue: { fontSize: 22, fontWeight: "700", color: theme.colors.textPrimary },
  tileUnit: { fontSize: 13, fontWeight: "400", color: theme.colors.textSecondary },
  tileLabel: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2, textAlign: "center" },

  rowDivider: { height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.md },

  recentMealRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: theme.spacing.sm },
  recentMealInfo: { flex: 1 },
  recentMealType: { ...theme.typography.caption, fontWeight: "700", color: theme.colors.textPrimary },
  recentMealTime: { ...theme.typography.caption, color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
  recentMealValues: { alignItems: "flex-end" },
  recentMealCarbs: { ...theme.typography.caption, fontWeight: "700", color: theme.colors.primary },
  recentMealCal: { ...theme.typography.caption, color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },

  mealCountText: { ...theme.typography.caption, color: theme.colors.textSecondary, textAlign: "center" },

  badge: { borderRadius: 20, paddingHorizontal: theme.spacing.sm, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: "700", color: theme.colors.textPrimary },

  emptyText: { ...theme.typography.body, color: theme.colors.textSecondary, textAlign: "center", paddingVertical: theme.spacing.lg },

  sectionTitle: { ...theme.typography.body, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  quickRow: { flexDirection: "row", gap: theme.spacing.sm },
  quickBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  quickBtnLabel: { fontSize: 12, lineHeight: 16, fontWeight: "700", color: "#fff", textAlign: "center" },
});
