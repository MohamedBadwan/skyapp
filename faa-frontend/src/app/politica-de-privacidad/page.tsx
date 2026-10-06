import type { Metadata } from 'next';
import { LegalDocument } from '@/components/LegalDocument';
import { privacyPolicy } from '@/lib/legalContent';

export const metadata: Metadata = {
  title: 'Privacy Policy | Política de Privacidad',
  description: 'SkyMentor Academy Privacy Policy / Política de Privacidad de SkyMentor Academy.',
};

export default function PrivacyPolicyPage() {
  return <LegalDocument document={privacyPolicy} />;
}
