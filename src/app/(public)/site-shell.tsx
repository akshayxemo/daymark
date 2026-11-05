import Link from 'next/link';
import { ExternalLink, Menu } from 'lucide-react';
import { repositoryUrl, siteName, siteTagline } from '@/lib/site';
import { PublicAuthLink, SignedOut } from './auth-actions';

/**
 * Shared chrome for the public website (header, footer, brand).
 * Account actions check the session on the client so public pages stay static.
 * The mobile menu uses a native <details> element.
 */

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label={`${siteName} home`}>
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      daymark<span className="brand-period">.</span>
    </Link>
  );
}

function NavItems() {
  return (
    <>
      <li>
        <Link href="/features">Features</Link>
      </li>
      <li>
        <Link href="/docs">Docs</Link>
      </li>
      <li>
        <a href={repositoryUrl}>
          GitHub
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      </li>
      <SignedOut>
        <li>
          <Link href="/login">Log in</Link>
        </li>
      </SignedOut>
      <li className="site-nav-cta">
        <PublicAuthLink className="btn btn-primary btn-sm" href="/register">
          Get started
        </PublicAuthLink>
      </li>
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Brand />
        <nav className="site-nav" aria-label="Primary">
          <ul className="site-nav-links">
            <NavItems />
          </ul>
          <details className="site-menu">
            <summary>
              <Menu size={16} aria-hidden="true" />
              Menu
            </summary>
            <ul className="site-menu-panel">
              <NavItems />
            </ul>
          </details>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Brand />
          <p>
            {siteTagline}. An open-source, privacy-first work and life intelligence dashboard you
            can run yourself.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="site-footer-links">
            <li>
              <Link href="/docs">Documentation</Link>
            </li>
            <li>
              <a href={repositoryUrl}>
                GitHub
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            </li>
            <li>
              <Link href="/privacy">Privacy</Link>
            </li>
            <li>
              <Link href="/terms">Terms</Link>
            </li>
            <li>
              <PublicAuthLink href="/login">Log in</PublicAuthLink>
            </li>
          </ul>
        </nav>
        <div className="site-footer-meta">
          <span>{siteName} is free software, released under the MIT License.</span>
          <span>
            <span className="live-dot" aria-hidden="true" />
            No analytics or tracking scripts on this site.
          </span>
        </div>
      </div>
    </footer>
  );
}
