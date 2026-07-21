#!/usr/bin/env node
import { main } from "../dist/src/cli/main.js";
process.env.X_TOOLS_DIR = process.env.X_TOOLS_DIR || `${process.env.HOME}/.x-cookies.json`;
main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
