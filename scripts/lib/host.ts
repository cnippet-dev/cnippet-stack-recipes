// Copies a host into a fresh app dir. Shared by compose (CI apps under
// .compose/) and `recipe new` (the author's build app).
import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

// Host files that are build output or machine-specific, never copied.
const HOST_EXCLUDES = [
  "node_modules",
  ".next",
  ".turbo",
  "next-env.d.ts",
  `app${sep}generated`,
];

export function copyHost(hostDir: string, dest: string, packageName: string) {
  cpSync(hostDir, dest, {
    filter: (src) => {
      const rel = relative(hostDir, src);
      return !HOST_EXCLUDES.some(
        (ex) =>
          rel === ex ||
          rel.startsWith(`${ex}${sep}`) ||
          rel.endsWith(`${sep}${ex}`),
      );
    },
    recursive: true,
  });
  const pkgPath = join(dest, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.name = packageName;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}
