import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllSlugs, getPostBySlug } from '@/lib/blog';

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const slugs = getAllSlugs();
  if (!slugs.includes(slug)) return {};

  const post = getPostBySlug(slug);
  const url = `/blog/${post.slug}`;

  return {
    title: `${post.title} | Plate Palette`,
    description: post.description,
    keywords: [post.keyword, ...(post.secondaryKeywords ?? [])],
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: 'article',
      publishedTime: post.date,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPost({ params }: PageProps) {
  const { slug } = await params;
  const slugs = getAllSlugs();
  if (!slugs.includes(slug)) notFound();

  const post = getPostBySlug(slug);

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { '@type': 'Organization', name: 'Plate Palette' },
  };

  const faqSchema = post.faq?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: post.faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      }
    : null;

  return (
    <div className="min-h-screen px-4 py-12 font-[family-name:var(--font-poppins)]" style={{ background: 'var(--canvas)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      <div className="max-w-2xl mx-auto">
        <Link href="/blog" className="text-sm inline-block mb-8" style={{ color: 'var(--faint)' }}>
          &larr; Back to Blog
        </Link>

        <article className="pp-card p-8">
          <h1
            className="text-3xl sm:text-4xl font-[family-name:var(--font-playfair)] font-bold mb-3"
            style={{ color: 'var(--ink)' }}
          >
            {post.title}
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
            {new Date(post.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              timeZone: 'UTC',
            })}
          </p>

          <div className="pp-prose" dangerouslySetInnerHTML={{ __html: post.html }} />
        </article>
      </div>
    </div>
  );
}
