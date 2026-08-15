import type { Cond } from '../game/types';

export interface Objective {
  id: string;
  /** True once this step is behind the player. */
  done: Cond;
  /** Three escalating levels: direction, then object, then exact solution
   *  (spec s.27). */
  hints: [string, string, string];
}

/**
 * The critical path, in order. The hint system walks this list and hints at the
 * first unmet objective, so a hint is always about what the player is actually
 * stuck on rather than a generic nudge.
 *
 * Every hint here corresponds to a clue that exists somewhere in the world -
 * spec s.26 forbids puzzles that depend on arbitrary adventure-game logic.
 */
export const OBJECTIVES: Objective[] = [
  {
    id: 'money',
    done: ['flag', 'debtPaid'],
    hints: [
      'Arthur will not hand over the key until the two pounds forty is settled. Money is lying around the arcade if you look, and Kevin has some - but not for nothing.',
      'The coin pusher has been swallowing coins all evening. Kevin will not lend you anything out of kindness; he is sixteen and he is hungry. There is also change under the cigarette machine in the lobby.',
      'TAKE the coin wedged in the coin pusher. USE it in the lobby vending machine for a chocolate bar, GIVE the chocolate to Kevin, then ask him for the two pounds. Get a second 20p from under the cigarette machine, and give Arthur the lot.',
    ],
  },
  {
    id: 'office',
    done: ['flag', 'officeUnlocked'],
    hints: [
      "Arthur's office is locked, and Arthur is not the sort to hide a key cleverly.",
      'The office key hangs on a hook. Something on the wall is covering it.',
      'LOOK at the Space Wars poster in the office corridor, PULL the poster, TAKE the office key, then OPEN the office door.',
    ],
  },
  {
    id: 'screwdriver',
    done: ['has', 'screwdriver'],
    hints: [
      'You cannot get into the back of an arcade cabinet with your hands.',
      "There is a screwdriver in Arthur's office, along with a great deal else worth examining.",
      'In the office, TAKE the screwdriver from the desk. While you are there, look at the framed photograph.',
    ],
  },
  {
    id: 'photo',
    done: ['flag', 'futurePhotoFound'],
    hints: [
      'The machine said PIER. It is worth going and looking at the pier.',
      'At the end of the pier is a photographic booth. Booths produce photographs.',
      'Go to the Pier, LOOK at the photo booth, then TAKE the photograph from the slot.',
    ],
  },
  {
    id: 'cinema',
    done: ['flag', 'filmShown'],
    hints: [
      'The woman in the red coat went into the abandoned cinema. Follow her.',
      'The projector needs a fuse, and the fuse is behind a jammed door. Something greasy would help the mechanism.',
      'Get butter from the chip shop and the coat hanger from the back alley. USE BUTTER WITH the jammed door, then USE COAT HANGER WITH it. TAKE the fuse, USE FUSE WITH projector.',
    ],
  },
  {
    id: 'derek',
    done: ['flag', 'derekExplained'],
    hints: [
      'Somebody in town understands signals. Somebody who talks about them constantly.',
      "Derek at Piper's Television Emporium should see the film reel.",
      'Take the film reel to the TV Repair Shop and TALK to Derek about it.',
    ],
  },
  {
    id: 'predictions',
    done: ['flag', 'allPredictions'],
    hints: [
      'The machines are still showing things. It is worth putting coins in more than one of them.',
      'Turbo Racer, Monster Manor and Galactic Raiders each show a different moment of tomorrow.',
      'Back at the arcade, USE the 20p coin (or a token) WITH each of the three machines in turn and watch what each one shows.',
    ],
  },
  {
    id: 'clocktower',
    done: ['has', 'cassette_jack'],
    hints: [
      'One of the machines named a place and a time, and something being dropped there.',
      'The clock tower has a maintenance panel at its base. You will need what falls at 22:32.',
      'Go to the Clock Tower, TAKE the brass key from the ground, USE BRASS KEY WITH the maintenance panel, and TAKE the cassette inside.',
    ],
  },
  {
    id: 'maggie',
    done: ['flag', 'maggieConfessed'],
    hints: [
      'Maggie has been avoiding a conversation all evening. You now have something that forces it.',
      'Play the cassette labelled JACK, then find Maggie at the arcade.',
      'USE the cassette recorder WITH the JACK cassette to play it, then go to the arcade and TALK to Maggie.',
    ],
  },
  {
    id: 'basement',
    done: ['flag', 'machineFound'],
    hints: [
      'Whatever is doing this is not on the arcade floor.',
      'There is a way down from the arcade. Arthur has been standing near it all night.',
      'With the arcade key, OPEN the basement door in the arcade, go down, and OPEN the hatch in the basement floor.',
    ],
  },
  {
    id: 'power',
    done: ['flag', 'powerConnected'],
    hints: [
      'The Memory Master needs three things. The first is power, and the arcade has plenty.',
      'The basement fuse box is labelled incorrectly. The correct order is written on the arcade machines themselves.',
      'LOOK at the coin doors of the cabinets on the arcade floor to learn the order, then LOOK at the fuse box in the basement and USE it. There is no cable to fetch - the socket downstairs comes alive on its own once the fuses are right.',
    ],
  },
  {
    id: 'signal',
    done: ['flag', 'signalConnected'],
    hints: [
      'The second thing it needs is a signal, and signals need an aerial.',
      'Derek has an aerial. It is far too big, and there are bolt cutters in the arcade toolbox.',
      "Get the antenna from Derek, USE BOLT CUTTERS WITH ANTENNA, then take it to the Arcade Roof and USE ANTENNA WITH the aerial mast.",
    ],
  },
  {
    id: 'memory',
    done: ['flag', 'memoryConnected'],
    hints: [
      'The last thing it needs is a memory, and the reel in the booth is the wrong day.',
      "The right reel is in Arthur's safe. The combination is not a word.",
      'The framed photograph in the office is dated 1974 - the year Arthur opened the arcade. USE that on the safe, TAKE the cassette, and put it in the MEMORY socket.',
    ],
  },
  {
    id: 'ending',
    done: ['flag', 'gameFinished'],
    hints: [
      'The machine wants a final memory. You have worked out whose.',
      'There are three things you can do, and two of them are what Arthur wants.',
      'Do not destroy it and do not preserve 1987. USE the blank cassette WITH the machine and record something new.',
    ],
  },
];
