# All in One

A mobile-first hub inside Obsidian for everyday life. Everything is stored as plain Markdown in your vault.

## Status

Early development (v0.6). Requires Obsidian 1.11.4 or later.

Available now:

- App-like view with bottom tabs and a quick capture button.
- Tasks: due dates, priority, daily/weekly/monthly recurrence, and lists. The file format is compatible with the Tasks plugin emoji format, e.g. `- [ ] Buy milk 🔁 every week ⏫ 📅 2026-11-20`.
- Habits: yes/no or amount goals, every day, fixed weekdays or N times a week; streaks, weekly dots, 30-day rate and a monthly heat map.
- Finances: expenses and income by month, totals, spending by category with optional budgets, and fixed monthly bills that stay "to settle" until confirmed.
- Agenda: appointments with optional time and daily/weekly/monthly/yearly repeat, listed chronologically together with dated tasks; send one to Google Calendar or export it as an `.ics` file.
- People and dates: one note per person (birthday, relation, likes, sizes, gift ideas, gifts given) and yearly special dates linked to people; both show up in the Agenda and as reminders on Today.
- Lists: shopping lists with quick add and "clear checked", and a wishlist with optional price and link.
- Optional AI actions (bring your own API key): gift suggestions for a person, research on a wishlist item, a category suggestion for an expense, and a one-off question about the current note. Answers are previewed and nothing is written until you confirm: gift suggestions come back as an editable checklist (name and price) that you add to the person's gift ideas, and wishlist research lists offers you can apply to the wish and alternatives you can add to the wishlist. Answers are written in the note's `lang` (or `language`) property when it has one, otherwise in Obsidian's language.

## Data

Files live in a configurable root folder (default `Daily life`, or `Dia a dia` in Portuguese). Tasks are stored in `Tasks.md` (or `Tarefas.md`).

Level-2 headings are lists. Lines the plugin does not understand are left untouched.

Habits are defined in `Habits.md` (`Hábitos.md`), one per line, e.g. `- Water [goal:: 8] [unit:: glasses]`, `- Gym [freq:: 3/week]`, `- English [days:: mon,wed,fri]`. Each month has a log file in the `Habits/` folder with one line per day, e.g. `- 2026-11-15 [Water:: 6]`.

Transactions go in one file per month in the `Finances/` folder (`Finanças/`), e.g. `- 2026-11-15 -42.50 Bread and milk [cat:: Groceries]` (negative = expense). Categories, budgets and fixed bills are defined in `Finances.md`, e.g. `- Groceries [budget:: 800]`, `- Rent [amount:: -1500] [day:: 5] [cat:: Housing]`. The currency used for display is set in the plugin settings.

Appointments are one line each in `Agenda.md`, e.g. `- 2026-11-20 15:00 Dentist`, `- 2026-12-25 Christmas [repeat:: yearly]`.

Each person is a note in `People/` (`Pessoas/`) whose data lives in its properties (`birthday`, `relation`, `likes`, `sizes`, `gift-ideas`, `gifts-given`); the note body is yours. Special dates are lines in `Dates.md`, e.g. `- 12-25 Christmas [people:: Ana, João] [lead:: 21]`. Each shopping list is a checkbox note in `Lists/`, and the wishlist is `Wishlist.md`, e.g. `- [ ] Keyboard [price:: 450] [link:: https://example.com]`.

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

## AI (optional)

Off until you configure it in the plugin settings. Two kinds of provider are supported:

- Anthropic (Claude), with optional web search per request. Default model `claude-opus-5-5`; any Claude model id works.
- Any OpenAI-compatible server (OpenAI, OpenRouter, Gemini's compatibility endpoint, Ollama, LM Studio): set the base URL and model. No web search.

The API key is kept in Obsidian's secret storage, not in the plugin's data file. Usage is billed by your provider.

## Privacy

Without AI configured, the plugin makes no network requests. When you run an AI action, the text that action needs is sent to the provider you chose: a person's relation, age, likes, sizes and gift lists (not their name) for gift suggestions; the wish text, price and link for wishlist research; the expense description and your category names for a category suggestion; the whole note and your question for "Ask AI about this note". With web search on, the provider also runs searches based on that text. "Add to Google Calendar" opens a calendar.google.com link in your browser or calendar app, with the appointment's title and date in the URL, only when you tap it.

## License

MIT

---

## Português

Um hub para a vida cotidiana dentro do Obsidian, pensado primeiro para celular. Tudo é salvo como Markdown simples no seu cofre.

**Status:** desenvolvimento inicial (v0.6; requer Obsidian 1.11.4 ou mais recente).

Disponível agora: visualização estilo aplicativo com abas inferiores, botão de captura rápida e Tarefas (datas de vencimento, prioridade, recorrência diária, semanal e mensal, e listas) e Hábitos (sim/não ou com meta, diários, em dias fixos ou N vezes por semana, com sequência, taxa de 30 dias e mapa mensal) e Finanças (despesas e receitas por mês, totais, gastos por categoria com orçamento opcional e contas fixas que ficam "a confirmar") e Agenda (compromissos com horário opcional e repetição, em lista cronológica junto com as tarefas com data; envio para o Google Agenda ou exportação em `.ics`), Pessoas e datas (uma nota por pessoa com aniversário, gostos, tamanhos e presentes; datas comemorativas anuais com lembretes em Hoje) e Listas (compras e desejos). O formato das tarefas é compatível com o plugin Tasks, por exemplo `- [ ] Comprar leite 🔁 every week ⏫ 📅 2026-11-20`.

Ações de IA opcionais (com sua própria chave de API, guardada no cofre de segredos do Obsidian): sugestão de presentes para uma pessoa, pesquisa sobre um item da lista de desejos, sugestão de categoria para um gasto e uma pergunta avulsa sobre a nota atual. A resposta aparece em prévia e só é gravada quando você toca em "Adicionar à nota". Provedores: Anthropic (Claude, com pesquisa na web opcional) ou qualquer servidor compatível com OpenAI.

**Dados:** os arquivos ficam em uma pasta raiz configurável (padrão `Dia a dia`). As tarefas ficam em `Tarefas.md`. Títulos de nível 2 são listas, e linhas que o plugin não entende são mantidas sem alteração.

**Instalação (beta):** pelo plugin BRAT, adicione `William-Colasso/all-in-one`. Ainda não está na loja de plugins da comunidade.

**Privacidade:** sem IA configurada, o plugin não faz requisições de rede. Ao rodar uma ação de IA, o texto necessário para ela é enviado ao provedor escolhido (para sugestão de presentes: relação, idade, gostos, tamanhos e listas de presentes, sem o nome da pessoa; para "Perguntar à IA sobre esta nota": a nota inteira e a pergunta). "Adicionar ao Google Agenda" abre um link do calendar.google.com, com título e data do compromisso na URL, só quando você toca.

**Licença:** MIT
