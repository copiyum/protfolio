import { Suspense } from "react";

import { GitHubContributions } from "./github-contributions";
import { GitHubContributionsFallback } from "./fallback";
import { getCachedContributions } from "./lib/get-cached-contributions";

const GITHUB_USERNAME = "copiyum";
const GITHUB_PROFILE_URL = "https://github.com/copiyum";

export default function GitHubContributionsDemo() {
  const contributions = getCachedContributions(GITHUB_USERNAME);

  return (
    <Suspense fallback={<GitHubContributionsFallback />}>
      <GitHubContributions
        contributions={contributions}
        githubProfileUrl={GITHUB_PROFILE_URL}
      />
    </Suspense>
  );
}