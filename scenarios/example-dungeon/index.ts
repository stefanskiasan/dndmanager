import { scenario, map, room, encounter, npc, trigger, loot } from '@dndmanager/scene-framework'

export default scenario({
  name: "Goblin-Hoehle",
  level: { min: 1, max: 2 },
  description: "Eine kleine Goblin-Hoehle als Einstiegsabenteuer. Die Spieler muessen die Goblins besiegen und den gestohlenen Handelskarren zurueckholen.",

  maps: [
    map("cave", {
      tiles: "cave-stone",
      size: [15, 12],
      rooms: [
        room("entrance", {
          position: [0, 4],
          size: [4, 4],
          lighting: "bright",
          terrain: [
            { type: "difficult", area: [[1, 5], [2, 6]], reason: "Gestrueppbueschel" }
          ],
        }),
        room("guard-post", {
          position: [5, 3],
          size: [5, 6],
          lighting: "dim",
          terrain: [],
          features: ["campfire", "wooden-barricade"],
        }),
        room("boss-chamber", {
          position: [11, 2],
          size: [4, 8],
          lighting: "dim",
          terrain: [
            { type: "difficult", area: [[12, 4], [13, 6]], reason: "Gestohlene Waren" }
          ],
          features: ["stolen-cart", "crude-throne"],
        }),
      ],
      connections: [
        { from: "entrance", to: "guard-post", type: "open", length: 2 },
        { from: "guard-post", to: "boss-chamber", type: "door", length: 1 },
      ],
    }),
  ],

  npcs: [
    npc("goblin-boss", {
      monster: "pf2e:goblin-warrior",
      personality: "Feige aber laut. Versteckt sich hinter seinen Schergen.",
      knowledge: [
        "Hat den Handelskarren ueberfallen",
        "Hat 6 Goblins unter seinem Kommando",
        "Fuerchtet Feuer",
      ],
      dialogue_style: "Kreischt und droht in gebrochenem Common",
    }),
  ],

  encounters: [
    encounter("guard-encounter", {
      room: "guard-post",
      trigger: "on_enter",
      monsters: [
        { type: "pf2e:goblin-warrior", count: 3, positions: "spread" },
      ],
      difficulty: "moderate",
      tactics: "Goblins werfen zunaechst Gegenaende, dann greifen sie im Nahkampf an",
    }),
    encounter("boss-encounter", {
      room: "boss-chamber",
      trigger: "manual",
      monsters: [
        { type: "pf2e:goblin-warrior", count: 2, positions: "guarding-crude-throne" },
        { type: "pf2e:goblin-warrior", position: [12, 6] },
      ],
      difficulty: "severe",
      tactics: "Boss bleibt hinten, Wachen greifen zuerst an",
      phases: [
        { hp_threshold: 0.3, action: "surrender", description: "Der Boss gibt auf und bettelt um sein Leben" },
      ],
    }),
  ],

  triggers: [
    trigger("boss-surrender", {
      when: { encounter: "boss-encounter", phase: "surrender" },
      effects: [
        { type: "narrative", text: "Der Goblin-Boss wirft seine Waffe weg und kniet nieder." },
      ],
    }),
  ],

  loot: [
    loot("guard-loot", {
      encounter: "guard-encounter",
      mode: "fixed",
      guaranteed: ["pf2e:shortbow", "pf2e:dogslicer"],
    }),
    loot("boss-loot", {
      encounter: "boss-encounter",
      mode: "ai-generated",
      guaranteed: ["pf2e:minor-healing-potion"],
      context: "Goblin-Hoehle, Party Level 1-2, gestohlene Handelsgueter",
    }),
  ],
})
