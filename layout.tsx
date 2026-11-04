import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "NaijaRemoteHub — Learn Remote Work. Earn While You Learn.",
  description: "Discover remote-work learning resources and a community for Nigerians."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Header/>{children}
    <footer className="mt-20 border-t border-emerald-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} NaijaRemoteHub. Learn, build skills and work remotely.
        <p className="mt-2">Membership and referral rewards are subject to the programme terms. Earnings are not guaranteed.</p>
      </div>
    </footer>
  </body></html>;
}
