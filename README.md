# All in One

A mobile-first hub inside Obsidian for everyday life. Everything is stored as plain Markdown in your vault.

## Status

Early development (v0.2).

Available now:

- App-like view with bottom tabs and a quick capture button.
- Tasks: due dates, priority, daily/weekly/monthly recurrence, and lists. The file format is compatible with the Tasks plugin emoji format, e.g. `- [ ] Buy milk 🔁 every week ⏫ 📅 2026-11-20`.
- Habits: yes/no or amount goals, every day, fixed weekdays or N times a week; streaks, weekly dots, 30-day rate and a monthly heat map.

Planned, in order:

1. Finances
2. Agenda
3. People and special dates, shopping lists, wishlist
4. Optional AI actions (bring your own API key)

## Data

Files live in a configurable root folder (default `Daily life`, or `Dia a dia` in Portuguese). Tasks are stored in `Tasks.md` (or `Tarefas.md`).

Level-2 headings are lists. Lines the plugin does not understand are left untouched.

Habits are defined in `Habits.md` (`Hábitos.md`), one per line, e.g. `- Water [goal:: 8] [unit:: glasses]`, `- Gym [freq:: 3/week]`, `- English [days:: mon,wed,fri]`. Each month has a log file in the `Habits/` folder with one line per day, e.g. `- 2026-11-15 [Water:: 6]`.

## Install (beta)

Install with the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin by adding `William-Colasso/all-in-one`.

Not yet in the community plugin store.

## Development

```sh
npm install
npm run dev     # watch build
npm test
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/all-in-one/`.

## Privacy

The plugin makes no network requests.

## License

MIT

---

## Português

Um hub para a vida cotidiana dentro do Obsidian, pensado primeiro para celular. Tudo é salvo como Markdown simples no seu cofre.

**Status:** desenvolvimento inicial (v0.2).

Disponível agora: visualização estilo aplicativo com abas inferiores, botão de captura rápida e Tarefas (datas de vencimento, prioridade, recorrência diária, semanal e mensal, e listas) e Hábitos (sim/não ou com meta, diários, em dias fixos ou N vezes por semana, com sequência, taxa de 30 dias e mapa mensal). O formato das tarefas é compatível com o plugin Tasks, por exemplo `- [ ] Comprar leite 🔁 every week ⏫ 📅 2026-11-20`.

Próximos passos, em ordem: Finanças, Agenda, Pessoas e datas especiais, listas de compras e lista de desejos, e ações de IA opcionais (com sua própria chave de API).

**Dados:** os arquivos ficam em uma pasta raiz configurável (padrão `Dia a dia`). As tarefas ficam em `Tarefas.md`. Títulos de nível 2 são listas, e linhas que o plugin não entende são mantidas sem alteração.

**Instalação (beta):** pelo plugin BRAT, adicione `William-Colasso/all-in-one`. Ainda não está na loja de plugins da comunidade.

**Privacidade:** o plugin não faz requisições de rede.

**Licença:** MIT
