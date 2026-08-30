/**
 * Rendu Markdown léger, sans dépendance externe — titres, listes, gras/italique/
 * code inline, blocs de code ``` ```, paragraphes. Utilisé partout où du texte
 * généré par l'agent (contexte, commentaires de ticket) doit s'afficher formaté
 * plutôt qu'en texte brut avec les astérisques/backticks littéraux.
 */

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (/^\*[^*]+\*$/.test(part)) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (/^`[^`]+`$/.test(part)) {
      return (
        <code key={i} className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-xs text-foreground">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function renderMarkdown(md: string): React.ReactNode[] {
  // Blocs <!-- nom --> ... <!-- /nom --> — deux commentaires HTML utilisés
  // comme marqueurs de section pour cacher du détail technique (ex :
  // <!-- alexis:error_detail --> dans run_step.py) sans l'exposer au client.
  // Ce ne sont PAS des commentaires imbriqués (le HTML ne le permet pas) :
  // ce sont deux commentaires distincts entourant le contenu à masquer, d'où
  // le strip explicite de la section avant le strip générique ci-dessous.
  const withoutMarkedSections = md.replace(/<!--\s*([\w:.-]+)\s*-->[\s\S]*?<!--\s*\/\1\s*-->/g, "");
  // Commentaires HTML simples restants (sans paire de marqueurs) — invisibles
  // en HTML standard, mais ce renderer n'a pas de notion de HTML sans ce strip.
  const withoutComments = withoutMarkedSections.replace(/<!--[\s\S]*?-->/g, "");
  const lines = withoutComments.split("\n");
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];
  let codeBlockLines: string[] | null = null;
  let key = 0;

  function flushList() {
    if (listItems.length === 0) return;
    nodes.push(
      <ul key={key++} className="my-2 ml-4 list-disc space-y-0.5">
        {listItems.map((item, i) => (
          <li key={i} className="text-sm text-foreground leading-relaxed">
            {renderInline(item)}
          </li>
        ))}
      </ul>
    );
    listItems = [];
  }

  for (const raw of lines) {
    const line = raw;

    // Bloc de code ``` ... ``` (avec ou sans langage après les premiers ```)
    if (/^```/.test(line)) {
      if (codeBlockLines === null) {
        flushList();
        codeBlockLines = [];
      } else {
        nodes.push(
          <pre
            key={key++}
            className="my-2 overflow-x-auto rounded-lg bg-surface-sunken p-3 font-mono text-xs text-foreground"
          >
            <code>{codeBlockLines.join("\n")}</code>
          </pre>
        );
        codeBlockLines = null;
      }
      continue;
    }
    if (codeBlockLines !== null) {
      codeBlockLines.push(line);
      continue;
    }

    // Heading 1
    if (/^# /.test(line)) {
      flushList();
      nodes.push(
        <h2 key={key++} className="mt-5 mb-1 text-base font-bold text-foreground first:mt-0">
          {renderInline(line.slice(2))}
        </h2>
      );
      continue;
    }
    // Heading 2
    if (/^## /.test(line)) {
      flushList();
      nodes.push(
        <h3 key={key++} className="mt-4 mb-1 text-sm font-semibold text-foreground">
          {renderInline(line.slice(3))}
        </h3>
      );
      continue;
    }
    // Heading 3
    if (/^### /.test(line)) {
      flushList();
      nodes.push(
        <h4 key={key++} className="mt-3 mb-0.5 text-sm font-medium text-foreground">
          {renderInline(line.slice(4))}
        </h4>
      );
      continue;
    }
    // List item
    if (/^[-*] /.test(line)) {
      listItems.push(line.slice(2));
      continue;
    }
    // Numbered list
    if (/^\d+\. /.test(line)) {
      listItems.push(line.replace(/^\d+\. /, ""));
      continue;
    }
    // Empty line
    if (line.trim() === "") {
      flushList();
      nodes.push(<div key={key++} className="h-2" />);
      continue;
    }
    // Paragraph
    flushList();
    nodes.push(
      <p key={key++} className="text-sm text-foreground leading-relaxed">
        {renderInline(line)}
      </p>
    );
  }
  flushList();
  // Bloc de code jamais fermé (``` manquant en fin de texte) — affiche quand
  // même le contenu accumulé plutôt que de le perdre silencieusement.
  if (codeBlockLines !== null) {
    nodes.push(
      <pre key={key++} className="my-2 overflow-x-auto rounded-lg bg-surface-sunken p-3 font-mono text-xs text-foreground">
        <code>{codeBlockLines.join("\n")}</code>
      </pre>
    );
  }
  return nodes;
}

export default function MarkdownLite({ text }: { text: string }) {
  return <>{renderMarkdown(text)}</>;
}
