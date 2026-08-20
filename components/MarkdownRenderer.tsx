import { Text, View, Image, ScrollView, StyleSheet } from 'react-native';

interface MarkdownRendererProps {
  content: string;
  style?: any;
}

export function MarkdownRenderer({ content, style }: MarkdownRendererProps) {
  const blocks = parseMarkdown(content);

  return (
    <View style={[styles.container, style]}>
      {blocks.map((block, index) => renderBlock(block, index))}
    </View>
  );
}

type Block = {
  type: 'heading' | 'paragraph' | 'blockquote' | 'list' | 'code' | 'table' | 'image' | 'hr';
  level?: number;
  content?: string;
  items?: string[];
  code?: { language: string; code: string };
  table?: { headers: string[]; rows: string[][] };
  src?: string;
  alt?: string;
};

function parseMarkdown(content: string): Block[] {
  const lines = content.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code', code: { language, code: codeLines.join('\n') } });
      i++;
      continue;
    }

    // Table
    if (line.includes('|') && i + 1 < lines.length && lines[i + 1].match(/^\|?[-:|]+\|?$/)) {
      const headerLine = line;
      const separatorLine = lines[i + 1];
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(lines[i].split('|').map(cell => cell.trim()).filter(Boolean));
        i++;
      }
      const headers = headerLine.split('|').map(cell => cell.trim()).filter(Boolean);
      blocks.push({ type: 'table', table: { headers, rows } });
      continue;
    }

    // Image
    const imageMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
    if (imageMatch) {
      blocks.push({ type: 'image', alt: imageMatch[1], src: imageMatch[2] });
      i++;
      continue;
    }

    // HR
    if (line.match(/^---+$/)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      blocks.push({ type: 'heading', level, content: line.slice(headingMatch[0].length) });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      blocks.push({ type: 'blockquote', content: line.slice(2) });
      i++;
      continue;
    }

    // List
    if (line.match(/^[-*] /) || line.match(/^\d+\. /)) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].match(/^[-*] /) || lines[i].match(/^\d+\. /))) {
        items.push(lines[i].replace(/^[-*] |\d+\. /, ''));
        i++;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    // Empty
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph
    blocks.push({ type: 'paragraph', content: line });
    i++;
  }

  return blocks;
}

function renderBlock(block: Block, index: number) {
  switch (block.type) {
    case 'heading':
      const headingStyles = [styles.heading1, styles.heading2, styles.heading3, styles.heading4, styles.heading5, styles.heading6];
      return (
        <Text key={index} style={headingStyles[Math.min((block.level || 1) - 1, 5)]}>
          {formatInlineText(block.content || '')}
        </Text>
      );

    case 'paragraph':
      return (
        <Text key={index} style={styles.paragraph}>
          {formatInlineText(block.content || '')}
        </Text>
      );

    case 'blockquote':
      return (
        <View key={index} style={styles.blockquoteContainer}>
          <View style={styles.blockquoteBar} />
          <Text style={styles.blockquote}>{formatInlineText(block.content || '')}</Text>
        </View>
      );

    case 'list':
      return (
        <View key={index} style={styles.listContainer}>
          {block.items?.map((item, i) => (
            <Text key={i} style={styles.listItem}>
              {'\u2022'} {formatInlineText(item)}
            </Text>
          ))}
        </View>
      );

    case 'code':
      return (
        <View key={index} style={styles.codeBlock}>
          {block.code?.language && (
            <Text style={styles.codeLanguage}>{block.code.language}</Text>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text style={styles.codeText}>{block.code?.code}</Text>
          </ScrollView>
        </View>
      );

    case 'table':
      return (
        <ScrollView key={index} horizontal showsHorizontalScrollIndicator={false} style={styles.tableContainer}>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              {block.table?.headers.map((header, i) => (
                <View key={i} style={styles.tableCell}>
                  <Text style={styles.tableHeaderText}>{formatInlineText(header)}</Text>
                </View>
              ))}
            </View>
            {block.table?.rows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.tableRow}>
                {row.map((cell, cellIndex) => (
                  <View key={cellIndex} style={styles.tableCell}>
                    <Text style={styles.tableCellText}>{formatInlineText(cell)}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      );

    case 'image':
      return (
        <View key={index} style={styles.imageContainer}>
          <Image source={{ uri: block.src }} style={styles.image} resizeMode="cover" />
          {block.alt && <Text style={styles.imageAlt}>{block.alt}</Text>}
        </View>
      );

    case 'hr':
      return <View key={index} style={styles.horizontalRule} />;

    default:
      return null;
  }
}

function formatInlineText(text: string): (string | any)[] {
  const parts: (string | any)[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    // Color syntax: {color:red}text{/color} or ::red::text::/::
    const colorMatch = remaining.match(/\{color:(#[a-fA-F0-9]{3,6}|[a-zA-Z]+)\}(.*?)\{\/color\}/);
    const colorMatch2 = remaining.match(/::(#[a-fA-F0-9]{3,6}|[a-zA-Z]+)::(.*?)::\/::/);

    // Bold + Italic
    const boldItalicMatch = remaining.match(/\*\*\*(.*?)\*\*\*/);
    // Bold
    const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
    // Italic
    const italicMatch = remaining.match(/\*(.*?)\*/);
    // Strikethrough
    const strikeMatch = remaining.match(/~~(.*?)~~/);
    // Code inline
    const codeMatch = remaining.match(/`(.*?)`/);
    // Image inline
    const imgMatch = remaining.match(/!\[(.*?)\]\((.*?)\)/);

    const matches = [
      colorMatch ? { match: colorMatch, type: 'color', index: colorMatch.index! } : null,
      colorMatch2 ? { match: colorMatch2, type: 'color', index: colorMatch2.index! } : null,
      boldItalicMatch ? { match: boldItalicMatch, type: 'boldItalic', index: boldItalicMatch.index! } : null,
      boldMatch ? { match: boldMatch, type: 'bold', index: boldMatch.index! } : null,
      italicMatch ? { match: italicMatch, type: 'italic', index: italicMatch.index! } : null,
      strikeMatch ? { match: strikeMatch, type: 'strike', index: strikeMatch.index! } : null,
      codeMatch ? { match: codeMatch, type: 'code', index: codeMatch.index! } : null,
      imgMatch ? { match: imgMatch, type: 'image', index: imgMatch.index! } : null,
    ].filter(Boolean).sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const earliest = matches[0]!;
    const key = `fmt-${keyIndex++}`;

    if (earliest.index > 0) {
      parts.push(remaining.slice(0, earliest.index));
    }

    switch (earliest.type) {
      case 'color':
        const colorVal = earliest.match[1];
        const colorText = earliest.match[2];
        parts.push(<Text key={key} style={{ color: colorVal }}>{formatInlineText(colorText)}</Text>);
        break;
      case 'boldItalic':
        parts.push(<Text key={key} style={styles.boldItalic}>{earliest.match[1]}</Text>);
        break;
      case 'bold':
        parts.push(<Text key={key} style={styles.bold}>{earliest.match[1]}</Text>);
        break;
      case 'italic':
        parts.push(<Text key={key} style={styles.italic}>{earliest.match[1]}</Text>);
        break;
      case 'strike':
        parts.push(<Text key={key} style={styles.strikethrough}>{earliest.match[1]}</Text>);
        break;
      case 'code':
        parts.push(<Text key={key} style={styles.inlineCode}>{earliest.match[1]}</Text>);
        break;
      case 'image':
        parts.push(
          <Image key={key} source={{ uri: earliest.match[2] }} style={styles.inlineImage} />
        );
        break;
    }

    remaining = remaining.slice(earliest.index + earliest.match[0].length);
  }

  return parts;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heading1: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  heading2: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 14,
    marginBottom: 6,
  },
  heading3: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 4,
  },
  heading4: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 10,
    marginBottom: 4,
  },
  heading5: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 2,
  },
  heading6: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 6,
    marginBottom: 2,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    color: '#1f2937',
    marginBottom: 8,
  },
  blockquoteContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  blockquoteBar: {
    width: 4,
    backgroundColor: '#0ea5e9',
    borderRadius: 2,
    marginRight: 12,
  },
  blockquote: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#0369a1',
    fontStyle: 'italic',
  },
  listContainer: {
    marginVertical: 8,
  },
  listItem: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1f2937',
    paddingVertical: 2,
  },
  codeBlock: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  codeLanguage: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '500',
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 14,
    lineHeight: 22,
    color: '#e2e8f0',
  },
  tableContainer: {
    marginVertical: 8,
  },
  table: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  tableCell: {
    flex: 1,
    padding: 10,
    minWidth: 80,
    justifyContent: 'center',
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  tableCellText: {
    fontSize: 14,
    color: '#1f2937',
  },
  imageContainer: {
    marginVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 240,
    borderRadius: 12,
  },
  inlineImage: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  imageAlt: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  horizontalRule: {
    height: 2,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
    borderRadius: 1,
  },
  bold: {
    fontWeight: '700',
    color: '#111827',
  },
  italic: {
    fontStyle: 'italic',
    color: '#374151',
  },
  boldItalic: {
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#111827',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  inlineCode: {
    fontFamily: 'monospace',
    fontSize: 14,
    backgroundColor: '#fef3c7',
    color: '#b45309',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
