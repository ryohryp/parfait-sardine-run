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

  let htmlDecoder = null;

  function decodeHtmlEntities(str){
    if (typeof document === 'undefined') return str;
    if (!htmlDecoder){
      htmlDecoder = document.createElement('textarea');
    }
    htmlDecoder.innerHTML = str;
    return htmlDecoder.value;
  }

  function sanitizeCommentMessage(raw, limit = 1000){
    if (!raw) return '';

    let base = '';
    if (typeof raw === 'string'){
      base = raw;
    } else if (raw && typeof raw === 'object'){
      if (typeof raw.rendered === 'string') base = raw.rendered;
      else if (typeof raw.raw === 'string') base = raw.raw;
      else base = String(raw);
    } else {
      base = String(raw);
    }

    let normalized = decodeHtmlEntities(base)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\r\n?/g, '\n')
      .replace(/\u00A0/g, ' ');

    normalized = normalized
      .replace(/[<>]/g, '')
      .replace(/[\u2028\u2029]/g, '\n')
      .trim();

    return clampGraphemes(normalized, limit).trim();
  }

  window.PSR.Utils = {
    graphemeLength,
    clampGraphemes,
    sanitizeName,
    sanitizeCommentMessage
  };
})();
