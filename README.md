# All in One

A mobile-first hub inside Obsidian for everyday life. Everything is stored as plain Markdown in your vault.

## Status

Early development (v0.1).

Available now:

- App-like view with bottom tabs and a quick capture button.
- Tasks: due dates, priority, daily/weekly/monthly recurrence, and lists. The file format is compatible with the Tasks plugin emoji format, e.g. `- [ ] Buy milk 🔁 every week ⏫ 📅 2026-11-20`.

Planned, in order:

1. Habits
2. Finances
3. Agenda
4. People and special dates, shopping lists, wishlist
5. Optional AI actions (bring your own API key)

## Data

Files live in a configurable root folder (default `Daily life`, or `Dia a dia` in Portuguese). Tasks are stored in `Tasks.md` (or `Tarefas.md`).

Level-2 headings are lists. Lines the plugin does not understand are left untouched.

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

v0.1 makes no network requests.

## License

MIT

---

## Português

Um hub para a vida cotidiana dentro do Obsidian, pensado primeiro para celular. Tudo é salvo como Markdown simples no seu cofre.

**Status:** desenvolvimento inicial (v0.1).

Disponível agora: visualização estilo aplicativo com abas inferiores, botão de captura rápida e Tarefas (datas de vencimento, prioridade, recorrência diária, semanal e mensal, e listas). O formato é compatível com o plugin Tasks, por exemplo `- [ ] Comprar leite 🔁 every week ⏫ 📅 2026-11-20`.

Próximos passos, em ordem: Hábitos, Finanças, Agenda, Pessoas e datas especiais, listas de compras e lista de desejos, e ações de IA opcionais (com sua própria chave de API).

**Dados:** os arquivos ficam em uma pasta raiz configurável (padrão `Dia a dia`). As tarefas ficam em `Tarefas.md`. Títulos de nível 2 são listas, e linhas que o plugin não entende são mantidas sem alteração.

**Instalação (beta):** pelo plugin BRAT, adicione `William-Colasso/all-in-one`. Ainda não está na loja de plugins da comunidade.

**Privacidade:** a v0.1 não faz requisições de rede.

**Licença:** MIT
