export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

export async function performWebSearch(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error("SERPER_API_KEY manquant dans l'environnement");

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num: 5 }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`[serper] Erreur recherche (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const organic = data.organic ?? [];
  return organic.slice(0, 5).map((r: { title: string; link: string; snippet?: string }) => ({
    title: r.title,
    link: r.link,
    snippet: r.snippet ?? "",
  }));
}

export function formatSearchResultsAsContext(query: string, results: SearchResult[]): string {
  if (results.length === 0) return `Recherche web pour "${query}" : aucun résultat trouvé.`;
  const lines = results.map((r, i) => `[${i + 1}] ${r.title}\n${r.link}\n${r.snippet}`).join("\n\n");
  return `Résultats de recherche web pour "${query}" (${new Date().toLocaleDateString("fr-FR")}) :\n\n${lines}\n\nUtilise ces résultats pour répondre à la question de l'utilisateur, et cite tes sources par numéro [1], [2], etc. quand c'est pertinent.`;
}