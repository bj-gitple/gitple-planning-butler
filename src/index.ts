import { Project } from "./core";
import "dotenv/config";
import * as config from "./config.json";

const token = process.env.TOKEN || "";
const isSetup = process.env.SETUP === "true";

(async function () {
  const project = new Project(token, config);
  if (isSetup) {
    await project.runSettings();
  } else {
    await project.calcSprintHours();
  }
})();
