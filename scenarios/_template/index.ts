import { scenario, map, room, encounter, npc, trigger, loot } from '@dndmanager/scene-framework'

export default scenario({
  name: "Szenario-Name",
  level: { min: 1, max: 3 },
  description: "Kurze Beschreibung des Szenarios.",

  maps: [
    map("main-map", {
      tiles: "dungeon-stone",
      size: [15, 10],
      rooms: [
        room("starting-room", {
          position: [0, 0],
          size: [6, 6],
          lighting: "bright",
          terrain: [],
        }),
      ],
      connections: [],
    }),
  ],

  npcs: [],

  encounters: [],

  triggers: [],

  loot: [],
})
