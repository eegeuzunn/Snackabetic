import { CameraView, useCameraPermissions } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { analyzeImage } from "../services/analyzeService";
import { APP_ROUTES } from "../constants/routes";
import theme from "../theme";

export default function CameraScreen({ navigation, route }) {
  const mealType = route.params?.mealType ?? "SNACK";
  const returnToMeal = route.params?.returnToMeal ?? false;
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const cameraRef = useRef(null);

  function handleCancel() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(APP_ROUTES.ADD_MEAL);
  }

  // ── Permission gate ────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <TouchableOpacity style={styles.topCancelBtn} onPress={handleCancel}>
          <Feather name="arrow-left" size={14} color="#fff" />
          <Text style={styles.topCancelBtnText}>Geri</Text>
        </TouchableOpacity>
        <Text style={styles.permissionText}>
          Kamera erişimi gerekli. Lütfen izin verin.
        </Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
          <Text style={styles.btnText}>İzin Ver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Actions ────────────────────────────────────────────────────────
  async function takePicture() {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      setPhotoUri(photo.uri);
    } catch {
      Alert.alert("Hata", "Fotoğraf çekilemedi.");
    }
  }

  async function pickFromGallery() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("İzin gerekli", "Galeriye erişim izni gerekli.");
        return;
      }

      const mediaTypesOption =
        (ImagePicker.MediaType && ImagePicker.MediaType.Images) ||
        (ImagePicker.MediaTypeOptions && ImagePicker.MediaTypeOptions.Images) ||
        ImagePicker.MediaTypeOptions?.Images ||
        ImagePicker.MediaType?.Images ||
        ImagePicker.MediaTypeOptions?.All;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaTypesOption,
        quality: 0.8,
      });

      if (!result) return;
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
      } else if (result.uri) {
        // older API
        setPhotoUri(result.uri);
      }
    } catch (err) {
      Alert.alert("Galeri Hatası", err.message || "Galeri açılamadı.");
    }
  }

  async function handleAnalyze() {
    if (!photoUri) return;
    setIsAnalyzing(true);
    try {
      const prediction = await analyzeImage(photoUri);
      // Navigate to PredictionResultScreen with the result and image
      navigation.navigate(APP_ROUTES.PREDICTION_RESULT, {
        prediction,
        photoUri,
        mealType,
        returnToMeal,
      });
    } catch (error) {
      Alert.alert("Analiz Hatası", error.message || "Lütfen tekrar deneyin.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function reset() {
    setPhotoUri(null);
  }

  // ── Preview mode ───────────────────────────────────────────────────
  if (photoUri) {
    return (
      <View style={styles.previewContainer}>
        <TouchableOpacity
          style={styles.topCancelBtn}
          onPress={handleCancel}
          disabled={isAnalyzing}
        >
          <Feather name="x" size={14} color="#fff" />
          <Text style={styles.topCancelBtnText}>İptal</Text>
        </TouchableOpacity>
        <Image source={{ uri: photoUri }} style={styles.previewImage} />

        {isAnalyzing ? (
          <View style={styles.analyzingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.surface} />
            <Text style={styles.analyzingText}>Analiz ediliyor…</Text>
          </View>
        ) : null}

        <View style={styles.previewActions}>
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={reset}
            disabled={isAnalyzing}
          >
            <Text style={styles.btnTextSecondary}>Yeniden Çek</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnPrimary, isAnalyzing && styles.btnDisabled]}
            onPress={handleAnalyze}
            disabled={isAnalyzing}
          >
            <Text style={styles.btnText}>Analiz Et</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Camera mode ────────────────────────────────────────────────────
  return (
    <View style={styles.cameraContainer}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />

      <TouchableOpacity style={styles.topCancelBtn} onPress={handleCancel}>
        <Feather name="x" size={14} color="#fff" />
        <Text style={styles.topCancelBtnText}>İptal</Text>
      </TouchableOpacity>

      <View style={styles.cameraControls}>
        <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}>
          <Text style={styles.galleryBtnText}>Galeri</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shutterBtn} onPress={takePicture}>
          <View style={styles.shutterInner} />
        </TouchableOpacity>

        {/* Spacer to visually balance the row */}
        <View style={{ width: 72 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Shared ──────────────────────────────────────────────────────
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  permissionText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  btnPrimary: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: 14,
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
  },
  btnText: {
    color: theme.colors.surface,
    ...theme.typography.button,
  },
  btnDisabled: {
    opacity: 0.55,
  },

  // ── Camera ──────────────────────────────────────────────────────
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  topCancelBtn: {
    position: "absolute",
    top: 56,
    left: theme.spacing.lg,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  topCancelBtnText: {
    color: "#fff",
    ...theme.typography.caption,
    fontFamily: "Outfit_600SemiBold",
    marginLeft: 6,
  },
  cameraControls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: theme.spacing.xl,
  },
  galleryBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  galleryBtnText: {
    color: "#fff",
    ...theme.typography.caption,
  },
  shutterBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
  },

  // ── Preview ──────────────────────────────────────────────────────
  previewContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  previewImage: {
    flex: 1,
    resizeMode: "contain",
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  analyzingText: {
    color: "#fff",
    ...theme.typography.body,
  },
  previewActions: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: theme.spacing.md,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    minHeight: 52,
  },
  btnTextSecondary: {
    color: "#fff",
    ...theme.typography.caption,
  },
});
