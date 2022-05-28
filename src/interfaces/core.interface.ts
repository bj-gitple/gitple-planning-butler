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
  isOptional: boolean;
  team: string;
  labels: Array<string>
}

export interface ISetup {
  teamLabels: Array<string>;
  orgName: string;
  repoName: string;
  repoOwner: string;
  projectId: string;
  projectColName: string;
}
