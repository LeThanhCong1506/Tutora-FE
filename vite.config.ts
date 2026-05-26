import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Strips `console.log / console.info / console.debug` calls from app source
 * files at build time, so production users opening DevTools see a clean
 * console. console.warn / console.error are kept on purpose — they signal
 * genuine problems we still want surfaced.
 *
 * Implementation note: we do the strip in a Vite `transform` hook (pre-bundle)
 * instead of using esbuild's `drop` or Vite's `define`. Both of those failed
 * here because this project bundles with rolldown-vite, and rolldown's OXC
 * minifier panics ("Option::unwrap() on a None value") when `define` rewrites
 * `console.log` to an arrow function. Stripping at the source level avoids the
 * bundler ever seeing those calls.
 *
 * Only runs at `apply: 'build'` — dev keeps logs intact for debugging.
 */
function stripConsoleDebug(): Plugin {
  const TARGET_RE = /\bconsole\.(log|info|debug)\s*\(/g;

  return {
    name: "strip-console-debug",
    apply: "build",
    enforce: "pre",
    transform(code, id) {
      if (id.includes("node_modules")) return null;
      if (!/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(id)) return null;
      if (!TARGET_RE.test(code)) return null;
      TARGET_RE.lastIndex = 0;

      let out = "";
      let lastIndex = 0;
      let modified = false;
      let m: RegExpExecArray | null;

      while ((m = TARGET_RE.exec(code)) !== null) {
        const callStart = m.index;
        let i = callStart + m[0].length; // just after the opening `(`
        let depth = 1;
        let str: '"' | "'" | "`" | null = null;
        let lineComment = false;
        let blockComment = false;
        let escape = false;

        while (i < code.length && depth > 0) {
          const ch = code[i];
          if (escape) {
            escape = false;
            i++;
            continue;
          }
          if (lineComment) {
            if (ch === "\n") lineComment = false;
          } else if (blockComment) {
            if (ch === "*" && code[i + 1] === "/") {
              blockComment = false;
              i++;
            }
          } else if (str) {
            if (ch === "\\") escape = true;
            else if (ch === str) str = null;
          } else {
            if (ch === "/" && code[i + 1] === "/") {
              lineComment = true;
              i++;
            } else if (ch === "/" && code[i + 1] === "*") {
              blockComment = true;
              i++;
            } else if (ch === '"' || ch === "'" || ch === "`") {
              str = ch as '"' | "'" | "`";
            } else if (ch === "(") {
              depth++;
            } else if (ch === ")") {
              depth--;
            }
          }
          i++;
        }

        if (depth === 0) {
          // `i` is now just past the closing paren — replace the whole call
          // with `void 0` (a valid expression in any position).
          out += code.slice(lastIndex, callStart) + "void 0";
          lastIndex = i;
          modified = true;
          TARGET_RE.lastIndex = i;
        }
      }

      if (!modified) return null;
      out += code.slice(lastIndex);
      return { code: out, map: null };
    },
  };
}

export default defineConfig(({ mode, command }) => ({
  plugins: [react(), stripConsoleDebug()],
  base: mode === "zalo" && command === "build" ? "./" : "/",
  build: {
    polyfillModulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("/pages/Admin") ||
            id.includes("/pages/TutorPortal") ||
            id.includes("/pages/TutorFinance") ||
            id.includes("/layouts/AdminLayout") ||
            id.includes("/layouts/TutorPortalLayout")
          ) {
            return "portal-staff";
          }
        },
      },
    },
  },
  server:
    mode !== "zalo"
      ? {
          proxy: {
            "/api": {
              target: "http://localhost:5166",
              changeOrigin: true,
              secure: false,
            },
          },
        }
      : undefined,
}));
