import type { Scene } from '../../game/types';


/**
 * Sections 46-56: the optional cheeky content.
 *
 * Staged exactly as spec s.56 requires - silhouettes, frosted glass, towels,
 * umbrellas, foreground objects and hard cuts away. Nothing explicit is ever
 * drawn or animated; the comedy is entirely in the timing and in Jack being
 * mortified. Per s.54 he reacts with embarrassment, never entitlement, and per
 * the final build note none of it is on the critical path - except the poster
 * in the projection room, which spec s.53 deliberately makes load-bearing.
 */
export const HOTEL_SCENES: Record<string, Scene> = {
  hotel_reception: {
    id: 'hotel_reception',
    name: 'Golden Sands Hotel',
    background: 'hotel_reception',
    music: 'seafront',
    // Carpet in front of the desk. The reception desk is the thing to stand behind; the palm is near-camera on the left.
    autoFloor: false,
    walkboxes: [[20, 128, 300, 128, 306, 143, 14, 143]],
    depth: { yNear: 143, yFar: 128, scaleNear: 1, scaleFar: 0.88 },
    blockers: [
      [102, 125, 237, 125, 237, 152, 102, 152],
      [0, 125, 42, 125, 42, 152, 0, 152],
    ],
    occluders: [
      { polygon: [102, 87, 237, 87, 237, 156, 101, 152], y: 156 },
      { polygon: [0, 15, 42, 15, 42, 152, 0, 152], y: 152 },
    ],
    entries: { default: { x: 60, y: 132, facing: 'east' }, fromStairs: { x: 280, y: 130, facing: 'west' } },
    characters: [{ id: 'valerie', sprite: 'char.valerie', x: 150, y: 118, facing: 'south' }],
    onFirstEnter: [
      ['jack', 'The Golden Sands. Two stars, one of which is for the car park.'],
    ],
    hotspots: [
      {
        id: 'valerie',
        name: 'Valerie',
        rect: { x: 136, y: 82, w: 28, h: 40 },
        walkTo: [100, 130],
        facing: 'east',
        defaultVerb: 'TALK',
        verbs: {
          LOOK: [['jack', 'Twenty-eight, glamorous, and radiating the specific boredom of someone who has heard every excuse twice.']],
          TALK: [['dialogue', 'valerie_reception']],
        },
      },
      {
        id: 'pigeonholes',
        name: 'Key Pigeonholes',
        rect: { x: 96, y: 30, w: 128, h: 52 },
        walkTo: [100, 130],
        facing: 'east',
        verbs: {
          LOOK: [['jack', 'Twenty-four pigeonholes. Six keys. It is September in a British seaside town.']],
          TAKE: [['jack', 'Reaching over a reception desk to steal a key while the receptionist watches. Bold.']],
        },
      },
      {
        id: 'register',
        name: 'Register',
        rect: { x: 176, y: 76, w: 32, h: 12 },
        walkTo: [238, 128],
        facing: 'north',
        verbs: {
          LOOK: [
            ['if', ['flag', 'arthurColleague'],
              [
                ['jack', 'The register. Tonight: three names.'],
                ['wait', 0.3],
                ['jack', 'And every Tuesday going back years, in the same hand: E. VALE, ROOM 12.'],
                ['flag', 'registerSeen'],
                ['score', 25, 'register'],
              ],
              [['jack', 'A guest register. Mostly blank, which is not a good sign for the Golden Sands.']],
            ],
          ],
        },
      },
      {
        id: 'desk_bell_hotel',
        name: 'Desk Bell',
        rect: { x: 104, y: 74, w: 16, h: 12 },
        verbs: {
          LOOK: [['jack', 'A brass bell, positioned so that Valerie can see it and choose not to.']],
          PUSH: [
            ['sfx', 'button'],
            ['say', 'valerie', 'I am standing here.'],
            ['jack', 'I know. It was more of a formality.'],
            ['cheeky', 'hotelBell'],
          ],
        },
      },
      {
        id: 'palm',
        name: 'Potted Palm',
        rect: { x: 14, y: 76, w: 32, h: 46 },
        verbs: {
          LOOK: [['jack', 'A plant that has survived on tea dregs and spite since the Coronation.']],
          PUSH: [
            ['caption', 'Jack pats the palm down like airport security.'],
            ['wait', 0.5],
            ['say', 'valerie', 'Leave Gerald alone.'],
            ['jack', 'The palm is called Gerald.'],
            ['say', 'valerie', 'Gerald has been here longer than you have been alive.'],
            ['cheeky', 'gerald'],
            ['score', 5, 'gerald'],
          ],
        },
      },
    ],
    exits: [
      { id: 'hotel_out', name: 'Bus Station', rect: { x: 0, y: 100, w: 22, h: 44 }, to: 'bus_station', entry: 'default', walkTo: [42, 132], arrow: 'left' },
      {
        id: 'hotel_up', name: 'Stairs', rect: { x: 268, y: 40, w: 52, h: 64 },
        to: 'hotel_corridor', entry: 'default', walkTo: [286, 128], arrow: 'up',
        requires: ['flag', 'hasRoom12Key'],
        lockedText: 'I am not wandering around a hotel without a reason. Or a key.',
      },
    ],
  },

  hotel_corridor: {
    id: 'hotel_corridor',
    name: 'Hotel Corridor',
    background: 'hotel_corridor',
    music: 'seafront',
    // Four doors along the back wall; the reception arch is on the right.
    autoFloor: false,
    walkboxes: [[8, 127, 318, 127, 320, 143, 2, 143]],
    depth: { yNear: 143, yFar: 127, scaleNear: 1, scaleFar: 0.85 },
    blockers: [
      [0, 122, 22, 122, 22, 130, 0, 130],
    ],
    entries: {
      default: { x: 298, y: 140, facing: 'west' },
      fromRoom12: { x: 216, y: 136, facing: 'south' },
    },
    hotspots: [
      {
        id: 'door10',
        name: 'Room 10',
        rect: { x: 27, y: 28, w: 60, h: 100 },
        walkTo: [57, 136],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'Room 10. A DO NOT DISTURB sign, hung with real conviction.']],
          OPEN: [['sfx', 'deny'], ['jack', 'Locked, and the sign was fairly clear.']],
        },
      },
      {
        // Spec s.52: the wrong room. Immediate cut, no visual at all.
        id: 'door11',
        name: 'Room 11',
        rect: { x: 112, y: 27, w: 54, h: 101 },
        walkTo: [139, 136],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'Room 11. The door is very slightly ajar.']],
          OPEN: [
            ['if', ['flag', 'sawRoom11'],
              [['jack', 'I have made that mistake once. That is the correct number of times.']],
              [
                ['sfx', 'door'],
                ['fade', 'out', 0.1],
                ['wait', 0.35],
                ['fade', 'in', 0.15],
                ['jack', 'Wrong room.'],
                ['sfx', 'door'],
                ['wait', 0.5],
                ['say', 'voice', 'Very.'],
                ['wait', 0.4],
                ['jack', 'Fair enough.'],
                ['flag', 'sawRoom11'],
                ['cheeky', 'room11'],
              ],
            ],
          ],
        },
      },
      {
        id: 'door12',
        name: 'Room 12',
        rect: { x: 191, y: 25, w: 50, h: 103 },
        walkTo: [216, 136],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'Room 12. The room Elliot Vale booked every Tuesday for three years, and every Tuesday since.']],
          OPEN: [
            ['if', ['has', 'room12_key'],
              [['sfx', 'door'], ['goto', 'hotel_room12', 'default']],
              [['jack', 'Locked. Valerie has the key, and Valerie has views about people who lose keys.']],
            ],
          ],
        },
        useWith: {
          room12_key: [['sfx', 'door'], ['goto', 'hotel_room12', 'default']],
        },
      },
      {
        id: 'door14',
        name: 'Room 14',
        rect: { x: 261, y: 27, w: 40, h: 101 },
        walkTo: [280, 136],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', 'Room 14. There is no room 13.'],
            ['wait', 0.3],
            ['jack', 'In a hotel where the same man has been checking in for thirteen years, that feels less like superstition and more like editing.'],
            ['cheeky', 'room13'],
            ['score', 10, 'noRoom13'],
          ],
          OPEN: [['sfx', 'deny'], ['jack', 'Locked.']],
        },
      },
    ],
    exits: [
      // Down through the archway on the right; the reception desk shows through it.
      { id: 'corridor_down', name: 'Reception', rect: { x: 302, y: 15, w: 18, h: 125 }, to: 'hotel_reception', entry: 'fromStairs', walkTo: [304, 140], arrow: 'right' },
    ],
  },

  hotel_room12: {
    id: 'hotel_room12',
    name: 'Room 12',
    background: 'hotel_room12',
    music: 'mystery',
    // Carpet around the bed. The bed, the dressing table and the bedside table all stand in the room.
    autoFloor: false,
    walkboxes: [[16, 124, 300, 124, 306, 143, 10, 143]],
    depth: { yNear: 143, yFar: 124, scaleNear: 1, scaleFar: 0.86 },
    blockers: [
      [20, 110, 131, 110, 131, 138, 20, 138],
      [250, 110, 311, 110, 311, 134, 250, 134],
      [0, 110, 36, 110, 36, 128, 0, 128],
    ],
    occluders: [
      { polygon: [20, 52, 131, 52, 131, 138, 20, 138], y: 138 },
      { polygon: [250, 30, 311, 30, 311, 134, 248, 134], y: 134 },
    ],
    entries: { default: { x: 50, y: 138, facing: 'east' } },
    onFirstEnter: [
      ['jack', 'Maggie?'],
      ['wait', 1.0],
      ['caption', 'No answer.'],
      ['wait', 0.5],
      ['caption', 'The shower is running in the bathroom.'],
      ['jack', 'Right.'],
    ],
    hotspots: [
      {
        // Spec s.47. The guest is a silhouette behind frosted glass and the
        // scene cuts before anything else. It is a timing gag, nothing more.
        id: 'bathroom_door',
        name: 'Bathroom Door',
        rect: { x: 96, y: 30, w: 44, h: 68 },
        walkTo: [118, 138],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'Frosted glass. Someone is in there. I can hear the shower and I can see approximately nothing, which is the correct amount.']],
          OPEN: [['jack', 'Absolutely not.']],
          TALK: [
            ['if', ['flag', 'towelGag'],
              [['jack', 'I have already had that conversation. It went as well as it could.']],
              [
                ['jack', 'Maggie?'],
                ['wait', 1.2],
                ['caption', 'No answer.'],
                ['wait', 0.8],
                ['caption', 'Jack waits.'],
                ['wait', 1.2],
                ['sfx', 'door'],
                ['caption', 'The door opens.'],
                ['wait', 0.4],
                ['jack', '...'],
                ['wait', 0.7],
                ['caption', 'An adult male guest emerges, wearing a towel and an expression of total calm.'],
                ['wait', 0.7],
                ['anim', 'jack', 'frightened'],
                ['say', 'guest', 'Sorry.'],
                ['jack', 'Entirely my fault.'],
                ['wait', 0.5],
                ['say', 'guest', 'You are in my room.'],
                ['jack', 'I am aware of that now, yes.'],
                ['wait', 0.6],
                ['caption', 'The guest walks away, adjusting the towel with enormous dignity.'],
                ['wait', 0.8],
                ['anim', 'jack', 'idle'],
                ['jack', "I've learned something today."],
                ['wait', 0.9],
                ['jack', "I don't know what, but I've learned something."],
                ['flag', 'towelGag'],
                ['cheeky', 'towelGag'],
                ['score', 5, 'towelGag'],
              ],
            ],
          ],
        },
      },
      {
        id: 'room12_bed',
        name: 'Bed',
        rect: { x: 28, y: 74, w: 94, h: 46 },
        walkTo: [70, 138],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'Made. Untouched. Nobody has slept here tonight, or possibly ever.']],
          PULL: [
            ['jack', 'Under the bed: a suitcase, and inside it, nothing at all.'],
            ['wait', 0.3],
            ['jack', 'Someone has been paying for an empty suitcase to sit in an empty room since 1974.'],
            ['flag', 'emptySuitcase'],
            ['score', 25, 'suitcase'],
          ],
        },
      },
      {
        id: 'dressing_table',
        name: 'Dressing Table',
        rect: { x: 244, y: 52, w: 58, h: 34 },
        walkTo: [270, 134],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'A mirror, a Gideon Bible and a saucer with two mints in it.']],
          TAKE: [
            ['if', ['flag', 'gotBlankTape'],
              [['jack', 'I have taken the only interesting thing in the drawer.']],
              [
                ['sfx', 'pickup'],
                ['jack', 'In the drawer: a blank cassette, still in its cellophane.'],
                ['wait', 0.3],
                ['jack', 'Ninety minutes of nothing at all, waiting in a room nobody uses.'],
                ['give', 'blank_cassette'],
                ['flag', 'gotBlankTape'],
                ['score', 30, 'blankTape'],
              ],
            ],
          ],
        },
      },
      {
        id: 'room12_window',
        name: 'Window',
        rect: { x: 150, y: 26, w: 74, h: 46 },
        verbs: {
          LOOK: [['jack', 'The sea, the pier, and the arcade sign glowing away on the front like nothing is wrong.']],
        },
      },
    ],
    exits: [
      { id: 'room12_out', name: 'Corridor', rect: { x: 0, y: 102, w: 22, h: 42 }, to: 'hotel_corridor', entry: 'fromRoom12', walkTo: [24, 138], arrow: 'left' },
    ],
  },

  // -------------------------------------------- s.48 the changing cabins

  pool_cabins: {
    id: 'pool_cabins',
    name: 'Seafront Pool',
    background: 'pool_cabins',
    music: 'seafront',
    // The pool fills the left; cabins upstage centre, sign near-camera right.
    autoFloor: false,
    walkboxes: [[64, 78, 318, 74, 320, 143, 0, 143]],
    depth: { yNear: 143, yFar: 76, scaleNear: 1, scaleFar: 0.55 },
    blockers: [
      [0, 70, 122, 70, 122, 152, 0, 152],
      [150, 70, 242, 70, 242, 102, 150, 102],
      [270, 88, 288, 88, 288, 101, 270, 101],
      [265, 104, 311, 104, 311, 141, 265, 141],
    ],
    occluders: [
      { polygon: [265, 68, 311, 68, 311, 141, 265, 141], y: 141 },
    ],
    entries: {
      default: { x: 260, y: 120, facing: 'west' },
      fromBeach: { x: 156, y: 140, facing: 'north' },
    },
    characters: [
      {
        id: 'bather', sprite: 'char.cabin', x: 196, y: 106, facing: 'south',
        visibleIf: ['flag', 'wrongCabin'],
        patrol: [[196, 106], [160, 110], [196, 106], [232, 108]],
        patrolPause: [22, 50],
      },
    ],
    onFirstEnter: [
      ['jack', 'An open-air swimming pool in September. The British are not a sensible people.'],
    ],
    hotspots: [
      {
        id: 'cabin1',
        name: 'Cabin 1',
        rect: { x: 152, y: 27, w: 29, h: 74 },
        walkTo: [166, 106],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'Cabin one. Curtain drawn.']],
          // Almost always empty. Very occasionally it is not, once per game -
          // the tease that keeps the other cabins tense. Nothing is ever
          // shown: a shriek, a hard cut, and Jack apologising to a curtain.
          OPEN: [
            ['if', ['flag', 'cabin1Occupied'],
              [['jack', 'I knocked once tonight and I am still recovering. The flip-flop can keep it.']],
              [
                ['if', ['chance', 0.15],
                  [
                    ['sfx', 'door'],
                    ['fade', 'out', 0.08],
                    ['say', 'voice', 'DO YOU MIND.'],
                    ['wait', 0.5],
                    ['fade', 'in', 0.12],
                    ['anim', 'jack', 'frightened'],
                    ['jack', 'The sign said VACANT.'],
                    ['say', 'voice', 'THE SIGN IS A LIAR.'],
                    ['wait', 0.4],
                    ['jack', 'I apologise to you and to the sign.'],
                    ['anim', 'jack', 'idle'],
                    ['flag', 'cabin1Occupied'],
                    ['cheeky', 'cabin1Occupied'],
                    ['score', 5, 'cabin1Occupied'],
                  ],
                  [['jack', 'Empty. A puddle and a lost flip-flop.']],
                ],
              ],
            ],
          ],
        },
      },
      {
        // Spec s.48: the wrong cabin. One frame of silhouette, then a hard cut
        // to Jack outside. +1 cheeky, exactly as specified.
        id: 'cabin2',
        name: 'Cabin 2',
        rect: { x: 182, y: 27, w: 28, h: 74 },
        walkTo: [196, 106],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'Cabin two. The curtain is not quite closed.']],
          OPEN: [
            ['if', ['flag', 'wrongCabin'],
              [['jack', 'I am not doing that again. Once was an accident. Twice is a hobby.']],
              [
                ['sfx', 'door'],
                ['fade', 'out', 0.08],
                ['wait', 0.25],
                ['fade', 'in', 0.12],
                ['wait', 0.4],
                ['anim', 'jack', 'frightened'],
                ['jack', 'That was not the correct cabin.'],
                ['wait', 0.6],
                ['say', 'voice', 'IT IS NOT.'],
                ['wait', 0.5],
                ['jack', 'Understood.'],
                ['wait', 0.4],
                ['anim', 'jack', 'idle'],
                ['flag', 'wrongCabin'],
                ['cheeky', 'wrongCabin'],
                ['score', 5, 'wrongCabin'],
                ['wait', 0.4],
                ['jack', 'The correct cabin is, I am now certain, next door.'],
                ['wait', 0.6],
                ['caption', 'The cabin door opens behind him.'],
                ['wait', 0.5],
                ['jack', 'And she is now standing behind me, is she.'],
                ['wait', 0.4],
                ['say', 'voice', 'I am.'],
              ],
            ],
          ],
        },
      },
      {
        id: 'cabin3',
        name: 'Cabin 3',
        rect: { x: 211, y: 27, w: 28, h: 74 },
        walkTo: [224, 106],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'Cabin three. Curtain closed properly, by someone competent.']],
          OPEN: [
            ['if', ['flag', 'gotLighter'],
              [['jack', 'Empty now.']],
              [
                ['sfx', 'pickup'],
                ['jack', 'Empty. Except for a cigarette lighter on the bench, engraved A.B.'],
                ['wait', 0.3],
                ['jack', 'Arthur has been swimming. There is an image I will be carrying for some time.'],
                ['give', 'lighter'],
                ['flag', 'gotLighter'],
                ['score', 20, 'lighter'],
              ],
            ],
          ],
        },
      },
      {
        id: 'bather',
        name: 'Bather',
        rect: { x: 184, y: 74, w: 24, h: 34 },
        tracks: 'bather',
        walkTo: [196, 122],
        facing: 'north',
        visibleIf: ['flag', 'wrongCabin'],
        defaultVerb: 'TALK',
        verbs: {
          LOOK: [
            ['jack', 'Wrapped in a towel, entirely composed, and waiting for me to say something.'],
            ['wait', 0.4],
            ['jack', 'One of us is having a much worse evening than the other.'],
          ],
          TALK: [['dialogue', 'bather_talk']],
        },
      },
      {
        id: 'the_pool',
        name: 'Swimming Pool',
        rect: { x: 0, y: 80, w: 118, h: 64 },
        walkTo: [128, 120],
        facing: 'west',
        verbs: {
          LOOK: [['jack', 'Unheated, unlit, and roughly the temperature of the North Sea it was filled from.']],
          USE: [['die', 'Jack goes for a swim in an unlit outdoor pool in September, fully clothed.']],
        },
      },
      {
        id: 'no_running',
        name: 'Sign',
        rect: { x: 265, y: 68, w: 46, h: 72 },
        walkTo: [255, 130],
        facing: 'east',
        verbs: {
          LOOK: [['jack', 'NO RUNNING. NO DIVING. NO PETTING. Somebody had a very specific summer.'], ['cheeky', 'poolSign']],
        },
      },
    ],
    exits: [
      // The promenade back to town runs off to the right; the left of the
      // frame is all water, so nothing can exit that way.
      { id: 'pool_out', name: 'Seafront', rect: { x: 308, y: 40, w: 12, h: 70 }, to: 'seafront', entry: 'default', walkTo: [300, 96], arrow: 'right' },
      {
        id: 'pool_beach', name: 'The Far Beach', rect: { x: 126, y: 134, w: 62, h: 10 },
        to: 'nudist_beach', entry: 'default', walkTo: [156, 141], arrow: 'down',
        requires: ['flag', 'beachUnlocked'],
        lockedText: 'The path along the shingle. There is nothing down there worth the walk.',
      },
    ],
  },

  // ----------------------------------------------- s.49 the far beach

  nudist_beach: {
    id: 'nudist_beach',
    name: 'The Far Beach',
    background: 'nudist_beach',
    music: 'seafront',
    walkboxes: [[10, 112, 310, 112, 314, 140, 6, 140]],
    depth: { yNear: 140, yFar: 112, scaleNear: 1, scaleFar: 0.86 },
    entries: { default: { x: 40, y: 132, facing: 'east' } },
    ambience: [{ sfx: 'seagull', everyMin: 12, everyMax: 26 }],
    onFirstEnter: [
      ['jack', 'The postcard did mention this stretch of beach. The postcard was, on reflection, a warning.'],
      ['wait', 0.6],
      ['jack', 'Well.'],
      ['wait', 0.8],
      ["jack", "That's one way to spend a Saturday."],
      ['cheeky', 'beachArrival'],
    ],
    hotspots: [
      {
        id: 'umbrella',
        name: 'Beach Umbrella',
        rect: { x: 44, y: 58, w: 44, h: 34 },
        walkTo: [66, 130],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', 'Strategically positioned.'],
            ['wait', 0.4],
            ['jack', 'Whoever owns that umbrella has an instinct for composition that most film directors never develop.'],
            ['cheeky', 'umbrella'],
          ],
          PUSH: [['jack', 'Moving that umbrella would be an act of genuine public menace.']],
        },
      },
      {
        id: 'towel',
        name: 'Towel',
        rect: { x: 116, y: 94, w: 46, h: 16 },
        walkTo: [138, 130],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', 'Also strategically positioned.'],
            ['wait', 0.4],
            ['jack', 'There is a man on this beach whose entire dignity is resting on eleven inches of Lancashire cotton, and he is asleep.'],
            ['cheeky', 'towel'],
          ],
          TAKE: [['jack', 'Taking a towel from this particular beach would start a chain of events I am not equipped for.']],
        },
      },
      {
        id: 'sunbather',
        name: 'Sunbather',
        rect: { x: 218, y: 66, w: 34, h: 30 },
        walkTo: [232, 132],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', "I'm beginning to understand the importance of towels."],
            ['cheeky', 'sunbather'],
          ],
          TALK: [
            ['jack', 'Evening.'],
            ['wait', 0.6],
            ['caption', 'A hand is raised in greeting, from behind a windbreak.'],
            ['jack', 'Evening.'],
            ['wait', 0.5],
            ['jack', 'That is the most British thing that has ever happened to me.'],
            ['cheeky', 'beachGreeting'],
            ['wait', 0.6],
            ['say', 'voice', 'You are letting the wind in.'],
            ['wait', 0.4],
            ['jack', 'Sorry.'],
            ['wait', 0.5],
            ['caption', 'Jack takes one careful step to the left.'],
            ['say', 'voice', 'Better.'],
          ],
        },
      },
      {
        id: 'beach_clothes',
        name: 'Folded Clothes',
        rect: { x: 150, y: 96, w: 40, h: 18 },
        walkTo: [170, 130],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', 'A pile of clothes folded to a standard the Army would query.'],
            ['wait', 0.4],
            ['jack', 'Shirt, trousers, socks rolled into each other, and a wristwatch placed on top at exactly the angle it would be in a shop window.'],
            ['wait', 0.4],
            ['jack', 'Somebody undressed on a public beach with more ceremony than I get dressed with.'],
            ['cheeky', 'foldedClothes'],
            ['score', 5, 'foldedClothes'],
          ],
          TAKE: [['jack', 'Stealing the clothes off a nudist beach. There is a special wing for that.']],
        },
      },
      {
        id: 'beach_sign',
        name: 'Notice',
        rect: { x: 96, y: 60, w: 44, h: 34 },
        walkTo: [116, 128],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', 'NATURIST BEACH. PLEASE RESPECT OTHER USERS.'],
            ['wait', 0.4],
            ['jack', 'And underneath, in biro: AND THE SEAWEED.'],
            ['wait', 0.5],
            ['jack', 'I have questions, and I am not going to ask any of them.'],
            ['cheeky', 'beachSign'],
            ['score', 5, 'beachSign'],
          ],
        },
      },
      {
        id: 'volleyball',
        name: 'Volleyball Net',
        rect: { x: 196, y: 52, w: 62, h: 40 },
        walkTo: [214, 130],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', 'A volleyball net, and a game in progress at the far end of the beach.'],
            ['wait', 0.5],
            ['jack', 'From here it is four dots and a fifth dot going up and down.'],
            ['wait', 0.5],
            ['jack', 'I am told this is the traditional sport of these places. I am also told it is played with tremendous enthusiasm and no support whatsoever.'],
            ['cheeky', 'volleyball'],
            ['score', 5, 'volleyball'],
          ],
          USE: [
            ['jack', 'Join in? In a jacket and jeans?'],
            ['wait', 0.5],
            ['jack', 'I would be the strangest thing on this beach by a distance, and look at the competition.'],
          ],
        },
      },
      {
        id: 'binoculars_post',
        name: 'Coin Telescope',
        rect: { x: 268, y: 48, w: 30, h: 52 },
        walkTo: [258, 132],
        facing: 'east',
        verbs: {
          LOOK: [
            ['jack', 'A coin-operated telescope, pointed inland, at a beach full of people.'],
            ['wait', 0.5],
            ['jack', 'Somebody has bolted it into that position. Somebody else has scratched SORRY into the housing.'],
            ['cheeky', 'telescope'],
            ['score', 5, 'telescope'],
          ],
          USE: [
            ['if', ['flag', 'usedTelescope'],
              [['jack', 'Once was research. Twice is a hobby, and I have been told about hobbies.']],
              [
                ['sfx', 'coin'],
                ['caption', 'Jack puts his eye to the telescope.'],
                ['wait', 0.8],
                ['anim', 'jack', 'surprised'],
                ['wait', 0.5],
                ['caption', 'It is pointed directly at a seagull, eleven inches away.'],
                ['wait', 0.6],
                ['jack', 'That bird and I have both had a shock.'],
                ['wait', 0.5],
                ['anim', 'jack', 'idle'],
                ['jack', 'And I have paid twenty pence for it, which makes me the loser here.'],
                ['flag', 'usedTelescope'],
                ['cheeky', 'telescopeGag'],
                ['score', 10, 'telescopeGag'],
              ],
            ],
          ],
        },
      },
      {
        id: 'windbreak',
        name: 'Windbreak',
        rect: { x: 246, y: 98, w: 74, h: 30 },
        verbs: {
          LOOK: [
            ['jack', 'Four poles and a striped canvas, holding back the wind and, thankfully, the view.'],
            ['wait', 0.4],
            ['jack', 'The British seaside in one object: a small fabric wall, erected against nature, by people who came here voluntarily.'],
          ],
          PUSH: [
            ['sfx', 'deny'],
            ['jack', 'If I pull that out of the shingle I will be responsible for the single most eventful moment in this town since 1974.'],
            ['cheeky', 'windbreakPush'],
          ],
        },
      },
      {
        id: 'shingle',
        name: 'Shingle',
        rect: { x: 20, y: 116, w: 90, h: 22 },
        walkTo: [66, 134],
        facing: 'south',
        verbs: {
          LOOK: [['jack', 'Pebbles, seaweed, and a ring-pull from a drink they stopped making.']],
          TAKE: [
            ['if', ['flag', 'beachToken'],
              [['jack', 'I have had my one interesting pebble.']],
              [
                ['sfx', 'pickup'],
                ['jack', 'An arcade token, worn smooth. STARLIGHT ARCADE, 1974.'],
                ['give', 'token'],
                ['flag', 'beachToken'],
                ['score', 20, 'beachToken'],
              ],
            ],
          ],
        },
      },
    ],
    exits: [
      { id: 'beach_out', name: 'Seafront Pool', rect: { x: 0, y: 108, w: 20, h: 36 }, to: 'pool_cabins', entry: 'fromBeach', walkTo: [22, 134], arrow: 'left' },
    ],
  },

  // ----------------------------------------------- s.50/51 the video shop

  video_shop: {
    id: 'video_shop',
    name: 'Video Rental Shop',
    background: 'video_shop',
    music: 'arcade',
    // Open lino floor. The tape shelving fills the near left corner.
    autoFloor: false,
    walkboxes: [[84, 125, 310, 125, 316, 143, 80, 143]],
    depth: { yNear: 143, yFar: 125, scaleNear: 1, scaleFar: 0.86 },
    blockers: [
      [0, 120, 84, 120, 84, 146, 0, 146],
    ],
    occluders: [
      { polygon: [0, 20, 84, 20, 84, 152, 0, 152], y: 152 },
    ],
    entries: { default: { x: 113, y: 133, facing: 'south' }, fromAlley: { x: 290, y: 132, facing: 'west' } },
    characters: [{
      id: 'graham', sprite: 'char.graham', x: 250, y: 130, facing: 'south',
      patrol: [[250, 130], [180, 134], [250, 130], [290, 132]],
      patrolPause: [16, 38],
    }],
    hotspots: [
      {
        id: 'graham',
        name: 'Graham',
        rect: { x: 236, y: 86, w: 28, h: 40 },
        walkTo: [230, 130],
        facing: 'east',
        defaultVerb: 'TALK',
        verbs: {
          LOOK: [['jack', 'Thirty-four, moustache, polo shirt, and the settled calm of a man who has heard every excuse.']],
          TALK: [['dialogue', 'graham_first']],
        },
      },
      {
        id: 'vhs_wall',
        name: 'Video Cassettes',
        rect: { x: 8, y: 24, w: 182, h: 76 },
        walkTo: [100, 128],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', 'Four hundred empty cases. The actual tapes are behind the counter, because 1987 does not trust anybody.'],
          ],
          TAKE: [['jack', 'An empty box. The tape is behind the counter, guarded like uranium.']],
        },
      },
      {
        id: 'display_projector',
        name: 'Display Projector',
        rect: { x: 208, y: 60, w: 34, h: 24 },
        walkTo: [220, 128],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'A cine projector in the window, with a card saying NOT FOR SALE and no fuse in it.']],
          TAKE: [['jack', 'Graham is watching me. Graham has been watching me since I came in.']],
        },
      },
      {
        id: 'beaded_curtain',
        name: 'Beaded Curtain',
        rect: { x: 286, y: 24, w: 34, h: 60 },
        walkTo: [292, 126],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'A beaded curtain. The international symbol for "the shopkeeper would rather you did not".']],
          OPEN: [['sfx', 'switch'], ['goto', 'video_shop_back', 'default']],
        },
      },
    ],
    exits: [
      { id: 'video_out', name: 'Back Alley', rect: { x: 90, y: 22, w: 42, h: 106 }, to: 'back_alley', entry: 'default', walkTo: [113, 132], arrow: 'up' },
      { id: 'video_office', name: "Graham's Office", rect: { x: 148, y: 30, w: 34, h: 90 }, to: 'graham_office', entry: 'default', walkTo: [172, 133], arrow: 'up' },
      { id: 'video_back', name: 'Back Section', rect: { x: 258, y: 20, w: 50, h: 108 }, to: 'video_shop_back', entry: 'default', walkTo: [270, 133], arrow: 'right' },
    ],
  },

  video_shop_back: {
    id: 'video_shop_back',
    name: 'Back Section',
    background: 'video_shop_back',
    music: 'arcade',
    // Cobbles behind the shop. A crate on the right and a bin on the left sit near-camera.
    autoFloor: false,
    walkboxes: [[16, 132, 300, 132, 306, 143, 10, 143]],
    depth: { yNear: 143, yFar: 132, scaleNear: 1, scaleFar: 0.9 },
    blockers: [
      [292, 133, 320, 133, 320, 150, 292, 150],
      [4, 136, 36, 136, 36, 150, 4, 150],
    ],
    occluders: [
      { polygon: [292, 131, 320, 131, 320, 150, 290, 150], y: 150 },
      { polygon: [4, 136, 36, 136, 36, 150, 4, 150], y: 150 },
    ],
    entries: { default: { x: 50, y: 132, facing: 'east' } },
    hotspots: [
      {
        // Spec s.50. The joke is entirely the titles and Graham's timing.
        id: 'adult_shelf',
        name: 'Shelf',
        rect: { x: 40, y: 24, w: 240, h: 66 },
        walkTo: [160, 132],
        facing: 'north',
        verbs: {
          LOOK: [
            ['if', ['flag', 'grahamShelf'],
              [['jack', 'I have read the titles. They are not improved by a second reading.']],
              [
                ['jack', 'NIGHT OF THE NAKED ROBOTS.'],
                ['jack', "THE SECRET LIFE OF MRS. ROBINSON'S NEIGHBOUR."],
                ['jack', 'TOPLESS FROM OUTER SPACE.'],
                ['jack', "THE FULL MONTY WASN'T INVENTED YET."],
                ['jack', 'LOVE IN THE TIME OF VHS.'],
                ['wait', 0.5],
                ['jack', 'Cinema was a simpler place before streaming.'],
                ['wait', 0.4],
                ['jack', 'Whatever that turns out to mean.'],
                ['flag', 'grahamShelf'],
                ['cheeky', 'videoShelf'],
                ['score', 5, 'videoShelf'],
                ['wait', 0.6],
                ['dialogue', 'graham_educational'],
              ],
            ],
          ],
          TAKE: [['jack', 'No. Absolutely not. I would have to carry it.']],
        },
      },
      {
        id: 'over18_sign',
        name: 'Sign',
        rect: { x: 108, y: 82, w: 104, h: 14 },
        verbs: {
          LOOK: [['jack', 'OVER 18 ONLY. Enforced by a man who has known me since I was nine.'], ['cheeky', 'over18']],
        },
      },
    ],
    exits: [
      { id: 'back_out', name: 'Video Shop', rect: { x: 0, y: 42, w: 30, h: 58 }, to: 'video_shop', entry: 'default', walkTo: [30, 132], arrow: 'left' },
    ],
  },

  graham_office: {
    id: 'graham_office',
    name: "Graham's Office",
    background: 'graham_office',
    music: 'arcade',
    // Carpet in front of the desk. The desk and the near filing cabinet are both down-stage.
    autoFloor: false,
    walkboxes: [[16, 130, 300, 130, 306, 143, 10, 143]],
    depth: { yNear: 143, yFar: 130, scaleNear: 1, scaleFar: 0.9 },
    blockers: [
      [22, 127, 178, 127, 178, 152, 22, 152],
      [265, 127, 320, 127, 320, 152, 265, 152],
    ],
    occluders: [
      { polygon: [22, 100, 178, 100, 178, 152, 20, 152], y: 152 },
      { polygon: [265, 97, 320, 97, 320, 152, 263, 152], y: 152 },
    ],
    entries: { default: { x: 210, y: 137, facing: 'south' } },
    hotspots: [
      {
        // Spec s.51: tacky calendar, genuinely useful clue.
        id: 'calendar',
        name: 'Calendar',
        rect: { x: 208, y: 26, w: 56, h: 64 },
        walkTo: [226, 130],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', 'A 1987 calendar of the sort that comes free with a car exhaust.'],
            ['wait', 0.4],
            ["jack", "I can't believe I'm solving a mystery with this."],
            ['cheeky', 'calendar'],
            ['if', ['noflag', 'calendarClue'],
              [
                ['wait', 0.5],
                ['jack', 'There are numbers printed beside the months. Three, one, four, one, five, nine.'],
                ['wait', 0.4],
                ['jack', 'Finally. Something useful in a calendar.'],
                ['flag', 'calendarClue'],
                ['flag', 'fuseNoticed'],
                ['score', 25, 'calendarClue'],
              ],
            ],
          ],
          TAKE: [
            ['if', ['has', 'calendar'],
              [['jack', 'I have it, and I am not proud.']],
              [
                ['if', ['flag', 'calendarClue'],
                  [
                    ['sfx', 'pickup'],
                    ['give', 'calendar'],
                    ['jack', 'I am now a man walking around town with that under his arm. Excellent.'],
                  ],
                  [['jack', 'I should read it before I steal it. That is the correct order.']],
                ],
              ],
            ],
          ],
        },
      },
      {
        id: 'graham_desk',
        name: 'Desk',
        rect: { x: 60, y: 82, w: 110, h: 30 },
        walkTo: [190, 136],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'Rental cards, overdue notices, and a mug of tea with a skin on it you could resole a shoe with.']],
          OPEN: [['jack', 'Overdue notices going back four years. One of them is mine. I am putting it back.'], ['cheeky', 'overdue']],
        },
      },
      {
        id: 'dead_plant',
        name: 'Pot Plant',
        rect: { x: 282, y: 74, w: 26, h: 40 },
        verbs: {
          LOOK: [['jack', 'Dead. In the way that only an office plant can be dead: slowly, and in full view.']],
        },
      },
    ],
    exits: [
      { id: 'goffice_out', name: 'Video Shop', rect: { x: 180, y: 10, w: 70, h: 125 }, to: 'video_shop', entry: 'default', walkTo: [210, 138], arrow: 'up' },
    ],
  },
};
