import React from 'react';

/**
 * Simple markdown parser for displaying formatted text
 * Supports: **bold**, *italic*, # headings, - lists, line breaks
 */

interface MarkdownProps {
  content: string;
  className?: string;
}

export const parseMarkdown = (text: string): React.ReactNode[] => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, lineIndex) => {
    // Skip empty lines
    if (!line.trim()) {
      elements.push(<br key={`br-${lineIndex}`} />);
      return;
    }

    // Parse headings (## Heading or # Heading)
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      elements.push(
        <h3 key={`h3-${lineIndex}`} className="text-base font-bold text-gray-900 mt-4 mb-2">
          {parseInline(h2Match[1])}
        </h3>
      );
      return;
    }

    const h1Match = line.match(/^#\s+(.+)$/);
    if (h1Match) {
      elements.push(
        <h2 key={`h2-${lineIndex}`} className="text-lg font-bold text-gray-900 mt-4 mb-2">
          {parseInline(h1Match[1])}
        </h2>
      );
      return;
    }

    // Parse lists (- Item or * Item)
    const listMatch = line.match(/^[\-\*]\s+(.+)$/);
    if (listMatch) {
      elements.push(
        <div key={`list-${lineIndex}`} className="flex items-start space-x-2 ml-4 mb-1">
          <span className="text-gray-600 mt-0.5">•</span>
          <span className="text-sm text-gray-900">{parseInline(listMatch[1])}</span>
        </div>
      );
      return;
    }

    // Parse numbered lists (1. Item)
    const numberedListMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberedListMatch) {
      elements.push(
        <div key={`nlist-${lineIndex}`} className="flex items-start space-x-2 ml-4 mb-1">
          <span className="text-gray-600 mt-0.5">{numberedListMatch[1]}.</span>
          <span className="text-sm text-gray-900">{parseInline(numberedListMatch[2])}</span>
        </div>
      );
      return;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${lineIndex}`} className="text-sm text-gray-900 mb-2 leading-relaxed">
        {parseInline(line)}
      </p>
    );
  });

  return elements;
};

/**
 * Parse inline markdown (bold, italic, etc.)
 */
const parseInline = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let index = 0;

  // Regex patterns for inline formatting
  const patterns = [
    { regex: /\*\*(.+?)\*\*/g, component: 'strong' }, // **bold**
    { regex: /\*(.+?)\*/g, component: 'em' },         // *italic*
    { regex: /__(.+?)__/g, component: 'strong' },      // __bold__
    { regex: /_(.+?)_/g, component: 'em' },            // _italic_
  ];

  // Find all matches and their positions
  const matches: Array<{ start: number; end: number; text: string; component: string }> = [];
  
  patterns.forEach(({ regex, component }) => {
    const regexCopy = new RegExp(regex.source, regex.flags);
    let match;
    while ((match = regexCopy.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[1],
        component,
      });
    }
  });

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);

  // Build the result by processing matches
  let currentPos = 0;
  matches.forEach((match, matchIndex) => {
    // Add text before this match
    if (match.start > currentPos) {
      parts.push(text.slice(currentPos, match.start));
    }

    // Add the formatted match
    if (match.component === 'strong') {
      parts.push(
        <strong key={`strong-${matchIndex}`} className="font-semibold text-gray-900">
          {match.text}
        </strong>
      );
    } else if (match.component === 'em') {
      parts.push(
        <em key={`em-${matchIndex}`} className="italic text-gray-900">
          {match.text}
        </em>
      );
    }

    currentPos = match.end;
  });

  // Add remaining text
  if (currentPos < text.length) {
    parts.push(text.slice(currentPos));
  }

  return parts.length > 0 ? parts : [text];
};

/**
 * Markdown component for rendering markdown text
 */
export const Markdown: React.FC<MarkdownProps> = ({ content, className = '' }) => {
  return (
    <div className={`markdown-content ${className}`}>
      {parseMarkdown(content)}
    </div>
  );
};

