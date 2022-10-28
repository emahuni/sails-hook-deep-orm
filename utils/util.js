const chalk = require("chalk");
const Lineno = require("lineno");
const typeOf = require("type-detect");
const path = require("path");

module.exports = {
    lineno: (fn) => {
        let l = new Lineno(fn);
        return () => chalk`{gray.bold ${path.basename(l.filename)} @${l.get()}}`;
    },

    typeOf: (v) => typeOf(v).toLowerCase(),
};
