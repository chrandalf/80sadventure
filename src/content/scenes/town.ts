import type { Scene } from '../../game/types';

const OUTDOOR = [[6, 100, 314, 100, 318, 140, 2, 140]];
const OUTDOOR_DEPTH = { yNear: 140, yFar: 100, scaleNear: 1, scaleFar: 0.66 };

/**
 * Brighton Vale (spec s.5). The seafront is the hub; everything else hangs off
 * it, which is what makes the town feel connected when the player starts
 * doubling back and noticing things have changed (spec s.25).
 */
export const TOWN_SCENES: Record<string, Scene> = {
  seafront: {
    id: 'seafront',
    name: 'The Seafront',
    background: 'seafront',
    music: 'seafront',
    walkboxes: OUTDOOR,
    depth: OUTDOOR_DEPTH,
    entries: {
      default: { x: 160, y: 128, facing: 'south' },
      fromArcade: { x: 258, y: 126, facing: 'west' },
      fromPier: { x: 20, y: 130, facing: 'east' },
    },
    ambience: [
      { sfx: 'seagull', everyMin: 12, everyMax: 26 },
      { sfx: 'rain', everyMin: 18, everyMax: 40 },
    ],
    onFirstEnter: [
      ['jack', 'Wind, salt, and the specific smell of a town that peaked in 1961.'],
      ['wait', 0.4],
      ['caption', 'A newspaper blows past.'],
      ['jack', 'ARCADE TO BE DEMOLISHED TOMORROW.'],
      ['wait', 0.3],
      ['jack', "That's reassuring."],
      ['give', 'newspaper'],
      ['score', 10, 'newspaper'],
    ],
    hotspots: [
      {
        id: 'railings',
        name: 'Railings',
        rect: { x: 0, y: 70, w: 320, h: 14 },
        walkTo: [160, 112],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'Black railings, painted over rust, painted over rust.']],
          USE: [['jack', 'I lean on the railings and look at the sea. It looks back. Nobody learns anything.']],
        },
      },
      {
        id: 'newspaper_spot',
        name: 'Newspaper',
        rect: { x: 40, y: 108, w: 30, h: 20 },
        walkTo: [55, 130],
        facing: 'south',
        visibleIf: ['has', 'newspaper'],
        verbs: {
          LOOK: [
            ['jack', 'Demolition notice, weather, football results, television listings, and a crossword.'],
            ['jack', 'Six down. Four letters. "Valley, poetically."'],
            ['wait', 0.4],
            ['jack', 'VALE.'],
            ['wait', 0.4],
            ['jack', 'Well. That is a coincidence I do not care for.'],
            ['flag', 'crosswordSolved'],
            ['score', 20, 'crossword'],
          ],
          USE: [['jack', 'I have read it. Twice. The crossword is the only good bit and I have ruined that now.']],
        },
      },
      {
        id: 'tv_listings',
        name: 'Television Listings',
        rect: { x: 72, y: 108, w: 26, h: 20 },
        walkTo: [85, 130],
        facing: 'south',
        visibleIf: ['has', 'newspaper'],
        verbs: {
          LOOK: [
            ['jack', 'Nine o\'clock, a detective drama. Ten o\'clock, a sitcom about a man who hates his job.'],
            ['wait', 0.3],
            ['jack', 'Half past eleven. THE MAN WHO REMEMBERED TOMORROW.'],
            ['wait', 0.4],
            ["jack", "I've never heard of that."],
            ['flag', 'sawListing'],
            ['score', 15, 'tvListing'],
            ['cheeky', 'tvListing'],
          ],
        },
      },
    ],
    exits: [
      { id: 'sf_arcade', name: 'Starlight Arcade', rect: { x: 240, y: 34, w: 80, h: 48 }, to: 'arcade_lobby', entry: 'fromOutside', walkTo: [280, 112], arrow: 'up' },
      { id: 'sf_chips', name: 'Fish & Chip Shop', rect: { x: 4, y: 40, w: 62, h: 42 }, to: 'chip_shop', entry: 'default', walkTo: [34, 110], arrow: 'up' },
      { id: 'sf_alley', name: 'Back Alley', rect: { x: 72, y: 34, w: 26, h: 48 }, to: 'back_alley', entry: 'default', walkTo: [85, 108], arrow: 'up' },
      { id: 'sf_pool', name: 'The Lido', rect: { x: 106, y: 28, w: 62, h: 54 }, to: 'pool_cabins', entry: 'default', walkTo: [137, 110], arrow: 'up' },
      { id: 'sf_pier', name: 'The Pier', rect: { x: 0, y: 96, w: 24, h: 48 }, to: 'pier', entry: 'default', walkTo: [16, 128], arrow: 'left' },
      { id: 'sf_town', name: 'Town Centre', rect: { x: 296, y: 96, w: 24, h: 48 }, to: 'bus_station', entry: 'default', walkTo: [304, 128], arrow: 'right' },
    ],
  },

  pier: {
    id: 'pier',
    name: 'The Pier',
    background: 'pier',
    music: 'seafront',
    // Deck boards, with the photo booth and the cafe front standing on them.
    autoFloor: false,
    walkboxes: [[20, 118, 300, 118, 310, 143, 10, 143]],
    depth: { yNear: 143, yFar: 118, scaleNear: 1, scaleFar: 0.78 },
    blockers: [
      [216, 118, 262, 118, 262, 137, 216, 137],
      [262, 110, 320, 110, 320, 145, 262, 145],
      [84, 116, 104, 116, 104, 133, 84, 133],
    ],
    occluders: [
      { polygon: [216, 39, 262, 39, 262, 127, 216, 127], y: 127 },
      { polygon: [260, 8, 320, 8, 320, 120, 260, 120], y: 120 },
      { polygon: [84, 116, 104, 116, 104, 133, 84, 133], y: 133 },
    ],
    entries: { default: { x: 60, y: 130, facing: 'east' } },
    ambience: [{ sfx: 'seagull', everyMin: 14, everyMax: 30 }],
    hotspots: [
      {
        id: 'photo_booth',
        name: 'Photographic Booth',
        rect: { x: 234, y: 34, w: 40, h: 52 },
        walkTo: [235, 140],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', 'FOUR PHOTOGRAPHS 50p. The curtain has been missing since about 1979.'],
            ['if', ['noflag', 'boothNoticed'],
              [
                ['jack', 'There is already a photograph in the slot. Still damp.'],
                ['flag', 'boothNoticed'],
              ],
            ],
          ],
          TAKE: [
            ['if', ['flag', 'futurePhotoFound'],
              [['jack', 'I have it. I would rather I did not.']],
              [
                ['sfx', 'pickup'],
                ['vision', 'photo_tomorrow'],
                ['jack', 'Tomorrow.'],
                ['wait', 0.4],
                ['jack', "That's me."],
                ['wait', 0.5],
                ['jack', 'I should probably be more concerned.'],
                ['give', 'photograph'],
                ['flag', 'futurePhotoFound'],
                ['score', 25, 'futurePhoto'],
                ['act', 2],
                ['music', 'mystery'],
              ],
            ],
          ],
          USE: [
            ['if', ['flag', 'futurePhotoFound'],
              [
                ['sfx', 'crt-on'],
                ['jack', 'It takes four photographs of me looking increasingly worried, which is at least honest.'],
                ['cheeky', 'boothSelfie'],
              ],
              [['jack', 'There is already something in the slot. I should take that first.']],
            ],
          ],
        },
      },
      {
        id: 'red_coat',
        name: 'Woman in a Red Coat',
        rect: { x: 100, y: 76, w: 24, h: 40 },
        walkTo: [120, 124],
        facing: 'west',
        visibleIf: ['and', ['flag', 'futurePhotoFound'], ['noflag', 'followedRedCoat']],
        verbs: {
          LOOK: [['jack', 'A woman in a red coat, walking away, at a pace that suggests she knows I am looking.']],
          TALK: [
            ['jack', 'Excuse me -'],
            ['wait', 0.5],
            ['caption', 'She turns the corner towards the old cinema and is gone.'],
            ['flag', 'followedRedCoat'],
            ['flag', 'cinemaOpen'],
            ['score', 20, 'redCoat'],
            ['jack', 'The machine said RED COAT. The machine was right.'],
          ],
        },
      },
      {
        id: 'lighthouse_view',
        name: 'Lighthouse',
        rect: { x: 14, y: 34, w: 22, h: 34 },
        verbs: {
          LOOK: [['jack', 'The lighthouse. Automated in 1981, which put a man out of a job he loved.']],
        },
      },
      {
        // The painted lady on the billboard. When the actual woman in the red
        // coat is on the pier (between finding the photo and following her),
        // she takes these pixels over, so the poster only answers when she is
        // not standing in front of it.
        id: 'revue_poster',
        name: 'Revue Poster',
        rect: { x: 78, y: 45, w: 35, h: 85 },
        walkTo: [96, 138],
        facing: 'north',
        visibleIf: ['or', ['noflag', 'futurePhotoFound'], ['flag', 'followedRedCoat']],
        verbs: {
          LOOK: [
            ['jack', 'END OF SEASON REVUE. OH, WHAT A NIGHT! A lady in a red coat winks over her shoulder.'],
            ['wait', 0.4],
            ['jack', 'She has been winking since June. Her eyelid must be exhausted.'],
            ['cheeky', 'revuePoster'],
            ['score', 5, 'revuePoster'],
          ],
          TAKE: [['jack', 'The sea glued it on in July. It is part of the pier now.']],
        },
      },
    ],
    exits: [
      { id: 'pier_back', name: 'Seafront', rect: { x: 0, y: 96, w: 26, h: 48 }, to: 'seafront', entry: 'fromPier', walkTo: [34, 132], arrow: 'left' },
      { id: 'pier_cafe', name: 'Pier Café', rect: { x: 262, y: 20, w: 58, h: 100 }, to: 'pier_cafe', entry: 'default', walkTo: [254, 141], arrow: 'right' },
      { id: 'pier_cinema', name: 'Abandoned Cinema', rect: { x: 150, y: 15, w: 75, h: 55 }, to: 'cinema_exterior', entry: 'default', walkTo: [187, 122], arrow: 'up', requires: ['flag', 'cinemaOpen'], lockedText: 'There is nothing down that way but a shut cinema and a lot of pigeons.' },
      { id: 'pier_lighthouse', name: 'Lighthouse', rect: { x: 12, y: 32, w: 26, h: 38 }, to: 'lighthouse_ext', entry: 'default', walkTo: [40, 118], arrow: 'up', requires: ['flag', 'predLighthouse'], lockedText: 'A long walk out to an automated lighthouse in the dark. Not without a reason.' },
    ],
  },

  pier_cafe: {
    id: 'pier_cafe',
    name: 'Pier Café',
    background: 'pier_cafe',
    music: 'seafront',
    // Tiled floor between the service counter and the table. Both are down-stage of anyone standing.
    autoFloor: false,
    walkboxes: [[90, 132, 310, 132, 316, 143, 86, 143]],
    depth: { yNear: 143, yFar: 132, scaleNear: 1, scaleFar: 0.9 },
    blockers: [
      [0, 128, 89, 128, 89, 148, 0, 148],
      [160, 120, 310, 120, 310, 148, 160, 148],
    ],
    occluders: [
      { polygon: [0, 72, 89, 72, 89, 152, 0, 152], y: 152 },
      { polygon: [160, 105, 310, 105, 310, 152, 158, 152], y: 152 },
    ],
    entries: { default: { x: 108, y: 139, facing: 'south' } },
    hotspots: [
      {
        id: 'urn',
        name: 'Tea Urn',
        rect: { x: 32, y: 56, w: 22, h: 24 },
        walkTo: [96, 134],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'A tea urn the size of a water tank, kept at a temperature that would sterilise surgical equipment.']],
          USE: [['jack', 'The café is shut. The urn is still on. It will still be on in 2003.']],
        },
      },
      {
        id: 'cafe_table',
        name: 'Formica Table',
        rect: { x: 176, y: 82, w: 48, h: 34 },
        walkTo: [155, 138],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'Someone has scratched KEV WOZ ERE into the formica. Kev is consistent, if nothing else.']],
          TAKE: [
            ['if', ['flag', 'gotPostcard'],
              [['jack', 'I have taken quite enough from an empty café.']],
              [
                ['sfx', 'pickup'],
                ['jack', 'An old postcard, wedged under the table leg to stop it wobbling. Someone has been using history as a shim.'],
                ['give', 'postcard'],
                ['flag', 'gotPostcard'],
                ['flag', 'beachUnlocked'],
                ['score', 15, 'postcard'],
              ],
            ],
          ],
        },
      },
      {
        id: 'cafe_window',
        name: 'Window',
        rect: { x: 168, y: 24, w: 132, h: 40 },
        verbs: {
          LOOK: [['jack', 'Black sea, black sky, and a horizon you can only find by looking away from it.']],
        },
      },
    ],
    exits: [
      { id: 'cafe_out', name: 'Pier', rect: { x: 88, y: 15, w: 42, h: 122 }, to: 'pier', entry: 'default', walkTo: [108, 140], arrow: 'left' },
    ],
  },

  chip_shop: {
    id: 'chip_shop',
    name: 'Fish & Chip Shop',
    background: 'chip_shop',
    music: 'seafront',
    // The serving counter fills the left of the room; customers stand right of it.
    autoFloor: false,
    walkboxes: [[220, 125, 314, 125, 318, 143, 216, 143]],
    depth: { yNear: 143, yFar: 125, scaleNear: 1, scaleFar: 0.86 },
    blockers: [
      [0, 118, 232, 118, 232, 146, 0, 146],
    ],
    occluders: [
      { polygon: [0, 74, 232, 74, 232, 146, 0, 146], y: 146 },
    ],
    entries: { default: { x: 270, y: 135, facing: 'west' } },
    hotspots: [
      {
        id: 'fryer',
        name: 'Fryers',
        rect: { x: 40, y: 64, w: 150, h: 30 },
        walkTo: [235, 133],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'Three fryers, one of which has been making the same noise since 1982.']],
          USE: [['jack', 'I am not putting my hand in that. I have plans for it.']],
        },
      },
      {
        id: 'butter_tray',
        name: 'Butter',
        rect: { x: 200, y: 84, w: 40, h: 22 },
        walkTo: [232, 126],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'A tray of catering butter pats, going soft under a heat lamp. Five pence each, which is theft.']],
          TAKE: [
            ['if', ['has', 'butter'],
              [['jack', 'I already have butter. I am a man carrying butter around a seaside town at night.']],
              [
                ['sfx', 'pickup'],
                ['give', 'butter'],
                ['jack', 'Butter. For greasing something. Almost certainly not toast.'],
                ['score', 15, 'butter'],
              ],
            ],
          ],
        },
      },
      {
        id: 'price_list',
        name: 'Price List',
        rect: { x: 210, y: 22, w: 88, h: 50 },
        verbs: {
          LOOK: [
            ['jack', 'Cod ninety-five pence. Chips forty-five. Curry sauce thirty.'],
            ['wait', 0.3],
            ['jack', 'And underneath, in a different pen: "GREASE FOR JAMMED THINGS - ASK".'],
            ['flag', 'greaseHinted'],
            ['score', 10, 'greaseHint'],
          ],
        },
      },
      {
        id: 'menu_board',
        name: 'Menu Board',
        rect: { x: 172, y: 25, w: 48, h: 43 },
        walkTo: [235, 133],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', 'COD. HADDOCK. SAVELOY. And underneath, in different chalk: ASK ABOUT THE SPECIAL.'],
            ['wait', 0.4],
            ['jack', 'I am not asking about the special.'],
            ['wait', 0.6],
            ['say', 'voice', 'HE NEVER ASKS ABOUT THE SPECIAL.'],
            ['cheeky', 'theSpecial'],
            ['score', 5, 'theSpecial'],
          ],
        },
      },
    ],
    exits: [
      { id: 'chips_out', name: 'Seafront', rect: { x: 228, y: 12, w: 76, h: 118 }, to: 'seafront', entry: 'default', walkTo: [270, 136], arrow: 'right' },
    ],
  },

  back_alley: {
    id: 'back_alley',
    name: 'Back Alley',
    background: 'back_alley',
    music: 'mystery',
    // Cobbles between the shop fronts; the bins are down-stage on the right.
    autoFloor: false,
    walkboxes: [[70, 120, 312, 120, 318, 143, 64, 143]],
    depth: { yNear: 143, yFar: 120, scaleNear: 1, scaleFar: 0.8 },
    blockers: [
      [214, 122, 320, 122, 320, 146, 214, 146],
    ],
    occluders: [
      { polygon: [214, 92, 320, 92, 320, 146, 212, 146], y: 146 },
    ],
    entries: { default: { x: 160, y: 132, facing: 'south' } },
    hotspots: [
      {
        id: 'bins',
        name: 'Bins',
        rect: { x: 246, y: 82, w: 34, h: 40 },
        walkTo: [240, 121],
        facing: 'east',
        verbs: {
          LOOK: [['jack', 'Two bins and a crate. The traditional contents of every alley in every game I have ever played.']],
          OPEN: [
            ['if', ['has', 'coat_hanger'],
              [['jack', 'Nothing else in there but a smell with ambitions.']],
              [
                ['sfx', 'pickup'],
                ['jack', 'A wire coat hanger. In an adventure game. This is absolutely going to be used for a crime.'],
                ['give', 'coat_hanger'],
                ['score', 15, 'coatHanger'],
              ],
            ],
          ],
          PUSH: [['jack', 'I push a bin. It falls over. I am now a man who has knocked a bin over.'], ['sfx', 'door'], ['cheeky', 'binPush']],
        },
      },
      {
        id: 'fire_door',
        name: 'Fire Door',
        rect: { x: 40, y: 60, w: 32, h: 62 },
        walkTo: [66, 136],
        facing: 'west',
        verbs: {
          LOOK: [['jack', 'The back of the video shop. Fire door, propped open with a videocassette. Poetic.']],
          OPEN: [['sfx', 'door'], ['goto', 'video_shop', 'fromAlley']],
        },
      },
      {
        id: 'puddle',
        name: 'Puddle',
        rect: { x: 92, y: 122, w: 56, h: 16 },
        verbs: {
          LOOK: [['jack', 'A puddle reflecting a fire escape light. Briefly beautiful, mostly a puddle.']],
          USE: [['jack', 'I step in it deliberately, for reasons I could not defend in court.'], ['cheeky', 'puddle']],
        },
      },
      {
        id: 'dead_fly_1',
        name: 'Dead Fly',
        rect: { x: 176, y: 116, w: 10, h: 8 },
        verbs: { LOOK: [['jack', 'Dead.'], ['cheeky', 'fly1']] },
      },
      {
        id: 'dead_fly_2',
        name: 'Dead Fly',
        rect: { x: 190, y: 120, w: 10, h: 8 },
        verbs: { LOOK: [['jack', 'Also dead.'], ['cheeky', 'fly2']] },
      },
      {
        id: 'dead_fly_3',
        name: 'Dead Fly',
        rect: { x: 204, y: 116, w: 10, h: 8 },
        verbs: {
          LOOK: [['jack', 'This is becoming statistically significant.'], ['cheeky', 'fly3'], ['score', 5, 'flies']],
        },
      },
    ],
    exits: [
      { id: 'alley_out', name: 'Seafront', rect: { x: 0, y: 100, w: 20, h: 44 }, to: 'seafront', entry: 'default', walkTo: [68, 132], arrow: 'left' },
      { id: 'alley_tv', name: "Piper's Television Emporium", rect: { x: 300, y: 100, w: 20, h: 44 }, to: 'tv_shop', entry: 'default', walkTo: [298, 121], arrow: 'right' },
    ],
  },

  tv_shop: {
    id: 'tv_shop',
    name: "Piper's Television Emporium",
    background: 'tv_shop',
    music: 'mystery',
    // Floorboards between the display cases on the left and the shelving on the right; both are down-stage furniture.
    autoFloor: false,
    walkboxes: [[84, 128, 278, 128, 282, 143, 80, 143]],
    depth: { yNear: 143, yFar: 128, scaleNear: 1, scaleFar: 0.88 },
    blockers: [
      [0, 124, 84, 124, 84, 146, 0, 146],
      [276, 124, 320, 124, 320, 146, 276, 146],
    ],
    occluders: [
      { polygon: [0, 75, 84, 75, 84, 152, 0, 152], y: 152 },
      { polygon: [276, 73, 320, 73, 320, 152, 276, 152], y: 152 },
    ],
    entries: { default: { x: 205, y: 135, facing: 'south' } },
    characters: [{ id: 'derek', sprite: 'char.derek', x: 240, y: 130, facing: 'west' }],
    ambience: [{ sfx: 'static', everyMin: 8, everyMax: 18 }],
    hotspots: [
      {
        id: 'derek',
        name: 'Derek',
        rect: { x: 228, y: 94, w: 26, h: 40 },
        walkTo: [206, 132],
        facing: 'east',
        defaultVerb: 'TALK',
        verbs: {
          LOOK: [['jack', 'Derek Piper. Thirty-two. Believes television can read your thoughts, and is occasionally, horribly, correct.']],
          TALK: [['dialogue', 'derek_first']],
        },
        useWith: {
          film_reel: [
            ['if', ['flag', 'derekExplained'],
              [['say', 'derek', 'I have seen it. I am still not sleeping.']],
              [['flag', 'filmShown'], ['dialogue', 'derek_film']],
            ],
          ],
          photograph: [
            ['say', 'derek', 'That is a photograph of tomorrow.'],
            ['jack', 'You can tell?'],
            ['say', 'derek', 'The grain is wrong. Film grain settles. This has not settled yet.'],
            ['jack', 'Derek, that is either brilliant or complete nonsense.'],
            ['say', 'derek', 'Yes.'],
            ['score', 15, 'derekPhoto'],
          ],
        },
      },
      {
        id: 'tv_wall',
        name: 'Wall of Televisions',
        rect: { x: 8, y: 8, w: 300, h: 88 },
        walkTo: [120, 128],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', 'Eighteen televisions, all showing static.'],
            ['if', ['flag', 'firstEvent'],
              [
                ['wait', 0.4],
                ['jack', 'Except one, briefly, which showed the arcade.'],
                ['flag', 'sawTvArcade'],
                ['score', 10, 'tvArcade'],
              ],
            ],
          ],
          USE: [['sfx', 'static'], ['jack', 'I turn the tuning dial. It finds a channel that is not allocated and stays there.'], ['cheeky', 'tuning']],
        },
      },
      {
        id: 'antenna_stock',
        name: 'Aerial',
        rect: { x: 250, y: 92, w: 40, h: 18 },
        walkTo: [250, 132],
        facing: 'north',
        visibleIf: ['flag', 'derekExplained'],
        verbs: {
          LOOK: [['jack', 'An aerial roughly the size of a small boat, leaning against the counter.']],
          TAKE: [
            ['if', ['has', 'antenna'],
              [['jack', 'I have it. It is enormous and I look ridiculous.']],
              [
                ['sfx', 'pickup'],
                ['give', 'antenna'],
                ['say', 'derek', 'Bring it back.'],
                ['jack', 'I will bring back most of it.'],
                ['flag', 'derekGaveAntenna'],
                ['score', 20, 'antenna'],
              ],
            ],
          ],
        },
        useWith: {
          bolt_cutters: [
            ['sfx', 'switch'],
            ['jack', 'Now it is an aerial I can carry up a ladder.'],
            ['flag', 'antennaCut'],
            ['score', 20, 'antennaCut'],
          ],
        },
      },
    ],
    exits: [
      { id: 'tv_out', name: 'Back Alley', rect: { x: 193, y: 20, w: 42, h: 108 }, to: 'back_alley', entry: 'default', walkTo: [205, 135], arrow: 'up' },
    ],
  },

  amusement_park: {
    id: 'amusement_park',
    name: 'Amusement Park',
    background: 'amusement_park',
    music: 'arcade',
    walkboxes: OUTDOOR,
    depth: OUTDOOR_DEPTH,
    entries: { default: { x: 60, y: 130, facing: 'east' } },
    characters: [{ id: 'brenda', sprite: 'char.brenda', x: 226, y: 116, facing: 'south' }],
    hotspots: [
      {
        id: 'brenda',
        name: 'Brenda',
        rect: { x: 212, y: 80, w: 28, h: 40 },
        walkTo: [226, 128],
        facing: 'north',
        defaultVerb: 'TALK',
        verbs: {
          LOOK: [['jack', 'Brenda Holt. Runs the kiosk. Knows everything, sells nothing without a rule attached.']],
          TALK: [['dialogue', 'brenda_first']],
        },
      },
      {
        id: 'big_wheel',
        name: 'Big Wheel',
        rect: { x: 20, y: 12, w: 92, h: 92 },
        walkTo: [80, 126],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'The big wheel. Sixteen bulbs out of thirty-two. Half a good time.']],
          USE: [['jack', 'It is padlocked for the night, which has probably saved my life.']],
        },
      },
      {
        id: 'kiosk',
        name: 'Kiosk',
        rect: { x: 176, y: 44, w: 100, h: 54 },
        verbs: {
          LOOK: [['jack', 'Candy floss, rock, postcards, and a laminated list of rules numbered up to seven hundred.']],
        },
      },
    ],
    exits: [
      { id: 'park_out', name: 'Bus Station', rect: { x: 0, y: 96, w: 24, h: 48 }, to: 'bus_station', entry: 'default', walkTo: [26, 132], arrow: 'left' },
      { id: 'park_haunted', name: 'Haunted House', rect: { x: 288, y: 40, w: 32, h: 60 }, to: 'haunted_house', entry: 'default', walkTo: [292, 118], arrow: 'right' },
    ],
  },

  haunted_house: {
    id: 'haunted_house',
    name: 'Haunted House',
    background: 'haunted_house',
    music: 'cinema',
    // Stairs left, ticket booth centre, exit through the right doorway.
    autoFloor: false,
    walkboxes: [[68, 124, 310, 124, 316, 143, 0, 143]],
    depth: { yNear: 143, yFar: 124, scaleNear: 1, scaleFar: 0.88 },
    blockers: [
      [0, 100, 66, 100, 66, 144, 0, 144],
      [86, 115, 110, 115, 110, 139, 86, 139],
      [112, 100, 198, 100, 198, 144, 112, 144],
    ],
    occluders: [
      { polygon: [84, 46, 112, 46, 112, 139, 84, 139], y: 139 },
    ],
    entries: { default: { x: 252, y: 139, facing: 'west' } },
    onFirstEnter: [['jack', 'A ghost train without the train. Just the walking, and the disappointment.']],
    hotspots: [
      {
        id: 'plastic_ghost',
        name: 'Plastic Ghost',
        rect: { x: 205, y: 8, w: 36, h: 92 },
        walkTo: [233, 135],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'A plastic ghost with a bulb inside it. One of its eyes has slipped, giving it a look of profound disappointment.']],
          PUSH: [['sfx', 'zap'], ['jack', 'It swings out at me on a wire, thirty years too slowly.'], ['cheeky', 'ghost']],
        },
      },
      {
        id: 'skeleton',
        name: 'Skeleton',
        rect: { x: 36, y: 14, w: 34, h: 74 },
        walkTo: [74, 138],
        facing: 'west',
        verbs: {
          LOOK: [['jack', 'A skeleton on a rail. Someone has given it a cigarette.']],
          TALK: [['jack', 'Nothing. Which is the correct response and I respect it.'], ['cheeky', 'skeleton']],
        },
      },
      {
        id: 'rubber_duck',
        name: 'Rubber Duck',
        rect: { x: 204, y: 127, w: 25, h: 16 },
        walkTo: [232, 141],
        facing: 'west',
        verbs: {
          LOOK: [['jack', 'Someone has been watching too many detective films.'], ['cheeky', 'duck'], ['score', 5, 'duck']],
          TAKE: [['jack', 'I have enough problems without a duck.']],
        },
      },
    ],
    exits: [
      // The way out is the doorway on the right - the ferris wheel is visible
      // through it, which is what tells the player where it goes.
      { id: 'haunted_out', name: 'Amusement Park', rect: { x: 240, y: 30, w: 42, h: 106 }, to: 'amusement_park', entry: 'default', walkTo: [250, 139], arrow: 'right' },
    ],
  },

  bus_station: {
    id: 'bus_station',
    name: 'Bus Station',
    background: 'bus_station',
    music: 'mystery',
    // Concourse. Bench and bin stand on the floor; the town is seen through the glass.
    autoFloor: false,
    walkboxes: [[6, 124, 316, 118, 320, 143, 2, 143]],
    depth: { yNear: 143, yFar: 120, scaleNear: 1, scaleFar: 0.88 },
    blockers: [
      [58, 120, 136, 120, 136, 137, 58, 137],
      [212, 117, 236, 117, 236, 129, 212, 129],
    ],
    occluders: [
      { polygon: [58, 96, 136, 96, 136, 137, 58, 137], y: 137 },
      { polygon: [212, 104, 236, 104, 236, 129, 212, 129], y: 129 },
    ],
    entries: { default: { x: 50, y: 136, facing: 'east' } },
    hotspots: [
      {
        id: 'timetable',
        name: 'Timetable',
        rect: { x: 236, y: 48, w: 30, h: 56 },
        walkTo: [230, 130],
        facing: 'east',
        verbs: {
          LOOK: [
            ['jack', 'Last bus to anywhere: twenty-two forty.'],
            ['wait', 0.3],
            ['jack', 'And a service listed for tomorrow that terminates at a stop which is being demolished tomorrow.'],
            ['score', 10, 'timetable'],
          ],
        },
      },
      {
        id: 'bench',
        name: 'Bench',
        rect: { x: 60, y: 92, w: 74, h: 42 },
        walkTo: [96, 141],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'A bench with the middle armrest fitted specifically so nobody can sleep on it. Very 1987.']],
          USE: [['jack', 'I sit down for a moment. It does not help, but it is free.'], ['cheeky', 'bench']],
        },
      },
      {
        id: 'kiosk_shutter',
        name: 'Shuttered Kiosk',
        rect: { x: 265, y: 55, w: 55, h: 77 },
        walkTo: [280, 132],
        facing: 'east',
        verbs: {
          LOOK: [
            ['jack', "A newsagent's kiosk, shuttered for the night. The top shelf is just visible through the slats."],
            ['wait', 0.4],
            ['jack', 'Which is the most 1987 sentence I have ever thought.'],
            ['cheeky', 'topShelf'],
            ['score', 5, 'topShelf'],
          ],
          OPEN: [
            ['sfx', 'deny'],
            ['say', 'voice', 'CLOSED.'],
            ['jack', 'It is seven in the evening.'],
            ['say', 'voice', 'CLOSED SINCE 1981.'],
          ],
        },
      },
    ],
    exits: [
      // The concourse looks out over the whole town: the far exits sit on what
      // is visible through the glass, and every walk ends at the centre doors.
      { id: 'bus_sea', name: 'Seafront', rect: { x: 0, y: 108, w: 22, h: 36 }, to: 'seafront', entry: 'default', walkTo: [24, 136], arrow: 'left' },
      { id: 'bus_park', name: 'Amusement Park', rect: { x: 92, y: 28, w: 48, h: 52 }, to: 'amusement_park', entry: 'default', walkTo: [150, 130], arrow: 'up' },
      { id: 'bus_phone', name: 'Telephone Box', rect: { x: 16, y: 50, w: 26, h: 56 }, to: 'phone_box', entry: 'default', walkTo: [28, 132], arrow: 'left' },
      { id: 'bus_town', name: 'Town Hall', rect: { x: 142, y: 62, w: 70, h: 62 }, to: 'town_hall', entry: 'default', walkTo: [178, 128], arrow: 'up' },
      { id: 'bus_clock', name: 'Clock Tower', rect: { x: 170, y: 20, w: 24, h: 30 }, to: 'clock_tower_ext', entry: 'default', walkTo: [178, 128], arrow: 'up' },
      { id: 'bus_hotel', name: 'Golden Sands Hotel', rect: { x: 196, y: 26, w: 34, h: 34 }, to: 'hotel_reception', entry: 'default', walkTo: [190, 128], arrow: 'up' },
    ],
  },

  phone_box: {
    id: 'phone_box',
    name: 'Telephone Box',
    background: 'phone_box',
    music: 'mystery',
    hideJack: true,
    entries: { default: { x: 160, y: 138 } },
    hotspots: [
      {
        id: 'phone_dial',
        name: 'Telephone',
        rect: { x: 128, y: 40, w: 64, h: 56 },
        verbs: {
          LOOK: [['jack', 'A telephone. It smells of ten thousand conversations I would rather not have heard.']],
          USE: [['dialogue', 'phone_menu']],
        },
      },
      {
        id: 'phone_cards',
        name: 'Cards',
        rect: { x: 96, y: 42, w: 30, h: 22 },
        verbs: {
          LOOK: [['jack', 'Instructions for dialling, in a typeface that assumes you have never seen a telephone.']],
        },
      },
    ],
    exits: [
      { id: 'phone_out', name: 'Bus Station', rect: { x: 0, y: 100, w: 30, h: 44 }, to: 'bus_station', entry: 'default', arrow: 'left' },
    ],
  },

  town_hall: {
    id: 'town_hall',
    name: 'Town Hall',
    background: 'town_hall',
    music: 'mystery',
    // Marble lobby. Doors centre, arch to the bus station left, board right.
    autoFloor: false,
    walkboxes: [[18, 126, 316, 129, 320, 143, 2, 143]],
    depth: { yNear: 143, yFar: 126, scaleNear: 1, scaleFar: 0.86 },
    blockers: [
      [78, 118, 106, 118, 106, 130, 78, 130],
    ],
    entries: { default: { x: 40, y: 134, facing: 'east' } },
    hotspots: [
      {
        id: 'notice_board',
        name: 'Notice Board',
        rect: { x: 242, y: 34, w: 72, h: 62 },
        walkTo: [270, 134],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', 'DEMOLITION ORDER: STARLIGHT ARCADE. Approved unanimously.'],
            ['wait', 0.3],
            ['jack', 'And underneath, a planning application for a car park, submitted in 1974 and never withdrawn.'],
            ['flag', 'sawPlanning'],
            ['score', 20, 'planning'],
          ],
          TAKE: [['jack', 'Stealing a public notice from a town hall. On a night when I am already trespassing everywhere else.']],
        },
      },
      {
        id: 'town_doors',
        name: 'Doors',
        rect: { x: 128, y: 30, w: 100, h: 97 },
        walkTo: [178, 132],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'Shut since half past five, as they have been every day since the building went up.']],
          OPEN: [['sfx', 'deny'], ['jack', 'Locked. Municipally, immovably locked.']],
        },
      },
      {
        id: 'radiator',
        name: 'Radiator',
        rect: { x: 44, y: 85, w: 31, h: 35 },
        walkTo: [52, 130],
        facing: 'west',
        verbs: {
          LOOK: [
            ['jack', 'A municipal radiator the size of a small car. Warm.'],
            ['wait', 0.4],
            ['jack', 'Half the marriages in this town started against that radiator, and the council knows it.'],
            ['cheeky', 'radiator'],
            ['score', 5, 'radiator'],
          ],
          USE: [
            ['caption', 'Jack warms his hands on it.'],
            ['wait', 0.6],
            ['jack', 'I understand the appeal now.'],
          ],
        },
      },
    ],
    exits: [
      { id: 'hall_out', name: 'Bus Station', rect: { x: 0, y: 80, w: 56, h: 64 }, to: 'bus_station', entry: 'default', walkTo: [30, 134], arrow: 'left' },
      { id: 'hall_police', name: 'Police Station', rect: { x: 296, y: 96, w: 24, h: 48 }, to: 'police_station', entry: 'default', walkTo: [306, 138], arrow: 'right' },
    ],
  },

  police_station: {
    id: 'police_station',
    name: 'Police Station',
    background: 'police_station',
    music: 'mystery',
    // Tiled floor right of the front desk. The desk fills the left of the room.
    autoFloor: false,
    walkboxes: [[166, 130, 306, 130, 312, 143, 162, 143]],
    depth: { yNear: 143, yFar: 130, scaleNear: 1, scaleFar: 0.9 },
    blockers: [
      [0, 126, 168, 126, 168, 152, 0, 152],
    ],
    occluders: [
      { polygon: [0, 100, 168, 100, 168, 152, 0, 152], y: 152 },
    ],
    entries: { default: { x: 190, y: 135, facing: 'south' } },
    hotspots: [
      {
        id: 'missing_posters',
        name: 'Missing Person Posters',
        rect: { x: 222, y: 22, w: 92, h: 78 },
        walkTo: [250, 130],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', 'Three missing person posters. Two from this year.'],
            ['wait', 0.3],
            ['jack', 'And one from 1974, so faded it is almost blank. E. VALE.'],
            ['wait', 0.4],
            ['jack', 'Vale. Like the crossword. Like Maggie.'],
            ['flag', 'valePosterSeen'],
            ['score', 30, 'valePoster'],
          ],
          TAKE: [['jack', 'It has been on that wall for thirteen years. It can stay there another day.']],
        },
      },
      {
        id: 'desk_bell',
        name: 'Desk Bell',
        rect: { x: 168, y: 74, w: 18, h: 14 },
        walkTo: [176, 130],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'A brass bell on an empty desk. The universal symbol of nobody coming.']],
          PUSH: [
            ['sfx', 'button'],
            ['wait', 1.2],
            ['jack', 'Nothing.'],
            ['sfx', 'button'],
            ['wait', 1.2],
            ['jack', 'Still nothing. I could report a crime, commit one, and leave.'],
            ['cheeky', 'policeBell'],
          ],
        },
      },
      {
        id: 'coat_stand',
        name: 'Coat Stand',
        rect: { x: 10, y: 42, w: 28, h: 78 },
        walkTo: [175, 135],
        facing: 'west',
        verbs: {
          LOOK: [
            ['jack', 'A police helmet on the coat stand.'],
            ['wait', 0.4],
            ['jack', 'In every saucy postcard this town ever printed, that helmet is doing a job helmets were not issued for.'],
            ['wait', 0.4],
            ['jack', 'Tonight it is just a hat.'],
            ['cheeky', 'helmet'],
            ['score', 5, 'helmet'],
          ],
          TAKE: [['jack', 'Stealing a police helmet inside a police station. Even the postcards never went that far.']],
        },
      },
    ],
    exits: [
      { id: 'police_out', name: 'Town Hall', rect: { x: 145, y: 10, w: 85, h: 122 }, to: 'town_hall', entry: 'default', walkTo: [190, 136], arrow: 'up' },
    ],
  },
};
