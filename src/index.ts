import * as core from "@actions/core";
import * as google from "@googleapis/androidpublisher";

const androidpublisher = google.androidpublisher("v3");

interface ReleaseFractions {
  [key: string]: number[];
}

const releaseFractions: ReleaseFractions = {
  default: [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0],
  quick: [0.01, 0.05, 0.25, 0.5, 1.0],
};

const getNewUserFraction = (
  currentFraction: number,
  strategy?: string
): number => {
  const fractions = releaseFractions[strategy] ?? releaseFractions.default;

  for (let index = 0; index < fractions.length; index++) {
    if (fractions[index] > currentFraction) {
      return fractions[index];
    }
  }

  return fractions[fractions.length - 1];
};

const format = (fraction: number) =>
  (fraction * 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 5,
  }) + "%";

async function run() {
  const applicationId = core.getInput("applicationId", { required: true });
  const track = core.getInput("track", { required: true });
  const userFractionInput = parseFloat(
    core.getInput("userFraction", { required: false })
  );
  const serviceAccount = core.getInput("serviceAccount", { required: true });
  const releaseStrategy = core.getInput("releaseStrategy", { required: false });

  let credentials;

  try {
    credentials = JSON.parse(serviceAccount);
  } catch (error) {
    error.message =
      "There was a problem parsing credentials JSON: " + error.message;
    throw error;
  }

  if (userFractionInput) {
    const isValid = userFractionInput >= 0.01 && userFractionInput <= 1.0;
    if (!isValid) {
      throw new Error(
        "userFraction must be a valid number between 0.01 and 1.00"
      );
    }
  }

  core.info("Setting up auth");
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  const authClient = await auth.getClient();

  core.info("Creating new edit");
  const insertResult = await androidpublisher.edits.insert({
    auth: authClient,
    packageName: applicationId,
  });

  const editId = insertResult.data.id;

  core.info("Fetching app tracks from Google Play");
  const response = await androidpublisher.edits.tracks.get({
    packageName: applicationId,
    track,
    auth: authClient,
    editId,
  });

  const release = response.data.releases.find(
    (release) => release.status === "inProgress"
  );

  if (!release) {
    return core.notice("No inProgress release found");
  }

  const userFraction = release.userFraction;
  const newUserFraction =
    userFractionInput || getNewUserFraction(userFraction, releaseStrategy);
  core.info(
    `Current rollout ${format(userFraction)}, new rollout ${format(
      newUserFraction
    )}`
  );

  core.info("Posting updated rollout to Google Play");
  await androidpublisher.edits.tracks.patch({
    packageName: applicationId,
    track,
    auth: authClient,
    editId,
    requestBody: {
      releases: [
        {
          versionCodes: release.versionCodes,
          status: release.status,
          userFraction: newUserFraction,
        },
      ],
    },
  });

  core.info("Committing changes to Google Play");
  await androidpublisher.edits.commit({
    packageName: applicationId,
    editId,
    auth: authClient,
  });

  core.info(`Success, updated rollout to ${format(newUserFraction)}`);
}

run().catch((error) => {
  core.setFailed(error.message);
});
