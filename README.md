# Dodgeball Roll20 API Script

## Overview

This Roll20 API script implements special **throw and catch rules** for a dodgeball-style mini-game inside D\&D 5e (or any Roll20 game). It calculates **Athletics rolls, target AC, distance penalties, size modifiers, and adjacency bonuses** automatically.

Players only need to press a **Throw** or **Pass** button, select a target, and the script resolves the result.

---

## Features

* **Automatic Throw/Pass resolution**

  * Roll `1d20 + Athletics` for the thrower.
  * Compare against an AC built from the receiver’s Athletics, size, distance, and adjacency.
* **Distance calculation**

  * Matches Roll20’s built-in ruler tool (supports Pythagorean, 3.5e diagonals, Manhattan, etc.).
* **Size modifiers** (based on token footprint)

  * Large/huge/gargantuan targets are easier to hit.
  * Small/tiny targets are harder to hit.
* **Adjacency modifiers**

  * +5 AC for each enemy adjacent (within 5 ft) to the thrower or receiver.
* **Critical handling**

  * Natural 1 = fumble.
  * Natural 20 = perfect throw/pass.

---

## Installation

1. Open your Roll20 campaign as a GM.
2. Go to **Game Settings → API Scripts**.
3. Create a new script called **Dodgeball**.
4. Paste the contents of `dodgeball.js` into the editor.
5. Save the script.

---

## Macros (Global Token Actions)

To make this easy for players, create two macros:

### Throw

```text
!throw @{selected|token_id} @{target|token_id}
```

### Pass

```text
!pass @{selected|token_id} @{target|token_id}
```

* In the Collections tab, add each macro and check **Show as Token Action**.
* Share with **All Players**.
* When a player selects their token, they’ll see **Throw** and **Pass** buttons at the top of the screen.

---

## Rules Implemented

* **Base AC = 10**
* **Attack mode:** AC += target’s Athletics bonus
* **Pass mode:** AC -= receiver’s Athletics bonus
* **Distance penalty:** +2 AC per 5 ft beyond 30 ft
* **Target size:**

  * Large +2, Huge +4, Gargantuan +6 (easier)
  * Small –2, Tiny –4 (harder)
* **Adjacency bonus:** +5 AC per adjacent enemy (within 5 ft) to thrower or receiver
* **Criticals:**

  * Nat 1 = fumble at point of throw
  * Nat 20 = automatic success

---

## Example Output

```
Fighter THROWS at Ogre (30ft)
Roll: [14 + AttackerAth 5] = **19** vs AC **11**
(receiver Athletics +3, SizeMod +2, Adjacency +0)
Fighter hits Ogre — they’re OUT!
```

```
Orc PASSES to Halfling (20ft)
Roll: [9 + AttackerAth 2] = **11** vs AC **15**
(receiver Athletics -1, SizeMod -2, Adjacency +5)
Orc misses — Halfling is OUT!
```

---

## Notes & Customization

* The script pulls **Athletics** from the sheet attribute `athletics_bonus`.
* Target **size** is determined from the token footprint (scaled on the map).
* You can tweak modifiers in `getSizeModFromToken()` and `getAdjacencyBonus()` if you want different balance.
* For debugging, add `log()` lines or whisper output to the GM.
