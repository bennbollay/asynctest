import { startHooks, dumpRecords, IHookRecord, IHookRecords } from "./asynchooks";

import fs from "fs";
import async_hooks from "async_hooks";

import { fullTest } from "./test";

type IHookRecordKey = keyof IHookRecord;

const perfToFlame = (records: IHookRecords): object => {
  let data: any = {};
  let result = [];

  const convert = (e: IHookRecord): any => {
    let tooltip = e.name; //`init: ${e.isInit} before: ${e.isBefore} after: ${e.isAfter} destroy: ${e.isDestroy} promise: ${e.isPromiseResolve} misaligned: ${e.misaligned} earlyDestroy: ${e.earlyDestroy}\n${e.name}`;

    return {
      name: e.name.split("\n")[1],
      tooltip,
      timing: {
        onInit: Number(e.onInit),
        onBefore: Number(e.onBefore),
        onAfter: Number(e.onAfter),
        onPromiseResolve: Number(e.onPromiseResolve),
        onDestroy: Number(e.onDestroy),
        duration: Number(e.duration)
      },
      children: [],
      value: Number(e.duration)
    };
  };

  let hKey: IHookRecordKey = "executionAsyncId";

  // Build hierarchy
  for (let key in records) {
    let recKey: IHookRecord = records[key];

    // Filter out anything that didn't take any time.
    if (recKey.duration == 0n) {
      console.log(`Skipped entry ${recKey.asyncId} - ${JSON.stringify(convert(recKey), null, 2)}`);
      continue;
    }

    // Add this item
    if (!data[recKey.asyncId]) {
      data[recKey.asyncId] = convert(recKey);
    }

    if ((recKey[hKey] as number) > 1) {
      let recTrigger: IHookRecord = records[recKey[hKey] as number];

      // Add the parent
      if (!data[recTrigger.asyncId]) {
        data[recTrigger.asyncId] = convert(recTrigger);
      }

      // Relate the two.
      data[recTrigger.asyncId].children.push(data[recKey.asyncId]);
    } else {
      // Add the top level objects.
      result.push(data[recKey.asyncId]);
    }
  }

  const adjustValue = (e: any): number => {
    let s = e.children.reduce((a: number, v: number): number => a + adjustValue(v), 0);
    e.value = Math.max(s, e.timing.duration);
    return e.value;
  };

  return {
    name: "root",
    value: result.reduce((a: any, v: any): number => a + adjustValue(v), 0),
    children: result
  };
};

(async () => {
  const stopHooks: any = await startHooks();
  await fullTest();
  await stopHooks();
  fs.writeFile("flame.json", JSON.stringify(perfToFlame(dumpRecords()), null, 2), err => console.log(err));
})();

console.log("pending");
