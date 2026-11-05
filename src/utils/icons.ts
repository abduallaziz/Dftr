import { CircleDot, Droplets, Flame, Package, SprayCan, Sparkles, Truck, Wind, type LucideIcon } from "lucide-react";

// Whitelist of icons that categories may reference by name (stored in the database).
const ICONS: Record<string, LucideIcon> = { Truck, Droplets, SprayCan, Sparkles, CircleDot, Flame, Wind, Package };

export function iconFor(name: string): LucideIcon {
  return ICONS[name] ?? Package;
}
