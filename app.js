import bodyParser from "body-parser";
import { app } from "mu";
import { querySudo } from "@lblod/mu-auth-sudo";
import { Delta } from "./lib/delta";
import { ProcessingQueue } from './lib/processing-queue';
import {
  sendErrorAlert,
  getRelatedSubjectsForSubmission,
  getSubmissionInfoForFormData,
  flagResource
} from "./util/queries";
import exportConfig from "./exportConfig";
import rules from "./rules.js";

const processSubjectsQueue = new ProcessingQueue('file-sync-queue');

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
  const uniqueSubjects = [ ...new Set(subjects) ];

  for(const subject of uniqueSubjects) {
    processSubjectsQueue.addJob(() => processSubject(subject));
  }
  return res.status(200).send();
});

async function processSubject(subject) {
  try {
    const submissionInfo = await getSubmissionInfoForFormData(subject);

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

async function processSubmission(submissionInfo) {
  try {
    const exportingRules = getExportingRules(submissionInfo);
    const publicationFlags = await getPublicationFlags(submissionInfo, exportingRules);

    if(publicationFlags.length) {
      //start the export (i.e. flagging) submission and related resources
      let unexportedRelatedSubjects = [ submissionInfo.submission.value ];

      // Note: the reason why we have to flag all related resources is because the
      // publication graph maintainer is currently too stupid to do this.
      for (const config of exportConfig) {
        const subjects = await getRelatedSubjectsForSubmission(
          submissionInfo.submission.value,
          config.type,
          config.pathToSubmission
        );
        unexportedRelatedSubjects = [ ...unexportedRelatedSubjects, ...subjects ];
      }
      // Flag every resource found
      for (const subject of unexportedRelatedSubjects) {
        console.log(`Resource ${subject} can be exported, flagging...`);
        await flagResource(subject, publicationFlags);
      }
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

async function getPublicationFlags(submissionInfo, exportingRules) {
  // A submission can match multiple rules and may have multiple publication flags.
  // But once a type of publication flag has been matched for a rule, we don't need to check further for this flag.
  // This leaves room for performance tweaks (stop querying the DB earlier), hence the boilerplate.
  const groupedRules = exportingRules.reduce((acc, rule) => {
    if(acc[rule.publicationFlag]) {
      acc[rule.publicationFlag].push(rule);
    }
    else {
      acc[rule.publicationFlag] = [ rule ];
    }
    return acc;
  }, {});

  const publicationFlags = [];

  for(const flag of Object.keys(groupedRules)) {
    for(const rule of groupedRules[flag]) {
      const result = await querySudo(rule.matchQuery(submissionInfo.formData.value));
      if(result.results.bindings.length) {
        publicationFlags.push(flag);
        break;
      }
    }
  }

  return publicationFlags;
}
