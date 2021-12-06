import bodyParser from "body-parser";
import { app } from "mu";
import {
  createResource,
} from "./lib/resource";
import { Delta } from "./lib/delta";
import { ProcessingQueue } from './lib/processing-queue';
import { sendErrorAlert } from "./util/queries";

const processSubjectsQueue = new ProcessingQueue('file-sync-queue');

app.use(
  bodyParser.json({
    type: function (req) {
      return /^application\/json/.test(req.get("content-type"));
    },
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

  if (uniqueSubjects.length == 0) {
    return res.status(204).send();
  } else {
    processSubjectsQueue.addJob(async () => processSubjects(uniqueSubjects));
    return res.status(200).send();
  }
});

async function processSubjects(subjects) {
  for (let subject of subjects) {
    try {
      const resource = await createResource(subject);
      if (resource) {
        await processResource(resource);
      }
    } catch (e) {
      console.log(`Error while processing a subject: ${e.message ? e.message : e}`);
      sendErrorAlert({
        message: `Something unexpected went wrong while processing a subject: ${e.message ? e.message : e}`
      });
    }
  }
}

async function processResource(resource) {
  try {
    if (await resource.canBeExported()) {
      console.log(`Resource ${resource.uri} can be exported, flagging...`);
      await resource.flag();
    } else {
      console.log(`Resource ${resource.uri} can not be exported according to the configuration.`);
    }
  } catch (error) {
    console.log(`Error while processing a resource: ${error.message ? error.message : error}`);
    sendErrorAlert({
      message: `Something unexpected went wrong while processing a resource: ${error.message ? error.message : error}`
    });
  }
}
