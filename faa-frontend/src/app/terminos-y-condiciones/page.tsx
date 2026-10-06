import type { Metadata } from 'next';
import { LegalDocument } from '@/components/LegalDocument';
import { termsAndConditions } from '@/lib/legalContent';

export const metadata: Metadata = {
  title: 'Terms and Conditions | Términos y Condiciones',
  description: 'SkyMentor Academy Terms and Conditions / Términos y Condiciones de SkyMentor Academy.',
};

export default function TermsAndConditionsPage() {
  return <LegalDocument document={termsAndConditions} />;
}
