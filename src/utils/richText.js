const BLOCK_TAGS = new Set([
  'P',
  'DIV',
  'UL',
  'OL',
  'LI',
  'BLOCKQUOTE',
  'PRE',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
]);

const FORBIDDEN_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'FORM',
  'INPUT',
  'BUTTON',
  'TEXTAREA',
  'SELECT',
  'OPTION',
  'META',
  'LINK',
]);

export function sanitizeRichText(html) {
  if (!html) {
    return '';
  }

  const parser = new DOMParser();
  const documentNode = parser.parseFromString(html, 'text/html');

  documentNode.querySelectorAll('*').forEach((element) => {
    if (FORBIDDEN_TAGS.has(element.tagName)) {
      element.remove();
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || name === 'style' || name === 'id' || name === 'class') {
        element.removeAttribute(attribute.name);
      }
    });
  });

  return documentNode.body.innerHTML.trim();
}

export function stripRichText(html) {
  if (!html) {
    return '';
  }

  const parser = new DOMParser();
  const documentNode = parser.parseFromString(html, 'text/html');
  return (documentNode.body.textContent || '').replace(/\s+/g, ' ').trim();
}

export function isRichTextEmpty(html) {
  return stripRichText(html).length === 0;
}

export function richTextPreview(html, maxLength = 100) {
  const text = stripRichText(html);
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}

export function renderRichTextMarkup(html, fallback = '') {
  const input = html || '';
  const markup = /<[^>]+>/.test(input) ? input : preservePlainTextLineBreaks(input);
  const sanitized = sanitizeRichText(markup);
  if (!sanitized) {
    return fallback;
  }

  return sanitized;
}

export function preservePlainTextLineBreaks(text) {
  if (!text) {
    return '';
  }

  return text
    .split(/\r?\n/)
    .map((line) => `<p>${line.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]))}</p>`)
    .join('');
}

export function hasRichTextBlockContent(html) {
  if (!html) {
    return false;
  }

  const parser = new DOMParser();
  const documentNode = parser.parseFromString(html, 'text/html');
  return Array.from(documentNode.body.children).some((element) => BLOCK_TAGS.has(element.tagName));
}