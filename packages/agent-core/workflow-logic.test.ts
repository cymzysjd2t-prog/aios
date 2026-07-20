import { describe, it, expect } from "vitest";
import { interpolate, matchesConditions } from "./workflow-logic";

describe("interpolate", () => {
  it("remplace un placeholder par la valeur du payload", () => {
    expect(interpolate("Bonjour {{name}}", { name: "Léa" })).toBe("Bonjour Léa");
  });

  it("remplace plusieurs placeholders", () => {
    expect(interpolate("{{a}} et {{b}}", { a: "X", b: "Y" })).toBe("X et Y");
  });

  it("remplace un placeholder absent par une chaîne vide", () => {
    expect(interpolate("val: {{missing}}", {})).toBe("val: ");
  });

  it("gère null et undefined sans planter", () => {
    expect(interpolate("{{a}}{{b}}", { a: null, b: undefined })).toBe("");
  });
});

describe("matchesConditions", () => {
  it("retourne true sans condition", () => {
    expect(matchesConditions(undefined, { status: "WON" })).toBe(true);
    expect(matchesConditions([], { status: "WON" })).toBe(true);
  });

  it("retourne true quand la condition est satisfaite", () => {
    expect(matchesConditions([{ field: "status", equals: "WON" }], { status: "WON" })).toBe(true);
  });

  it("retourne false quand la condition n'est pas satisfaite", () => {
    expect(matchesConditions([{ field: "status", equals: "WON" }], { status: "LOST" })).toBe(false);
  });

  it("exige que TOUTES les conditions soient satisfaites", () => {
    const conditions = [
      { field: "status", equals: "WON" },
      { field: "score", equals: 90 },
    ];
    expect(matchesConditions(conditions, { status: "WON", score: 90 })).toBe(true);
    expect(matchesConditions(conditions, { status: "WON", score: 50 })).toBe(false);
  });
});
