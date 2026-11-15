import { validateContent } from "./schema";
import contentData from "../data/content.json";

/** Built-in world. Edit `packages/content/data/content.json`, not this file. */
export const fixture = validateContent(contentData);
