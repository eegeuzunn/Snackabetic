import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Accelerometer } from "expo-sensors";
import NetworkLogger from "react-native-network-logger";
import theme from "../theme";

const SHAKE_THRESHOLD = 2.0;
const SHAKE_COOLDOWN_MS = 1000;

export default function NetworkDebugOverlay() {
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!__DEV__) return;

    Accelerometer.setUpdateInterval(100);
    let lastShakeAt = 0;

    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const total = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (total > SHAKE_THRESHOLD + 1 && now - lastShakeAt > SHAKE_COOLDOWN_MS) {
        lastShakeAt = now;
        setVisible((v) => !v);
      }
    });

    return () => sub.remove();
  }, []);

  if (!__DEV__) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
      <View style={styles.modal}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>Network Logs</Text>
          <Pressable style={styles.closeBtn} onPress={() => setVisible(false)}>
            <Text style={styles.closeBtnText}>Kapat</Text>
          </Pressable>
        </View>
        <NetworkLogger />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  closeBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
});
