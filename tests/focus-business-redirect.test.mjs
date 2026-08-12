import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const route = await readFile(new URL("../app/focus-business/route.ts", import.meta.url), "utf8");

test("Focus Business short route redirects to the verified onboarding form", () => {
  assert.match(route, /Response\.redirect\(onboardingUrl, 302\)/);
  assert.match(route, /https:\/\/focus-business-onboarding\.moisses\.chatgpt\.site\//);
  assert.doesNotMatch(route, /trello\.com/);
});
