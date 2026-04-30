const ADJS  = ['Cosmic','Neon','Velvet','Funky','Mystic','Jazzy','Quirky','Sneaky',
                'Zesty','Fuzzy','Glitchy','Lunar','Tangy','Wobbly','Spiffy'];
const NOUNS = ['Penguin','Wizard','Pickle','Comet','Noodle','Goblin','Muffin','Platypus',
                'Biscuit','Cactus','Gnome','Waffle','Ferret','Pebble','Sprocket'];

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
