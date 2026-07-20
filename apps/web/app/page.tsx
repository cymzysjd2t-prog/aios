import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-base px-6 text-center">
      <h1 className="max-w-2xl font-display text-4xl font-medium text-primary">
        Votre entreprise, pilotée par une équipe d&apos;agents IA
      </h1>
      <p className="max-w-xl text-secondary">
        Donnez vos objectifs. L&apos;IA construit, gère et fait grandir votre entreprise à votre place.
      </p>
      <div className="flex gap-3">
        <Link
          href="/sign-up"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Commencer gratuitement
        </Link>
        <Link
          href="/sign-in"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-primary transition-colors hover:border-border-strong"
        >
          Se connecter
        </Link>
      </div>
    </main>
  );
}
