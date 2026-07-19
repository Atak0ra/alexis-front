/**
 * Cette page n'est plus utilisée depuis la migration vers le tracker natif.
 * Le stepper d'onboarding ne comporte plus d'étape Linear.
 * Fichier conservé vide pour éviter les erreurs de routing Next.js si l'URL est visitée.
 */
import { redirect } from "next/navigation";

export default function TeamPage() {
  redirect("/projects/new/repo");
}
