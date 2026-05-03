import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import theme from "../theme";

export default function HistoryDetailScreen({ route }) {
  const insets = useSafeAreaInsets();
  const record = route.params?.record;

  if (!record) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Kayıt bulunamadı.</Text>
      </View>
    );
  }

  const title = getTitle(record);

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
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{formatTime(record.timestamp)}</Text>

      <View style={styles.card}>
        {record.type === "GLUCOSE" && (
          <DetailRow
            label="Kan Şekeri"
            value={`${record.valueMgDl ?? "—"} mg/dL`}
          />
        )}
        {record.type === "INSULIN" && (
          <>
            <DetailRow label="İnsülin Türü" value={record.insulinType ?? "—"} />
            <DetailRow label="Doz" value={`${record.units ?? "—"} ünite`} />
          </>
        )}
        {record.type === "MEAL" && (
          <>
            <DetailRow
              label="Öğün Tipi"
              value={formatMealType(record.foodName)}
            />
            <DetailRow
              label="Karbonhidrat"
              value={
                record.totalCarbsG != null
                  ? `${parseFloat(record.totalCarbsG).toFixed(1)} g`
                  : "—"
              }
            />
            <DetailRow
              label="Kalori"
              value={
                record.totalCalories != null
                  ? `${Math.round(record.totalCalories)} kcal`
                  : "—"
              }
            />
          </>
        )}
      </View>

      {record.notes ? (
        <View style={styles.notesCard}>
          <Text style={styles.notesTitle}>Not</Text>
          <Text style={styles.notesText}>{record.notes}</Text>
        </View>
      ) : null}

      <View style={styles.infoRow}>
        <Feather name="info" size={14} color={theme.colors.textSecondary} />
        <Text style={styles.infoText}>
          Detaylar geçmiş listesinden gelen kayıttır.
        </Text>
      </View>
    </ScrollView>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function getTitle(record) {
  if (record.type === "GLUCOSE") return "Kan Şekeri";
  if (record.type === "INSULIN") return "İnsülin";
  return "Öğün";
}

function formatMealType(type) {
  const map = {
    BREAKFAST: "Kahvaltı",
    LUNCH: "Öğle",
    DINNER: "Akşam",
    SNACK: "Atıştırmalık",
  };
  return map[type] ?? (type || "Öğün");
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
  },

  title: { ...theme.typography.heading, color: theme.colors.textPrimary },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 4,
    marginBottom: theme.spacing.md,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLabel: { ...theme.typography.caption, color: theme.colors.textSecondary },
  rowValue: {
    ...theme.typography.body,
    fontFamily: "Outfit_700Bold",
    color: theme.colors.textPrimary,
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

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  infoText: { ...theme.typography.caption, color: theme.colors.textSecondary },
});
