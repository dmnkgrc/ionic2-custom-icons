import { join, resolve } from "path";
import { appendFile as fsAppendFile, writeFile as fsWriteFile } from "fs";
import { copy as fsCopy, emptyDirSync } from "fs-extra";
import { merge as _merge } from "lodash";
import * as gulp from "gulp";
import { Config } from "./config";
import { containsWhitespace, logError, logInfo, logWarn } from "./util";
import { defaultConfig } from "./default-config";
import { gulpCustomIcons } from "./gulp-custom-icons";
const webfont = require("webfont").default;

const taskName = "customIcons",
  envConfig = "custom_icons",
  cwd = process.cwd();

// Main function called by the npm script
export function run() {
  const config: Config = _merge(defaultConfig, getConfigFileData());

  validateConfig(config);

  cleanTargetDirs(config);
  const formats = ["ttf", "eot", "woff", "woff2", "svg"];
  for (let iconSet of config.iconSets) {
    webfont({
      files: iconSet.src,
      fontName: `custom-icons-${iconSet.id}`,
      formats,
      normalize: true,
      centerHorizontally: true,
      fontHeight: 1000,
      template: resolve(__dirname, "../scss/template.scss"),
      templateClassName: `set-${iconSet.id}`,
      templateFontPath: config.fontRelPath,
      glyphTransformFn: (obj: any) => {
        obj.name = `icon-${obj.name}`;

        return obj;
      }
    }).then((result: any) => {
      fsWriteFile(
        `${config.scssTargetPath}custom-icons-${iconSet.id}.scss`,
        result.template,
        err => {}
      );
      formats.forEach(format => {
        fsWriteFile(
          `${config.fontTargetPath}custom-icons-${iconSet.id}.${format}`,
          result[format],
          err => {}
        );
      });
    });
  }

  createSassVarsFile(config)
    .then(() => {
      logInfo(`ionic3-custom-icons: Successfully created icons`);
    })
    .catch(err => {
      logError(`ionic3-custom-icons: Error creating custom icons: ${err}`);
      // Allow Node to exit gracefully
      process.exitCode = 1;
    });
}

function getConfigFileData() {
  const configRelFilePath = process.env["npm_package_config_" + envConfig],
    configFilePath = join(cwd, configRelFilePath);
  return require(configFilePath);
}

function createIcons(config: Config): Promise<any> {
  return new Promise((resolve, reject) => {
    gulp.task(taskName, () => gulpCustomIcons(config));
    gulp.series(taskName)((err: any) => {
      if (err) {
        logError(`ionic2-custom-icons: Error creating custom icons: ${err}`);
        reject();
      } else {
        resolve();
      }
    });
  });
}

function createSassVarsFile(config: Config): Promise<any> {
  const src = join(__dirname, "./../scss/variables.scss"),
    dest = join(cwd, config.scssTargetPath, "variables.scss");
  return new Promise((resolve, reject) => {
    // Copy (nearly) empty variables.scss
    fsCopy(src, dest, (err: any) => {
      if (err) {
        const msg = `Error copying "${src}" to "${dest}": ${err}`;
        reject(msg);
        return;
      }
      // Generate import statements
      let scssImports: string = "";
      for (let iconSet of config.iconSets) {
        scssImports += '\n@import "' + "custom-icons-" + iconSet.id + '";';
      }
      // Write import statements to target variables.scss
      fsAppendFile(dest, scssImports, (err: any) => {
        if (err) {
          const msg = `Error adding imports to "${dest}": ${err}`;
          reject(msg);
          return;
        }
        resolve();
      });
    });
  });
}

function validateConfig(config: Config) {
  if (!config.iconSets) throw "Missing property 'iconSets'.";

  for (let set of config.iconSets) {
    if (!set.src) throw new Error("Missing property 'src' in icon set.");
    if (containsWhitespace(set.name))
      throw new Error("Property 'name' contains whitespace.");
    if (!set.id) throw new Error("Missing property 'id' in icon set.");
    if (containsWhitespace(set.id))
      throw new Error("Property 'id' contains whitespace.");
    if (set.name)
      logWarn(
        "ionic2-custom-icons: Property 'name' in config is obsolete and safe to remove."
      );
  }
}

function cleanTargetDirs(config: Config) {
  try {
    emptyDirSync(config.fontTargetPath);
    emptyDirSync(config.scssTargetPath);
  } catch (err) {
    throw new Error(`Error cleaning target dirs : ${err}`);
  }
}
