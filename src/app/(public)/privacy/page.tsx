import type { Metadata } from 'next';
import Link from 'next/link';
import { absoluteUrl, repositoryUrl, siteName } from '@/lib/site';

const title = 'Privacy policy';
const description =
  'What a Daymark instance stores, the single session cookie it sets, the transactional emails it sends, where the data lives, how long it is kept and how you export or delete it.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: absoluteUrl('/privacy') },
  openGraph: { url: absoluteUrl('/privacy'), title: `${title} · ${siteName}`, description },
};

export default function PrivacyPage() {
  return (
    <>
      <header className="site-page-head">
        <div className="site-container">
          <p className="eyebrow">
            <span aria-hidden="true" />
            Legal
          </p>
          <h1>Privacy policy</h1>
          <p className="lede">
            This instance of {siteName} is operated by the person or organisation running it. This
            policy describes what the software stores and does with your data. It is written to be
            read, not skimmed.
          </p>
        </div>
      </header>

      <div className="site-container site-legal">
        <div className="site-prose">
          <p className="site-prose-meta">
            Applies to the {siteName} software as published; last updated 5 November 2026.
          </p>

          <section id="operator" aria-labelledby="operator-title">
            <h2 id="operator-title">Who is responsible</h2>
            <p>
              {siteName} is open-source software. Anyone can run their own copy. The person or
              organisation running this particular instance (the operator) is responsible for the
              server, the database and this policy as applied here. Questions about your data on
              this instance go to the operator, not to the authors of the software.
            </p>
          </section>

          <section id="data" aria-labelledby="data-title">
            <h2 id="data-title">What is stored</h2>
            <p>Only what you enter, plus what is needed to keep you signed in:</p>
            <ul>
              <li>
                <strong>Account.</strong> Your name, your email address and a hash of your password.
                The password itself is never stored.
              </li>
              <li>
                <strong>Your records.</strong> Workspaces, projects, tasks, plans, time sessions and
                manual time entries, repositories and references, delivery records, journal entries,
                daily reviews, weekly goals, tags and the settings you choose, such as your
                timezone.
              </li>
              <li>
                <strong>Activity history.</strong> A timeline of changes to your records (for
                example, a task moving from one status to another) with timestamps.
              </li>
              <li>
                <strong>Session and verification data.</strong> Session identifiers, their expiry,
                and short-lived tokens used to verify your email, reset your password, change your
                email or confirm account deletion. Sessions also record the IP address and browser
                user agent they were created from, so you can recognise your own sessions.
              </li>
              <li>
                <strong>Invitations.</strong> If the operator uses invitation codes, the code, the
                email it was issued for (if any) and when it was used.
              </li>
              <li>
                <strong>Server logs.</strong> The application writes operational logs (errors,
                request outcomes) that may contain your user id and request paths. Retention of logs
                is decided by the operator.
              </li>
            </ul>
            <p>
              {siteName} does not build profiles, does not infer anything about you beyond the
              analytics you can see yourself in the app, and does not share your records with
              anyone.
            </p>
          </section>

          <section id="cookies" aria-labelledby="cookies-title">
            <h2 id="cookies-title">Cookies</h2>
            <p>
              The application sets one HTTP-only session cookie, named{' '}
              <code>daymark.session_token</code> (prefixed with <code>__Secure-</code> on https), so
              that you stay signed in. It is strictly necessary for the service and is removed when
              you sign out or when the session expires.
            </p>
            <p>
              There are no advertising cookies, no tracking cookies, no third-party analytics and no
              tracking scripts, on these public pages or inside the application. The software does
              not load fonts, scripts or images from third-party servers.
            </p>
          </section>

          <section id="email" aria-labelledby="email-title">
            <h2 id="email-title">Email</h2>
            <p>
              The operator configures a transactional email provider (Resend or an SMTP server). It
              is used only to send you messages you triggered: email verification, password reset,
              email address change and account deletion confirmation. No newsletters, no product
              announcements, no marketing. The provider will process your email address and the
              content of those messages to deliver them; consult the provider chosen by the operator
              for its own terms.
            </p>
          </section>

          <section id="location" aria-labelledby="location-title">
            <h2 id="location-title">Where the data lives</h2>
            <p>
              Everything is stored in a PostgreSQL database controlled by the operator. That may be
              a database on the operator’s own server (for example the Docker Compose setup) or a
              managed database such as a Supabase project in the operator’s account. The operator
              decides the hosting provider and the region. If the instance is deployed on Vercel,
              the application code runs on Vercel’s infrastructure and connects to that database.
            </p>
          </section>

          <section id="retention" aria-labelledby="retention-title">
            <h2 id="retention-title">How long it is kept</h2>
            <ul>
              <li>
                Your records are kept until you delete them, or until you delete your account.
              </li>
              <li>
                The activity history is append-only while your account exists: individual history
                entries are not edited or removed, so the record stays trustworthy.
              </li>
              <li>
                Deleting your account removes your account and every record you own, including
                history, sessions and tokens. The deletion is confirmed by email before it runs.
              </li>
              <li>
                Database backups taken by the operator may contain your data for as long as the
                operator keeps those backups.
              </li>
            </ul>
          </section>

          <section id="rights" aria-labelledby="rights-title">
            <h2 id="rights-title">Your rights and controls</h2>
            <ul>
              <li>
                <strong>Access and portability.</strong> Export your records as JSON or CSV from{' '}
                <strong>Settings</strong> at any time.
              </li>
              <li>
                <strong>Correction.</strong> Every record you entered can be edited in the app.
              </li>
              <li>
                <strong>Deletion.</strong> Delete your account from <strong>Settings</strong>. You
                will receive an email to confirm; once confirmed, your data is removed.
              </li>
              <li>
                <strong>Everything else.</strong> For requests the app cannot fulfil directly, or to
                exercise rights under the law that applies to you, contact the operator of this
                instance.
              </li>
            </ul>
          </section>

          <section id="security" aria-labelledby="security-title">
            <h2 id="security-title">Security</h2>
            <ul>
              <li>Connections to a production instance are made over HTTPS.</li>
              <li>
                Passwords are hashed with the password hashing provided by Better Auth; they are
                never stored or logged in clear text.
              </li>
              <li>
                Every request is authorised on the server. Records are scoped to the account that
                owns them and are never returned to another account.
              </li>
              <li>
                Sessions are bound to an HTTP-only cookie that scripts in the page cannot read.
              </li>
            </ul>
            <p>
              No software is perfect. If you believe you have found a security problem in {siteName}{' '}
              itself, please report it through the <a href={repositoryUrl}>project repository</a>.
              Problems with this particular instance go to its operator.
            </p>
          </section>

          <section id="children" aria-labelledby="children-title">
            <h2 id="children-title">Children</h2>
            <p>
              {siteName} is not directed to children under 16, and the operator does not knowingly
              keep accounts for them. If you believe a child has created an account, contact the
              operator so it can be removed.
            </p>
          </section>

          <section id="changes" aria-labelledby="changes-title">
            <h2 id="changes-title">Changes to this policy</h2>
            <p>
              This policy may change when the software changes. The version on this page is the one
              in force for this instance; the date at the top tells you when it was last updated.
              Material changes should be announced by the operator.
            </p>
          </section>

          <section id="contact" aria-labelledby="contact-title">
            <h2 id="contact-title">Contact</h2>
            <p>
              Contact the operator of this instance. If you are the operator, replace this sentence
              with how people can reach you.
            </p>
            <p className="site-prose-meta">
              See also the <Link href="/terms">terms of service</Link>.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
