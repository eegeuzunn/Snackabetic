import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { updateMyProfile } from "../services/patientService";
import theme from "../theme";

const DIABETES_TYPES = [
  { label: "Tip 1", value: "TYPE_1" },
  { label: "Tip 2", value: "TYPE_2" },
  { label: "Prediyabet", value: "PREDIABETES" },
  { label: "Diğer", value: "OTHER" },
];

const SEX_OPTIONS = [
  { label: "Erkek", value: "MALE" },
  { label: "Kadın", value: "FEMALE" },
];

export default function ProfileSetupScreen({ onComplete }) {
  const insets = useSafeAreaInsets();
  const [isSaving, setIsSaving] = useState(false);

  const [diabetesType, setDiabetesType] = useState(null);
  const [sex, setSex] = useState(null);
  const [birthYear, setBirthYear] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [glucoseMin, setGlucoseMin] = useState("70");
  const [glucoseMax, setGlucoseMax] = useState("180");

  async function handleSave() {
    const payload = {};

    if (diabetesType) payload.diabetesType = diabetesType;
    if (sex) payload.sex = sex;
    if (heightCm) payload.heightCm = parseFloat(heightCm);
    if (weightKg) payload.weightKg = parseFloat(weightKg);
    if (glucoseMin) payload.targetGlucoseMin = parseInt(glucoseMin, 10);
    if (glucoseMax) payload.targetGlucoseMax = parseInt(glucoseMax, 10);

    if (birthYear && birthYear.length === 4) {
      payload.dateOfBirth = `${birthYear}-01-01`;
    }

    setIsSaving(true);
    try {
      await updateMyProfile(payload);
    } catch (e) {
      Alert.alert("Hata", "Profil kaydedilemedi, daha sonra tekrar deneyebilirsin.");
    } finally {
      setIsSaving(false);
      onComplete();
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + theme.spacing.xl }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Sağlık Profili</Text>
      <Text style={styles.subtitle}>
        Bu bilgiler glukoz hedeflerin ve insülin hesaplamaların için kullanılır.
        Dilersen şimdi atlayıp daha sonra profilinden düzenleyebilirsin.
      </Text>

      {/* Diyabet Tipi */}
      <Text style={styles.label}>Diyabet Tipi</Text>
      <View style={styles.chipRow}>
        {DIABETES_TYPES.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, diabetesType === opt.value && styles.chipSelected]}
            onPress={() => setDiabetesType(diabetesType === opt.value ? null : opt.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, diabetesType === opt.value && styles.chipTextSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Cinsiyet */}
      <Text style={styles.label}>Cinsiyet</Text>
      <View style={styles.chipRow}>
        {SEX_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, sex === opt.value && styles.chipSelected]}
            onPress={() => setSex(sex === opt.value ? null : opt.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, sex === opt.value && styles.chipTextSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Doğum Yılı */}
      <Text style={styles.label}>Doğum Yılı</Text>
      <TextInput
        style={styles.input}
        value={birthYear}
        onChangeText={setBirthYear}
        placeholder="1990"
        placeholderTextColor={theme.colors.textSecondary}
        keyboardType="number-pad"
        maxLength={4}
      />

      {/* Boy & Kilo */}
      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.label}>Boy (cm)</Text>
          <TextInput
            style={styles.input}
            value={heightCm}
            onChangeText={setHeightCm}
            placeholder="170"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.halfField}>
          <Text style={styles.label}>Kilo (kg)</Text>
          <TextInput
            style={styles.input}
            value={weightKg}
            onChangeText={setWeightKg}
            placeholder="70"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      {/* Hedef Glukoz */}
      <Text style={styles.label}>Hedef Glukoz Aralığı (mg/dL)</Text>
      <View style={styles.row}>
        <View style={styles.halfField}>
          <TextInput
            style={styles.input}
            value={glucoseMin}
            onChangeText={setGlucoseMin}
            placeholder="70"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="number-pad"
          />
          <Text style={styles.inputHint}>Min</Text>
        </View>
        <View style={styles.halfField}>
          <TextInput
            style={styles.input}
            value={glucoseMax}
            onChangeText={setGlucoseMax}
            placeholder="180"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="number-pad"
          />
          <Text style={styles.inputHint}>Max</Text>
        </View>
      </View>

      {/* Buttons */}
      <TouchableOpacity
        style={styles.saveBtn}
        onPress={handleSave}
        activeOpacity={0.85}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Kaydet ve Devam Et</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipBtn}
        onPress={onComplete}
        activeOpacity={0.7}
        disabled={isSaving}
      >
        <Text style={styles.skipBtnText}>Şimdi Atla</Text>
      </TouchableOpacity>

      <View style={{ height: insets.bottom + theme.spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg },

  title: { ...theme.typography.title, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.xl,
  },

  label: {
    ...theme.typography.caption,
    fontFamily: "Outfit_700Bold",
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  chipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  chipText: { ...theme.typography.caption, color: theme.colors.textSecondary, fontFamily: "Outfit_600SemiBold" },
  chipTextSelected: { color: "#fff" },

  row: { flexDirection: "row", gap: theme.spacing.md },
  halfField: { flex: 1 },

  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  inputHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },

  saveBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.xl,
  },
  saveBtnText: { ...theme.typography.body, fontFamily: "Outfit_700Bold", color: "#fff" },

  skipBtn: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    marginTop: theme.spacing.sm,
  },
  skipBtnText: { ...theme.typography.caption, color: theme.colors.textSecondary },
});
