import {
  MiddlewareAPI,
  Dispatch,
  AnyAction,
  Middleware,
} from "@reduxjs/toolkit";
import chalk from "chalk";
import asciichart from "asciichart";

export const fancyLogger = ((storeAPI: MiddlewareAPI) =>
  (next: Dispatch) =>
  (action: AnyAction) => {
    const start = performance.now();
    const prevState = storeAPI.getState();

    console.groupCollapsed(
      `${chalk.cyan.bold("🟦 Redux Action:")} ${chalk.yellow(action.type)}`
    );

    if (action.payload && typeof action.payload === "object") {
      console.log(chalk.gray("📦 Payload:"));
      console.table(action.payload);
    } else if (action.payload) {
      console.log(chalk.gray("📦 Payload:"), action.payload);
    }

    const result = next(action);
    const end = performance.now();
    const duration = (end - start).toFixed(2);

    const nextState = storeAPI.getState();

    console.log(chalk.gray("🔍 State changed keys:"));
    const diffKeys = Object.keys(nextState).filter(
      (key) => JSON.stringify(prevState[key]) !== JSON.stringify(nextState[key])
    );
    if (diffKeys.length === 0) console.log(chalk.red("❌ No changes"));
    else console.table(diffKeys.map((k) => ({ changed: k })));

    if (nextState.cart?.items?.length > 0) {
      const data = nextState.cart.items.map((item: any) => item.quantity);
      console.log(chalk.magenta("📊 Cart Quantity Chart:"));
      console.log(asciichart.plot(data, { height: 10 }));
    }

    console.log(chalk.green(`⚡ Action processed in ${duration} ms`));
    console.groupEnd();

    return result;
  }) as Middleware;
