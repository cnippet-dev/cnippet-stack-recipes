import type { RecipeManifestInput } from "@cnippet/recipe-kit";

// Config files live at the project root, with or without src/.
const root = (source: string) => ({
  source,
  strategy: "create" as const,
  target: source,
});

export default {
  category: "tooling",
  description:
    "Biome as the one tool for linting, formatting and import sorting, with Next.js and React rules on and format-on-save in VS Code.",
  // Pinned exactly: a new Biome version can change formatting.
  devDependencies: ["@biomejs/biome@2.6.4"],
  hosts: ["app-router-src", "app-router-no-src"],
  name: "biome",
  prompts: [
    {
      default: false,
      id: "migrateFromEslint",
      message: "Migrating from ESLint or Prettier?",
      type: "confirm",
    },
  ],
  steps: [
    {
      files: [root("biome.json")],
      id: "biome-config",
      manualSteps: [
        {
          blocking: false,
          condition: "answers.migrateFromEslint",
          description:
            "Run `npx biome migrate eslint --write` and `npx biome migrate prettier --write` to carry your rules over, then delete your ESLint and Prettier config files and their packages. The CLI never deletes your files.",
          title: "Move off ESLint and Prettier",
          when: "after",
        },
        {
          blocking: false,
          description:
            'Add `"lint": "biome check"` and `"format": "biome check --write"` to the scripts in package.json.',
          title: "Add lint and format scripts",
          when: "after",
        },
      ],
      title: "Add the Biome config",
      verify:
        "`npx biome check` ends with `Checked N files` and no errors. If it lists files to format, `npx biome check --write` fixes them.",
      why: "One fast tool replaces ESLint, Prettier and an import sorter. The next and react domains turn on the rules for hooks, next/image and next/link. It reads .gitignore, so build output and generated code are skipped.",
    },
    {
      files: [root(".vscode/settings.json"), root(".vscode/extensions.json")],
      id: "editor-setup",
      title: "Format on save in VS Code",
      verify:
        "Open a .tsx file, mess up the indentation and save. It snaps back, and unused imports are removed.",
      why: "Running the formatter by hand gets forgotten. VS Code suggests the Biome extension to anyone who opens the project, and fixes and formats each file on save.",
    },
  ],
  supports: {
    next: ["16"],
    orm: ["prisma", "drizzle", "none"],
    router: ["app"],
  },
  thin: true,
  tier: "free",
  title: "Biome",
  version: "0.1.0",
} satisfies RecipeManifestInput;
