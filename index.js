/* eslint-disable no-underscore-dangle */
const _typeOf = require("type-detect");
const Lineno = require("lineno");
const path = require("path");
const utils = require("dot-wild");
const chalk = require("chalk");

const polymorphicPatch = require("./lib/polymorphic-patch");
const patchModelMethods = require("./lib/patch-model-methods");

global.chalk = chalk;
global.typeOf = (v) => _typeOf(v).toLowerCase();
global.Lineno = (fn) => {
    let l = new Lineno(fn);
    return () => chalk`{gray.bold ${path.basename(l.filename)} @${l.get()}}`;
};

module.exports = function definePolymorphicHook(sails) {
    // keep the original function
    const { loadModels } = sails.hooks.moduleloader;

    utils.filter = (data, route) => data.filter((d) => utils.has(d, route));

    return {
        configure: function () {
            // console.dir(sails.config);
        },

        defaults: {
            __configKey__: {
                // tokens used in a populate path
                tokens: {
                    poly: "*",
                    deep: ".",
                    incl: "&",
                },
                polySeam: "-_-", // plymorphic seam used to concatenate the polymorphic attribute key, model name and association attribute
            },
        },

        initialize: function (cb) {
            function load(cb2) {
                // call the original function to do its thing and our patch as the callback function
                loadModels((err, models) => {
                    if (err) {
                        return cb2(err, models);
                    }

                    // modify the models according to polymorphic rules
                    // send raw model objects for polymorphic relashionships injection
                    sails.log.info("DEEP-ORM - Patching loadModels with deep orm logic...");
                    models = polymorphicPatch(models);

                    // call the actual cb which is in normal sails pipeline
                    return cb2(err, models);
                });
            }

            // monkey patch the load models function
            sails.hooks.moduleloader.loadModels = load;

            sails.on("hook:orm:loaded", () => {
                sails.log.info("DEEP-SAILS-ORM - Patching model methods with deep ORM logic...");

                patchModelMethods(sails.models);

                // Then call cb() to finish patching
                return cb();
            });
        },

        utils,
    };
};
