import { FormEvent, ReactNode, useEffect, useState } from "react";

const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;

const plans = [
  { id: "starter", name: "Starter", entry: 1000, days: 30, daily: 8, payout: 1200, filled: 64, tag: "" },
  { id: "growth", name: "Growth", entry: 10000, days: 60, daily: 110, payout: 16600, filled: 70, tag: "Popular" },
  { id: "elite", name: "Elite", entry: 50000, days: 90, daily: 725, payout: 115300, filled: 79, tag: "Limited" },
];
type Plan = (typeof plans)[number];

const stats = [
  ["48,320", "Active members"],
  ["6", "Plans in the catalogue"],
  ["KES 128.4M", "Team rewards recorded"],
  ["2,847,113", "Ledger transactions"],
];

const steps = [
  ["Create account", "Sign up with your phone number and verify in minutes."],
  ["Fund your wallet", "Pick an enabled payment method. M-Pesa appears once a Till number is configured."],
  ["Choose a plan", "Match a Starter, Growth or Elite plan to your goal and budget."],
  ["Earn and withdraw", "Track wallet credits and request a withdrawal with a configured payout method."],
];

const ranks = [
  ["Member", "KES 0", "8% / 3% / 1%", "0", "0"],
  ["Bronze", "KES 25,000", "10% / 4% / 1.5%", "3", "5"],
  ["Silver", "KES 120,000", "12% / 5% / 2%", "6", "15"],
  ["Gold", "KES 500,000", "14% / 6% / 2.5%", "10", "40"],
  ["Platinum", "KES 1,500,000", "16% / 7% / 3%", "18", "100"],
  ["Diamond", "KES 5,000,000", "18% / 8% / 3.5%", "30", "250"],
];

const features = [
  ["Payments you can trust", "Members only see methods that are enabled. M-Pesa stays hidden until the Till number and integration are live."],
  ["Numbers before commitment", "Every plan shows its daily projection, duration and total projected payout up front."],
  ["Three-level team rewards", "Follow eligible direct referrals and the two levels beneath them."],
  ["Security by default", "Transaction PINs, two-factor prompts, secure sessions and device management."],
  ["Bonuses in their own wallet", "Campaigns, coupon codes and cashback sit apart from your main balance."],
  ["Support from people", "Reach us on WhatsApp or open a ticket and watch its status."],
];

const faqs = [
  ["How do I review a plan?", "Open any plan to compare entry amount, duration, daily projection, total projected payout, capacity and full terms before you continue."],
  ["How do deposits work?", "Your wallet lists only the payment methods Zentra has enabled. M-Pesa appears after operations configures the Till number. This prototype processes no real payments."],
  ["When can I withdraw?", "Eligible wallet credits can be submitted for withdrawal. Timing, limits and verification steps are shown before you confirm."],
  ["How are team rewards calculated?", "Rewards come from eligible activity across three levels, at the commission rate of your current rank. Eligibility is always visible in your account."],
];

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [onClose]);
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="dialog-head"><h2>{title}</h2><button className="close" onClick={onClose} aria-label="Close">×</button></div>
        {children}
      </div>
    </div>
  );
}

function AuthForm({ mode }: { mode: "signup" | "signin" }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const phoneOk = /^(?:\+254|0)[17]\d{8}$/.test(phone.replace(/\s/g, ""));
  const nameOk = name.trim().length >= 2;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!phoneOk || (mode === "signup" && !nameOk)) return;
    setBusy(true);
    window.setTimeout(() => setBusy(false), 900);
  };
  return (
    <form onSubmit={submit} noValidate>
      <p className="muted">{mode === "signup" ? "This demo does not create a live financial account." : "Sign in to continue to your account."}</p>
      {mode === "signup" && (
        <label className="field">Full name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Amina Kamau" autoComplete="name" aria-invalid={tried && !nameOk} />
          {tried && !nameOk && <em>Enter your full name.</em>}
        </label>
      )}
      <label className="field">Phone number
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 7XX XXX XXX" inputMode="tel" autoComplete="tel" aria-invalid={tried && !phoneOk} />
        {tried && !phoneOk && <em>Use a Kenyan number such as 0712 345 678.</em>}
      </label>
      <label className="check"><input type="checkbox" required /> {mode === "signup" ? "I have read the Terms of Service and Risk Disclosure." : "Keep me signed in on this device."}</label>
      <button className="btn solid wide" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create demo account" : "Sign in"}</button>
    </form>
  );
}

function PlanTerms({ plan, onStart }: { plan: Plan; onStart: () => void }) {
  return (
    <div>
      <dl className="terms">
        <div><dt>Entry</dt><dd>{kes(plan.entry)}</dd></div>
        <div><dt>Duration</dt><dd>{plan.days} days</dd></div>
        <div><dt>Daily projection</dt><dd>{kes(plan.daily)}</dd></div>
        <div><dt>Projected payout</dt><dd>{kes(plan.payout)}</dd></div>
        <div><dt>Capacity filled</dt><dd>{plan.filled}%</dd></div>
      </dl>
      <p className="notice">Projections are estimates, not guaranteed returns. You can lose money. Read the full terms, fees and risks before you invest.</p>
      <button className="btn solid wide" onClick={onStart}>Start with {plan.name}</button>
    </div>
  );
}

function Calculator({ onStart }: { onStart: () => void }) {
  const [id, setId] = useState("growth");
  const p = plans.find((x) => x.id === id)!;
  return (
    <aside className="calc" aria-label="Plan calculator">
      <h2>Check a plan's numbers</h2>
      <div className="tabs" role="radiogroup" aria-label="Plan">
        {plans.map((x) => (
          <button key={x.id} role="radio" aria-checked={x.id === id} className={x.id === id ? "on" : ""} onClick={() => setId(x.id)}>{x.name}</button>
        ))}
      </div>
      <p className="calc-label">Projected payout after {p.days} days</p>
      <p className="calc-big">{kes(p.payout)}</p>
      <div className="bar" aria-hidden="true"><span style={{ width: `${(p.entry / p.payout) * 100}%` }} /></div>
      <div className="bar-key"><span>You put in {kes(p.entry)}</span><span>Projected gain {kes(p.payout - p.entry)}</span></div>
      <dl className="terms small">
        <div><dt>Daily projection</dt><dd>{kes(p.daily)}</dd></div>
        <div><dt>Capacity filled</dt><dd>{p.filled}%</dd></div>
      </dl>
      <p className="notice">Illustrative projection, not a guaranteed return. Your capital is at risk.</p>
      <button className="btn solid wide" onClick={onStart}>Start with {p.name}</button>
    </aside>
  );
}

export default function App() {
  const [menu, setMenu] = useState(false);
  const [dialog, setDialog] = useState<null | "signup" | "signin" | Plan>(null);
  const close = () => setDialog(null);
  const links: [string, string][] = [["plans", "Plans"], ["how-it-works", "How it works"], ["rewards", "Rewards"], ["faqs", "FAQs"]];

  return (
    <>
      <header className="top">
        <nav className="wrap nav" aria-label="Primary">
          <a className="logo" href="#top"><b>Z</b>entra</a>
          <div className={`links ${menu ? "open" : ""}`}>
            {links.map(([h, l]) => <a key={h} href={`#${h}`} onClick={() => setMenu(false)}>{l}</a>)}
          </div>
          <div className="nav-cta">
            <button className="btn quiet" onClick={() => setDialog("signin")}>Sign in</button>
            <button className="btn solid" onClick={() => setDialog("signup")}>Get started</button>
          </div>
          <button className="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? "Close" : "Menu"}</button>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <h1>See what a plan could pay before you commit a shilling.</h1>
              <p className="lead">Zentra shows the entry amount, daily projection and total payout up front, so you decide with the numbers in front of you.</p>
              <div className="row">
                <a className="btn solid" href="#plans">Compare plans</a>
                <button className="btn line" onClick={() => setDialog("signup")}>Create account</button>
              </div>
              <p className="muted small">Secure sessions. Clear terms. You stay in control.</p>
            </div>
            <Calculator onStart={() => setDialog("signup")} />
          </div>
          <div className="wrap">
            <dl className="stats">
              {stats.map(([v, l]) => <div key={l}><dt>{l}</dt><dd>{v}</dd></div>)}
            </dl>
            <p className="muted small">Platform figures are sample data.</p>
          </div>
        </section>

        <section className="section" id="plans">
          <div className="wrap">
            <h2 className="h2">Pick the plan that fits your budget and timeline</h2>
            <p className="sub">Every plan lists what you pay, how long it runs and what it is projected to return.</p>
            <div className="table" role="table" aria-label="Investment plans">
              <div className="tr th" role="row"><span>Plan</span><span>Entry</span><span>Duration</span><span>Daily</span><span>Projected payout</span><span>Capacity</span><span /></div>
              {plans.map((p) => (
                <div className="tr" role="row" key={p.id}>
                  <span data-l="Plan"><strong>{p.name}</strong>{p.tag && <i className="tag">{p.tag}</i>}</span>
                  <span data-l="Entry">{kes(p.entry)}</span>
                  <span data-l="Duration">{p.days} days</span>
                  <span data-l="Daily">{kes(p.daily)}</span>
                  <span data-l="Payout"><strong>{kes(p.payout)}</strong></span>
                  <span data-l="Capacity" className="cap"><span className="meter" role="progressbar" aria-valuenow={p.filled} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} capacity`}><i style={{ width: `${p.filled}%` }} /></span>{p.filled}%</span>
                  <span className="acts"><button className="btn line sm" onClick={() => setDialog(p)}>Terms</button><button className="btn solid sm" onClick={() => setDialog("signup")}>Start</button></span>
                </div>
              ))}
            </div>
            <p className="notice">Projections are illustrative estimates, not guaranteed returns. Review all terms and risks before investing.</p>
          </div>
        </section>

        <section className="section tint" id="how-it-works">
          <div className="wrap">
            <h2 className="h2">From signup to payout in four steps</h2>
            <ol className="steps">
              {steps.map(([t, d], i) => <li key={t}><span className="n">{i + 1}</span><h3>{t}</h3><p>{d}</p></li>)}
            </ol>
            <p className="notice">No real payment is processed in this prototype. Payment methods appear only when configured.</p>
          </div>
        </section>

        <section className="section" id="rewards">
          <div className="wrap">
            <h2 className="h2">Six ranks set your team reward rates</h2>
            <p className="sub">Commission rates are listed for levels 1, 2 and 3. Higher ranks need more team volume and members.</p>
            <div className="table rank" role="table" aria-label="Ranks">
              <div className="tr th" role="row"><span>Rank</span><span>Team volume</span><span>Rates L1 / L2 / L3</span><span>Direct</span><span>Team</span></div>
              {ranks.map((r) => (
                <div className="tr" role="row" key={r[0]}>
                  <span data-l="Rank"><strong>{r[0]}</strong></span><span data-l="Volume">{r[1]}</span><span data-l="Rates">{r[2]}</span><span data-l="Direct">{r[3]}</span><span data-l="Team">{r[4]}</span>
                </div>
              ))}
            </div>
            <p className="notice">Values are sample configuration data. Final eligibility rules appear in your account.</p>
          </div>
        </section>

        <section className="section tint" id="support">
          <div className="wrap split">
            <div>
              <h2 className="h2">Clear by design</h2>
              <p className="sub">A fintech experience where every number explains itself.</p>
            </div>
            <ul className="feat">
              {features.map(([t, d]) => <li key={t}><h3>{t}</h3><p>{d}</p></li>)}
            </ul>
          </div>
        </section>

        <section className="section" id="faqs">
          <div className="wrap split">
            <div>
              <h2 className="h2">Quick answers</h2>
              <p className="sub">Still unsure? Message support on WhatsApp or open a ticket.</p>
            </div>
            <div className="faq">
              {faqs.map(([q, a], i) => <details key={q} open={i === 0}><summary>{q}</summary><p>{a}</p></details>)}
            </div>
          </div>
        </section>

        <section className="cta">
          <div className="wrap cta-in">
            <h2>Ready to compare plans with real numbers?</h2>
            <button className="btn gold" onClick={() => setDialog("signup")}>Create your account</button>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap foot">
          <div><a className="logo" href="#top"><b>Z</b>entra</a><p className="muted small">Investment clarity and team rewards, built around you.</p></div>
          <div><h3>Product</h3>{links.map(([h, l]) => <a key={h} href={`#${h}`}>{l}</a>)}</div>
          <div><h3>Support</h3><a href="#support">Help centre</a><a href="#support">Open a ticket</a><a href="#support">WhatsApp</a></div>
          <div><h3>Legal</h3><a href="#top">Terms of service</a><a href="#top">Privacy policy</a><a href="#top">Risk disclosure</a></div>
        </div>
        <div className="wrap legal small">© 2026 Zentra. Projections are estimates, not guaranteed returns.</div>
      </footer>

      {dialog && typeof dialog === "string" && (
        <Dialog title={dialog === "signup" ? "Create your account" : "Sign in to Zentra"} onClose={close}><AuthForm mode={dialog} /></Dialog>
      )}
      {dialog && typeof dialog !== "string" && (
        <Dialog title={`${dialog.name} plan`} onClose={close}><PlanTerms plan={dialog} onStart={() => setDialog("signup")} /></Dialog>
      )}
    </>
  );
}
