const ADJS  = [
    'Velvet','Silken','Crimson','Midnight','Scarlet','Mystic','Ethereal',
    'Obsidian','Amber','Ivory','Alluring','Bewitching','Enchanting','Elusive',
    'Gossamer','Haunting','Languid','Luminous','Smoldering','Dreamy',
    'Whimsical','Capricious','Shimmering','Radiant','Mesmerizing','Dazzling',
    'Willowy','Gleaming','Fathomless','Starlit','Sapphire','Roseate','Dusky'
];
const NOUNS = [
    'Siren','Phantom','Enchantress','Reverie','Whisper','Eclipse','Mirage',
    'Temptress','Wanderer','Dreamer','Specter','Sylph','Wraith','Veil',
    'Ember','Flame','Shadow','Stardust','Moonbeam','Cascade','Zephyr',
    'Chimera','Oracle','Muse','Raven','Lotus','Orchid','Seraph','Nymph',
    'Luminary','Belladonna','Solstice','Valkyrie','Circe','Selene'
];

function genUsername() {
    const adj  = ADJS[Math.floor(Math.random() * ADJS.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `${adj}${noun}_${Math.floor(Math.random() * 900 + 100)}`;
}

function escHtml(str) {
    return str
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;');
}

function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ADJS, NOUNS, genUsername, escHtml, fmtTime };
}

