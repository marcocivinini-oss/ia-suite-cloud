import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import _generate from "@babel/generator";
import * as t from "@babel/types";

const traverse = _traverse.default?.default || _traverse.default || _traverse;
const generate = _generate.default?.default || _generate.default || _generate;

// Plugin "i18n": avvolge in __t("…") ogni testo di App.jsx presente nel dizionario src/en.json.
// A runtime __t restituisce il testo originale per la S.r.l. e la traduzione per la Inc.
function i18nWrap() {
  const dict = JSON.parse(fs.readFileSync(new URL("./src/en.json", import.meta.url), "utf8"));
  const has = (s) => typeof s === "string" && Object.prototype.hasOwnProperty.call(dict, s.trim());
  const call = (s) => t.callExpression(t.identifier("__t"), [t.stringLiteral(s)]);
  return {
    name: "ia-i18n-wrap",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith("/src/App.jsx")) return null;
      const ast = parse(code, { sourceType: "module", plugins: ["jsx"] });
      traverse(ast, {
        StringLiteral(p) {
          const par = p.parent;
          if (!has(p.node.value)) return;
          if (p.parentPath.isImportDeclaration() || p.parentPath.isExportDeclaration()) return;
          if ((par.type === "ObjectProperty" || par.type === "ObjectMethod") && par.key === p.node) return;
          if (par.type === "CallExpression" && par.callee.type === "Identifier" && par.callee.name === "__t") return;
          if (par.type === "JSXAttribute") {
            if (p.node.value === "EUR") return; // le opzioni di valuta restano tali
            p.replaceWith(t.jsxExpressionContainer(call(p.node.value)));
            p.skip(); return;
          }
          p.replaceWith(call(p.node.value)); p.skip();
        },
        JSXText(p) {
          const v = p.node.value;
          if (!v.trim() || !has(v.replace(/\s+/g, " "))) return;
          const norm = v.replace(/\s+/g, " ");
          p.replaceWith(t.jsxExpressionContainer(call(norm))); p.skip();
        },
        TemplateLiteral(p) {
          if (p.parent.type === "TaggedTemplateExpression") return;
          const q = p.node.quasis;
          if (!q.some((e) => e.value.cooked && has(e.value.cooked))) return;
          // `a${x}b` → __t("a") + String(x) + __t("b")
          let expr = null;
          const push = (e) => { expr = expr ? t.binaryExpression("+", expr, e) : e; };
          q.forEach((e, i) => {
            const s = e.value.cooked ?? "";
            push(has(s) ? call(s) : t.stringLiteral(s));
            if (i < p.node.expressions.length) push(t.callExpression(t.identifier("String"), [p.node.expressions[i]]));
          });
          p.replaceWith(expr); p.skip();
        },
      });
      const out = generate(ast, { retainLines: true }, code);
      return { code: out.code, map: null };
    },
  };
}

export default defineConfig({
  plugins: [i18nWrap(), react()],
  server: { port: 5173 },
});
