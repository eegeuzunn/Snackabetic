import React, { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import PrimaryButton from "../components/PrimaryButton";
import ScreenContainer from "../components/ScreenContainer";
import theme from "../theme";

export default function SignupScreen({ onSignup, onNavigateLogin }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef(null);

  const scrollToBottomField = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Hata", "Email ve şifre zorunludur.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Hata", "Şifre en az 8 karakter olmalıdır.");
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert("Hata", "Şifreler eşleşmiyor.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSignup({ email, password, firstName, lastName });
    } catch (error) {
      Alert.alert("Kayıt başarısız", error.message || "Lütfen bilgileri kontrol edin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Hesap Oluştur</Text>
          <Text style={styles.subtitle}>Diyabet takibine başlamak için kayıt olun.</Text>

          <View style={styles.form}>
          <Text style={styles.label}>Ad</Text>
          <TextInput
            placeholder="Adınız"
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
          />

          <Text style={styles.label}>Soyad</Text>
          <TextInput
            placeholder="Soyadınız"
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
          />

          <Text style={styles.label}>E-posta</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="ornek@mail.com"
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Şifre</Text>
          <TextInput
            secureTextEntry
            placeholder="En az 8 karakter"
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            onFocus={scrollToBottomField}
          />

          <Text style={styles.label}>Şifre Tekrar</Text>
          <TextInput
            secureTextEntry
            placeholder="Şifrenizi tekrar girin"
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.input}
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            onFocus={scrollToBottomField}
          />

          <PrimaryButton
            title={isSubmitting ? "Kaydediliyor..." : "Kayıt Ol"}
            onPress={handleSignup}
            disabled={isSubmitting}
          />
          </View>

          <Text style={styles.loginLink} onPress={onNavigateLogin}>
            Zaten hesabın var mı? <Text style={styles.loginLinkBold}>Giriş Yap</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingVertical: theme.spacing.xxl,
    paddingBottom: theme.spacing.xxl * 3,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.xxl,
  },
  form: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
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
  loginLink: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: theme.spacing.lg,
  },
  loginLinkBold: {
    color: theme.colors.primary,
    fontFamily: "Outfit_600SemiBold",
  },
});