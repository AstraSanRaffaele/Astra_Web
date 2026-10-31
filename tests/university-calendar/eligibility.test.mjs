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
  for (const course of ["fisioterapia", "ricerca_biotecnologica_in_medicina", "odontoiatria_e_protesi_dentaria", "", null]) {
    assert.equal(isMedicineCalendarProfile({ ...medicine, corso_di_laurea: course }), false, String(course));
  }
  assert.equal(isMedicineCalendarProfile({ ...medicine, facolta: "psicologia" }), false);
  assert.equal(isMedicineCalendarProfile(null), false);
});

test("IMDP students can use the public calendar by profile value and official labels", () => {
  for (const course of ["international_medical_doctor_program", "International Medical Doctor Program", "IMDP", "International MD Program", "International MD Program (IMDP)", "International MD Program Corso di Laurea Magistrale in Medicina e Chirurgia"]) {
    const profile = { ...medicine, corso_di_laurea: course, role: "user" };
    assert.equal(isMedicineCalendarProfile(profile), true, course);
    assert.equal(canUseCalendar(profile), true);
    assert.equal(isMedicineCalendarProfile({ ...profile, facolta: "psicologia" }), false);
    assert.equal(canUseCalendar({ ...profile, locked: true }), true);
  }
});

test("the public calendar allows Medicine students and admins while preserving account and course restrictions", () => {
  assert.equal(canUseCalendar({ role: "admin", facolta: "psicologia", corso_di_laurea: "psicologia", locked: false }), true);
  assert.equal(canUseCalendar({ ...medicine, role: "user" }), true);
  assert.equal(canUseCalendar({ role: "ADMIN", facolta: "psicologia", corso_di_laurea: "psicologia" }), false);
  assert.equal(canUseCalendar({ ...medicine, role: "admin", locked: true }), true);
  assert.equal(canUseCalendar({ role: "admin", facolta: "psicologia", corso_di_laurea: "psicologia", locked: true }), true);
  assert.equal(canUseCalendar(null), false);
  assert.equal(canUseCalendar({ ...medicine, role: "user", locked: false }), true);
  assert.equal(canUseCalendar({ ...medicine, role: "user", locked: true }), true);
  assert.equal(canUseCalendar({ ...medicine, role: "user", corso_di_laurea: "fisioterapia" }), false);
});

test("closing the public switch still restricts students without removing admin access", () => {
  const closed = load("eligibility", { "./config": { PUBLIC_CALENDAR_ENABLED: false } }).canUseCalendar;
  assert.equal(closed({ ...medicine, role: "user", locked: false }), false);
  assert.equal(closed({ ...medicine, corso_di_laurea: "international_medical_doctor_program", role: "user" }), false);
  assert.equal(closed({ role: "admin", facolta: "psicologia", corso_di_laurea: "psicologia" }), true);
  assert.equal(closed(null), false);
});

test("the actual profile card opens the calendar for Medicine, IMDP and admins without preview labels", () => {
  const filename = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../app/(site)/profile/calendario-universita/_components/profile-calendar-card.tsx");
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const realRequire = createRequire(import.meta.url);
  const compiledCard = { exports: {} };
  const requireCard = (id) => id === "../_lib/eligibility" ? { isMedicineCalendarProfile, canUseCalendar }
    : id === "../_lib/config" ? load("config")
    : id.endsWith(".module.css") ? { default: {} }
    : id === "next/link" ? { default: "a" } : realRequire(id);
  new Function("require", "module", "exports", compiled)(requireCard, compiledCard, compiledCard.exports);
  const Card = compiledCard.exports.default;
  const html = renderToStaticMarkup(React.createElement(Card, { profile: medicine }));
  assert.match(html, /<a[^>]*href="\/profile\/calendario-universita"/);
  assert.match(html, /Per i tuoi studi/);
  assert.doesNotMatch(html, /Prossimamente|Anteprima admin|disabled/);
  assert.match(html, /Crea il tuo calendario/);
  const imdp = renderToStaticMarkup(React.createElement(Card, { profile: { ...medicine, corso_di_laurea: "international_medical_doctor_program" } }));
  assert.match(imdp, /<a[^>]*href="\/profile\/calendario-universita"/);
  assert.doesNotMatch(imdp, /Prossimamente|disabled/);
  assert.match(imdp, /IMDP/);
  const admin = renderToStaticMarkup(React.createElement(Card, { profile: { role: "admin", facolta: "psicologia", corso_di_laurea: "psicologia" } }));
  assert.match(admin, /<a[^>]*href="\/profile\/calendario-universita"/);
  assert.match(admin, /Per i tuoi studi/);
  assert.doesNotMatch(admin, /Anteprima admin/);
  assert.doesNotMatch(admin, /disabled/);
  const locked = renderToStaticMarkup(React.createElement(Card, { profile: { ...medicine, role: "admin", locked: true } }));
  assert.match(locked, /<a[^>]*href="\/profile\/calendario-universita"/);
  assert.match(locked, /Per i tuoi studi/);
  assert.doesNotMatch(locked, /disabled/);
  assert.doesNotMatch(locked, /Prossimamente/);
  for (const corso_di_laurea of ["medicina_e_chirurgia", "international_medical_doctor_program"]) {
    const student = renderToStaticMarkup(React.createElement(Card, { profile: { ...medicine, corso_di_laurea, role: "user", locked: true } }));
    assert.match(student, /<a[^>]*href="\/profile\/calendario-universita"/);
    assert.doesNotMatch(student, /Prossimamente|disabled/);
  }
  assert.equal(renderToStaticMarkup(React.createElement(Card, { profile: { ...medicine, corso_di_laurea: "fisioterapia" } })), "");
  assert.equal(renderToStaticMarkup(React.createElement(Card, { profile: null })), "");
});
