/* eslint-disable no-underscore-dangle */
const chalk = require("chalk");
const { lineno, typeOf } = require("../utils/util");
const utilss = require("./associations-utils");

const __line = lineno(__filename);

const populatePatch = require("./populate-patch");
const aggregatePolyPopData = require("./aggregate-poly-pop-data");

const findPatch = function (criteria) {
    let deffered = this._find(criteria);

    patchInstanceMethods(deffered);

    return deffered;
};

const findOnePatch = function (criteria) {
    let deffered = this._findOne(criteria);

    patchInstanceMethods(deffered);

    return deffered;
};

const findOneCreatePatch = function (criteria, initVals) {
    let deffered = this._findOneCreate(criteria, initVals);

    patchInstanceMethods(deffered);

    return deffered;
};

const streamPatch = function (criteria) {
    let deffered = this._stream(criteria);

    patchInstanceMethods(deffered);

    return deffered;
};

// patch exec so that we can cleanup and aggregate the polymorphic associations data
const execPatch = function (cb) {
    // cancel deffereds that are flagged as cancelled
    // if(this.meta('cancelled')){
    // sails.log.debug(chalk`{keyword('orange') ${__line()} cancelling deffered query that was flagged as cancelled!}`);
    // throw new Error('cancelled deffered query!');
    // return;
    // }

    // run the default log
    this._exec((err, results, args) => {
        // sails.log.debug(chalk`{keyword('orange') ${__line()} executing wl query deffered}`);
        // console.dir(this.meta(), {depth: 3});
        // sails.log.debug(`results:`, results);

        this.aggregatePolyPopData(results);

        cb(err, results, args);
    });
};

const metaPatch = function (metadata) {
    // console.log('metadata: ', metadata, typeOf(metadata));

    // the passed arg is not normal meta syntax
    if (typeOf(metadata) !== "object") {
        if (typeOf(metadata) === "array") {
            // this return array of requested meta data keys (array of strings reffering to meta data keys)
            let metas = [];
            for (let md of metadata) {
                metas.push(this.meta(md));
            }

            return metas;
        }
        if (typeOf(metadata) === "string") {
            // this returns the meta data key reffered to by the metadata string
            return _.get(this._wlQueryInfo.meta, metadata);
        }
        // return every meta data
        return this._wlQueryInfo.meta;
    }

    // do the normal meta function of setting metadata to wl query info
    if (this._wlQueryInfo.meta) this._wlQueryInfo.meta = _.merge(this._wlQueryInfo.meta, metadata);
    else this._wlQueryInfo.meta = metadata;

    return this;
};

function inferPopType(tokens, criteria, model) {
    if (criteria.includes(tokens.deep)) {
        return "deep";
    }
    if (criteria.includes(tokens.incl)) {
        return "inclusive";
    }
    if (criteria && (criteria.includes(tokens.poly) || criteria === model._polymorphicAttribKey)) {
        return "polymorphic";
    }
    return "normal";
}

// wrap and bind instance methods to deffered obj
const patchInstanceMethods = function (deffered) {
    // just so I can understand the dictionaries, this should be commented
    global._def = deffered;
    global._wm = deffered._WLModel;
    // up to here

    deffered._populate = deffered.populate;
    deffered.populate = _.bind(populatePatch, deffered);

    deffered.aggregatePolyPopData = _.bind(aggregatePolyPopData, deffered);

    deffered._exec = deffered.exec;
    deffered.exec = _.bind(execPatch, deffered);

    // deffered._meta = deffered.meta;
    deffered._meta = _.bind(metaPatch, deffered);

    // keep some common data in the deffered

    // keep data about previous population criterias
    deffered._meta({
        deep: {
            queryInfo: {
                criterias: [],
            },
        },
    });

    // keep data about polymorphic associations on this model... put this where polyAttribKey is defined
    deffered._meta({
        polymorphic: {
            // we can't have both of the following false, one has to be true
            usePolyAttribKey: true,
            useModelKey: true,
        },
    });

    // code to determine the population type
    deffered.inferPopType = _.bind(inferPopType, deffered, sails.config.deeporm.tokens);
};

module.exports = function patchModelMethods(models) {
    // go thru all given models to map them out
    _.forIn(models, (model) => {
        // patch model methods
        model._find = model.find;
        model.find = _.bind(findPatch, model);

        model._findOne = model.findOne;
        model.findOne = _.bind(findOnePatch, model);

        model._findOneCreate = model.findOneCreate;
        model.findOneCreate = _.bind(findOneCreatePatch, model);

        model._stream = model.stream;
        model.stream = _.bind(streamPatch, model);

        // bind each model association util onto model
        _.forEach(utils, (util, key) => {
            model[key] = _.bind(util, model);
        });
    }); // models

    return models;
};
