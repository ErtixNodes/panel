const js = require('@eslint/js');

module.exports = { default: [
    {files: ["**/*.js"], languageOptions: {sourceType: "commonjs"}},

    js.configs.recommended,

    {
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "warn",
            "semi": "warn",
            "no-unreachable": "error"
        }
    }
] };