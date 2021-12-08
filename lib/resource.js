import {
  getResourceInfo,
  getSubmissionInfo,
  flagResource,
  sendErrorAlert
} from "../util/queries";
import jsonConfig from "/config/config.json";
import jsonExportConfig from "/config/export.json";

const BESLUITENLIJST =
  "https://data.vlaanderen.be/id/concept/BesluitDocumentType/3fa67785-ffdc-4b30-8880-2b99d97b4dee";
const REGLEMENTEN_EN_VERORDERINGEN =
  "https://data.vlaanderen.be/id/concept/BesluitType/67378dd0-5413-474b-8996-d992ef81637a";

export class Resource {
  constructor({ uri, types }) {
    this.uri = uri;
    this.types = types;
  }

  async canBeExported() {
    if (!jsonExportConfig.export || !jsonExportConfig.export.length) {
      throw "Nothing to export in the config";
    }

    // 1. Is one of the types of the resource within the export types list
    const foundTypes = jsonExportConfig.export.filter(element =>
      this.types.find(e => element.type == e)
    );

    if (foundTypes.length == 0) {
      console.log(`The resource ${this.uri} of types ${this.types} should not be exported.`);
      return false;
    }

    // 2. Does it have a submission linked with proper config
    const pathToSubmissions = jsonExportConfig.export
      .filter((config) => this.types.find(type => type == config.type))
      .map((config) => config.pathToSubmission);

    let submissionInfos = [];
    for (const pathToSubmission of pathToSubmissions) {
      submissionInfos.push(await getSubmissionInfo(this.uri, pathToSubmission));
    }

    const filteredSubmissionInfos = submissionInfos.filter(item => item);

    // If we have at least one result, it means we got one matching config. We use it for the rest
    if (filteredSubmissionInfos.length) {
      const submissionInfo = filteredSubmissionInfos[0];
      return isValidForExport(submissionInfo);
    } else {
      console.log(`The resource ${this.uri} has no submission linked following given configuration.`);
      return false;
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
      // A resource can have multiple types
      const uri = result[0].resource.value;
      const types = result.map(r => r.type.value);
      return new Resource({
        uri,
        types
      });
    }
  } catch (e) {
    console.log(
      `Something went wrong while trying to retrieve/create the resource ${uri}.`
    );
    sendErrorAlert({
      message: `Something went wrong while trying to retrieve/create the resource ${uri}.`,
    });
  }
}

function isValidForExport(submissionInfo) {
  const isBesluitenlijst =
    submissionInfo.decisionType.value == BESLUITENLIJST;
  const isReglementenEnVerorderingen =
    submissionInfo.decisionType.value == REGLEMENTEN_EN_VERORDERINGEN;

  if (isValidDecisionType(submissionInfo)) {
    if (isBesluitenlijst) {
      return isValidBesluitenlist(submissionInfo);
    } else if (isReglementenEnVerorderingen) {
      return isValidReglementenEnVerorderingen(submissionInfo);
    } else {
      return true;
    }
  } else {
    return false;
  }
}

function isValidDecisionType(submissionInfo) {
  return jsonConfig["decisionTypes"].includes(
    submissionInfo.decisionType.value
  );
}

function isValidBesluitenlist(submissionInfo) {
  const isAllowedBestuur =
    jsonConfig["besluitenlijstOptions"].filter(
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
