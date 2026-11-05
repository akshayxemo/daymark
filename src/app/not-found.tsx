import Link from 'next/link';
import { SiteFooter, SiteHeader } from './(public)/site-shell';
import './(public)/public.css';

export default function NotFound() {
  return (
    <div className="site">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="site-notfound">
        <div className="site-container">
          <p className="eyebrow">
            <span aria-hidden="true" />
            404
          </p>
          <h1>There is nothing at this address.</h1>
          <p className="lede">
            The page may have moved, or the link may be out of date. The homepage and the
            documentation are good places to start again.
          </p>
          <div className="site-actions">
            <Link className="btn btn-primary" href="/">
              Back to the homepage
            </Link>
            <Link className="btn btn-outline" href="/docs">
              Read the docs
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
