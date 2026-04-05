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
import { updateMe } from "../services/authService";
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

export default function EditProfileScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { user, profile } = route.params ?? {};
  const [isSaving, setIsSaving] = useState(false);

  // Hesap alanları
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  // Sağlık profili alanları
  const [diabetesType, setDiabetesType] = useState(profile?.diabetesType ?? null);
  const [sex, setSex] = useState(profile?.sex ?? null);
  const [birthYear, setBirthYear] = useState(
    profile?.dateOfBirth ? String(new Date(profile.dateOfBirth).getFullYear()) : ""
  );
  const [heightCm, setHeightCm] = useState(profile?.heightCm ? String(profile.heightCm) : "");
  const [weightKg, setWeightKg] = useState(profile?.weightKg ? String(profile.weightKg) : "");
  const [glucoseMin, setGlucoseMin] = useState(
    profile?.targetGlucoseMin ? String(profile.targetGlucoseMin) : "70"
  );
  const [glucoseMax, setGlucoseMax] = useState(
    profile?.targetGlucoseMax ? String(profile.targetGlucoseMax) : "180"
  );
  const [carbRatio, setCarbRatio] = useState(
    profile?.carbRatio ? String(profile.carbRatio) : ""
  );
  const [correctionFactor, setCorrectionFactor] = useState(
    profile?.correctionFactor ? String(profile.correctionFactor) : ""
  );

  async function handleSave() {
    setIsSaving(true);
    try {
      const userPayload = {};
      if (firstName.trim()) userPayload.firstName = firstName.trim();
      if (lastName.trim()) userPayload.lastName = lastName.trim();
      if (phone.trim()) userPayload.phone = phone.trim();

      const profilePayload = {};
      if (diabetesType) profilePayload.diabetesType = diabetesType;
      if (sex) profilePayload.sex = sex;
      if (heightCm) profilePayload.heightCm = parseFloat(heightCm);
      if (weightKg) profilePayload.weightKg = parseFloat(weightKg);
      if (glucoseMin) profilePayload.targetGlucoseMin = parseInt(glucoseMin, 10);
      if (glucoseMax) profilePayload.targetGlucoseMax = parseInt(glucoseMax, 10);
      if (carbRatio) profilePayload.carbRatio = parseFloat(carbRatio);
      if (correctionFactor) profilePayload.correctionFactor = parseFloat(correctionFactor);
      if (birthYear && birthYear.length === 4) profilePayload.dateOfBirth = `${birthYear}-01-01`;

      await Promise.all([
        Object.keys(userPayload).length > 0 ? updateMe(userPayload) : Promise.resolve(),
        updateMyProfile(profilePayload),
      ]);

      navigation.goBack();
    } catch (e) {
      Alert.alert("Hata", "Değişiklikler kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + theme.spacing.xl }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Hesap Bilgileri */}
      <Text style={styles.sectionTitle}>Hesap Bilgileri</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Ad</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Ad"
          placeholderTextColor={theme.colors.textSecondary}
        />
        <Text style={styles.label}>Soyad</Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Soyad"
          placeholderTextColor={theme.colors.textSecondary}
        />
        <Text style={styles.label}>Telefon</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+90 555 000 00 00"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="phone-pad"
        />
      </View>

      {/* Sağlık Profili */}
      <Text style={styles.sectionTitle}>Sağlık Profili</Text>
      <View style={styles.card}>
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

        <Text style={styles.label}>Karb Oranı (g/ünite)</Text>
        <TextInput
          style={styles.input}
          value={carbRatio}
          onChangeText={setCarbRatio}
          placeholder="10"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Düzeltme Faktörü</Text>
        <TextInput
          style={styles.input}
          value={correctionFactor}
          onChangeText={setCorrectionFactor}
          placeholder="50"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="decimal-pad"
        />
      </View>

      <TouchableOpacity
        style={styles.saveBtn}
        onPress={handleSave}
        activeOpacity={0.85}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Kaydet</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg },

  sectionTitle: {
    ...theme.typography.body,
    fontFamily: "Outfit_700Bold",
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },

  label: {
    ...theme.typography.caption,
    fontFamily: "Outfit_700Bold",
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },

  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },

  row: { flexDirection: "row", gap: theme.spacing.md },
  halfField: { flex: 1 },
  inputHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  chipSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  chipText: { ...theme.typography.caption, color: theme.colors.textSecondary, fontFamily: "Outfit_600SemiBold" },
  chipTextSelected: { color: "#fff" },

  saveBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.md,
  },
  saveBtnText: { ...theme.typography.body, fontFamily: "Outfit_700Bold", color: "#fff" },
});
