import esbuild from "esbuild";
import sveltePlugin from "esbuild-svelte";

const prod = process.argv[2] === "production";

const ctx = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*"],
  format: "cjs",
  target: "es2020",
  mainFields: ["svelte", "browser", "module", "main"],
  conditions: ["svelte", "browser"],
  sourcemap: prod ? false : "inline",
  minify: prod,
  treeShaking: true,
  outfile: "main.js",
  logLevel: "info",
  plugins: [sveltePlugin({ compilerOptions: { css: "injected" } })],
});

if (prod) {
  await ctx.rebuild();
  await ctx.dispose();
} else {
  await ctx.watch();
}
