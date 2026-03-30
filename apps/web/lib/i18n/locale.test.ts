import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_LOCALE,
  isLocale,
  normalizeLocale,
  resolveLocale,
  resolveLocaleFromAcceptLanguage,
} from "./locale";

describe("locale utilities", () => {
  describe("isLocale", () => {
    it("returns true only for supported locales", () => {
      assert.equal(isLocale("de"), true);
      assert.equal(isLocale("en"), true);
      assert.equal(isLocale("fr"), false);
    });
  });

  describe("normalizeLocale", () => {
    it("normalizes exact locale values", () => {
      assert.equal(normalizeLocale("de"), "de");
      assert.equal(normalizeLocale("EN"), "en");
      assert.equal(normalizeLocale(" en "), "en");
    });

    it("normalizes locale variants", () => {
      assert.equal(normalizeLocale("de-CH"), "de");
      assert.equal(normalizeLocale("en-US"), "en");
    });

    it("returns null for unsupported locales", () => {
      assert.equal(normalizeLocale("fr"), null);
      assert.equal(normalizeLocale(""), null);
      assert.equal(normalizeLocale(undefined), null);
      assert.equal(normalizeLocale(null), null);
    });
  });

  describe("resolveLocaleFromAcceptLanguage", () => {
    it("returns first supported locale in header order", () => {
      assert.equal(
        resolveLocaleFromAcceptLanguage("fr-CH, en-US;q=0.9, de;q=0.8"),
        "en",
      );
      assert.equal(resolveLocaleFromAcceptLanguage("it, de-DE;q=0.7"), "de");
    });

    it("returns null when no supported locale is present", () => {
      assert.equal(resolveLocaleFromAcceptLanguage("fr-FR, it-IT"), null);
      assert.equal(resolveLocaleFromAcceptLanguage(undefined), null);
      assert.equal(resolveLocaleFromAcceptLanguage(null), null);
    });
  });

  describe("resolveLocale", () => {
    it("prefers cookie value over accept-language", () => {
      assert.equal(
        resolveLocale({
          cookieValue: "en",
          acceptLanguageHeader: "de-DE,de;q=0.9",
        }),
        "en",
      );
    });

    it("falls back to accept-language when cookie is invalid", () => {
      assert.equal(
        resolveLocale({
          cookieValue: "fr",
          acceptLanguageHeader: "de-CH,de;q=0.8",
        }),
        "de",
      );
    });

    it("falls back to default locale when no input is usable", () => {
      assert.equal(
        resolveLocale({ cookieValue: "fr", acceptLanguageHeader: "it-IT" }),
        DEFAULT_LOCALE,
      );
      assert.equal(resolveLocale(), DEFAULT_LOCALE);
    });
  });
});
