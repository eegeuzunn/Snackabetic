import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { searchFoods, getFoods } from "../services/foodService";
import { createMeal } from "../services/mealService";
import { APP_ROUTES, STACK_ROUTES } from "../constants/routes";
import theme from "../theme";

const MEAL_TYPES = [
  { label: "Kahvaltı", value: "BREAKFAST" },
  { label: "Öğle", value: "LUNCH" },
  { label: "Akşam", value: "DINNER" },
  { label: "Atıştırmalık", value: "SNACK" },
];

function calcNutrition(food, grams) {
  const ratio = grams / 100;
  return {
    carbsG:
      food.carbsPer100g != null ? +(food.carbsPer100g * ratio).toFixed(1) : 0,
    calories:
      food.caloriesPer100g != null
        ? +(food.caloriesPer100g * ratio).toFixed(1)
        : 0,
    proteinG:
      food.proteinPer100g != null
        ? +(food.proteinPer100g * ratio).toFixed(1)
        : 0,
    fatG: food.fatPer100g != null ? +(food.fatPer100g * ratio).toFixed(1) : 0,
  };
}

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function AddMealScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [mealType, setMealType] = useState("SNACK");
  const [items, setItems] = useState([]); // { tempId, foodId, foodName, amountGrams, carbsG, calories, proteinG, fatG, _food }
  const [isSaving, setIsSaving] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [allFoods, setAllFoods] = useState([]);
  const [isLoadingFoods, setIsLoadingFoods] = useState(true);
  const [selectedFood, setSelectedFood] = useState(null); // food object from search
  const [gramInput, setGramInput] = useState("");
  const debouncedQuery = useDebounce(searchQuery);
  const searchInputRef = useRef(null);

  // Edit state
  const [editingTempId, setEditingTempId] = useState(null);
  const [editingGram, setEditingGram] = useState("");

  // ── Load initial food list ────────────────────────────────────────
  useEffect(() => {
    getFoods()
      .then(setAllFoods)
      .catch(() => {})
      .finally(() => setIsLoadingFoods(false));
  }, []);

  // ── Incoming item from Camera → PredictionResult ──────────────────
  useEffect(() => {
    const addItem = route.params?.addItem;
    if (!addItem) return;
    setItems((prev) => [
      ...prev,
      {
        tempId: Date.now(),
        foodId: addItem.foodId,
        foodName: addItem.foodName,
        amountGrams: addItem.amountGrams,
        carbsG: addItem.carbsG ?? 0,
        calories: addItem.calories ?? 0,
        proteinG: addItem.proteinG ?? 0,
        fatG: addItem.fatG ?? 0,
        _food: {
          carbsPer100g: addItem.carbsPer100g,
          caloriesPer100g: addItem.caloriesPer100g,
          proteinPer100g: addItem.proteinPer100g,
          fatPer100g: addItem.fatPer100g,
        },
      },
    ]);
    // Clear the param so re-focus doesn't re-add
    navigation.setParams({ addItem: undefined });
  }, [route.params?.addItem]);

  // ── Food search ───────────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    searchFoods(debouncedQuery.trim())
      .then((r) => {
        if (!cancelled) setSearchResults(r);
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

  // ── Select food from results ──────────────────────────────────────
  const selectFood = useCallback((food) => {
    setSelectedFood(food);
    setSearchQuery(food.name);
    setSearchResults([]);
    setGramInput("100");
  }, []);

  // ── Add item to list ──────────────────────────────────────────────
  function addItem() {
    if (!selectedFood) return;
    const grams = parseFloat(gramInput);
    if (!grams || grams <= 0) {
      Alert.alert("Hata", "Geçerli bir gram değeri girin.");
      return;
    }
    const nutrition = calcNutrition(selectedFood, grams);
    setItems((prev) => [
      ...prev,
      {
        tempId: Date.now(),
        foodId: selectedFood.id,
        foodName: selectedFood.name,
        amountGrams: grams,
        _food: selectedFood,
        ...nutrition,
      },
    ]);
    setSelectedFood(null);
    setSearchQuery("");
    setGramInput("");
    setSearchResults([]);
  }

  // ── Delete item ───────────────────────────────────────────────────
  function deleteItem(tempId) {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId));
  }

  // ── Start editing an item ─────────────────────────────────────────
  function startEdit(item) {
    setEditingTempId(item.tempId);
    setEditingGram(String(item.amountGrams));
  }

  // ── Confirm edit ──────────────────────────────────────────────────
  function confirmEdit(item) {
    const grams = parseFloat(editingGram);
    if (!grams || grams <= 0) {
      setEditingTempId(null);
      return;
    }
    const nutrition = calcNutrition(item._food, grams);
    setItems((prev) =>
      prev.map((i) =>
        i.tempId === item.tempId
          ? { ...i, amountGrams: grams, ...nutrition }
          : i,
      ),
    );
    setEditingTempId(null);
  }

  // ── Totals ────────────────────────────────────────────────────────
  const totals = items.reduce(
    (acc, i) => ({
      carbsG: +(acc.carbsG + (i.carbsG ?? 0)).toFixed(1),
      calories: +(acc.calories + (i.calories ?? 0)).toFixed(1),
      proteinG: +(acc.proteinG + (i.proteinG ?? 0)).toFixed(1),
      fatG: +(acc.fatG + (i.fatG ?? 0)).toFixed(1),
    }),
    { carbsG: 0, calories: 0, proteinG: 0, fatG: 0 },
  );

  // ── Save ──────────────────────────────────────────────────────────
  async function handleSave() {
    if (items.length === 0) {
      Alert.alert("Boş Öğün", "Lütfen en az bir yemek ekleyin.");
      return;
    }
    setIsSaving(true);
    try {
      await createMeal({ items, mealType });
      setItems([]);
      setSelectedFood(null);
      setSearchQuery("");
      setGramInput("");
      setSearchResults([]);
      setEditingTempId(null);
      setEditingGram("");
      navigation.navigate(APP_ROUTES.DASHBOARD);
    } catch (e) {
      Alert.alert("Kayıt Hatası", e.message || "Lütfen tekrar deneyin.");
    } finally {
      setIsSaving(false);
    }
  }

  // ── Navigate to camera ────────────────────────────────────────────
  function goCamera() {
    navigation.navigate(STACK_ROUTES.CAMERA, { mealType, returnToMeal: true });
  }

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
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Öğün Ekle</Text>

      {/* ── Öğün tipi ─────────────────────────────────────────────── */}
      <View style={styles.chipRow}>
        {MEAL_TYPES.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, mealType === opt.value && styles.chipSelected]}
            onPress={() => setMealType(opt.value)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.chipText,
                mealType === opt.value && styles.chipTextSelected,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Fotoğraf ile Tara ─────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.cameraBtn}
        onPress={goCamera}
        activeOpacity={0.85}
      >
        <Feather name="camera" size={20} color={theme.colors.primary} />
        <Text style={styles.cameraBtnText}>Fotoğraf ile Tara</Text>
        <Feather name="chevron-right" size={18} color={theme.colors.primary} />
      </TouchableOpacity>

      {/* ── Öğün Özeti ────────────────────────────────────────────── */}
      {items.length > 0 && (
        <View style={styles.summaryCard}>
          <Text style={styles.sectionLabel}>Öğün Özeti</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryTile}>
              <Text style={[styles.tileValue, { color: theme.colors.primary }]}>
                {totals.carbsG}
                <Text style={styles.tileUnit}> g</Text>
              </Text>
              <Text style={styles.tileLabel}>Karbonhidrat</Text>
            </View>
            <View style={styles.tileDivider} />
            <View style={styles.summaryTile}>
              <Text style={styles.tileValue}>
                {totals.calories}
                <Text style={styles.tileUnit}> kcal</Text>
              </Text>
              <Text style={styles.tileLabel}>Kalori</Text>
            </View>
            <View style={styles.tileDivider} />
            <View style={styles.summaryTile}>
              <Text style={styles.tileValue}>
                {totals.proteinG}
                <Text style={styles.tileUnit}> g</Text>
              </Text>
              <Text style={styles.tileLabel}>Protein</Text>
            </View>
            <View style={styles.tileDivider} />
            <View style={styles.summaryTile}>
              <Text style={styles.tileValue}>
                {totals.fatG}
                <Text style={styles.tileUnit}> g</Text>
              </Text>
              <Text style={styles.tileLabel}>Yağ</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Eklenen Yemekler ──────────────────────────────────────── */}
      {items.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>
            Eklenen Yemekler ({items.length})
          </Text>
          {items.map((item, index) => (
            <View key={item.tempId}>
              <View style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.foodName}</Text>
                  {editingTempId === item.tempId ? (
                    <View style={styles.editGramRow}>
                      <TextInput
                        style={styles.editGramInput}
                        value={editingGram}
                        onChangeText={setEditingGram}
                        keyboardType="decimal-pad"
                        autoFocus
                        onBlur={() => confirmEdit(item)}
                        onSubmitEditing={() => confirmEdit(item)}
                      />
                      <Text style={styles.editGramUnit}>g</Text>
                    </View>
                  ) : (
                    <Text style={styles.itemMeta}>
                      {item.amountGrams}g ·{" "}
                      <Text
                        style={{
                          color: theme.colors.primary,
                          fontFamily: "Outfit_700Bold",
                        }}
                      >
                        {item.carbsG}g karb
                      </Text>
                      {item.calories > 0 ? `  ·  ${item.calories} kcal` : ""}
                    </Text>
                  )}
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() =>
                      editingTempId === item.tempId
                        ? confirmEdit(item)
                        : startEdit(item)
                    }
                  >
                    <Feather
                      name={editingTempId === item.tempId ? "check" : "edit-2"}
                      size={16}
                      color={
                        editingTempId === item.tempId
                          ? theme.colors.primary
                          : theme.colors.textSecondary
                      }
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => deleteItem(item.tempId)}
                  >
                    <Feather
                      name="trash-2"
                      size={16}
                      color={theme.colors.danger}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              {index < items.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      )}

      {/* ── Yemek Ekle (manuel) ───────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Yemek Ekle</Text>

        <View style={styles.searchRow}>
          <Feather
            name="search"
            size={16}
            color={theme.colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={(t) => {
              setSearchQuery(t);
              setSelectedFood(null);
            }}
            placeholder="Yemek ara… (örn. mantı, yoğurt)"
            placeholderTextColor={theme.colors.textSecondary}
          />
          {isSearching && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              style={{ marginLeft: 8 }}
            />
          )}
        </View>

        {(() => {
          const list =
            searchQuery.trim().length >= 2 ? searchResults : allFoods;
          if (isLoadingFoods && list.length === 0) {
            return (
              <ActivityIndicator
                color={theme.colors.primary}
                style={{ marginTop: theme.spacing.md }}
              />
            );
          }
          if (list.length === 0) return null;
          return (
            <View style={styles.resultsList}>
              {list.map((food, idx) => (
                <TouchableOpacity
                  key={food.id}
                  style={[
                    styles.resultItem,
                    selectedFood?.id === food.id && styles.resultItemSelected,
                    idx === list.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={() => selectFood(food)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resultName}>{food.name}</Text>
                  {food.carbsPer100g != null && (
                    <Text style={styles.resultMeta}>
                      {food.carbsPer100g}g karb / 100g ·{" "}
                      {food.caloriesPer100g ?? "—"} kcal / 100g
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          );
        })()}

        {selectedFood && (
          <View style={styles.gramRow}>
            <View style={styles.gramInputWrap}>
              <TextInput
                style={styles.gramInput}
                value={gramInput}
                onChangeText={setGramInput}
                keyboardType="decimal-pad"
                placeholder="Gram"
                placeholderTextColor={theme.colors.textSecondary}
              />
              <Text style={styles.gramUnit}>g</Text>
            </View>
            {gramInput && parseFloat(gramInput) > 0 && (
              <Text style={styles.gramPreview}>
                ≈ {calcNutrition(selectedFood, parseFloat(gramInput)).carbsG}g
                karb
              </Text>
            )}
            <TouchableOpacity
              style={styles.addBtn}
              onPress={addItem}
              activeOpacity={0.85}
            >
              <Text style={styles.addBtnText}>Ekle</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Kaydet ────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[
          styles.saveBtn,
          (isSaving || items.length === 0) && styles.saveBtnDisabled,
        ]}
        onPress={handleSave}
        activeOpacity={0.85}
        disabled={isSaving || items.length === 0}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>
            {items.length === 0 ? "Kaydet" : `Kaydet  ·  ${items.length} yemek`}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg },

  title: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
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
  chipText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontFamily: "Outfit_600SemiBold",
  },
  chipTextSelected: { color: "#fff" },

  cameraBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  cameraBtnText: {
    flex: 1,
    ...theme.typography.body,
    fontFamily: "Outfit_700Bold",
    color: theme.colors.primary,
  },

  sectionLabel: {
    ...theme.typography.caption,
    fontFamily: "Outfit_700Bold",
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },

  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryTile: { flex: 1, alignItems: "center" },
  tileDivider: { width: 1, height: 36, backgroundColor: theme.colors.border },
  tileValue: {
    fontSize: 18,
    fontFamily: "Outfit_700Bold",
    color: theme.colors.textPrimary,
  },
  tileUnit: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    color: theme.colors.textSecondary,
  },
  tileLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textAlign: "center",
    fontSize: 10,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
  itemInfo: { flex: 1 },
  itemName: {
    ...theme.typography.body,
    fontFamily: "Outfit_700Bold",
    color: theme.colors.textPrimary,
  },
  itemMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  itemActions: { flexDirection: "row", gap: theme.spacing.sm },
  iconBtn: { padding: theme.spacing.sm },
  divider: { height: 1, backgroundColor: theme.colors.border },

  editGramRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  editGramInput: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 8,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    width: 72,
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    fontFamily: "Outfit_700Bold",
  },
  editGramUnit: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  searchIcon: { marginRight: theme.spacing.sm },
  searchInput: {
    flex: 1,
    height: 44,
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },

  resultsList: {
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    maxHeight: 260,
    overflow: "hidden",
  },
  resultItem: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  resultItemSelected: { backgroundColor: `${theme.colors.primary}12` },
  resultName: { ...theme.typography.body, color: theme.colors.textPrimary },
  resultMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  gramRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  gramInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  gramInput: {
    width: 72,
    height: 44,
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  gramUnit: { ...theme.typography.caption, color: theme.colors.textSecondary },
  gramPreview: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontFamily: "Outfit_700Bold",
    flex: 1,
  },
  addBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.lg,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnText: {
    ...theme.typography.caption,
    fontFamily: "Outfit_700Bold",
    color: "#fff",
  },

  saveBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.sm,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: {
    ...theme.typography.body,
    fontFamily: "Outfit_700Bold",
    color: "#fff",
  },
});
