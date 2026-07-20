/**
 * Cette page n'est plus utilisée — le stepper d'onboarding ne comporte plus
 * cette étape. Fichier conservé vide pour éviter les erreurs de routing
 * Next.js si l'URL est visitée.
 */
import { redirect } from "next/navigation";

export default function TeamPage() {
  redirect("/projects/new/repo");
}
