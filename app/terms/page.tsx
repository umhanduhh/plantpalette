import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | Plate Palette',
  description: 'The terms that govern your use of Plate Palette.',
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen px-4 py-12 font-[family-name:var(--font-poppins)]" style={{ background: 'var(--canvas)' }}>
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm inline-block mb-8" style={{ color: 'var(--faint)' }}>
          &larr; Back to Home
        </Link>

        <article className="pp-card p-8" style={{ color: 'var(--body-text)' }}>
          <h1 className="text-4xl font-[family-name:var(--font-playfair)] font-bold mb-2" style={{ color: 'var(--ink)' }}>
            Terms of Service
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
            Last updated: August 20, 2026
          </p>

          <p className="mb-6 leading-relaxed">
            Welcome to Plate Palette. By using our app, you agree to the following terms.
          </p>

          <Section title="Using Plate Palette">
            <p className="mb-3 leading-relaxed">
              Plate Palette is a plant-based food variety tracker. You may use it only for lawful purposes and in
              accordance with these terms.
            </p>
            <p className="mb-3 leading-relaxed">You are responsible for:</p>
            <List
              items={[
                'The accuracy of information you provide',
                'Maintaining the security of your account',
                'Any activity that happens under your account',
              ]}
            />
          </Section>

          <Section title="Your Content">
            <p className="leading-relaxed">
              Any recipes, meal plans, or other content you create in Plate Palette remains yours. By using the app, you
              give us permission to store and display that content back to you as part of providing the service.
            </p>
          </Section>

          <Section title="Account Termination">
            <p className="mb-3 leading-relaxed">
              You may stop using Plate Palette and request deletion of your account at any time by contacting us at{' '}
              <strong>platepaletteusers@gmail.com</strong>.
            </p>
            <p className="leading-relaxed">
              We may suspend or terminate accounts that violate these terms or are used for unlawful purposes.
            </p>
          </Section>

          <Section title="No Warranty">
            <p className="leading-relaxed">
              Plate Palette is provided &quot;as is,&quot; without warranties of any kind. We do not guarantee the app
              will be error-free, uninterrupted, or suitable for any particular purpose. Plate Palette is not a
              substitute for professional nutrition, dietary, or medical advice.
            </p>
          </Section>

          <Section title="Limitation of Liability">
            <p className="leading-relaxed">
              To the fullest extent permitted by law, Plate Palette and its creators are not liable for any indirect,
              incidental, or consequential damages arising from your use of the app.
            </p>
          </Section>

          <Section title="Changes to These Terms">
            <p className="leading-relaxed">
              We may update these terms from time to time. Continued use of the app after changes means you accept the
              updated terms.
            </p>
          </Section>

          <Section title="Contact Us">
            <p className="leading-relaxed">
              Questions about these terms? Contact us at <strong>platepaletteusers@gmail.com</strong>.
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
