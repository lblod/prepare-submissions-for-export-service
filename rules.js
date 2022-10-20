import { sparqlEscapeUri } from "mu";

/*
 * This file exports a list of rule objects, which helps with evaluating
 *  whether a submission should be flagged for export or not.
 *
 *  The structure of the rule (TODO: which might be worth a class) looks like:
 *   {
 *     documentType: 'http://uri/of/the/type/of/document' => Used to prefilter the rule, so we don't oveload the db.
 *     matchQuery: formData => { return queryString } => Query representing the rule for a documentype;
                                                      it returns the submission uri if the rule is matched
 *     publicationFlag: 'http://uri/representing/the/flag/to/be/used/for/export'
 *   }
 *
 *  The bulk of this file is boilerplate to generate instances of these rules.
 */

const PREFIXES = `
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX melding: <http://lblod.data.gift/vocabularies/automatische-melding/>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX meb: <http://rdf.myexperiment.org/ontologies/base/>
  PREFIX prov: <http://www.w3.org/ns/prov#>
  PREFIX adms: <http://www.w3.org/ns/adms#>
  PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
  PREFIX pav: <http://purl.org/pav/>
  PREFIX eli: <http://data.europa.eu/eli/ontology#>
  PREFIX mandaat: <http://data.vlaanderen.be/ns/mandaat#>
`;

const STATUS_SENT = 'http://lblod.data.gift/concepts/9bd8d86d-bb10-4456-a84e-91e9507c374c';
const FLAG_FOR_WORSHIP = 'http://lblod.data.gift/concepts/403b71bd-5ab9-4c92-8990-4bb19d5469d1';
const FLAG_FOR_PUBLIC = 'http://lblod.data.gift/concepts/83f7b480-fcaf-4795-b603-7f3bce489325';

const rules = [];

const decisionTypes = [
  "https://data.vlaanderen.be/id/concept/BesluitType/a0a709a7-ac07-4457-8d40-de4aea9b1432",
  "https://data.vlaanderen.be/id/concept/BesluitType/8bdc614a-d2f2-44c0-8cb1-447b1017d312",
  "https://data.vlaanderen.be/id/concept/BesluitType/e44c535d-4339-4d15-bdbf-d4be6046de2c",
  "https://data.vlaanderen.be/id/concept/BesluitType/f56c645d-b8e1-4066-813d-e213f5bc529f",
  "https://data.vlaanderen.be/id/concept/BesluitType/2f189152-1786-4b55-a3a9-d7f06de63f1c",
  "https://data.vlaanderen.be/id/concept/BesluitType/bd0b0c42-ba5e-4acc-b644-95f6aad904c7",
  "https://data.vlaanderen.be/id/concept/BesluitType/380674ee-0894-4c41-bcc1-9deaeb9d464c",
  "https://data.vlaanderen.be/id/concept/BesluitType/1105564e-30c7-4371-a864-6b7329cdae6f",
  "https://data.vlaanderen.be/id/concept/BesluitType/b69c9f18-967c-4feb-90a8-8eea3c8ce46b",
  "https://data.vlaanderen.be/id/concept/BesluitType/f8c070bd-96e4-43a1-8c6e-532bcd771251",
  "https://data.vlaanderen.be/id/concept/BesluitType/fb21d14b-734b-48f4-bd4e-888163fd08e8",
  "https://data.vlaanderen.be/id/concept/BesluitType/c945b531-4742-43fe-af55-b13da6ecc6fe",
  "https://data.vlaanderen.be/id/concept/BesluitType/c417f3da-a3bd-47c5-84bf-29007323a362",
  "https://data.vlaanderen.be/id/concept/BesluitType/849c66c2-ba33-4ac1-a693-be48d8ac7bc7"
];

for (const decisionType of decisionTypes) {
  rules.push(
    {
      'documentType': decisionType,
      'matchQuery': formData => `
        ${PREFIXES}

        SELECT DISTINCT ?submission
        WHERE {
          BIND(${sparqlEscapeUri(formData)} as ?formData)

          ?formData a melding:FormData;
            dct:type ${sparqlEscapeUri(decisionType)}.

          ?submission a meb:Submission;
            prov:generated ?formData;
            adms:status ${sparqlEscapeUri(STATUS_SENT)};
            pav:createdBy ?eenheid.

          FILTER NOT EXISTS {
            VALUES ?classificatie {
              <http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/66ec74fd-8cfc-4e16-99c6-350b35012e86>
              <http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/f9cac08a-13c1-49da-9bcb-f650b0604054>
            }
            ?eenheid besluit:classificatie ?classificatie.
          }
        }
        LIMIT 1
      `,
      'publicationFlag': FLAG_FOR_PUBLIC
    }
  );
}

const regulationTypes = [
    "https://data.vlaanderen.be/id/concept/BesluitType/4d8f678a-6fa4-4d5f-a2a1-80974e43bf34",
    "https://data.vlaanderen.be/id/concept/BesluitType/7d95fd2e-3cc9-4a4c-a58e-0fbc408c2f9b",
    "https://data.vlaanderen.be/id/concept/BesluitType/3bba9f10-faff-49a6-acaa-85af7f2199a3",
    "https://data.vlaanderen.be/id/concept/BesluitType/0d1278af-b69e-4152-a418-ec5cfd1c7d0b",
    "https://data.vlaanderen.be/id/concept/BesluitType/84121221-4217-40e3-ada2-cd1379b168e1",
    "https://data.vlaanderen.be/id/concept/BesluitType/efa4ec5a-b006-453f-985f-f986ebae11bc",
    "https://data.vlaanderen.be/id/concept/BesluitType/5ee63f84-2fa0-4758-8820-99dca2bdce7c",
    "https://data.vlaanderen.be/id/concept/BesluitType/25deb453-ae3e-4d40-8027-36cdb48ab738",
    "https://data.vlaanderen.be/id/concept/BesluitType/fb92601a-d189-4482-9922-ab0efc6bc935",
    "https://data.vlaanderen.be/id/concept/BesluitType/a8486fa3-6375-494d-aa48-e34289b87d5b",
    "https://data.vlaanderen.be/id/concept/BesluitType/4673d472-8dbc-4cea-b3ab-f92df3807eb3",
    "https://data.vlaanderen.be/id/concept/BesluitType/e8afe7c5-9640-4db8-8f74-3f023bec3241",
    "https://data.vlaanderen.be/id/concept/BesluitType/e8aee49e-8762-4db2-acfe-2d5dd3c37619",
    "https://data.vlaanderen.be/id/concept/BesluitType/ba5922c9-cfad-4b2e-b203-36479219ba56",
    "https://data.vlaanderen.be/id/concept/BesluitType/d7060f97-c417-474c-abc6-ef006cb61f41",
    "https://data.vlaanderen.be/id/concept/BesluitType/256bd04a-b74b-4f2a-8f5d-14dda4765af9"
];

for (const regulationType of regulationTypes) {
  const documentType = 'https://data.vlaanderen.be/id/concept/BesluitType/67378dd0-5413-474b-8996-d992ef81637a';
  rules.push(
    {
      'documentType': documentType,
      'matchQuery': formData => `
        ${PREFIXES}

        SELECT DISTINCT ?submission
        WHERE {
          BIND(${sparqlEscapeUri(formData)} as ?formData)

          ?formData a melding:FormData;
            dct:type ${sparqlEscapeUri(documentType)};
            dct:type ${sparqlEscapeUri(regulationType)}.

          ?submission a meb:Submission;
            prov:generated ?formData;
            adms:status ${sparqlEscapeUri(STATUS_SENT)};
            pav:createdBy ?eenheid.

          FILTER NOT EXISTS {
            VALUES ?classificatie {
              <http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/66ec74fd-8cfc-4e16-99c6-350b35012e86>
              <http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/f9cac08a-13c1-49da-9bcb-f650b0604054>
            }
            ?eenheid besluit:classificatie ?classificatie.
          }
        }
        LIMIT 1
      `,
      'publicationFlag': FLAG_FOR_PUBLIC
    }
  );
}

const decisionListOptions = [
    {
      "orgaan": "http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/5ab0e9b8a3b2ca7c5e000005",
      "eenheid": "http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/5ab0e9b8a3b2ca7c5e000001"
    },
    {
      "orgaan": "http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/5ab0e9b8a3b2ca7c5e00000a",
      "eenheid": "http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/5ab0e9b8a3b2ca7c5e000003"
    },
    {
      "orgaan": "http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/5ab0e9b8a3b2ca7c5e00000c",
      "eenheid": "http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/5ab0e9b8a3b2ca7c5e000000"
    },
    {
      "orgaan": "http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/013cc838-173a-4657-b1ae-b00c048df943",
      "eenheid": "http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/36a82ba0-7ff1-4697-a9dd-2e94df73b721"
    },
    {
      "orgaan": "http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/013cc838-173a-4657-b1ae-b00c048df943",
      "eenheid": "http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/e8294b73-87c9-4fa2-9441-1937350763c9"
    },
    {
      "orgaan": "http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/b52094ff-21a2-4da8-8dbe-f513365d1528",
      "eenheid": "http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/cd93f147-3ece-4308-acab-5c5ada3ec63d"
    },
    {
      "orgaan": "http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/b52094ff-21a2-4da8-8dbe-f513365d1528",
      "eenheid": "http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/d01bb1f6-2439-4e33-9c25-1fc295de2e71"
    },
    {
      "orgaan": "http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/013cc838-173a-4657-b1ae-b00c048df943",
      "eenheid": "http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/cd93f147-3ece-4308-acab-5c5ada3ec63d"
    },
    {
      "orgaan": "http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/013cc838-173a-4657-b1ae-b00c048df943",
      "eenheid": "http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/d01bb1f6-2439-4e33-9c25-1fc295de2e71"
    },
    {
      "orgaan": "http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/013cc838-173a-4657-b1ae-b00c048df943",
      "eenheid": "http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/80310756-ce0a-4a1b-9b8e-7c01b6cc7a2d"
    },
    {
      "orgaan": "http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/5ab0e9b8a3b2ca7c5e000007",
      "eenheid": "http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/5ab0e9b8a3b2ca7c5e000002"
    },
    {
      "orgaan": "http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/b52094ff-21a2-4da8-8dbe-f513365d1528",
      "eenheid": "http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/e8294b73-87c9-4fa2-9441-1937350763c9"
    },
    {
      "orgaan": "http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/b52094ff-21a2-4da8-8dbe-f513365d1528",
      "eenheid": "http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/cc4e2d67-603b-4784-9b61-e50bac1ec089"
    },
    {
      "orgaan": "http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/013cc838-173a-4657-b1ae-b00c048df943",
      "eenheid": "http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/cc4e2d67-603b-4784-9b61-e50bac1ec089"
    }
  ];

for (const decisionListOption of decisionListOptions) {
  const documentType = 'https://data.vlaanderen.be/id/concept/BesluitDocumentType/3fa67785-ffdc-4b30-8880-2b99d97b4dee';
  rules.push(
    {
      'documentType': documentType,
      'matchQuery': formData => `
        ${PREFIXES}

        SELECT DISTINCT ?submission
        WHERE {
          BIND(${sparqlEscapeUri(formData)} as ?formData)

          ?formData a melding:FormData;
            dct:type ${sparqlEscapeUri(documentType)};
            eli:passed_by ?bestuursorgaanInTijd.

          ?bestuursorgaanInTijd mandaat:isTijdspecialisatieVan ?bestuursorgaan.
          ?bestuursorgaan besluit:classificatie ${sparqlEscapeUri(decisionListOption.orgaan)};
            besluit:bestuurt ?eenheid.

          ?eenheid besluit:classificatie ${sparqlEscapeUri(decisionListOption.eenheid)}.

          ?submission a meb:Submission;
            prov:generated ?formData;
            adms:status ${sparqlEscapeUri(STATUS_SENT)};
            pav:createdBy ?eenheid.

          FILTER NOT EXISTS {
            VALUES ?classificatie {
              <http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/66ec74fd-8cfc-4e16-99c6-350b35012e86>
              <http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/f9cac08a-13c1-49da-9bcb-f650b0604054>
            }
            ?eenheid besluit:classificatie ?classificatie.
          }
        }
        LIMIT 1
      `,
      'publicationFlag': FLAG_FOR_PUBLIC
    }
  );
}

const worshipDecisionTypes = [
  "https://data.vlaanderen.be/id/concept/BesluitDocumentType/8e791b27-7600-4577-b24e-c7c29e0eb773",
  "https://data.vlaanderen.be/id/concept/BesluitType/e44c535d-4339-4d15-bdbf-d4be6046de2c",
  "https://data.vlaanderen.be/id/concept/BesluitDocumentType/672bf096-dccd-40af-ab60-bd7de15cc461",
  "https://data.vlaanderen.be/id/concept/BesluitType/79414af4-4f57-4ca3-aaa4-f8f1e015e71c",
  "https://data.vlaanderen.be/id/concept/BesluitType/54b61cbd-349f-41c4-9c8a-7e8e67d08347",
  "https://data.vlaanderen.be/id/concept/BesluitType/40831a2c-771d-4b41-9720-0399998f1873",
  "https://data.vlaanderen.be/id/concept/BesluitDocumentType/18833df2-8c9e-4edd-87fd-b5c252337349",
  "https://data.vlaanderen.be/id/concept/BesluitType/df261490-cc74-4f80-b783-41c35e720b46",
  "https://data.vlaanderen.be/id/concept/BesluitType/f56c645d-b8e1-4066-813d-e213f5bc529f",
  "https://data.vlaanderen.be/id/concept/BesluitDocumentType/2c9ada23-1229-4c7e-a53e-acddc9014e4e",
  "https://data.vlaanderen.be/id/concept/BesluitType/3fcf7dba-2e5b-4955-a489-6dd8285c013b"
];

for (const worshipDecisionType of worshipDecisionTypes) {
  rules.push(
    {
      'documentType': worshipDecisionType,
      'matchQuery': formData => `
        ${PREFIXES}

        SELECT DISTINCT ?submission
        WHERE {
          BIND(${sparqlEscapeUri(formData)} as ?formData)
          VALUES ?classificatie {
            <http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/66ec74fd-8cfc-4e16-99c6-350b35012e86>
            <http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/f9cac08a-13c1-49da-9bcb-f650b0604054>
          }

          ?formData a melding:FormData;
            dct:type ${sparqlEscapeUri(worshipDecisionType)}.

          ?submission a meb:Submission;
            prov:generated ?formData;
            adms:status ${sparqlEscapeUri(STATUS_SENT)};
            pav:createdBy ?eenheid.

          ?eenheid besluit:classificatie ?classificatie.
        }
        LIMIT 1
      `,
      'publicationFlag': FLAG_FOR_WORSHIP
    }
  );
}

export default rules;
