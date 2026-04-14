import type { IconType } from "react-icons";
import { FaEdge, FaWindows } from "react-icons/fa";
import {
  SiAndroid,
  SiApple,
  SiArc,
  SiBrave,
  SiFirefox,
  SiFirefoxbrowser,
  SiFloorp,
  SiGooglechrome,
  SiIos,
  SiLibrewolf,
  SiLinux,
  SiMacos,
  SiOpera,
  SiOperagx,
  SiSafari,
  SiSamsung,
  SiUbuntu,
  SiVivaldi,
  SiZenbrowser,
} from "react-icons/si";

export const BROWSER_ICONS: Record<string, IconType> = {
  chrome: SiGooglechrome,
  "chrome webview": SiGooglechrome,
  chromium: SiGooglechrome,

  // Firefox family
  firefox: SiFirefox,
  "firefox browser": SiFirefoxbrowser,
  librewolf: SiLibrewolf,
  floorp: SiFloorp,

  // Safari
  safari: SiSafari,
  "mobile safari": SiSafari,

  // Opera family
  opera: SiOpera,
  "opera mini": SiOpera,
  "opera gx": SiOperagx,

  // Other Chromium-based
  brave: SiBrave,
  vivaldi: SiVivaldi,
  arc: SiArc,
  zen: SiZenbrowser,

  // Samsung Internet
  "samsung browser": SiSamsung,
  "samsung internet": SiSamsung,

  // Microsoft Edge
  "microsoft edge": FaEdge,
};

export const OS_ICONS: Record<string, IconType> = {
  // Apple
  macos: SiMacos,
  "mac os": SiMacos,
  ios: SiIos,
  ipados: SiApple,

  // Linux family
  linux: SiLinux,
  ubuntu: SiUbuntu,
  "chrome os": SiGooglechrome,

  // Mobile
  android: SiAndroid,

  // Windows
  windows: FaWindows,
};

export const getBrowserIcon = (name: string): IconType | undefined =>
  BROWSER_ICONS[name.toLowerCase().trim()];

export const getOsIcon = (name: string): IconType | undefined =>
  OS_ICONS[name.toLowerCase().trim()];
