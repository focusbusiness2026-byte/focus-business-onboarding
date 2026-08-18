type FormPayload = Record<string, unknown>;

const text = (value: unknown) => Array.isArray(value)
  ? value.map(String).map((item) => item.trim()).filter(Boolean).join(", ")
  : String(value ?? "").trim();

const list = (value: unknown) => Array.isArray(value)
  ? value.map(String).map((item) => item.trim()).filter(Boolean)
  : text(value).split(/[,\n]+/).map((item) => item.trim()).filter(Boolean);

const safeClientKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

export function buildDownstreamProfile(payload: FormPayload, onboardingId: string) {
  const company = text(payload.companyName);
  const sectors = list(payload.sectors);
  const priorityServices = list(payload.mainService).map((service) => service === "Otro" ? text(payload.mainServiceOther) || service : service);
  const services = [...new Set([...priorityServices, ...list(payload.services).map((service) => service === "Otro" ? text(payload.servicesOther) || service : service)])];
  const countries = list(payload.targetCountries).length ? list(payload.targetCountries) : list(payload.geographies);
  const audience = list(payload.targetClientTypes).length ? list(payload.targetClientTypes) : list(payload.audience);
  const activity = text(payload.activityOther) || text(payload.activity);
  const offer = priorityServices.join(", ") || services[0] || "";
  const profile = {
    schema_version: 1,
    onboarding_id: onboardingId,
    client_key: safeClientKey(onboardingId),
    client_name: company,
    website: text(payload.website),
    sector: activity || sectors[0] || "",
    offer,
    services,
    audience,
    sectors,
    markets: countries,
    regions: list(payload.targetRegions),
    campaign: {
      objective: text(payload.campaignObjectiveOther) || text(payload.campaignObjective),
      conversion: text(payload.campaignConversion),
      audience: text(payload.campaignAudience),
      destination: text(payload.campaignDestinationOther) || text(payload.campaignDestination),
      channels: list(payload.channels),
      lead_fields: list(payload.leadFields),
      lead_questions: text(payload.additionalLeadQuestions),
      qualification: text(payload.qualification),
    },
    landing: {
      goal: text(payload.landingGoalOther) || text(payload.landingGoal),
      content: text(payload.landingSections),
      vsl: text(payload.landingVslChoice),
      vsl_url: text(payload.landingVslUrl),
      vsl_notes: text(payload.landingVslNotes),
      copy_owner: text(payload.landingCopyOwner),
      copy_brief: text(payload.landingCopyBrief),
    },
    brand: {
      tone: text(payload.formality),
      communication_tone: text(payload.communicationTone),
      language: text(payload.primaryLanguageOther) || text(payload.primaryLanguage),
      social_links: text(payload.companySocialLinks),
      portfolio: text(payload.portfolioHighlights),
    },
    prospecting: {
      lead_count: 5,
      target_city: text(payload.targetCity),
      target_region: text(payload.targetRegion),
      countries,
      regions: list(payload.targetRegions),
      client_types: audience,
      ideal_company_size: text(payload.idealCompanySize),
      ideal_profile: text(payload.idealProfileDetail),
      decision_maker: text(payload.decisionMaker),
      minimum_budget: text(payload.minimumBudget),
      exclusions: text(payload.prospectExclusions),
      preferences: text(payload.prospectPreferences),
    },
  };
  return {
    ...profile,
    content_search_brief: [
      `Buscar referencias de contenido viral aplicables a ${company || "el cliente"}.`,
      `Sector: ${profile.sector || "por confirmar"}.`,
      `Oferta: ${offer || "por confirmar"}.`,
      `Público: ${audience.join(", ") || "por confirmar"}.`,
      `Objetivo de campaña: ${profile.campaign.objective || "por confirmar"}.`,
      "No copiar piezas ni ejecutar búsquedas externas sin autorización explícita.",
    ].join(" "),
  };
}
