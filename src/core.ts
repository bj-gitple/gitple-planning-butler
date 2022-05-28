import { Octokit } from "@octokit/core";
import { ILabel } from "./interfaces/octokit.interface";
import { ICoreConfig, ICoreCard, ISetup } from "./interfaces/core.interface";
import _ from "lodash";
import fs from "fs";
import readline, { Interface as IReadline } from "readline";
import { Pdf } from "./libs/pdf";
import { IPdf, ICreateOptions } from "./interfaces/pdf.interface";
import notifier, { NodeNotifier } from "node-notifier";

export class Project {
  private readonly octokit: Octokit;
  private readonly notifier: NodeNotifier;
  private readonly pdf: IPdf;
  private readonly config: ICoreConfig;
  private readonly cards: ICoreCard[] = [];
  private readonly readline: IReadline;
  private setup: ISetup = {
    teamLabels: ["RN", "FE", "BE", "DT"],
    orgName: "",
    repoName: "",
    repoOwner: "",
    projectId: "",
    projectColName: "",
  };

  constructor(token: string, config: ICoreConfig) {
    this.config = config;
    this.octokit = new Octokit({ auth: token });
    this.pdf = new Pdf();
    this.notifier = notifier;
    this.readline = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  private getTeamDuration(cards: ICoreCard[]) {
    
    const requiredCards = _.filter(cards, (card) => !card.isOptional);
    const optionalCards = _.filter(cards, (card) => card.isOptional)

    return {
      requiredHours: this.getTeamHours(requiredCards),
      optionalHours: this.getTeamHours(optionalCards)
    }
  }

  private getTeamHours(cards: ICoreCard[]): { team: string; total: number }[] {
    const hours = {} as Record<string, any>;
    _.forEach(cards, (card) => {
      if (!hours[card.team]) {
        hours[card.team] = [card.hours];
      } else {
        hours[card.team] = [...hours[card.team], card.hours];
      }
    });

    const result = _.map(hours, (vals, prop) => ({
      team: prop,
      total: _.reduce(vals, (acc, cur) => acc + cur, 0),
    }));
    return result;
  }

  private getDuration(labels: Array<ILabel>) {
    const duration = {
      hours: 0,
      optional: 0
    }

    const isOptional = _.map(labels, (l) => l.name).includes('optional');
    const [_label] = _.filter(labels, (label) => label.description === "duration");
    if(isOptional) {
      duration.optional = _.toNumber(_label.name.replace("d", ""));
    } else {
      duration.hours = _.toNumber(_label.name.replace("d", ""));
    }

    return duration
  }

  private getHoursFromLabel(labels: Array<ILabel>) {
    let duration = 0;
    const [foundDurationLabel] = _.filter(
      labels,
      (label) => label.description === "duration"
    );
    if (_.isEmpty(foundDurationLabel)) {
      return duration;
    } else {
      return (duration = _.toNumber(foundDurationLabel.name.replace("d", "")));
    }
  }

  private getOtherLabels(labels: Array<ILabel>) {
    // console.log('labels >>> ', labels)
    const otherLabels = _.filter(labels, (label) => label.description !== 'duration' && !this.config.teamLabels.includes(label.name))
    return _.map(otherLabels, (label) => label.name);
  }

  private getTeamFromLabel(labels: Array<ILabel>) {
    const [foundCategoryLabel] = _.filter(labels, (label) =>
      this.config.teamLabels.includes(label.name)
    );

    if (_.isEmpty(foundCategoryLabel)) {
      return "";
    } else {
      return foundCategoryLabel.name;
    }
  }

  private async findIssue(issue_number: number) {
    const issue = await this.octokit.request(
      "GET /repos/{owner}/{repo}/issues/{issue_number}",
      {
        owner: this.config.owner,
        repo: this.config.repoName,
        issue_number,
      }
    );
    return issue.data;
  }

  private async readlineAsync(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.readline.question(question, resolve);
    });
  }

  private notify(title: string, message: string) {
    this.notifier.notify({
      title,
      message,
    });
  }

  async runSettings() {
    const orgs = await this.octokit.request("GET /user/orgs", {});
    console.log("@@@@ AUTH USER ORGS @@@@");
    console.log(orgs.data);
    console.log("@@@@ ~~~ @@@@ ~~~ @@@@\n");

    this.setup.orgName = await this.readlineAsync(
      'Enter org "login" from the list above: '
    );
    console.log("orgName answer >>> ", this.setup.orgName);

    const orgRepos = await this.octokit.request("GET /orgs/{org}/repos", {
      org: this.setup.orgName,
    });
    console.log("@@@@ ORG REPOS @@@@");
    console.log(_.map(orgRepos.data, (repo) => ({ name: repo.full_name, id: repo.id, url: repo.url })));
    console.log("@@@@ ~~~ @@@@ ~~~ @@@@\n");

    const repoId = await this.readlineAsync(
      'Enter repo "id" from the repo list above: '
    );

    const [foundRepo] = _.filter(
      orgRepos.data,
      (repo) => repo.id === _.toNumber(repoId)
    );

    if (!foundRepo) {
      console.log("repo not found");
      this.readline.close();
    }

    this.setup.repoName = foundRepo.name;
    this.setup.repoOwner = foundRepo.owner.login;

    const repoProjects = await this.octokit.request(
      "GET /repos/{owner}/{repo}/projects",
      {
        owner: this.setup.repoOwner,
        repo: this.setup.repoName,
      }
    );
    console.log("\n@@@@ SELECTED REPO PROJECT @@@@");
    console.log(repoProjects.data);
    console.log("@@@@ ~~~ @@@@ ~~~ @@@@\n");

    this.setup.projectId = await this.readlineAsync(
      'Enter selected project "id" from the list above: '
    );

    const [foundProject] = _.filter(
      repoProjects.data,
      (project) => project.id === _.toNumber(this.setup.projectId)
    );

    if (!foundProject) {
      console.log("project not found");
      this.readline.close();
    }

    const projectColumns = await this.octokit.request(
      "GET /projects/{project_id}/columns",
      {
        project_id: _.toNumber(this.setup.projectId),
      }
    );

    console.log("\n@@@@ PROJECT COLUMNS @@@@");
    console.log(projectColumns.data);
    console.log("@@@@ ~~~ @@@@ ~~~ @@@@\n");

    this.setup.projectColName = await this.readlineAsync(
      'Enter column "name" from the list above: '
    );

    console.log("@@@ config @@@");
    console.log(`
    project_id: ${this.setup.projectId},
    owner: ${this.setup.repoOwner},
    repoName: ${this.setup.repoName},
    projectColName: ${this.setup.projectColName}
    `);

    const config = {
      teamLabels: this.setup.teamLabels,
      project_id: _.toNumber(this.setup.projectId),
      owner: this.setup.repoOwner,
      repoName: this.setup.repoName,
      projectColName: this.setup.projectColName,
    };

    console.log("@@@ writing config file [config.json] @@@");
    this.writeFile(__dirname + "/config.json", JSON.stringify(config));
    this.notify("Setup Success", "settings are in config.json file.");
    this.readline.close();
  }

  private handleIssueBodyStr(body: string, maxLen: number = 300) {
    try {
      return body.length > maxLen ? body.substring(0, maxLen) : body;
    } catch (error) {
      return "";
    }
  }

  private async writeFile(file: string, content: any) {
    try {
      fs.writeFileSync(file, content);
    } catch (err) {
      console.log("writeFile ERROR ", err);
    }
  }

  private async getSprintCards() {
    console.log("loading...");
    const projectColumns = await this.octokit.request(
      "GET /projects/{project_id}/columns",
      {
        project_id: this.config.project_id
      }
    );

    const [foundCol] = _.filter(
      projectColumns.data,
      (col) => col.name === this.config.projectColName
    );

    if (_.isEmpty(foundCol)) {
      console.log("col not found");
    } else {
      const currentSprintCards = await this.octokit.request(
        "GET /projects/columns/{column_id}/cards",
        {
          column_id: foundCol.id,
          per_page: 200
        }
      );
      //   console.log("@@@ currentSprintCards @@@ ");
      //   console.dir(currentSprintCards.data, { depth: null });
      return currentSprintCards.data;
    }
  }

  async calcSprintHours() {
    const sprintCards = await this.getSprintCards();

    const issueNumbers = [] as Array<number>;

    _.forEach(sprintCards, (card) => {
      if (card?.content_url) {
        const [str, extractedNumber] = card?.content_url.split("/issues/");
        issueNumbers.push(_.toNumber(extractedNumber));
      }
    });
    // console.log("@@@ issueNumbers @@@ ", issueNumbers);

    for (let i = 0; i < issueNumbers.length; i++) {
      const num = issueNumbers[i];
      const issue = await this.findIssue(num); // fetchIssue(num);
      const labels = issue.labels as ILabel[];
      //   console.log(`@@@ issue detail @@@ ${num}`);
      //   console.dir(issue, { depth: null });

      if(labels.length) {
        const labelNames = [
          ...this.getOtherLabels(labels)
        ];
        this.cards.push({
          id: issue.id,
          number: issue.number,
          title: issue.title,
          body: this.handleIssueBodyStr(issue.body as string),
          isOptional: _.map(labels, (l) => l.name).includes('optional'),
          hours: this.getHoursFromLabel(labels),
          team: this.getTeamFromLabel(labels),
          labels: labelNames,
        });

      }

    }
    // console.dir(this.cards, { depth: null });

    const { requiredHours, optionalHours } = this.getTeamDuration(this.cards);

    const requiredContent = _.map(requiredHours, (h) => h.team + ": " + h.total + "\n")
    .toString()
    .split(",")
    .join("");

    const optionalContent = _.map(optionalHours, (h) => h.team + ": " + h.total + "\n")
    .toString()
    .split(",")
    .join("");
    // console.log('optionalContent @@@')
    // console.dir(optionalContent, { depth: null });
    // console.log('requiredContent @@@')
    // console.dir(requiredContent, { depth: null });
    const content = 'Required:\n' + requiredContent + '\nOptional:\n' + optionalContent;
    this.writeFile(__dirname + "/files/hours.txt", content);
    await this.createSprintPdf();
    this.notify(
      "Success",
      "calculated hours:\nfiles/hours.txt\npdf cards:\nfiles/output.pdf"
    );
    this.readline.close();
  }

  private async createSprintPdf() {
    if (!this.cards.length) {
      console.log("did not find any cards.");
      return;
    }

    const document = {
      html: fs.readFileSync(__dirname + "/libs/template.html", "utf8"),
      data: {
        cards: this.cards,
      },
      path: __dirname + `/files/output.pdf`,
    };
    const options: ICreateOptions = {
      format: "A4",
      orientation: "portrait",
      border: "10mm",
    };
    try {
      const createdPdf = await this.pdf.generate(document, options);
      console.log("@@@ Complete @@@");
    } catch (error) {
      console.log("createSprintPdf ERROR ", error);
    }
  }
}
