import { describe, it, expect } from "vitest";
import { validateToolInput } from "./tool-schemas";

describe("validateToolInput", () => {
  it("accepte un qualify_lead valide", () => {
    const result = validateToolInput("qualify_lead", {
      name: "Jean Dupont",
      email: "jean@exemple.fr",
      status: "QUALIFIED",
      score: 75,
    });
    expect(result.ok).toBe(true);
  });

  it("rejette un qualify_lead avec un email invalide", () => {
    const result = validateToolInput("qualify_lead", {
      name: "Jean",
      email: "pas-un-email",
      status: "QUALIFIED",
      score: 75,
    });
    expect(result.ok).toBe(false);
  });

  it("rejette un score hors bornes", () => {
    const result = validateToolInput("qualify_lead", {
      name: "Jean",
      email: "jean@exemple.fr",
      status: "QUALIFIED",
      score: 150,
    });
    expect(result.ok).toBe(false);
  });

  it("rejette un statut hors enum", () => {
    const result = validateToolInput("qualify_lead", {
      name: "Jean",
      email: "jean@exemple.fr",
      status: "PEUT_ETRE",
      score: 50,
    });
    expect(result.ok).toBe(false);
  });

  it("rejette un create_business_plan sans roadmap", () => {
    const result = validateToolInput("create_business_plan", {
      positioning: "X",
      targetAudience: "Y",
      businessModel: "Z",
      roadmap: [],
    });
    expect(result.ok).toBe(false);
  });

  it("accepte un respond_to_ticket valide avec escalade", () => {
    const result = validateToolInput("respond_to_ticket", {
      ticketId: "abc123",
      response: "Nous étudions votre demande.",
      escalate: true,
    });
    expect(result.ok).toBe(true);
  });

  it("laisse passer un outil sans schéma défini", () => {
    expect(validateToolInput("record_decision", { anything: true }).ok).toBe(true);
  });
});