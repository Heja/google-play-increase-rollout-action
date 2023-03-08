# Increase Google Play Rollout Percentage

This GitHub Action increases the rollout percentage of an Android app on the Google Play Store. It can be used to gradually release an app update to a larger audience.

## Inputs

### `applicationId` (required)

The application ID of the Android app (e.g. com.example.myapp).

### `track` (optional, default: "production")

The Google Play track to update (e.g. production, beta, alpha).

### `serviceAccount` (required)

The JSON credentials for the Google Play service account.

Note: you will need to set up a Google Play service account and obtain its JSON credentials. See [here](https://developers.google.com/android-publisher/getting_started#using_a_service_account) for more information.

### `userFraction` (optional)

The percentage of new users to release the update to (e.g. 0.1 for 10%). 

**Important:** If this is not specified, the action will automatically increase the rollout percentage based on rollout strategy.

### `releaseStrategy` (optional)

Percent increase strategy for rollout (default, quick). If `userFraction` is not specified, this will be used to automatically determine the new rollout percentage. Defaults to "default" if not specified.

## Outputs

### `rollout-status`

The updated rollout status of the Android app on the Google Play Store.

## Rollout Strategies

The following rollout strategies are available:

- `default`: Rolls out the update in small increments, completing the rollout in 7 days. This strategy follows the same percentages used in the phased rollout on the App Store.
- `quick`: Rolls out the update to larger chunks of users at a time, with fewer incremental increases. Completes the rollout in 5 days.

## Example Usage

```yaml
uses: actions/google-play-rollout@v1
with:
  applicationId: com.example.myapp
  track: production
  serviceAccount: ${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT }}
```
