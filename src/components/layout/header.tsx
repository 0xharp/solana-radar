'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Layers, Lightbulb, Radio } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/ideas', label: 'Ideas', icon: Lightbulb },
  { href: '/narratives', label: 'Narratives', icon: Layers },
  { href: '/signals', label: 'Signals', icon: Radio },
  { href: '/methodology', label: 'Methodology', icon: BookOpen },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="Solana Radar" className="h-7 w-7" />
            <div className="flex flex-col">
              <span className="font-semibold text-lg leading-tight">Solana Radar</span>
              <span className="text-[11px] text-muted-foreground leading-tight hidden sm:block tracking-wide">Narrative Detection & Idea Generation</span>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-slate-600 hover:text-foreground hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
