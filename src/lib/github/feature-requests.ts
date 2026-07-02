import { z } from "zod";
import {
  getGitHubFeatureRequestInstallationClient,
  hasGitHubFeatureRequestConfig,
  type GitHubAppFactory,
} from "@/lib/github/github-app";

const GITHUB_API_VERSION = "2022-11-28";

const issueResponseSchema = z.object({
  data: z.object({
    html_url: z.string().url(),
    number: z.number().int().positive(),
  }),
});

export type FeatureRequestIssueInput = {
  details: string;
  issueCopy: FeatureRequestIssueCopy;
  locale: string;
  requesterName: string | null;
  title?: string | null;
};

export type FeatureRequestIssueCopy = {
  anonymousRequester: string;
  issueHeading: string;
  localeLabel: string;
  requestedViaHeading: string;
  requesterLabel: string;
  titleFallback: string;
  titlePrefix: string;
};

function normalizeText(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

export function buildFeatureRequestIssueTitle(
  input: Pick<FeatureRequestIssueInput, "details" | "issueCopy" | "title">,
) {
  const requestedTitle = normalizeText(input.title ?? "");

  if (requestedTitle) {
    return requestedTitle.slice(0, 120);
  }

  const firstLine = normalizeText(input.details).split("\n")[0] ?? input.issueCopy.titleFallback;
  const compactLine = firstLine.replace(/\s+/g, " ");
  return `${input.issueCopy.titlePrefix}: ${compactLine}`.slice(0, 120);
}

export function buildFeatureRequestIssuePayload(
  input: FeatureRequestIssueInput,
  config?: { issueLabels?: string[] },
) {
  const details = normalizeText(input.details);
  const issueTitle = buildFeatureRequestIssueTitle(input);
  const requesterLabel = input.requesterName?.trim() || input.issueCopy.anonymousRequester;
  const body = [
    `## ${input.issueCopy.issueHeading}`,
    "",
    details,
    "",
    `## ${input.issueCopy.requestedViaHeading}`,
    "",
    `- ${input.issueCopy.requesterLabel}: ${requesterLabel}`,
    `- ${input.issueCopy.localeLabel}: ${input.locale}`,
  ].join("\n");

  return {
    title: issueTitle,
    body,
    labels: config?.issueLabels?.length ? config.issueLabels : undefined,
  };
}

export { hasGitHubFeatureRequestConfig };

export async function createGitHubFeatureRequestIssue(
  input: FeatureRequestIssueInput,
  dependencies: {
    createApp?: GitHubAppFactory;
  } = {},
) {
  const { config, octokit } = await getGitHubFeatureRequestInstallationClient(dependencies);
  const parsedIssue = issueResponseSchema.safeParse(
    await octokit.request("POST /repos/{owner}/{repo}/issues", {
      owner: config.repoOwner,
      repo: config.repoName,
      ...buildFeatureRequestIssuePayload(input, config),
      headers: {
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
      },
    }),
  );

  if (!parsedIssue.success) {
    throw new Error("GitHub issue response could not be parsed.");
  }

  return parsedIssue.data.data;
}
