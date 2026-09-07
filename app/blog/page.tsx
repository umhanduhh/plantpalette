import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Blog | Plate Palette',
  description: 'Guides on plant diversity, fiber, and gut health from Plate Palette.',
};

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen px-4 py-12 font-[family-name:var(--font-poppins)]" style={{ background: 'var(--canvas)' }}>
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm inline-block mb-8" style={{ color: 'var(--faint)' }}>
          &larr; Back to Home
        </Link>

        <h1 className="text-4xl font-[family-name:var(--font-playfair)] font-bold mb-8" style={{ color: 'var(--ink)' }}>
          Blog
        </h1>

        <div className="flex flex-col" style={{ gap: 16 }}>
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="pp-card block p-6 transition-shadow hover:shadow-[0_18px_48px_rgba(26,26,26,.13)]"
            >
              <h2 className="text-xl font-[family-name:var(--font-playfair)] font-bold mb-2" style={{ color: 'var(--ink)' }}>
                {post.title}
              </h2>
              <p className="leading-relaxed" style={{ color: 'var(--body-text)', fontSize: 14.5 }}>
                {post.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
