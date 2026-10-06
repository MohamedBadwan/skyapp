'use client';

import Link from 'next/link';
import type { LocalizedLegalDocument } from '@/lib/legalContent';
import { useLang } from '@/context/LangContext';

type LegalDocumentProps = {
  document: LocalizedLegalDocument;
};

export function LegalDocument({ document }: LegalDocumentProps) {
  const { lang } = useLang();
  const content = document[lang];

  return (
    <article className="legal-document">
      <Link href="/register" className="legal-back-link">
        {lang === 'es' ? 'Volver al registro' : 'Back to sign up'}
      </Link>

      <header className="legal-document-header">
        <h1>{content.title}</h1>
        <p>{lang === 'es' ? 'Última actualización:' : 'Last updated:'} {content.updatedAt}</p>
      </header>

      <div className="legal-document-content">
        {content.introduction.map((paragraph) => (
          <p key={paragraph} className="legal-document-intro">{paragraph}</p>
        ))}

        {content.sections.map((section) => (
          <section key={section.title} className="legal-document-section">
            <h2>{section.title}</h2>
            {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.bullets && (
              <ul>
                {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
