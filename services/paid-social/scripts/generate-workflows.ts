import { writeFileSync } from "node:fs";
import { dir } from "../src/paths.js";
import { expandTemplates } from "../src/generate.js";

for (const [name, text] of expandTemplates()) {
  writeFileSync(dir("workflows", name), text);
  console.log(`wrote workflows/${name}`);
}
