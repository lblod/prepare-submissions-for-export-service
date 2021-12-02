import {
  getResourceInfo,
  getSubmissionInfo,
  flagResource,
} from "../util/queries";
import jsonConfig from "/config/prepare/config.json";

const BESLUITENLIJST =
  "https://data.vlaanderen.be/id/concept/BesluitDocumentType/3fa67785-ffdc-4b30-8880-2b99d97b4dee";
const REGLEMENTEN_EN_VERORDERINGEN =
  "https://data.vlaanderen.be/id/concept/BesluitType/67378dd0-5413-474b-8996-d992ef81637a";

export class Resource {
  constructor({ uri, type }) {
    this.uri = uri;
    this.type = type;
  }

  async canBeExported() {
    const config = require("/config/export.json");

    if (!config.export || !config.export.length) {
      throw "Nothing to export in the config";
    }

    // 1. Is the type of the resource within the export types list
    const foundType = config.export.find(
      (element) => element.type == this.type
    );
    if (!foundType) {
      throw `The resource ${this.uri} of type ${this.type} should not be exported.`;
    }

    // 2. Does it have a submission linked with proper config
    const pathToSubmissions = config.export
      .filter((config) => config.type == this.type)
      .map((config) => config.pathToSubmission);

    const submissionInfos = await Promise.all(pathToSubmissions.map(pathToSubmission => getSubmissionInfo(this.uri, pathToSubmission)));
    const filteredSubmissionInfos = submissionInfos.filter(item => item);

    // If we have at least one result, it means we got one matching config. We use it for the rest
    if (filteredSubmissionInfos.length) {
      const submissionInfo = filteredSubmissionInfos[0];
      const isBesluitenlijst =
        submissionInfo.decisionType.value == BESLUITENLIJST;
      const isReglementenEnVerorderingen =
        submissionInfo.decisionType.value == REGLEMENTEN_EN_VERORDERINGEN;
      if (
        isValidDecisionType(submissionInfo) &&
        (isBesluitenlijst ? isValidBesluitenlist(submissionInfo) : true) &&
        (isReglementenEnVerorderingen
          ? isValidReglementenEnVerorderingen(submissionInfo)
          : true)
      )
        return true;
    } else {
      throw `The resource ${this.uri} has no submission linked following given configuration.`;
    }
  }

  async flag() {
    await flagResource(this.uri);
  }
}

export async function createResource(uri) {
  console.log("-- RETRIEVING RESOURCE --");
  try {
    const result = await getResourceInfo(uri);
    if (result) {
      return new Resource({
        uri: result.resource.value,
        type: result.type.value,
      });
    }
  } catch (e) {
    console.log(
      `Something went wrong while trying to retrieve/create the resource ${uri}.`
    );
    console.log(`Exception: ${e.stack}`);
    return null;
  }
}

function isValidDecisionType(submissionInfo) {
  return jsonConfig["decisionTypes"].includes(
    submissionInfo.decisionType.value
  );
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
