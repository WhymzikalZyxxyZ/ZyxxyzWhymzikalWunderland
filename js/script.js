function navigateToPage(url) {
    if (!url || typeof url !== 'string') return;
    // Block dangerous protocols: javascript:, data:, vbscript:
    if (/^[\s ]*(?:javascript|data|vbscript):/i.test(url)) return;
    // Block protocol-relative URLs (//evil.com)
    if (/^\/\//.test(url.trimStart())) return;
    window.location.href = url;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { navigateToPage };
}
