/**
 * Détecte et humanise les commentaires d'erreur postés par Alexis sur les issues.
 *
 * Deux formats sont reconnus (ancien et nouveau) :
 *
 * Ancien (avant humanisation backend) :
 *   ❌ **Alexis — 2 tentatives échouées (spec) :**
 *   ```
 *   openai.AuthenticationError: invalid_api_key
 *   ```
 *   Repasse le ticket dans le statut actif pour réessayer.
 *
 * Nouveau (après humanisation backend) :
 *   ❌ **Incident technique temporaire**
 *   Un problème est survenu du côté d'Alexis…
 *   <!-- alexis:error_detail -->
 *   openai.AuthenticationError: invalid_api_key
 *   <!-- /alexis:error_detail -->
 *
 * Dans les deux cas, on retourne { title, hint, detail } pour un rendu propre.
 * Si le commentaire n'est pas un commentaire d'erreur Alexis, on retourne null.
 */

export interface HumanizedError {
  /** Titre court humanisé (ex: "Incident technique temporaire") */
  title: string;
  /** Phrase d'explication client-friendly */
  hint: string;
  /** Message brut original — pour le repliable "Détails techniques" */
  detail: string | null;
  /** true = échec définitif (❌), false = tentative intermédiaire (⚠️) */
  isFinal: boolean;
}

// ─── Règles de mapping (port TS de error_humanizer.py) ───────────────────────

interface Rule {
  pattern: RegExp;
  title: string;
  hint: string;
}

const RULES: Rule[] = [
  {
    pattern: /invalid.api.key|incorrect api key|api key not found|invalid_api_key|authentication.*error|authenticationerror/i,
    title: "Incident technique temporaire",
    hint: "Un problème est survenu du côté d'Alexis. L'équipe a été notifiée automatiquement.",
  },
  {
    pattern: /rate.?limit|too many requests|429|overloaded/i,
    title: "Service IA momentanément saturé",
    hint: "Le service d'intelligence artificielle est temporairement surchargé. Alexis réessaiera automatiquement.",
  },
  {
    pattern: /insufficient.quota|exceeded.*quota|out of credits|billing.*limit/i,
    title: "Quota IA atteint",
    hint: "Le quota du service IA a été atteint. Alexis a été notifiée et prend en charge la résolution.",
  },
  {
    pattern: /budget.?exceeded|cost.?cap|monthly.?budget/i,
    title: "Budget du projet atteint",
    hint: "Le budget alloué à ce projet a été atteint. Vous pouvez l'ajuster dans les paramètres du projet.",
  },
  {
    pattern: /timeout|timed.?out|deadline.?exceeded|connecttimeout/i,
    title: "Délai dépassé",
    hint: "L'opération a pris trop de temps. Alexis réessaiera automatiquement au prochain cycle.",
  },
  {
    pattern: /403|forbidden|not accessible by integration|push access|permission denied/i,
    title: "Accès refusé au dépôt",
    hint: "Alexis n'a pas les permissions nécessaires sur le dépôt. Vérifiez les droits d'accès dans les paramètres.",
  },
  {
    pattern: /authentication failed.*github|invalid username or password|could not read username|repository not found/i,
    title: "Connexion au dépôt impossible",
    hint: "Alexis ne peut pas accéder au dépôt. Vérifiez le token de forge dans les paramètres du projet.",
  },
  {
    pattern: /conflict.*merge|merge conflict|updates were rejected|non-fast-forward/i,
    title: "Conflit de fusion",
    hint: "Un conflit de merge a été détecté. Alexis réessaiera après résolution.",
  },
  {
    pattern: /pathspec.*did not match|couldn't find remote ref|ref not found/i,
    title: "Branche introuvable",
    hint: "La branche cible est introuvable. Vérifiez la configuration du projet.",
  },
  {
    pattern: /no space left|memoryerror|exit.*137|exit status 137/i,
    title: "Ressource insuffisante",
    hint: "Le runner a manqué de ressources. L'équipe Alexis a été notifiée.",
  },
  {
    pattern: /docker daemon|no such container|image pull failed/i,
    title: "Incident d'exécution",
    hint: "Un problème d'infrastructure est survenu. L'équipe Alexis a été notifiée.",
  },
  {
    pattern: /fatal:|error: git|git.*error|clone.*failed|push.*failed|pull.*failed/i,
    title: "Problème avec le dépôt",
    hint: "Une opération Git a échoué. L'équipe Alexis examine le problème.",
  },
];

const DEFAULT_TITLE = "Une erreur est survenue";
const DEFAULT_HINT =
  "Le traitement a échoué de façon inattendue. L'équipe Alexis a été notifiée automatiquement.";

// Bruit HF à ignorer avant de classifier
const HF_NOISE =
  /Warning: You are sending unauthenticated requests to the HF Hub[^\n]*/gi;

function classifyRaw(raw: string): { title: string; hint: string } {
  const cleaned = raw.replace(HF_NOISE, "").trim();
  if (!cleaned) return { title: DEFAULT_TITLE, hint: DEFAULT_HINT };
  for (const rule of RULES) {
    if (rule.pattern.test(cleaned)) {
      return { title: rule.title, hint: rule.hint };
    }
  }
  return { title: DEFAULT_TITLE, hint: DEFAULT_HINT };
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

/**
 * Extrait le contenu d'un bloc ``` ... ``` (premier bloc trouvé).
 * Retourne null si aucun bloc n'est trouvé.
 */
function extractCodeBlock(body: string): string | null {
  const m = body.match(/```[^\n]*\n([\s\S]*?)```/);
  return m ? m[1].trim() : null;
}

/**
 * Extrait le contenu entre <!-- alexis:error_detail --> et <!-- /alexis:error_detail -->.
 */
function extractNewDetail(body: string): string | null {
  const m = body.match(
    /<!--\s*alexis:error_detail\s*-->([\s\S]*?)<!--\s*\/alexis:error_detail\s*-->/
  );
  return m ? m[1].trim() : null;
}

// ─── Point d'entrée public ────────────────────────────────────────────────────

/**
 * Tente de détecter et humaniser un commentaire d'erreur Alexis.
 *
 * @returns HumanizedError si le commentaire est un commentaire d'erreur Alexis,
 *          null sinon (→ rendu normal via MarkdownLite).
 */
export function humanizeErrorComment(body: string): HumanizedError | null {
  if (!body) return null;

  const isFinalOld = body.startsWith("❌ **Alexis — 2 tentatives échouées");
  const isRetryOld = body.startsWith("⚠️ **Alexis — tentative");
  const isNewFormat = body.startsWith("❌ **") || body.startsWith("⚠️ **");

  // ── Ancien format ──────────────────────────────────────────────────────────
  if (isFinalOld || isRetryOld) {
    const detail = extractCodeBlock(body);
    const { title, hint } = classifyRaw(detail ?? body);
    return { title, hint, detail, isFinal: isFinalOld };
  }

  // ── Nouveau format (backend humanisé) ─────────────────────────────────────
  // Reconnaît : ❌ **Titre humanisé** ou ⚠️ **Titre humanisé**
  // suivi d'un hint et d'un bloc <!-- alexis:error_detail -->
  if (isNewFormat) {
    const detail = extractNewDetail(body);
    // Extraire le titre (première ligne, entre ** **)
    const titleMatch = body.match(/^[❌⚠️]\s+\*\*([^*]+)\*\*/);
    const title = titleMatch ? titleMatch[1] : DEFAULT_TITLE;
    // Extraire le hint (deuxième ligne non vide)
    const lines = body.split("\n").filter((l) => l.trim());
    const hint = lines[1] ?? DEFAULT_HINT;
    return { title, hint, detail, isFinal: body.startsWith("❌") };
  }

  return null;
}
