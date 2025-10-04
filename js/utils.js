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
    const blockTags = '(?:script|style|template|iframe|object|embed|noscript|svg|math|canvas)';
    const pairedBlockRegex = new RegExp(`<\\s*(${blockTags})\\b[^>]*>[\\s\\S]*?<\\s*\\/\\s*\\1\\s*>`, 'gi');
    const selfClosingBlockRegex = new RegExp(`<\\s*(${blockTags})\\b[^>]*\\/\\s*>`, 'gi');
    const trailingBlockRegex = new RegExp(`<\\s*(${blockTags})\\b[^>]*>[\\s\\S]*$`, 'gi');

    let normalized = decodeEntities(String(raw))
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/<!--([\s\S]*?)-->/g, '')
      .replace(/<\?([\s\S]*?)\?>/g, '')
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '')
      .replace(/\r\n?/g, '\n')
      .replace(/\u00A0/g, ' ');

    let previous = null;
    while (previous !== normalized){
      previous = normalized;
      normalized = normalized.replace(pairedBlockRegex, '');
    }
    normalized = normalized
      .replace(selfClosingBlockRegex, '')
      .replace(trailingBlockRegex, '')
      .replace(new RegExp(`<\\s*\\/\\s*${blockTags}\\s*>`, 'gi'), '');

    normalized = normalized
      .replace(/<[^>]*>/g, '')
      .replace(/[<>]/g, '')
      .replace(/\s{3,}/g, '  ');

    const filteredLines = normalized
      .split('\n')
      .map(line => line.replace(/\s+/g, ' ').trim())
      .filter(line => {
        if (!line) return false;
        const hasSemicolon = line.includes(';');
        const hasBrace = /[{}]/.test(line);
        const hasAssign = /=/.test(line);
        const hasParens = /[()]/.test(line);
        const methodCall = /\.\s*[A-Za-z_$][\w$]*\s*\(/.test(line);
        const keywordMatch = /\b(const|let|var|function|return|class|import|export|new)\b/i.test(line);
        const methodKeywordMatch = /(document\.|window\.|Math\.|setTimeout|setInterval|eval)/i.test(line);
        const codeKeyword = keywordMatch || methodKeywordMatch;
        const arrowFunction = /=>/.test(line) || /=\s*function\b/i.test(line);
        const bareCall = hasSemicolon && /^[A-Za-z_$][\w$]*\s*\([^)]*\)\s*;?$/.test(line);
        if (hasBrace || arrowFunction) return false;
        if (methodCall) return false;
        if (codeKeyword && (hasSemicolon || hasAssign || hasParens)) return false;
        if (bareCall) return false;
        if (hasSemicolon && /\b(document|window|Math|setTimeout|setInterval|requestAnimationFrame|addEventListener)\b/i.test(line)){
          return false;
        }
        return true;
      });

    normalized = filteredLines.join('\n');
    return clampGraphemes(normalized.trim(), limit).trim();
  }

  window.PSR.Utils = {
    graphemeLength,
    clampGraphemes,
    sanitizeName,
    sanitizeCommentMessage
  };
})();
