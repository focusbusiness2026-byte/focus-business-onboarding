const onboardingUrl = "https://focus-business-onboarding.moisses.chatgpt.site/";

export function GET() {
  return Response.redirect(onboardingUrl, 302);
}
