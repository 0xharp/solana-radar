import { RawSignal, Collector } from './types';
import { githubLimiter } from '@/lib/utils/rate-limiter';
import { withRetry } from '@/lib/utils/retry';
import { percentChange } from '@/lib/utils/math';
import { API_URLS, GITHUB, USER_AGENT, TIME } from '@/lib/config';

interface GitHubRepo {
  full_name: string;
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  language: string | null;
  topics: string[];
  owner: { login: string };
}

interface GitHubSearchResult {
  total_count: number;
  items: GitHubRepo[];
}

async function githubFetch<T>(path: string): Promise<T> {
  await githubLimiter.waitForSlot();
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': USER_AGENT,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URLS.github}${path}`, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export class GitHubCollector implements Collector {
  name = 'GitHub';
  category = 'github' as const;

  async collect(since?: Date): Promise<RawSignal[]> {
    const signals: RawSignal[] = [];
    // Default lookback: 14 days for first run, otherwise since last collection
    const sinceDate = since || new Date(Date.now() - TIME.defaultLookbackDays * TIME.msPerDay);

    // 1. Search for trending Solana repos (created or pushed recently)
    const trendingSignals = await this.collectTrendingRepos(sinceDate);
    signals.push(...trendingSignals);

    // 2. Monitor key org activity
    const orgSignals = await this.collectOrgActivity(sinceDate);
    signals.push(...orgSignals);

    // 3. Search for new Solana repos
    const newRepoSignals = await this.collectNewRepos(sinceDate);
    signals.push(...newRepoSignals);

    return signals;
  }

  private async collectTrendingRepos(since: Date): Promise<RawSignal[]> {
    const signals: RawSignal[] = [];
    const sinceStr = since.toISOString().split('T')[0];

    try {
      const result = await withRetry(() =>
        githubFetch<GitHubSearchResult>(
          `/search/repositories?q=solana+pushed:>${sinceStr}+stars:>50&sort=stars&order=desc&per_page=20`
        )
      );

      for (const repo of result.items) {
        const daysSinceUpdate = (Date.now() - new Date(repo.pushed_at).getTime()) / 86400000;
        const starVelocity = repo.stargazers_count / Math.max(1, (Date.now() - new Date(repo.created_at).getTime()) / 86400000);

        signals.push({
          source: 'github',
          sourceUrl: repo.html_url,
          title: `Trending: ${repo.full_name} (${repo.stargazers_count} stars)`,
          description: repo.description || `Active Solana repository with ${repo.stargazers_count} stars`,
          rawData: {
            repoName: repo.full_name,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            issues: repo.open_issues_count,
            language: repo.language,
            topics: repo.topics,
            pushedAt: repo.pushed_at,
            createdAt: repo.created_at,
            starVelocity,
          },
          tags: ['trending', 'repository', ...(repo.topics || []).slice(0, 5)],
          entities: [repo.owner.login, repo.name, ...(repo.topics || []).filter(t => t.includes('solana') || t.includes('defi') || t.includes('nft'))],
          magnitude: Math.min(100, (repo.stargazers_count / 1000) * 50),
          velocity: Math.min(100, starVelocity * 20),
          novelty: daysSinceUpdate < 7 ? 70 : daysSinceUpdate < 14 ? 50 : 30,
          confidence: 75,
          detectedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error collecting trending repos:', error);
    }

    return signals;
  }

  private async collectOrgActivity(since: Date): Promise<RawSignal[]> {
    const signals: RawSignal[] = [];
    // Sample a subset of orgs to stay within rate limits
    const orgsToCheck = GITHUB.orgs.slice(0, 10);

    for (const org of orgsToCheck) {
      try {
        const repos = await withRetry(() =>
          githubFetch<GitHubRepo[]>(`/orgs/${org}/repos?sort=pushed&per_page=5`)
        );

        for (const repo of repos.slice(0, 3)) {
          // Only include repos pushed after our since date
          if (new Date(repo.pushed_at) < since) continue;
          const daysSincePush = (Date.now() - new Date(repo.pushed_at).getTime()) / 86400000;

          signals.push({
            source: 'github',
            sourceUrl: repo.html_url,
            title: `Active dev: ${repo.full_name}`,
            description: repo.description || `Recent development activity in ${org}`,
            rawData: {
              org,
              repoName: repo.full_name,
              stars: repo.stargazers_count,
              pushedAt: repo.pushed_at,
              language: repo.language,
              topics: repo.topics,
            },
            tags: ['org-activity', org, ...(repo.topics || []).slice(0, 3)],
            entities: [org, repo.name],
            magnitude: Math.min(100, (repo.stargazers_count / 500) * 40),
            velocity: daysSincePush < 1 ? 80 : daysSincePush < 3 ? 60 : 40,
            novelty: 50,
            confidence: 80,
            detectedAt: new Date(),
          });
        }
      } catch (error) {
        console.error(`Error collecting org ${org}:`, error);
      }
    }

    return signals;
  }

  private async collectNewRepos(since: Date): Promise<RawSignal[]> {
    const signals: RawSignal[] = [];
    const sinceStr = since.toISOString().split('T')[0];

    try {
      const result = await withRetry(() =>
        githubFetch<GitHubSearchResult>(
          `/search/repositories?q=solana+created:>${sinceStr}&sort=stars&order=desc&per_page=15`
        )
      );

      for (const repo of result.items) {
        if (repo.stargazers_count < 5) continue;

        signals.push({
          source: 'github',
          sourceUrl: repo.html_url,
          title: `New repo: ${repo.full_name}`,
          description: repo.description || `New Solana repository gaining traction`,
          rawData: {
            repoName: repo.full_name,
            stars: repo.stargazers_count,
            createdAt: repo.created_at,
            language: repo.language,
            topics: repo.topics,
          },
          tags: ['new-repo', ...(repo.topics || []).slice(0, 5)],
          entities: [repo.owner.login, repo.name],
          magnitude: Math.min(100, repo.stargazers_count * 5),
          velocity: 70, // New repos are inherently high velocity
          novelty: 90, // New repos are highly novel
          confidence: 60,
          detectedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error collecting new repos:', error);
    }

    return signals;
  }
}
