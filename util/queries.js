import { uuid, sparqlEscapeString, sparqlEscapeUri, sparqlEscapeDateTime } from "mu";
import { querySudo as query, updateSudo as update } from "@lblod/mu-auth-sudo";

const CREATOR = 'http://lblod.data.gift/services/prepare-submissions-for-export-service';
const PUBLIC_DECISIONS_PUBLICATION_CONCEPT = 'http://lblod.data.gift/concepts/83f7b480-fcaf-4795-b603-7f3bce489325';
const WORSHIP_DECISIONS_PUBLICATION_CONCEPT = 'http://lblod.data.gift/concepts/403b71bd-5ab9-4c92-8990-4bb19d5469d1';

export async function getUnpublishedSubjectsFromSubmission(submission, type, pathToSubmission) {
  // TODO:
  // 1. This is extremely implict: the pathToSubmission expects the name `?subject` as root node, and `?submission` as submission
  // 2. Re-think the black-listing of graphs.
  if(type == 'http://rdf.myexperiment.org/ontologies/base/Submission'){
    console.log(`Encountered ${type} for ${submission}, we don't need to fetch this.`);
    console.log(`Either it was already published, or it will be through a subsequent incoming delta`);
    return [];
  }

  const bindSubmission = `BIND(${sparqlEscapeUri(submission)} as ?submission)`;

  const queryStr = `
    SELECT DISTINCT ?subject WHERE {
      ${bindSubmission}

      GRAPH ?g {
        ?subject a ${sparqlEscapeUri(type)}.
      }

      ${pathToSubmission}

      FILTER NOT EXISTS {
        ?subject <http://schema.org/publication> ${sparqlEscapeUri(PUBLIC_DECISIONS_PUBLICATION_CONCEPT)}.
        ?subject <http://schema.org/publication> ${sparqlEscapeUri(WORSHIP_DECISIONS_PUBLICATION_CONCEPT)}.
      }

      FILTER(?g NOT IN (<http://redpencil.data.gift/id/deltas/producer/loket-submissions>))
    }
  `;

  const result = await query(queryStr);
  if (result.results.bindings.length) {
    return result.results.bindings.map(r => r.subject.value);
  }
  else {
    console.log(`No unpublished subjects found for ${submission} and ${type}`);
    return [];
  }
}

  const result = await query(`




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
