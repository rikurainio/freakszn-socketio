import chalk from "chalk";
const indigo = chalk.hex("#7139a8")

export class Logger {
  static log(message: string) {
    console.log(chalk.white(message));
  }
  static qa(action: string, ...message: any[]) {
    console.log(chalk.cyan(`[ACTION]`), indigo(`${action.toUpperCase()}`), JSON.stringify(message))
  }
}