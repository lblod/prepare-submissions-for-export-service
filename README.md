# prepare-submissions-for-export-service
Microservice that listens to the delta notifier and marks a resource for export if it passed the config & export requirements.

```
?resource <http://schema.org/publication> <${PUBLICATION_CONCEPT}>.
```

## Installation
Add the following snippet to your `docker-compose.yml`:

```yml
prepare-submissions-for-export:
  image: lblod/prepare-submissions-for-export-service

  environment:
    PUBLICATION_CONCEPT: 'http://lblod.data.gift/concepts/83f7b480-fcaf-4795-b603-7f3bce489325' //public-database 
  volumes:
    - ./config/delta-producer/submissions/prepare/:/config
```

Configure the delta-notification service to send notifications on the `/delta` endpoint by adding the following rules in `./delta/rules.js`:

```javascript
export default [
  {
    match: {
      //anything
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

## Config & export files
### Config.json
When a delta is received, this service will fetch data related to the resource. The config file is used to help determin which resource should be exported. You can filter on *decisionTypes*, *orgaan & eenheid* and *regulationTypes*. 

example:
```
{
  "decisionTypes": [
    "https://data.vlaanderen.be/id/concept/BesluitType/a0a709a7-ac07-4457-8d40-de4aea9b1432", // jaarrekening AGB
  ],
  "besluitenlijstOptions": [
    {
      "orgaan": "http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/5ab0e9b8a3b2ca7c5e000005", // Gemeenteraad
      "eenheid": "http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/5ab0e9b8a3b2ca7c5e000001" // Gemeente
    },
  ],
}

```
Whith this config, only resources that have decision type *Advies bij jaarrekening AGB* and are send in by a Gemeenteraads orgaan en gemeente eenheid will be marked for export.

### Export.json 
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

## Environment variable
| ENV  | Description | default | required |
|---|---|---|---|
| PUBLICATION_CONCEPT | URI used to flag a publication for export. | | yes |

## API

### POST /delta
Triggers the preparation of a submission for the export when a submission is sent.
