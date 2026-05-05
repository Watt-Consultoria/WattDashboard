'use client';

import * as React from 'react';

type MarkdownViewerProps = {
  content: string;
};

const inlinePattern =
  /(!\[([^\]]*)\]\(([^)]+)\))|(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;

const getSafeUrl = (url: string) => {
  const trimmed = url.trim();
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }

  return '#';
};

const renderInline = (text: string) => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(inlinePattern)) {
    if (match.index === undefined) continue;

    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      const imageUrl = getSafeUrl(match[3]);
      parts.push(
        <img
          key={`${match.index}-image`}
          src={imageUrl}
          alt={match[2] || 'Imagem do tutorial'}
          className='my-4 max-h-[420px] w-full rounded-md border object-contain'
        />
      );
    } else if (match[4]) {
      const linkUrl = getSafeUrl(match[6]);
      parts.push(
        <a
          key={`${match.index}-link`}
          href={linkUrl}
          target='_blank'
          rel='noreferrer'
          className='text-primary underline underline-offset-4'
        >
          {match[5]}
        </a>
      );
    } else if (match[7]) {
      parts.push(
        <strong key={`${match.index}-strong`} className='font-semibold'>
          {match[8]}
        </strong>
      );
    } else if (match[9]) {
      parts.push(
        <em key={`${match.index}-em`} className='italic'>
          {match[10]}
        </em>
      );
    } else if (match[11]) {
      parts.push(
        <code
          key={`${match.index}-code`}
          className='bg-muted rounded px-1.5 py-0.5 text-[0.9em]'
        >
          {match[12]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  const lines = content.trimStart().split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];
  let codeLines: string[] = [];
  let inCode = false;

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className='my-3 list-disc space-y-1 pl-6'>
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`}>{renderInline(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  const flushCode = () => {
    blocks.push(
      <pre
        key={`code-${blocks.length}`}
        className='bg-muted my-4 overflow-x-auto rounded-md p-4 text-sm'
      >
        <code>{codeLines.join('\n')}</code>
      </pre>
    );
    codeLines = [];
  };

  lines.forEach((line) => {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        flushCode();
      } else {
        flushList();
      }
      inCode = !inCode;
      return;
    }

    if (inCode) {
      codeLines.push(line);
      return;
    }

    if (!line.trim()) {
      flushList();
      return;
    }

    const listMatch = line.match(/^\s*[-*]\s+(.+)$/);
    if (listMatch) {
      listItems.push(listMatch[1]);
      return;
    }

    flushList();

    if (line.startsWith('### ')) {
      blocks.push(
        <h3
          key={`h3-${blocks.length}`}
          className='mt-5 text-base font-semibold sm:mt-6 sm:text-lg'
        >
          {renderInline(line.slice(4))}
        </h3>
      );
      return;
    }

    if (line.startsWith('## ')) {
      blocks.push(
        <h2
          key={`h2-${blocks.length}`}
          className='mt-6 text-lg font-semibold sm:mt-7 sm:text-xl'
        >
          {renderInline(line.slice(3))}
        </h2>
      );
      return;
    }

    if (line.startsWith('# ')) {
      blocks.push(
        <h1
          key={`h1-${blocks.length}`}
          className='mt-7 text-xl font-bold sm:mt-8 sm:text-2xl'
        >
          {renderInline(line.slice(2))}
        </h1>
      );
      return;
    }

    if (line.startsWith('> ')) {
      blocks.push(
        <blockquote
          key={`quote-${blocks.length}`}
          className='border-primary/30 text-muted-foreground my-4 border-l-4 pl-4'
        >
          {renderInline(line.slice(2))}
        </blockquote>
      );
      return;
    }

    blocks.push(
      <p key={`p-${blocks.length}`} className='my-3 leading-7'>
        {renderInline(line)}
      </p>
    );
  });

  flushList();
  if (inCode || codeLines.length > 0) flushCode();

  return (
    <div className='min-w-0 text-sm break-words md:text-base [&>*:first-child]:mt-0 [&>*:last-child]:mb-0'>
      {blocks}
    </div>
  );
}
