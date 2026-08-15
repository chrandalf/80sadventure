import type { Scene } from '../../game/types';

/** Standard interior floor and perspective band, in world (640x400) space. */
const FLOOR_WORLD = [[16, 192, 624, 192, 632, 280, 8, 280]];
const DEPTH_WORLD = { yNear: 280, yFar: 192, scaleNear: 1, scaleFar: 0.62 };

/**
 * The lobby's back wall meets the floor lower than the arcade's, so its
 * standing band is shallower and starts further down. Measured off
 * public/assets/backgrounds/arcade_lobby.png.
 */
const LOBBY_FLOOR = [[24, 244, 616, 244, 634, 286, 6, 286]];
const LOBBY_DEPTH = { yNear: 286, yFar: 244, scaleNear: 1, scaleFar: 0.78 };

/**
 * Starlight Arcade and everything under it (spec Acts I, IV, V).
 *
 * The arcade is split across two rooms because 320x200 cannot stage six
 * cabinets, a counter, an office door and two vending machines legibly. The
 * floor holds the machines; the lobby holds the people and the doors.
 */
export const ARCADE_SCENES: Record<string, Scene> = {
  arcade_lobby: {
    id: 'arcade_lobby',
    space: 'world',
    name: 'Starlight Arcade - Lobby',
    background: 'arcade_lobby',
    music: 'arcade',
    walkboxes: LOBBY_FLOOR,
    depth: LOBBY_DEPTH,
    entries: {
      default: { x: 320, y: 266, facing: 'south' },
      fromFloor: { x: 420, y: 254, facing: 'south' },
      fromOffice: { x: 508, y: 258, facing: 'south' },
      fromOutside: { x: 110, y: 260, facing: 'east' },
    },
    characters: [
      { id: 'arthur', sprite: 'char.arthur', x: 574, y: 268, facing: 'west' },
    ],
    ambience: [{ sfx: 'coin', everyMin: 9, everyMax: 20 }],
    onFirstEnter: [
      ['dialogue', 'arthur_opening'],
      ['jack', 'Right. Four hours, twenty-six machines, and a man who thinks clocks are a matter of opinion.'],
    ],
    hotspots: [
      {
        id: 'arthur',
        name: 'Arthur',
        rect: { x: 552, y: 224, w: 40, h: 48 },
        walkTo: [534, 268],
        facing: 'east',
        defaultVerb: 'TALK',
        verbs: {
          LOOK: [['jack', 'Fifty-seven years old and still wearing the cardigan he opened the place in.']],
          TALK: [['dialogue', 'arthur_first']],
          TAKE: [['jack', 'I am not stealing Arthur. He would be enormously inconvenient to hide.']],
        },
        useWith: {
          kevin_money: [
            ['if', ['has', 'coin20'],
              [
                ['sfx', 'coin'],
                ['take', 'kevin_money'],
                ['take', 'coin20'],
                ['jack', 'Two pounds forty. Every penny of it borrowed, found or prised out of a machine.'],
                ['say', 'arthur', 'Took you long enough.'],
                ['jack', 'It took me forty minutes and most of my dignity.'],
                ['say', 'arthur', 'That is the going rate.'],
                ['wait', 0.4],
                ['sfx', 'pickup'],
                ['give', 'arcade_key'],
                ['flag', 'debtPaid'],
                ['flag', 'hasArcadeKey'],
                ['score', 40, 'arcadeKey'],
                ['say', 'arthur', 'Eleven o\'clock. And Jack - do not go downstairs.'],
                ['jack', 'Why would I go downstairs?'],
                ['say', 'arthur', 'Exactly.'],
              ],
              [['jack', 'Two pounds twenty. I am twenty pence short, which is somehow worse than being two pounds short.']],
            ],
          ],
          coin20: [
            ['if', ['has', 'kevin_money'],
              [['jack', 'I should hand over the whole two pounds forty at once, not dribble it at him.']],
              [['jack', 'Twenty pence off a two pound forty debt. He would enjoy that far too much.']],
            ],
          ],
          chocolate: [
            ['say', 'arthur', 'I have got diabetes, son.'],
            ['jack', 'You have not.'],
            ['say', 'arthur', 'I have got principles, then.'],
          ],
        },
      },
      {
        id: 'poster',
        name: 'Space Wars Poster',
        polygon: [[284, 44], [356, 44], [356, 152], [284, 152]],
        walkTo: [318, 252],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', 'SPACE WARS. Nineteen seventy-nine. The artist has drawn a spaceship that could not possibly fly, which is the correct amount of effort.'],
            ['if', ['noflag', 'posterNoticed'],
              [
                ['jack', 'It is also hanging about an inch off the wall.'],
                ['flag', 'posterNoticed'],
                ['score', 5, 'posterNoticed'],
              ],
            ],
          ],
          PULL: [
            ['if', ['flag', 'hasOfficeKey'],
              [['jack', 'There is nothing else behind it. I checked twice, which is once more than necessary.']],
              [
                ['sfx', 'switch'],
                ['jack', 'There is a hook behind the poster.'],
                ['wait', 0.4],
                ['jack', 'And on the hook, a key. Arthur, you magnificent idiot.'],
                ['give', 'office_key'],
                ['flag', 'hasOfficeKey'],
                ['score', 20, 'officeKey'],
              ],
            ],
          ],
          PUSH: [['jack', 'Pushing a poster into a wall. A bold new direction for my career.']],
          TAKE: [['jack', 'I am not stealing a poster. I have taken quite enough from this building already.']],
        },
      },
      {
        id: 'office_door',
        name: 'Office Door',
        polygon: [[478, 52], [538, 52], [538, 242], [478, 242]],
        walkTo: [508, 258],
        facing: 'north',
        verbs: {
          LOOK: [['jack', "Arthur's office. Locked, on the grounds that it contains a kettle."]],
          OPEN: [
            ['if', ['has', 'office_key'],
              [
                ['sfx', 'door'],
                ['flag', 'officeUnlocked'],
                ['score', 10, 'officeUnlocked'],
                ['goto', 'arcade_office', 'default'],
              ],
              [['jack', 'Locked. There will be a key, and it will be hidden somewhere Arthur considers cunning.']],
            ],
          ],
        },
        useWith: {
          office_key: [
            ['sfx', 'door'],
            ['jack', 'Open.'],
            ['flag', 'officeUnlocked'],
            ['score', 10, 'officeUnlocked'],
            ['goto', 'arcade_office', 'default'],
          ],
        },
      },
      {
        id: 'vending',
        name: 'Vending Machine',
        polygon: [[152, 84], [226, 84], [226, 220], [152, 220]],
        walkTo: [190, 256],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'Twenty pence for a chocolate bar. Fifteen pence for the privilege of watching someone else eat it.']],
          USE: [
            ['if', ['has', 'coin20'],
              [
                ['sfx', 'coin'],
                ['take', 'coin20'],
                ['give', 'chocolate'],
                ['jack', 'One chocolate bar. My finances are now a rumour.'],
                ['score', 5, 'chocolateBought'],
              ],
              [['jack', 'It wants twenty pence. I want a great many things.']],
            ],
          ],
          PUSH: [['jack', 'Shaking a vending machine is how people die in a manner their friends find funny.']],
          PULL: [['jack', 'It is bolted to the wall. Arthur is not entirely stupid.']],
        },
        useWith: {
          coin20: [
            ['sfx', 'coin'],
            ['take', 'coin20'],
            ['give', 'chocolate'],
            ['jack', 'One chocolate bar. My finances are now a rumour.'],
            ['score', 5, 'chocolateBought'],
          ],
        },
      },
      {
        id: 'cigarette_machine',
        name: 'Cigarette Machine',
        polygon: [[230, 88], [277, 88], [277, 218], [230, 218]],
        walkTo: [253, 254],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', 'Cigarettes. One pound sixty. In thirty years this machine will seem completely insane.'],
            ['if', ['flag', 'kevinSawIt'],
              [['jack', 'Kevin says change collects underneath it. Kevin is right about approximately nothing, so it is worth checking.']],
            ],
          ],
          TAKE: [
            ['if', ['flag', 'gotCigaretteChange'],
              [['jack', 'I have already robbed this machine of its loose change. Twice would be greedy.']],
              [
                ['jack', 'There is a gap underneath.'],
                ['wait', 0.3],
                ['sfx', 'coin'],
                ['jack', 'Twenty pence, a bus ticket, and something I am choosing not to identify.'],
                ['give', 'coin20'],
                ['flag', 'gotCigaretteChange'],
                ['score', 15, 'cigaretteChange'],
              ],
            ],
          ],
          PUSH: [['jack', 'It does not move. It has the density of a small planet.']],
          USE: [['jack', 'I do not smoke. Mostly because I cannot afford to.']],
        },
      },
      {
        id: 'counter',
        name: 'Change Counter',
        polygon: [[542, 146], [640, 158], [640, 292], [538, 276]],
        walkTo: [520, 266],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'A perspex tray worn white by twelve years of ten-pence pieces.']],
          TAKE: [['jack', 'Stealing from Arthur while owing Arthur money. Even I can see the flaw.']],
          OPEN: [['jack', 'The till is locked and Arthur is standing right there.']],
        },
      },
    ],
    exits: [
      {
        id: 'to_floor',
        name: 'Arcade Floor',
        rect: { x: 384, y: 42, w: 74, h: 176 },
        to: 'starlight_arcade',
        entry: 'fromLobby',
        walkTo: [420, 252],
        arrow: 'up',
      },
      {
        id: 'to_outside',
        name: 'Seafront',
        rect: { x: 8, y: 28, w: 134, h: 212 },
        to: 'seafront',
        entry: 'fromArcade',
        walkTo: [110, 258],
        arrow: 'left',
        requires: ['flag', 'firstEvent'],
        lockedText: 'I am supposed to be working. Also it is raining sideways.',
      },
    ],
  },

  /**
   * THE FIRST SCENE CONVERTED TO EXTERNAL ARTWORK.
   *
   * Authored directly in world (640x400) coordinates - note `space: 'world'`,
   * which stops the legacy doubling in normalizeScene(). Its interaction
   * geometry is polygons, which are invisible and know nothing about the
   * artwork; the background comes from /assets/backgrounds/starlight_arcade.webp
   * via src/content/sceneArt.ts, and falls back to the old painter until that
   * file exists.
   */
  starlight_arcade: {
    id: 'starlight_arcade',
    space: 'world',
    name: 'Starlight Arcade',
    background: 'arcade_floor',
    music: 'arcade',
    walkboxes: FLOOR_WORLD,
    depth: DEPTH_WORLD,
    entries: {
      default: { x: 320, y: 256, facing: 'south' },
      fromLobby: { x: 142, y: 224, facing: 'south' },
      fromBasement: { x: 60, y: 244, facing: 'east' },
    },
    objects: [
      // Depth-sorts against characters: Jack passes behind it up-stage and in
      // front of it down-stage. Always-in-front scenery belongs in a foreground
      // art layer instead.
      { id: 'stool', sprite: 'prop.stool', x: 470, y: 250 },
    ],
    characters: [
      { id: 'kevin', sprite: 'char.kevin', x: 500, y: 236, facing: 'north', visibleIf: ['noflag', 'closingTime'] },
      { id: 'maggie', sprite: 'char.maggie', x: 192, y: 264, facing: 'east' },
    ],
    ambience: [
      { sfx: 'coin', everyMin: 7, everyMax: 16 },
      { sfx: 'button', everyMin: 4, everyMax: 11 },
    ],
    onEnter: [
      // Act I's inciting incident, at 8:15pm (spec s.3, scene 3).
      ['if', ['and', ['noflag', 'firstEvent'], ['flag', 'hasArcadeKey']],
        [
          ['wait', 0.6],
          ['sfx', 'buzz'],
          ['shake', 0.5],
          ['caption', 'Every machine in the building flickers at once.'],
          ['sfx', 'crt-on'],
          ['vision', 'machine_pier'],
          ['jack', 'Either this machine has developed a personality...'],
          ['wait', 0.5],
          ['jack', '...or I have finally lost mine.'],
          ['flag', 'firstEvent'],
          ['score', 25, 'firstEvent'],
          ['act', 2],
          ['music', 'mystery'],
        ],
      ],
    ],
    hotspots: [
      {
        id: 'maggie',
        name: 'Maggie',
        rect: { x: 168, y: 192, w: 52, h: 80 },
        walkTo: [240, 268],
        facing: 'west',
        defaultVerb: 'TALK',
        verbs: {
          LOOK: [['jack', 'Maggie Vale. We were at school together. She was cleverer than me then as well.']],
          TALK: [['dialogue', 'maggie_first']],
          PUSH: [['jack', 'I would like to survive the evening.']],
        },
      },
      {
        id: 'kevin',
        name: 'Kevin',
        rect: { x: 476, y: 168, w: 48, h: 76 },
        walkTo: [444, 252],
        facing: 'east',
        visibleIf: ['noflag', 'closingTime'],
        defaultVerb: 'TALK',
        verbs: {
          LOOK: [['jack', 'Sixteen, and has spent roughly fourteen thousand pounds of his parents\' money in this room.']],
          TALK: [['dialogue', 'kevin_first']],
        },
      },
      {
        id: 'coin_pusher',
        name: 'Coin Pusher',
        polygon: [[512, 126], [638, 118], [638, 316], [498, 300], [494, 196]],
        walkTo: [504, 236],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', 'Eleven pounds of two-pence pieces, permanently four millimetres from falling.'],
            ['if', ['noflag', 'pusherNoticed'],
              [
                ['jack', 'There is a coin wedged behind the mechanism. It has been there long enough to look like a fixture.'],
                ['flag', 'pusherNoticed'],
                ['score', 5, 'pusherNoticed'],
              ],
            ],
          ],
          TAKE: [
            ['if', ['flag', 'gotPusherCoin'],
              [['jack', 'I have had my twenty pence out of this machine. It has had considerably more out of me.']],
              [
                ['if', ['flag', 'pusherNoticed'],
                  [
                    ['sfx', 'coin'],
                    ['jack', 'Twenty pence. Only two pounds twenty to go before I am financially responsible.'],
                    ['give', 'coin20'],
                    ['flag', 'gotPusherCoin'],
                    ['score', 20, 'pusherCoin'],
                  ],
                  [['jack', 'There is nothing obviously loose. I should look at it properly first.']],
                ],
              ],
            ],
          ],
          PUSH: [['sfx', 'deny'], ['jack', 'It says NO SHOVING on a sticker older than I am.']],
          USE: [['jack', 'Putting money into a coin pusher is how you turn money into less money.']],
        },
      },
      {
        id: 'machine_turbo',
        name: 'Turbo Racer',
        polygon: [[174, 44], [228, 40], [230, 214], [172, 214]],
        walkTo: [110, 228],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'TURBO RACER. The steering wheel has been loose since 1984 and Arthur calls it "character".']],
          USE: [
            ['if', ['and', ['flag', 'derekExplained'], ['noflag', 'predClock']],
              [
                ['sfx', 'crt-on'],
                ['caption', 'The road vanishes. Something else is on the screen.'],
                ['vision', 'machine_clock'],
                ['jack', 'Half past ten tomorrow. Somebody drops a key at the clock tower.'],
                ['flag', 'predClock'],
                ['score', 25, 'predClock'],
              ],
              [['minigame', 'turbo']],
            ],
          ],
          PUSH: [['jack', 'The cabinet rocks. Fourteen years of teenagers have already tried this.']],
        },
      },
      {
        id: 'machine_space',
        name: 'Space Wars',
        polygon: [[233, 34], [286, 32], [287, 212], [232, 212]],
        walkTo: [178, 228],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'SPACE WARS. Vector graphics. Genuinely beautiful, and completely impossible to see in daylight.']],
          USE: [['minigame', 'space']],
        },
      },
      {
        id: 'machine_manor',
        name: 'Monster Manor',
        polygon: [[291, 32], [350, 30], [351, 216], [290, 216]],
        walkTo: [246, 228],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'MONSTER MANOR. The monsters are four pixels each and I have had nightmares about them since I was nine.']],
          USE: [
            ['if', ['and', ['flag', 'predClock'], ['noflag', 'predLighthouse']],
              [
                ['sfx', 'crt-on'],
                ['vision', 'machine_lighthouse'],
                ['jack', 'That is Maggie. Standing outside the lighthouse. Tomorrow night.'],
                ['wait', 0.4],
                ['jack', 'Telling me not to trust Arthur.'],
                ['flag', 'predLighthouse'],
                ['score', 25, 'predLighthouse'],
              ],
              [['minigame', 'manor']],
            ],
          ],
        },
      },
      {
        id: 'machine_galactic',
        name: 'Galactic Raiders',
        polygon: [[355, 26], [436, 30], [434, 228], [354, 224]],
        walkTo: [314, 228],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'GALACTIC RAIDERS. Kevin claims the high score. The high score is three letters and none of them are K.']],
          USE: [
            ['if', ['and', ['flag', 'predLighthouse'], ['noflag', 'predArcade']],
              [
                ['sfx', 'crt-on'],
                ['vision', 'machine_arcade'],
                ['jack', 'That is this room. Tomorrow night. Arthur standing exactly where I am standing.'],
                ['wait', 0.5],
                ['jack', '"It has to happen."'],
                ['flag', 'predArcade'],
                ['flag', 'allPredictions'],
                ['score', 25, 'predArcade'],
                ['music', 'mystery'],
              ],
              [['minigame', 'space']],
            ],
          ],
        },
      },
      {
        id: 'onemorecredit',
        name: 'Unmarked Machine',
        polygon: [[444, 44], [504, 46], [502, 228], [443, 226]],
        walkTo: [398, 232],
        facing: 'north',
        verbs: {
          LOOK: [
            ['if', ['flag', 'firstEvent'],
              [['jack', 'The screen is showing static. It was not showing static an hour ago. It was showing me.']],
              [
                ['jack', "No manufacturer's label. No instructions. No visible coin slot."],
                ['jack', 'Just a red button that says CREDIT, and the distinct sense that it is waiting.'],
                ['flag', 'sawStrangeMachine'],
                ['score', 10, 'sawMachine'],
              ],
            ],
          ],
          PUSH: [
            ['if', ['flag', 'machineFound'],
              [
                ['sfx', 'credit'],
                ['caption', 'CREDIT 1'],
                ['jack', "That's normally where the fun begins."],
                ['wait', 0.4],
                ['caption', 'INSERT MEMORY.'],
                ['jack', 'Oh.'],
                ['flag', 'creditPressed'],
                ['score', 20, 'creditPressed'],
              ],
              [
                ['sfx', 'deny'],
                ['jack', 'Nothing. It is not that it is broken. It is that it is not interested.'],
              ],
            ],
          ],
          USE: [
            ['if', ['flag', 'firstEvent'],
              [['minigame', 'credit']],
              [['jack', 'There is nowhere to put a coin. There is nowhere to put anything.']],
            ],
          ],
          TAKE: [['jack', 'It weighs about as much as a car and I like my spine.']],
        },
        useWith: {
          coin20: [['jack', 'There is no slot. I have looked. I have looked twice.']],
          blank_cassette: [
            ['if', ['flag', 'machineReady'],
              [['goto', 'arcade_machineroom', 'default']],
              [['jack', 'Not this one. The one downstairs is the one that matters.']],
            ],
          ],
        },
      },
      {
        id: 'basement_door',
        name: 'Staff Door',
        polygon: [[12, 26], [90, 24], [90, 194], [12, 198]],
        walkTo: [60, 236],
        facing: 'west',
        verbs: {
          LOOK: [['jack', 'STAFF ONLY. Which, tonight, is me.']],
          OPEN: [
            ['if', ['has', 'arcade_key'],
              [['sfx', 'door'], ['goto', 'arcade_basement', 'default']],
              [['jack', 'Locked. The arcade key opens it, and the arcade key is currently in a cardigan pocket.']],
            ],
          ],
        },
        useWith: {
          arcade_key: [['sfx', 'door'], ['goto', 'arcade_basement', 'default']],
        },
      },
    ],
    exits: [
      {
        id: 'to_lobby',
        name: 'Lobby',
        rect: { x: 110, y: 32, w: 56, h: 142 },
        to: 'arcade_lobby',
        entry: 'fromFloor',
        walkTo: [140, 216],
        arrow: 'up',
      },
    ],
  },

  arcade_office: {
    id: 'arcade_office',
    name: "Arthur's Office",
    background: 'arcade_office',
    music: 'mystery',
    walkboxes: [[14, 100, 306, 100, 312, 140, 8, 140]],
    depth: { yNear: 140, yFar: 100, scaleNear: 1, scaleFar: 0.68 },
    entries: { default: { x: 160, y: 132, facing: 'north' } },
    hotspots: [
      {
        id: 'desk',
        name: 'Desk',
        rect: { x: 96, y: 82, w: 92, h: 26 },
        walkTo: [140, 126],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'Invoices, a calculator, and a mug that has been growing something since the spring.']],
          TAKE: [
            ['if', ['has', 'screwdriver'],
              [['jack', 'I have the screwdriver. The mug can stay.']],
              [
                ['sfx', 'pickup'],
                ['jack', 'A flat-head screwdriver. Now I can get into the back of anything in this building.'],
                ['give', 'screwdriver'],
                ['score', 10, 'screwdriver'],
              ],
            ],
          ],
          OPEN: [['jack', 'The drawers contain paperwork from a decade in which nothing was filed.']],
        },
      },
      {
        id: 'framed_photo',
        name: 'Framed Photograph',
        rect: { x: 206, y: 30, w: 40, h: 32 },
        walkTo: [226, 120],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', 'Arthur outside the arcade in 1974. Younger. Smiling, which is new information.'],
            ['wait', 0.3],
            ['jack', 'There is another man beside him. The photograph has been scratched across his face.'],
            ['wait', 0.3],
            ['jack', "Someone really didn't like this bloke."],
            ['flag', 'sawOfficePhoto'],
            ['flag', 'knows1974'],
            ['score', 20, 'officePhoto'],
          ],
          TAKE: [
            ['if', ['flag', 'sawOfficePhoto'],
              [
                ['sfx', 'pickup'],
                ['give', 'photograph'],
                ['jack', 'Arthur will notice. Arthur will also not mention it, which is worse.'],
                ['score', 10, 'tookPhoto'],
              ],
              [['jack', 'I should look at it before I start stealing it.']],
            ],
          ],
        },
      },
      {
        id: 'safe',
        name: 'Safe',
        rect: { x: 250, y: 82, w: 40, h: 34 },
        walkTo: [270, 128],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', 'A floor safe with a four-digit dial. Arthur has never remembered a number in his life, so it will be a year.'],
          ],
          OPEN: [
            ['if', ['flag', 'safeOpen'],
              [['jack', 'Already open. Already emptied. Already regretted.']],
              [
                ['if', ['flag', 'knows1974'],
                  [
                    ['sfx', 'relay'],
                    ['caption', 'Jack turns the dial to 1 - 9 - 7 - 4.'],
                    ['sfx', 'switch'],
                    ['jack', 'The year he opened the arcade. Of course it is.'],
                    ['flag', 'safeOpen'],
                    ['give', 'cassette_1974'],
                    ['give', 'cassette_arthur'],
                    ['flag', 'cass_1974'],
                    ['flag', 'cass_arthur'],
                    ['score', 40, 'safeOpen'],
                    ['jack', 'Two cassettes. One labelled 1974. One labelled ARTHUR, in handwriting that has been practised.'],
                  ],
                  [['jack', 'Four digits. I need to find out which four before I start guessing, or I will be here until Sunday.']],
                ],
              ],
            ],
          ],
        },
        useWith: {
          photograph: [
            ['jack', 'The photograph is dated 1974.'],
            ['if', ['flag', 'safeOpen'],
              [['jack', 'And the safe is already open, so this is just showing off.']],
              [
                ['sfx', 'relay'],
                ['sfx', 'switch'],
                ['flag', 'safeOpen'],
                ['give', 'cassette_1974'],
                ['give', 'cassette_arthur'],
                ['flag', 'cass_1974'],
                ['flag', 'cass_arthur'],
                ['score', 40, 'safeOpen'],
                ['jack', 'Two cassettes. One labelled 1974. One labelled ARTHUR.'],
              ],
            ],
          ],
        },
      },
      {
        id: 'filing_cabinet',
        name: 'Filing Cabinet',
        rect: { x: 16, y: 52, w: 34, h: 60 },
        walkTo: [40, 122],
        facing: 'west',
        verbs: {
          LOOK: [['jack', 'Three drawers. Labelled ACCOUNTS, ACCOUNTS and ACCOUNTS.']],
          OPEN: [
            ['jack', 'Invoices going back to 1974. Electricity, rates, and one standing order to a cinema that closed in 1976.'],
            ['flag', 'cinemaHinted'],
            ['score', 15, 'cinemaBill'],
          ],
        },
      },
      {
        id: 'office_tv',
        name: 'Television',
        rect: { x: 288, y: 40, w: 30, h: 28 },
        walkTo: [292, 118],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'A portable black-and-white set. Off. Reflecting the room back at me slightly wrong.']],
          USE: [
            ['sfx', 'crt-on'],
            ['jack', 'Static on every channel, including the ones that do not exist.'],
            ['cheeky', 'office_tv'],
          ],
        },
      },
      {
        id: 'telephone',
        name: 'Telephone',
        rect: { x: 110, y: 78, w: 20, h: 14 },
        walkTo: [120, 124],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'A rotary telephone in a colour they stopped making for a reason.']],
          USE: [['jack', 'There is nobody I want to ring who would believe me.']],
        },
      },
    ],
    exits: [
      {
        id: 'office_out',
        name: 'Lobby',
        rect: { x: 0, y: 96, w: 20, h: 48 },
        to: 'arcade_lobby',
        entry: 'fromOffice',
        walkTo: [22, 132],
        arrow: 'left',
      },
    ],
  },

  arcade_basement: {
    id: 'arcade_basement',
    name: 'Arcade Basement',
    background: 'arcade_basement',
    music: 'machine',
    walkboxes: [[14, 106, 306, 106, 312, 140, 8, 140]],
    depth: { yNear: 140, yFar: 106, scaleNear: 1, scaleFar: 0.74 },
    entries: { default: { x: 60, y: 130, facing: 'east' }, fromHatch: { x: 160, y: 130, facing: 'north' } },
    ambience: [{ sfx: 'hum', everyMin: 6, everyMax: 12 }],
    onFirstEnter: [
      ['jack', 'Twenty years of broken cabinets under dust sheets. And something underneath them humming.'],
      ['score', 15, 'basementFound'],
    ],
    hotspots: [
      {
        id: 'fusebox',
        name: 'Fuse Box',
        rect: { x: 226, y: 44, w: 40, h: 32 },
        walkTo: [246, 122],
        facing: 'north',
        verbs: {
          LOOK: [
            ['jack', 'Four fuses. The labels read ONE, TWO, THREE, FOUR, and they are all in the wrong holders.'],
            ['if', ['noflag', 'fuseNoticed'],
              [
                ['jack', 'Somebody renumbered them and did not write it down. Somebody who owns twenty-six numbered cabinets.'],
                ['flag', 'fuseNoticed'],
                ['score', 10, 'fuseNoticed'],
              ],
            ],
          ],
          USE: [
            ['if', ['flag', 'powerConnected'],
              [['jack', 'The power is on. I am not touching it again.']],
              [
                ['if', ['flag', 'fuseNoticed'],
                  [
                    ['sfx', 'relay'],
                    ['caption', 'Jack sets the fuses to match the cabinet numbers: 3, 1, 4, 2.'],
                    ['sfx', 'powerup'],
                    ['shake', 0.3],
                    ['jack', 'Every light in the building just got brighter. That is either good or extremely bad.'],
                    ['flag', 'powerConnected'],
                    ['score', 40, 'powerConnected'],
                  ],
                  [['jack', 'I could rearrange them at random and cause a fire. I should find the correct order first.']],
                ],
              ],
            ],
          ],
        },
      },
      {
        id: 'dust_sheets',
        name: 'Dust Sheets',
        rect: { x: 16, y: 54, w: 100, h: 52 },
        walkTo: [66, 124],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'Cabinets that stopped working and were covered rather than fixed. Very Arthur.']],
          PULL: [
            ['sfx', 'switch'],
            ['jack', 'Underneath: a Sea Raider from 1976 with its screen kicked in, and a bolt cutter someone left on top of it.'],
            ['if', ['nothas', 'bolt_cutters'],
              [['give', 'bolt_cutters'], ['score', 15, 'boltCutters']],
            ],
          ],
        },
      },
      {
        id: 'hatch',
        name: 'Floor Hatch',
        rect: { x: 132, y: 108, w: 56, h: 24 },
        walkTo: [160, 136],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'A steel hatch, newer than everything else down here by about a decade.']],
          OPEN: [
            ['if', ['flag', 'maggieConfessed'],
              [
                ['sfx', 'door'],
                ['flag', 'machineFound'],
                ['score', 50, 'machineRoom'],
                ['act', 5],
                ['goto', 'arcade_machineroom', 'default'],
              ],
              [
                ['jack', 'Bolted from underneath. Somebody does not want company.'],
                ['jack', 'I should find out what Maggie has been not telling me first.'],
              ],
            ],
          ],
          PULL: [['jack', 'It does not budge, and I have now hurt my hand for no reason.']],
        },
      },
    ],
    exits: [
      {
        id: 'basement_up',
        name: 'Arcade Floor',
        rect: { x: 0, y: 100, w: 18, h: 44 },
        to: 'starlight_arcade',
        entry: 'fromBasement',
        walkTo: [20, 132],
        arrow: 'left',
      },
    ],
  },

  arcade_roof: {
    id: 'arcade_roof',
    name: 'Arcade Roof',
    background: 'arcade_roof',
    music: 'seafront',
    walkboxes: [[10, 108, 310, 108, 314, 140, 6, 140]],
    depth: { yNear: 140, yFar: 108, scaleNear: 1, scaleFar: 0.78 },
    entries: { default: { x: 80, y: 130, facing: 'east' } },
    ambience: [{ sfx: 'seagull', everyMin: 10, everyMax: 22 }],
    onFirstEnter: [
      ['jack', 'The whole town from up here. Two thousand people, four chip shops and one very large secret.'],
      ['score', 10, 'roofFound'],
    ],
    hotspots: [
      {
        id: 'aerial_mast',
        name: 'Aerial Mast',
        rect: { x: 232, y: 24, w: 26, h: 80 },
        walkTo: [220, 128],
        facing: 'east',
        verbs: {
          LOOK: [['jack', "The arcade's own aerial. Bent, corroded, and pointing at nothing in particular."]],
          USE: [['jack', 'It needs a bigger aerial than this. Derek has a bigger aerial than this.']],
        },
        useWith: {
          antenna: [
            ['if', ['flag', 'antennaCut'],
              [
                ['sfx', 'switch'],
                ['caption', "Jack lashes Derek's antenna to the mast."],
                ['sfx', 'static'],
                ['jack', 'Something down there just started listening.'],
                ['flag', 'signalConnected'],
                ['score', 40, 'signalConnected'],
              ],
              [['jack', 'It is far too big. It would snap the mast in half.']],
            ],
          ],
          bolt_cutters: [['jack', 'I am not cutting our own aerial off. We need more aerial, not less.']],
        },
      },
      {
        id: 'parapet',
        name: 'Parapet',
        rect: { x: 0, y: 86, w: 320, h: 18 },
        walkTo: [120, 122],
        facing: 'north',
        verbs: {
          LOOK: [['jack', 'The sea, the pier, the lighthouse, and a demolition notice I can read from here.']],
          PUSH: [['jack', 'Leaning on a hundred-year-old parapet in the dark. I will pass.']],
          USE: [
            ['die', 'Jack decides to see how far down it is, empirically.'],
          ],
        },
      },
    ],
    exits: [
      {
        id: 'roof_down',
        name: 'Hatch',
        rect: { x: 60, y: 106, w: 40, h: 22 },
        to: 'arcade_lobby',
        entry: 'default',
        walkTo: [80, 132],
        arrow: 'down',
      },
    ],
  },
};
