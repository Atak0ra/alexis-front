"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listLinearTeams, createLinearTeam, AlexisApiError, type LinearTeam } from "@/lib/api-client";
import { getApiKey } from "@/lib/session";
import { useOnboarding } from "@/lib/onboarding-context";

const CREATE_NEW = "__create_new__";

export default function TeamPage() {
  const router = useRouter();
  const { setLinearApiKey, setLinearTeamId } = useOnboarding();
  const [linearApiKeyInput, setLinearApiKeyInput] = useState("");
  const [teams, setTeams] = useState<LinearTeam[] | null>(null);
  const [selected, setSelected] = useState<string>(CREATE_NEW);
  const [newTeamName, setNewTeamName] = useState("Alexis-Engineering");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleFetchTeams(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("Session absente");
      const result = await listLinearTeams(apiKey, linearApiKeyInput);
      setTeams(result);
      setSelected(CREATE_NEW);
    } catch (err) {
      setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmTeam(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("Session absente");

      let teamId = selected;
      if (selected === CREATE_NEW) {
        const created = await createLinearTeam(apiKey, linearApiKeyInput, newTeamName);
        teamId = created.id;
      }

      setLinearApiKey(linearApiKeyInput);
      setLinearTeamId(teamId);
      router.push("/onboarding/project");
    } catch (err) {
      setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Équipe Linear</CardTitle>
        </CardHeader>
        <CardContent>
          {teams === null ? (
            <form onSubmit={handleFetchTeams} className="space-y-4">
              <div>
                <Label htmlFor="linear-key">Clé API Linear</Label>
                <Input
                  id="linear-key"
                  type="password"
                  value={linearApiKeyInput}
                  onChange={(e) => setLinearApiKeyInput(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={submitting} className="w-full">
                Continuer
              </Button>
            </form>
          ) : (
            <form onSubmit={handleConfirmTeam} className="space-y-4">
              {teams.map((team) => (
                <label key={team.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="team"
                    value={team.id}
                    checked={selected === team.id}
                    onChange={() => setSelected(team.id)}
                  />
                  {team.name}
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="team"
                  value={CREATE_NEW}
                  checked={selected === CREATE_NEW}
                  onChange={() => setSelected(CREATE_NEW)}
                />
                Créer une nouvelle équipe
              </label>
              {selected === CREATE_NEW && (
                <div>
                  <Label htmlFor="new-team-name">Nom de l'équipe</Label>
                  <Input
                    id="new-team-name"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    required
                  />
                </div>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={submitting} className="w-full">
                Confirmer
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
