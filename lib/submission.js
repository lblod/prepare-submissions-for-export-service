import {
  createSubmissionForQuery,
  getSubmissionInfo,
  flagSubmission,
} from "../util/queries";
import jsonConfig from '/config/config.json';

export const SUBMISSION_SENT_STATUS =
  "http://lblod.data.gift/concepts/9bd8d86d-bb10-4456-a84e-91e9507c374c";
export const SUBMISSION_DELETED_STATUS =
  "http://lblod.data.gift/concepts/faa5110a-fdb2-47fa-a0d2-118e5542ef05";
export const SUBMISSION_TASK_SUCCESSFUL =
  "http://lblod.data.gift/automatische-melding-statuses/successful-concept";

const BESLUITENLIJST =
  "https://data.vlaanderen.be/id/concept/BesluitDocumentType/3fa67785-ffdc-4b30-8880-2b99d97b4dee";
const REGLEMENTEN_EN_VERORDERINGEN =
  "https://data.vlaanderen.be/id/concept/BesluitType/67378dd0-5413-474b-8996-d992ef81637a";

export class Submission {
  constructor({ uri }) {
    this.uri = uri;
  }

  async canFlag() {
    const submissionInfo = await getSubmissionInfo(this.uri);

    if (submissionInfo) {
      const isBesluitenlijst = submissionInfo.decisionType.value == BESLUITENLIJST;
      const isReglementenEnVerorderingen = submissionInfo.decisionType.value == REGLEMENTEN_EN_VERORDERINGEN;
      if (
        isValidDecisionType(submissionInfo) &&
        (isBesluitenlijst ? isValidBesluitenlist(submissionInfo) : true) &&
        (isReglementenEnVerorderingen ? isValidReglementenEnVerorderingen(submissionInfo) : true)
      )
        return true;
    }
    return false;
  }

  async flag() {
    await flagSubmission(this.uri);
  }
}

export async function createSubmission(uri) {
  console.log("-- RETRIEVING SUBMISSION --");
  try {
    const result = await createSubmissionForQuery(uri);
    return new Submission({
      uri: result.submission.value,
    });
  } catch (e) {
    console.log(
      `Something went wrong while trying to retrieve/create the submissions.`
    );
    console.log(`Exception: ${e.stack}`);
    return null;
  }
}

function isValidDecisionType(submissionInfo) {
  return jsonConfig["decisionTypes"].includes(submissionInfo.decisionType.value);
}

function isValidBesluitenlist(submissionInfo) {
  const isAllowedBestuur =
    jsonConfig["reglementenEnVerorderingenOptions"].filter(
      (bestuur) =>
        bestuur.orgaan == submissionInfo.classificationOrgaan.value &&
        bestuur.eenheid == submissionInfo.classificationEenheid.value
    ).length > 0;
  return isAllowedBestuur;
}

function isValidReglementenEnVerorderingen(submissionInfo) {
  if (submissionInfo.regulationType) {
    const isAllowedRegulationType = jsonConfig["regulationTypes"].includes(
      submissionInfo.regulationType.value
    );
    return isAllowedRegulationType;
  }
  return false;
}
