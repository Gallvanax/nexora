import { isAiConfigured } from "@/lib/env";

export interface AiSuggestionRequest {
  workspaceId: string;
  projectId?: string;
  prompt: string;
}

export interface AiSuggestionResponse {
  configured: boolean;
  provider: string | null;
  message: string;
  suggestions: string[];
}

export interface IAiAssistantProvider {
  readonly name: string;
  suggestNextActions(input: AiSuggestionRequest): Promise<AiSuggestionResponse>;
}

/**
 * Architecture prête pour un futur connecteur IA (OpenAI / Gemini / Anthropic).
 * Aucun résultat IA factice n'est simulé lorsque AI_PROVIDER_API_KEY est absent.
 */
export function getAiAssistantStatus(): { configured: boolean; provider: string | null } {
  return {
    configured: isAiConfigured(),
    provider: isAiConfigured() ? "custom-env-provider" : null,
  };
}

export async function requestAiSuggestions(
  input: AiSuggestionRequest
): Promise<AiSuggestionResponse> {
  if (!isAiConfigured()) {
    return {
      configured: false,
      provider: null,
      message:
        "Aucun fournisseur d'IA n'est configuré (variable AI_PROVIDER_API_KEY absente). L'architecture d'extension est prête pour brancher votre propre modèle.",
      suggestions: [],
    };
  }

  return {
    configured: true,
    provider: "custom-env-provider",
    message: `Connecteur IA prêt pour l'espace ${input.workspaceId}.`,
    suggestions: [],
  };
}
