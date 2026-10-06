import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SkyApp',
    short_name: 'SkyApp',
    description: 'FAA A&P exam preparation with study practice, written exams, oral DME rehearsal, and progress tracking.',
    start_url: '/',
    display: 'standalone',
    background_color: '#05080d',
    theme_color: '#071827',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/brand/logo_1.png',
        sizes: '6250x6250',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
