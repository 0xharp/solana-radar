import { Github, ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-white/70 backdrop-blur-xl border-t border-white/20 shadow-[0_-2px_10px_rgba(0,0,0,0.03)] sticky bottom-0 z-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-0 py-2.5 sm:py-0 sm:h-11 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span>Built by</span>
            <a
              href="https://x.com/0xharp"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground hover:text-primary transition-colors"
            >
              0xharp&apos;s agent
            </a>
            <span>for the</span>
            <a
              href="https://superteam.fun/earn/listing/develop-a-narrative-detection-and-idea-generation-tool/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              Superteam Bounty
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://x.com/0xharp"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>@0xharp</span>
            </a>
            <a
              href="https://github.com/0xharp/solana-radar"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <Github className="h-3.5 w-3.5" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
