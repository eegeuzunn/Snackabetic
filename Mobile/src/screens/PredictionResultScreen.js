import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { searchFoods } from "../services/foodService";
import { createMeal } from "../services/mealService";
import { APP_ROUTES } from "../constants/routes";
import theme from "../theme";

// ─── Helpers ────────────────────────────────────────────────────────────────
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function PredictionResultScreen({ route, navigation }) {
  const { prediction, photoUri } = route.params ?? {};

  // ── State ────────────────────────────────────────────────────────────
  const [mode, setMode] = useState("review"); // "review" | "edit"

  // Editable values (start with AI prediction)
  const [gram, setGram] = useState(String(prediction?.weightG ?? ""));
  const [selectedFood, setSelectedFood] = useState(null); // { id, name }
  const [searchQuery, setSearchQuery] = useState(prediction?.foodName ?? "");

  // Food search
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedQuery = useDebounce(searchQuery);

  // Save
  const [isSaving, setIsSaving] = useState(false);

  const searchInputRef = useRef(null);

  // ── Auto-search when query changes ───────────────────────────────────
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    searchFoods(debouncedQuery.trim())
      .then((results) => {
        if (!cancelled) setSearchResults(results);
      })
      .catch(() => {
        if (!cancelled) setSearchResults([]);
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // ── Enter edit mode ──────────────────────────────────────────────────
  function enterEditMode() {
    setMode("edit");
    // Trigger initial search with AI food name
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }

  // ── Select a food from search results ───────────────────────────────
  const selectFood = useCallback((food) => {
    setSelectedFood({ id: food.id, name: food.name });
    setSearchQuery(food.name);
    setSearchResults([]); // hide list
  }, []);

  // ── Save meal ────────────────────────────────────────────────────────
  async function handleConfirm() {
    const parsedGram = parseFloat(gram);
    if (!parsedGram || parsedGram <= 0) {
      Alert.alert("Hata", "Lütfen geçerli bir gram değeri girin.");
      return;
    }
    if (!selectedFood?.id) {
      Alert.alert("Hata", "Lütfen listeden bir yemek seçin.");
      return;
    }

    setIsSaving(true);
    try {
      await createMeal({ foodId: selectedFood.id, amountGrams: parsedGram });
      Alert.alert("Kaydedildi", "Öğün başarıyla eklendi.", [
        {
          text: "Tamam",
          onPress: () =>
            navigation.navigate(APP_ROUTES.DASHBOARD),
        },
      ]);
    } catch (error) {
      Alert.alert("Kayıt Hatası", error.message || "Lütfen tekrar deneyin.");
    } finally {
      setIsSaving(false);
    }
  }

  // ── Render food item ─────────────────────────────────────────────────
  const renderFoodItem = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={[
          styles.foodItem,
          selectedFood?.id === item.id && styles.foodItemSelected,
        ]}
        onPress={() => selectFood(item)}
        activeOpacity={0.7}
      >
        <Text style={styles.foodItemName}>{item.name}</Text>
        {item.carbsPer100g != null && (
          <Text style={styles.foodItemMeta}>
            {item.carbsPer100g}g karbonhidrat / 100g
          </Text>
        )}
      </TouchableOpacity>
    ),
    [selectedFood, selectFood],
  );

  // ════════════════════════════════════════════════════════════════════
  //  REVIEW MODE
  // ════════════════════════════════════════════════════════════════════
  if (mode === "review") {
    return (
      <View style={styles.container}>
        {/* Photo */}
        {photoUri && (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        )}

        {/* Prediction card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Tespit Edilen Yemek</Text>
          <Text style={styles.foodName}>
            {prediction?.foodName ?? "Bilinmiyor"}
          </Text>

          <View style={styles.statsRow}>
            <StatBox label="Tahmini Ağırlık" value={`${prediction?.weightG ?? 0} g`} />
            <StatBox label="Karbonhidrat" value={`${prediction?.carbsG ?? 0} g`} />
            <StatBox label="Kalori" value={`${prediction?.calories ?? 0} kcal`} />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btnPrimary, isSaving && styles.btnDisabled]}
            onPress={() => {
              // Quick confirm: we still need a foodId, so go to edit first with auto-selected food
              enterEditMode();
            }}
            disabled={isSaving}
          >
            <Text style={styles.btnText}>Onayla / Düzelt</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          Yemek adını veya gramı düzeltebilirsin, sonra "Kaydet"e bas.
        </Text>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  //  EDIT MODE
  // ════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Yemeği Onayla</Text>

      {/* Food search */}
      <Text style={styles.fieldLabel}>Yemek Adı</Text>
      <View style={styles.searchRow}>
        <TextInput
          ref={searchInputRef}
          style={styles.input}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            setSelectedFood(null); // reset selection when user types
          }}
          placeholder="Yemek ara… (ör. mantı, dolma)"
          placeholderTextColor={theme.colors.textSecondary}
          returnKeyType="search"
        />
        {isSearching && (
          <ActivityIndicator
            style={styles.searchSpinner}
            color={theme.colors.primary}
          />
        )}
      </View>

      {/* Search results */}
      {searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderFoodItem}
          style={styles.resultsList}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        />
      )}

      {/* Gram input */}
      <Text style={[styles.fieldLabel, { marginTop: theme.spacing.lg }]}>
        Gram
      </Text>
      <TextInput
        style={styles.input}
        value={gram}
        onChangeText={setGram}
        keyboardType="decimal-pad"
        placeholder="Örn: 250"
        placeholderTextColor={theme.colors.textSecondary}
      />

      {selectedFood && (
        <Text style={styles.selectedNote}>
          ✓ Seçili: {selectedFood.name}
        </Text>
      )}

      {/* Save */}
      <TouchableOpacity
        style={[
          styles.btnPrimary,
          { marginTop: theme.spacing.xl },
          (isSaving || !selectedFood) && styles.btnDisabled,
        ]}
        onPress={handleConfirm}
        disabled={isSaving || !selectedFood}
      >
        {isSaving ? (
          <ActivityIndicator color={theme.colors.surface} />
        ) : (
          <Text style={styles.btnText}>Kaydet</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btnSecondary}
        onPress={() => setMode("review")}
        disabled={isSaving}
      >
        <Text style={styles.btnSecondaryText}>Geri Dön</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── StatBox sub-component ───────────────────────────────────────────────────
function StatBox({ label, value }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },

  // Photo
  photo: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    resizeMode: "cover",
    marginBottom: theme.spacing.lg,
  },

  // Prediction card
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  cardLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  foodName: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
    textTransform: "capitalize",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: theme.spacing.md,
    alignItems: "center",
  },
  statValue: {
    ...theme.typography.body,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 2,
  },

  // Actions (review mode)
  actions: {
    gap: theme.spacing.md,
  },
  hint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: theme.spacing.md,
  },

  // Edit mode
  sectionTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  fieldLabel: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  searchSpinner: {
    position: "absolute",
    right: theme.spacing.md,
  },
  input: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
  resultsList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    marginTop: theme.spacing.xs,
  },
  foodItem: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  foodItemSelected: {
    backgroundColor: `${theme.colors.primary}15`,
  },
  foodItemName: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  foodItemMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  selectedNote: {
    ...theme.typography.caption,
    color: theme.colors.success,
    marginTop: theme.spacing.sm,
  },

  // Buttons
  btnPrimary: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    minHeight: 56,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  btnText: {
    color: theme.colors.surface,
    ...theme.typography.button,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnSecondary: {
    marginTop: theme.spacing.md,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  btnSecondaryText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
});
