const js = require('@eslint/js');

module.exports = [
    js.configs.recommended,

    {
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "warn",
            "semi": "warn",
            "no-unreachable": "error"
        }
    }
];