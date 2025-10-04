(function(){
  window.PSR = window.PSR || {};

  function graphemeLength(str){
    return Array.from(str || '').length;
  }

  function clampGraphemes(str, limit){
    const arr = Array.from(str || '');
    if (arr.length <= limit) return arr.join('');
    return arr.slice(0, limit).join('');
  }

  function sanitizeName(raw){
    if (!raw) return '';
    const cleaned = String(raw)
      .replace(/[\u0000-\u001F\u007F<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return clampGraphemes(cleaned, 40);
  }

  function decodeEntities(value){
    if (!value) return '';
    const str = String(value);
    if (typeof document !== 'undefined'){
      const textarea = decodeEntities.__el || (decodeEntities.__el = document.createElement('textarea'));
      textarea.innerHTML = str;
      return textarea.value;
    }
    return str
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
        const code = parseInt(hex, 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : '';
      })
      .replace(/&#(\d+);/g, (_, num) => {
        const code = parseInt(num, 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : '';
      });
  }

  function sanitizeCommentMessage(raw, limit = 1000){
    if (!raw) return '';

    const executableTags = '(?:script|style|template|iframe|object|embed|noscript|svg|math|canvas|applet)';
    const pairedExecutableRegex = new RegExp(`<\\s*(${executableTags})\\b[^>]*>[\\s\\S]*?<\\s*\\/\\s*\\1\\s*>`, 'gi');
    const selfClosingExecutableRegex = new RegExp(`<\\s*(${executableTags})\\b[^>]*\\/\\s*>`, 'gi');
    const trailingExecutableRegex = new RegExp(`<\\s*(${executableTags})\\b[^>]*>[\\s\\S]*$`, 'gi');

    let normalized = decodeEntities(String(raw))
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/<!--([\s\S]*?)-->/g, '')
      .replace(/<\?([\s\S]*?)\?>/g, '')
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '')
      .replace(/\r\n?/g, '\n')
      .replace(/\u00A0/g, ' ');

    let previous;
    do {
      previous = normalized;
      normalized = normalized
        .replace(pairedExecutableRegex, '')
        .replace(selfClosingExecutableRegex, '')
        .replace(trailingExecutableRegex, '');
    } while (previous !== normalized);

    normalized = normalized
      .replace(new RegExp(`<\\s*\\/\\s*${executableTags}\\s*>`, 'gi'), '')
      .replace(/<[^>]*>/g, '')
      .replace(/[<>]/g, '')
      .replace(/[ \t\f\v]+/g, ' ')
      .replace(/\s*\n\s*/g, '\n')
      .replace(/\n{3,}/g, '\n\n');

    return clampGraphemes(normalized.trim(), limit).trim();
  }

  window.PSR.Utils = {
    graphemeLength,
    clampGraphemes,
    sanitizeName,
    sanitizeCommentMessage
  };
})();
