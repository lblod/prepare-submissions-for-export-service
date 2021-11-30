import { NamedNode, triple } from "rdflib";
import bodyParser from "body-parser";
import { app } from "mu";
import {
  createSubmission,
  SUBMISSION_SENT_STATUS,
} from "./lib/submission";
import { ADMS } from "./util/namespaces";
import { Delta } from "./lib/delta";

app.use(
  bodyParser.json({
    type: function (req) {
      return /^application\/json/.test(req.get("content-type"));
    },
  })
);

app.get("/", function (req, res) {
  res.send("Hello toezicht-flattened-form-data-generator");
});

app.post("/delta", async function (req, res) {
  const delta = new Delta(req.body);

  if (!delta.inserts.length) {
    console.log(
      "Delta does not contain any insertions. Nothing should happen."
    );
    return res.status(204).send();
  }

  const submissions = await processInsertions(delta);

  if (!submissions) {
    return res.status(204).send();
  } else {
    return res.status(200).send();
  }
});

async function processInsertions(delta) {
  let submissions = [];

  // get submissions for submission URIs
  let inserts = delta.getInsertsFor(
    triple(undefined, ADMS("status"), new NamedNode(SUBMISSION_SENT_STATUS))
  );
  for (let triple of inserts) {
    const submission = await createSubmission(
      triple.subject.value
    );
    if (submission) submissions.push(submission);
  }

  if (submissions.length) {
    processSubmissions(submissions); // don't await async processing
  }
  return submissions;
}

async function processSubmissions(submissions) {
  for (let submission of submissions) {
    try {
      await processSubmission(submission);
    } catch (e) {
      console.log(
        `Something went wrong while trying to extract the form-data from the submissions`
      );
      console.log(`Exception: ${e.stack}`);
    }
  }
}

async function processSubmission(submission) {
  const canBeFlaged = await submission.canFlag();

  if (canBeFlaged) {
    console.log('Flagging the submission to be exported');
    await submission.flag();
  } else {
    console.log('Submission doesnt meet the configuration to be exported');
  }
}
