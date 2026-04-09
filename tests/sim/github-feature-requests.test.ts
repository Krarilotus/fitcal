import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFeatureRequestIssuePayload,
  buildFeatureRequestIssueTitle,
  createGitHubFeatureRequestIssue,
  hasGitHubFeatureRequestConfig,
} from "@/lib/github/feature-requests";
import type { GitHubAppFactory } from "@/lib/github/github-app";

test("feature request title prefers explicit title and trims it", () => {
  const title = buildFeatureRequestIssueTitle({
    title: "   Better timeline filter controls for mobile   ",
    details: "ignored",
  });

  assert.equal(title, "Better timeline filter controls for mobile");
});

test("feature request title falls back to first details line", () => {
  const title = buildFeatureRequestIssueTitle({
    title: "",
    details: "Need a clearer review inbox for open days\nwith grouped sections",
  });

  assert.equal(title, "Feature request: Need a clearer review inbox for open days");
});

test("feature request payload includes requester metadata and labels", () => {
  const payload = buildFeatureRequestIssuePayload(
    {
      title: "New review queue",
      details: "Please add a clearer queue for pending workout reviews.",
      locale: "de",
      requesterEmail: "reviewer@fitcal.test",
      requesterId: "user_123",
      requesterName: "Rita Reviewer",
    },
    { issueLabels: ["feature-request", "fitcal"] },
  );

  assert.equal(payload.title, "New review queue");
  assert.deepEqual(payload.labels, ["feature-request", "fitcal"]);
  assert.match(payload.body, /Rita Reviewer/);
  assert.match(payload.body, /reviewer@fitcal\.test/);
  assert.match(payload.body, /user_123/);
  assert.match(payload.body, /Please add a clearer queue/);
});

test("feature request config presence depends on required env vars", () => {
  const previousAppId = process.env.GITHUB_APP_ID;
  const previousKey = process.env.GITHUB_APP_PRIVATE_KEY;
  const previousOwner = process.env.GITHUB_APP_REPO_OWNER;
  const previousRepo = process.env.GITHUB_APP_REPO_NAME;

  delete process.env.GITHUB_APP_ID;
  delete process.env.GITHUB_APP_PRIVATE_KEY;
  delete process.env.GITHUB_APP_REPO_OWNER;
  delete process.env.GITHUB_APP_REPO_NAME;
  assert.equal(hasGitHubFeatureRequestConfig(), false);

  process.env.GITHUB_APP_ID = "123456";
  process.env.GITHUB_APP_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----";
  process.env.GITHUB_APP_REPO_OWNER = "owner";
  process.env.GITHUB_APP_REPO_NAME = "repo";
  assert.equal(hasGitHubFeatureRequestConfig(), true);

  process.env.GITHUB_APP_ID = previousAppId;
  process.env.GITHUB_APP_PRIVATE_KEY = previousKey;
  process.env.GITHUB_APP_REPO_OWNER = previousOwner;
  process.env.GITHUB_APP_REPO_NAME = previousRepo;
});

test("feature request issue creation authenticates through the GitHub App installation", async () => {
  const previousAppId = process.env.GITHUB_APP_ID;
  const previousKey = process.env.GITHUB_APP_PRIVATE_KEY;
  const previousOwner = process.env.GITHUB_APP_REPO_OWNER;
  const previousRepo = process.env.GITHUB_APP_REPO_NAME;
  const previousLabels = process.env.GITHUB_APP_ISSUE_LABELS;
  const previousInstallationId = process.env.GITHUB_APP_INSTALLATION_ID;

  process.env.GITHUB_APP_ID = "123456";
  process.env.GITHUB_APP_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----";
  process.env.GITHUB_APP_REPO_OWNER = "Krarilotus";
  process.env.GITHUB_APP_REPO_NAME = "fitcal";
  process.env.GITHUB_APP_ISSUE_LABELS = "feature-request,fitcal";
  delete process.env.GITHUB_APP_INSTALLATION_ID;

  let capturedInstallationLookup:
    | { params?: Record<string, unknown>; route: string }
    | undefined;
  let capturedInstallationId: number | undefined;
  let capturedIssueCreation:
    | { params?: Record<string, unknown>; route: string }
    | undefined;

  const createApp: GitHubAppFactory = () => ({
    octokit: {
      request: async (route, params) => {
        capturedInstallationLookup = { route, params };
        return {
          data: {
            id: 987654,
          },
        };
      },
    },
    getInstallationOctokit: async (installationId) => {
      capturedInstallationId = installationId;

      return {
        request: async (route, params) => {
          capturedIssueCreation = { route, params };
          return {
            data: {
              html_url: "https://github.com/Krarilotus/fitcal/issues/123",
              number: 123,
            },
          };
        },
      };
    },
  });

  const issue = await createGitHubFeatureRequestIssue(
    {
      title: "Review inbox",
      details: "A compact review inbox would help a lot.",
      locale: "en",
      requesterEmail: "reviewer@fitcal.test",
      requesterId: "user_123",
      requesterName: "Rita Reviewer",
    },
    { createApp },
  );

  assert.equal(capturedInstallationLookup?.route, "GET /repos/{owner}/{repo}/installation");
  assert.equal(capturedInstallationLookup?.params?.owner, "Krarilotus");
  assert.equal(capturedInstallationLookup?.params?.repo, "fitcal");
  assert.equal(capturedInstallationId, 987654);
  assert.equal(capturedIssueCreation?.route, "POST /repos/{owner}/{repo}/issues");
  assert.equal(capturedIssueCreation?.params?.owner, "Krarilotus");
  assert.equal(capturedIssueCreation?.params?.repo, "fitcal");
  assert.deepEqual(capturedIssueCreation?.params?.labels, ["feature-request", "fitcal"]);
  assert.equal(issue.number, 123);

  process.env.GITHUB_APP_ID = previousAppId;
  process.env.GITHUB_APP_PRIVATE_KEY = previousKey;
  process.env.GITHUB_APP_REPO_OWNER = previousOwner;
  process.env.GITHUB_APP_REPO_NAME = previousRepo;
  process.env.GITHUB_APP_ISSUE_LABELS = previousLabels;
  process.env.GITHUB_APP_INSTALLATION_ID = previousInstallationId;
});
