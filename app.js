import bodyParser from "body-parser";
import { app } from "mu";
import {
  createResource,
} from "./lib/resource";
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

  const inserts = delta.inserts;
  const heterogenResources = await Promise.all(inserts.map(entry => createResource(entry.subject.value)));
  // Resources can be undefined if a resource doen't have a type
  const resources = heterogenResources.filter(item => item);

  if (resources.length == 0) {
    return res.status(204).send();
  } else {
    const uniqueResources = [...new Set(resources)];
    processResources(uniqueResources);
    return res.status(200).send();
  }
});

async function processResources(resources) {
  for (let resource of resources) {
    try {
      await processResource(resource);
    } catch (e) {
      console.log(
        `Something went wrong while trying to extract the form-data from the submissions`
      );
      console.log(`Exception: ${e.stack}`);
    }
  }
}

async function processResource(resource) {
  try {
    if (await resource.canBeExported()) {
      console.log(`Resource ${resource.uri} can be exported, flagging...`);
      await resource.flag();
    }
  } catch (error) {
    console.log(error);
  }
}
