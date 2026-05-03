import React, { useCallback, useEffect, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
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
  PanResponder,
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

/**
 * Normalize food names for flexible matching.
 * "Adana Kebap", "adana-kebap", "adana kebap" → "adana kebap"
 */
function normalizeFoodName(name) {
  if (!name) return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ") // Convert hyphens/underscores to spaces
    .replace(/\s+/g, " ") // Normalize multiple spaces to single space
    .trim();
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function PredictionResultScreen({ route, navigation }) {
  const {
    prediction,
    photoUri,
    mealType = "SNACK",
    manual = false,
    returnToMeal = false,
  } = route.params ?? {};

  // ── State ────────────────────────────────────────────────────────────
  const [mode, setMode] = useState(manual ? "edit" : "review"); // "review" | "edit"

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

  // Auto-select a normalized match so the predicted food can be confirmed directly.
  // Handles variations like "adana-kebap" vs "Adana Kebap" vs "adana kebap".
  useEffect(() => {
    if (mode !== "edit" || !searchResults.length || !searchQuery) {
      return;
    }

    const normalizedQuery = normalizeFoodName(searchQuery);
    if (!normalizedQuery) {
      return;
    }

    // First, try exact normalized match
    let match = searchResults.find(
      (item) => normalizeFoodName(item.name) === normalizedQuery,
    );

    // If no exact match, try partial match (query is substring of result)
    if (!match) {
      match = searchResults.find((item) =>
        normalizeFoodName(item.name).includes(normalizedQuery),
      );
    }

    if (match && selectedFood?.id !== match.id) {
      setSelectedFood(match);
      // show the nicely-cased name in the input so it appears selected
      setSearchQuery(match.name);
    }
  }, [mode, searchResults, searchQuery, selectedFood?.id]);

  // ── Enter edit mode ──────────────────────────────────────────────────
  async function enterEditMode() {
    setMode("edit");

    // Try to auto-select the predicted food immediately by searching
    if (prediction?.foodName) {
      try {
        // Normalize the query before searching (adana-kebap → adana kebap)
        const normalizedQuery = normalizeFoodName(prediction.foodName);
        const results = await searchFoods(normalizedQuery);
        const normalizedPredicted = normalizedQuery;

        // First, try exact normalized match
        let match = results.find((item) => {
          const normalized = normalizeFoodName(item.name);
          return normalized === normalizedPredicted;
        });

        // If no exact match, try partial match
        if (!match) {
          match = results.find((item) => {
            const normalized = normalizeFoodName(item.name);
            return normalized.includes(normalizedPredicted);
          });
        }

        if (match) {
          setSelectedFood(match);
          setSearchQuery(match.name);
        } else {
          // Fallback: just set the query, let the useEffect debounce/match handle it
          setSearchQuery(prediction.foodName);
        }
      } catch (error) {
        // On error, just set the query
        setSearchQuery(prediction.foodName);
      }
    }

    setTimeout(() => searchInputRef.current?.focus(), 100);
  }

  // ── Gram helpers (compact stepper + numeric input) ─────────────────
  function sanitizeNumberInput(text) {
    // allow digits and single decimal point
    const cleaned = text.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) return parts[0] + "." + parts.slice(1).join("");
    return cleaned;
  }

  function incrementGram(step = 10) {
    const cur = parseFloat(gram) || 0;
    const next = Math.min(5000, Math.round((cur + step) * 10) / 10);
    setGram(String(next));
  }

  function decrementGram(step = 10) {
    const cur = parseFloat(gram) || 0;
    const next = Math.max(0, Math.round((cur - step) * 10) / 10);
    setGram(next > 0 ? String(next) : "");
  }

  // ── Drag-to-adjust (slider with knob)
  const dragStartGramRef = useRef(0);
  const sliderWidthRef = useRef(240);
  const [sliderWidth, setSliderWidth] = useState(240);
  React.useEffect(() => {
    sliderWidthRef.current = sliderWidth;
  }, [sliderWidth]);

  const MAX_SLIDER_GRAM = 2000;
  const KNOB_SIZE = 22;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartGramRef.current = parseFloat(gram) || 0;
      },
      onPanResponderMove: (_, gesture) => {
        const dx = gesture.dx || 0;
        const width = sliderWidthRef.current || 240;
        const deltaGram = (dx / Math.max(1, width)) * MAX_SLIDER_GRAM;
        const next = Math.max(
          0,
          Math.min(
            MAX_SLIDER_GRAM,
            Math.round((dragStartGramRef.current + deltaGram) * 10) / 10,
          ),
        );
        setGram(next > 0 ? String(next) : "");
      },
      onPanResponderRelease: () => {},
    }),
  ).current;

  function handleCancel() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(
      returnToMeal ? APP_ROUTES.ADD_MEAL : APP_ROUTES.DASHBOARD,
    );
  }

  // ── Select a food from search results ───────────────────────────────
  const selectFood = useCallback((food) => {
    setSelectedFood(food);
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

    if (returnToMeal) {
      // Pass item back to AddMealScreen instead of saving directly
      navigation.navigate(APP_ROUTES.ADD_MEAL, {
        addItem: {
          foodId: selectedFood.id,
          foodName: selectedFood.name,
          amountGrams: parsedGram,
          carbsPer100g: selectedFood.carbsPer100g ?? 0,
          caloriesPer100g: selectedFood.caloriesPer100g ?? 0,
          proteinPer100g: selectedFood.proteinPer100g ?? 0,
          fatPer100g: selectedFood.fatPer100g ?? 0,
          carbsG:
            selectedFood.carbsPer100g != null
              ? +((selectedFood.carbsPer100g * parsedGram) / 100).toFixed(1)
              : 0,
          calories:
            selectedFood.caloriesPer100g != null
              ? +((selectedFood.caloriesPer100g * parsedGram) / 100).toFixed(1)
              : 0,
          proteinG:
            selectedFood.proteinPer100g != null
              ? +((selectedFood.proteinPer100g * parsedGram) / 100).toFixed(1)
              : 0,
          fatG:
            selectedFood.fatPer100g != null
              ? +((selectedFood.fatPer100g * parsedGram) / 100).toFixed(1)
              : 0,
        },
      });
      return;
    }

    setIsSaving(true);
    try {
      await createMeal({
        items: [{ foodId: selectedFood.id, amountGrams: parsedGram }],
        mealType,
      });
      Alert.alert("Kaydedildi", "Öğün başarıyla eklendi.", [
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
        {photoUri && <Image source={{ uri: photoUri }} style={styles.photo} />}

        {/* Prediction card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Tespit Edilen Yemek</Text>
          <Text style={styles.foodName}>
            {prediction?.foodName ?? "Bilinmiyor"}
          </Text>

          <View style={styles.statsRow}>
            <StatBox
              label="Tahmini Ağırlık"
              value={`${prediction?.weightG ?? 0} g`}
            />
            <StatBox
              label="Karbonhidrat"
              value={`${prediction?.carbsG ?? 0} g`}
            />
            <StatBox
              label="Kalori"
              value={`${prediction?.calories ?? 0} kcal`}
            />
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

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={handleCancel}
            disabled={isSaving}
          >
            <Feather
              name="arrow-left"
              size={16}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.btnSecondaryText}>İptal</Text>
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

      {/* Gram input (compact) */}
      <Text style={[styles.fieldLabel, { marginTop: theme.spacing.lg }]}>
        Gram
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
        }}
      >
        <View
          style={styles.sliderContainer}
          onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
          {...panResponder.panHandlers}
        >
          <View style={styles.sliderBar} />
          {(() => {
            const val = parseFloat(gram) || 0;
            const ratio = Math.max(0, Math.min(1, val / MAX_SLIDER_GRAM));
            const left = ratio * (sliderWidth - KNOB_SIZE);
            return (
              <View style={[styles.sliderKnob, { left }]}>
                <View style={styles.knobInner} />
              </View>
            );
          })()}
        </View>

        <TextInput
          style={styles.gramInput}
          value={gram}
          onChangeText={(t) => setGram(sanitizeNumberInput(t))}
          keyboardType="decimal-pad"
          placeholder="250"
          placeholderTextColor={theme.colors.textSecondary}
          maxLength={6}
        />
      </View>

      {selectedFood && (
        <Text style={styles.selectedNote}>✓ Seçili: {selectedFood.name}</Text>
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
          <Text style={styles.btnText}>
            {returnToMeal ? "Öğüne Ekle" : "Kaydet"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btnSecondary}
        onPress={() => (manual ? navigation.goBack() : setMode("review"))}
        disabled={isSaving}
      >
        <Feather
          name="arrow-left"
          size={16}
          color={theme.colors.textSecondary}
        />
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
    fontFamily: "Outfit_700Bold",
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
  gramInput: {
    width: 120,
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    textAlign: "center",
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
  /* compact slider + input only; removed step buttons */
  sliderContainer: {
    flex: 1,
    height: 40,
    justifyContent: "center",
    position: "relative",
    paddingHorizontal: theme.spacing.sm,
  },
  sliderBar: {
    position: "absolute",
    left: theme.spacing.sm,
    right: theme.spacing.sm,
    height: 3,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
  },
  sliderKnob: {
    position: "absolute",
    top: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  knobInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
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
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  btnSecondaryText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
});
