import async_hooks from "async_hooks";

const testFunc = async function testAsyncPromises() {
  await new Promise((resolve, reject) =>
    setTimeout(async () => {
      console.log("in timeout", async_hooks.executionAsyncId());
      resolve();
    }, 500)
  );
  await new Promise((resolve, reject) =>
    setTimeout(async () => {
      console.log("in timeout", async_hooks.executionAsyncId());
      resolve();
    }, 500)
  );
  await new Promise((resolve, reject) =>
    setTimeout(async () => {
      console.log("in timeout", async_hooks.executionAsyncId());
      resolve();
    }, 500)
  );
  await new Promise((resolve, reject) =>
    setTimeout(async () => {
      console.log("in timeout", async_hooks.executionAsyncId());
      resolve();
    }, 500)
  );
};

const fullTest = async function fullTestFunc() {
  await testFunc();
  //await testFunc();
  //await testFunc();
  //await testFunc();
};

export { fullTest };
