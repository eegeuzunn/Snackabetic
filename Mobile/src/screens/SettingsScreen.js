import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { me } from "../services/authService";
import { getMyProfile } from "../services/patientService";
import { STACK_ROUTES } from "../constants/routes";
import theme from "../theme";

export default function SettingsScreen({ onSignOut }) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [userData, profileData] = await Promise.all([
        me().catch(() => null),
        getMyProfile().catch(() => null),
      ]);
      setUser(userData);
      setProfile(profileData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation, load]);

  function handleSignOut() {
    Alert.alert("Çıkış Yap", "Hesabından çıkmak istediğine emin misin?", [
      { text: "İptal", style: "cancel" },
      { text: "Çıkış Yap", style: "destructive", onPress: onSignOut },
    ]);
  }

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "—";
  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + theme.spacing.lg }]}
    >
      {/* ── Avatar + isim ─────────────────────────────────────── */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.fullName}>{fullName}</Text>
        {user?.email && <Text style={styles.email}>{user.email}</Text>}
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate(STACK_ROUTES.EDIT_PROFILE, { user, profile })}
          activeOpacity={0.8}
        >
          <Text style={styles.editBtnText}>Profili Düzenle</Text>
        </TouchableOpacity>
      </View>

      {/* ── Kullanıcı bilgileri ───────────────────────────────── */}
      {(() => {
        const rows = [
          { label: "Ad Soyad", value: fullName },
          { label: "E-posta", value: user?.email ?? "—" },
          user?.phone ? { label: "Telefon", value: user.phone } : null,
        ].filter(Boolean);
        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Hesap</Text>
            {rows.map((r, i) => (
              <InfoRow key={r.label} label={r.label} value={r.value} isLast={i === rows.length - 1} />
            ))}
          </View>
        );
      })()}

      {/* ── Sağlık profili ───────────────────────────────────── */}
      {profile && (() => {
        const bmi = calcBmi(profile.heightCm, profile.weightKg);
        const rows = [
          profile.diabetesType ? { label: "Diyabet Tipi", value: formatDiabetesType(profile.diabetesType) } : null,
          profile.sex ? { label: "Cinsiyet", value: formatSex(profile.sex) } : null,
          profile.dateOfBirth ? { label: "Yaş", value: `${calcAge(profile.dateOfBirth)} yaş  ·  ${formatDate(profile.dateOfBirth)}` } : null,
          profile.diagnosisDate ? { label: "Tanı Tarihi", value: formatDate(profile.diagnosisDate) } : null,
          profile.heightCm ? { label: "Boy", value: `${profile.heightCm} cm` } : null,
          profile.weightKg ? { label: "Kilo", value: `${profile.weightKg} kg` } : null,
          bmi ? { label: "VKİ (BMI)", value: `${bmi}  ·  ${bmiLabel(bmi)}` } : null,
          (profile.targetGlucoseMin && profile.targetGlucoseMax) ? { label: "Glukoz Hedefi", value: `${profile.targetGlucoseMin} – ${profile.targetGlucoseMax} mg/dL` } : null,
          profile.carbRatio ? { label: "Karb Oranı", value: `${profile.carbRatio} g/ünite` } : null,
          profile.correctionFactor ? { label: "Düzeltme Faktörü", value: `${profile.correctionFactor} mg/dL/ünite` } : null,
        ].filter(Boolean);
        if (rows.length === 0) return null;
        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sağlık Profili</Text>
            {rows.map((r, i) => (
              <InfoRow key={r.label} label={r.label} value={r.value} isLast={i === rows.length - 1} />
            ))}
          </View>
        );
      })()}

      {/* ── Çıkış ────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
        <Text style={styles.signOutText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value, isLast }) {
  return (
    <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function formatDiabetesType(value) {
  const map = { TYPE_1: "Tip 1", TYPE_2: "Tip 2", PREDIABETES: "Prediyabet", OTHER: "Diğer" };
  return map[value] ?? value;
}

function formatSex(value) {
  const map = { MALE: "Erkek", FEMALE: "Kadın" };
  return map[value] ?? value;
}

function calcBmi(heightCm, weightKg) {
  if (!heightCm || !weightKg) return null;
  const h = parseFloat(heightCm) / 100;
  return (parseFloat(weightKg) / (h * h)).toFixed(1);
}

function bmiLabel(bmi) {
  if (bmi == null) return null;
  const v = parseFloat(bmi);
  if (v < 18.5) return "Zayıf";
  if (v < 25)   return "Normal";
  if (v < 30)   return "Fazla Kilolu";
  return "Obez";
}

function calcAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const diff = Date.now() - new Date(dateOfBirth).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background },

  avatarSection: { alignItems: "center", marginBottom: theme.spacing.xl },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  avatarText: { fontSize: 28, fontFamily: "Outfit_700Bold", color: "#fff" },
  fullName: { ...theme.typography.heading, color: theme.colors.textPrimary },
  email: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 4 },
  editBtn: {
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  editBtnText: { ...theme.typography.caption, fontFamily: "Outfit_700Bold", color: theme.colors.primary },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    ...theme.typography.caption,
    fontFamily: "Outfit_700Bold",
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: { ...theme.typography.caption, color: theme.colors.textSecondary },
  infoValue: { ...theme.typography.caption, fontFamily: "Outfit_600SemiBold", color: theme.colors.textPrimary },

  signOutBtn: {
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    borderRadius: 14,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  signOutText: { ...theme.typography.caption, fontFamily: "Outfit_700Bold", color: theme.colors.danger },
});
