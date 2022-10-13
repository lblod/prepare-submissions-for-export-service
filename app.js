import bodyParser from "body-parser";
import { app } from "mu";
import { Delta } from "./lib/delta";
import { ProcessingQueue } from './lib/processing-queue';
import {
  sendErrorAlert,
  getUnpublishedSubjectsFromSubmission,
  getSubmissionInfo,
  flagResource
} from "./util/queries";
import jsonExportConfig from "/config/export.json";
import rules from "./rules.js";

const processSubjectsQueue = new ProcessingQueue('file-sync-queue');

const FORM_DATA_TYPE = "http://lblod.data.gift/vocabularies/automatische-melding/FormData";

app.use(
  bodyParser.json({
    type: function (req) {
      return /^application\/json/.test(req.get("content-type"));
    }
  })
);

app.get("/", function (req, res) {
  res.send("Hello prepare-submission-for-export");
});

app.post("/delta", async function (req, res) {
  const delta = new Delta(req.body);

  if (!delta.inserts.length) {
    console.log(
      "Delta does not contain any insertions. Nothing should happen."
    );
    return res.status(204).send();
  }

  const inserts = delta.inserts;
  const subjects = inserts.map(insert => insert.subject.value);
  const uniqueSubjects = [...new Set(subjects)];

  for(const subject of uniqueSubjects) {
    processSubjectsQueue.addJob(() => processSubject(subject));
  }
  return res.status(200).send();
});

async function processSubject(subject) {
  try {
    const submissionInfo = await getSubmission(subject);

    if (submissionInfo) {
      await processSubmission(submissionInfo);
    }
  } catch (e) {
    console.error(`Error while processing a subject: ${e.message ? e.message : e}`);
    await sendErrorAlert({
      message: `Something unexpected went wrong while processing a subject: ${e.message ? e.message : e}`
    });
  }
}

async function getSubmission(subject) {
  const formDataConfiguration = jsonExportConfig.export.find(
    (config) => config.type == FORM_DATA_TYPE
  );

  if (formDataConfiguration) {
    return await getSubmissionInfo(
      subject,
      formDataConfiguration.pathToSubmission,
      formDataConfiguration.type,
    );
  } else {
    console.log(`No configuration found for required type ${FORM_DATA_TYPE}.`);
    return null;
  }
}

async function processSubmission(submissionInfo) {
  try {
    const exportingRules = getExportingRules(submissionInfo);
    const matchingRule = await getMatchingRule(submissionInfo, exportingRules);

    if (matchingRule) {
      // Get all related ressources to the submission from the export config
      let unexportedRelatedSubjects = [submissionInfo.submission.value];
      for (const config of jsonExportConfig.export) {
        const subjects = await getUnpublishedSubjectsFromSubmission(
          submissionInfo.submission.value,
          config.type,
          config.pathToSubmission
        );
        unexportedRelatedSubjects = [ ...unexportedRelatedSubjects, ...subjects];
      }

      // Flag every resource found
      for (const subject of unexportedRelatedSubjects) {
        console.log(`Resource ${subject} can be exported, flagging...`);
        await flagResource(subject, matchingRule.publicationFlag);
      }
    } else {
      console.log(`Resource ${submissionInfo.submission.value} can not be exported according to the rules defined.`);
    }
  } catch (error) {
    console.error(`Error while processing a resource: ${error.message ? error.message : error}`);
    await sendErrorAlert({
      message: `Something unexpected went wrong while processing a resource: ${error.message ? error.message : error}`
    });
  }
}

function getExportingRules(submissionInfo) {
  return rules.filter(rule => rule.documentType == submissionInfo.decisionType.value);
}

async function getMatchingRule(submissionInfo, exportingRules) {
  for (const rule of exportingRules) {
    const isMatching = await rule.matchQuery(submissionInfo.formData.value, submissionInfo.decisionType.value);
    if (isMatching) {
      return rule;
    }
  }

  return null;
}