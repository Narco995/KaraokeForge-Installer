import { requireAdmin } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { catalogFor, configuredProviders } from "@/lib/providers/registry";

export async function GET() {
  return handleRoute(async () => {
    await requireAdmin();
    return {
      providers: configuredProviders(),
      models: catalogFor().map(({ model, available, reason }) => ({
        id: model.id,
        name: model.name,
        provider: model.provider,
        kind: model.kind,
        available,
        reason,
        description: model.description,
        creditScore: model.creditScore,
        avgSeconds: model.avgSeconds,
        capabilities: model.capabilities,
      })),
    };
  });
}
