const core = require("@actions/core");
const google = require("@googleapis/androidpublisher");

const androidpublisher = google.androidpublisher("v3");

const userFractions = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0];
const userFractionsQuicker = [0.01, 0.05, 0.25, 0.5, 1.0];

const getNewUserFraction = (currentFraction) => {
  for (let index = 0; index < userFractions.length; index++) {
    if (userFractions[index] > currentFraction) {
      return userFractions[index];
    }
  }

  return userFractions[userFractions.length - 1];
};

async function run() {
  try {
    const applicationId = core.getInput("applicationId", { required: true });
    const track = core.getInput("track", { required: true });
    const userFractionInput = core.getInput('userFraction', { required: false });
    const serviceAccount = core.getInput("serviceAccount", { required: true });
    const credentials = JSON.parse(serviceAccount);

    if (userFractionInput) {
        const isValid = userFractionInput >= 0.01 && userFractionInput <= 1.00;
        if (!isValid) {
            throw new Error('userFractionInput must be a valid number between 0.01 and 1.00')
        }
    }

    core.info("creating auth client");
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });
    const authClient = await auth.getClient();

    core.info("creating new edit");
    const insertResult = await androidpublisher.edits.insert({
      auth: authClient,
      packageName: applicationId,
    });

    const editId = insertResult.data.id;

    core.info("fetching app tracks from Google Play");
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
    const newUserFraction = userFractionInput || getNewUserFraction(userFraction);

    core.info("posting updated rollout to Google Play");
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
            userFraction: 0.01,
          },
        ],
      },
    });

    core.info("committing changes to Google Play");
    await androidpublisher.edits.commit({
      packageName: applicationId,
      editId,
      auth: authClient,
    });

    core.info(`success, updated rollout to ${newUserFraction}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
