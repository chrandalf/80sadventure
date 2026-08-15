<!--
  RECOVERED SOURCE SPECIFICATION - DO NOT EDIT TO MATCH THE CODE.

  This is the original brief, reproduced verbatim from the chat messages it was
  delivered in. It is the source of truth the game was built against, and the
  section numbers cited throughout the codebase ("spec s.27", "spec s.56") refer
  to the numbered sections below.

  Part one (sections 1-45) was pasted into the conversation; part two
  (sections 46-56) was uploaded as one_more_credit_expanded.txt. Both are
  reproduced unaltered apart from this header, the two part headings, and the
  removal of the words that introduced the paste.

  Where the build knowingly departs from this document - plain canvas instead of
  React, 640x400 instead of 320x200, square pixels instead of a 4:3 stretch -
  those decisions and their reasons are recorded in docs/PROGRESS.md. Record any
  further departures there too. This file stays as written.
-->

# ONE MORE CREDIT — source specification

> Recovered verbatim from the original brief. See `docs/PROGRESS.md` for what
> was built, what was not, and where the implementation deliberately differs.

---

# Part one — sections 1–45

ONE MORE CREDIT
A complete 1980s point-and-click adventure game design, script and build specification
Genre
1980s point-and-click comedy adventure
Tone
British 1980s comedy, mystery, nostalgia, absurdity and light sci-fi.
Think:

* VHS rental shops
* seaside arcades
* CRT televisions
* ZX Spectrums
* cassette tapes
* terrible hair
* synth music
* fluorescent lighting
* cheap hamburgers
* amusement arcades
* dodgy electronics
* British sitcom humour
* surreal adventure-game logic

But with an original central mechanic.
Platform
Build as a browser game.
Recommended:

* React
* TypeScript
* HTML5 Canvas or DOM-based scene rendering
* Pixel-art visuals
* 4:3 game viewport
* Responsive outer frame
* Save/load using localStorage
* No backend required

The game should feel like a lost 1987 PC adventure game that has somehow escaped onto a modern browser.
1. THE PREMISE
It is Friday, 18 September 1987.
The fictional British seaside town of Brighton Vale is preparing for the annual closing night of its famous amusement arcade:
STARLIGHT ARCADE
The arcade has been open since 1974.
Tonight is supposed to be its final night before the building is demolished.
You play:
JACK MERCER
Age: 20.
Occupation: trainee arcade-machine technician.
Personality:

* sarcastic
* clever but lazy
* technically competent
* socially awkward
* convinced he is considerably more intelligent than everyone around him
* usually wrong

Jack has been asked by the arcade owner to stay behind after closing and disconnect the machines.
At 11:17 PM, something strange happens.
Every arcade machine in the building turns on simultaneously.
The screens display the same message:
ONE MORE CREDIT.
Then they all display the exact same image:
A photograph of Starlight Arcade.
Taken tomorrow.
Except tomorrow, the building is supposed to be demolished.
In the photograph, the arcade is still standing.
And there is a person standing in the doorway.
It is Jack.
Wearing the exact clothes he is wearing tonight.
2. THE CENTRAL MECHANIC
The game's main mechanic is:
THE ARCADE REMEMBERS.
Certain arcade machines contain fragments of the future.
By inserting coins into specific machines, Jack can temporarily see events that will happen elsewhere in the town.
However, the machines don't show the future directly.
They show memories from tomorrow.
The player gradually realises that someone has created a machine capable of storing and replaying an entire day.
The villain wants to trap Brighton Vale permanently in:
Friday, 18 September 1987.
The same day.
Forever.
No Saturday.
No demolition.
No consequences.
No growing old.
No change.
The entire town would become a perfect preserved memory of 1987.
The arcade isn't predicting the future.
It is remembering a future that hasn't happened yet.
3. THE PLAYER'S OBJECTIVE
Jack must discover:

1. Why the arcade machines are showing tomorrow.
2. Who built the machine behind the arcade.
3. Why Jack appears in tomorrow's photograph.
4. Why everyone in town seems strangely determined to make sure tonight goes exactly as planned.
5. How to stop the arcade from recording tomorrow.

The ultimate objective is:
BREAK THE LOOP.
4. MAIN CHARACTERS
JACK MERCER
The player character.
Dialogue style:
Dry, sarcastic and occasionally self-aware.
Example:
PLAYER: Examine vending machine.
JACK:
"Twenty pence for a chocolate bar. Fifteen pence for the privilege of watching someone else eat it."
MARGARET "MAGGIE" VALE

19. 

Works at the arcade.
Smart, practical and unimpressed by Jack.
She is the closest thing the game has to a normal person.
She knows more about the arcade than she admits.
She and Jack have known each other since school.
She is not a romantic reward.
She is a proper character.
She can:

* help
* lie
* become annoyed
* solve problems independently
* change the ending

ARTHUR BELL

57. 

Owner of Starlight Arcade.
Huge moustache.
Permanent cardigan.
Claims every machine is "perfectly legitimate".
Has absolutely no idea what modern technology is.
Dialogue:
"Computers are a fad, son. Give it five years and we'll all be back to using pencils."
Arthur is suspiciously protective of one particular machine.
DEREK PIPER

32. 

Local TV repairman.
Conspiracy theorist.
Owns:
PIPER'S TELEVISION EMPORIUM
He believes television signals can read your thoughts.
Unfortunately, he is occasionally correct.
Derek speaks in increasingly complicated explanations that become less convincing the longer he talks.
BRENDA HOLT

46. 

Runs the amusement park kiosk.
Aggressive.
Knows everything happening in town.
She refuses to give information unless Jack buys something.
She has approximately 700 unnecessary rules.
KEVIN

16. 

Arcade kid.
Has spent approximately £14,000 of his parents' money on arcade machines.
Claims to have the highest score in every machine.
He is lying.
He becomes an important source of information.
THE MAN IN THE PHOTOGRAPH
Unknown.
Appears repeatedly in glimpses.
Always wearing:

* white shirt
* dark trousers
* black tie

His face is never initially visible.
The player assumes he is the villain.
He isn't.
5. THE SETTING
The entire game takes place over one night.
Time:
7:00 PM → 12:00 AM
Locations:

1. Starlight Arcade
2. Arcade Basement
3. Seafront
4. Pier
5. Fish & Chip Shop
6. Video Rental Store
7. TV Repair Shop
8. Bus Station
9. Telephone Box
10. Amusement Park
11. Haunted House
12. Pier Café
13. Town Hall
14. Police Station
15. Clock Tower
16. Lighthouse
17. Abandoned Cinema
18. Back Alley
19. Arcade Roof
20. Underground Machine Room

6. VISUAL STYLE
Everything should look like a lovingly recreated 1987 computer adventure.
Resolution:
320 × 200 logical pixels
Scale to fit modern screens.
Pixel art.
Limited palette.
CRT scanline effect.
Slight chromatic aberration.
Occasional screen flicker.
The UI should look like an old adventure game.
Bottom section:
LOOK | TAKE | USE | TALK | PUSH | PULL | OPEN | CLOSE
Inventory displayed underneath or to the right depending on screen size.
Text should appear character-by-character.
Allow SPACE to instantly finish the current sentence.
7. GAME STRUCTURE
The game has six acts.
ACT I
The Last Night
ACT II
The Impossible Photograph
ACT III
Tomorrow's Memories
ACT IV
The Machine Beneath the Arcade
ACT V
The Day That Must Not Happen
ACT VI
One More Credit
ACT I
THE LAST NIGHT
SCENE 1
STARLIGHT ARCADE
Time:
7:00 PM.
The arcade is open.
Machines everywhere.
Music.
Flashing lights.
Children screaming.
Coin sounds.
Jack enters from the left.
Arthur is behind the counter.
Opening dialogue
ARTHUR:
"You're late."
JACK:
"It's seven o'clock."
ARTHUR:
"Exactly."
JACK:
"I've arrived at the correct time."
ARTHUR:
"That's the problem with young people."
JACK:
"Being punctual?"
ARTHUR:
"Thinking clocks are correct."
Arthur gives Jack a toolbox.
ARTHUR:
"Close up at eleven."
JACK:
"Why me?"
ARTHUR:
"Because you're the only person I trust."
Beat.
ARTHUR:
"And because Maggie refuses to do it."
Maggie shouts from across the arcade.
MAGGIE:
"I CAN HEAR YOU."
ARTHUR:
"See?"
FIRST PUZZLE
Jack needs to obtain the arcade key.
Arthur refuses to give it to him because Jack still owes him £2.40 from a previous mistake.
The player must find £2.40.
Possible solutions:

* return a loose coin found inside an arcade machine
* win a small amount from the coin pusher
* convince Kevin to lend him money
* find change behind the cigarette machine

The easiest intended solution:
COIN PUSHER
The player discovers a coin lodged behind the mechanism.
Take:
20p COIN
Jack:
"Twenty pence. Only £2.20 to go before I'm financially responsible."
SCENE 2
THE ARCADE FLOOR
Important machines:
SPACE WARS
GALACTIC RAIDERS
MONSTER MANOR
TURBO RACER
ONE MORE CREDIT
The last machine looks old.
No manufacturer.
No instructions.
Just a red button:
CREDIT
PUZZLE
Jack must access the back of the machines.
He needs a screwdriver.
The screwdriver is in Arthur's office.
Office locked.
Key is hanging on a hook.
Hook is behind a poster.
Player must:

1. Examine poster.
2. Move poster.
3. Take key.
4. Open office.
5. Take screwdriver.

ARTHUR'S OFFICE
Items:

* rotary telephone
* filing cabinet
* safe
* calculator
* cigarette tin
* framed photograph
* key hook
* television

The photograph shows Arthur standing outside the arcade in 1974.
There is another man beside him.
The photograph is scratched across the man's face.
Jack:
"Someone really didn't like this bloke."
SCENE 3
THE FIRST STRANGE EVENT
At approximately 8:15 PM, all arcade machines briefly flicker.
One machine displays:
TOMORROW
09:43
PIER
RED COAT
Then returns to normal.
Jack:
"Either this machine has developed a personality..."
Pause.
"...or I've finally lost mine."
The player can now investigate.
ACT II
THE IMPOSSIBLE PHOTOGRAPH
SCENE 4
SEAFRONT
Jack leaves the arcade.
The seafront is windy.
A newspaper blows past.
Headline:
ARCADE TO BE DEMOLISHED TOMORROW
Underneath:
"Final day for Starlight Arcade."
Jack:
"That's reassuring."
The player can explore:

* pier
* chip shop
* amusement park
* arcade
* bus station
* phone box

SCENE 5
THE PIER
At the end of the pier is an old photographic booth.
Inside:
A photograph.
It shows the arcade.
Timestamp:
SATURDAY 19 SEPTEMBER 1987
Jack:
"Tomorrow."
He examines the photograph.
There is Jack in the doorway.
Jack:
"That's me."
Pause.
"I should probably be more concerned."
THE RED COAT
The machine predicted:
RED COAT.
A woman wearing a red coat walks past.
Jack follows her.
She enters:
THE ABANDONED CINEMA.
SCENE 6
ABANDONED CINEMA
The cinema has been closed for years.
Inside:
Old seats.
Projector.
Film reels.
Dust.
The woman has disappeared.
Jack discovers a reel labelled:
SATURDAY
He plays it.
The film shows tomorrow.
It shows the town.
People walking.
Cars.
The arcade being demolished.
Then the film abruptly stops.
A voice comes from the projector.
"You shouldn't have seen this."
Jack:
"I get that a lot."
PUZZLE
The projector is missing a fuse.
Fuse is found in the projection room.
But the door is jammed.
Player needs to use:

* butter from chip shop
* screwdriver
* coat hanger

to release the mechanism.
SCENE 7
PIPER'S TELEVISION EMPORIUM
Derek examines the film.
DEREK:
"That's impossible."
JACK:
"Good."
DEREK:
"No, I mean physically impossible."
JACK:
"Even better."
Derek explains:
The film isn't showing tomorrow.
It is showing a recording of tomorrow.
Which means somebody already recorded it.
DIALOGUE TREE
Player can ask:
"Who made it?"
Derek:
"Someone who knows how the signal works."
"What signal?"
"Television."
"Television doesn't record the future."
"Correct."
"So?"
Derek pauses.
"Someone is recording the wrong direction."
ACT III
TOMORROW'S MEMORIES
The player now discovers that several arcade machines contain future events.
Each machine reveals a different clue.
MACHINE 1
TURBO RACER
Shows:
10:32 PM
CLOCK TOWER
Someone drops a brass key.
Jack must go to the clock tower.
MACHINE 2
MONSTER MANOR
Shows:
11:05 PM
LIGHTHOUSE
Maggie is standing outside.
She says:
"Don't trust Arthur."
This causes Jack to become suspicious.
MACHINE 3
GALACTIC RAIDERS
Shows:
11:47 PM
ARCADE
Arthur is standing beside the mysterious machine.
He says:
"It has to happen."
CLOCK TOWER
Jack finds the brass key.
It opens a small maintenance panel.
Inside:
A cassette tape.
Label:
JACK
Jack:
"Well that's not ominous at all."
THE CASSETTE
Jack plays it.
It contains his own voice.
Recorded tomorrow.
"If you're hearing this, don't switch off the machine."
Jack:
"Why?"
His recorded voice:
"Because that's what I did."
Tape ends.
ACT IV
THE MACHINE BENEATH THE ARCADE
Jack returns to Starlight.
Maggie is waiting.
SCENE 8
MAGGIE'S CONFESSION
MAGGIE:
"You found the tape."
JACK:
"You knew?"
MAGGIE:
"Yes."
JACK:
"How long?"
MAGGIE:
"Since Tuesday."
JACK:
"It's Friday."
MAGGIE:
"I've had a busy week."
She explains that Arthur discovered the machine years ago.
It was originally built as an experimental arcade cabinet.
It could record memories.
But eventually it started recording things that hadn't happened yet.
Arthur became obsessed.
He believed the machine could preserve Brighton Vale forever.
THE TWIST
Arthur isn't trying to destroy the town.
He's trying to save it.
The government has approved the redevelopment.
The arcade will disappear.
Arthur believes the future will destroy everything good about the town.
So he intends to create a perfect recording of it.
The machine will overwrite tomorrow with yesterday.
ACT V
THE DAY THAT MUST NOT HAPPEN
Jack and Maggie enter the basement.
There is a huge machine.
It looks like:

* arcade cabinet
* television equipment
* reel-to-reel recorder
* telephone exchange
* computer

combined into one ridiculous device.
Label:
MEMORY MASTER 3000
Jack:
"That's either incredibly advanced..."
Pause.
"...or made by someone who owns a soldering iron."
MACHINE ROOM PUZZLE
The machine requires three things:
POWER
SIGNAL
MEMORY
Power comes from the arcade.
Signal comes from the television tower.
Memory comes from the photographic booth.
The player must connect all three.
POWER PUZZLE
The arcade fuse box is labelled incorrectly.
Correct arrangement is discovered through the labels on the arcade machines.
SIGNAL PUZZLE
Derek provides a television antenna.
But it is too large.
Jack cuts it using bolt cutters.
Derek:
"That was a very expensive antenna."
Jack:
"It wasn't yours."
Derek:
"Exactly."
MEMORY PUZZLE
The photographic booth contains a reel.
It must be inserted into the Memory Master.
But the reel contains the wrong day.
The player must discover that the correct reel is hidden inside Arthur's office safe.
THE SAFE
Combination is not a number.
It is:
1974
The year Arthur opened the arcade.
The player discovers this from the framed photograph.
Inside:
A small cassette.
ARTHUR'S CONFESSION
Arthur explains:
He built the original machine with the mysterious man in the photograph.
The mysterious man was:
DR. ELLIOT VALE
Maggie's father.
He disappeared in 1974.
Maggie has spent her life believing he abandoned her.
He didn't.
He became trapped inside the machine.
ACT VI
ONE MORE CREDIT
The machine activates.
The arcade begins changing.
The player sees multiple versions of the town.

1987. 
1988. 
1989. 
1990. 
1991. 

The machine is trying to choose which version becomes permanent.
Arthur appears.
FINAL CONFRONTATION
Arthur:
"You don't understand."
Jack:
"I understand perfectly."
Arthur:
"Do you?"
Jack:
"No."
Beat.
"But I usually sound convincing."
Arthur explains:
The machine needs one final memory.
A memory of the person operating it.
Jack realises the reason he appeared in the photograph.
He is the final memory.
The machine has been manipulating events to ensure Jack would be present.
FINAL PUZZLE
The player has three choices.
OPTION A
Destroy the machine.
OPTION B
Preserve 1987.
OPTION C
Record something new.
The intended solution is C.
Jack places a cassette into the machine.
Instead of recording the town as it is, he records everyone together.
Arthur.
Maggie.
Derek.
Kevin.
Brenda.
Jack.
The arcade machines.
The seafront.
The town.
He presses:
RECORD
The machine overloads.
Everything goes white.
ENDING
Morning.
Saturday.
Jack wakes up on the arcade floor.
The building is still standing.
Demolition has been cancelled because a planning error was discovered.
Arthur walks in.
ARTHUR:
"Morning."
JACK:
"What happened?"
ARTHUR:
"Nothing."
JACK:
"Nothing?"
ARTHUR:
"Nothing unusual."
Jack looks at the arcade machine.
It is switched off.
He walks past it.
The machine suddenly displays:
CREDIT 1
Jack stops.
He smiles.
He inserts a coin.
Screen:
THANK YOU, JACK.
Jack:
"Oh, come on."
CUT TO BLACK.
8. ALTERNATIVE ENDINGS
BAD ENDING 1
DESTROY THE MACHINE
Jack smashes the machine.
Everything returns to normal.
But the next morning the arcade is demolished.
Final shot:
A bulldozer.
Jack:
"Well, technically I solved the problem."
BAD ENDING 2
PRESERVE 1987
Jack chooses to keep the machine running.
The screen goes black.
Then:
FRIDAY 18 SEPTEMBER 1987
The game starts again.
But certain dialogue changes.
The player now knows what is happening.
SECRET ENDING
If the player has collected every hidden cassette:
Jack can insert all of them into the machine.
The machine reveals that Dr Vale wasn't trapped accidentally.
He chose to stay.
He had discovered that the machine could preserve people's memories.
He sacrificed himself so Maggie would never lose her father completely.
The final scene shows Maggie listening to a cassette of her father.
No joke.
No punchline.
Just silence.
Then Jack says:
"You alright?"
Maggie:
"No."
Jack:
"Fair enough."
Fade out.
9. INVENTORY
The player can collect:

* screwdriver
* arcade key
* 20p coin
* cigarette lighter
* coat hanger
* butter
* cassette
* projector fuse
* brass key
* television antenna
* bolt cutters
* photograph
* film reel
* arcade token
* toolbox
* electrical cable
* chewing gum
* chocolate bar
* newspaper
* screwdriver extension
* cassette recorder
* Memory Master cartridge

Some items are deliberately ridiculous.
10. INVENTORY COMEDY
Trying to use unrelated objects should generate bespoke responses.
USE CHOCOLATE BAR WITH TELEPHONE
Jack:
"I don't think BT accepts confectionery."
USE BUTTER WITH ARCADE MACHINE
Jack:
"I'm not fixing a machine with toast."
USE SCREWDRIVER WITH MAGGIE
Jack:
"I'm not even going to ask why you suggested that."
USE COAT HANGER WITH TELEPHONE BOX
Jack:
"I feel like I'm about to commit a very British crime."
USE COIN WITH MAGGIE
Jack:
"She's not a vending machine."
GIVE CHOCOLATE TO KEVIN
Kevin:
"Is this some kind of trick?"
Jack:
"Yes."
Kevin:
"Cool."
Kevin accepts it.
11. HUMOUR SYSTEM
The game should never become completely silly.
Use a mixture of:
60% dry British comedy
20% absurdity
15% nostalgia
5% genuinely strange/scary moments
The game should occasionally become quiet.
The mystery should feel real.
The player should actually care about Maggie and Arthur.
12. NPC DIALOGUE SYSTEM
Every important NPC should have multiple dialogue states.
For example Maggie:
FIRST MEETING
"You're still working here?"
AFTER FIRST CLUE
"Jack, I need you to stop asking questions."
AFTER DISCOVERING THE MACHINE
"I was hoping you'd never find that."
AFTER LEARNING ABOUT HER FATHER
"I spent thirteen years thinking he left."
FINAL SCENE
"Maybe some things shouldn't be forgotten."
13. OPTIONAL ARCADE GAMES
The player can interact with arcade machines.
Each machine can contain a tiny playable minigame.
TURBO RACER
Avoid cars.
SPACE WARS
Shoot asteroids.
MONSTER MANOR
Maze.
ONE MORE CREDIT
A deliberately strange game.
The score affects hidden dialogue.
If the player gets a high score, Kevin says:
"No."
Jack:
"What?"
Kevin:
"That's not possible."
Jack:
"I just did it."
Kevin:
"Exactly."
14. THE ONE MORE CREDIT MACHINE
This is the most important object in the game.
Initially:
LOOK
Jack:
"No manufacturer's label. No instructions. No visible coin slot."
Later:
LOOK
Jack:
"The screen is showing static."
Later:
USE COIN
The machine says:
CREDIT 1
Jack:
"That's normally where the fun begins."
Screen:
INSERT MEMORY.
Jack:
"Oh."
15. VISUAL STORYTELLING
Don't explain everything through dialogue.
Use the environment.
Examples:
Arthur's office contains:

* old photographs
* invoices
* a missing-person poster
* an old circuit diagram
* Maggie as a child
* Dr Vale in the background

The player may not understand these immediately.
On a second playthrough, they make sense.
16. HIDDEN DETAILS
There should be approximately 50 optional jokes.
Examples:
RUBBER DUCK
Jack:
"Someone has been watching too many detective films."
DEAD FLY
Jack:
"Dead."
SECOND DEAD FLY
Jack:
"Also dead."
THIRD DEAD FLY
Jack:
"This is becoming statistically significant."
17. PHONE BOX
Calling random numbers produces jokes.
999
Jack:
"I'm not calling the emergency services because an arcade machine looked at me funny."
ARCADE
Phone rings inside arcade.
Jack:
"That's unsettling."
JACK'S OWN NUMBER
Phone rings.
Jack answers.
His own voice:
"Don't."
Jack hangs up.
18. NEWSPAPER PUZZLE
The newspaper contains:

* demolition notice
* weather report
* football results
* TV listings
* crossword

The crossword provides a clue.
The answer:
VALE
This is the first subtle clue to Maggie's father.
19. TV LISTINGS
The television listings should be period-authentic in appearance.
Programs include fictional equivalents of:

* detective dramas
* sitcoms
* children's television
* game shows
* late-night films

One listing contains:
23:30 — THE MAN WHO REMEMBERED TOMORROW
This does not exist in the real world.
Jack:
"I've never heard of that."
Derek:
"You will."
20. CLOCK MECHANIC
The clock tower is deliberately wrong.
It is always:
11:17
The player eventually discovers that every clock connected to the machine is frozen at 11:17.
This is the moment Dr Vale disappeared.
21. MUSIC
Music should be original but evoke 1980s electronic adventure games.
Main theme:

* analogue synth
* gated drum machine
* bassline
* simple melody
* slightly cheesy

Arcade theme:
Fast electronic music.
Mystery theme:
Slow analogue pad.
Machine room:
Low-frequency hum with pulsing synth.
Final scene:
Piano and analogue pad.
22. SOUND EFFECTS
Use exaggerated 1980s sounds:

* coin insert
* CRT static
* cassette click
* telephone ring
* arcade buttons
* relay clicks
* fluorescent hum
* electrical buzz
* projector
* tape rewind
* distant seagulls
* rain
* footsteps

The sound design should carry nostalgia.
23. SAVE SYSTEM
Save anywhere.
Save slots:
1
2
3
4
5
Also:
AUTO SAVE
At the beginning of each act.
Use localStorage.
24. PLAYER CONTROLS
Mouse:
Left click:
Interact.
Right click:
Examine.
Keyboard:
Arrow keys:
Move cursor.
Enter:
Select.
Escape:
Inventory.
Space:
Skip dialogue animation.
F5:
Save.
F9:
Load.
25. GAMEPLAY LOOP
The core loop should always be:
Explore
↓
Examine
↓
Discover strange clue
↓
Talk to NPC
↓
Acquire object
↓
Combine/use object
↓
Unlock new location
↓
Discover another piece of the mystery
↓
Return to previous location
↓
Notice something has changed
This should create the feeling that the entire town is interconnected.
26. IMPORTANT DESIGN RULE
Do NOT make puzzles depend on completely arbitrary adventure-game logic.
Every puzzle should have a clue somewhere.
If the player needs butter:
Someone should mention grease.
If the player needs the antenna:
Derek should mention needing one.
If the player needs 1974:
The photograph should show 1974.
The game can be funny and strange.
It should not be frustrating.
27. HINT SYSTEM
If the player is stuck for five minutes:
Jack says:
"I'm fairly sure I'm missing something."
After another five minutes:
"Perhaps I should look around."
After another five:
"There is absolutely no shame in using the hint system."
Hint levels:
HINT 1
General direction.
HINT 2
Specific object.
HINT 3
Exact solution.
28. SCORING
Classic adventure-game score.
Maximum:
1000 POINTS
Examples:
+10 finding screwdriver
+20 finding cassette
+25 discovering future photograph
+50 entering machine room
+100 discovering Dr Vale
+200 completing machine
+300 secret ending
Optional jokes:
+1 each.
Display:
SCORE: 427 / 1000
At the end:
0-199
"Did you actually play the game?"
200-399
"Technically an adventure."
400-599
"Respectable."
600-799
"Very impressive."
800-999
"Almost everything."
1000
"Okay. You have officially ruined 1987."
29. DEATHS
Deaths should be funny and reversible.
Example:
USE ELECTRICAL CABLE WITH BATHTUB
Jack:
"This seems like an excellent opportunity to rethink my life choices."
Screen:
JACK HAS MADE A POOR DECISION.
Reload.
No permanent punishment.
30. GAME OPENING
The opening should begin with a black screen.
Text:
BRIGHTON VALE
FRIDAY
18 SEPTEMBER 1987
19:03
Synth music begins.
Slowly reveal the arcade.
Lights flickering.
Seagulls outside.
A coin drops.
Then:
ONE MORE CREDIT
Title appears.
31. FINAL SCREEN
After the ending:
Black screen.
Text:
THANK YOU FOR PLAYING.
Then:
SOME MEMORIES ARE BETTER LEFT UNCHANGED.
Pause.
The screen flickers.
One final line appears:
CREDIT 1
Then the game returns to the title screen.
But the title screen is subtly different.
The player character is now visible in the background.
32. IMPLEMENTATION ARCHITECTURE FOR CLAUDE
Build the game using a data-driven architecture.
Do not hard-code every interaction into individual React components.
Use:

```text
/game
  /scenes
  /characters
  /items
  /dialogue
  /puzzles
  /audio
  /sprites
  /ui
  /engine
  /save

```

Create a central game state:

```typescript
interface GameState {
  currentScene: string;
  inventory: string[];
  flags: Record<string, boolean>;
  score: number;
  time: number;
  dialogueState: Record<string, number>;
}

```

Every puzzle should modify flags.
Example:

```typescript
flags.arcadeKeyFound
flags.officeUnlocked
flags.futurePhotoFound
flags.clockTowerKeyFound
flags.machineRoomEntered
flags.drValeDiscovered
flags.machineActivated
flags.secretEndingUnlocked

```

33. SCENE DATA
Scenes should be represented as data.
Example:

```typescript
interface Scene {
  id: string;
  background: string;
  exits: Exit[];
  hotspots: Hotspot[];
  characters: Character[];
  music: string;
}

```

Hotspots:

```typescript
interface Hotspot {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  examineText: string;
  actions: Action[];
}

```

34. DIALOGUE SYSTEM
Dialogue should be data-driven.
Example:

```typescript
{
  id: "maggie_machine",
  character: "maggie",
  lines: [
    {
      speaker: "Maggie",
      text: "You found it."
    },
    {
      speaker: "Jack",
      text: "Found what?"
    }
  ]
}

```

Dialogue choices should optionally set flags.
35. PUZZLE SYSTEM
Each puzzle should have:

```typescript
interface Puzzle {
  id: string;
  requirements: string[];
  solution: string[];
  reward?: string;
  setFlags?: string[];
  score?: number;
}

```

Do not allow impossible states.
If the player can permanently lose an item required later, automatically restore it or prevent the action.
36. ART DIRECTION
Generate backgrounds as 320x200 pixel-art scenes.
Required backgrounds:

1. Arcade exterior
2. Arcade main floor
3. Arcade office
4. Arcade basement
5. Arcade machine room
6. Seafront
7. Pier
8. Pier café
9. Fish & chip shop
10. Video rental shop
11. TV repair shop
12. Bus station
13. Telephone box
14. Amusement park
15. Haunted house
16. Cinema exterior
17. Cinema lobby
18. Cinema projection room
19. Clock tower exterior
20. Clock tower interior
21. Lighthouse
22. Lighthouse interior
23. Town hall
24. Police station
25. Back alley
26. Arcade roof

37. CHARACTER SPRITES
Jack:

* idle
* talking
* surprised
* annoyed
* happy
* frightened

Maggie:

* idle
* talking
* angry
* worried
* smiling

Arthur:

* idle
* talking
* angry
* confused

Derek:

* idle
* talking
* excited
* terrified

Kevin:

* idle
* talking
* smug
* shocked

Brenda:

* idle
* talking
* angry

Dr Vale:

* silhouette
* normal
* distorted

38. UI
Bottom interface:

```text
LOOK   TAKE   USE   TALK   PUSH   PULL   OPEN   CLOSE

```

Inventory:

```text
[SCREWDRIVER] [CASSETTE] [20p] [BUTTER]

```

When hovering over an object:
EXAMINE ARCADE MACHINE
Use pixel font.
Avoid modern-looking menus.
No gradients.
No glossy buttons.
No modern icons.
Everything should look like it belongs on a 1987 CRT.
39. QUALITY BAR
The game should feel like:
"Someone found an incredibly good lost 1987 adventure game in a box of floppy disks."
Not:
"A modern game pretending to be retro."
That distinction is important.
The writing should be sharp enough that the player wants to click on everything simply to hear Jack's response.
40. CLAUDE BUILD INSTRUCTION
Build this as a complete playable game.
Do not create a prototype with placeholder buttons.
Implement:

* complete navigation
* all scenes
* inventory
* dialogue
* puzzles
* scoring
* save/load
* hint system
* multiple endings
* arcade minigames
* sound hooks
* music hooks
* pixel-art-compatible scene system
* keyboard controls
* mouse controls
* responsive 4:3 presentation
* title screen
* credits
* restart
* save slots

Where original artwork is unavailable, create simple pixel-art placeholders programmatically that preserve the correct composition and lighting.
Every important object should have an interaction.
Every major puzzle should have a logical clue.
The player should be able to complete the game without a walkthrough.
Do not use copyrighted characters, artwork, dialogue, music or assets.
The game should be completely original.
41. DEVELOPMENT ORDER
Claude should build in this order.
PHASE 1
Create the game engine.
Implement:

* scenes
* player navigation
* hotspots
* inventory
* dialogue
* flags
* save/load

PHASE 2
Build Starlight Arcade.
Implement the opening 30 minutes.
PHASE 3
Build the town.
Implement all locations and transitions.
PHASE 4
Implement the mystery.
Add:

* future photographs
* cassette tapes
* arcade predictions
* clock mechanism
* Memory Master

PHASE 5
Implement all puzzles.
PHASE 6
Implement endings.
PHASE 7
Add audio.
PHASE 8
Add pixel-art treatment.
PHASE 9
Playtest every possible inventory combination.
PHASE 10
Add polish.
42. IMPORTANT CLAUDE INSTRUCTION
Do not try to build the entire game in one enormous generated file.
Create clean modules.
After each major phase:

1. Run the application.
2. Check for TypeScript errors.
3. Check navigation.
4. Test save/load.
5. Test puzzle flags.
6. Test restarting.
7. Fix errors before proceeding.

Never leave broken imports.
Never create fake functionality represented only by buttons.
If a feature is visible in the UI, it must actually work.
43. THE DESIGN PHILOSOPHY
The player should constantly think:
"That's weird."
Then:
"Hang on..."
Then:
"OH."
The best moments should come from realising that something seen 45 minutes earlier was actually important.
For example:
At the beginning:
Jack sees a photograph of Arthur and a mysterious man.
Much later:
The player discovers the man is Dr Vale.
Much later:
The player discovers the man was Maggie's father.
Much later:
The player discovers Jack's own photograph was taken by Dr Vale.
And finally:
The player realises the entire adventure was engineered so Jack would create the final memory.
The ending should therefore make the opening scene mean something completely different.
44. THE CORE IDEA
The entire game is ultimately about one question:
If you could preserve one perfect day forever, would you?
Arthur says yes.
Maggie says no.
Jack initially doesn't care.
By the end, Jack understands that memories only matter because they are memories.
If you freeze everything, eventually the memory becomes the prison.
That is why the correct solution isn't:
Destroy the past.
And it isn't:
Preserve the past.
It is:
Record something new.
45. FINAL CLAUDE PROMPT
Use the following as the actual instruction to Claude after providing this specification:
You are the lead developer, game designer, writer and technical director for this project.
Build the complete playable browser game described in this specification.
Treat the specification as the source of truth.
Do not simplify the story into a prototype.
Do not replace puzzles with placeholder buttons.
Do not remove the multiple endings.
Do not make the player character automatically solve puzzles.
Implement a genuine point-and-click adventure system with inventory, examination, dialogue, flags, puzzles, exploration and progression.
Keep the writing dry, British, funny and occasionally unsettling.
The game must feel like an authentic lost 1987 adventure game while remaining completely original.
Build incrementally and test after each phase.
If an asset is unavailable, create a technically valid placeholder rather than breaking the game.
Do not use copyrighted characters, artwork, music, dialogue or other protected assets.
The final result must be playable from beginning to end.
Start by creating the project architecture and the playable opening scene inside Starlight Arcade.
Once that works, continue through the complete game without waiting for additional instructions unless a genuine technical blocker prevents progress.

---

# Part two — sections 46–56

# ONE MORE CREDIT
## Expanded 1980s Point-and-Click Adventure Game Specification

### New: Cheeky 1980s Adult Comedy Scenes

All characters in these scenes are adults. The scenes are non-graphic, suggestive, and played primarily for comedy.

---

## 46. THE SEASIDE HOTEL

Jack visits the fictional **Golden Sands Hotel** while looking for Maggie.

The receptionist, **Valerie Price**, 28, is glamorous, sarcastic and completely unimpressed by Jack.

### Scene: Reception

**JACK:**  
"I'm looking for Maggie Vale."

**VALERIE:**  
"Room 12."

**JACK:**  
"Is she expecting me?"

**VALERIE:**  
"Probably not."

**JACK:**  
"That sounds ominous."

**VALERIE:**  
"With Maggie, it's usually accurate."

Jack takes the key.

---

## 47. ROOM 12

The room is empty.

There is a bathroom with a frosted-glass door.

Jack hears the shower.

**JACK:**  
"Maggie?"

No answer.

He waits.

The door suddenly opens and an adult male hotel guest, **wearing only a towel**, walks out.

Jack freezes.

**GUEST:**  
"Sorry."

**JACK:**  
"Entirely my fault."

The guest walks away.

Jack looks at the camera.

**JACK:**  
"I've learned something today."

Pause.

**JACK:**  
"I don't know what, but I've learned something."

This is purely a visual comedy gag.

---

## 48. THE CHANGING CABIN

At the seafront swimming pool, Jack needs to retrieve an item from a changing cabin.

The player can open the wrong curtain.

Inside is an adult woman changing clothes.

The scene immediately cuts to Jack outside.

**JACK:**  
"That was not the correct cabin."

The player receives:

**SCORE +1**

The correct cabin is next door.

---

## 49. THE NUDIST BEACH

An optional location is unlocked after finding an old postcard.

The beach contains several adult NPCs sunbathing nude, depicted in deliberately crude pixel art with bodies partially obscured by beach umbrellas, towels, deckchairs and foreground objects.

There is no sexual activity.

Jack can examine the scene.

**JACK:**  
"Well."

Pause.

**JACK:**  
"That's one way to spend a Saturday."

Examine beach umbrella:

**JACK:**  
"Strategically positioned."

Examine towel:

**JACK:**  
"Also strategically positioned."

Examine naked adult NPC:

**JACK:**  
"I'm beginning to understand the importance of towels."

---

## 50. THE VIDEO SHOP

The back section of the video rental shop contains a fictional adults-only shelf.

The films are deliberately ridiculous 1980s parody titles:

- NIGHT OF THE NAKED ROBOTS
- THE SECRET LIFE OF MRS. ROBINSON'S NEIGHBOUR
- TOPLESS FROM OUTER SPACE
- THE FULL MONTY WASN'T INVENTED YET
- LOVE IN THE TIME OF VHS

Jack examines the shelf.

**JACK:**  
"Cinema was a simpler place before streaming."

The shop owner, **Graham**, 34, appears.

**GRAHAM:**  
"Looking for something?"

**JACK:**  
"Something educational."

**GRAHAM:**  
"Of course."

**JACK:**  
"About... engineering."

**GRAHAM:**  
"Naturally."

---

## 51. THE PIN-UP CALENDAR

Inside Graham's office is a deliberately tacky 1987 pin-up calendar featuring an adult model.

The calendar is useful to a puzzle.

The important clue is the sequence of numbers printed beside the months.

Jack:

**JACK:**  
"Finally. Something useful in a calendar."

Examine calendar:

**JACK:**  
"I can't believe I'm solving a mystery with this."

---

## 52. THE BEDROOM PUZZLE

Later, Jack enters a guest bedroom while looking for a cassette.

There are two adults who clearly expected privacy.

Jack opens the door.

Immediate cut to hallway.

**JACK:**  
"Wrong room."

Door closes.

From inside:

**VOICE:**  
"Very."

Jack:

**JACK:**  
"Fair enough."

No sexual activity is shown.

---

## 53. THE FINAL CHEEKY GAG

Near the end of the game, Jack enters the abandoned cinema projection room.

There is an old poster depicting a glamorous adult woman in a deliberately exaggerated 1980s swimsuit pose.

Jack examines it.

**JACK:**  
"They really don't make posters like this anymore."

He looks at the camera.

**JACK:**  
"Probably for the best."

He then notices the poster is hiding a loose brick.

Behind the brick is the final cassette.

This makes the joke part of the actual puzzle rather than simply decoration.

---

## 54. TONE RULES FOR THE ADULT HUMOUR

Keep the scenes:

- cheeky
- ridiculous
- British
- self-aware
- visually suggestive but non-graphic
- optional where possible

Do not make sex the central objective of the game.

The protagonist should frequently react with embarrassment rather than treating every woman as a reward.

The adult comedy should feel like an exaggerated lost 1980s adventure game rather than modern explicit pornography.

---

## 55. ADDITIONAL OPTIONAL SCORE

Add:

### CHEEKY MOMENTS FOUND

0 / 12

Each optional gag gives +1 point.

The final score screen can say:

**0–3:**  
"You behaved yourself."

**4–7:**  
"Questionable."

**8–11:**  
"You investigated thoroughly."

**12:**  
"You really clicked everything, didn't you?"

---

## 56. IMPLEMENTATION NOTE

All adult visual gags should be represented with deliberately low-resolution pixel art.

Use:

- silhouettes
- towels
- umbrellas
- furniture
- foreground objects
- frosted glass
- strategic framing

to keep the visuals humorous rather than explicit.

No sexual activity needs to be animated.

The scenes should work even if the player never visits them.

---

# FINAL BUILD INSTRUCTION

Integrate sections 46–56 into the existing ONE MORE CREDIT game specification.

Keep the original six-act mystery intact.

The additional scenes should provide optional comedy, extra exploration, small puzzle clues and period atmosphere without changing the main story.

Build the resulting game as a complete browser-based point-and-click adventure.
