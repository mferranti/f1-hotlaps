/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  testPathIgnorePatterns: ["/node_modules/", "/ios/", "/android/", "/modules/pip/(ios|android)/"],
};
