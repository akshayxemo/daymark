import type { ReactNode } from 'react';
import { SiteFooter, SiteHeader } from './site-shell';
import './public.css';

export default function PublicLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="site">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  );
}
