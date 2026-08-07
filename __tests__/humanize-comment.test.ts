/**
 * Tests unitaires pour lib/humanize-comment.ts
 * Couvre : ancien format, nouveau format, commentaires normaux, no-blame.
 */
import { humanizeErrorComment } from "@/lib/humanize-comment";

// ─── Commentaires normaux (non-erreur) ────────────────────────────────────────

describe("humanizeErrorComment — commentaires normaux", () => {
  it("retourne null pour un commentaire de spec", () => {
    expect(humanizeErrorComment("## Spec fonctionnelle\n\nVoici la spec…")).toBeNull();
  });

  it("retourne null pour un commentaire utilisateur", () => {
    expect(humanizeErrorComment("Pouvez-vous ajouter un bouton ?")).toBeNull();
  });

  it("retourne null pour un commentaire de PR", () => {
    expect(humanizeErrorComment("🔗 **Pull Request :** https://github.com/acme/test/pull/9")).toBeNull();
  });

  it("retourne null pour une chaîne vide", () => {
    expect(humanizeErrorComment("")).toBeNull();
  });
});

// ─── Ancien format (❌ **Alexis — 2 tentatives échouées…) ────────────────────

describe("humanizeErrorComment — ancien format (échec définitif)", () => {
  const OLD_FINAL = `❌ **Alexis — 2 tentatives échouées (spec) :**
\`\`\`
openai.AuthenticationError: invalid_api_key
\`\`\`
Repasse le ticket dans le statut actif pour réessayer.`;

  it("détecte l'ancien format comme erreur", () => {
    expect(humanizeErrorComment(OLD_FINAL)).not.toBeNull();
  });

  it("isFinal = true pour ❌", () => {
    expect(humanizeErrorComment(OLD_FINAL)!.isFinal).toBe(true);
  });

  it("humanise le titre (pas le brut)", () => {
    const result = humanizeErrorComment(OLD_FINAL)!;
    expect(result.title).toBe("Incident technique temporaire");
    expect(result.title).not.toContain("invalid_api_key");
  });

  it("no-blame : le hint ne mentionne pas 'ta clé' ni 'votre clé'", () => {
    const result = humanizeErrorComment(OLD_FINAL)!;
    expect(result.hint.toLowerCase()).not.toContain("ta clé");
    expect(result.hint.toLowerCase()).not.toContain("votre clé");
  });

  it("extrait le brut dans detail", () => {
    const result = humanizeErrorComment(OLD_FINAL)!;
    expect(result.detail).toContain("invalid_api_key");
  });
});

describe("humanizeErrorComment — ancien format (tentative intermédiaire)", () => {
  const OLD_RETRY = `⚠️ **Alexis — tentative 1/2 échouée (dev) :**
\`\`\`
RateLimitError: too many requests
\`\`\`
Nouvelle tentative automatique au prochain cycle.`;

  it("détecte l'ancien format retry", () => {
    expect(humanizeErrorComment(OLD_RETRY)).not.toBeNull();
  });

  it("isFinal = false pour ⚠️", () => {
    expect(humanizeErrorComment(OLD_RETRY)!.isFinal).toBe(false);
  });

  it("humanise correctement le rate limit", () => {
    expect(humanizeErrorComment(OLD_RETRY)!.title).toBe("Service IA momentanément saturé");
  });
});

// ─── Nouveau format (backend humanisé) ───────────────────────────────────────

describe("humanizeErrorComment — nouveau format", () => {
  const NEW_FINAL = `❌ **Incident technique temporaire**

Un problème est survenu du côté d'Alexis. L'équipe a été notifiée automatiquement.

Repasse le ticket dans le statut actif pour réessayer.
<!-- alexis:error_detail -->
openai.AuthenticationError: invalid_api_key
<!-- /alexis:error_detail -->`;

  it("détecte le nouveau format", () => {
    expect(humanizeErrorComment(NEW_FINAL)).not.toBeNull();
  });

  it("extrait le titre du nouveau format", () => {
    expect(humanizeErrorComment(NEW_FINAL)!.title).toBe("Incident technique temporaire");
  });

  it("extrait le detail du nouveau format", () => {
    expect(humanizeErrorComment(NEW_FINAL)!.detail).toContain("invalid_api_key");
  });

  it("isFinal = true pour ❌ nouveau format", () => {
    expect(humanizeErrorComment(NEW_FINAL)!.isFinal).toBe(true);
  });

  const NEW_RETRY = `⚠️ **Service IA momentanément saturé**

Le service d'intelligence artificielle est temporairement surchargé.

Nouvelle tentative automatique au prochain cycle.
<!-- alexis:error_detail -->
RateLimitError: too many requests
<!-- /alexis:error_detail -->`;

  it("isFinal = false pour ⚠️ nouveau format", () => {
    expect(humanizeErrorComment(NEW_RETRY)!.isFinal).toBe(false);
  });
});

// ─── Cas limites ──────────────────────────────────────────────────────────────

describe("humanizeErrorComment — cas limites", () => {
  it("ancien format sans bloc code → detail null", () => {
    const body = "❌ **Alexis — 2 tentatives échouées (spec) :**\nRepasse le ticket.";
    const result = humanizeErrorComment(body)!;
    expect(result).not.toBeNull();
    expect(result.detail).toBeNull();
  });

  it("nouveau format sans detail → detail null", () => {
    const body = "❌ **Incident technique temporaire**\n\nUn problème est survenu.";
    const result = humanizeErrorComment(body)!;
    expect(result).not.toBeNull();
    expect(result.detail).toBeNull();
  });

  it("retourne toujours { title, hint, detail, isFinal } quand non-null", () => {
    const body = "❌ **Alexis — 2 tentatives échouées (dev) :**\n```\nsome error\n```";
    const result = humanizeErrorComment(body)!;
    expect(typeof result.title).toBe("string");
    expect(typeof result.hint).toBe("string");
    expect(typeof result.isFinal).toBe("boolean");
  });
});
