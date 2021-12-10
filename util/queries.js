import { uuid, sparqlEscapeString, sparqlEscapeUri, sparqlEscapeDateTime } from "mu";
import { querySudo as query, updateSudo as update } from "@lblod/mu-auth-sudo";

const CREATOR = 'http://lblod.data.gift/services/prepare-submissions-for-export-service';
const PUBLIC_DECISIONS_PUBLICATION_CONCEPT = 'http://lblod.data.gift/concepts/83f7b480-fcaf-4795-b603-7f3bce489325';

export async function getResourceInfo(uri) {
  const result = await query(`
    PREFIX dct: <http://purl.org/dc/terms/>

    SELECT ?resource ?type
    WHERE {
      GRAPH ?g {
        BIND (${sparqlEscapeUri(uri)} as ?resource)
        ?resource a ?type .
      }
      FILTER NOT EXISTS {
        GRAPH ?g {
          ?resource <http://schema.org/publication> ${sparqlEscapeUri(PUBLIC_DECISIONS_PUBLICATION_CONCEPT)}.
        }
      }
      FILTER(?g NOT IN (<http://redpencil.data.gift/id/deltas/producer/loket-submissions>))
    }
  `);

  if (result.results.bindings.length) {
    return result.results.bindings;
  } else {
    console.log(`Resource ${uri} not found or already published`);
    return null;
  }
}

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

export async function getSubmissionInfo(uri, pathToSubmission, type, submission = null) {
  let resolvedPathToSubmission = '';
  let bindSubmission = '';

  //TODO: this is kind of specific logic which should made more explicit from the config.
  if(type == 'http://www.w3.org/2004/02/skos/core#Concept'){
    if(!submission){
      console.log(`No submissionURI provided for ${type} and ${uri}, doing nothig`);
      return null;
    }

    else if(pathToSubmission){
      resolvedPathToSubmission = pathToSubmission.replace(/\?subject/g, sparqlEscapeUri(uri));
      bindSubmission = `BIND(${sparqlEscapeUri(submission)} as ?submission)`;
    }

    else {
      throw `Unexpected configuration for ${type} and ${uri}!`;
    }
  }

  else if(type == 'http://rdf.myexperiment.org/ontologies/base/Submission'){
    bindSubmission = `BIND(${sparqlEscapeUri(uri)} as ?submission)`;
  }

  else if(pathToSubmission){
    resolvedPathToSubmission = pathToSubmission.replace(/\?subject/g, sparqlEscapeUri(uri));
  }

  else {
    throw `Unexpected configuration for ${type} and ${uri}!`;
  }

  //TODO: Re-think the black-listing of graphs. The path can cross multiple graphs.
  const result = await query(`
    SELECT DISTINCT ?submission ?decisionType ?regulationType ?classificationOrgaan ?classificationEenheid {
      ${bindSubmission}

      GRAPH ?g {
        ${sparqlEscapeUri(uri)} a ${sparqlEscapeUri(type)}.
      }

      ${resolvedPathToSubmission}

      ?submission <http://www.w3.org/ns/prov#generated> ?form .

      ?form <http://mu.semte.ch/vocabularies/ext/decisionType> ?decisionType ;
        <http://data.europa.eu/eli/ontology#passed_by> ?orgaanInTijd .

      OPTIONAL {
        ?form <http://mu.semte.ch/vocabularies/ext/regulationType> ?regulationType .
      }

      ?orgaanInTijd <http://data.vlaanderen.be/ns/mandaat#isTijdspecialisatieVan> ?orgaan .
      ?orgaan <http://data.vlaanderen.be/ns/besluit#classificatie> ?classificationOrgaan ;
        <http://data.vlaanderen.be/ns/besluit#bestuurt> ?eenheid .
      ?eenheid <http://data.vlaanderen.be/ns/besluit#classificatie> ?classificationEenheid .

      FILTER(?g NOT IN (<http://redpencil.data.gift/id/deltas/producer/loket-submissions>))
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
