# Agent- und Skill-Infrastruktur

Kurzüberblick für **KI-Coding-Agenten** und Maintainer: wo was liegt und in welcher Reihenfolge man lesen sollte.

## Lesereihenfolge

1. **[`AGENTS.md`](../AGENTS.md)** (Repo-Root) — **einzige Quelle der Wahrheit** für Stack, `pnpm`/Turborepo-Filter, Befehle, CI, Umgebungsvariablen, **Turborepo (Kurzreferenz für Agents)**, **Web Interface Guidelines**, Abhängigkeitsregeln.
2. **`AGENTS.md` im jeweiligen App-/Package-Ordner** — nur kontextspezifische Pfade, Befehle und Konventionen für dieses Paket (keine Wiederholung der Root-Inhalte).
3. **Diese Datei** — Skills, Lockfile, Verhältnis Root-Doku ↔ Skills.

## `AGENTS.md`-Baum (Kurz)

| Bereich        | Einstieg                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Apps (Auswahl) | [`apps/AGENTS.md`](../apps/AGENTS.md)                                                                                                 |
| Web            | [`apps/web/AGENTS.md`](../apps/web/AGENTS.md)                                                                                         |
| API            | [`apps/api/AGENTS.md`](../apps/api/AGENTS.md)                                                                                         |
| Desktop        | [`apps/desktop/AGENTS.md`](../apps/desktop/AGENTS.md)                                                                                 |
| Mobile         | [`apps/mobile/AGENTS.md`](../apps/mobile/AGENTS.md)                                                                                   |
| Pakete         | jeweils `packages/<name>/AGENTS.md` — siehe Root-Navigationstabelle (inkl. Integration: `datev-export`, `gaeb`, `bmecat`, `datanorm`) |

Vollständige Tabelle mit allen Pfaden: **[`AGENTS.md`](../AGENTS.md)** (Abschnitt **Navigation für Agents**).

## Skills unter `.agents/skills/`

| Skill         | Pfad                                                       | Wann nutzen                                                                                                                                                                                   |
| ------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **turborepo** | [`skills/turborepo/SKILL.md`](./skills/turborepo/SKILL.md) | Task-Pipelines, `turbo.json`, Cache, `--filter`/`--affected`, Boundaries, tiefe Referenz (`references/`) — **nach** Root-[`AGENTS.md`](../AGENTS.md), wenn Detail oder Anti-Pattern nötig ist |

**Konflikt:** Im Zweifel gilt immer **Root-[`AGENTS.md`](../AGENTS.md)** (projektspezifisch). Das Skill ergänzt mit generischer Turborepo-Dokumentation.

## `skills-lock.json`

[`skills-lock.json`](./skills-lock.json) protokolliert die **Herkunft** installierter Skills (z. B. GitHub-Quelle + Hash) für Reproduzierbarkeit. Änderungen an Skills manuell versionieren oder über euren Skill-Workflow aktualisieren.

## Neues Workspace-Paket

Beim Hinzufügen eines Pakets: `AGENTS.md` im Paket anlegen und in **[`AGENTS.md`](../AGENTS.md)** in der Navigationstabelle verlinken (siehe dort „Adding a workspace package“). Kein neues Skill nötig, außer ihr führt repo-weite Build-/Task-Muster ein, die das Turborepo-Skill nicht abdeckt.
