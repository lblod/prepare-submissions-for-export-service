# prepare-submissions-for-export-service

Microservice that listens to the delta notifier and prepares sent submissions for export, flagging them following predefined rules.

## Installation
Add the following snippet to your `docker-compose.yml`:

```yml
prepare-submissions-for-export:
  image: lblod/prepare-submissions-for-export-service
```

Configure the delta-notification service to send notifications on the `/delta` endpoint by adding the following rules in `./delta/rules.js`:

```javascript
export default [
  {
    match: {
      predicate: {
        type: 'uri',
        value: 'http://mu.semte.ch/vocabularies/ext/formSubmissionStatus' // Status of flattened form data
      },
      object: {
        type: 'uri',
        value: 'http://lblod.data.gift/concepts/9bd8d86d-bb10-4456-a84e-91e9507c374c' // Sent
      }    },
    callback: {
      url: 'http://prepare-submissions-for-export/delta',
      method: 'POST'
    },
    options: {
      resourceFormat: 'v0.0.1',
      gracePeriod: 1000,
      ignoreFromSelf: true,
      optOutMuScopeIds: [
                          "http://redpencil.data.gift/id/concept/muScope/deltas/initialSync",
                          "http://redpencil.data.gift/id/concept/muScope/deltas/publicationGraphMaintenance"
                        ]
    }
  },
  {
    match: {
      predicate: {
        type: 'uri',
        value: 'http://www.w3.org/ns/adms#status' // Status of remote-data object coming later
      },
      object: {
        type: 'uri',
        value: 'http://lblod.data.gift/file-download-statuses/success' // cached
      }    },
    callback: {
      url: 'http://prepare-submissions-for-export/delta',
      method: 'POST'
    },
    options: {
      resourceFormat: 'v0.0.1',
      gracePeriod: 1000,
      ignoreFromSelf: true,
      optOutMuScopeIds: [
                          "http://redpencil.data.gift/id/concept/muScope/deltas/initialSync",
                          "http://redpencil.data.gift/id/concept/muScope/deltas/publicationGraphMaintenance"
                        ]
    }
  }
]
```

## Rules and export files

### rules.js

When a delta is received, this service will fetch data related to the resource. The rules file is used to help determin which resource should be exported. Each rule is an object following this format:
```
{
  documentType: <decision-type-of-the-submission>,
  matchQuery: (params) => `
    <query-that-should-match-when-submission-fills-some-conditions>
  `,
  publicationFlag: <value-to-flag-resources-with-when-published>
}
```
See `rules.js` for exact implementation details. Rules should be added there.

## API

### POST /delta
Triggers the preparation of a submission for the export when a submission is sent.

### GET /healing?since=YYYY-MM-DD
Manually re-runs the flagging flow for every submission whose `meb:Submission` was created on or after `since`. Re-flagging is idempotent: existing `schema:publication` flags are deleted before the new ones are inserted.

Returns `200 { count: <number> }` with the number of submissions enqueued, or `400` if `since` is missing/invalid.

### Mini-healing (scheduled)
A configurable cronjob re-runs the flagging flow over a fixed lookback window, so submissions missed by a delta (or flagged incorrectly) get corrected automatically.

| Environment variable | Default | Description |
|----------------------|---------|-------------|
| `MINI_HEALING_ENABLED` | `true` | Set to `false` to disable the scheduled mini-healing entirely. |
| `MINI_HEALING_CRON` | `0 2 * * *` (daily at 02:00) | `node-cron` pattern for the mini-healing schedule. |
| `MINI_HEALING_DAYS` | `7` | Lookback window in days. Every tick re-flags submissions created in the last N days. |

Each tick heals submissions with `dct:created` within the last `MINI_HEALING_DAYS` days. Re-flagging is idempotent (existing `schema:publication` flags are deleted before the new ones are inserted), so overlap between runs is harmless.

> **Note:** `MINI_HEALING_DAYS` must be **at least** the cron period to avoid holes (e.g. weekly cron needs `MINI_HEALING_DAYS >= 7`). Otherwise some submissions may fall between windows and never be healed.
