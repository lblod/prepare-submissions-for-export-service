import { uuid, sparqlEscapeString, sparqlEscapeUri, sparqlEscapeDateTime } from "mu";
import { querySudo as query, updateSudo as update } from "@lblod/mu-auth-sudo";

const CREATOR = 'http://lblod.data.gift/services/prepare-submissions-for-export-service';
const PUBLIC_DECISIONS_PUBLICATION_CONCEPT = 'http://lblod.data.gift/concepts/83f7b480-fcaf-4795-b603-7f3bce489325';
const WORSHIP_DECISIONS_PUBLICATION_CONCEPT = 'http://lblod.data.gift/concepts/403b71bd-5ab9-4c92-8990-4bb19d5469d1';

export async function getRelatedSubjectsForSubmission(submission, subjectType, pathToSubmission) {
  // TODO:
  // 1. Note: the pathToSubmission expects the name `?subject` as root node, and `?submission` as submission (see exportConfig.js)
  // 2. Re-think the black-listing of graphs.
  const queryStr = `
    SELECT DISTINCT ?subject WHERE {
      BIND(${sparqlEscapeUri(submission)} as ?submission)

      GRAPH ?g {
        ?subject a ${sparqlEscapeUri(subjectType)}.
      }

      ${pathToSubmission}

      FILTER(?g NOT IN (
        <http://redpencil.data.gift/id/deltas/producer/loket-submissions>,
        <http://redpencil.data.gift/id/deltas/producer/loket-worship-submissions>
        )
      )
    }
  `;

  const result = await query(queryStr);
  return result.results.bindings.map(r => r.subject.value);
}

export async function getSubmissionInfoForFormData(formData) {
  //TODO: Re-think the black-listing of graphs.
  const result = await query(`
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

    SELECT DISTINCT ?submission ?decisionType ?formData
      WHERE {
        BIND(${sparqlEscapeUri(formData)} as ?formData)

        GRAPH ?g {
          ?formData a <http://lblod.data.gift/vocabularies/automatische-melding/FormData>;
            ext:formSubmissionStatus <http://lblod.data.gift/concepts/9bd8d86d-bb10-4456-a84e-91e9507c374c>;
            <http://mu.semte.ch/vocabularies/ext/decisionType> ?decisionType.

          ?submission <http://www.w3.org/ns/prov#generated> formData;
            a <http://rdf.myexperiment.org/ontologies/base/Submission>.
        }

        FILTER(?g NOT IN (
          <http://redpencil.data.gift/id/deltas/producer/loket-submissions>,
          <http://redpencil.data.gift/id/deltas/producer/loket-worship-submissions>
          )
        )
    }`);

  if (result.results.bindings.length) {
    return result.results.bindings[0];
  } else {
    console.log(`Submission info not found.`);
    return null;
  }
}

export async function flagResource(uri, flags) {
  const preparedStatement = flags
        .map(flag => `${sparqlEscapeUri(uri)} schema:publication ${sparqlEscapeUri(flag)}. `);
  await update(`
    PREFIX schema: <http://schema.org/>
    INSERT {
      GRAPH ?g {
        ${preparedStatement.join('\n')}
      }
    } WHERE {
      GRAPH ?g {
        ${sparqlEscapeUri(uri)} a ?something .
      }

      FILTER(?g NOT IN (
        <http://redpencil.data.gift/id/deltas/producer/loket-submissions>,
        <http://redpencil.data.gift/id/deltas/producer/loket-worship-submissions>
        )
      )
    }`);
}

export async function sendErrorAlert({message, detail, reference}) {
  if (!message)
    throw 'Error needs a message describing what went wrong.';
  const id = uuid();
  const uri = `http://data.lblod.info/errors/${id}`;
  const q = `
      PREFIX mu:   <http://mu.semte.ch/vocabularies/core/>
      PREFIX oslc: <http://open-services.net/ns/core#>
      PREFIX dct:  <http://purl.org/dc/terms/>

      INSERT DATA {
        GRAPH <http://mu.semte.ch/graphs/error> {
            ${sparqlEscapeUri(uri)} a oslc:Error ;
                    mu:uuid ${sparqlEscapeString(id)} ;
                    dct:subject ${sparqlEscapeString('Prepare Submission For Export Service')} ;
                    oslc:message ${sparqlEscapeString(message)} ;
                    dct:created ${sparqlEscapeDateTime(new Date().toISOString())} ;
                    dct:creator ${sparqlEscapeUri(CREATOR)} .
            ${reference ? `${sparqlEscapeUri(uri)} dct:references ${sparqlEscapeUri(reference)} .` : ''}
            ${detail ? `${sparqlEscapeUri(uri)} oslc:largePreview ${sparqlEscapeString(detail)} .` : ''}
        }
      }
  `;
  try {
    await update(q);
  } catch (e) {
    console.error(`[WARN] Something went wrong while trying to store an error.\nMessage: ${e}\nQuery: ${q}`);
  }
}
