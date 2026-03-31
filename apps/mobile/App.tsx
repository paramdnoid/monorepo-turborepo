import "./global.css";

import { TRADE_SLUGS } from "@repo/api-contracts";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";

export default function App() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-center text-base text-neutral-900">
        Open up App.tsx to start working on your app!
      </Text>
      <Text className="mt-2 text-xs text-neutral-500">
        Shared contracts: {TRADE_SLUGS.join(", ")}
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}
