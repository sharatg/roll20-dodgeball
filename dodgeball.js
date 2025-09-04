// ===== Dodgeball Throw/Pass =====
// Macros (Token Actions):
// Throw: !throw @{selected|token_id} @{target|token_id}
// Pass : !pass  @{selected|token_id} @{target|token_id}

on('chat:message', (msg) => {
  if (msg.type !== 'api') return;
  const parts = msg.content.trim().split(/\s+/);
  const cmd = parts[0];
  if (cmd !== '!throw' && cmd !== '!pass') return;

  const mode = (cmd === '!throw') ? 'attack' : 'pass';

  // Expect: parts[1] = attacker token_id, parts[2] = target token_id
  const attacker = getObj('graphic', parts[1] || '');
  const target   = getObj('graphic', parts[2] || '');

  if (!attacker) return whisper(msg.playerid, 'No valid **thrower**. Select your token first.');
  if (!target)   return whisper(msg.playerid, 'No valid **target**. Click a target when prompted.');

  const attackerChar = getObj('character', attacker.get('represents'));
  const targetChar   = getObj('character',   target.get('represents'));
  const page         = getObj('page', attacker.get('pageid'));

  // --- Athletics bonuses ---
  const attackerAth = attackerChar ? (parseInt(getAttrByName(attackerChar.id, 'athletics_bonus')) || 0) : 0;
  const targetAth   = targetChar   ? (parseInt(getAttrByName(targetChar.id,   'athletics_bonus')) || 0) : 0;

  // --- Distance ---
  const distObj = tokenDistance(attacker, target);
  const distanceFt = Math.round(parseFloat(distObj.measurement));
  const unit = (page.get('scale_unit')) || 'ft';
  const distanceStr = distanceFt + unit;

  // --- Size modifier ---
  const sizeMod = getSizeModFromToken(target, page);

  // --- Adjacency modifier ---
  const adjacencyBonus = getAdjacencyBonus(attacker, target, page);

  // --- AC Calculation ---
  let AC = 10;
  if (mode === 'attack') {
    AC += targetAth;
  } else {
    AC -= targetAth;
  }
  AC -= sizeMod; // bigger target easier, smaller harder
  if (distanceFt > 30) {
    AC += Math.floor((distanceFt - 30) / 5) * 2;
  }
  AC += adjacencyBonus;

  // --- d20 roll ---
  const d20 = randomInteger(20);
  const total = d20 + attackerAth;

  let outcome;
  if (d20 === 1) {
    outcome = `**Critical Fail!** ${attacker.get('name')} fumbles at the point of ${mode === 'attack' ? 'attack' : 'pass'}.`;
  } else if (d20 === 20) {
    outcome = `**Critical Success!** Perfect ${mode}.`;
  } else if (total >= AC) {
    if (mode === 'attack') {
      outcome = `${attacker.get('name')} **hits** ${target.get('name')} — they’re **OUT!**`;
    } else {
      outcome = `${attacker.get('name')} **completes the pass** to ${target.get('name')}.`;
    }
  } else {
    if (mode === 'attack') {
      outcome = `${attacker.get('name')} **misses** — ${target.get('name')} **catches** the ball!`;
    } else {
      outcome = `${attacker.get('name')} **misses** — ${target.get('name')} is **OUT!**`;
    }
  }

  // --- Output ---
  let actionWord = (mode === 'attack') ? 'THROWS at' : 'PASSES to';
  sendChat('Dodgeball',
    `${attacker.get('name')} ${actionWord} ${target.get('name')} (${distanceStr})<br>` +
    `Roll: [${d20} + AttackerAth ${attackerAth}] = **${total}** vs AC **${AC}** (receiver Athletics ${targetAth >= 0 ? '+'+targetAth : targetAth}, SizeMod ${sizeMod}, Adjacency ${adjacencyBonus})<br>` +
    `${outcome}`
  );
});

// ---- Helpers ----

// Matches Roll20 ruler measurement
function tokenDistance(token1, token2) {
    if (token1.get('pageid') != token2.get('pageid')) {
        log('Cannot measure distance between tokens on different pages');
        return { distance: 0, squares: 0, measurement: "0" };
    }

    var distX_pixels = Math.abs(token1.get('left') - token2.get('left'));
    var distY_pixels = Math.abs(token1.get('top') - token2.get('top'));

    var page = getObj('page', token1.get('pageid'));
    var gridSizePx = page.get('grid_size') || 70;
    var distX = distX_pixels / gridSizePx;
    var distY = distY_pixels / gridSizePx;
    var distance;

    var measurement = page.get('diagonaltype');

    switch(measurement) {
        default:
        case 'pythagorean':
            distance = Math.sqrt(distX * distX + distY * distY);
            break;
        case 'foure':
            distance = Math.max(distX, distY);
            break;
        case 'threefive':
            distance = 1.5 * Math.min(distX, distY) + Math.abs(distX - distY);
            break;
        case 'manhattan':
            distance = distX + distY;
            break;
    }

    var gridUnitSize = page.get('snapping_increment') || 1;
    var unitScale = page.get('scale_number') || 5;

    return {
        distance: distance,
        squares: distance / gridUnitSize,
        measurement: '' + (unitScale * distance / gridUnitSize)
    };
}

// Determine size modifier from token footprint
function getSizeModFromToken(token, page) {
  if (!token || !page) return 0;
  const gridSizePx = page.get('grid_size') || 70;
  const squaresWide = token.get('width') / gridSizePx; // how many squares across

  if (squaresWide >= 8) return 6;    // Gargantuan (8×8 or bigger)
  if (squaresWide >= 4) return 4;    // Huge (4×4)
  if (squaresWide >= 2) return 2;    // Large (2×2)
  if (squaresWide <= 0.5) return -2; // Small (0.5×0.5)
  if (squaresWide <= 0.25) return -4;// Tiny (0.25×0.25)
  return 0;                          // Medium (1×1)
}

// Check adjacency: +5 AC per enemy adjacent to thrower or receiver
function getAdjacencyBonus(attacker, target, page) {
  let bonus = 0;
  const tokens = findObjs({_pageid: page.id, _type: 'graphic', _subtype: 'token'});
  tokens.forEach(tok => {
    if (tok.id === attacker.id || tok.id === target.id) return; // skip self & target
    const distToAttacker = parseFloat(tokenDistance(attacker, tok).measurement);
    const distToTarget   = parseFloat(tokenDistance(target, tok).measurement);
    if (distToAttacker <= 5 || distToTarget <= 5) {
      bonus += 5;
    }
  });
  return bonus;
}

function whisper(pid, text){
  const p = getObj('player', pid);
  if (!p) return;
  sendChat('Dodgeball', `/w "${p.get('_displayname')}" ${text}`);
}
