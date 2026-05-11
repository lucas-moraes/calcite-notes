export function parseFrontmatter(content: string): { tags: string[]; title: string; date: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { tags: [], title: '', date: '' };
  }

  const frontmatter = match[1];
  const tagsMatch = frontmatter.match(/tags:\s*\[(.*?)\]/);
  const titleMatch = frontmatter.match(/title:\s*(.*)/);
  const dateMatch = frontmatter.match(/date:\s*(.*)/);

  let tags: string[] = [];
  if (tagsMatch && tagsMatch[1]) {
    const tagsStr = tagsMatch[1].replace(/['"]/g, '');
    if (tagsStr.trim()) {
      tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    }
  }

  return {
    tags,
    title: titleMatch ? titleMatch[1].trim() : '',
    date: dateMatch ? dateMatch[1].trim() : ''
  };
}

export function updateFrontmatterTags(content: string, tags: string[]): string {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return content;
  }

  const tagsLine = `tags: [${tags.map(t => `'${t}'`).join(', ')}]`;
  let frontmatter = match[1];

  if (frontmatter.includes('tags:')) {
    frontmatter = frontmatter.replace(/tags:\s*\[.*?\]/, tagsLine);
  } else {
    const lines = frontmatter.split('\n');
    const dateIndex = lines.findIndex(l => l.startsWith('date:'));
    if (dateIndex !== -1) {
      lines.splice(dateIndex + 1, 0, tagsLine);
    } else {
      lines.push(tagsLine);
    }
    frontmatter = lines.join('\n');
  }

  return content.replace(frontmatterRegex, `---\n${frontmatter}\n---`);
}

export function updateFrontmatterTitle(content: string, title: string): string {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);

  if (!match) return content;

  let frontmatter = match[1];
  
  if (frontmatter.includes('title:')) {
    frontmatter = frontmatter.replace(/title:\s*.*/, `title: ${title}`);
  } else {
    frontmatter = `title: ${title}\n` + frontmatter;
  }

  return content.replace(frontmatterRegex, `---\n${frontmatter}\n---`);
}