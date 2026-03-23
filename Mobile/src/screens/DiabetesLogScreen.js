import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { createGlucoseReading } from "../services/glucoseService";
import { createInsulinDose } from "../services/insulinService";
import { APP_ROUTES } from "../constants/routes";
import theme from "../theme";

// ─── Constants ───────────────────────────────────────────────────────────────
const INSULIN_TYPES = ["RAPID", "LONG", "MIXED"];

export default function DiabetesLogScreen({ navigation }) {
  // ── Form state ────────────────────────────────────────────────────
  const [glucose, setGlucose] = useState("");
  const [insulin, setInsulin] = useState("");
  const [insulinType, setInsulinType] = useState("RAPID");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // ── Validation ────────────────────────────────────────────────────
  function validate() {
    const glucoseVal = parseFloat(glucose);
    const insulinVal = parseFloat(insulin);

    if (glucose && (isNaN(glucoseVal) || glucoseVal <= 0)) {
      Alert.alert("Geçersiz Değer", "Kan şekeri pozitif bir sayı olmalıdır.");
      return false;
    }
    if (insulin && (isNaN(insulinVal) || insulinVal <= 0)) {
      Alert.alert("Geçersiz Değer", "İnsülin dozu pozitif bir sayı olmalıdır.");
      return false;
    }
    if (!glucose && !insulin && !notes.trim()) {
      Alert.alert("Boş Form", "En az bir alan doldurmalısın.");
      return false;
    }
    return true;
  }

  // ── Save ─────────────────────────────────────────────────────────
  async function handleSave() {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const promises = [];

      if (glucose) {
        promises.push(
          createGlucoseReading({
            valueMgDl: parseFloat(glucose),
            notes: notes.trim(),
          }),
        );
      }

      if (insulin) {
        promises.push(
          createInsulinDose({
            units: parseFloat(insulin),
            insulinType,
            notes: notes.trim(),
          }),
        );
      }

      await Promise.all(promises);

      Alert.alert("Kaydedildi ✓", "Günlük kaydınız başarıyla eklendi.", [
        {
          text: "Tamam",
          onPress: () => navigation.navigate(APP_ROUTES.DASHBOARD),
        },
      ]);
    } catch (error) {
      Alert.alert("Kayıt Hatası", error.message || "Lütfen tekrar deneyin.");
    } finally {
      setIsSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>Günlük Ekle</Text>

        {/* ── Glucose ─────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🩸 Kan Şekeri</Text>

          <Text style={styles.label}>Değer (mg/dL)</Text>
          <TextInput
            style={styles.input}
            value={glucose}
            onChangeText={setGlucose}
            keyboardType="decimal-pad"
            placeholder="Örn: 120"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        {/* ── Insulin ─────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💉 İnsülin</Text>

          <Text style={styles.label}>Doz (ünite)</Text>
          <TextInput
            style={styles.input}
            value={insulin}
            onChangeText={setInsulin}
            keyboardType="decimal-pad"
            placeholder="Örn: 4"
            placeholderTextColor={theme.colors.textSecondary}
          />

          <Text style={[styles.label, { marginTop: theme.spacing.md }]}>
            İnsülin Tipi
          </Text>
          <View style={styles.typeRow}>
            {INSULIN_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeChip,
                  insulinType === type && styles.typeChipActive,
                ]}
                onPress={() => setInsulinType(type)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    insulinType === type && styles.typeChipTextActive,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Notes ───────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📝 İlaç / Not</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Aldığın ilaç, belirti veya not…"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* ── Save button ──────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.btnPrimary, isSaving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={theme.colors.surface} />
          ) : (
            <Text style={styles.btnText}>Kaydet</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  scroll: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },

  pageTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },

  // Card
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    ...theme.typography.body,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },

  // Fields
  label: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.background,
  },
  textArea: {
    height: 90,
    paddingTop: theme.spacing.sm,
  },

  // Insulin type chips
  typeRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  typeChip: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  typeChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  typeChipText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  typeChipTextActive: {
    color: theme.colors.surface,
  },

  // Button
  btnPrimary: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    minHeight: 56,
    justifyContent: "center",
    alignItems: "center",
    marginTop: theme.spacing.md,
  },
  btnText: {
    color: theme.colors.surface,
    ...theme.typography.button,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
