# prepare-submissions-for-export-service
Microservice that listens to the delta notifier and prepares sent submissions for export

## Installation
Add the following snippet to your `docker-compose.yml`:

```yml
prepare-submissions-for-export:
  image: lblod/prepare-submissions-for-export-service
  volumes:
    - ./config/delta-producer/submissions/prepare/:/config
```

Configure the delta-notification service to send notifications on the `/delta` endpoint by adding the following rules in `./delta/rules.js`:

```javascript
export default [
  {
    match: {
      predicate: {
        type: 'uri',
        value: 'http://www.w3.org/ns/adms#status'
      },
      object: {
        type: 'uri',
        value: 'http://lblod.data.gift/concepts/9bd8d86d-bb10-4456-a84e-91e9507c374c' // Sent
      }
    },
    callback: {
      url: 'http://prepare-submissions-for-export/delta',
      method: 'POST'
    },
    options: {
      resourceFormat: 'v0.0.1',
      gracePeriod: 1000,
      ignoreFromSelf: true,
      optOutMuScopeIds: [ "http://redpencil.data.gift/id/concept/muScope/deltas/initialSync" ]
    }
  }
]
```

## API

### POST /delta
Triggers the preparation of a submission for the export when a submission is sent.
