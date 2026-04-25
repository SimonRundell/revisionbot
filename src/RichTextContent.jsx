import { renderRichTextMarkup } from './utils/richText';

function RichTextContent({ value, className = '', fallback = '' }) {
  const markup = renderRichTextMarkup(value, fallback);

  return (
    <div
      className={className ? `rich-text-render ${className}` : 'rich-text-render'}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

export default RichTextContent;