'use strict';

const SULTRY_ADJS = [
    'Velvet','Silken','Crimson','Midnight','Scarlet','Mystic','Ethereal',
    'Obsidian','Amber','Ivory','Onyx','Opulent','Alluring','Bewitching',
    'Enchanting','Elusive','Gossamer','Haunting','Languid','Luminous',
    'Smoldering','Sultry','Dreamy','Whimsical','Capricious','Shimmering',
    'Radiant','Mesmerizing','Phantasmal','Vivacious','Tempestuous','Nebulous',
    'Dazzling','Willowy','Gleaming','Quixotic','Fathomless','Starlit',
    'Sapphire','Roseate','Moonglow','Gilded','Eldritch','Diaphanous',
    'Penumbral','Aurous','Celadon','Umber','Tawny','Dusky'
];

const SULTRY_NOUNS = [
    'Siren','Phantom','Enchantress','Reverie','Whisper','Eclipse','Mirage',
    'Temptress','Wanderer','Dreamer','Specter','Sylph','Wraith','Veil',
    'Ember','Flame','Shadow','Dusk','Stardust','Moonbeam','Nightfall',
    'Cascade','Zephyr','Tempest','Revenant','Chimera','Oracle','Muse',
    'Raven','Serpent','Panther','Lotus','Orchid','Dahlia','Seraph','Nymph',
    'Luminary','Stargazer','Belladonna','Solstice','Equinox','Amaranth',
    'Foxglove','Elara','Wanderlust','Nimue','Valkyrie','Circe','Calypso',
    'Selene','Isolde','Ariadne','Thessaly'
];

const USERNAME_KEY = 'zyxUsername';
const USERNAME_RE  = /^[A-Za-z]{6,32}_\d{3}$/;

function genUsername() {
    const adj  = SULTRY_ADJS[Math.floor(Math.random() * SULTRY_ADJS.length)];
    const noun = SULTRY_NOUNS[Math.floor(Math.random() * SULTRY_NOUNS.length)];
    return `${adj}${noun}_${Math.floor(Math.random() * 900 + 100)}`;
}

function getOrCreateUsername() {
    try {
        const stored = localStorage.getItem(USERNAME_KEY);
        if (stored && USERNAME_RE.test(stored)) return stored;
        const fresh = genUsername();
        localStorage.setItem(USERNAME_KEY, fresh);
        return fresh;
    } catch (_) {
        return genUsername();
    }
}

function setUsername(name) {
    if (!USERNAME_RE.test(name)) throw new Error('Invalid username format');
    try { localStorage.setItem(USERNAME_KEY, name); } catch (_) { /* ignore */ }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SULTRY_ADJS, SULTRY_NOUNS, USERNAME_KEY, USERNAME_RE,
                       genUsername, getOrCreateUsername, setUsername };
}
