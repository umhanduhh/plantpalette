import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

const BLOG_DIR = path.join(process.cwd(), 'content/blog');

export type BlogFaqItem = {
  question: string;
  answer: string;
};

export type BlogFrontmatter = {
  title: string;
  description: string;
  keyword: string;
  secondaryKeywords?: string[];
  date: string;
  faq?: BlogFaqItem[];
};

export type BlogPost = BlogFrontmatter & {
  slug: string;
  html: string;
};

export type BlogPostSummary = BlogFrontmatter & {
  slug: string;
};

function slugFromFilename(filename: string): string {
  return filename.replace(/\.md$/, '');
}

export function getAllSlugs(): string[] {
  return fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md')).map(slugFromFilename);
}

export function getPostBySlug(slug: string): BlogPost {
  const raw = fs.readFileSync(path.join(BLOG_DIR, `${slug}.md`), 'utf8');
  const { data, content } = matter(raw);
  const frontmatter = data as BlogFrontmatter;
  return {
    ...frontmatter,
    slug,
    html: marked.parse(content, { async: false }) as string,
  };
}

export function getAllPosts(): BlogPostSummary[] {
  return getAllSlugs()
    .map((slug) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, `${slug}.md`), 'utf8');
      const { data } = matter(raw);
      return { ...(data as BlogFrontmatter), slug };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}
