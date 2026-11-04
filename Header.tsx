import Link from "next/link";
import { Leaf } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight text-emerald-900">
          <span className="rounded-xl bg-emerald-600 p-2 text-white"><Leaf size={20}/></span>
          <span>NaijaRemoteHub</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm font-semibold">
          <Link className="hidden text-slate-600 hover:text-emerald-700 sm:block" href="/#how-it-works">How it works</Link>
          <Link className="text-slate-600 hover:text-emerald-700" href="/login">Log in</Link>
          <Link className="rounded-full bg-emerald-600 px-4 py-2.5 text-white hover:bg-emerald-700" href="/signup">Join now</Link>
        </nav>
      </div>
    </header>
  );
}
