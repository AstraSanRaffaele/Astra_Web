import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import load from "./load.mjs";

const { isMedicineCalendarProfile, canUseCalendar } = load("eligibility");
const medicine = { facolta: "medicina", corso_di_laurea: "medicina_e_chirurgia" };

test("calendar eligibility accepts Medicine and Surgery values and legacy course labels", () => {
  for (const course of ["medicina_e_chirurgia", "Cdl magistrale a ciclo unico in Medicina e Chirurgia", "Medicina e Chirurgia", "Medicina e Chirurgia 2", "Medicina e Chirurgia 3"]) {
    assert.equal(isMedicineCalendarProfile({ ...medicine, corso_di_laurea: course }), true, course);
  }
});

test("other medical faculty courses, unrelated faculties and missing degrees are not eligible", () => {
  for (const course of ["fisioterapia", "ricerca_biotecnologica_in_medicina", "odontoiatria_e_protesi_dentaria", "international_medical_doctor_program", "", null]) {
    assert.equal(isMedicineCalendarProfile({ ...medicine, corso_di_laurea: course }), false, String(course));
  }
  assert.equal(isMedicineCalendarProfile({ ...medicine, facolta: "psicologia" }), false);
  assert.equal(isMedicineCalendarProfile(null), false);
});

test("the preview allows every admin, including a locked profile, while ordinary students await launch", () => {
  assert.equal(canUseCalendar({ role: "admin", facolta: "psicologia", corso_di_laurea: "psicologia", locked: false }), true);
  assert.equal(canUseCalendar({ ...medicine, role: "user" }), false);
  assert.equal(canUseCalendar({ ...medicine, role: "ADMIN" }), false);
  assert.equal(canUseCalendar({ ...medicine, role: "admin", locked: true }), true);
  assert.equal(canUseCalendar({ role: "admin", facolta: "psicologia", corso_di_laurea: "psicologia", locked: true }), true);
  assert.equal(canUseCalendar(null), false);
  const launched = load("eligibility", { "./config": { PUBLIC_CALENDAR_ENABLED: true } }).canUseCalendar;
  assert.equal(launched({ ...medicine, role: "user", locked: false }), true);
  assert.equal(launched({ ...medicine, role: "user", locked: true }), false);
  assert.equal(launched({ ...medicine, role: "user", corso_di_laurea: "fisioterapia" }), false);
});

test("the actual profile card links every admin to the calendar and keeps ordinary Medicine buttons disabled", () => {
  const filename = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../components/university-calendar/profile-calendar-card.tsx");
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const realRequire = createRequire(import.meta.url);
  const compiledCard = { exports: {} };
  const requireCard = (id) => id === "@/lib/university-calendar/eligibility" ? { isMedicineCalendarProfile, canUseCalendar }
    : id === "@/lib/university-calendar/config" ? load("config")
    : id.endsWith(".module.css") ? { default: {} }
    : id === "next/link" ? { default: "a" } : realRequire(id);
  new Function("require", "module", "exports", compiled)(requireCard, compiledCard, compiledCard.exports);
  const Card = compiledCard.exports.default;
  const html = renderToStaticMarkup(React.createElement(Card, { profile: medicine }));
  assert.match(html, /<button[^>]*disabled=""/);
  assert.match(html, /Prossimamente/);
  assert.match(html, /Crea il tuo calendario/);
  const admin = renderToStaticMarkup(React.createElement(Card, { profile: { role: "admin", facolta: "psicologia", corso_di_laurea: "psicologia" } }));
  assert.match(admin, /<a[^>]*href="\/profile\/calendario-universita"/);
  assert.match(admin, /Anteprima admin/);
  assert.doesNotMatch(admin, /disabled/);
  const locked = renderToStaticMarkup(React.createElement(Card, { profile: { ...medicine, role: "admin", locked: true } }));
  assert.match(locked, /<a[^>]*href="\/profile\/calendario-universita"/);
  assert.match(locked, /Anteprima admin/);
  assert.doesNotMatch(locked, /disabled/);
  assert.doesNotMatch(locked, /Prossimamente/);
  assert.equal(renderToStaticMarkup(React.createElement(Card, { profile: { ...medicine, corso_di_laurea: "fisioterapia" } })), "");
  assert.equal(renderToStaticMarkup(React.createElement(Card, { profile: null })), "");
});
