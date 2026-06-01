export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between p-6">
        <div className="text-lg font-semibold tracking-tight">PrepMind AI</div>
        <nav className="flex items-center gap-3">
          <a className="text-sm text-muted-foreground hover:text-foreground" href="/login">
            Log in
          </a>
          <a
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            href="/signup"
          >
            Get started
          </a>
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-6xl">
          Adaptive AI interviews
          <br />
          that actually get harder.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Upload your resume, get a 30-day prep plan, and practice with an AI that
          remembers your weaknesses, drills them, and grows with you.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <a
            className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
            href="/signup"
          >
            Start free
          </a>
          <a className="text-sm text-muted-foreground hover:text-foreground" href="#how">
            How it works →
          </a>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { n: 1, t: "Upload resume", d: "We extract your skills, projects, and gaps." },
            { n: 2, t: "Get a plan", d: "A 30-day roadmap tuned to your target role." },
            { n: 3, t: "Drill", d: "Adaptive mock interviews that target your weak spots." },
          ].map((s) => (
            <div key={s.n} className="rounded-xl border bg-card p-6">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Step {s.n}
              </div>
              <h3 className="mt-2 text-lg font-medium">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t p-6 text-center text-xs text-muted-foreground">
        © PrepMind AI · Built for engineers getting ready.
      </footer>
    </div>
  );
}
