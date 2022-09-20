# prepare-submissions-for-export-service

Microservice that listens to the delta notifier and prepares sent submissions for export, flagging them following predefined rules.

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
      // anything
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

## Rules and export files

### rules.js

When a delta is received, this service will fetch data related to the resource. The rules file is used to help determin which resource should be exported. Each rule is an object following this format:
```
{
  'documentType': <decision-type-of-the-submission>,
  'matchQuery': (params) => `
    <query-that-should-match-when-submission-fills-some-conditions>
  `,
  'publicationFlag': <value-to-flag-resources-with-when-published>
}
```

### export.json

In the export.json file you specify which type should be exported. Following example will export resources with that are of type `meb:Submission`
```
{
  "export": [
    {
      "type": "http://rdf.myexperiment.org/ontologies/base/Submission"
    },
 ]
}
```

Additionally, you can add more types and the path to the submission document.
```
{
  "export": [
    {
      "type": "http://rdf.myexperiment.org/ontologies/base/Submission"
    },
    {
      "type": "http://mu.semte.ch/vocabularies/ext/SubmissionDocument",
      "pathToSubmission": "?submission <http://purl.org/dc/terms/subject> ?subject; \n a <http://rdf.myexperiment.org/ontologies/base/Submission>."
    },
 ]
}
```

## API

### POST /delta
Triggers the preparation of a submission for the export when a submission is sent.
