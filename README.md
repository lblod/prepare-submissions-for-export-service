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
