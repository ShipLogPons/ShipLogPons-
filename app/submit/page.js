import SubmitForm from './SubmitForm';

export const metadata = { title: 'Submit a project' };

export default function Submit() {
  return (
    <section>
      <div className="wrap two">
        <div>
          <h1 className="page-title">Submit your project</h1>
          <p className="lede">
            No fee and no review queue. Shiplog checks your GitHub README and lists the project right away if it passes.
          </p>
          <SubmitForm />
        </div>
        <div className="panel" style={{ marginTop: 8 }}>
          <h2>How verification works</h2>
          <ol className="steps">
            <li>
              <span>
                <strong>With a Pons token:</strong> put the token’s contract address anywhere in your repository’s README.
                That proves the repo belongs to the token, and nobody else can claim it.
              </span>
            </li>
            <li>
              <span>
                <strong>Without a token:</strong> say in your README that the project is built on Robinhood Chain.
              </span>
            </li>
            <li>
              <span>
                Submit the repo below. Shiplog reads the README, confirms the token is a Pons launch, and starts logging your
                releases and code changes.
              </span>
            </li>
          </ol>
          <p className="note">
            Tip: tokens that put a GitHub link in their Pons description or website are found automatically, but they only
            get the verified tick after a submission.
          </p>
        </div>
      </div>
    </section>
  );
}
