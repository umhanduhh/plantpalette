import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | Plate Palette',
  description: 'How Plate Palette collects, uses, and protects your information.',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen px-4 py-12 font-[family-name:var(--font-poppins)]" style={{ background: 'var(--canvas)' }}>
      <div className="max-w-2xl mx-auto">
        <Link href="/settings" className="text-sm inline-block mb-8" style={{ color: 'var(--faint)' }}>
          &larr; Back to Settings
        </Link>

        <article className="pp-card p-8" style={{ color: 'var(--body-text)' }}>
          <h1 className="text-4xl font-[family-name:var(--font-playfair)] font-bold mb-2" style={{ color: 'var(--ink)' }}>
            Privacy Policy
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
            Last updated: August 20, 2026
          </p>

          <p className="mb-6 leading-relaxed">
            Plate Palette (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects your privacy. This policy explains what
            information we collect, how we use it, and your choices.
          </p>

          <Section title="Information We Collect">
            <p className="mb-3 leading-relaxed">
              When you sign in with Google, we receive basic profile information from your Google account, including:
            </p>
            <List items={['Your name', 'Your email address', 'Your Google account profile picture (if available)']} />
            <p className="mt-3 mb-3 leading-relaxed">
              We do not access your Gmail messages, Google Drive files, or any other Google data beyond this basic
              profile information.
            </p>
            <p className="leading-relaxed">
              We also collect information you provide directly within the app, such as meal plans, recipes, preferences,
              or other content you create while using Plate Palette.
            </p>
          </Section>

          <Section title="How We Use Your Information">
            <p className="mb-3 leading-relaxed">We use the information we collect to:</p>
            <List
              items={[
                'Create and manage your account',
                'Provide and improve the core features of Plate Palette',
                'Communicate with you about your account or the app, if needed',
              ]}
            />
            <p className="mt-3 leading-relaxed">
              We do not sell your personal information to third parties. We do not use your data for advertising.
            </p>
          </Section>

          <Section title="How We Store and Protect Your Information">
            <p className="leading-relaxed">
              Your data is stored securely using industry-standard hosting and database providers (including Supabase).
              We take reasonable measures to protect your information from unauthorized access, but no method of storage
              or transmission is 100% secure.
            </p>
          </Section>

          <Section title="Sharing Your Information">
            <p className="mb-3 leading-relaxed">
              We do not share your personal information with third parties, except:
            </p>
            <List
              items={[
                'When required by law',
                'With service providers who help us operate the app (such as our hosting/database provider), under obligations to keep your data confidential',
              ]}
            />
          </Section>

          <Section title="Your Choices">
            <p className="mb-3 leading-relaxed">You can:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Request access to the personal information we hold about you</li>
              <li>Request that we delete your account and associated data</li>
              <li>
                Revoke Plate Palette&apos;s access to your Google account at any time via your{' '}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: 'var(--ink)' }}
                >
                  Google Account permissions settings
                </a>
                .
              </li>
            </ul>
            <p className="mt-3 leading-relaxed">
              To make a request, contact us at <strong>platepaletteusers@gmail.com</strong>.
            </p>
          </Section>

          <Section title="Children's Privacy">
            <p className="leading-relaxed">
              Plate Palette is not directed at children under 13, and we do not knowingly collect information from
              children under 13.
            </p>
          </Section>

          <Section title="Changes to This Policy">
            <p className="leading-relaxed">
              We may update this policy from time to time. We will post any changes on this page with an updated
              &quot;Last updated&quot; date.
            </p>
          </Section>

          <Section title="Contact Us">
            <p className="leading-relaxed">
              If you have questions about this policy, contact us at <strong>platepaletteusers@gmail.com</strong>.
            </p>
          </Section>
        </article>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-xl font-[family-name:var(--font-playfair)] font-bold mb-3" style={{ color: 'var(--ink)' }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
