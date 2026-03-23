import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getHistory } from "../services/historyService";
import { APP_ROUTES } from "../constants/routes";
import theme from "../theme";

// ─── Item card components ─────────────────────────────────────────────────────
function MealCard({ item }) {
  const carbs = item.totalCarbsG != null ? `${parseFloat(item.totalCarbsG).toFixed(1)} g` : "—";
  const cal = item.totalCalories != null ? `${Math.round(item.totalCalories)} kcal` : null;
  return (
    <View style={[styles.card, styles.mealCard]}>
      <View style={styles.cardIcon}><Text style={styles.iconText}>🍽️</Text></View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>Öğün — {item.foodName ?? "—"}</Text>
        <Text style={styles.cardSub}>
          {carbs} karbonhidrat{cal ? ` · ${cal}` : ""}
        </Text>
        <Text style={styles.cardTime}>{formatTime(item.timestamp)}</Text>
      </View>
    </View>
  );
}

function GlucoseCard({ item }) {
  const level = getGlucoseLevel(item.valueMgDl);
  return (
    <View style={[styles.card, styles.glucoseCard]}>
      <View style={styles.cardIcon}><Text style={styles.iconText}>🩸</Text></View>
      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle}>Kan Şekeri</Text>
          <View style={[styles.levelBadge, { backgroundColor: level.bg }]}>
            <Text style={styles.levelText}>{level.label}</Text>
          </View>
        </View>
        <Text style={styles.cardSub}>{item.valueMgDl} mg/dL</Text>
        {item.notes ? <Text style={styles.cardNote}>{item.notes}</Text> : null}
        <Text style={styles.cardTime}>{formatTime(item.timestamp)}</Text>
      </View>
    </View>
  );
}

function InsulinCard({ item }) {
  return (
    <View style={[styles.card, styles.insulinCard]}>
      <View style={styles.cardIcon}><Text style={styles.iconText}>💉</Text></View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>İnsülin — {item.insulinType}</Text>
        <Text style={styles.cardSub}>{item.units} ünite</Text>
        {item.notes ? <Text style={styles.cardNote}>{item.notes}</Text> : null}
        <Text style={styles.cardTime}>{formatTime(item.timestamp)}</Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function HistoryScreen({ navigation }) {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const data = await getHistory();
      setRecords(data);
    } catch (e) {
      setError(e.message || "Kayıtlar yüklenemedi.");
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

  function onRefresh() {
    setIsRefreshing(true);
    load(true);
  }

  // ── Loading ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Yeniden Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────
  if (records.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyEmoji}>📭</Text>
        <Text style={styles.emptyTitle}>Henüz kayıt yok</Text>
        <Text style={styles.emptyDesc}>
          Yemek taradıkça veya günlük ekledikçe kayıtların burada görünür.
        </Text>
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => navigation.navigate(APP_ROUTES.CAMERA)}
        >
          <Text style={styles.ctaText}>📷  Yemek Tara</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── List ──────────────────────────────────────────────────────────
  return (
    <FlatList
      data={records}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
        />
      }
      renderItem={({ item }) => {
        if (item.type === "MEAL")    return <MealCard item={item} />;
        if (item.type === "GLUCOSE") return <GlucoseCard item={item} />;
        if (item.type === "INSULIN") return <InsulinCard item={item} />;
        return null;
      }}
      ListHeaderComponent={
        <Text style={styles.pageTitle}>Geçmiş</Text>
      }
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getGlucoseLevel(val) {
  if (val == null) return { label: "—", bg: theme.colors.border };
  if (val < 70)   return { label: "Düşük", bg: "#FEE2E2" };
  if (val > 180)  return { label: "Yüksek", bg: "#FEF3C7" };
  return { label: "Normal", bg: "#D1FAE5" };
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  list: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    backgroundColor: theme.colors.background,
  },
  pageTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },

  // Card base
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  mealCard:    { borderLeftWidth: 4, borderLeftColor: theme.colors.primary },
  glucoseCard: { borderLeftWidth: 4, borderLeftColor: "#EF4444" },
  insulinCard: { borderLeftWidth: 4, borderLeftColor: "#8B5CF6" },

  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: { fontSize: 20 },

  cardBody: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, marginBottom: 2 },
  cardTitle: {
    ...theme.typography.body,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  cardSub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  cardNote: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
    marginTop: 2,
  },
  cardTime: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    fontSize: 11,
  },

  levelBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  levelText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },

  // Empty state
  emptyEmoji: { fontSize: 48, marginBottom: theme.spacing.md },
  emptyTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  emptyDesc: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
  },
  ctaBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  ctaText: {
    color: theme.colors.surface,
    ...theme.typography.body,
    fontWeight: "700",
  },

  // Error
  errorText: {
    ...theme.typography.body,
    color: theme.colors.danger,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  retryText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "700",
  },
});
