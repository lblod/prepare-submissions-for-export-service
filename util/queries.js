import { uuid, sparqlEscapeString, sparqlEscapeUri, sparqlEscapeDateTime } from "mu";
import { querySudo as query, updateSudo as update } from "@lblod/mu-auth-sudo";

const CREATOR = 'http://lblod.data.gift/services/prepare-submissions-for-export-service';

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

          ?submission <http://www.w3.org/ns/prov#generated> ?formData;
            a <http://rdf.myexperiment.org/ontologies/base/Submission>.
        }

        FILTER(?g NOT IN (
          <http://redpencil.data.gift/id/deltas/producer/loket-submissions>,
          <http://redpencil.data.gift/id/deltas/producer/loket-worship-submissions>
          )
        )
    }`);

  if (result.results.bindings.length) {
    // We can receive a submission with multiple decision types that all need to be evaluated
    return {
      submission: result.results.bindings[0].submission.value,
      formData: result.results.bindings[0].formData.value,
      decisionTypes: result.results.bindings.map(res => res.decisionType.value)
    };
  } else {
    console.log(`Submission info not found.`);
    return null;
  }
}

export async function getSubmissionInforForRemoteDataObject(remoteDataObject) {
  //TODO: Re-think the black-listing of graphs.
  //TODO: it seems user-entered remoteDataobjects are stored in public-graph still
  const result = await query(`
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX schema: <http://schema.org/>

    SELECT DISTINCT ?submission ?decisionType ?formData
      WHERE {
        BIND(${sparqlEscapeUri(remoteDataObject)} as ?remoteDataObject)

        ?remoteDataObject a <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#RemoteDataObject>;
          <http://www.w3.org/ns/adms#status> <http://lblod.data.gift/file-download-statuses/success>.
        ?pFile <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#dataSource> ?remoteDataObject.

        GRAPH ?g {
          ?formData a <http://lblod.data.gift/vocabularies/automatische-melding/FormData>;
            ext:formSubmissionStatus <http://lblod.data.gift/concepts/9bd8d86d-bb10-4456-a84e-91e9507c374c>;
            <http://mu.semte.ch/vocabularies/ext/decisionType> ?decisionType.

          ?formData <http://purl.org/dc/terms/hasPart> ?remoteDataObject.

          ?submission a <http://rdf.myexperiment.org/ontologies/base/Submission>.
          ?submission <http://www.w3.org/ns/prov#generated> ?formData;
            a <http://rdf.myexperiment.org/ontologies/base/Submission>.

          ?submission schema:publication ?flag.
        }

        FILTER NOT EXISTS {
          ?pFile schema:publication ?flag.
        }

        FILTER(?g NOT IN (
          <http://redpencil.data.gift/id/deltas/producer/loket-submissions>,
          <http://redpencil.data.gift/id/deltas/producer/loket-worship-submissions>
          )
        )
    }`);

  if (result.results.bindings.length) {
    console.log(`Found late RemoteDataObject coming in later ${remoteDataObject}`);
    // We can receive a submission with multiple decision types that all need to be evaluated
    return {
      submission: result.results.bindings[0].submission.value,
      formData: result.results.bindings[0].formData.value,
      decisionTypes: result.results.bindings.map(res => res.decisionType.value)
    };
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

      FILTER NOT EXISTS {
        ${preparedStatement.join('\n')}
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
