// Formes de données échangées avec le serveur (miroir des schémas Zod de server/).

export type Source = { document: string; section: string };

export type Reponse = {
  type: "reponse" | "inconnu" | "hors_sujet";
  titre: string;
  equipement: string | null;
  explication: string;
  etapes: { texte: string; source: Source }[];
  securite: { texte_exact: string; source: Source; verifie: boolean }[];
  valeurs: { libelle: string; nombre: number; unite: string; source: Source }[];
  astuces: { texte: string; auteur: string; source: Source }[];
  alertes: string[];
  historique: { id: string; date: string; resume: string }[];
  escalade: { qui: string; quand: string } | null;
};

export type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  dureeMs: number;
  modele: string;
};

export type Astuce = {
  id: string;
  cible: string;
  type_cible: "code_defaut" | "equipement" | "procedure" | "reference_produit";
  equipement: string | null;
  texte: string;
  citation: string;
  ecart_reference: string | null;
  auteur: string;
  source: string;
  deposeLe: string;
};

export type Statut = "reference" | "obsolete" | "non_valide" | "retour_experience" | "a_qualifier";

export type DocAdmin = {
  fichier: string;
  chemin: string;
  format: string;
  octets: number;
  modifie: string;
  etat: "charge" | "ignore" | "erreur";
  erreur: string | null;
  titre: string;
  caracteres: number;
  tokens: number;
  sections: number;
  fictif: boolean;
  statut: Statut;
  noteStatut: string;
  remplacePar?: string;
  apercu: string;
};

export type EtatAdmin = {
  docs: DocAdmin[];
  alertes: { type: "manquant" | "version"; message: string; fichiers: string[] }[];
  chargeLe: string;
  dureeMs: number;
  dossier: string;
  statuts: Record<Statut, string>;
  astuces: Astuce[];
  modele: string;
  compte: { connecte: boolean; email: string | null; abonnement: string | null };
  derniereUsage: (Usage & { le: string }) | null;
};
