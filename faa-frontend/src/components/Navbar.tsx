'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';

export function Navbar() {
  const { user, logout } = useAuth();
  const { lang, setLang } = useLang();
  const { theme, toggle: toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const baseLinks = [
    { href: '/', es: 'Inicio', en: 'Home' },
    { href: '/profile', es: 'Perfil', en: 'Profile' },
  ];
  const links = user?.role === 'admin'
    ? [
        ...baseLinks,
        { href: '/coupons', es: 'Cupones', en: 'Coupons' },
        { href: '/clients', es: 'Clientes', en: 'Clients' },
      ]
    : baseLinks;

  const onLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="site-header sticky top-0 z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="brand-lockup" aria-label="SkyMentor FAA A&P Trainer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo_1.png" alt="SkyMentor" className="brand-logo h-16 w-auto sm:h-20" />
        </Link>

        {user && (
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegación principal">
            {links.map((l) => {
              const linkPath = l.href.split('?')[0];
              const isActive = pathname === linkPath;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                >
                  {lang === 'es' ? l.es : l.en}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button onClick={toggleTheme} className="header-icon-button" title={theme === 'dark' ? 'Usar modo claro' : 'Usar modo oscuro'} aria-label={theme === 'dark' ? 'Usar modo claro' : 'Usar modo oscuro'}>
            {theme === 'dark'
              ? <Sun size={17} strokeWidth={2.25} aria-hidden="true" />
              : <Moon size={17} strokeWidth={2.25} aria-hidden="true" />}
          </button>
          <div className="language-switcher" role="group" aria-label="Idioma / Language">
            <button onClick={() => setLang('es')} className={`language-option ${lang === 'es' ? 'language-option-active' : ''}`} aria-pressed={lang === 'es'} title="Español">ES</button>
            <button onClick={() => setLang('en')} className={`language-option ${lang === 'en' ? 'language-option-active' : ''}`} aria-pressed={lang === 'en'} title="English">EN</button>
          </div>
          {user ? (
              <button onClick={onLogout} className="header-logout">
              {lang === 'es' ? 'Salir' : 'Log out'}
              </button>
          ) : (
            <Link href="/login" className="header-login">
              {lang === 'es' ? 'Entrar' : 'Log in'}
            </Link>
          )}
        </div>
      </div>
      {user && (
        <nav className="mobile-nav md:hidden" aria-label="Navegación móvil">
          <div className={`mx-auto grid max-w-6xl gap-2 px-4 pb-4 sm:px-6 ${links.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {links.map((l) => {
              const linkPath = l.href.split('?')[0];
              const isActive = pathname === linkPath;
              return (
                <Link key={l.href} href={l.href} className={`nav-link text-center ${isActive ? 'nav-link-active' : ''}`}>
                  {lang === 'es' ? l.es : l.en}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
