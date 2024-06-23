const js = require('@eslint/js');

module.exports = [
    {
        files: ["**/*.js"], languageOptions: {
            sourceType: "commonjs",
            globals: {
                env: {
                    "node": true,
                    "commonjs": true
                },
            }
        }
    },

    js.configs.recommended,

    {
        rules: {
            "no-unused-vars": "error",
            "no-undef": "error",
            "semi": "error",
            "no-unreachable": "error"
        }

    }
];