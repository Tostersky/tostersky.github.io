// Game data: buildings, units, heroes, campaign. All numbers are CyberWar's own.
G.TW = 64; G.TH = 32; G.MAP = 40; G.VERSION = '0.15.5';
G.BUILDERS = 2; // builder drones at the start; more can be bought with chips (up to 5)
G.BUILDER_PRICE = [0, 0, 250, 500, 1000]; // price of the 3rd, 4th and 5th drone
G.BUILDERS_MAX = 5;

// every array has one value per level (1..8)
G.BUILDINGS = {
  // balance rule: everything a Core level unlocks costs at most ~85% of (Core + ONE vault at that level); more vaults = extra savings room
  core:       { size: 4, res: 'scrap',  cost: [0, 2000, 7000, 20000, 45000, 90000, 160000, 280000], time: [0, 20, 120, 900, 3600, 10800, 28800, 57600],
                hp: [1500, 1900, 2400, 3000, 3800, 4600, 5500, 6500], store: [2000, 4000, 7000, 12000, 20000, 34000, 52000, 75000] },
  scrapyard:  { size: 3, res: 'copper', cost: [150, 300, 700, 1400, 3000, 6000, 12000, 24000], time: [10, 30, 120, 600, 1800, 3600, 7200, 14400],
                hp: [400, 450, 500, 550, 600, 650, 700, 750], prod: 'scrap', rate: [300, 500, 800, 1100, 1500, 1900, 2400, 3000], cap: [500, 1000, 2000, 3500, 5000, 7000, 9500, 12000] },
  coppermine: { size: 3, res: 'scrap',  cost: [150, 300, 700, 1400, 3000, 6000, 12000, 24000], time: [10, 30, 120, 600, 1800, 3600, 7200, 14400],
                hp: [400, 450, 500, 550, 600, 650, 700, 750], prod: 'copper', rate: [300, 500, 800, 1100, 1500, 1900, 2400, 3000], cap: [500, 1000, 2000, 3500, 5000, 7000, 9500, 12000] },
  vault:      { size: 3, res: 'copper', cost: [300, 800, 2000, 5000, 12000, 25000, 50000, 90000], time: [15, 60, 300, 1200, 2700, 5400, 10800, 21600],
                hp: [600, 700, 800, 900, 1000, 1100, 1200, 1300], store: [2000, 5000, 17000, 42000, 85000, 152000, 272000, 300000], storeRes: 'copper' },
  // scrap silo: the vault's twin for scrap (vault keeps copper, the Core keeps both)
  silo:       { size: 3, res: 'copper', cost: [300, 800, 2000, 5000, 12000, 25000, 50000, 90000], time: [15, 60, 300, 1200, 2700, 5400, 10800, 21600],
                hp: [600, 700, 800, 900, 1000, 1100, 1200, 1300], store: [2000, 5000, 17000, 42000, 85000, 152000, 272000, 300000], storeRes: 'scrap' },
  factory:    { size: 3, res: 'scrap',  cost: [200, 1000, 2500, 6000, 15000, 30000, 60000, 100000], time: [15, 120, 600, 1800, 3600, 10800, 21600, 36000],
                hp: [500, 600, 700, 800, 900, 1000, 1100, 1200] },
  squadhq:    { size: 4, res: 'copper', cost: [250, 2000, 5000, 12000, 25000, 45000, 80000, 140000], time: [15, 180, 900, 2400, 5400, 14400, 25200, 39600],
                hp: [500, 600, 700, 800, 900, 1000, 1100, 1200], housing: [20, 30, 40, 55, 70, 85, 100, 120] },
  // holds units donated by clan mates (housing = how much space they can fill)
  clanhub:    { size: 3, res: 'scrap',  cost: [3000, 8000, 20000, 40000, 70000, 110000, 160000, 220000], time: [120, 900, 1800, 3600, 10800, 18000, 28800, 43200],
                hp: [800, 950, 1100, 1250, 1400, 1550, 1700, 1850], housing: [10, 15, 20, 25, 30, 35, 40, 45], clan: true },
  lab:        { size: 3, res: 'copper', cost: [500, 2500, 6000, 12000, 25000, 45000, 75000, 110000], time: [60, 600, 1800, 3600, 7200, 14400, 28800, 43200],
                hp: [500, 600, 700, 800, 900, 1000, 1100, 1200] },
  laser:      { size: 2, res: 'scrap',  cost: [500, 1500, 4000, 9000, 20000, 35000, 60000, 100000], time: [20, 120, 600, 1800, 3600, 7200, 14400, 28800],
                hp: [500, 620, 750, 880, 1000, 1150, 1300, 1450], dmg: [12, 16, 21, 27, 34, 42, 51, 61], interval: 0.8, range: 7, defense: true, hits: 'both' },
  // slow plasma shells that hurt everything around the impact; can't hit air or anything too close
  mortar:     { size: 3, res: 'scrap',  cost: [5000, 9000, 15000, 24000, 36000, 52000, 75000, 100000], time: [300, 900, 1800, 3600, 7200, 14400, 21600, 36000],
                hp: [700, 800, 900, 1000, 1150, 1300, 1450, 1600], dmg: [25, 32, 40, 50, 62, 75, 90, 105], interval: 4, range: 9, minRange: 3, splash: 1.5, defense: true, hits: 'ground' },
  // anti-air missiles: big damage, flying targets only
  aa:         { size: 2, res: 'scrap',  cost: [8000, 14000, 22000, 32000, 46000, 64000, 88000, 120000], time: [600, 1200, 2400, 3600, 10800, 18000, 28800, 43200],
                hp: [600, 700, 800, 900, 1000, 1100, 1250, 1400], dmg: [80, 100, 125, 150, 180, 210, 245, 280], interval: 1.2, range: 8, defense: true, hits: 'air' },
  // EMP pylon: every few seconds a shock wave hurts and slows every unit around it (ground and air)
  emp:        { size: 2, res: 'scrap',  cost: [6000, 11000, 18000, 28000, 40000, 56000, 78000, 105000], time: [600, 1200, 2400, 3600, 10800, 18000, 28800, 43200],
                hp: [650, 750, 860, 980, 1100, 1240, 1380, 1530], dmg: [14, 18, 23, 29, 36, 44, 53, 63], interval: 5, range: 4.5, slow: 2.5, defense: true, hits: 'both', pulse: true },
  // plasma (3rd resource, from Core 5): pumped by extractors, kept in plasma tanks; used for hero upgrades
  extractor:  { size: 3, res: 'scrap',  cost: [20000, 26000, 33000, 42000, 55000, 80000, 120000, 170000], time: [600, 1200, 2400, 3600, 7200, 14400, 21600, 28800],
                hp: [500, 550, 600, 650, 700, 760, 820, 880], prod: 'plasma', rate: [100, 140, 180, 230, 300, 380, 470, 580], cap: [400, 600, 800, 1000, 1300, 1600, 2000, 2500] },
  tank:       { size: 2, res: 'copper', cost: [15000, 20000, 26000, 34000, 45000, 70000, 110000, 160000], time: [600, 1200, 2400, 3600, 7200, 14400, 21600, 28800],
                hp: [500, 560, 620, 690, 760, 840, 920, 1000], store: [3000, 4500, 6000, 8000, 10000, 14000, 20000, 28000], storeRes: 'plasma' },
  // Program Forge: compiles battle programs (spells); housing = how many programs it can hold
  forge:      { size: 3, res: 'copper', cost: [6000, 12000, 20000, 40000, 80000, 130000, 200000, 260000], time: [600, 1800, 3600, 10800, 18000, 28800, 36000, 43200],
                hp: [550, 650, 750, 850, 950, 1050, 1150, 1250], housing: [2, 2, 3, 3, 4, 4, 5, 6] },
  // hidden sky mine: blows up once when a flying unit comes close (single target, big damage)
  skymine:    { size: 1, res: 'scrap',  cost: [2000, 3000, 4000, 5500, 7500, 10000, 13000, 17000], time: [0, 0, 0, 0, 0, 0, 0, 0],
                hp: [1, 1, 1, 1, 1, 1, 1, 1], dmg: [180, 230, 290, 360, 440, 530, 630, 750], trap: true, air: true },
  // hidden trap: explodes once when a ground unit steps close
  mine:       { size: 1, res: 'scrap',  cost: [500, 800, 1200, 1800, 2600, 3600, 5000, 7000], time: [0, 0, 0, 0, 0, 0, 0, 0],
                hp: [1, 1, 1, 1, 1, 1, 1, 1], dmg: [60, 80, 105, 135, 170, 210, 255, 305], trap: true, splash: 1.5 },
  firewall:   { size: 1, res: 'scrap',  cost: [50, 200, 600, 1500, 4000, 8000, 15000, 25000], time: [0, 0, 0, 0, 0, 0, 0, 0],
                hp: [300, 600, 1000, 1600, 2500, 3500, 4800, 6500], wall: true },

  // ---- the colony (second city, reached by the shuttle from Core 6). city: 2 = built only there.
  // Same shared resources; the colony only builds the economy (no battles there yet).
  xcore:      { size: 4, res: 'scrap',  city: 2, cost: [0, 60000, 110000, 170000, 240000, 320000, 410000, 520000], time: [0, 7200, 14400, 28800, 43200, 57600, 72000, 86400],
                hp: [3000, 3500, 4000, 4500, 5000, 5600, 6200, 7000], store: [10000, 16000, 24000, 34000, 46000, 60000, 76000, 95000] },
  // deep drill: scrap from the dunes, much faster than a city scrapyard
  xdrill:     { size: 3, res: 'copper', city: 2, cost: [8000, 16000, 28000, 45000, 70000, 100000, 140000, 190000], time: [300, 1800, 3600, 7200, 14400, 21600, 28800, 36000],
                hp: [700, 760, 820, 880, 940, 1000, 1080, 1160], prod: 'scrap', rate: [1800, 2300, 2800, 3400, 4000, 4700, 5400, 6200], cap: [8000, 10000, 12500, 15000, 18000, 21000, 24500, 28000] },
  // geyser pump: copper brine from under the crust
  xpump:      { size: 3, res: 'scrap',  city: 2, cost: [8000, 16000, 28000, 45000, 70000, 100000, 140000, 190000], time: [300, 1800, 3600, 7200, 14400, 21600, 28800, 36000],
                hp: [700, 760, 820, 880, 940, 1000, 1080, 1160], prod: 'copper', rate: [1800, 2300, 2800, 3400, 4000, 4700, 5400, 6200], cap: [8000, 10000, 12500, 15000, 18000, 21000, 24500, 28000] },
  // crystal resonator: grows plasma crystals
  xcrystal:   { size: 3, res: 'copper', city: 2, cost: [30000, 45000, 65000, 90000, 120000, 160000, 210000, 270000], time: [1800, 3600, 7200, 14400, 21600, 28800, 36000, 43200],
                hp: [600, 660, 720, 780, 840, 900, 970, 1040], prod: 'plasma', rate: [250, 320, 400, 480, 570, 670, 780, 900], cap: [1500, 2000, 2500, 3000, 3600, 4200, 4900, 5600] },
  // cargo dome: stores scrap and copper (like the Core)
  xdome:      { size: 3, res: 'scrap',  city: 2, cost: [12000, 25000, 45000, 70000, 100000, 140000, 190000, 250000], time: [600, 2400, 5400, 10800, 18000, 25200, 32400, 39600],
                hp: [900, 1000, 1100, 1200, 1300, 1400, 1500, 1600], store: [20000, 40000, 70000, 100000, 140000, 180000, 230000, 290000] },
  // cryo tank: stores plasma
  xcryo:      { size: 2, res: 'copper', city: 2, cost: [20000, 32000, 48000, 68000, 92000, 120000, 155000, 200000], time: [900, 3600, 7200, 14400, 21600, 28800, 36000, 43200],
                hp: [600, 660, 720, 780, 840, 900, 970, 1040], store: [5000, 7000, 9500, 12500, 16000, 20000, 25000, 31000], storeRes: 'plasma' },
  // hangar: builds the strong colony units (titan from level 1, gunship from level 3)
  xhangar:    { size: 4, res: 'scrap',  city: 2, cost: [60000, 90000, 130000, 180000, 240000, 310000, 390000, 480000], time: [3600, 7200, 14400, 21600, 28800, 43200, 57600, 72000],
                hp: [1200, 1350, 1500, 1650, 1800, 1950, 2100, 2300] },
};
G.CITY2_CORE = 6; // Core level that brings the shuttle
// obstacles on the home map: they block building until removed (cost grows with the Core level). Never give chips.
G.OBSTACLES = {
  wreck:  { size: 2, res: 'scrap',  cost: 600 },  // burnt-out hover car
  crates: { size: 2, res: 'copper', cost: 500 },  // stack of cargo containers
  rubble: { size: 2, res: 'scrap',  cost: 450 },  // concrete rubble heap
  barrel: { size: 1, res: 'copper', cost: 150 },  // leaking toxic barrels
  tree:   { size: 1, res: 'scrap',  cost: 200 },  // synthetic neon tree
  block:  { size: 1, res: 'scrap',  cost: 250 },  // concrete block with rebar
};
G.OBS_MAX = 40; G.OBS_START = 26; G.OBS_EVERY = 6 * 3600 * 1000;
G.MAXLV = 8;
// "reference storage" of a Core level: Core + one vault at that level. Rewards scale with this (not with
// the real storage), so building many vaults doesn't inflate daily rewards, missions or ad rewards.
G.refCap = (L) => G.BUILDINGS.core.store[L - 1] + G.BUILDINGS.vault.store[L - 1];
// How many of each building per Core level (index = core level - 1)
G.LIMITS = {
  core: [1, 1, 1, 1, 1, 1, 1, 1], scrapyard: [2, 3, 4, 5, 6, 6, 7, 7], coppermine: [2, 3, 4, 5, 6, 6, 7, 7],
  vault: [1, 1, 2, 2, 3, 3, 4, 4], silo: [1, 1, 2, 2, 3, 3, 4, 4], factory: [1, 1, 1, 1, 1, 1, 1, 1], squadhq: [1, 1, 1, 1, 1, 1, 1, 1],
  lab: [0, 1, 1, 1, 1, 1, 1, 1], forge: [0, 0, 0, 1, 1, 1, 1, 1], extractor: [0, 0, 0, 0, 1, 2, 2, 3], tank: [0, 0, 0, 0, 1, 1, 2, 2], clanhub: [0, 0, 1, 1, 1, 1, 1, 1], laser: [1, 2, 3, 4, 5, 5, 6, 6], mortar: [0, 0, 1, 1, 2, 2, 3, 3],
  aa: [0, 0, 0, 1, 1, 2, 2, 3], emp: [0, 0, 0, 0, 1, 1, 2, 2], mine: [0, 0, 2, 3, 4, 5, 6, 8], skymine: [0, 0, 0, 1, 2, 2, 3, 4], firewall: [25, 50, 75, 100, 150, 175, 200, 225],
  // colony limits follow the colony HQ level
  xcore: [1, 1, 1, 1, 1, 1, 1, 1], xdrill: [1, 2, 2, 3, 3, 4, 4, 5], xpump: [1, 2, 2, 3, 3, 4, 4, 5], xcrystal: [0, 1, 1, 2, 2, 2, 3, 3],
  xdome: [1, 1, 2, 2, 2, 3, 3, 3], xcryo: [0, 1, 1, 1, 2, 2, 2, 2], xhangar: [0, 0, 1, 1, 1, 1, 1, 1],
};
G.SHOP2 = ['xhangar', 'xdrill', 'xpump', 'xcrystal', 'xdome', 'xcryo'];
G.SHOP = ['laser', 'mortar', 'aa', 'emp', 'mine', 'skymine', 'firewall', 'scrapyard', 'coppermine', 'vault', 'silo', 'factory', 'squadhq', 'lab', 'forge', 'extractor', 'tank', 'clanhub'];

// laboratory research: unit level 2..5 (cost in copper, time in seconds); each level = +15% hitpoints and damage
G.RESEARCH = { cost: [0, 1500, 5000, 14000, 32000], time: [0, 600, 3600, 3 * 3600, 8 * 3600], maxLv: 5, bonus: 0.15 };
G.unitMul = (lv) => 1 + G.RESEARCH.bonus * ((lv || 1) - 1);

G.UNITS = {
  runner: { cost: 25,  space: 1, hp: 60,  dmg: 10,  interval: 0.8, speed: 2.2, range: 0.6, time: 5,  unlock: 1, target: 'any' },
  gunner: { cost: 50,  space: 1, hp: 32,  dmg: 11,  interval: 1.0, speed: 1.6, range: 3.5, time: 6,  unlock: 2, target: 'any' },
  drone:  { cost: 120, space: 2, hp: 45,  dmg: 160, interval: 0,   speed: 2.8, range: 0.4, time: 10, unlock: 3, target: 'defense', fly: true, splash: 1.3 },
  mech:   { cost: 300, space: 5, hp: 520, dmg: 42,  interval: 1.6, speed: 0.9, range: 0.9, time: 20, unlock: 4, target: 'defense' },
  // field medic: doesn't attack; follows the squad and heals ground units and heroes around it
  // wall breacher: runs to the nearest firewall and blows it up (huge damage to walls only)
  breacher: { cost: 120, space: 2, hp: 55, dmg: 25, wallMul: 30, interval: 0, speed: 2.5, range: 0.5, time: 12, unlock: 3, target: 'wall', splash: 1.5 },
  medic:  { cost: 150, space: 3, hp: 180, dmg: 0, heal: 18, healR: 2.6, interval: 1.0, speed: 1.5, range: 1.4, time: 15, unlock: 5, target: 'heal' },
  // colony units (colony: true): trained in the colony Hangar, unlock = Hangar level
  // titan: armoured walker with a plasma hammer; leaps over firewalls (jump) and every blow also hits buildings around the target (aoe)
  titan:  { cost: 900, space: 10, hp: 1600, dmg: 85, interval: 1.6, speed: 0.85, range: 1.0, time: 45, unlock: 1, target: 'any', aoe: 1.3, jump: true, colony: true },
  // gunship: flying plasma gunship, goes for defenses first (then anything), shoots from range
  gunship: { cost: 1200, space: 8, hp: 560, dmg: 58, interval: 1.0, speed: 1.9, range: 3.4, time: 50, unlock: 3, target: 'defense', fly: true, colony: true },
};
G.UNIT_ORDER = ['runner', 'gunner', 'drone', 'mech', 'medic', 'breacher', 'titan', 'gunship'];

G.HEROES = {
  ronin: { hp: 950, dmg: 40, interval: 0.8, speed: 1.6, range: 0.7, unlock: 2, target: 'any' },
  nyx:   { hp: 520, dmg: 30, interval: 0.9, speed: 1.5, range: 4.0, unlock: 4, target: 'any' },
};
G.HERO_ORDER = ['ronin', 'nyx'];
// hero levels 1..10, paid in plasma; max level = Squad HQ level + 2; +8% hitpoints/damage per level
G.HERO_UP = { cost: [0, 1500, 2500, 3500, 5000, 7000, 9000, 12000, 16000, 20000], time: [0, 1800, 3600, 7200, 14400, 21600, 28800, 36000, 43200, 57600] };
G.HERO_MAX = 10;
G.heroRestMin = (lv) => 5 + 2 * lv; // minutes a fallen hero needs to recover

// battle programs (spells), compiled in the Program Forge; deployed as a zone on the battlefield
G.SPELLS = {
  heal: { cost: 400, time: 90,  unlock: 1, radius: 3,   dur: 6, power: 28, color: '#39ff88' },  // heals units inside (hp/s)
  rage: { cost: 700, time: 150, unlock: 2, radius: 3,   dur: 8, power: 1.5, color: '#ff2bd6' }, // x1.5 damage, faster units
  jam:  { cost: 900, time: 210, unlock: 3, radius: 3.5, dur: 5, color: '#7fd8ff' },              // switches defenses off
};
G.SPELL_ORDER = ['heal', 'rage', 'jam'];

G.BATTLE_TIME = 180;
// creating a clan costs premium chips (500 chips = the 14,99 zł chip pack in the shop)
G.CLAN_PRICE = 500;

// chip packs sold through Google Play (ids = product ids in Play Console; prices shown from Play when available)
G.CHIP_PACKS = [
  { id: 'chips_120', chips: 120, price: '4,99 zł' },
  { id: 'chips_500', chips: 500, price: '14,99 zł', tag: 'clan' },
  { id: 'chips_1200', chips: 1200, price: '29,99 zł' },
  { id: 'chips_2800', chips: 2800, price: '59,99 zł', tag: 'popular' },
  { id: 'chips_7500', chips: 7500, price: '129,99 zł', tag: 'best' },
];
G.packById = (id) => G.CHIP_PACKS.find((p) => p.id === id);
// rewarded ads: off until an ad account (AdSense / H5 Games Ads) is set up — then on:true + client id
// chips come ONLY from purchases and the campaign: an ad gives resources (share of storage), never chips
G.ADS = { on: false, client: '', resPct: 0.1, perDay: 5, cooldown: 90 };
// daily login reward, 7-day streak (share of storage + bonus units). Never chips.
G.DAILY = [
  { pct: 0.05 }, { pct: 0.08 }, { pct: 0.10, units: { runner: 5 } }, { pct: 0.12 },
  { pct: 0.15 }, { pct: 0.18, units: { gunner: 4 } }, { pct: 0.25, units: { mech: 2 } },
];
// daily missions: 3 a day picked from this pool; goal = fixed number or share of storage (cap)
G.MISSIONS = {
  collect_scrap: { hours: 3 }, collect_copper: { hours: 3 }, win: { goal: 2 }, stars: { goal: 5 },
  build: { goal: 2 }, train: { goal: 15 }, raid: { goal: 1 },
};
G.MISSION_REWARD = 0.12; // share of storage, scrap + copper
// VIP: monthly Google Play subscription — ad rewards without watching ads, no ads, gold badge (no chips!)
G.VIP = { id: 'vip_monthly', price: '47 zł / mies.' };
// chips -> resources exchange (fill 10% / 50% / to the top of storage)
G.resChipCost = (n) => (n > 0 ? Math.ceil(n / 200) + 1 : 0);
// full stars earned for a destruction share 0..1 (every third = one star; 33% counts as 1)
G.starsFor = (pct) => Math.max(0, Math.min(3, Math.floor(pct * 3 + 0.02)));

// Seeded random (mulberry32)
G.rng = function (seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};

// Builds an enemy base layout from parameters.
G.genBase = function (p, seed) {
  const r = G.rng(seed), M = G.MAP, occ = new Uint8Array(M * M), out = [];
  const blv = p.blv || p.core;
  const free = (x, y, s, gap) => {
    for (let j = y - gap; j < y + s + gap; j++) for (let i = x - gap; i < x + s + gap; i++) {
      if (i < 1 || j < 1 || i >= M - 1 || j >= M - 1 || occ[j * M + i]) return false;
    }
    return true;
  };
  const put = (type, level, x, y) => {
    const s = G.BUILDINGS[type].size;
    for (let j = y; j < y + s; j++) for (let i = x; i < x + s; i++) occ[j * M + i] = 1;
    out.push({ type, level, x, y });
  };
  put('core', p.core, 18, 18);
  const spots = [[15, 15], [23, 15], [15, 23], [23, 23], [19, 15], [15, 19], [23, 19], [19, 23]];
  for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
  for (let i = 0; i < Math.min(p.lasers, spots.length); i++) put('laser', p.laserLv, spots[i][0], spots[i][1]);
  const ring = (x0, y0, x1, y1, lv) => {
    const w = (x, y) => { if (!occ[y * M + x]) put('firewall', lv, x, y); };
    for (let x = x0; x <= x1; x++) { w(x, y0); w(x, y1); }
    for (let y = y0 + 1; y < y1; y++) { w(x0, y); w(x1, y); }
  };
  if (p.rings >= 1) ring(14, 14, 25, 25, p.wallLv);
  if (p.rings >= 2) ring(10, 10, 29, 29, p.wallLv2 || p.wallLv);
  const rest = [];
  for (let i = 0; i < (p.scrap || 0); i++) rest.push('scrapyard');
  for (let i = 0; i < (p.copper || 0); i++) rest.push('coppermine');
  for (let i = 0; i < (p.vault || 0); i++) rest.push('vault');
  for (let i = 0; i < (p.silo || 0); i++) rest.push('silo');
  if (p.factory) rest.push('factory');
  if (p.hq) rest.push('squadhq');
  for (let i = 0; i < (p.mortar || 0); i++) rest.push('mortar');
  for (let i = 0; i < (p.aa || 0); i++) rest.push('aa');
  if (p.lab) rest.push('lab');
  for (let i = 0; i < (p.emp || 0); i++) rest.push('emp');
  // defenses are placed first so they always fit near the core
  rest.sort((a, b) => (G.BUILDINGS[b].defense ? 1 : 0) - (G.BUILDINGS[a].defense ? 1 : 0));
  for (const type of rest) {
    const s = G.BUILDINGS[type].size, def = G.BUILDINGS[type].defense;
    for (let tries = 0; tries < 900; tries++) {
      // defenses stay close to the core, economy buildings spread out
      const spread = Math.min(17, (def ? 4 : 7) + Math.floor(tries / 40));
      const x = Math.floor(20 - s / 2 + (r() * 2 - 1) * spread), y = Math.floor(20 - s / 2 + (r() * 2 - 1) * spread);
      if (free(x, y, s, 1)) { put(type, Math.min(blv, G.MAXLV), x, y); break; }
    }
  }
  // hidden mines in the gaps around the core
  for (let i = 0; i < (p.mines || 0); i++) {
    for (let tries = 0; tries < 200; tries++) {
      const x = 12 + Math.floor(r() * 16), y = 12 + Math.floor(r() * 16);
      if (free(x, y, 1, 0)) { put('mine', Math.min(blv, G.MAXLV), x, y); break; }
    }
  }
  // sky mines a bit further out, against drones
  for (let i = 0; i < (p.skymines || 0); i++) {
    for (let tries = 0; tries < 200; tries++) {
      const x = 10 + Math.floor(r() * 20), y = 10 + Math.floor(r() * 20);
      if (free(x, y, 1, 0)) { put('skymine', Math.min(blv, G.MAXLV), x, y); break; }
    }
  }
  return out;
};

G.PVE = [
  { core: 1, lasers: 1, laserLv: 1, rings: 0, wallLv: 1, scrap: 1, copper: 1, vault: 0, loot: { scrap: 500, copper: 500 }, seed: 11 },
  { core: 1, lasers: 1, laserLv: 1, rings: 1, wallLv: 1, scrap: 2, copper: 1, vault: 1, loot: { scrap: 1000, copper: 1000 }, seed: 22 },
  { core: 2, lasers: 2, laserLv: 2, rings: 1, wallLv: 1, scrap: 2, copper: 2, vault: 1, factory: 1, loot: { scrap: 2000, copper: 2000 }, seed: 33 },
  { core: 3, lasers: 3, laserLv: 2, rings: 1, wallLv: 2, scrap: 2, copper: 2, vault: 2, factory: 1, hq: 1, loot: { scrap: 4000, copper: 4000 }, seed: 44 },
  { core: 4, lasers: 4, laserLv: 3, rings: 2, wallLv: 3, wallLv2: 2, scrap: 3, copper: 3, vault: 2, factory: 1, hq: 1, mortar: 1, mines: 2, loot: { scrap: 8000, copper: 8000 }, seed: 55 },
  { core: 5, lasers: 5, laserLv: 4, rings: 2, wallLv: 4, wallLv2: 3, scrap: 3, copper: 3, vault: 3, factory: 1, hq: 1, mortar: 2, aa: 1, mines: 3, loot: { scrap: 15000, copper: 15000 }, seed: 66 },
  { core: 6, lasers: 5, laserLv: 5, rings: 2, wallLv: 5, wallLv2: 4, scrap: 4, copper: 4, vault: 3, factory: 1, hq: 1, mortar: 2, aa: 2, mines: 5, lab: 1, loot: { scrap: 26000, copper: 26000 }, seed: 77 },
  { core: 7, lasers: 6, laserLv: 6, rings: 2, wallLv: 6, wallLv2: 5, scrap: 4, copper: 4, vault: 4, factory: 1, hq: 1, mortar: 3, aa: 2, mines: 6, lab: 1, loot: { scrap: 40000, copper: 40000 }, seed: 88 },
];

// campaign 9..20: max-level bases that keep getting tougher (hpMul = building hitpoints); 10, 15, 20 are bosses
for (let n = 9; n <= 20; n++) {
  const k = n - 8, boss = n % 5 === 0;
  G.PVE.push({
    core: 8, blv: 8, lasers: 6, laserLv: Math.min(8, 6 + Math.ceil(k / 3)), rings: 2,
    wallLv: Math.min(8, 6 + Math.floor(k / 4)), wallLv2: Math.min(8, 5 + Math.floor(k / 4)),
    scrap: 5, copper: 5, vault: 4, factory: 1, hq: 1, lab: 1,
    mortar: 3, aa: Math.min(3, 2 + Math.floor(k / 6)), mines: Math.min(8, 6 + Math.floor(k / 3)), emp: k >= 7 ? 2 : k >= 2 ? 1 : 0,
    loot: { scrap: 45000 + k * 12000, copper: 45000 + k * 12000, plasma: 400 + k * 250 }, seed: 90 + k * 11,
    hpMul: Math.round((1 + k * 0.06 + (boss ? 0.25 : 0)) * 100) / 100, boss,
  });
}

// loot multiplier when a stronger player raids a weaker base (Core level difference)
G.lootMul = (attCore, defCore) => { const d = attCore - defCore; return d <= 1 ? 1 : d === 2 ? 0.5 : 0.25; };

// leagues by trophies: loot bonus for each won attack (share of reference storage) and end-of-season reward
G.LEAGUES = [
  { id: 'bronze', min: 0, bonus: 0.01, reward: { res: 0.05, plasma: 0 } },
  { id: 'silver', min: 400, bonus: 0.02, reward: { res: 0.10, plasma: 0 } },
  { id: 'gold', min: 800, bonus: 0.03, reward: { res: 0.15, plasma: 300 } },
  { id: 'crystal', min: 1200, bonus: 0.04, reward: { res: 0.20, plasma: 800 } },
  { id: 'master', min: 1600, bonus: 0.05, reward: { res: 0.25, plasma: 1500 } },
  { id: 'titan', min: 2000, bonus: 0.06, reward: { res: 0.30, plasma: 2500 } },
  { id: 'legend', min: 2600, bonus: 0.08, reward: { res: 0.40, plasma: 4000 } },
];
G.leagueOf = (tro) => { let L = 0; for (let i = 0; i < G.LEAGUES.length; i++) if (tro >= G.LEAGUES[i].min) L = i; return L; };

// season pass (one season = one calendar month, UTC): 20 tiers x 100 XP; free track for everyone,
// premium track after buying the pass in Google Play. Rewards: res = share of reference storage, plasma, boost items.
G.PASS = { id: 'pass_season', price: '24,99 zł', tiers: 20, xpPer: 100 };
G.PASS_XP = { mission: 60, daily: 40, win: 25, raid: 10 };
G.PASS_FREE = []; G.PASS_PREM = [];
for (let i = 1; i <= 20; i++) {
  G.PASS_FREE.push(i % 10 === 0 ? { item: i === 20 ? 'prod' : 'train' } : i % 5 === 0 ? { plasma: 150 * i } : { res: 0.03 });
  G.PASS_PREM.push(i === 20 ? { item: 'build', n: 3, plasma: 3000 } : i % 5 === 0 ? { plasma: 400 * i } : i % 3 === 0 ? { item: ['build', 'train', 'prod'][(i / 3) % 3] } : { res: 0.06 });
}
// boosts (bought with chips or used from items won in the pass)
G.BOOSTS = {
  prod:  { chips: 100, dur: 24 * 3600, mul: 2 },   // collectors produce x2 for 24 h
  train: { chips: 60,  dur: 3600, mul: 4 },        // units train x4 faster for 1 h
  build: { chips: 90,  skip: 3600 },               // every running construction / research / hero upgrade: -1 h right away
};
// achievements: 3 tiers each; reward = share of reference storage (+ plasma on the last tier)
G.ACH = [
  { id: 'wins', tiers: [10, 50, 200] }, { id: 'stars', tiers: [30, 150, 600] }, { id: 'builds', tiers: [20, 80, 250] },
  { id: 'trained', tiers: [100, 500, 2000] }, { id: 'mined', tiers: [50000, 500000, 3000000] }, { id: 'obs', tiers: [10, 40, 120] },
  { id: 'campaign', tiers: [10, 30, 60] }, { id: 'troMax', tiers: [500, 1200, 2000] }, { id: 'defWins', tiers: [5, 25, 100] }, { id: 'donated', tiers: [25, 150, 500] },
];
G.ACH_RW = [0.08, 0.15, 0.3]; G.ACH_PLASMA = 500;

G.BOT_NAMES = ['Vex_77', 'NeonGhost', 'KiloByte', 'RustQueen', 'Zer0Day', 'GlitchRat', 'ChromeFox', 'NullPtr',
  'VoltaKid', 'SynthWolf', 'Hexa', 'D4rkM4tter', 'PixelMonk', 'IronLotus', 'ByteBandit', 'OverClock'];

G.genBot = function (coreLv, seed) {
  const r = G.rng(seed);
  let c = coreLv + (r() < 0.3 ? 1 : 0) - (r() < 0.3 ? 1 : 0);
  c = Math.max(1, Math.min(G.MAXLV, c));
  const p = {
    core: c, lasers: Math.max(1, G.LIMITS.laser[c - 1] - (r() < 0.5 ? 1 : 0)), laserLv: c,
    rings: c >= 4 ? 2 : (c >= 2 ? 1 : (r() < 0.5 ? 1 : 0)), wallLv: Math.max(1, c - 1), wallLv2: Math.max(1, c - 2),
    scrap: Math.min(6, 1 + c), copper: Math.min(6, 1 + c), vault: G.LIMITS.vault[c - 1], silo: G.LIMITS.silo[c - 1], factory: 1, hq: 1, blv: c,
    mortar: G.LIMITS.mortar[c - 1], aa: G.LIMITS.aa[c - 1], emp: G.LIMITS.emp[c - 1], mines: G.LIMITS.mine[c - 1], lab: G.LIMITS.lab[c - 1], skymines: G.LIMITS.skymine[c - 1],
  };
  const loot = { scrap: Math.floor((300 + r() * 500) * c * c), copper: Math.floor((300 + r() * 500) * c * c) };
  const name = G.BOT_NAMES[Math.floor(r() * G.BOT_NAMES.length)];
  return { name, buildings: G.genBase(p, seed), loot, core: c };
};
