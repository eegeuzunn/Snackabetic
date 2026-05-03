import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { getMealById } from "../services/mealService";
import { getFoodById } from "../services/foodService";
import theme from "../theme";

export default function MealDetailScreen({ route }) {
  const insets = useSafeAreaInsets();
  const mealId = route.params?.mealId;
  const [meal, setMeal] = useState(null);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!mealId) {
      setError("Öğün bulunamadı.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMealById(mealId);
      setMeal(data);

      const resolvedItems = await Promise.all(
        (data?.items ?? []).map(async (item) => {
          if (!item?.foodId) return { ...item, foodName: null };
          try {
            const food = await getFoodById(item.foodId);
            return { ...item, foodName: food?.name ?? null };
          } catch {
            return { ...item, foodName: null };
          }
        }),
      );
      setItems(resolvedItems);
    } catch (e) {
      setError(e.message || "Öğün bilgisi alınamadı.");
    } finally {
      setIsLoading(false);
    }
  }, [mealId]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Yeniden Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalCarbs =
    meal?.totalCarbsG != null ? parseFloat(meal.totalCarbsG).toFixed(1) : "—";
  const totalCalories =
    meal?.totalCalories != null ? Math.round(meal.totalCalories) : "—";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scroll,
        {
          paddingTop: insets.top + theme.spacing.lg,
          paddingBottom: insets.bottom + theme.spacing.xxl,
        },
      ]}
    >
      <Text style={styles.title}>{formatMealType(meal?.mealType)}</Text>
      <Text style={styles.subtitle}>{formatTime(meal?.mealTime)}</Text>

      {meal?.photoUrl ? (
        <Image source={{ uri: meal.photoUrl }} style={styles.photo} />
      ) : null}

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {totalCarbs}
            <Text style={styles.summaryUnit}> g</Text>
          </Text>
          <Text style={styles.summaryLabel}>Karbonhidrat</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {totalCalories}
            <Text style={styles.summaryUnit}> kcal</Text>
          </Text>
          <Text style={styles.summaryLabel}>Kalori</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{meal?.items?.length ?? 0}</Text>
          <Text style={styles.summaryLabel}>Öğe</Text>
        </View>
      </View>

      {meal?.notes ? (
        <View style={styles.notesCard}>
          <Text style={styles.notesTitle}>Not</Text>
          <Text style={styles.notesText}>{meal.notes}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Öğün İçeriği</Text>
      {items.length === 0 ? (
        <Text style={styles.emptyText}>Öğün içeriği bulunamadı.</Text>
      ) : (
        <View style={styles.itemsCard}>
          {items.map((item, index) => (
            <View key={`${item.id ?? item.foodId ?? index}`}>
              <View style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>
                    {item.foodName ||
                      (item.foodId ? `Yemek #${item.foodId}` : "Yemek")}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {item.amountGrams != null
                      ? `${parseFloat(item.amountGrams).toFixed(0)} g`
                      : "—"}
                  </Text>
                </View>
                <View style={styles.itemValues}>
                  {item.carbsG != null && (
                    <Text style={styles.itemCarbs}>
                      {parseFloat(item.carbsG).toFixed(1)} g karb
                    </Text>
                  )}
                  {item.calories != null && (
                    <Text style={styles.itemCalories}>
                      {Math.round(item.calories)} kcal
                    </Text>
                  )}
                </View>
              </View>
              {index < items.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      )}

      <View style={styles.infoRow}>
        <Feather name="info" size={14} color={theme.colors.textSecondary} />
        <Text style={styles.infoText}>
          Değerler sisteme kaydedilen öğün verilerinden gelir.
        </Text>
      </View>
    </ScrollView>
  );
}

function formatMealType(type) {
  const map = {
    BREAKFAST: "Kahvaltı",
    LUNCH: "Öğle",
    DINNER: "Akşam",
    SNACK: "Atıştırmalık",
  };
  return map[type] ?? "Öğün";
}

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.danger,
    textAlign: "center",
    marginBottom: theme.spacing.md,
  },
  retryBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontFamily: "Outfit_700Bold" },

  title: { ...theme.typography.heading, color: theme.colors.textPrimary },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 4,
    marginBottom: theme.spacing.md,
  },

  photo: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    marginBottom: theme.spacing.md,
  },

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryDivider: {
    width: 1,
    height: 44,
    backgroundColor: theme.colors.border,
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: "Outfit_700Bold",
    color: theme.colors.textPrimary,
  },
  summaryUnit: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    color: theme.colors.textSecondary,
  },
  summaryLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  notesCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  notesTitle: {
    ...theme.typography.body,
    fontFamily: "Outfit_700Bold",
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  notesText: { ...theme.typography.caption, color: theme.colors.textSecondary },

  sectionTitle: {
    ...theme.typography.body,
    fontFamily: "Outfit_700Bold",
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  itemsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
  itemInfo: { flex: 1 },
  itemName: {
    ...theme.typography.body,
    fontFamily: "Outfit_700Bold",
    color: theme.colors.textPrimary,
  },
  itemMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  itemValues: { alignItems: "flex-end" },
  itemCarbs: {
    ...theme.typography.caption,
    fontFamily: "Outfit_700Bold",
    color: theme.colors.primary,
  },
  itemCalories: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  divider: { height: 1, backgroundColor: theme.colors.border },

  emptyText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  infoText: { ...theme.typography.caption, color: theme.colors.textSecondary },
});
