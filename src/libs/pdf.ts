import Handlebars from "handlebars";
import pdf from "html-pdf";
import {
  ICreateDocument,
  ICreateOptions,
  IPdf,
} from "../interfaces/pdf.interface";

export class Pdf implements IPdf {
  handlebars: typeof Handlebars;
  pdf: typeof pdf;

  constructor() {
    this.handlebars = Handlebars;
    this.pdf = pdf;
  }

  generate(document: ICreateDocument, options: ICreateOptions) {
    return new Promise((resolve, reject) => {
      if (!document || !document.html || !document.data) {
        reject(new Error("malformed options"));
      }

      const html = this.handlebars.compile(document.html)(document.data);
      const pdfPromise = this.pdf.create(html, options);

      switch (document.type) {
        case "buffer":
          pdfPromise.toBuffer((err, res) => {
            if (!err) resolve(res);
            else reject(err);
          });
          break;

        case "stream":
          pdfPromise.toStream((err, res) => {
            if (!err) resolve(res);
            else reject(err);
          });
          break;

        default:
          pdfPromise.toFile(document.path, (err, res) => {
            if (!err) resolve(res);
            else reject(err);
          });
          break;
      }
    });
  }
}
