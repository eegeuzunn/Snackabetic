import React, { useEffect, useState } from "react";
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
import { me } from "../services/authService";
import { getMyProfile } from "../services/patientService";
import theme from "../theme";

export default function SettingsScreen({ onSignOut }) {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function load() {
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
    }
    load();
  }, []);

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
      </View>

      {/* ── Kullanıcı bilgileri ───────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Hesap</Text>
        <InfoRow label="Ad Soyad" value={fullName} />
        <InfoRow label="E-posta" value={user?.email ?? "—"} />
        {user?.phone && <InfoRow label="Telefon" value={user.phone} />}
      </View>

      {/* ── Sağlık profili ───────────────────────────────────── */}
      {profile && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sağlık Profili</Text>
          {profile.diabetesType && <InfoRow label="Diyabet Tipi" value={profile.diabetesType} />}
          {profile.dateOfBirth && <InfoRow label="Doğum Tarihi" value={formatDate(profile.dateOfBirth)} />}
          {profile.heightCm && <InfoRow label="Boy" value={`${profile.heightCm} cm`} />}
          {profile.weightKg && <InfoRow label="Kilo" value={`${profile.weightKg} kg`} />}
          {profile.targetGlucoseMin && profile.targetGlucoseMax && (
            <InfoRow label="Glukoz Hedefi" value={`${profile.targetGlucoseMin} – ${profile.targetGlucoseMax} mg/dL`} />
          )}
          {profile.carbRatio && <InfoRow label="Karb Oranı" value={`${profile.carbRatio} g/ünite`} />}
          {profile.correctionFactor && <InfoRow label="Düzeltme Faktörü" value={`${profile.correctionFactor}`} />}
        </View>
      )}

      {/* ── Çıkış ────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
        <Text style={styles.signOutText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
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
  avatarText: { fontSize: 28, fontWeight: "700", color: "#fff" },
  fullName: { ...theme.typography.heading, color: theme.colors.textPrimary },
  email: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 4 },

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
    fontWeight: "700",
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
  infoLabel: { ...theme.typography.caption, color: theme.colors.textSecondary },
  infoValue: { ...theme.typography.caption, fontWeight: "600", color: theme.colors.textPrimary },

  signOutBtn: {
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    borderRadius: 14,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  signOutText: { ...theme.typography.caption, fontWeight: "700", color: theme.colors.danger },
});
