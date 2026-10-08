import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { enCatalog, type LocaleCatalog } from "@site/content/locale";

/**
 * Shared localization runtime (Issue #14).
 *
 * One i18next instance serves every consumer: React components use it through
 * `I18nextProvider` + `useTranslation` (react-i18next adapter), while Phaser
 * and other non-React tools use the exported `t` directly. English is the
 * source/fallback catalog; swapping locale resources changes presentation
 * without touching simulation state.
 */
void i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  defaultNS: "translation",
  resources: { en: { translation: enCatalog } },
  react: { useSuspense: false },
  returnEmptyString: false,
});

export { i18n };
export const t: typeof i18n.t = i18n.t.bind(i18n);

/** Locale belongs to selected new-world content, never to hidden sim state. */
export function setRuntimeContentLocale(locale: LocaleCatalog | null): void {
  i18n.removeResourceBundle("en", "translation");
  i18n.addResourceBundle("en", "translation", { ...enCatalog, ...(locale ?? {}) }, true, true);
}
