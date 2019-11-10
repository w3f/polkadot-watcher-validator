module.exports = {
  root: true,
  env: {
    browser: false,
    node: true,
    es6: true
  },
  parserOptions: {
    ecmaVersion: 2018
  },
  extends: [
    "eslint:recommended",
  ],
  plugins: [],
  rules: {
    "semi": [2, "never"],
    "no-console": "off"
  }
}
