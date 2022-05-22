export interface ICreateOptions {
  format?: "A3" | "A4" | "A5" | "Legal" | "Letter" | "Tabloid" | undefined;
  orientation?: "portrait" | "landscape" | undefined;
  border?:
    | string
    | {
        top?: string | undefined;
        right?: string | undefined;
        bottom?: string | undefined;
        left?: string | undefined;
      }
    | undefined;
  header?:
    | {
        height?: string | undefined;
        contents?: string | undefined;
      }
    | undefined;
  footer?:
    | {
        height?: string | undefined;
        contents?:
          | {
              first?: string | undefined;
              [page: number]: string;
              default?: string | undefined;
              last?: string | undefined;
            }
          | undefined;
      }
    | undefined;
}

export interface ICreateDocument {
  html: string;
  data: any;
  path: string;
  type?: "buffer" | "stream" | undefined;
}

export interface IPdf {
  generate(document: ICreateDocument, options: ICreateOptions): Promise<any>;
}
