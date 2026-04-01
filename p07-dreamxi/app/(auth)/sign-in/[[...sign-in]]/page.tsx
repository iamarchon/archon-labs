import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="container-mobile min-h-screen px-4 py-10">
      <section className="rounded-[2rem] border border-slate-800 bg-slate-950/70 p-8 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-violet-300">DreamXI</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-50">Sign-in is disabled for prototype review</h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          This build keeps the core fantasy flow publicly accessible for product review and QA. Use the links below to continue through the app without authentication.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link prefetch={false} href="/contests" className="rounded-full bg-violet-500 px-5 py-3 text-sm font-semibold text-slate-950">
            Open contests
          </Link>
          <Link prefetch={false} href="/play/2" className="rounded-full border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300">
            Open match lobby
          </Link>
        </div>
      </section>
    </main>
  );
}
