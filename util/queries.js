import { sparqlEscapeUri } from "mu";
import { querySudo as query, updateSudo as update } from "@lblod/mu-auth-sudo";

export async function getResourceInfo(uri) {
  const result = await query(`
    PREFIX dct: <http://purl.org/dc/terms/>

    SELECT ?resource ?type
    WHERE {
        BIND (${sparqlEscapeUri(uri)} as ?resource)
        ?resource a ?type .
    } LIMIT 1`);
  
  if (result.results.bindings.length) {
    return result.results.bindings[0];
  } else {
    console.log(`Resource not found.`);
    return null;
  }
}

export async function getSubmissionInfo(uri, pathToSubmission) {
  const result = await query(`
    SELECT ?decisionType ?regulationType ?classificationOrgaan ?classificationEenheid {
      ${
        pathToSubmission
          ? pathToSubmission +
            " FILTER (?subject = " +
            sparqlEscapeUri(uri) +
            ")"
          : ""
      }

      ${
        pathToSubmission
          ? "?submission <http://www.w3.org/ns/prov#generated> ?form ."
          : sparqlEscapeUri(uri) +
            " <http://www.w3.org/ns/prov#generated> ?form ."
      }

      ?form <http://mu.semte.ch/vocabularies/ext/decisionType> ?decisionType ;
        <http://data.europa.eu/eli/ontology#passed_by> ?orgaanInTijd .
      ?orgaanInTijd <http://data.vlaanderen.be/ns/mandaat#isTijdspecialisatieVan> ?orgaan .
      ?orgaan <http://data.vlaanderen.be/ns/besluit#classificatie> ?classificationOrgaan ;
        <http://data.vlaanderen.be/ns/besluit#bestuurt> ?eenheid .
      ?eenheid <http://data.vlaanderen.be/ns/besluit#classificatie> ?classificationEenheid .

      OPTIONAL {
        ?form <http://mu.semte.ch/vocabularies/ext/regulationType> ?regulationType .
      }
    }`);

  if (result.results.bindings.length) {
    return result.results.bindings[0];
  } else {
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
    }`);
}
