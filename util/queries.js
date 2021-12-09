import { uuid, sparqlEscapeString, sparqlEscapeUri, sparqlEscapeDateTime } from "mu";
import { querySudo as query, updateSudo as update } from "@lblod/mu-auth-sudo";

const CREATOR = 'http://lblod.data.gift/services/prepare-submissions-for-export-service';

export async function getResourceInfo(uri) {
  const result = await query(`
    PREFIX dct: <http://purl.org/dc/terms/>

    SELECT ?resource ?type
    WHERE {
      GRAPH ?g {
        BIND (${sparqlEscapeUri(uri)} as ?resource)
        ?resource a ?type .
      }
      FILTER(?g NOT IN (<http://redpencil.data.gift/id/deltas/producer/loket-submissions>))
    }
    LIMIT 1`);

  if (result.results.bindings.length) {
    return result.results.bindings;
  } else {
    console.log(`Resource not found.`);
    return null;
  }
}

export async function getSubmissionInfo(uri, pathToSubmission) {
  let pathToForm = '';
  if (pathToSubmission) {
    pathToSubmission = pathToSubmission.replaceAll("?subject", sparqlEscapeUri(uri));
    pathToForm = '?submission <http://www.w3.org/ns/prov#generated> ?form .';
  } else {
    pathToSubmission = '';
    pathToForm = `${sparqlEscapeUri(uri)} <http://www.w3.org/ns/prov#generated> ?form .`;
  }

  const result = await query(`
    SELECT ?decisionType ?regulationType ?classificationOrgaan ?classificationEenheid {
      GRAPH ?g {
        ${pathToSubmission}

        ${pathToForm}

        ?form <http://mu.semte.ch/vocabularies/ext/decisionType> ?decisionType ;
          <http://data.europa.eu/eli/ontology#passed_by> ?orgaanInTijd .

        OPTIONAL {
          ?form <http://mu.semte.ch/vocabularies/ext/regulationType> ?regulationType .
        }
      }
      GRAPH ?h {
        ?orgaanInTijd <http://data.vlaanderen.be/ns/mandaat#isTijdspecialisatieVan> ?orgaan .
        ?orgaan <http://data.vlaanderen.be/ns/besluit#classificatie> ?classificationOrgaan ;
          <http://data.vlaanderen.be/ns/besluit#bestuurt> ?eenheid .
        ?eenheid <http://data.vlaanderen.be/ns/besluit#classificatie> ?classificationEenheid .
      }
      FILTER(?g NOT IN (<http://redpencil.data.gift/id/deltas/producer/loket-submissions>))
      FILTER(?h NOT IN (<http://redpencil.data.gift/id/deltas/producer/loket-submissions>))
    }`);

  if (result.results.bindings.length) {
    return result.results.bindings[0];
  } else {
    console.log(`Submission info not found.`);
    return null;
  }
}

export async function flagResource(uri) {
  await update(`
    PREFIX schema: <http://schema.org/>
    INSERT {
      GRAPH ?g {
        ${sparqlEscapeUri(uri)}
          schema:publication <http://lblod.data.gift/concepts/83f7b480-fcaf-4795-b603-7f3bce489325> .
      }
    } WHERE {
      GRAPH ?g {
        ${sparqlEscapeUri(uri)} ?p ?o .
      }
      FILTER(?g NOT IN (<http://redpencil.data.gift/id/deltas/producer/loket-submissions>))
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
            ${detail ? `${sparqlEscapeUri(uri)} oslc:largePreview ""${sparqlEscapeString(detail)}"" .` : ''}
        }
      }
  `;
  try {
    await update(q);
  } catch (e) {
    console.error(`[WARN] Something went wrong while trying to store an error.\nMessage: ${e}\nQuery: ${q}`);
  }
}
