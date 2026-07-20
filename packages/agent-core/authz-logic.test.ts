import { describe, it, expect } from "vitest";
import { decideResourceAccess } from "./authz-logic";

describe("decideResourceAccess", () => {
  it("autorise quand l'org correspond", () => {
    expect(decideResourceAccess({ orgId: "org_1" }, "org_1")).toEqual({ allowed: true });
  });

  it("refuse en 404 quand l'org ne correspond pas (pas de fuite d'existence)", () => {
    expect(decideResourceAccess({ orgId: "org_2" }, "org_1")).toEqual({ allowed: false, status: 404 });
  });

  it("refuse en 404 quand la ressource est absente", () => {
    expect(decideResourceAccess(null, "org_1")).toEqual({ allowed: false, status: 404 });
    expect(decideResourceAccess(undefined, "org_1")).toEqual({ allowed: false, status: 404 });
  });

  it("ne renvoie jamais 403 (cohérence de la politique anti-énumération)", () => {
    const decision = decideResourceAccess({ orgId: "autre" }, "moi");
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.status).toBe(404);
  });
});
