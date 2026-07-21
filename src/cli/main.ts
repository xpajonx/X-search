import { Command } from "commander";
import { loginCommand } from "./login.js";
import { searchCommand } from "./search.js";
import { userCommand } from "./user.js";
import { threadCommand } from "./thread.js";
import { authCommand } from "./auth.js";

export function main() {
  const program = new Command();
  program
    .name("x-tools")
    .description("Search X (Twitter) using browser cookies")
    .version("0.1.0");

  program.addCommand(loginCommand());
  program.addCommand(searchCommand());
  program.addCommand(userCommand());
  program.addCommand(threadCommand());
  program.addCommand(authCommand());

  return program.parseAsync(process.argv);
}
