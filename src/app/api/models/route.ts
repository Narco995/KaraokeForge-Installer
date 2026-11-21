import { handleRoute } from "@/lib/api";
import { catalogFor } from "@/lib/providers/registry";
import type { ModelKind } from "@/lib/models";

export async function GET() {
  return handleRoute(async () => {
    const catalog = catalogFor();
    return {
      models: catalog.map(({ model, available, reason }) => ({
        id: model.id,
        name: model.name,
        provider: model.provider,
        kind: model.kind,
        available,
        reason: available ? undefined : reason,
        description: model.description,
        strengths: model.strengths,
        creditScore: model.creditScore,
        avgSeconds: model.avgSeconds,
        capabilities: model.capabilities,
      })),
    };
  });
}
