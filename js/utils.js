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

  function sanitizeCommentMessage(raw, limit = 1000){
    if (!raw) return '';
    let normalized = String(raw)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\r\n?/g, '\n')
      .replace(/\u00A0/g, ' ');
    normalized = normalized.replace(/[<>]/g, '');
    normalized = normalized.trim();
    return clampGraphemes(normalized, limit).trim();
  }

  window.PSR.Utils = {
    graphemeLength,
    clampGraphemes,
    sanitizeName,
    sanitizeCommentMessage
  };
})();
