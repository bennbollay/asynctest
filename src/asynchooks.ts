import async_hooks from "async_hooks";
import { getStack } from "./getstack";

interface HookRecord {
  asyncId: number;
  children: number[];
  duration: bigint;
  triggerAsyncId: number;
  executionAsyncId: number;
  entered?: bigint;
  name: string;
  type: string;

  onInit: bigint;
  onBefore: bigint;
  onAfter: bigint;
  onDestroy: bigint;
  onPromiseResolve: bigint;

  // Debugging
  misaligned: number;
  earlyDestroy: number;
  isInit: number;
  isBefore: number;
  isAfter: number;
  isDestroy: number;
  isPromiseResolve: number;
}

type HookRecords = { [id: number]: HookRecord };

const hookPerf: HookRecords = {};

const ensureHookRecord = (asyncId: number, triggerAsyncId: number): HookRecord => {
  let record: HookRecord = hookPerf[asyncId];
  if (record) {
    return record;
  }

  return (hookPerf[asyncId] = {
    asyncId,
    triggerAsyncId,
    executionAsyncId: async_hooks.executionAsyncId(),
    children: [],
    duration: 0n,
    name: "",
    type: "",
    onInit: 0n,
    onBefore: 0n,
    onAfter: 0n,
    onDestroy: 0n,
    onPromiseResolve: 0n,
    misaligned: 0,
    earlyDestroy: 0,
    isInit: 0,
    isBefore: 0,
    isAfter: 0,
    isDestroy: 0,
    isPromiseResolve: 0
  });
};

let ESCAPE: boolean = false;

const ESCAPABLE = (func: any) => {
  return (...params: any[]) => {
    if (!ESCAPE) {
      func(...params);
    }
  };
};

const callSiteToString = (cs: any): string => {
  let fn = cs.getFileName().substring("/home/gambit/p/fb/ts_testbed/asynctest/".length);
  return `${fn}+${cs.getLineNumber()}:${cs.getColumnNumber()} - ${cs.getFunctionName()} - ${
    cs.isToplevel() ? "top " : ""
  }${cs.isEval() ? "eval " : ""}${cs.isNative() ? "native " : ""}${cs.isConstructor() ? "const " : ""}${
    cs.isAsync() ? "async " : ""
  }${cs.isPromiseAll() ? "promise " : ""}`;
};

const hookInit = (asyncId: number, type: string, triggerAsyncId: number, resource: object): void => {
  let record = ensureHookRecord(asyncId, triggerAsyncId);
  record.isInit++;
  record.onInit = record.entered = process.hrtime.bigint();
  record.type = type;
  record.name = `${record.executionAsyncId}/${record.triggerAsyncId}->${record.asyncId} - ${record.type}\n`;

  // Acquire the stack.
  ESCAPE = true;
  let stack: any;
  if ((stack = getStack())) {
    // Filter out ESCAPABLE
    stack = stack.slice(1);

    // Filter out various internal things
    /*
    let exclude = ["internal", "events", "tty", "null", "net", "_stream", "timers"];
    stack = stack.filter((e: any) => {
      let fn = e.getFileName();
      if (!fn) {
        return false;
      }
      for (let out of exclude) {
        if (fn.startsWith(out)) {
          return false;
        }
      }
      return true;
    });
     */

    // Filter for just files in this space.
    stack = stack.filter((e: any) => {
      let fn = e.getFileName();
      if (!fn) {
        return false;
      }
      return fn.startsWith("/home/gambit/p/fb/ts_testbed/asynctest/");
    });

    for (let idx = 0; idx < stack.length; idx++) {
      record.name += callSiteToString(stack[idx]) + "\n";
    }
  }
  ESCAPE = false;
};

const hookBefore = (asyncId: number): void => {
  let record: HookRecord = ensureHookRecord(asyncId, 0);
  record.onBefore = process.hrtime.bigint();
  record.isBefore++;
  if (record.entered == undefined) {
    record.entered = process.hrtime.bigint();
  }
};

const hookAfter = (asyncId: number): void => {
  let record: HookRecord = ensureHookRecord(asyncId, 0);
  record.onAfter = process.hrtime.bigint();
  record.isAfter++;
  if (record.entered != undefined) {
    record.duration += process.hrtime.bigint() - record.entered;
    record.entered = undefined;
    return;
  }
  record.misaligned += 1;
};

const hookPromiseResolve = (asyncId: number): void => {
  let record: HookRecord = ensureHookRecord(asyncId, 0);
  record.onPromiseResolve = process.hrtime.bigint();
  record.isPromiseResolve++;
  if (record.entered != undefined) {
    record.duration += process.hrtime.bigint() - record.entered;
    record.entered = undefined;
    return;
  }
  record.misaligned += 1;
};

const hookDestroy = (asyncId: number): void => {
  let record: HookRecord = ensureHookRecord(asyncId, 0);
  record.onDestroy = process.hrtime.bigint();
  record.isDestroy++;
  if (record.entered != undefined) {
    record.duration += process.hrtime.bigint() - record.entered;
    record.entered = undefined;
    record.earlyDestroy += 1;
    return;
  }
};

export const startHooks = () => {
  const asyncHook = async_hooks.createHook({
    init: ESCAPABLE(hookInit),
    before: ESCAPABLE(hookBefore),
    after: ESCAPABLE(hookAfter),
    destroy: ESCAPABLE(hookDestroy),
    promiseResolve: ESCAPABLE(hookPromiseResolve)
  });
  asyncHook.enable();

  return () => asyncHook.disable();
};

export const dumpRecords = (): any => {
  return hookPerf;
};

export type IHookRecords = HookRecords;
export type IHookRecord = HookRecord;
