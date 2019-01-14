import { join } from "path";
import { DefaultConfig } from "./config";

export const defaultConfig: DefaultConfig = {
  templatePath: join(__dirname, "../scss/template.scss"),
  fontTargetPath: join(__dirname, "../../icons"),
  fontRelPath: "../assets/fonts/",
  scssTargetPath: ".tmp-custom-icons/scss/",
  scssRelPath: "../scss/${name}.scss",
  debug: false
};
