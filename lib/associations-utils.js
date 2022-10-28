/* eslint-disable no-underscore-dangle */
const chalk = require("chalk");
const { lineno, typeOf } = require("../utils/util");

const __line = lineno(__filename);

module.exports = {
    // get details about an association
    getAssDetails(assAlias) {
        return _.find(this.associations, { alias: assAlias });
    },

    // return the association type
    getAssType(assAlias) {
        let details = this.getAssDetails(assAlias);
        return details && details.type;
    },

    // return the association model id (the one it is associated with)
    getAssModelID(assAlias) {
        let details = this.getAssDetails(assAlias);
        return details && details[details.type];
    },

    // get the model for this association
    getAssModel(assAlias) {
        return sails.models[this.getAssModelID(assAlias)];
    },

    // get all the associated models for this current model
    getAssedModels() {
        return this.associations.map((ass) => this.getAssModel(ass.alias));
    },

    // get all the associated models for this current model
    getAssedModelsIDs() {
        return this.getAssedModels().map((model) => model.identity);
    },

    // check if this model has the given association alias
    hasAssAlias(assAlias) {
        return this.associations.some((ass) => ass.alias === assAlias);
    },

    /** assure the param is a sails model if it's an id get the model */
    assureModelObj(model) {
        // get the model if it's a model id
        if (typeOf(model) === "string" && !(model = sails.models[model]))
            throw new Error(
                chalk`${__line()} - {red The given modelID '${model}' doesn't match any sails models!}`
            );

        if (!model || !model.identity)
            throw new Error(
                chalk`${__line()} - {red The given model:\n ${model} \n\nisn't a sails model or it has no identity.}`
            );

        return model;
    },

    /**  get all associations of the given model/modelID that associate with this model */
    getRelatedModelAssociations(model) {
        if (!(model = this.assureModelObj(model))) return [];
        // sails.log.debug(`${__line()} -  model id: %s`, model.identity);

        // filter out the model's associations that don't associate with this current model and if the resulting array has something then the given model is associated
        return model.associations.filter((ass) => ass[ass.type] === this.identity);
    },

    /**  get all associations aliases of the given model/modelID that associate with this model */
    getThatModelAssAliasesToThis(model) {
        // get that model's associations that relate to this model
        let assess = this.getRelatedModelAssociations(model);
        // now pluck the association aliases
        return (assess && assess.map((ass) => ass.alias)) || [];
    },

    // check if this model is associated with the given model/modelID
    isAssociatedThatModel(model) {
        let that;
        if (!(that = this.assureModelObj(model))) return false;

        // does that have any associations that point to this models identity? filter them and check
        return that.associations.some((ass) => ass[ass.type] === this.identity);
    },
};
