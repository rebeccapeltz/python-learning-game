// LEVELS: each level is one gap Mario must cross by writing correct Python.
//
// Fields:
//   world     - flavor label shown in the HUD ("1-1")
//   title     - short challenge title
//   concept   - python concept badge text
//   prompt    - the challenge description shown to the player
//   starter   - starter code pre-filled in the editor
//   test      - python assertions run against the player's code.
//               Runs in the SAME namespace as the player's code, so it can
//               reference any variables/functions they defined. It can also
//               reference `__output__`, a string containing everything the
//               player's code printed to stdout.
//   hint      - shown after two failed attempts (or on demand)
//   scenery   - which decorative obstacle sits in the gap ('pit' | 'lava' | 'goomba')

const LEVELS = [
  {
    world: "1-1",
    title: "Say Hello",
    concept: "print()",
    prompt: "A Goomba blocks the path! Shout your battle cry with print(). " +
            "Print exactly: Hello, World!",
    starter: `# Print exactly: Hello, World!\n`,
    test: `
assert __output__.strip() == "Hello, World!", f"Expected 'Hello, World!' but got {__output__.strip()!r}"
`,
    hint: `Use print("Hello, World!") — capitalization and punctuation must match exactly.`,
    scenery: "goomba",
  },
  {
    world: "1-2",
    title: "Count Your Coins",
    concept: "variables",
    prompt: "You start with 10 coins and grab 25 more mid-air. " +
            "Create a variable named total equal to their sum.",
    starter: `# create a variable called total that equals 10 + 25\n`,
    test: `
assert 'total' in globals(), "You need to create a variable named total"
assert total == 35, f"total should be 35, got {total}"
`,
    hint: `total = 10 + 25`,
    scenery: "pit",
  },
  {
    world: "1-3",
    title: "Princess's Note",
    concept: "f-strings",
    prompt: "Princess Toadstool left a note! Using the variable name, build a " +
            "variable message that reads exactly: Jump, Mario!",
    starter: `name = "Mario"\n# create message using an f-string: "Jump, Mario!"\n`,
    test: `
assert 'message' in globals(), "Create a variable named message"
assert message == "Jump, Mario!", f"message should be 'Jump, Mario!', got {message!r}"
`,
    hint: `message = f"Jump, {name}!"`,
    scenery: "pit",
  },
  {
    world: "1-4",
    title: "Measure the Gap",
    concept: "if / else",
    prompt: "A pit is 6 blocks wide. Mario can only clear pits narrower than 8 " +
            "blocks. Given pit_width, set can_cross to True or False.",
    starter: `pit_width = 6\n# set can_cross to True if pit_width < 8, otherwise False\n`,
    test: `
assert 'can_cross' in globals(), "Create a variable named can_cross"
assert can_cross == True, f"can_cross should be True since pit_width=6 is less than 8, got {can_cross!r}"
`,
    hint: `if pit_width < 8:\n    can_cross = True\nelse:\n    can_cross = False`,
    scenery: "pit",
  },
  {
    world: "1-5",
    title: "Coin Row",
    concept: "for loop",
    prompt: "Collect every coin in the row! coins is a list of coin values. " +
            "Add them all up into total_coins using a for loop.",
    starter: `coins = [10, 10, 20, 50, 10]\ntotal_coins = 0\n# loop through coins and add each one to total_coins\n`,
    test: `
assert 'total_coins' in globals(), "Create a variable named total_coins"
assert total_coins == 100, f"total_coins should be 100, got {total_coins}"
`,
    hint: `for coin in coins:\n    total_coins += coin`,
    scenery: "pit",
  },
  {
    world: "1-6",
    title: "Stomp Streak",
    concept: "while loop",
    prompt: "Mario needs 100 points for a 1-Up. He earns 15 points per Goomba " +
            "stomp. Use a while loop to count the stomps needed in stomps.",
    starter: `points = 0\nstomps = 0\n# while points < 100: add 15 to points and 1 to stomps\n`,
    test: `
assert 'stomps' in globals(), "Create a variable named stomps"
assert points >= 100, "Keep looping until points reaches at least 100"
assert stomps == 7, f"stomps should be 7, got {stomps}"
`,
    hint: `while points < 100:\n    points += 15\n    stomps += 1`,
    scenery: "goomba",
  },
  {
    world: "1-7",
    title: "Power-Up Bag",
    concept: "lists",
    prompt: "Grab the Fire Flower! Append the string 'Fire Flower' to " +
            "inventory, then set first_item to the first element of inventory.",
    starter: `inventory = ["Mushroom", "Coin"]\n# append 'Fire Flower' to inventory\n# set first_item to the first element of inventory\n`,
    test: `
assert 'inventory' in globals(), "inventory should still exist"
assert inventory == ["Mushroom", "Coin", "Fire Flower"], f"inventory should be ['Mushroom', 'Coin', 'Fire Flower'], got {inventory}"
assert 'first_item' in globals(), "Create a variable named first_item"
assert first_item == "Mushroom", f"first_item should be 'Mushroom', got {first_item!r}"
`,
    hint: `inventory.append("Fire Flower")\nfirst_item = inventory[0]`,
    scenery: "lava",
  },
  {
    world: "1-8",
    title: "Bridge Physics",
    concept: "functions",
    prompt: "Define jump_height(speed) that returns speed * 2. Bowser's bridge " +
            "needs a jump of at least 20 — call jump_height(12) and store the " +
            "result in bridge_jump.",
    starter: `# define jump_height(speed) that returns speed * 2\n\n# call jump_height(12) and store the result in bridge_jump\n`,
    test: `
assert 'jump_height' in globals(), "Define a function named jump_height"
assert jump_height(5) == 10, "jump_height(5) should return 10"
assert jump_height(12) == 24, "jump_height(12) should return 24"
assert 'bridge_jump' in globals(), "Create a variable named bridge_jump"
assert bridge_jump == 24, f"bridge_jump should be 24, got {bridge_jump}"
`,
    hint: `def jump_height(speed):\n    return speed * 2\n\nbridge_jump = jump_height(12)`,
    scenery: "lava",
  },
  {
    world: "1-9",
    title: "Status Check",
    concept: "dictionaries",
    prompt: "Create a dictionary named mario with keys 'lives' (3), 'coins' " +
            "(50), and 'power' ('Fire'). Then set has_fire_power to True if " +
            "mario['power'] equals 'Fire'.",
    starter: `# create dictionary mario with keys lives, coins, power\n\n# set has_fire_power based on mario['power']\n`,
    test: `
assert 'mario' in globals(), "Create a dictionary named mario"
assert mario.get('lives') == 3, "mario['lives'] should be 3"
assert mario.get('coins') == 50, "mario['coins'] should be 50"
assert mario.get('power') == 'Fire', "mario['power'] should be 'Fire'"
assert 'has_fire_power' in globals(), "Create a variable named has_fire_power"
assert has_fire_power == True, f"has_fire_power should be True, got {has_fire_power!r}"
`,
    hint: `mario = {"lives": 3, "coins": 50, "power": "Fire"}\nhas_fire_power = mario["power"] == "Fire"`,
    scenery: "pit",
  },
  {
    world: "1-10",
    title: "Bowser's Castle",
    concept: "loops + conditionals",
    prompt: "Final battle! Bowser's army attack values are " +
            "enemies = [5, 12, 8, 20, 3, 15]. Count how many enemies have " +
            "attack greater than 10 and store it in strong_enemies.",
    starter: `enemies = [5, 12, 8, 20, 3, 15]\nstrong_enemies = 0\n# count how many enemies have attack greater than 10\n`,
    test: `
assert 'strong_enemies' in globals(), "Create a variable named strong_enemies"
assert strong_enemies == 3, f"strong_enemies should be 3, got {strong_enemies}"
`,
    hint: `for attack in enemies:\n    if attack > 10:\n        strong_enemies += 1`,
    scenery: "lava",
  },
];
