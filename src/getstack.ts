const getStack = (): null | any[] => {
  const oldPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;
  const stack = new Error().stack;
  Error.prepareStackTrace = oldPrepareStackTrace;

  if (stack !== null && typeof stack === "object") {
    return (stack as Array<any>).slice(2); // Trim getStack and caller.
  }
  return null;
};

export { getStack };
