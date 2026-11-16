import { getLanguage } from "obsidian";

const en = {
  "app.name": "All in One",
  "cmd.open": "Open hub",
  "settings.root": "Root folder",
  "settings.root.desc": "Folder in your vault where All in One keeps its Markdown files.",
  "file.root": "Daily life",
  "file.tasks": "Tasks",
};

const ptBR: Record<keyof typeof en, string> = {
  "app.name": "All in One",
  "cmd.open": "Abrir painel",
  "settings.root": "Pasta raiz",
  "settings.root.desc": "Pasta do vault onde o All in One guarda seus arquivos Markdown.",
  "file.root": "Dia a dia",
  "file.tasks": "Tarefas",
};

export type Key = keyof typeof en;

export const isPt = () => getLanguage().toLowerCase().startsWith("pt");

export function t(key: Key, vars: Record<string, string | number> = {}): string {
  const s = (isPt() ? ptBR : en)[key] ?? en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}
