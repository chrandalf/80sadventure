import type { DialogueNode } from '../game/types';

/**
 * Every conversation in the game (spec s.12, s.34).
 *
 * Each NPC has several nodes; characters.ts picks which one opens based on
 * story flags, which is how the same person can be evasive early and honest
 * later without any branching code.
 */
export const DIALOGUE: Record<string, DialogueNode> = {
  // ------------------------------------------------------------- ACT I

  arthur_opening: {
    id: 'arthur_opening',
    who: 'arthur',
    lines: [
      { who: 'arthur', text: "You're late." },
      { who: 'jack', text: "It's seven o'clock." },
      { who: 'arthur', text: 'Exactly.' },
      { who: 'jack', text: "I've arrived at the correct time." },
      { who: 'arthur', text: "That's the problem with young people." },
      { who: 'jack', text: 'Being punctual?' },
      { who: 'arthur', text: 'Thinking clocks are correct.', anim: 'annoyed' },
      { who: 'narrator', text: 'Arthur hands Jack a toolbox.' },
      { who: 'arthur', text: 'Close up at eleven.' },
      { who: 'jack', text: 'Why me?' },
      { who: 'arthur', text: "Because you're the only person I trust." },
      { who: 'arthur', text: 'And because Maggie refuses to do it.' },
      { who: 'maggie', text: 'I CAN HEAR YOU.' },
      { who: 'arthur', text: 'See?', anim: 'happy' },
    ],
    onEnd: [
      ['give', 'toolbox'],
      ['score', 10, 'toolbox'],
      ['flag', 'metArthur'],
    ],
  },

  arthur_first: {
    id: 'arthur_first',
    who: 'arthur',
    intro: [
      [{ who: 'arthur', text: 'Still here, then.' }],
      [{ who: 'arthur', text: 'Unless you are holding two pounds forty, the answer has not changed.' }],
      [
        { who: 'arthur', text: 'Twice in one evening. People will talk.' },
        { who: 'jack', text: 'There is nobody here to talk.' },
        { who: 'arthur', text: 'Kevin talks.' },
      ],
    ],
    choices: [
      {
        text: 'Can I have the arcade key?',
        goto: 'arthur_key',
      },
      {
        text: 'What is that machine with no name on it?',
        goto: 'arthur_machine',
        showIf: ['flag', 'sawStrangeMachine'],
      },
      {
        text: 'Do you know anything about computers?',
        goto: 'arthur_computers',
        once: true,
      },
      { text: 'Nothing. Forget it.' },
    ],
  },

  arthur_key: {
    id: 'arthur_key',
    who: 'arthur',
    lines: [
      { who: 'arthur', text: 'Two pounds forty.', showIf: ['noflag', 'debtPaid'] },
      { who: 'jack', text: 'That was an accident.', showIf: ['noflag', 'debtPaid'] },
      {
        who: 'arthur',
        text: 'You reversed a forklift into a fruit machine, Jack.',
        showIf: ['noflag', 'debtPaid'],
      },
      { who: 'jack', text: 'Accidentally.', showIf: ['noflag', 'debtPaid'] },
      { who: 'arthur', text: 'Two pounds forty.', showIf: ['noflag', 'debtPaid'] },
    ],
    onEnd: [['flag', 'knowsAboutDebt']],
  },

  arthur_machine: {
    id: 'arthur_machine',
    who: 'arthur',
    lines: [
      { who: 'arthur', text: "Which one?", anim: 'annoyed' },
      { who: 'jack', text: 'The one with no manufacturer, no instructions and one red button.' },
      { who: 'arthur', text: "That one's not for playing." },
      { who: 'jack', text: "It's an arcade machine." },
      { who: 'arthur', text: 'It is a machine. In an arcade. Those are different things.' },
      { who: 'jack', text: 'That is the most convincing thing you have ever said, and I do not believe a word of it.' },
    ],
    onEnd: [['flag', 'askedAboutMachine']],
  },

  arthur_computers: {
    id: 'arthur_computers',
    who: 'arthur',
    lines: [
      { who: 'arthur', text: "Computers are a fad, son. Give it five years and we'll all be back to using pencils." },
      { who: 'jack', text: 'You own twenty-six of them.' },
      { who: 'arthur', text: 'I own twenty-six cabinets. What is inside them is their own business.' },
    ],
  },

  arthur_afterkey: {
    id: 'arthur_afterkey',
    who: 'arthur',
    lines: [{ who: 'arthur', text: 'Eleven o\'clock. Lights off, shutters down, and do not touch anything.' }],
    choices: [
      { text: 'The machines all turned on by themselves.', goto: 'arthur_denial', showIf: ['flag', 'firstEvent'] },
      { text: 'Who is the man in the photograph?', goto: 'arthur_photo', showIf: ['flag', 'sawOfficePhoto'] },
      { text: 'Right. Eleven.' },
    ],
  },

  arthur_denial: {
    id: 'arthur_denial',
    who: 'arthur',
    lines: [
      { who: 'arthur', text: 'Power surge.' },
      { who: 'jack', text: 'They all showed the same photograph.' },
      { who: 'arthur', text: 'Big power surge.' },
      { who: 'jack', text: 'Of tomorrow.' },
      { who: 'arthur', text: '...', anim: 'worried' },
      { who: 'arthur', text: 'Close up at eleven, Jack.' },
    ],
    onEnd: [['flag', 'arthurEvasive'], ['score', 10, 'arthurEvasive']],
  },

  arthur_photo: {
    id: 'arthur_photo',
    who: 'arthur',
    lines: [
      { who: 'arthur', text: 'Which photograph?' },
      { who: 'jack', text: 'The one from 1974 with a man scratched out of it.' },
      { who: 'arthur', text: 'Nobody.', anim: 'annoyed' },
      { who: 'jack', text: 'You scratched a nobody out of a photograph and then kept it on your wall for thirteen years.' },
      { who: 'arthur', text: 'He was a colleague.' },
      { who: 'jack', text: 'And?' },
      { who: 'arthur', text: 'And he was right about everything, which is the worst thing a colleague can be.' },
    ],
    onEnd: [['flag', 'arthurColleague'], ['score', 15, 'arthurColleague']],
  },

  arthur_defensive: {
    id: 'arthur_defensive',
    who: 'arthur',
    lines: [
      { who: 'arthur', text: 'You went downstairs.' },
      { who: 'jack', text: 'You have a machine down there the size of a bus.' },
      { who: 'arthur', text: 'I have a machine down there that can keep this place standing.' },
      { who: 'jack', text: 'By deleting Saturday.' },
      { who: 'arthur', text: 'By keeping Friday.', anim: 'annoyed' },
      { who: 'jack', text: 'Those are the same sentence, Arthur.' },
      { who: 'arthur', text: 'They are not the same sentence at all, and one day you will understand the difference.' },
    ],
  },

  arthur_vale: {
    id: 'arthur_vale',
    who: 'arthur',
    lines: [
      { who: 'arthur', text: 'So you know.' },
      { who: 'jack', text: 'Elliot Vale. Maggie\'s father.' },
      { who: 'arthur', text: 'He built the first one. I only ever fetched the tea.' },
      { who: 'jack', text: 'And then he disappeared.' },
      { who: 'arthur', text: 'He did not disappear. He went in.', anim: 'worried' },
      { who: 'jack', text: 'Into the machine.' },
      { who: 'arthur', text: 'At seventeen minutes past eleven, on a Tuesday, in 1974. Every clock in this town has been wrong ever since.' },
      { who: 'jack', text: 'And you never told her.' },
      { who: 'arthur', text: 'How would I start, Jack? Which sentence would I use?' },
    ],
    onEnd: [['flag', 'arthurConfessed'], ['score', 50, 'arthurConfessed']],
  },

  // ------------------------------------------------------------ MAGGIE

  maggie_first: {
    id: 'maggie_first',
    who: 'maggie',
    intro: [
      [{ who: 'maggie', text: "You're still working here?" }],
      [
        { who: 'maggie', text: 'If you keep finding reasons to talk to me, I will start keeping count.' },
        { who: 'jack', text: '...' },
        { who: 'maggie', text: 'Four.' },
      ],
      [
        { who: 'maggie', text: 'Yes?' },
        { who: 'jack', text: 'Nothing. Checking you were still there.' },
        { who: 'maggie', text: 'Where would I go? This is the last good room in town.' },
      ],
    ],
    choices: [
      { text: "It's my job.", goto: 'maggie_job', once: true },
      { text: 'Do you know anything about the unmarked machine?', goto: 'maggie_deflect' },
      { text: 'Arthur says you refused to close up.', goto: 'maggie_closing', once: true },
      { text: 'Never mind.' },
    ],
  },

  maggie_job: {
    id: 'maggie_job',
    who: 'maggie',
    lines: [
      { who: 'maggie', text: 'It is a job in a building that stops existing on Sunday.' },
      { who: 'jack', text: 'Saturday.' },
      { who: 'maggie', text: 'Saturday. Right.', anim: 'worried' },
      { who: 'jack', text: 'You said Sunday.' },
      { who: 'maggie', text: 'I said Saturday.' },
    ],
    onEnd: [['flag', 'maggieSlipped'], ['score', 10, 'maggieSlipped']],
  },

  maggie_deflect: {
    id: 'maggie_deflect',
    who: 'maggie',
    lines: [
      { who: 'maggie', text: 'No.' },
      { who: 'jack', text: 'That was quick.' },
      { who: 'maggie', text: 'It was an easy question.' },
    ],
  },

  maggie_closing: {
    id: 'maggie_closing',
    who: 'maggie',
    lines: [
      { who: 'maggie', text: 'I am not being in this building after eleven.' },
      { who: 'jack', text: 'Why not?' },
      { who: 'maggie', text: 'Because I am not.' },
      { who: 'jack', text: 'That is not a reason, that is the same sentence with more conviction.' },
      { who: 'maggie', text: 'Then it is the reason you are getting.' },
    ],
  },

  maggie_worried: {
    id: 'maggie_worried',
    who: 'maggie',
    lines: [
      { who: 'maggie', text: 'Jack, I need you to stop asking questions.', anim: 'worried' },
    ],
    choices: [
      { text: 'I have a photograph of tomorrow in my pocket.', goto: 'maggie_photo' },
      { text: 'What are you afraid of?', goto: 'maggie_afraid' },
      { text: 'All right.' },
    ],
  },

  maggie_photo: {
    id: 'maggie_photo',
    who: 'maggie',
    lines: [
      { who: 'maggie', text: 'Then put it back.' },
      { who: 'jack', text: 'Back where? It came out of a booth.' },
      { who: 'maggie', text: 'Put it back in the booth, Jack.' },
      { who: 'jack', text: 'You know what it is.' },
      { who: 'maggie', text: 'I know what it does. That is worse.', anim: 'worried' },
    ],
    onEnd: [['score', 15, 'maggiePhoto']],
  },

  maggie_afraid: {
    id: 'maggie_afraid',
    who: 'maggie',
    lines: [
      { who: 'maggie', text: 'I am not afraid. I am tired.' },
      { who: 'jack', text: 'Of what?' },
      { who: 'maggie', text: 'Of this town being exactly the same every single day and everyone calling it charm.' },
    ],
  },

  maggie_confession: {
    id: 'maggie_confession',
    who: 'maggie',
    lines: [
      { who: 'maggie', text: 'You found the tape.' },
      { who: 'jack', text: 'You knew?' },
      { who: 'maggie', text: 'Yes.' },
      { who: 'jack', text: 'How long?' },
      { who: 'maggie', text: 'Since Tuesday.' },
      { who: 'jack', text: "It's Friday." },
      { who: 'maggie', text: "I've had a busy week.", anim: 'annoyed' },
      { who: 'jack', text: 'Maggie.' },
      { who: 'maggie', text: 'Arthur found it years ago. Under the building. It was built as an experimental cabinet - it recorded what people remembered while they played.' },
      { who: 'jack', text: 'That is horrifying.' },
      { who: 'maggie', text: 'It got worse. It started recording things that had not happened.' },
      { who: 'jack', text: 'And Arthur?' },
      { who: 'maggie', text: 'Arthur decided that was a feature.' },
    ],
    onEnd: [
      ['flag', 'maggieConfessed'],
      ['score', 40, 'maggieConfessed'],
      ['act', 4],
    ],
  },

  maggie_machine: {
    id: 'maggie_machine',
    who: 'maggie',
    lines: [{ who: 'maggie', text: 'I was hoping you would never find that.' }],
    choices: [
      { text: 'It is the size of a bus.', goto: 'maggie_size', once: true },
      { text: 'Why does Arthur want to keep today?', goto: 'maggie_why' },
      { text: 'We should switch it off.', goto: 'maggie_switchoff' },
    ],
  },

  maggie_size: {
    id: 'maggie_size',
    who: 'maggie',
    lines: [
      { who: 'maggie', text: 'It used to be smaller. It has been added to.' },
      { who: 'jack', text: 'By whom?' },
      { who: 'maggie', text: 'By a man with a soldering iron and thirteen years.' },
    ],
  },

  maggie_why: {
    id: 'maggie_why',
    who: 'maggie',
    lines: [
      { who: 'maggie', text: 'Because tomorrow they knock it down, and the day after that nobody remembers it was here.' },
      { who: 'jack', text: 'That happens to everything.' },
      { who: 'maggie', text: 'Yes. That is the part he cannot accept.' },
    ],
  },

  maggie_switchoff: {
    id: 'maggie_switchoff',
    who: 'maggie',
    lines: [
      { who: 'maggie', text: 'Your own voice told you not to.' },
      { who: 'jack', text: 'My own voice has been wrong before.' },
      { who: 'maggie', text: 'Constantly. But not, I think, tonight.' },
    ],
  },

  maggie_father: {
    id: 'maggie_father',
    who: 'maggie',
    lines: [
      { who: 'maggie', text: 'Say it.' },
      { who: 'jack', text: 'Elliot Vale built the machine with Arthur in 1974.' },
      { who: 'maggie', text: 'And?' },
      { who: 'jack', text: 'And he did not leave.' },
      { who: 'maggie', text: 'I spent thirteen years thinking he left.', anim: 'worried' },
      { who: 'jack', text: 'I know.' },
      { who: 'maggie', text: 'Thirteen years of being the girl whose dad went out for a paper.' },
      { who: 'jack', text: 'Maggie -' },
      { who: 'maggie', text: 'Do not be kind. I will cope with almost anything except you being kind.' },
      { who: 'jack', text: 'Right. You look terrible and your hair is a disaster.' },
      { who: 'maggie', text: 'Better.', anim: 'happy' },
    ],
    onEnd: [['flag', 'maggieKnows'], ['score', 40, 'maggieKnows']],
  },

  // ------------------------------------------------------------- DEREK

  derek_first: {
    id: 'derek_first',
    who: 'derek',
    intro: [
      [{ who: 'derek', text: 'Shop is closed. Unless it is urgent. Is it urgent?' }],
      [
        { who: 'derek', text: 'Back again. People will say we are going steady.' },
        { who: 'jack', text: 'People will say you sell televisions.' },
        { who: 'derek', text: 'They say that too.' },
      ],
      [{ who: 'derek', text: 'Still closed. Still listening.' }],
    ],
    choices: [
      { text: 'Do television signals record the future?', goto: 'derek_signals', once: true },
      { text: 'I need an aerial.', goto: 'derek_aerial' },
      { text: 'Do you get many customers this late?', goto: 'derek_late', once: true },
      { text: 'No. Sorry.' },
    ],
  },

  derek_signals: {
    id: 'derek_signals',
    who: 'derek',
    lines: [
      { who: 'derek', text: 'No.', anim: 'excited' },
      { who: 'jack', text: 'Good.' },
      { who: 'derek', text: 'They read your thoughts, which is completely different.' },
      { who: 'jack', text: 'Is it?' },
      { who: 'derek', text: 'Structurally, yes. Practically, no.' },
    ],
  },

  derek_late: {
    id: 'derek_late',
    who: 'derek',
    lines: [
      { who: 'derek', text: 'After dark it is all urgent repairs. Curtains drawn, one lamp on, "it just went off, Derek."' },
      { who: 'jack', text: 'Televisions?' },
      { who: 'derek', text: 'Mostly.' },
      { who: 'jack', text: 'I am not going to ask about the rest.' },
      { who: 'derek', text: 'The rest is also televisions. This is a seaside town. People are starved of drama, not imagination.' },
    ],
    onEnd: [['cheeky', 'derekAfterDark'], ['score', 5, 'derekAfterDark']],
  },

  derek_aerial: {
    id: 'derek_aerial',
    who: 'derek',
    lines: [
      { who: 'derek', text: 'Everyone needs an aerial. Very few people deserve one.' },
      {
        who: 'derek',
        text: 'There is one on the roof out the back. It is far too big for anything sensible.',
        showIf: ['flag', 'derekExplained'],
      },
      {
        who: 'derek',
        text: 'Come back when you can tell me what you want it for.',
        showIf: ['noflag', 'derekExplained'],
      },
    ],
    onEnd: [
      ['if', ['flag', 'derekExplained'], [['flag', 'antennaOffered']]],
    ],
  },

  derek_film: {
    id: 'derek_film',
    who: 'derek',
    lines: [
      { who: 'derek', text: "That's impossible.", anim: 'excited' },
      { who: 'jack', text: 'Good.' },
      { who: 'derek', text: 'No, I mean physically impossible.' },
      { who: 'jack', text: 'Even better.' },
    ],
    choices: [
      { text: 'Who made it?', goto: 'derek_who' },
      { text: 'What signal?', goto: 'derek_what' },
      { text: 'Television does not record the future.', goto: 'derek_direction' },
    ],
  },

  derek_who: {
    id: 'derek_who',
    who: 'derek',
    lines: [{ who: 'derek', text: 'Someone who knows how the signal works.' }],
    choices: [
      { text: 'What signal?', goto: 'derek_what' },
      { text: 'Television does not record the future.', goto: 'derek_direction' },
    ],
  },

  derek_what: {
    id: 'derek_what',
    who: 'derek',
    lines: [{ who: 'derek', text: 'Television.' }],
    choices: [
      { text: 'Television does not record the future.', goto: 'derek_direction' },
      { text: 'Who made it?', goto: 'derek_who' },
    ],
  },

  derek_direction: {
    id: 'derek_direction',
    who: 'derek',
    lines: [
      { who: 'derek', text: 'Correct.' },
      { who: 'jack', text: 'So?' },
      { who: 'derek', text: 'Someone is recording the wrong direction.', anim: 'terrified' },
      { who: 'jack', text: 'What does that mean?' },
      { who: 'derek', text: 'It means the tape is not listening to today. It is listening to tomorrow, and tomorrow is answering.' },
      { who: 'jack', text: 'Derek.' },
      { who: 'derek', text: 'Yes?' },
      { who: 'jack', text: 'That is the first thing you have ever said that I understood immediately, and I hate it.' },
      { who: 'derek', text: 'You will need an aerial. A large one. I have a large one.' },
    ],
    onEnd: [
      ['flag', 'derekExplained'],
      ['score', 30, 'derekExplained'],
      ['act', 3],
    ],
  },

  derek_antenna_done: {
    id: 'derek_antenna_done',
    who: 'derek',
    lines: [
      { who: 'derek', text: 'That was a very expensive antenna.' },
      { who: 'jack', text: "It wasn't yours." },
      { who: 'derek', text: 'Exactly.' },
    ],
  },

  // ------------------------------------------------------------- KEVIN

  kevin_first: {
    id: 'kevin_first',
    who: 'kevin',
    intro: [
      [{ who: 'kevin', text: 'I have got the high score on every machine in here.' }],
      [
        { who: 'kevin', text: 'You again. I am mid-game.' },
        { who: 'jack', text: 'You are always mid-game.' },
        { who: 'kevin', text: 'Correct.' },
      ],
      [
        { who: 'kevin', text: 'If you are here to watch and learn, stand on the left.' },
        { who: 'jack', text: 'What is wrong with the right?' },
        { who: 'kevin', text: 'That is my drinking arm.' },
      ],
    ],
    choices: [
      { text: 'Every machine?', goto: 'kevin_every', once: true },
      { text: 'Can you lend me two pounds?', goto: 'kevin_money' },
      { text: 'Have you seen anything strange tonight?', goto: 'kevin_strange' },
      { text: 'Congratulations.' },
    ],
  },

  kevin_every: {
    id: 'kevin_every',
    who: 'kevin',
    lines: [
      { who: 'kevin', text: 'Every machine.', anim: 'smug' },
      { who: 'jack', text: 'Including the one with no name on it.' },
      { who: 'kevin', text: '...Every machine that has a score.' },
      { who: 'jack', text: 'So not that one.' },
      { who: 'kevin', text: 'That one does not have a score. It has a message.' },
      { who: 'jack', text: 'What message?' },
      { who: 'kevin', text: 'It said my name.', anim: 'shocked' },
      { who: 'jack', text: '...' },
      { who: 'kevin', text: 'I did not like it.' },
    ],
    onEnd: [['flag', 'sawStrangeMachine'], ['score', 15, 'kevinMachine']],
  },

  kevin_money: {
    id: 'kevin_money',
    who: 'kevin',
    lines: [
      { who: 'kevin', text: 'What is in it for me?', showIf: ['noflag', 'kevinFed'] },
      { who: 'jack', text: 'Gratitude.', showIf: ['noflag', 'kevinFed'] },
      { who: 'kevin', text: 'I have got loads of that.', showIf: ['noflag', 'kevinFed'] },
      { who: 'kevin', text: 'Go on then. Because of the chocolate.', showIf: ['flag', 'kevinFed'] },
    ],
    onEnd: [
      ['if', ['flag', 'kevinFed'],
        [
          ['give', 'kevin_money'],
          ['flag', 'kevinLent'],
          ['jack', 'Two pounds twenty, in ten-pence pieces, from a sixteen-year-old. My twenties are going well.'],
          ['score', 15, 'kevinLent'],
        ],
      ],
    ],
  },

  kevin_strange: {
    id: 'kevin_strange',
    who: 'kevin',
    lines: [
      { who: 'kevin', text: 'The lights went funny at quarter past eight.' },
      { who: 'jack', text: 'And?' },
      { who: 'kevin', text: 'And Turbo Racer showed a bit of the seafront instead of the track.' },
      { who: 'jack', text: 'That is not a normal thing for Turbo Racer to do.' },
      { who: 'kevin', text: 'No. It is a driving game. There is no seafront in it.' },
      { who: 'jack', text: 'Kevin, do you know where I could find twenty pence?' },
      { who: 'kevin', text: 'Change falls under the cigarette machine. Everyone knows that.' },
      { who: 'jack', text: 'I did not know that.' },
      { who: 'kevin', text: 'Everyone who matters knows that.' },
    ],
    onEnd: [['flag', 'kevinSawIt']],
  },

  kevin_chocolate: {
    id: 'kevin_chocolate',
    who: 'kevin',
    lines: [
      { who: 'kevin', text: 'Is this some kind of trick?' },
      { who: 'jack', text: 'Yes.' },
      { who: 'kevin', text: 'Cool.', anim: 'happy' },
    ],
    onEnd: [
      ['take', 'chocolate'],
      ['flag', 'kevinFed'],
      ['score', 10, 'kevinFed'],
      ['jack', 'He took a bribe from a stranger without hesitating. He will go far.'],
    ],
  },

  kevin_friendly: {
    id: 'kevin_friendly',
    who: 'kevin',
    intro: [
      [{ who: 'kevin', text: 'All right, chocolate man.' }],
      [
        { who: 'kevin', text: 'Chocolate man returns. Got any more?' },
        { who: 'jack', text: 'No.' },
        { who: 'kevin', text: 'Then this is a social call, and I am touched.' },
      ],
      [{ who: 'kevin', text: 'Ask quick. Level nine does not pause itself.' }],
    ],
    choices: [
      { text: 'Can you lend me two pounds?', goto: 'kevin_money', showIf: ['noflag', 'kevinLent'] },
      { text: 'Have you seen anything strange tonight?', goto: 'kevin_strange' },
      { text: 'Nothing.' },
    ],
  },

  kevin_beaten: {
    id: 'kevin_beaten',
    who: 'kevin',
    lines: [
      { who: 'kevin', text: 'No.' },
      { who: 'jack', text: 'What?' },
      { who: 'kevin', text: "That's not possible." },
      { who: 'jack', text: 'I just did it.' },
      { who: 'kevin', text: 'Exactly.', anim: 'shocked' },
    ],
  },

  // ------------------------------------------------------------ BRENDA

  brenda_first: {
    id: 'brenda_first',
    who: 'brenda',
    intro: [
      [
        { who: 'brenda', text: 'Are you buying?' },
        { who: 'jack', text: 'I was going to ask a question.' },
        { who: 'brenda', text: 'Questions are for customers.' },
      ],
      [
        { who: 'brenda', text: 'Rule four. No loitering while I cash up.' },
        { who: 'jack', text: 'You have been cashing up for three hours.' },
        { who: 'brenda', text: 'Rule five. No commentary.' },
      ],
      [{ who: 'brenda', text: 'You are back. The answer to your next question is twenty pence.' }],
    ],
    choices: [
      {
        text: 'Fine. One chocolate bar.',
        showIf: ['has', 'coin20'],
        actions: [
          ['take', 'coin20'],
          ['give', 'chocolate'],
          ['flag', 'brendaBought'],
          ['say', 'brenda', 'Twenty pence. And no eating it by the pond.'],
          ['jack', 'There is no pond.'],
          ['say', 'brenda', 'There will be. I have seen the plans.'],
          ['score', 10, 'brendaBought'],
        ],
      },
      { text: 'I have no money.', goto: 'brenda_nomoney' },
    ],
  },

  brenda_nomoney: {
    id: 'brenda_nomoney',
    who: 'brenda',
    lines: [
      { who: 'brenda', text: 'Then we have nothing to discuss.' },
      { who: 'jack', text: 'Right.' },
      { who: 'brenda', text: 'Rule eleven. No browsing without intent.' },
    ],
  },

  brenda_talks: {
    id: 'brenda_talks',
    who: 'brenda',
    intro: [
      [{ who: 'brenda', text: 'Go on then. One question. Make it good.' }],
      [{ who: 'brenda', text: 'What now?' }],
      [
        { who: 'brenda', text: 'This is becoming a habit. I have a rule about habits.' },
        { who: 'jack', text: 'Which is?' },
        { who: 'brenda', text: 'Rule nine. Charge for them.' },
      ],
    ],
    choices: [
      { text: 'What do you know about Arthur Bell?', goto: 'brenda_arthur', once: true },
      { text: 'Who was Elliot Vale?', goto: 'brenda_vale', showIf: ['flag', 'arthurColleague'], once: true },
      { text: 'Is there anything unusual about the cinema?', goto: 'brenda_cinema', once: true },
      { text: 'Anything I should know about the Lido?', goto: 'brenda_lido', once: true },
      { text: 'Do you sell postcards?', goto: 'brenda_postcards', once: true },
      { text: 'Nothing, thanks.' },
    ],
  },

  brenda_lido: {
    id: 'brenda_lido',
    who: 'brenda',
    lines: [
      { who: 'brenda', text: "Rule one of the Lido: cabin three is Arthur's." },
      { who: 'jack', text: 'What is rule two?' },
      { who: 'brenda', text: 'Nobody has ever needed rule two.' },
      { who: 'jack', text: 'I already regret asking.' },
    ],
    onEnd: [['cheeky', 'brendaLido'], ['score', 5, 'brendaLido']],
  },

  brenda_postcards: {
    id: 'brenda_postcards',
    who: 'brenda',
    lines: [
      { who: 'brenda', text: 'Views of the pier. The other sort are under the counter.' },
      { who: 'jack', text: 'What other sort?' },
      { who: 'brenda', text: 'Rule thirty. You have to be married, forty, or a doctor.' },
      { who: 'jack', text: 'I am none of those things.' },
      { who: 'brenda', text: 'Then you get the lighthouse.' },
    ],
    onEnd: [['cheeky', 'brendaPostcards'], ['score', 5, 'brendaPostcards']],
  },

  brenda_arthur: {
    id: 'brenda_arthur',
    who: 'brenda',
    lines: [
      { who: 'brenda', text: 'Been here since 1974. Never took a holiday. Not one.' },
      { who: 'jack', text: 'Thirteen years?' },
      { who: 'brenda', text: 'Fourteen next April. I keep a list.' },
      { who: 'jack', text: 'Of course you do.' },
      { who: 'brenda', text: 'He stopped smiling in the autumn of 1974 and never started again. That is also on the list.' },
    ],
    onEnd: [['score', 10, 'brendaArthur']],
  },

  brenda_vale: {
    id: 'brenda_vale',
    who: 'brenda',
    lines: [
      { who: 'brenda', text: 'Doctor Vale. Clever man. Too clever for a seaside town.' },
      { who: 'jack', text: 'What happened to him?' },
      { who: 'brenda', text: 'Went out one Tuesday and did not come back.' },
      { who: 'jack', text: 'Left his daughter?' },
      { who: 'brenda', text: 'That is what everyone decided, yes.' },
      { who: 'jack', text: 'You do not sound convinced.' },
      { who: 'brenda', text: 'I sold that man a bag of mints every Tuesday for six years. People who abandon their children do not buy mints on a schedule.' },
    ],
    onEnd: [['flag', 'brendaVale'], ['score', 20, 'brendaVale']],
  },

  brenda_cinema: {
    id: 'brenda_cinema',
    who: 'brenda',
    lines: [
      { who: 'brenda', text: 'It has been shut eleven years and the electricity bill still gets paid.' },
      { who: 'jack', text: 'By whom?' },
      { who: 'brenda', text: 'That is a second question.' },
    ],
    onEnd: [['flag', 'cinemaHinted'], ['score', 10, 'brendaCinema']],
  },

  // ------------------------------------ THE SEASIDE HOTEL (spec s.46)

  valerie_reception: {
    id: 'valerie_reception',
    who: 'valerie',
    lines: [
      { who: 'jack', text: "I'm looking for Maggie Vale." },
      { who: 'valerie', text: 'Room 12.' },
      { who: 'jack', text: 'Is she expecting me?' },
      { who: 'valerie', text: 'Probably not.' },
      { who: 'jack', text: 'That sounds ominous.' },
      { who: 'valerie', text: "With Maggie, it's usually accurate.", anim: 'smug' },
      { who: 'narrator', text: 'Jack takes the key.' },
    ],
    onEnd: [
      ['give', 'room12_key'],
      ['flag', 'hasRoom12Key'],
      ['score', 15, 'room12key'],
    ],
  },

  valerie_after: {
    id: 'valerie_after',
    who: 'valerie',
    intro: [
      [{ who: 'valerie', text: 'Still here.' }],
      [{ who: 'valerie', text: 'The bar is shut, the pool is shut, and whatever you are about to suggest is also shut.' }],
      [
        { who: 'valerie', text: 'Twice in one night. Either you are in trouble or you think you are charming.' },
        { who: 'jack', text: 'Can it be both?' },
        { who: 'valerie', text: 'It is usually both.' },
      ],
    ],
    choices: [
      { text: 'Has anyone else asked for Maggie tonight?', goto: 'valerie_asked', once: true },
      { text: 'Do you know a Doctor Vale?', goto: 'valerie_vale', showIf: ['flag', 'arthurColleague'], once: true },
      { text: 'What time do you finish?', goto: 'valerie_finish', once: true },
      { text: 'No. Nothing.' },
    ],
  },

  valerie_finish: {
    id: 'valerie_finish',
    who: 'valerie',
    lines: [
      { who: 'valerie', text: 'Half past never.' },
      { who: 'jack', text: 'Right. Yes. Obviously.' },
      { who: 'valerie', text: 'Points for asking with a straight face, though.' },
      { who: 'jack', text: 'It is the only face I have.' },
      { who: 'valerie', text: 'Shame.', anim: 'smug' },
    ],
    onEnd: [['cheeky', 'valerieFinish'], ['score', 5, 'valerieFinish']],
  },

  valerie_asked: {
    id: 'valerie_asked',
    who: 'valerie',
    lines: [
      { who: 'valerie', text: 'A man in a white shirt and a black tie. About an hour ago.' },
      { who: 'jack', text: 'What did he want?' },
      { who: 'valerie', text: 'He did not want anything. He stood in reception for four minutes and left.' },
      { who: 'jack', text: 'That is not unsettling at all.' },
      { who: 'valerie', text: 'The unsettling part is that I did not hear the door.' },
    ],
    onEnd: [['flag', 'valeSighting'], ['score', 20, 'valeSighting']],
  },

  valerie_vale: {
    id: 'valerie_vale',
    who: 'valerie',
    lines: [
      { who: 'valerie', text: 'The name is in the register. Every Tuesday, room 12, from 1971 to 1974.' },
      { who: 'jack', text: 'And then?' },
      { who: 'valerie', text: 'And then it is in the register every Tuesday since, in the same handwriting, and nobody has ever checked in.' },
      { who: 'jack', text: 'Right.' },
      { who: 'valerie', text: 'I stopped looking at that page in 1985.' },
    ],
    onEnd: [['score', 25, 'valerieRegister']],
  },

  // ------------------------------------- THE VIDEO SHOP (spec s.50)

  graham_first: {
    id: 'graham_first',
    who: 'graham',
    intro: [
      [{ who: 'graham', text: 'We shut at nine. It is nearly nine.' }],
      [{ who: 'graham', text: 'It is now past nine, so technically this is a lock-in.' }],
      [
        { who: 'graham', text: 'The educational section is still not what you think it is.' },
        { who: 'jack', text: 'I did not say anything.' },
        { who: 'graham', text: 'You were going to.' },
      ],
    ],
    choices: [
      { text: 'Do you rent out film projector parts?', goto: 'graham_parts', once: true },
      { text: 'What is through the beaded curtain?', goto: 'graham_curtain', once: true },
      { text: 'Nothing. Just browsing.' },
    ],
  },

  graham_parts: {
    id: 'graham_parts',
    who: 'graham',
    lines: [
      { who: 'graham', text: 'This is a video shop.' },
      { who: 'jack', text: 'You have a projector in the window.' },
      { who: 'graham', text: 'That is a display projector.' },
      { who: 'jack', text: 'Does it work?' },
      { who: 'graham', text: 'It is a display projector, and it does not have a fuse, and I would like you to stop looking at it.' },
    ],
    onEnd: [['flag', 'fuseHinted']],
  },

  graham_curtain: {
    id: 'graham_curtain',
    who: 'graham',
    lines: [
      { who: 'graham', text: 'The back section.' },
      { who: 'jack', text: 'What is in the back section?' },
      { who: 'graham', text: 'Films.' },
      { who: 'jack', text: 'What sort of films?' },
      { who: 'graham', text: 'The sort that are in the back section.' },
      { who: 'jack', text: 'Are they educational?' },
      { who: 'graham', text: 'Extremely.' },
    ],
  },

  /** The exchange from spec s.50, triggered by examining the shelf. */
  graham_educational: {
    id: 'graham_educational',
    who: 'graham',
    lines: [
      { who: 'graham', text: 'Looking for something?' },
      { who: 'jack', text: 'Something educational.' },
      { who: 'graham', text: 'Of course.' },
      { who: 'jack', text: 'About... engineering.' },
      { who: 'graham', text: 'Naturally.', anim: 'smug' },
      { who: 'jack', text: 'I am going to go now.' },
      { who: 'graham', text: 'Take your time. Everyone does.' },
    ],
    onEnd: [['cheeky', 'graham_educational']],
  },

  // ----------------------------------------- THE PHONE BOX (spec s.17)

  phone_menu: {
    id: 'phone_menu',
    lines: [{ who: 'narrator', text: 'Jack lifts the receiver. Who is he ringing?' }],
    choices: [
      { text: '999', goto: 'phone_999', once: true },
      { text: 'The arcade', goto: 'phone_arcade', once: true },
      { text: 'His own number', goto: 'phone_self', showIf: ['flag', 'futurePhotoFound'], once: true },
      { text: 'The speaking clock', goto: 'phone_clock', once: true },
      { text: 'Hang up.' },
    ],
  },

  phone_999: {
    id: 'phone_999',
    lines: [
      { who: 'jack', text: 'I am not calling the emergency services because an arcade machine looked at me funny.' },
    ],
    onEnd: [['cheeky', 'phone999']],
  },

  phone_arcade: {
    id: 'phone_arcade',
    lines: [
      { who: 'narrator', text: 'It rings. And rings.' },
      { who: 'narrator', text: 'Then, faintly, from a mile away across the seafront, Jack hears the arcade phone ringing back.' },
      { who: 'jack', text: "That's unsettling." },
      { who: 'jack', text: 'I am inside a sealed telephone box a mile from the arcade. I should not be able to hear that.' },
    ],
    onEnd: [['cheeky', 'phoneArcade'], ['score', 10, 'phoneArcade']],
  },

  phone_self: {
    id: 'phone_self',
    lines: [
      { who: 'narrator', text: 'It rings once.' },
      { who: 'narrator', text: 'Somebody picks up.' },
      { who: 'jack', text: 'Hello?' },
      { who: 'jack', text: "Don't." },
      { who: 'narrator', text: 'It is his own voice.' },
      { who: 'narrator', text: 'Jack hangs up.' },
      { who: 'jack', text: '...' },
      { who: 'jack', text: "I'm going to walk out of here very calmly." },
    ],
    onEnd: [['cheeky', 'phoneSelf'], ['score', 25, 'phoneSelf'], ['flag', 'rangSelf']],
  },

  phone_clock: {
    id: 'phone_clock',
    lines: [
      { who: 'narrator', text: 'At the third stroke, the time sponsored by Accurist will be...' },
      { who: 'narrator', text: 'Eleven seventeen and zero seconds.' },
      { who: 'jack', text: 'It is twenty past nine.' },
      { who: 'narrator', text: 'Eleven seventeen and zero seconds.' },
      { who: 'jack', text: 'Right.' },
    ],
    onEnd: [['cheeky', 'phoneClock'], ['score', 15, 'phoneClock'], ['flag', 'clockFrozenKnown']],
  },

  // -------------------------------------------- ACT VI: the confrontation

  arthur_final: {
    id: 'arthur_final',
    who: 'arthur',
    lines: [
      { who: 'arthur', text: 'It needs one more memory. A memory of whoever is operating it.' },
      { who: 'jack', text: 'And that is why I am in the photograph.' },
      { who: 'arthur', text: 'Yes.' },
      { who: 'jack', text: 'It has been arranging tonight so that I would be standing here.' },
      { who: 'arthur', text: 'It has been remembering tonight. There is a difference.' },
      { who: 'jack', text: 'Is there?' },
      { who: 'arthur', text: 'No.', anim: 'worried' },
      { who: 'maggie', text: 'Jack. Whatever you are going to do, do it before it does it for you.' },
    ],
    onEnd: [['flag', 'finalConfrontation'], ['score', 60, 'finalConfrontation']],
  },

  final_choice: {
    id: 'final_choice',
    who: 'machine',
    lines: [
      { who: 'machine', text: 'INSERT MEMORY.' },
      { who: 'jack', text: 'Right.' },
    ],
    choices: [
      {
        text: 'Load every cassette you have found.',
        showIf: ['and',
          ['flag', 'cass_jack'], ['flag', 'cass_arthur'], ['flag', 'cass_vale'],
          ['flag', 'cass_saturday'], ['flag', 'cass_1974'], ['flag', 'cass_maggie'],
        ],
        actions: [['flag', 'gameFinished'], ['ending', 'secret']],
      },
      {
        text: 'Record something new. (Blank cassette)',
        showIf: ['has', 'blank_cassette'],
        actions: [['flag', 'gameFinished'], ['ending', 'record']],
      },
      {
        text: 'Destroy the machine.',
        showIf: ['has', 'bolt_cutters'],
        actions: [['flag', 'gameFinished'], ['ending', 'destroy']],
      },
      {
        text: 'Let Arthur keep 1987.',
        actions: [['flag', 'gameFinished'], ['ending', 'preserve']],
      },
      { text: 'Not yet. I need a moment.' },
    ],
  },
};
