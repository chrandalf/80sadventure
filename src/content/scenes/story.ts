import type { Scene } from '../../game/types';

const OUTDOOR = [[6, 104, 314, 104, 318, 140, 2, 140]];
const OUTDOOR_DEPTH = { yNear: 140, yFar: 104, scaleNear: 1, scaleFar: 0.7 };

/**
 * The mystery's own locations: the cinema, the clock tower, the lighthouse and
 * the room under the arcade (spec Acts II-VI).
 */
export const STORY_SCENES: Record<string, Scene> = {
  cinema_exterior: {
    id: 'cinema_exterior',
    name: 'The Regal Cinema',
    background: 'cinema_exterior',
    music: 'cinema',
    walkboxes: OUTDOOR,
    depth: OUTDOOR_DEPTH,
    entries: { default: { x: 60, y: 132, facing: 'east' } },
    onFirstEnter: [
      ['jack', 'Shut since 1976. And yet somebody has been paying the electricity bill.'],
      ['score', 10, 'cinemaFound'],
    ],
    ambience: [{ sfx: 'seagull', everyMin: 14, everyMax: 30 }],
    hotspots: [
      {
        id: 'marquee',
        name: 'Marquee',
        rect: { x: 44, y: 28, w: 232, h: 34 },
        verbs: {
          LOOK: [['jack', 'THE REGAL. CLOSED. Sixty-two bulbs, of which about eighteen still have opinions.']],
        },
      },
      {
        id: 'cinema_doors',
        name: 'Boarded Doors',
        rect: { x: 126, y: 62, w: 68, h: 44 },
        walkTo: [160, 130],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'Boarded up. Badly. One of the boards has been taken off and put back so often the nail holes have given up.']],
          PULL: [
            ['sfx', 'door'],
            ['jack', 'The board comes away in my hand. Somebody has been coming and going for years.'],
            ['flag', 'cinemaEntered'],
            ['score', 15, 'cinemaEntered'],
          ],
          OPEN: [['jack', 'Not the doors. The board beside them is the loose one.']],
        },
      },
      {
        id: 'air_vent',
        name: 'Pavement Grating',
        rect: { x: 60, y: 108, w: 44, h: 20 },
        walkTo: [82, 132],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'A ventilation grating. The old cinema plant must still be running down there, which explains the electricity bill.']],
          PUSH: [['jack', 'It is a grating. It is doing its one job.']],
          USE: [
            ['if', ['flag', 'ventGag'],
              [['jack', 'I have stood on that grating once already this evening. Twice would be a hobby.']],
              [
                ['caption', 'Jack stands on the grating.'],
                ['wait', 0.6],
                ['sfx', 'buzz'],
                ['caption', 'Somewhere below, a fan starts up.'],
                ['wait', 0.5],
                ['caption', 'A column of warm air rushes up around him.'],
                ['wait', 0.7],
                ['anim', 'jack', 'surprised'],
                ['jack', '...'],
                ['wait', 0.9],
                ['jack', 'For one moment there I thought this was going to be a very different sort of film.'],
                ['wait', 0.6],
                ['jack', 'It has blown a crisp packet onto my shoe.'],
                ['wait', 0.5],
                ['anim', 'jack', 'idle'],
                ['jack', 'Nineteen eighty-seven, ladies and gentlemen.'],
                ['flag', 'ventGag'],
                ['cheeky', 'ventGag'],
                ['score', 5, 'ventGag'],
              ],
            ],
          ],
        },
      },
      {
        id: 'red_coat_cinema',
        name: 'Woman in the Red Coat',
        rect: { x: 236, y: 60, w: 26, h: 46 },
        walkTo: [216, 130],
        facing: 'east',
        visibleIf: ['and', ['flag', 'followedRedCoat'], ['noflag', 'redCoatGag']],
        verbs: {
          LOOK: [
            ['jack', 'She is standing in the doorway of a cinema that has been shut for eleven years, in a red coat, at nine at night.'],
            ['wait', 0.5],
            ['jack', 'In a film this would be scored.'],
          ],
          TALK: [
            ['jack', 'Excuse me. You were on the pier.'],
            ['wait', 0.6],
            ['caption', 'She turns.'],
            ['wait', 0.5],
            ['caption', 'The wind comes off the sea and takes the coat with it.'],
            ['wait', 0.8],
            ['anim', 'jack', 'surprised'],
            ['wait', 0.7],
            ['caption', 'Underneath, she is wearing a projectionist\'s overall and carrying a film can.'],
            ['wait', 0.7],
            ['anim', 'jack', 'annoyed'],
            ['jack', 'Right.'],
            ['wait', 0.5],
            ['say', 'voice', 'Were you expecting something?'],
            ['jack', 'No.'],
            ['wait', 0.4],
            ['jack', 'Yes. But no.'],
            ['wait', 0.6],
            ['say', 'voice', 'The reel is in the projection room. You will need butter.'],
            ['jack', 'That is a sentence I was not braced for either.'],
            ['wait', 0.5],
            ['caption', 'She walks past him and is gone.'],
            ['flag', 'redCoatGag'],
            ['flag', 'greaseHinted'],
            ['cheeky', 'redCoatGag'],
            ['score', 20, 'redCoatGag'],
            ['anim', 'jack', 'idle'],
          ],
        },
      },
      {
        id: 'poster_case',
        name: 'Poster Case',
        rect: { x: 212, y: 60, w: 34, h: 44 },
        walkTo: [226, 128],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'An empty poster case. Whatever was in it has been gone so long the paper has left a shadow.']],
        },
      },
    ],
    exits: [
      { id: 'cin_out', name: 'Pier', rect: { x: 0, y: 100, w: 22, h: 44 }, to: 'pier', entry: 'default', walkTo: [24, 132], arrow: 'left' },
      {
        id: 'cin_in', name: 'Inside', rect: { x: 126, y: 62, w: 68, h: 44 },
        to: 'cinema_lobby', entry: 'default', walkTo: [160, 130], arrow: 'up',
        requires: ['flag', 'cinemaEntered'],
        lockedText: 'Boarded shut. Though one of those boards is looser than the others.',
      },
    ],
  },

  cinema_lobby: {
    id: 'cinema_lobby',
    name: 'Cinema Lobby',
    background: 'cinema_lobby',
    music: 'cinema',
    // Carpet in front of the ticket kiosk; the rope barrier is near-camera on the right.
    autoFloor: false,
    walkboxes: [[16, 126, 300, 126, 306, 143, 10, 143]],
    depth: { yNear: 143, yFar: 126, scaleNear: 1, scaleFar: 0.86 },
    blockers: [
      [78, 122, 147, 122, 147, 138, 78, 138],
      [278, 124, 320, 124, 320, 146, 278, 146],
    ],
    occluders: [
      { polygon: [78, 20, 147, 20, 147, 138, 77, 134], y: 138 },
      { polygon: [278, 105, 320, 105, 320, 148, 276, 148], y: 148 },
    ],
    entries: { default: { x: 60, y: 132, facing: 'east' } },
    ambience: [{ sfx: 'buzz', everyMin: 10, everyMax: 24 }],
    onFirstEnter: [
      ['jack', 'Dust, damp carpet and the smell of eleven years of nobody.'],
      ['wait', 0.4],
      ['caption', 'Somewhere upstairs, a projector is running.'],
      ['jack', 'That is not a sound an empty building should be making.'],
      ['sfx', 'projector'],
    ],
    hotspots: [
      {
        id: 'ticket_booth',
        name: 'Ticket Booth',
        rect: { x: 116, y: 46, w: 76, h: 48 },
        walkTo: [154, 128],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'A ticket booth with a roll of tickets still in it. Seat prices in old money.']],
          TAKE: [['jack', 'A ticket to a film that stopped showing before I could read.'], ['cheeky', 'ticket']],
        },
      },
      {
        id: 'projection_door',
        name: 'Projection Room Door',
        rect: { x: 268, y: 42, w: 52, h: 52 },
        walkTo: [268, 126],
        facing: 'east',
        verbs: {
          LOOK: [
            ['jack', 'The door to the projection room. Warped, swollen and jammed solid.'],
            ['if', ['noflag', 'doorNoticed'],
              [
                ['jack', 'The latch has dropped inside the frame. If I could grease the mechanism and hook the latch, it would open.'],
                ['flag', 'doorNoticed'],
                ['score', 10, 'doorNoticed'],
              ],
            ],
          ],
          OPEN: [
            ['if', ['flag', 'projectionOpen'],
              [['goto', 'cinema_projection', 'default']],
              [['jack', 'Jammed. Properly jammed, not adventure-game jammed.']],
            ],
          ],
          PULL: [['jack', 'I pull. The building pulls back and wins.']],
        },
        useWith: {
          butter: [
            ['if', ['flag', 'doorGreased'],
              [['jack', 'It is as buttered as a door needs to be.']],
              [
                ['sfx', 'switch'],
                ['take', 'butter'],
                ['jack', 'I am greasing a door hinge with catering butter. Somewhere, a qualified locksmith is weeping.'],
                ['flag', 'doorGreased'],
                ['score', 20, 'doorGreased'],
              ],
            ],
          ],
          coat_hanger: [
            ['if', ['flag', 'doorGreased'],
              [
                ['sfx', 'door'],
                ['jack', 'Hook, twist, lift.'],
                ['wait', 0.4],
                ['jack', 'I feel like I am about to commit a very British crime.'],
                ['flag', 'projectionOpen'],
                ['score', 30, 'projectionOpen'],
              ],
              [['jack', 'The latch will not move. It needs greasing before anything is going to hook anything.']],
            ],
          ],
          screwdriver: [['jack', 'The hinges are on the other side. Whoever hung this door was thinking ahead.']],
        },
      },
      {
        id: 'carpet',
        name: 'Carpet',
        rect: { x: 20, y: 100, w: 90, h: 40 },
        verbs: {
          LOOK: [['jack', 'A carpet pattern designed specifically to hide everything that has ever been spilled on it.']],
        },
      },
    ],
    exits: [
      { id: 'lobby_out', name: 'Outside', rect: { x: 0, y: 100, w: 22, h: 44 }, to: 'cinema_exterior', entry: 'default', walkTo: [24, 132], arrow: 'left' },
      {
        id: 'lobby_proj', name: 'Projection Room', rect: { x: 268, y: 42, w: 52, h: 52 },
        to: 'cinema_projection', entry: 'default', walkTo: [268, 126], arrow: 'up',
        requires: ['flag', 'projectionOpen'],
        lockedText: 'The door is jammed solid.',
      },
    ],
  },

  cinema_projection: {
    id: 'cinema_projection',
    name: 'Projection Room',
    background: 'cinema_projection',
    music: 'cinema',
    // A narrow strip of floor between the bench, the projector stand and the shelving - the room is almost entirely furniture.
    autoFloor: false,
    walkboxes: [[16, 134, 300, 134, 306, 143, 12, 143]],
    depth: { yNear: 143, yFar: 134, scaleNear: 1, scaleFar: 0.92 },
    blockers: [
      [0, 128, 89, 128, 89, 152, 0, 152],
      [72, 128, 131, 128, 131, 152, 72, 152],
      [160, 128, 251, 128, 251, 152, 160, 152],
    ],
    occluders: [
      { polygon: [0, 110, 89, 110, 89, 152, 0, 152], y: 152 },
      { polygon: [72, 95, 131, 95, 131, 152, 70, 152], y: 152 },
      { polygon: [160, 97, 251, 97, 251, 152, 158, 152], y: 152 },
    ],
    entries: { default: { x: 60, y: 132, facing: 'east' } },
    ambience: [{ sfx: 'projector', everyMin: 12, everyMax: 28 }],
    hotspots: [
      {
        id: 'projector',
        name: 'Projector',
        rect: { x: 24, y: 30, w: 88, h: 62 },
        walkTo: [70, 128],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', 'A carbon-arc projector from about 1952. Beautiful. Missing a fuse.'],
            ['flag', 'projectorNoticed'],
          ],
          USE: [
            ['if', ['flag', 'filmPlayed'],
              [['jack', 'I have seen it. Once was ample.']],
              [
                ['if', ['flag', 'projectorFused'],
                  [
                    ['sfx', 'projector'],
                    ['caption', 'The lamp strikes. The reel begins to turn.'],
                    ['wait', 0.5],
                    ['vision', 'film_saturday'],
                    ['jack', 'That is the town. That is tomorrow morning. That is the arcade coming down.'],
                    ['wait', 0.5],
                    ['sfx', 'static'],
                    ['say', 'voice', "You shouldn't have seen this."],
                    ['jack', 'I get that a lot.'],
                    ['flag', 'filmPlayed'],
                    ['give', 'film_reel'],
                    ['give', 'cassette_saturday'],
                    ['flag', 'cass_saturday'],
                    ['score', 40, 'filmPlayed'],
                    ['act', 3],
                    ['music', 'mystery'],
                  ],
                  [['jack', 'No fuse, no lamp. There will be a spare in here somewhere; projectionists were hoarders.']],
                ],
              ],
            ],
          ],
        },
        useWith: {
          fuse: [
            ['sfx', 'switch'],
            ['take', 'fuse'],
            ['jack', 'Five amp. In it goes.'],
            ['flag', 'projectorFused'],
            ['score', 20, 'projectorFused'],
          ],
        },
      },
      {
        id: 'fuse_box_shelf',
        name: 'Shelf',
        rect: { x: 130, y: 96, w: 96, h: 28 },
        walkTo: [176, 132],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'Film cans, a tin of splicing cement, and a jar of fuses sorted by amperage. Someone loved this room.']],
          TAKE: [
            ['if', ['has', 'fuse'],
              [['jack', 'I have one. I am not stealing the jar.']],
              [
                ['if', ['flag', 'projectorFused'],
                  [['jack', 'The projector has its fuse. The rest can stay.']],
                  [
                    ['sfx', 'pickup'],
                    ['give', 'fuse'],
                    ['jack', 'One five-amp fuse, and the sudden responsibility of not dropping it.'],
                    ['score', 20, 'fuse'],
                  ],
                ],
              ],
            ],
          ],
        },
      },
      {
        // Spec s.53: the joke is load-bearing - the poster hides the last cassette.
        id: 'swimsuit_poster',
        name: 'Old Poster',
        rect: { x: 194, y: 20, w: 44, h: 58 },
        walkTo: [212, 126],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', "They really don't make posters like this anymore."],
            ['wait', 0.5],
            ['jack', 'Probably for the best.'],
            ['cheeky', 'cinemaPoster'],
            ['if', ['noflag', 'brickNoticed'],
              [
                ['wait', 0.4],
                ['jack', 'Hold on. It is not hanging flat.'],
                ['jack', 'There is a brick behind it that is not sitting where the other bricks are sitting.'],
                ['flag', 'brickNoticed'],
                ['score', 15, 'brickNoticed'],
              ],
            ],
          ],
          PULL: [
            ['if', ['flag', 'brickNoticed'],
              [
                ['sfx', 'switch'],
                ['jack', 'The brick comes out. Behind it, a cavity.'],
                ['wait', 0.4],
                ['if', ['nothas', 'cassette_vale'],
                  [
                    ['sfx', 'pickup'],
                    ['give', 'cassette_vale'],
                    ['flag', 'cass_vale'],
                    ['jack', 'A cassette. Labelled with two initials. E.V.'],
                    ['score', 40, 'cassetteVale'],
                    ['flag', 'foundValeCassette'],
                  ],
                  [['jack', 'Empty now. I have already taken what was in it.']],
                ],
              ],
              [['jack', 'I should look at it properly before I start pulling things off walls.']],
            ],
          ],
          TAKE: [['jack', 'I am not walking around Brighton Vale carrying that. I have a reputation. A poor one, but a reputation.']],
        },
      },
      {
        id: 'film_cans',
        name: 'Film Cans',
        rect: { x: 128, y: 108, w: 90, h: 18 },
        verbs: {
          LOOK: [
            ['jack', 'Four cans. Three are labelled with film titles.'],
            ['wait', 0.3],
            ['jack', 'The fourth just says SATURDAY.'],
            ['flag', 'sawSaturdayCan'],
          ],
        },
      },
    ],
    exits: [
      { id: 'proj_out', name: 'Lobby', rect: { x: 0, y: 100, w: 22, h: 44 }, to: 'cinema_lobby', entry: 'default', walkTo: [24, 132], arrow: 'left' },
    ],
  },

  clock_tower_ext: {
    id: 'clock_tower_ext',
    name: 'Clock Tower',
    background: 'clock_tower_ext',
    music: 'mystery',
    walkboxes: [[6, 116, 314, 116, 318, 140, 2, 140]],
    depth: { yNear: 140, yFar: 116, scaleNear: 1, scaleFar: 0.84 },
    entries: { default: { x: 60, y: 132, facing: 'east' } },
    onFirstEnter: [
      ['jack', 'Eleven seventeen.'],
      ['wait', 0.4],
      ['jack', 'It was eleven seventeen when I walked past it at half seven, as well.'],
      ['flag', 'clockNoticed'],
      ['score', 15, 'clockNoticed'],
    ],
    hotspots: [
      {
        id: 'clock_face',
        name: 'Clock Face',
        rect: { x: 134, y: 20, w: 52, h: 50 },
        verbs: {
          LOOK: [
            ['jack', 'Stopped at seventeen minutes past eleven.'],
            ['if', ['flag', 'arthurConfessed'],
              [['jack', 'The exact minute Elliot Vale stopped being a person and started being a recording.']],
              [['jack', 'Nobody has ever fixed it, and nobody has ever complained, which is the strangest part.']],
            ],
          ],
        },
      },
      {
        id: 'brass_key_spot',
        name: 'Something on the Ground',
        rect: { x: 190, y: 122, w: 24, h: 14 },
        walkTo: [200, 134],
        facing: 'south',
        visibleIf: ['flag', 'predClock'],
        verbs: {
          LOOK: [['jack', 'A brass key, lying in the gutter. Warm. Which it should not be.']],
          TAKE: [
            ['if', ['has', 'brass_key'],
              [['jack', 'I have it.']],
              [
                ['sfx', 'pickup'],
                ['give', 'brass_key'],
                ['jack', 'The machine said a key would be dropped here at half past ten tomorrow.'],
                ['wait', 0.4],
                ['jack', 'It is twenty past nine. Today.'],
                ['flag', 'clockTowerKeyFound'],
                ['score', 30, 'brassKey'],
              ],
            ],
          ],
        },
      },
      {
        id: 'maintenance_panel',
        name: 'Maintenance Panel',
        rect: { x: 144, y: 90, w: 32, h: 24 },
        walkTo: [160, 132],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'A small steel panel at the base of the tower. Council property. Council padlock.']],
          OPEN: [
            ['if', ['has', 'brass_key'],
              [['jack', 'The brass key. Obviously.'], ['sfx', 'switch'], ['flag', 'panelOpen']],
              [['jack', 'Locked, and the lock is older than the council.']],
            ],
          ],
        },
        useWith: {
          brass_key: [
            ['if', ['flag', 'panelOpen'],
              [['jack', 'Already open.']],
              [
                ['sfx', 'switch'],
                ['jack', 'It fits. Of course it fits.'],
                ['wait', 0.4],
                ['sfx', 'cassette'],
                ['jack', 'Inside: a cassette tape. Labelled JACK, in my handwriting.'],
                ['wait', 0.5],
                ["jack", "Well that's not ominous at all."],
                ['give', 'cassette_jack'],
                ['flag', 'cass_jack'],
                ['flag', 'panelOpen'],
                ['score', 40, 'cassetteJack'],
              ],
            ],
          ],
        },
      },
    ],
    exits: [
      { id: 'clock_out', name: 'Bus Station', rect: { x: 0, y: 112, w: 24, h: 32 }, to: 'bus_station', entry: 'default', walkTo: [26, 134], arrow: 'left' },
      {
        id: 'clock_in', name: 'Inside the Tower', rect: { x: 144, y: 90, w: 32, h: 26 },
        to: 'clock_tower_int', entry: 'default', walkTo: [160, 132], arrow: 'up',
        requires: ['flag', 'panelOpen'],
        lockedText: 'The panel is locked.',
      },
    ],
  },

  clock_tower_int: {
    id: 'clock_tower_int',
    name: 'Inside the Clock Tower',
    background: 'clock_tower_int',
    music: 'machine',
    walkboxes: [[16, 112, 300, 112, 306, 140, 10, 140]],
    depth: { yNear: 140, yFar: 112, scaleNear: 1, scaleFar: 0.86 },
    entries: { default: { x: 60, y: 132, facing: 'east' } },
    onFirstEnter: [['jack', 'The mechanism is intact. Oiled, even. It is not broken. It has been stopped.']],
    hotspots: [
      {
        id: 'mechanism',
        name: 'Mechanism',
        rect: { x: 46, y: 56, w: 80, h: 56 },
        walkTo: [90, 132],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', 'Somebody put a steel pin through the escapement. Deliberately. Neatly.'],
            ['flag', 'sawPin'],
            ['score', 20, 'sawPin'],
          ],
          PULL: [
            ['if', ['flag', 'sawPin'],
              [
                ['sfx', 'deny'],
                ['jack', 'It will not come out. Thirteen years of tension is holding it in place.'],
                ['jack', 'This clock stops when the machine does. Not before.'],
              ],
              [['jack', 'I should look at what I am pulling before I pull it.']],
            ],
          ],
        },
        useWith: {
          screwdriver: [['jack', 'I would need a hammer, a punch and considerably more nerve.']],
        },
      },
      {
        id: 'clock_back',
        name: 'Back of the Clock Face',
        rect: { x: 120, y: 12, w: 80, h: 80 },
        verbs: {
          LOOK: [['jack', 'From behind, the hands are just two pieces of metal. It is a great deal less mystical from this side.']],
        },
      },
      {
        id: 'recorder_shelf',
        name: 'Ledge',
        rect: { x: 216, y: 96, w: 60, h: 18 },
        walkTo: [244, 132],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'A portable cassette recorder on a ledge, plugged into nothing, with the record button taped down.']],
          TAKE: [
            ['if', ['has', 'recorder'],
              [['jack', 'I have it.']],
              [
                ['sfx', 'pickup'],
                ['give', 'recorder'],
                ['jack', 'Someone left this here to catch something. I would rather not know what.'],
                ['score', 20, 'recorder'],
                ['if', ['nothas', 'blank_cassette'],
                  [
                    ['give', 'blank_cassette'],
                    ['flag', 'gotBlankTape'],
                    ['jack', 'And a spare tape, still sealed. Ninety minutes of nothing at all.'],
                  ],
                ],
              ],
            ],
          ],
        },
      },
    ],
    exits: [
      { id: 'clockint_out', name: 'Outside', rect: { x: 0, y: 108, w: 22, h: 36 }, to: 'clock_tower_ext', entry: 'default', walkTo: [24, 134], arrow: 'left' },
    ],
  },

  lighthouse_ext: {
    id: 'lighthouse_ext',
    name: 'The Lighthouse',
    background: 'lighthouse_ext',
    music: 'seafront',
    walkboxes: [[6, 114, 314, 114, 318, 140, 2, 140]],
    depth: { yNear: 140, yFar: 114, scaleNear: 1, scaleFar: 0.84 },
    entries: { default: { x: 50, y: 132, facing: 'east' } },
    ambience: [{ sfx: 'seagull', everyMin: 16, everyMax: 34 }],
    characters: [
      { id: 'maggie', sprite: 'char.maggie', x: 180, y: 130, facing: 'west', visibleIf: ['and', ['flag', 'predLighthouse'], ['noflag', 'lighthouseMet']] },
    ],
    onFirstEnter: [
      ['if', ['flag', 'predLighthouse'],
        [
          ['jack', 'The machine said Maggie would be standing outside the lighthouse at five past eleven tomorrow.'],
          ['wait', 0.5],
          ['jack', 'She is standing outside the lighthouse now.'],
        ],
      ],
    ],
    hotspots: [
      {
        id: 'maggie',
        name: 'Maggie',
        rect: { x: 168, y: 96, w: 26, h: 40 },
        walkTo: [148, 132],
        facing: 'east',
        visibleIf: ['and', ['flag', 'predLighthouse'], ['noflag', 'lighthouseMet']],
        defaultVerb: 'TALK',
        verbs: {
          LOOK: [['jack', 'She has been out here in the wind for long enough to have stopped noticing it.']],
          TALK: [
            ['say', 'maggie', "Don't trust Arthur."],
            ['jack', 'The machine already told me you were going to say that.'],
            ['say', 'maggie', 'Then why did you come?'],
            ['jack', 'To find out whether you meant it.'],
            ['wait', 0.4],
            ['say', 'maggie', 'I meant it.'],
            ['flag', 'lighthouseMet'],
            ['score', 30, 'lighthouseMet'],
            ['hide', 'maggie'],
          ],
        },
      },
      {
        id: 'lighthouse_door',
        name: 'Lighthouse Door',
        rect: { x: 210, y: 84, w: 32, h: 30 },
        walkTo: [226, 130],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'Automated in 1981. The keeper\'s door has been painted shut ever since.']],
          OPEN: [['sfx', 'door'], ['goto', 'lighthouse_int', 'default']],
        },
      },
      {
        id: 'rocks',
        name: 'Rocks',
        rect: { x: 20, y: 118, w: 90, h: 22 },
        verbs: {
          LOOK: [['jack', 'Wet rock, weed, and the remains of somebody\'s deckchair.']],
          USE: [['die', 'Jack attempts to climb the wet rocks in the dark, in trainers.']],
        },
      },
    ],
    exits: [
      { id: 'lh_out', name: 'Pier', rect: { x: 0, y: 110, w: 22, h: 34 }, to: 'pier', entry: 'default', walkTo: [24, 134], arrow: 'left' },
    ],
  },

  lighthouse_int: {
    id: 'lighthouse_int',
    name: 'Inside the Lighthouse',
    background: 'lighthouse_int',
    music: 'machine',
    walkboxes: [[20, 118, 300, 118, 304, 140, 16, 140]],
    depth: { yNear: 140, yFar: 118, scaleNear: 1, scaleFar: 0.9 },
    entries: { default: { x: 70, y: 134, facing: 'east' } },
    hotspots: [
      {
        id: 'log_book',
        name: 'Log Book',
        rect: { x: 200, y: 108, w: 44, h: 18 },
        walkTo: [216, 136],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', 'The keeper\'s log. Last entry, September 1974.'],
            ['wait', 0.3],
            ['jack', '"23:17. Light failed for four seconds. No cause found. Whole town went quiet."'],
            ['flag', 'logRead'],
            ['score', 25, 'logBook'],
          ],
          TAKE: [['jack', 'It belongs here. It is the only thing in this building that still does.']],
        },
      },
      {
        id: 'lh_locker',
        name: "Keeper's Locker",
        rect: { x: 96, y: 96, w: 46, h: 22 },
        walkTo: [118, 136],
        facing: 'north',
        verbs: {
          LOOK: [['jack', "The keeper's locker. Empty, apart from a tobacco tin."]],
          OPEN: [
            ['if', ['flag', 'logRead'],
              [
                ['if', ['flag', 'cass_maggie'],
                  [['jack', 'Empty now.']],
                  [
                    ['sfx', 'cassette'],
                    ['jack', 'Inside the tin: a cassette. Labelled MAGGIE, in handwriting I last saw on a missing person poster.'],
                    ['give', 'cassette_maggie'],
                    ['flag', 'cass_maggie'],
                    ['score', 40, 'cassetteMaggie'],
                  ],
                ],
              ],
              [['jack', 'A tobacco tin in an empty locker. I should read the log first and find out whose locker this was.']],
            ],
          ],
        },
      },
      {
        id: 'porthole',
        name: 'Porthole',
        rect: { x: 38, y: 42, w: 38, h: 38 },
        verbs: {
          LOOK: [['jack', 'Black water and, a mile off, the lights of a town that is about to be preserved in aspic.']],
        },
      },
      {
        id: 'lh_stairs',
        name: 'Stairs',
        rect: { x: 130, y: 20, w: 60, h: 90 },
        verbs: {
          LOOK: [['jack', 'A hundred and forty steps to a lamp that runs itself. Not tonight.']],
        },
      },
    ],
    exits: [
      { id: 'lhint_out', name: 'Outside', rect: { x: 0, y: 114, w: 24, h: 30 }, to: 'lighthouse_ext', entry: 'default', walkTo: [26, 136], arrow: 'left' },
    ],
  },

  // ------------------------------------------------- ACT V / VI: the machine

  arcade_machineroom: {
    id: 'arcade_machineroom',
    name: 'Underground Machine Room',
    background: 'arcade_machineroom',
    music: 'machine',
    // A shallow strip of wet concrete - the plate gives very little floor above the interface panel. The workbench is near-camera on the right.
    autoFloor: false,
    walkboxes: [[20, 129, 300, 129, 306, 143, 14, 143]],
    depth: { yNear: 143, yFar: 129, scaleNear: 1, scaleFar: 0.9 },
    blockers: [
      [222, 128, 302, 128, 302, 146, 222, 146],
    ],
    occluders: [
      { polygon: [222, 118, 304, 118, 304, 152, 220, 152], y: 152 },
    ],
    entries: { default: { x: 50, y: 134, facing: 'east' } },
    characters: [
      { id: 'maggie', sprite: 'char.maggie', x: 96, y: 136, facing: 'east', visibleIf: ['flag', 'machineFound'] },
      { id: 'arthur', sprite: 'char.arthur', x: 262, y: 136, facing: 'west', visibleIf: ['flag', 'machineReady'] },
    ],
    ambience: [{ sfx: 'hum', everyMin: 5, everyMax: 10 }, { sfx: 'relay', everyMin: 7, everyMax: 15 }],
    onFirstEnter: [
      ['jack', "That's either incredibly advanced..."],
      ['wait', 0.6],
      ['jack', '...or made by someone who owns a soldering iron.'],
      ['wait', 0.4],
      ['say', 'maggie', 'Both.'],
      ['score', 50, 'machineRoomEntered'],
    ],
    onEnter: [
      // Once all three connections are live, Arthur arrives (spec Act VI).
      ['if', ['and',
        ['flag', 'powerConnected'], ['flag', 'signalConnected'], ['flag', 'memoryConnected'],
        ['noflag', 'machineReady']],
        [
          ['flag', 'machineReady'],
          ['act', 6],
          ['music', 'loop'],
          ['sfx', 'powerup'],
          ['shake', 0.6],
          ['caption', 'The machine wakes up.'],
          ['vision', 'versions'],
          ['jack', '1987. 1988. 1989. It is choosing.'],
          ['wait', 0.4],
          ['say', 'arthur', "You don't understand."],
          ['jack', 'I understand perfectly.'],
          ['say', 'arthur', 'Do you?'],
          ['jack', 'No.'],
          ['wait', 0.5],
          ['jack', 'But I usually sound convincing.'],
          ['dialogue', 'arthur_final'],
        ],
      ],
    ],
    hotspots: [
      {
        id: 'maggie',
        name: 'Maggie',
        rect: { x: 84, y: 100, w: 26, h: 40 },
        walkTo: [116, 136],
        facing: 'west',
        visibleIf: ['flag', 'machineFound'],
        defaultVerb: 'TALK',
        verbs: {
          LOOK: [['jack', 'She has not looked at the machine once since we came down here.']],
          TALK: [['dialogue', 'maggie_machine']],
        },
      },
      {
        id: 'arthur',
        name: 'Arthur',
        rect: { x: 250, y: 100, w: 26, h: 40 },
        walkTo: [238, 136],
        facing: 'east',
        visibleIf: ['flag', 'machineReady'],
        defaultVerb: 'TALK',
        verbs: {
          LOOK: [['jack', 'He is standing exactly where the machine showed me he would be standing.']],
          TALK: [['dialogue', 'arthur_final']],
        },
      },
      {
        id: 'socket_power',
        name: 'POWER Socket',
        rect: { x: 100, y: 58, w: 28, h: 28 },
        walkTo: [114, 130],
        facing: 'north',
        verbs: {
          LOOK: [
            ['if', ['flag', 'powerConnected'],
              [['jack', 'Live. The needle is sitting where it should be.']],
              [['jack', 'POWER. Dead. It wants feeding from the arcade\'s own supply, and the fuse box upstairs is a mess.']],
            ],
          ],
          USE: [
            ['if', ['flag', 'powerConnected'],
              [['jack', 'Done.']],
              [['jack', 'The fuse box in the basement is labelled wrong. Sort that out first.']],
            ],
          ],
        },
        useWith: {
          cable: [
            ['if', ['flag', 'powerConnected'],
              [['jack', 'It already has power.']],
              [['jack', 'The cable will not do anything until the fuses upstairs are in the right order.']],
            ],
          ],
        },
      },
      {
        id: 'socket_signal',
        name: 'SIGNAL Socket',
        rect: { x: 142, y: 58, w: 28, h: 28 },
        walkTo: [156, 130],
        facing: 'north',
        verbs: {
          LOOK: [
            ['if', ['flag', 'signalConnected'],
              [['jack', 'Receiving. Something. From somewhere. From somewhen.']],
              [['jack', 'SIGNAL. It needs an aerial, and a considerably bigger one than the arcade has.']],
            ],
          ],
          USE: [['jack', 'The aerial goes on the roof, not down here.']],
        },
      },
      {
        id: 'socket_memory',
        name: 'MEMORY Socket',
        rect: { x: 184, y: 58, w: 28, h: 28 },
        walkTo: [198, 130],
        facing: 'north',
        verbs: {
          LOOK: [
            ['if', ['flag', 'memoryConnected'],
              [['jack', 'Loaded. 1974, on ninety minutes of ferric tape.']],
              [['jack', 'MEMORY. It wants a recording of a day. The booth reel is the wrong day.']],
            ],
          ],
        },
        useWith: {
          cassette_1974: [
            ['if', ['flag', 'memoryConnected'],
              [['jack', 'It is in.']],
              [
                ['sfx', 'cassette'],
                ['take', 'cassette_1974'],
                ['jack', 'The right day. The day it all started.'],
                ['flag', 'memoryConnected'],
                ['score', 40, 'memoryConnected'],
                ['sfx', 'relay'],
              ],
            ],
          ],
          film_reel: [['jack', 'Wrong day, wrong format, wrong everything. It wants a specific memory.']],
          cassette_saturday: [['jack', 'That is tomorrow. Feeding it tomorrow is exactly how we got here.']],
        },
      },
      {
        id: 'memorymaster',
        name: 'Memory Master 3000',
        rect: { x: 96, y: 20, w: 128, h: 40 },
        walkTo: [160, 130],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', 'MEMORY MASTER 3000. An arcade cabinet, a reel-to-reel, a telephone exchange and a computer, welded into one object by a man with nothing but time.'],
          ],
          USE: [
            ['if', ['flag', 'machineReady'],
              [['dialogue', 'final_choice']],
              [['jack', 'Power, signal, memory. It needs all three before it will do anything at all.']],
            ],
          ],
          PUSH: [['jack', 'It does not move, and I suspect it would take that personally.']],
        },
        useWith: {
          blank_cassette: [
            ['if', ['flag', 'machineReady'],
              [['dialogue', 'final_choice']],
              [['jack', 'Not yet. It is not listening yet.']],
            ],
          ],
          bolt_cutters: [
            ['if', ['flag', 'machineReady'],
              [['dialogue', 'final_choice']],
              [['jack', 'Smashing it now would only mean I never find out what it is.']],
            ],
          ],
        },
      },
    ],
    exits: [
      { id: 'mr_out', name: 'Basement', rect: { x: 0, y: 114, w: 20, h: 30 }, to: 'arcade_basement', entry: 'fromHatch', walkTo: [22, 136], arrow: 'left' },
    ],
  },
};
