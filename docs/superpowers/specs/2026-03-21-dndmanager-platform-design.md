# DnD Manager — Hybrid Tabletop/Computerspiel Plattform

## Design Specification

**Datum:** 2026-03-21
**Status:** Approved
**Stack:** Next.js 15, Supabase, React Three Fiber, Claude API
**Lizenz:** Open Source
**Deployment:** Vercel + Supabase

---

## 1. Vision

Eine Plattform die Pathfinder 2e Tabletop-RPG mit Computerspiel-Elementen verbindet. Spieler erleben ihre Abenteuer in einer isometrischen 3D-Ansicht mit AI-generierten Charaktermodellen, dynamischem Fog of War und vollautomatischer Regelaufloesung. Der Gamemaster erstellt Szenarien per Claude Code mit einer deklarativen DSL, waehrend AI als Co-GM, NPC-Dialog-Engine und Atmosphaere-Generator das Spielerlebnis bereichert.

**Kernidee:** Die Plattform ist ein Modding-Framework. Der GM klont das Repo, oeffnet Claude Code und beschreibt was passieren soll. Claude Code kennt die Konventionen und generiert spielbare Szenarien.

---

## 2. Zielgruppe

- **Spieler:** PF2e-Spieler die ueber einen Browser einer Session beitreten (reine Web-App)
- **Gamemasters:** Technisch versierte GMs die mit CLI, Git und Claude Code arbeiten koennen
- **Self-Hoster:** Gruppen die die Plattform auf eigener Infrastruktur betreiben wollen

---

## 3. Tech-Stack & Infrastruktur

### Frontend
- **Next.js 15** (App Router) auf **Vercel**
- **React Three Fiber** + `@react-three/drei` fuer isometrische 3D-Spielansicht
- **Zustand** fuer Client-State (R3F-Oekosystem-Standard)
- **Tailwind CSS** + **shadcn/ui** fuer UI-Panels

### Backend
- **Supabase** als komplettes Backend:
  - **PostgreSQL** — Spielstaende, Charaktere, Kampagnen, Regelwerk-Daten
  - **Realtime** — Subscriptions fuer Spielzustand-Synchronisation
  - **Auth** — Spieler/GM-Authentifizierung
  - **Storage** — 3D-Modelle, Map-Tiles, Audio-Assets
  - **Edge Functions** — AI-Orchestrierung, Regelwerk-Validierung, serverseitige Wuerfe

### AI-Services (externe APIs)
- **Claude API** — NPC-Dialoge, Co-GM, Session-Journal, Charakter-Erstellung, Loot-Generierung, Regelwerk-Parsing
- **Meshy/Tripo3D API** — 3D-Charakter-Modell-Generierung
- **ElevenLabs / Suno API** — Atmosphaere-Soundscapes (optional)

### Monorepo-Tooling
- **pnpm Workspaces** + **Turborepo**
- **TypeScript strict** durchgehend
- **Vitest** fuer Unit/Integration-Tests
- **Playwright** fuer E2E-Tests

---

## 4. Monorepo-Struktur

```
dndmanager/
├── apps/
│   └── web/                        → Next.js 15 App (Vercel Deploy)
│       ├── app/
│       │   ├── (auth)/             → Login, Register
│       │   ├── (lobby)/            → Kampagnen-Uebersicht, Session-Beitritt
│       │   ├── (game)/             → Spielansicht (R3F Canvas)
│       │   ├── (character)/        → Charakter-Erstellung & -Verwaltung
│       │   ├── (gm)/              → GM-Dashboard, Encounter-Setup
│       │   └── api/               → API Routes (AI-Proxy, Webhooks)
│       └── components/
│           ├── game/              → R3F-Komponenten (Map, Token, FogOfWar)
│           ├── ui/                → shadcn/ui Komponenten
│           ├── character/         → Charakter-Sheet, Inventar, Spell-Book
│           └── gm/               → GM-Panels, Initiative-Tracker
│
├── packages/
│   ├── pf2e-engine/               → Regelwerk-Engine (pure TS, kein UI)
│   │   ├── rules/                 → Aktionssystem, Conditions, Modifikatoren
│   │   ├── combat/                → Initiative, Attack Resolution, Damage
│   │   ├── magic/                 → Spell-System, Spell-Slots, Traditions
│   │   ├── character/             → Ancestry, Class, Feats, Progression
│   │   ├── data/                  → PF2e-Daten (Spells, Items, Monsters, etc.)
│   │   └── validators/            → Regel-Validierung (legale Aktionen pruefen)
│   │
│   ├── game-runtime/              → Spielzustand & Synchronisation
│   │   ├── state/                 → Game State Machine (Exploration/Encounter/Downtime)
│   │   ├── turns/                 → Turn-Order, Aktions-Tracking (3 Actions + Reaction)
│   │   ├── fog/                   → Fog of War (Senses, Lichtquellen, Perception)
│   │   ├── movement/              → Grid-Bewegung, Pathfinding, Snap-Logik
│   │   └── sync/                  → Supabase Realtime Integration
│   │
│   ├── scene-framework/           → Szenario-Erstellung (fuer GM + Claude Code)
│   │   ├── dsl/                   → Szenario-DSL (deklarative Map/Encounter-Definition)
│   │   ├── templates/             → Vorgefertigte Szenario-Templates
│   │   ├── generators/            → Prozedurale Generatoren (Dungeons, Wilderness)
│   │   ├── entities/              → NPC, Monster, Trap, Hazard Definitionen
│   │   └── CLAUDE.md              → Konventionen fuer Claude Code Szenario-Erstellung
│   │
│   ├── ai-services/               → AI-Orchestrierung
│   │   ├── claude/                → Claude API Client (NPC, Co-GM, Journal, Loot)
│   │   ├── model-gen/             → 3D-Modell-Generierung (Meshy/Tripo3D)
│   │   ├── audio-gen/             → Atmosphaere-Audio-Generierung
│   │   ├── data-importer/         → AI-gestuetzter Regelwerk-Import
│   │   └── prompts/               → Prompt-Templates fuer alle AI-Features
│   │
│   ├── assets/                    → Statische Assets
│   │   ├── tiles/                 → Isometrische Map-Tiles
│   │   ├── models/                → Basis-3D-Modelle
│   │   ├── audio/                 → Basis-Soundeffekte
│   │   └── icons/                 → UI Icons
│   │
│   └── shared/                    → Geteilte Types & Utilities
│       ├── types/                 → TypeScript Interfaces
│       ├── constants/             → PF2e-Konstanten
│       └── utils/                 → Shared Helpers
│
├── scenarios/                     → GM-erstellte Szenarien (Claude Code Workspace)
│   ├── _template/                 → Szenario-Starter-Template
│   ├── example-dungeon/           → Beispiel-Szenario
│   └── CLAUDE.md                  → Master-Konventionen fuer Szenario-Entwicklung
│
├── docs/
│   ├── gm-guide/                  → Anleitung fuer GMs
│   ├── player-guide/              → Anleitung fuer Spieler
│   └── api/                       → Interne API-Dokumentation
│
├── CLAUDE.md                      → Root-Konventionen fuer Claude Code
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## 5. Datenbank-Schema

### Auth & Users
- `users` — Supabase Auth (id, email, avatar)
- `profiles` — Display-Name, Preferences, Rolle (player/gm)

### Kampagnen
- `campaigns` — Name, Beschreibung, GM (user_id), Settings (inkl. konfigurierbarer Rate Limits)
- `campaign_members` — User zu Campaign Zuordnung, Rolle
- `sessions` — Geplante/vergangene Sessions pro Kampagne

### Charaktere
- `characters` — Owner, Campaign, Name, Level, XP
- `character_abilities` — STR, DEX, CON, INT, WIS, CHA
- `character_classes` — Class, Subclass, Level (Multiclass-faehig)
- `character_feats` — Ancestry, Class, General, Skill Feats
- `character_spells` — Bekannte/vorbereitete Spells, Slots, Traditions
- `character_inventory` — Items mit Quantity, Bulk, Invested-Status
- `character_conditions` — Aktive Conditions mit Value und Source
- `character_3d_models` — Referenz auf generierte 3D-Modelle (Storage URL)
- `character_monster_knowledge` — Was der Charakter ueber Monster weiss (Recall Knowledge)

### PF2e Regelwerk (AI-importiert)
- `pf2e_ancestries` — Alle Ancestries + Heritages
- `pf2e_classes` — Alle Klassen + Features pro Level
- `pf2e_feats` — Alle Feats (Type, Level, Prerequisites, Traits)
- `pf2e_spells` — Alle Spells (Traditions, Components, Effects)
- `pf2e_items` — Alle Items (Weapons, Armor, Consumables, etc.)
- `pf2e_monsters` — Alle Monster (Stats, Abilities, Loot-Tables)
- `pf2e_conditions` — Condition-Definitionen + Regeln
- `pf2e_traits` — Trait-Definitionen
- `pf2e_actions` — Basis-Aktionen

### Game State (Realtime)
- `game_state` — Aktuelle Session: Mode (exploration/encounter/downtime)
- `game_map` — Aktive Map-Daten (Tiles, Dimensions, Terrain)
- `game_tokens` — Alle Tokens auf der Map (Position, Rotation, Sichtbar)
- `game_fog` — Fog-of-War State pro Spieler
- `game_initiative` — Initiative-Reihenfolge, aktiver Turn
- `game_action_log` — Jede Aktion protokolliert (Text-Log)

### Szenarien
- `scenarios` — GM-erstellte Szenarien (Metadaten)
- `scenario_maps` — Maps pro Szenario
- `scenario_encounters` — Vordefinierte Encounters
- `scenario_npcs` — NPCs mit Persoenlichkeit, Wissen, Dialog-Kontext
- `scenario_triggers` — Event-Trigger
- `scenario_loot_tables` — Custom Loot-Tabellen

### AI & Assets
- `ai_conversations` — AI-Dialog-History (NPC-Gespraeche, Co-GM)
- `ai_session_journals` — AI-generierte Session-Zusammenfassungen
- `generated_models` — 3D-Modell-Generierungs-Jobs (Status, URLs)
- `generated_audio` — Audio-Generierungs-Jobs

### Konfiguration
- `campaign_settings` — Pro-Kampagne konfigurierbare Limits und Einstellungen

---

## 6. Szenario-Framework & Claude Code Integration

### Szenario-DSL

Szenarien sind TypeScript-Dateien die die `scene-framework`-API nutzen:

```typescript
import { scenario, map, room, encounter, npc, trigger, loot } from '@dndmanager/scene-framework'

export default scenario({
  name: "Tempel der Schatten",
  level: { min: 3, max: 5 },
  description: "Ein verlassener Tempel...",

  maps: [
    map("temple-entrance", {
      tiles: "dungeon-stone",
      size: [20, 15],
      rooms: [
        room("entrance-hall", {
          position: [0, 0],
          size: [8, 6],
          lighting: "dim",
          terrain: [{ type: "difficult", area: [[2,3], [4,5]], reason: "Truemmer" }]
        }),
        room("ritual-chamber", {
          position: [10, 0],
          size: [10, 15],
          lighting: "darkness",
          features: ["altar", "portal-inactive"]
        })
      ],
      connections: [
        { from: "entrance-hall", to: "ritual-chamber", type: "corridor",
          length: 4, trap: "poison-dart-trap-lvl3" }
      ]
    })
  ],

  npcs: [
    npc("shadow-priestess", {
      monster: "pf2e:shadow-priestess",
      personality: "Arrogant, ueberzeugt von ihrer Mission.",
      knowledge: ["Das Portal fuehrt zur Schattenebene", "Sie braucht 3 Opfer"],
      dialogue_style: "Spricht in der dritten Person"
    })
  ],

  encounters: [
    encounter("guard-patrol", {
      room: "entrance-hall",
      trigger: "on_enter",
      monsters: [{ type: "pf2e:skeleton-guard", count: 4, positions: "spread" }],
      difficulty: "moderate",
      tactics: "Skelette blocken den Korridor"
    }),
    encounter("boss-fight", {
      room: "ritual-chamber",
      trigger: "manual",
      monsters: [
        { type: "shadow-priestess", position: [15, 7] },
        { type: "pf2e:shadow", count: 2, positions: "flanking-priestess" }
      ],
      difficulty: "severe",
      phases: [
        { hp_threshold: 0.5, action: "activate-portal",
          description: "Priesterin aktiviert das Portal" }
      ]
    })
  ],

  triggers: [
    trigger("portal-activation", {
      when: { encounter: "boss-fight", phase: "activate-portal" },
      effects: [
        { type: "spawn", monsters: [{ type: "pf2e:shadow", count: 3 }] },
        { type: "map_change", feature: "portal-inactive", to: "portal-active" },
        { type: "lighting", room: "ritual-chamber", to: "magical-darkness" },
        { type: "audio", ambience: "shadow-realm-whispers" }
      ]
    })
  ],

  loot: [
    loot("boss-reward", {
      encounter: "boss-fight",
      mode: "ai-generated",
      guaranteed: ["pf2e:shadow-priestess-staff"],
      context: "Schatten-Tempel, Party Level 3-5"
    })
  ]
})
```

### Claude Code Workflow fuer GMs

1. GM klont Repo, oeffnet Terminal
2. `claude` → "Erstelle ein Szenario: verlassene Zwergenmine mit 5 Raeumen..."
3. Claude Code liest `scenarios/CLAUDE.md`, kennt die DSL
4. Generiert `scenarios/dwarven-mine/index.ts`
5. `pnpm scenario:validate dwarven-mine` → Pruefung gegen PF2e-Regeln
6. GM verfeinert per Claude Code
7. Deploy auf Vercel → Szenario ist spielbar

---

## 7. Game Runtime & Spielzustand

### State Machine

```
EXPLORATION ←→ ENCOUNTER ←→ DOWNTIME
```

**Exploration Mode:**
- Freie Token-Bewegung (Grid-Snap, unsichtbares Raster)
- Dynamischer Fog of War basierend auf Senses + Lichtquellen
- Automatische Perception-Checks im Hintergrund
- Trigger-Pruefung bei Raum-Betreten

**Encounter Mode:**
- Automatische Initiative (Perception oder Stealth)
- Turn-Order mit aktiver Spieler-Hervorhebung
- 3 Aktionen + Free Actions + Reaction pro Turn
- Kontextuelles Aktionsmenue:
  - Strike (Ziele in Reichweite, MAP vorberechnet)
  - Move (erreichbare Felder hervorgehoben)
  - Cast a Spell (Slots, Reichweite/AoE-Overlay)
  - Skills (Trip, Grapple, Demoralize, Recall Knowledge...)
- Vollautomatische Regelaufloesung durch pf2e-engine
- Conditions automatisch getrackt

**Downtime Mode:**
- Crafting, Earn Income, Treat Wounds, Retraining
- AI generiert Session-Journal

### Synchronisation

- Supabase Realtime Subscriptions auf `game_*`-Tabellen
- Optimistic Updates: Spieler sieht Aktion sofort, Server validiert
- Bei Ablehnung: Rollback mit Fehlermeldung

### Fog of War Engine

Pro Spieler-Token:
1. Basis-Sichtradius (Perception + Senses: Darkvision, Low-Light)
2. Lichtquellen berechnen (Fackeln 20ft bright + 20ft dim)
3. Line-of-Sight Raycast (Waende/Tueren blocken)
4. Drei Zustaende: Sichtbar / Dim / Unsichtbar
5. GM sieht alles (kein Fog)

---

## 8. AI-Integration

### 1. NPC-Dialog-Engine

Jeder NPC hat eigenen Konversationskontext (Persoenlichkeit, Wissen, Beziehungen, Zustand, Dialogue-Style). Claude generiert In-Character-Antworten. GM sieht Entwurf vorab und kann freigeben, bearbeiten oder ablehnen.

### 2. Co-GM Assistent

Separater Chat-Stream nur fuer GM:
- Regelklaerungen
- Konsequenz-Vorschlaege bei unerwarteten Spieleraktionen
- Atmosphaere-Texte
- Improvisation (NPC-Hintergruende spontan generieren)
- Encounter-Balancing-Tipps

### 3. Session-Journal Generator

Nach jeder Session aus `game_action_log` + NPC-Dialoge + Encounter-Ergebnisse:
- Narrative Zusammenfassung (Prosa)
- Mechanische Zusammenfassung (XP, Loot, Level-Ups)
- NPC-Tracker Update
- Offene Quest-Threads

### 4. AI Charakter-Erstellung

Interaktiver Wizard:
1. Spieler beschreibt Charakter-Idee in natuerlicher Sprache
2. AI schlaegt PF2e-Optionen vor (Ancestry, Class, Background)
3. Spieler waehlt/modifiziert, AI erklaert Auswirkungen
4. AI validiert gegen PF2e-Regeln
5. Beschreibung → 3D-Modell-Generierung

### 5. AI-Loot & Audio

- **Loot:** Regelkonform nach Treasure-by-Level + thematisch passend + Story-Hooks
- **Audio:** Szene-Kontext → passende Soundscape-Auswahl/Generierung

### API-Kosten-Management
- Caching wo moeglich
- Rate-Limiting pro Session (konfigurierbar per Campaign Settings)
- Batch-Processing fuer Journal
- Audio nutzt vorab generierte Pools

---

## 9. 3D-Rendering & Isometrische Spielansicht

### R3F Canvas Hierarchie

```
R3F Canvas
├── IsometricCamera (45deg Rotation, 30deg Neigung, Zoom, Pan)
├── MapLayer (GroundTiles, WallTiles, PropTiles, TerrainOverlay, LightSources)
├── TokenLayer (PlayerTokens mit Animation, MonsterTokens, NPCTokens)
├── EffectsLayer (SpellEffects, ConditionIndicators, DamageNumbers, AoEPreview)
├── FogOfWarLayer (Explored, Visible, Darkness, DimLight Overlays)
├── InteractionLayer (GridHighlight, MovementRange, AttackRange, SpellTargeting)
└── UIOverlay (InitiativeBar, ActionBar, CharacterPanel, SpellBook, Inventory, GMOverlay)
```

### 3D-Modell-Pipeline

```
Spieler-Beschreibung → Claude API (optimierter Prompt)
→ Meshy/Tripo3D API (GLB/GLTF)
→ Post-Processing: Auto-Rigging, Animation-Set, Textur-Optimierung, LOD, Thumbnail
→ Supabase Storage (CDN-cached)
→ R3F Loader im Spiel
```

**Auto-Rigging Strategie:**
- **Primaer:** Mixamo (Adobe) — weit verbreiteter Service fuer Character-Rigging und Animationen
- **Fallback:** AccuRIG (Reallusion) oder Open-Source-Loesung (z.B. Rigify/Blender headless)
- **Evaluation in Phase 3:** Vor der Implementierung werden Mixamo-API-Verfuegbarkeit und Nutzungsbedingungen geprueft. Falls instabil oder restriktiv, wird auf die Fallback-Loesung gewechselt
- Animation-Sets (Idle, Walk, Attack, Cast, Hit, Death) werden als Standard-Set vorgehalten und auf jedes geriggede Modell angewendet

### Performance
- Instancing (gleiche Monster teilen Geometrie)
- LOD (vereinfachte Modelle bei rausgezoomter Kamera)
- Frustum Culling
- Lazy Loading
- Texture Atlas fuer Map-Tiles

---

## 10. Charakter-System & PF2e Engine

### Charakter-Datenmodell

Vollstaendiges PF2e-Charakter-Modell mit:
- Ancestry, Heritage, Ancestry Feats
- Class, Subclass, Class Feats, Class DC
- Background
- Ability Scores (Boost-System)
- Computed Stats (HP, AC, Saves, Perception, Speed, Attack Bonuses)
- Skills (17 PF2e Skills mit Proficiency)
- Spellcasting (Tradition, Slots, Known/Prepared)
- Inventory (Items, Bulk, Gold)
- Conditions (mit Value und Source)
- Senses (Darkvision, Low-Light, Scent)

### Regelaufloesung

```
Aktion gewaehlt → Validierung (legal?) → Modifikatoren sammeln
→ d20 + Mods vs DC → 4-Stufen-Ergebnis (Crit Success/Success/Failure/Crit Failure)
→ Effekte anwenden (Damage, Conditions, HP) → State Update an alle Clients
```

Modifikatoren: Ability, Proficiency, Item, Circumstance (Flanking), Condition, Status, MAP — korrekte Stacking-Regeln (gleicher Typ stapelt nicht).

### Pathbuilder 2e Import

JSON Import → Parser (Pathbuilder-Format → eigenes Schema) → Fuzzy-Match fuer IDs → Validierung → AI erklaert Konflikte.

### Level-Up (AI-gestuetzt, Phase 4)

XP-Schwelle erreicht → AI schlaegt Feats/Spells vor basierend auf Build, Party und Spielstil → Spieler waehlt → Validierung.

---

## 11. Player UI & GM Dashboard

### Player-Layout

```
┌─────────────────────────────────────────────────────────┐
│ Initiative Bar (Encounter only)                         │
├────────┬────────────────────────────────────┬───────────┤
│ Char   │      Isometrische Spielansicht     │ Context   │
│ Panel  │          (R3F Canvas)              │ Panel     │
│ HP/AC  │                                    │ NPC/Loot  │
│ Stats  │                                    │ Journal   │
├────────┴────────────────────────────────────┴───────────┤
│ Action Bar (Encounter, aktiver Spieler)                 │
│ [Strike] [Move] [Cast] [Skill] [Free]  Actions: 3/3    │
├─────────────────────────────────────────────────────────┤
│ Audio Controls                              Minimap     │
└─────────────────────────────────────────────────────────┘
```

Panels einklappbar/verschiebbar. Exploration Mode: keine Action/Initiative Bar.

### GM-Dashboard

Volle Kartenansicht ohne Fog + Szenario-Steuerung + Co-GM Chat + Monster-Stats + Initiative-Tracker.

GM-Funktionen: Monster spawnen (aus Szenario, ad-hoc, per AI), NPC-Dialog steuern (freigeben/bearbeiten/ablehnen), Encounter starten/beenden, Trigger manuell ausloesen, Regeln ueberschreiben (GM-Fiat).

### Responsive
- Desktop: Volles Layout
- Tablet: Panels als Tabs
- Mobile: Nur Charakter-Sheet + Wuerfeln (Notfall)

---

## 12. Audio-Atmosphaere-System

### Drei Audio-Layer

1. **Ambience** (durchgehend) — ortsbasiert, Crossfade bei Raumwechsel
2. **Musik** (stimmungsabhaengig) — Exploration/Tension/Combat/Boss/Victory/Death
3. **Sound Effects** (ereignisbasiert) — Wuerfel, Crits, Spells, Tueren, Monster, Level-Up

### Audio-Quellen

- Prioritaet 1: Kuratierte Bibliothek (freie Sounds, Community-beigetragen)
- Prioritaet 2: AI-generiert (Suno/ElevenLabs, optional, kostenpflichtig)
- Fallback: Stille mit Text-Beschreibung

### AI-Audio-Pipeline

Szenario laden → AI analysiert Raeume/Encounters → generiert/waehlt Audio-Sets → Cache in Supabase Storage → Client prefetched aktuelle + angrenzende Raeume.

Jeder Spieler steuert eigenes Audio-Mix (Master, Musik, Ambience, Effekte). GM kann Audio-Events manuell triggern.

---

## 13. Regelwerk-Datenbank & AI-Import

### Datenquellen
- Archives of Nethys (aonprd.com)
- PF2e SRD Daten
- Foundry VTT pf2e-system (GitHub, strukturierte JSON)

### Import-Pipeline

1. **Crawling:** Fetcht oeffentliche Quellen (robots.txt, Rate-Limits respektiert)
2. **Parsing:** Claude API extrahiert strukturierte Daten aus HTML/JSON
3. **Validierung:** Zod Schema-Validierung, referenzielle Integritaet, Plausibilitaet, Duplikaterkennung
4. **Inkrementeller Sync:** Diff gegen DB, neue/geaenderte Eintraege, Errata automatisch

### Daten-Umfang (PF2e Remastered)
- ~40 Ancestries, ~20 Classes, ~2000+ Feats, ~800+ Spells
- ~3000+ Items, ~1500+ Monsters, ~40 Conditions, ~300+ Traits

### Lizenz-Compliance (ORC)

PF2e Remastered nutzt die **ORC-Lizenz** (Open RPG Creative License), nicht OGL.

- Nur mechanische Daten importieren (unter ORC frei nutzbar)
- Product Identity (Paizo-spezifische Namen, Settings) geflaggt und separat behandelt
- AI generiert eigene Beschreibungen wo noetig
- `orc_compliant` Flag pro Datensatz fuer Audit

**Datenquellen-Lizenzierung:**
- **Archives of Nethys:** Offiziell von Paizo autorisierte Online-Referenz, ORC-lizenzierte Inhalte
- **Foundry VTT pf2e-system:** Code unter GPL, Spieldaten unter ORC — nur ORC-Daten importieren, kein Foundry-Code
- **PF2e SRD:** ORC-lizenziert

Die Import-Pipeline muss pro Quelle den Lizenz-Typ tracken. Ein Compliance-Check ist Teil der Validierung.

### Hausregeln-Layer
- Offizielle Daten = read-only Base Layer
- Kampagne kann Override-Layer haben
- GM kann Regeln anpassen

---

## 14. Sicherheit & Permissions

### Row Level Security (RLS)

- Spieler sehen nur eigene Charakter-Details + oeffentliche Infos anderer PCs
- Monster-Stats nur nach erfolgreichem Recall Knowledge (siehe Recall Knowledge Modell unten)
- Fog-of-War filtert pro Spieler
- GM hat vollen Zugriff auf seine Kampagne
- PF2e-Regelwerk read-only fuer alle

### Informations-Asymmetrie

Spieler sehen NICHT: Monster-HP (nur Zustandsbeschreibung), Monster-Stats (bis Recall Knowledge), Fallen, versteckte NPCs, GM-Notizen, zukuenftige Raeume.

### Recall Knowledge Modell

`character_monster_knowledge` speichert strukturierte Wissens-Stufen pro Monster-Typ:

```
knowledge_entries:
├── level: "none"     → Spieler weiss nichts
├── level: "basic"    → Kreatur-Typ, Traits (Critical Success auf niedrigem DC)
├── level: "moderate" → + Schwaechen, Resistenzen, AC-Bereich
├── level: "detailed" → + Spezial-Abilities, Saves, bekannte Angriffe
└── level: "expert"   → + exakte Stats (wie GM-Sicht)
```

Jeder erfolgreiche Recall Knowledge Check erhoeht die Stufe um 1 (Critical Success um 2). Die Stufe bestimmt welche Felder der `game_tokens`-RLS-Policy fuer diesen Spieler sichtbar sind. Wissen ist pro Charakter, nicht pro Spieler — verschiedene PCs koennen unterschiedlich viel wissen. Wissen gilt fuer den Monster-Typ, nicht die Instanz (wer Goblins kennt, kennt alle Goblins).

### Secret Rolls

PF2e Secret Rolls (Recall Knowledge, Sense Motive, Perception fuer Fallen) werden serverseitig gewuerfelt. Nur GM sieht Ergebnis und entscheidet was der Spieler erfaehrt.

### Anti-Cheat

- Alle Wuerfelwuerfe serverseitig (Edge Functions)
- Bewegungsvalidierung serverseitig
- Charakter-Modifikationen nur ueber validierte Endpoints
- Game State Aenderungen nur durch autorisierte Aktionen

### Rate Limits (konfigurierbar)

Alle Limits sind ueber Campaign Settings editierbar:
- AI-Calls pro Stunde (Default: 50)
- 3D-Modell-Generierungen pro Tag (Default: 5)
- Audio-Generierungen pro Session (Default: 20)
- Realtime Updates pro Minute (Default: 60)
- Data Retention (AI-Conversations, Snapshots, Action Logs)

Self-Hoster koennen zusaetzlich globale Limits via `.env` setzen.

### Datenschutz

- AI-Konversationen nach konfigurierbarer Zeit geloescht
- 3D-Modelle gehoeren dem User (Export jederzeit)
- Keine Analytics ueber Spielverhalten
- DSGVO-konform

---

## 15. Deployment & DevOps

### Production Stack

- **Vercel:** Next.js App, Edge/Serverless Functions, CDN
- **Supabase:** PostgreSQL, Realtime, Auth, Storage, Edge Functions
- **Externe APIs:** Claude, Meshy/Tripo3D, ElevenLabs/Suno (optional)

### CI/CD (GitHub Actions)

Push to main → Lint → Type Check → Unit Tests (pf2e-engine, game-runtime, scene-framework) → Integration Tests (Supabase Local Docker) → Build (Turborepo) → Deploy (Vercel).

### Self-Hosting

`docker-compose.yml` mit Supabase Stack + Next.js Container. Setup: `git clone` → `.env` konfigurieren → `docker-compose up` → `pnpm db:migrate` → `pnpm db:seed` → `pnpm data:import`.

---

## 16. Testing-Strategie

### Unit Tests (Vitest)
- **pf2e-engine:** Modifier-Stacking, MAP, Crit-Regeln, Conditions, Spell-Heightening
- **game-runtime:** State Machine Transitions, Fog of War, Line of Sight
- **scene-framework:** Szenario-Validierung, Encounter-Budget, zyklische Trigger

### Integration Tests
- RLS-Tests gegen Supabase Local (Docker)
- Realtime Propagation Tests
- Edge Function Tests (serverseitige Wuerfe)
- Migration Idempotenz

### E2E Tests (Playwright)
- Registrierung → Kampagne → Charakter → Session → Kampf
- GM-Workflows (Monster spawnen, Encounter, NPC-Dialog)
- Session-Lifecycle (Start → Spiel → Ende → Journal)

### PF2e Compliance Tests
- Bekannte Regelwerk-Szenarien als Regression-Tests
- Community-sourced Edge Cases

---

## 17. Projekt-Phasen

### Phase 1 — Foundation (MVP)
Ziel: Eine spielbare Session von A bis Z.
- Monorepo + Supabase + Next.js Setup
- Manuelle Charakter-Erstellung
- pf2e-engine Kern (Abilities, Strike, Move, Attack Resolution, Damage, Basis-Conditions)
- Game Runtime (State Machine, Initiative, Turns, Realtime Sync)
- R3F Spielansicht (Iso-Kamera, Tile-Map, 2D-Token-Platzhalter, Grid-Highlight)
- Szenario-Framework Basis (DSL, Beispiel-Szenario, CLAUDE.md)
- GM Dashboard Basis (Encounter starten, Monster spawnen, Turn weiterschalten)
- Kampagnen & Session-Management

### Phase 2 — Core Experience
Ziel: Vollwertiges PF2e-Erlebnis.
- AI Charakter-Erstellung + Pathbuilder Import
- pf2e-engine Erweiterung (Spells, Skills, Secret Rolls, Conditions, Reactions)
- AI-Import-Pipeline (Regelwerk-Daten)
- Fog of War + Aktionsmenue + Encounter-Difficulty
- Loot-System + Action Log

### Phase 3 — AI & Immersion
Ziel: AI-Features und 3D.
- 3D-Charakter-Modelle (Generierung, Rigging, Animationen)
- NPC-Dialog-Engine + Co-GM + Session-Journal
- AI-Loot-Generierung
- Audio-System (Ambience, Musik, Effects)
- Erweiterte Tiles + Prozedurale Generatoren

### Phase 4 — Polish & Community
Ziel: Vollstaendige Vision.
- AI-Audio-Generierung
- AI-Custom-Assets
- Level-Up Wizard
- Downtime-System
- Erweiterte Trigger-Logik
- Self-Hosting Docker
- Community-Szenario-Sharing
- Performance-Optimierung
- Dokumentation
