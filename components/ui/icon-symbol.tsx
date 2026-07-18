// Fallback for using Ionicons on Android and web (modern icon library).

import Ionicons from "@expo/vector-icons/Ionicons";
import { SymbolViewProps, SymbolWeight } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<
  SymbolViewProps["name"],
  ComponentProps<typeof Ionicons>["name"]
>;
export type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Ionicons mappings here.
 * - see Ionicons in the [Icons Directory](https://ionicons.com).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "paper-plane",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-forward",
  "chevron.down": "chevron-down",
  house: "home-outline",
  "bell.fill": "notifications",
  bell: "notifications-outline",
  info: "information-circle-outline",
  gear: "settings-outline",
  "person.fill": "person-circle",
  person: "person-circle-outline",
  menu: "menu",
  "menu-outline": "menu-outline",
  search: "search",
  magnifyingglass: "search-outline",
  location: "location",
  chatbubble: "chatbubble",
  moon: "moon",
  thermometer: "thermometer-outline",
  "cloud.rain": "rainy-outline",
  drop: "water-outline",
  sun: "sunny",
  cloud: "cloud-outline",
  robot: "robot-outline",
  "arrow.left": "chevron-back",
  "map.fill": "map",
  map: "map-outline",
  newspaper: "newspaper-outline",
  flame: "flame",
  shield: "shield",
  bandage: "bandage-outline",
  response: "flash-outline",
  network: "share-social-outline",
  bolt: "flash-outline",
  viewfinder: "scan-outline",
  "chart.bar": "bar-chart-outline",
  analytics: "bar-chart-outline",
  "clipboard.checkmark": "clipboard-check-outline",
  inspection: "clipboard-check-outline",
  "wand.and.stars": "sparkles-outline",
  readiness: "sparkles-outline",
  "antenna.radiowaves.left.and.right": "radio-outline",
  broadcast: "radio-outline",
  archivebox: "archive-outline",
  inventory: "archive-outline",
  filter: "filter",
  "car.side": "car-sport-outline",
  "cloud.sun": "partly-sunny-outline",
  megaphone: "megaphone-outline",
  campaign: "megaphone-outline",
  clock: "time",
  "info.circle": "information-circle",
  checkmark: "checkmark-done",
  "checkmark.circle": "checkmark-circle-outline",
  exclamationmark: "alert-circle",
  "exclamationmark.triangle": "warning-outline",
  "exclamationmark.triangle.fill": "warning",
  xmark: "close-circle",
  building: "business",
  phone: "call",
  pencil: "pencil-outline",
  mail: "mail-outline",
  "person.2": "people-outline",
  message: "chatbubble-outline",
  globe: "globe-outline",
  lock: "lock-closed-outline",
  "doc.text": "document-text-outline",
  "bubble.right": "chatbubble-ellipses-outline",
  "questionmark.circle": "help-circle-outline",
  "arrow.backward": "arrow-back",
  ellipsis: "ellipsis-horizontal",
  "list.bullet": "list-outline",
  "tray.full": "file-tray-full-outline",
  "bubble.left.and.bubble.right": "chatbubbles-outline",
  "bubble.left.and.bubble.right.fill": "chatbubbles",
  "person.crop.circle.badge.checkmark": "person-circle-outline",
  "doc.text.magnifyingglass": "document-text-outline",
  "clock.arrow.circlepath": "time-outline",
  plus: "add",
  trash: "trash-outline",
} as unknown as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Ionicons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Ionicons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName | string;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const mappedName = MAPPING[name as IconSymbolName] ?? "help-circle-outline";

  return <Ionicons color={color} size={size} name={mappedName} style={style} />;
}
