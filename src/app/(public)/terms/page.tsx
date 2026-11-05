import type { Metadata } from 'next';
import Link from 'next/link';
import { absoluteUrl, repositoryUrl, siteName } from '@/lib/site';

const title = 'Terms of service';
const description =
  'The terms for using an instance of Daymark: acceptable use, ownership of your content, availability of beta open-source software, the MIT licence, account responsibilities, termination and liability.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: absoluteUrl('/terms') },
  openGraph: { url: absoluteUrl('/terms'), title: `${title} · ${siteName}`, description },
};

export default function TermsPage() {
  return (
    <>
      <header className="site-page-head">
        <div className="site-container">
          <p className="eyebrow">
            <span aria-hidden="true" />
            Legal
          </p>
          <h1>Terms of service</h1>
          <p className="lede">
            These terms apply between you and the operator of this instance of {siteName}. They are
            short because the software is simple: you put your records in, you take them out
            whenever you like.
          </p>
        </div>
      </header>

      <div className="site-container site-legal">
        <div className="site-prose">
          <p className="site-prose-meta">Last updated 5 November 2026.</p>

          <section id="agreement" aria-labelledby="agreement-title">
            <h2 id="agreement-title">The agreement</h2>
            <p>
              By creating an account on this instance you agree to these terms. The operator is the
              person or organisation running this instance. The authors of the {siteName} software
              are not a party to this agreement unless they are also the operator.
            </p>
          </section>

          <section id="use" aria-labelledby="use-title">
            <h2 id="use-title">Acceptable use</h2>
            <p>Use the service for its purpose: recording and reviewing your own work. Do not:</p>
            <ul>
              <li>attempt to access accounts or data that are not yours;</li>
              <li>probe, scan or overload the instance, or interfere with other users’ access;</li>
              <li>upload content that is unlawful, or that you do not have the right to store;</li>
              <li>use the service to send unsolicited messages or to harass anyone;</li>
              <li>circumvent registration limits, invitation codes or email verification.</li>
            </ul>
          </section>

          <section id="content" aria-labelledby="content-title">
            <h2 id="content-title">Your content remains yours</h2>
            <p>
              Everything you enter (tasks, time, notes, journal entries, references and the rest)
              belongs to you. The operator receives only the permission needed to store it and show
              it back to you. The operator does not sell it, use it to train anything, or share it
              with third parties, other than the hosting and email providers needed to run the
              instance. You can export it as JSON or CSV and delete it at any time from{' '}
              <strong>Settings</strong>.
            </p>
          </section>

          <section id="software" aria-labelledby="software-title">
            <h2 id="software-title">The software and its licence</h2>
            <p>
              {siteName} is free and open-source software released under the{' '}
              <a href={`${repositoryUrl}/blob/main/LICENSE`}>MIT License</a>. You may run your own
              copy under that licence. These terms govern the use of this hosted instance, not the
              software itself.
            </p>
          </section>

          <section id="availability" aria-labelledby="availability-title">
            <h2 id="availability-title">Availability</h2>
            <p>
              The service is provided as is and as available. {siteName} is early, actively
              developed software; features may change, and the operator may take the instance
              offline for maintenance, updates or any other reason. There is no promise of
              uninterrupted service, and no service level is guaranteed unless the operator agrees
              one with you in writing.
            </p>
            <p>
              The operator should take regular database backups, but you are encouraged to keep your
              own exports of anything you cannot afford to lose.
            </p>
          </section>

          <section id="accounts" aria-labelledby="accounts-title">
            <h2 id="accounts-title">Your account</h2>
            <ul>
              <li>
                Give a real email address: it is how your password is reset and how deletion is
                confirmed.
              </li>
              <li>Keep your password private. Activity under your account is treated as yours.</li>
              <li>One person per account. Do not share an account.</li>
              <li>You must be at least 16 years old to create an account.</li>
            </ul>
          </section>

          <section id="termination" aria-labelledby="termination-title">
            <h2 id="termination-title">Ending the agreement</h2>
            <p>
              You may delete your account at any time from <strong>Settings</strong>; after email
              confirmation your account and all its records are removed. The operator may suspend or
              delete an account that breaks these terms, or close the instance altogether; where
              reasonably possible the operator will give notice so you can export your data first.
            </p>
          </section>

          <section id="liability" aria-labelledby="liability-title">
            <h2 id="liability-title">Limitation of liability</h2>
            <p>
              To the extent permitted by the law that applies to you, the operator is not liable for
              indirect, incidental or consequential damages, or for loss of data, profits or
              goodwill, arising from your use of or inability to use the service. Where liability
              cannot be excluded, it is limited to the amount you paid the operator for the service
              in the twelve months before the claim, which for a free instance is nothing. Nothing
              in these terms excludes liability that cannot be excluded by law.
            </p>
          </section>

          <section id="law" aria-labelledby="law-title">
            <h2 id="law-title">Governing law</h2>
            <p>
              The operator may specify the governing law and venue for disputes about this instance.
              Where none is specified, the law of the place where the operator is established
              applies, and disputes are brought before its courts, without prejudice to mandatory
              consumer protections where you live.
            </p>
          </section>

          <section id="changes" aria-labelledby="changes-title">
            <h2 id="changes-title">Changes</h2>
            <p>
              The operator may update these terms when the software or the way the instance is run
              changes. The date at the top shows the current version. Continuing to use the service
              after a change means you accept the updated terms; if you do not, export your data and
              delete your account.
            </p>
            <p className="site-prose-meta">
              See also the <Link href="/privacy">privacy policy</Link>. Questions about these terms
              go to the operator of this instance.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
