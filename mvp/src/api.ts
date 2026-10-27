// Appels au serveur. Toute erreur remonte avec le message lisible renvoyé par l'API.

async function appel<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error("Pas de réseau : impossible de joindre le serveur.");
  }
  const corps = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(corps.erreur ?? `Erreur ${res.status}`);
  return corps as T;
}

const json = (methode: string, corps: unknown): RequestInit => ({
  method: methode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(corps),
});

export const api = {
  question: (question: string, historique: unknown[]) => appel<any>("/api/question", json("POST", { question, historique })),
  admin: () => appel<any>("/api/admin"),
  recharger: () => appel<any>("/api/admin/recharger", { method: "POST" }),
  statut: (fichier: string, statut: string) => appel<any>("/api/admin/statut", json("PUT", { fichier, statut })),
  note: (donnees: FormData) => appel<any>("/api/expert/note", { method: "POST", body: donnees }),
  viderAstuces: () => appel<any>("/api/expert/astuces", { method: "DELETE" }),
};
