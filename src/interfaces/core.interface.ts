export interface ICoreConfig {
  teamLabels: Array<string>;
  project_id: number;
  repoName: string;
  owner: string;
  projectColName: string;
}

export interface ICoreCard {
  id: number;
  number: number;
  title: string;
  body: string;
  hours: number;
  team: string;
}

export interface ISetup {
  teamLabels: Array<string>;
  orgName: string;
  repoName: string;
  repoOwner: string;
  projectId: string;
  projectColName: string;
}
