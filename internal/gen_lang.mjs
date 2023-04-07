import {getTag} from "@sozialhelden/ietf-language-tags";
import path from "path";
import {fileURLToPath} from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename) + "/../lang";

// find all language files
const files = (await fs.readdir(__dirname)).map(e => e.replace(/\.[^.]+$/, ""));

console.log("Found languages", files.join`, `);

// parse all language strings
const langs = files.map(file => getTag(file));

const meta_file = __dirname + "/../lib/meta.ts";
const meta_content = await fs.readFile(meta_file, "utf8");
// flag example: /*__FLAG_START__*/[]/*__FLAG_END__*/
// replace the content between the flags with the new language list
const new_meta_content = meta_content.replace(
    /\/\*__FLAG_START__\*\/.+\/\*__FLAG_END__\*\//,
    `/*__FLAG_START__*/${JSON.stringify(langs)}/*__FLAG_END__*/`,
);
await fs.writeFile(meta_file, new_meta_content, "utf8");
