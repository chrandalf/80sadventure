import type { Action, Item } from '../game/types';

/**
 * The inventory (spec s.9). Some items are deliberately ridiculous, as asked.
 *
 * `look` is what Jack says when examining it. `combine` handles item-on-item.
 * Item-on-world is handled by the tables below, which keeps the bespoke comedy
 * of spec s.10 in one place instead of scattered across every hotspot.
 */
export const ITEMS: Record<string, Item> = {
  screwdriver: {
    id: 'screwdriver',
    name: 'Screwdriver',
    look: "Flat head. Arthur's, technically. Mine, practically.",
  },
  arcade_key: {
    id: 'arcade_key',
    name: 'Arcade Key',
    look: 'The key to the entire building. He gave it to a twenty-year-old. Bold.',
  },
  office_key: {
    id: 'office_key',
    name: 'Office Key',
    look: 'Small, brass, and hanging behind a poster like the world\'s laziest secret.',
  },
  kevin_money: {
    id: 'kevin_money',
    name: '£2.20 in Change',
    look: 'Twenty-two ten-pence pieces, still warm from a sixteen-year-old\'s pocket. I will not be thinking about that.',
  },
  coin20: {
    id: 'coin20',
    name: '20p Coin',
    look: 'Twenty pence. Heptagonal. The most exciting shape available in 1987.',
  },
  lighter: {
    id: 'lighter',
    name: 'Cigarette Lighter',
    look: "Arthur's. It runs out halfway through every use, like most things here.",
  },
  coat_hanger: {
    id: 'coat_hanger',
    name: 'Coat Hanger',
    look: 'A coat hanger. In an adventure game. This will absolutely be used for crime.',
  },
  butter: {
    id: 'butter',
    name: 'Butter',
    look: 'A catering pat of butter. Slightly warm. Deeply unpleasant to carry.',
  },
  fuse: {
    id: 'fuse',
    name: 'Projector Fuse',
    look: 'Five amp. Glass. The single most fragile object I have ever been responsible for.',
  },
  brass_key: {
    id: 'brass_key',
    name: 'Brass Key',
    look: 'Heavy. Old. Dropped by someone at 10:32 tomorrow evening. I have stopped questioning this.',
  },
  antenna: {
    id: 'antenna',
    name: 'Television Antenna',
    look: "Derek's aerial. Cut down to size. He took it well, in the sense that he didn't.",
  },
  bolt_cutters: {
    id: 'bolt_cutters',
    name: 'Bolt Cutters',
    look: 'For cutting bolts. And, it turns out, aerials.',
  },
  photograph: {
    id: 'photograph',
    name: 'Photograph',
    look: 'The arcade. Tomorrow. Still standing. Me in the doorway. Still unsettling.',
  },
  film_reel: {
    id: 'film_reel',
    name: 'Film Reel',
    look: 'Labelled SATURDAY. Which is a strange thing to label a Friday.',
  },
  token: {
    id: 'token',
    name: 'Arcade Token',
    look: 'STARLIGHT ARCADE. Worth ten pence, redeemable nowhere, guarded like treasure.',
  },
  toolbox: {
    id: 'toolbox',
    name: 'Toolbox',
    look: 'Standard issue. Contains three screwdrivers, none of which is the one I need.',
  },
  cable: {
    id: 'cable',
    name: 'Electrical Cable',
    look: 'Heavy gauge. Frayed at one end. Extremely 1987 approach to safety.',
  },
  gum: {
    id: 'gum',
    name: 'Chewing Gum',
    look: 'Found under a cabinet. I am choosing to believe it was never chewed.',
  },
  chocolate: {
    id: 'chocolate',
    name: 'Chocolate Bar',
    look: 'Twenty pence. Fifteen pence for the privilege of watching someone else eat it.',
  },
  newspaper: {
    id: 'newspaper',
    name: 'Newspaper',
    look: 'ARCADE TO BE DEMOLISHED TOMORROW. And a crossword I have nearly finished.',
  },
  extension: {
    id: 'extension',
    name: 'Screwdriver Extension',
    look: 'An extension for a screwdriver. There is a version of my life where this is thrilling.',
  },
  recorder: {
    id: 'recorder',
    name: 'Cassette Recorder',
    look: 'Portable. Heavy. Eats batteries and, occasionally, tapes.',
  },
  cartridge: {
    id: 'cartridge',
    name: 'Memory Cartridge',
    look: 'It is warm. Nothing that is switched off should be warm.',
  },
  postcard: {
    id: 'postcard',
    name: 'Old Postcard',
    look: 'A seaside postcard. The joke on the back was not funny in 1971 either.',
  },
  room12_key: {
    id: 'room12_key',
    name: 'Room 12 Key',
    look: 'Golden Sands Hotel, room 12. Attached to a fob the size of a house brick.',
  },
  calendar: {
    id: 'calendar',
    name: '1987 Calendar',
    look: 'The photograph is doing a lot of work. The numbers beside the months are doing more.',
  },
  blank_cassette: {
    id: 'blank_cassette',
    name: 'Blank Cassette',
    look: 'Ninety minutes. Completely empty. Waiting for something worth recording.',
  },

  cassette_jack: {
    id: 'cassette_jack',
    name: 'Cassette: JACK',
    look: 'My own handwriting. On a tape I have not recorded yet.',
  },
  cassette_arthur: {
    id: 'cassette_arthur',
    name: 'Cassette: ARTHUR',
    look: "Arthur's confession. He labelled it neatly. Of course he did.",
  },
  cassette_vale: {
    id: 'cassette_vale',
    name: 'Cassette: E.V.',
    look: 'Two initials. Thirteen years of somebody thinking they were abandoned.',
  },
  cassette_maggie: {
    id: 'cassette_maggie',
    name: 'Cassette: MAGGIE',
    look: 'For her. Not for me. I should probably remember that.',
  },
  cassette_saturday: {
    id: 'cassette_saturday',
    name: 'Cassette: SATURDAY',
    look: 'A day that has not happened, recorded in full. Ninety minutes of tomorrow.',
  },
  cassette_1974: {
    id: 'cassette_1974',
    name: 'Cassette: 1974',
    look: 'The year it started. The year he stopped.',
  },
};

/**
 * Bespoke item-on-world responses (spec s.10). Key is `item:target`, where
 * target is a hotspot or character id. A hotspot's own `useWith` wins where
 * both exist; these are the fallback, so one gag covers a target wherever it
 * appears without restating it in every scene.
 */
export const ITEM_USE_GAGS: Record<string, Action[]> = {
  'chocolate:telephone': [['jack', "I don't think BT accepts confectionery."]],
  'chocolate:phone_dial': [['jack', "I don't think BT accepts confectionery."]],
  'butter:onemorecredit': [['jack', "I'm not fixing a machine with toast."]],
  'butter:machine_turbo': [['jack', "I'm not fixing a machine with toast."]],
  'butter:memorymaster': [['jack', 'I am not greasing the most important object in town.']],
  'screwdriver:maggie': [['jack', "I'm not even going to ask why you suggested that."]],
  'coat_hanger:phone_dial': [['jack', 'I feel like I am about to commit a very British crime.']],
  'coat_hanger:telephone': [['jack', 'I feel like I am about to commit a very British crime.']],
  'coin20:maggie': [['jack', "She's not a vending machine."]],
  'coin20:arthur': [
    ['jack', 'Here. Some of the two pounds forty.'],
    ['say', 'arthur', 'Some of it.'],
    ['jack', 'It is a gesture.'],
    ['say', 'arthur', 'It is twenty pence.'],
  ],
  'chocolate:kevin': [['dialogue', 'kevin_chocolate']],
  'gum:maggie': [['jack', 'Offering a woman used chewing gum. A masterstroke.']],
  'newspaper:derek': [
    ['say', 'derek', 'I have read it.'],
    ['jack', 'All of it?'],
    ['say', 'derek', 'Twice. The crossword is a message.'],
    ['jack', 'It is a crossword.'],
    ['say', 'derek', 'That is exactly what it wants you to think.'],
  ],
  'cable:memorymaster': [
    ['if', ['flag', 'powerConnected'],
      [['jack', 'The power is already in. Adding more cable would just be showing off.']],
      [['jack', 'Not here. This needs to go to the fuse box first.']],
    ],
  ],
};

/**
 * If an item is used on something with no bespoke response, Jack says one of
 * these rather than a generic "that doesn't work". Spec s.39: the writing
 * should be sharp enough that the player clicks on everything just to hear it.
 */
export const ITEM_REFUSALS: Record<string, string[]> = {
  screwdriver: [
    'I could unscrew it. I would then be holding a screw and a problem.',
    'Not everything is solved by disassembly. Most things, but not everything.',
  ],
  butter: [
    'Buttering it would achieve nothing except making it buttery.',
    'I am carrying butter around a seaside town. This is my life now.',
  ],
  coin20: [
    'I need that twenty pence. It represents eight percent of my debt.',
    'That is not a slot, and this is not a solution.',
  ],
  chocolate: [
    'I am saving it. For a moment of genuine crisis.',
    'It has been in my pocket for an hour. It is now more of a liquid.',
  ],
  coat_hanger: [
    'A coat hanger is not a universal tool. It is a very specific tool, used illegally.',
    'Not this. Something else, and probably something jammed.',
  ],
  lighter: [
    'Setting fire to it seems like a decision I would come to regret.',
    'I have a lighter and no cigarettes. The 1980s in one sentence.',
  ],
  gum: ['No.', 'Absolutely not.'],
  newspaper: [
    'It is a newspaper. Its uses are reading, and hitting flies.',
    'I have read it. It is mostly bad news and a crossword.',
  ],
  bolt_cutters: [
    'Cutting that would be vandalism. Cutting the aerial was engineering.',
    'I am not cutting that. I have standards. Loose ones.',
  ],
  antenna: ['This needs to be somewhere high. Somewhere with a view.', 'Not here. Higher.'],
  photograph: [
    'Showing a photograph to that is not going to produce answers.',
    'It is a photograph of tomorrow. It does not open things.',
  ],
  cable: ['That is not where the electricity wants to go.', 'Wrong end of the building.'],
  recorder: ['There is nothing here worth recording.', 'Not yet.'],
  blank_cassette: ['It goes in something that records. Not that.', 'Not yet. But soon.'],
};

export const DEFAULT_REFUSALS = [
  'That achieves nothing, and I would know.',
  'No.',
  'I have considered it and decided against it.',
  'I can think of eleven reasons not to, and I have only been thinking for a second.',
];

/** Names for the status line and the USE X WITH... prompt. */
export const ITEM_NAMES: Record<string, string> = Object.fromEntries(
  Object.values(ITEMS).map((i) => [i.id, i.name]),
);
