import type { RecipeConfigInput } from "./types";

// Identity helper so `recipe.config.ts` gets type inference and autocomplete.
// Validation happens in validate-recipes.ts, not here.
export function defineRecipe(config: RecipeConfigInput): RecipeConfigInput {
  return config;
}
