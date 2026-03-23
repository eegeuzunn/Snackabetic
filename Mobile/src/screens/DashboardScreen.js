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
import { getDashboardData } from "../services/dashboardService";
import { APP_ROUTES } from "../constants/routes";
import theme from "../theme";

// Default daily carb target when profile has no value set
const DEFAULT_CARB_TARGET = 200;

export default function DashboardScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [totalCarbsG, setTotalCarbsG] = useState(null);
  const [carbTarget, setCarbTarget] = useState(DEFAULT_CARB_TARGET);
  const [glucoseTrend, setGlucoseTrend] = useState([]);
  const [dailyStats, setDailyStats] = useState(null);   // { avg, min, max }
  const [glucoseTarget, setGlucoseTarget] = useState({ min: 70, max: 180 });
  const [error, setError] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const { totalCarbsG: carbs, profile, dailyStats: stats, glucoseTrend: trend } =
        await getDashboardData(7);

      setTotalCarbsG(carbs);
      setGlucoseTrend(trend);

      if (stats) setDailyStats(stats);

      // Use patient profile targets when available
      if (profile) {
        if (profile.targetGlucoseMin && profile.targetGlucoseMax) {
          setGlucoseTarget({
            min: profile.targetGlucoseMin,
            max: profile.targetGlucoseMax,
          });
        }
        // carbRatio (g carbs per unit insulin) can be repurposed as a hint
        // but we use a fixed daily carb target for now
      }
    } catch (e) {
      setError(e.message || "Veriler yüklenemedi.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Refresh on tab focus (post-save updates)
  useEffect(() => {
    const unsub = navigation.addListener("focus", () => load(true));
    return unsub;
  }, [navigation, load]);

  function onRefresh() {
    setIsRefreshing(true);
    load(true);
  }

  // ── Loading ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const chartWidth = width - theme.spacing.lg * 4;
  const carbPct = Math.min(((totalCarbsG ?? 0) / carbTarget) * 100, 100);
  const avgGlucose = dailyStats?.avg ?? null;
  const glucoseStatus = getGlucoseStatus(avgGlucose, glucoseTarget);

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
      {/* ── Header ────────────────────────────────────────────── */}
      <Text style={styles.greeting}>Snackabetic</Text>
      <Text style={styles.date}>{formatDate(new Date())}</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* ── Today's carbs card ──────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Bugünkü Karbonhidrat</Text>
        <View style={styles.carbRow}>
          <Text style={styles.carbValue}>
            {totalCarbsG != null ? totalCarbsG : "—"}
          </Text>
          <Text style={styles.carbUnit}>g</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${carbPct}%` }]} />
        </View>
        <Text style={styles.progressHint}>Günlük hedef: {carbTarget} g</Text>
      </View>

      {/* ── Today's glucose summary ─────────────────────────── */}
      {dailyStats && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Bugünkü Kan Şekeri</Text>
          <View style={styles.statsRow}>
            <StatPill label="Ort." value={dailyStats.avg} color={glucoseStatus.color} />
            <StatPill label="Min" value={dailyStats.min} color="#22C55E" />
            <StatPill label="Maks" value={dailyStats.max} color="#EF4444" />
          </View>
          <Text style={styles.progressHint}>
            Hedef: {glucoseTarget.min}–{glucoseTarget.max} mg/dL
          </Text>
        </View>
      )}

      {/* ── 7-day glucose trend ─────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardLabel}>Son 7 Gün Kan Şekeri Trendi</Text>
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

      {/* ── Quick actions ────────────────────────────────────── */}
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

function StatPill({ label, value, color }) {
  return (
    <View style={styles.statPill}>
      <Text style={[styles.statValue, { color }]}>{value ?? "—"}</Text>
      <Text style={styles.statUnit}>mg/dL</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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

function getGlucoseStatus(val, target) {
  if (val == null) return { label: "—", color: theme.colors.textSecondary, bg: theme.colors.border };
  if (val < target.min) return { label: "Düşük", color: "#EF4444", bg: "#FEE2E2" };
  if (val > target.max) return { label: "Yüksek", color: "#F97316", bg: "#FEF3C7" };
  return { label: "Normal", color: "#22C55E", bg: "#D1FAE5" };
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

  greeting: { ...theme.typography.title, color: theme.colors.textPrimary },
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
  carbRow: { flexDirection: "row", alignItems: "flex-end", gap: 4, marginBottom: theme.spacing.md },
  carbValue: { fontSize: 48, fontWeight: "700", lineHeight: 56, color: theme.colors.primary },
  carbUnit: { ...theme.typography.heading, color: theme.colors.textSecondary, marginBottom: 8 },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: theme.colors.primary, borderRadius: 4 },
  progressHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },

  // Daily stats
  statsRow: { flexDirection: "row", gap: theme.spacing.md, marginBottom: theme.spacing.xs },
  statPill: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: theme.spacing.md,
    alignItems: "center",
  },
  statValue: { fontSize: 22, fontWeight: "700" },
  statUnit: { ...theme.typography.caption, color: theme.colors.textSecondary, fontSize: 10 },
  statLabel: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },

  // Badge
  badge: { borderRadius: 20, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs },
  badgeText: { ...theme.typography.caption, color: theme.colors.textPrimary, fontWeight: "700" },

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
  quickRow: { flexDirection: "row", gap: theme.spacing.md },
  quickBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: theme.spacing.xl,
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  quickBtnEmoji: { fontSize: 32 },
  quickBtnLabel: { ...theme.typography.caption, color: "#fff", fontWeight: "700" },
});
