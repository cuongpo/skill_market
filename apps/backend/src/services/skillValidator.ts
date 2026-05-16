import matter from "gray-matter";
import { testSkillPrompt } from "./claudeService.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  frontmatter?: {
    name: string;
    description: string;
    author?: string;
    price_per_use?: number;
    version?: string;
  };
}

const REQUIRED_FIELDS = ["name", "description"] as const;

export function validateSkillFormat(content: string): ValidationResult {
  const errors: string[] = [];

  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(content);
  } catch {
    return { valid: false, errors: ["Could not parse SKILL.md frontmatter"] };
  }

  const fm = parsed.data as Record<string, unknown>;

  for (const field of REQUIRED_FIELDS) {
    if (!fm[field]) errors.push(`Missing required field: ${field}`);
  }

  if (fm.price_per_use !== undefined) {
    const price = Number(fm.price_per_use);
    if (isNaN(price) || price < 0.1)
      errors.push("price_per_use must be >= 0.10");
  }

  if (!parsed.content || parsed.content.trim().length < 50) {
    errors.push("Skill body must have at least 50 characters of instructions");
  }

  return {
    valid: errors.length === 0,
    errors,
    frontmatter: errors.length === 0
      ? {
          name: String(fm.name),
          description: String(fm.description),
          author: fm.author ? String(fm.author) : undefined,
          price_per_use: fm.price_per_use ? Number(fm.price_per_use) : undefined,
          version: fm.version ? String(fm.version) : undefined,
        }
      : undefined,
  };
}

/** Runs a basic "hello" test prompt to verify the skill can handle a real question */
export async function runTestPrompt(
  skillContent: string
): Promise<{ passed: boolean; response: string; error?: string }> {
  // Extract a generic test question from the skill's description
  const parsed = matter(skillContent);
  const description = String(parsed.data.description || "general tasks");
  const testMessage = `Give me a brief example of the kind of question you can help with, related to: ${description}`;

  try {
    const response = await testSkillPrompt(skillContent, testMessage);
    const passed = response.length > 20;
    return { passed, response };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { passed: false, response: "", error };
  }
}
