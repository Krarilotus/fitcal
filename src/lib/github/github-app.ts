import { z } from "zod";

const GITHUB_API_VERSION = "2022-11-28";
const DEFAULT_ISSUE_LABEL = "feature-request";

const installationLookupSchema = z.object({
  data: z.object({
    id: z.number().int().positive(),
  }),
});

export type GitHubAppRequestClient = {
  request: (route: string, parameters?: Record<string, unknown>) => Promise<unknown>;
};

export type GitHubAppInstance = {
  getInstallationOctokit: (installationId: number) => Promise<GitHubAppRequestClient>;
  octokit: GitHubAppRequestClient;
};

export type GitHubAppFactory = (config: {
  appId: string;
  privateKey: string;
}) => GitHubAppInstance | Promise<GitHubAppInstance>;

export type GitHubFeatureRequestConfig = {
  appId: string;
  installationId?: number;
  issueLabels: string[];
  privateKey: string;
  repoName: string;
  repoOwner: string;
};

function normalizeText(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

function parseIssueLabels(rawValue: string | undefined) {
  const labels = (rawValue ?? DEFAULT_ISSUE_LABEL)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(labels));
}

function readGitHubAppPrivateKey() {
  const rawPrivateKey = process.env.GITHUB_APP_PRIVATE_KEY?.trim();

  if (rawPrivateKey) {
    return normalizeText(rawPrivateKey.replace(/\\n/g, "\n"));
  }

  const base64PrivateKey = process.env.GITHUB_APP_PRIVATE_KEY_BASE64?.trim();

  if (!base64PrivateKey) {
    return null;
  }

  return normalizeText(Buffer.from(base64PrivateKey, "base64").toString("utf8"));
}

function parseOptionalInstallationId(rawValue: string | undefined) {
  if (!rawValue?.trim()) {
    return undefined;
  }

  const value = Number(rawValue.trim());
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

export function getGitHubFeatureRequestConfig(): GitHubFeatureRequestConfig | null {
  const appId = process.env.GITHUB_APP_ID?.trim();
  const repoOwner = process.env.GITHUB_APP_REPO_OWNER?.trim();
  const repoName = process.env.GITHUB_APP_REPO_NAME?.trim();
  const privateKey = readGitHubAppPrivateKey();

  if (!appId || !repoOwner || !repoName || !privateKey) {
    return null;
  }

  return {
    appId,
    privateKey,
    repoOwner,
    repoName,
    installationId: parseOptionalInstallationId(process.env.GITHUB_APP_INSTALLATION_ID),
    issueLabels: parseIssueLabels(process.env.GITHUB_APP_ISSUE_LABELS),
  };
}

export function hasGitHubFeatureRequestConfig() {
  return getGitHubFeatureRequestConfig() != null;
}

async function createGitHubAppInstance(config: {
  appId: string;
  privateKey: string;
}): Promise<GitHubAppInstance> {
  const { App } = await import("octokit");

  return new App({
    appId: config.appId,
    privateKey: config.privateKey,
  }) as GitHubAppInstance;
}

async function resolveInstallationId(
  client: GitHubAppRequestClient,
  config: Pick<GitHubFeatureRequestConfig, "repoName" | "repoOwner">,
) {
  const parsedResponse = installationLookupSchema.safeParse(
    await client.request("GET /repos/{owner}/{repo}/installation", {
      owner: config.repoOwner,
      repo: config.repoName,
      headers: {
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
      },
    }),
  );

  if (!parsedResponse.success) {
    throw new Error("GitHub App installation lookup failed.");
  }

  return parsedResponse.data.data.id;
}

export async function getGitHubFeatureRequestInstallationClient(
  dependencies: {
    createApp?: GitHubAppFactory;
  } = {},
) {
  const config = getGitHubFeatureRequestConfig();

  if (!config) {
    throw new Error("GitHub App feature requests are not configured.");
  }

  const app = await (dependencies.createApp ?? createGitHubAppInstance)({
    appId: config.appId,
    privateKey: config.privateKey,
  });
  const installationId =
    config.installationId ?? (await resolveInstallationId(app.octokit, config));
  const octokit = await app.getInstallationOctokit(installationId);

  return {
    config,
    installationId,
    octokit,
  };
}
