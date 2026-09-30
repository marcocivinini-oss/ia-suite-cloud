import fs from "fs";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default?.default || _traverse.default || _traverse;
const src = fs.readFileSync(process.argv[2], "utf8");
const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
const set = new Map();
const add = (s, kind) => { if (!s) return; const t = s.trim(); if (!t) return; if (!/[A-Za-zÀ-ÿ]{2}/.test(t)) return; set.set(t, kind); };
traverse(ast, {
  StringLiteral(p) {
    const par = p.parent;
    if (p.parentPath.isImportDeclaration() || p.parentPath.isExportDeclaration()) return;
    if (par.type === "ObjectProperty" && par.key === p.node) return;
    if (par.type === "JSXAttribute" && ["className","style","type","accept","href","src","id","name","key","rel","target","autoComplete","inputMode"].includes(par.name?.name)) return;
    add(p.node.value, "str");
  },
  JSXText(p) { add(p.node.value.replace(/\s+/g, " "), "jsx"); },
  TemplateElement(p) { add(p.node.value.cooked, "tpl"); },
});
const out = [...set.keys()].filter(s =>
  !/^[a-z_][a-zA-Z0-9_]*$/.test(s) &&          // identificatori
  !/^[#\d.%\s,:;()a-z-]*$/.test(s) &&          // css / numeri
  !/^(https?:|\/|\.)/.test(s) &&
  !/^[a-z-]+:\s/.test(s) &&
  !/\{|\}|=>|\bfunction\b|px\b|rgba|var\(/.test(s) &&
  !/^[A-Z_]{2,}$/.test(s)
);
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 0));
console.log(out.length, "strings;", out.join("").length, "chars");
