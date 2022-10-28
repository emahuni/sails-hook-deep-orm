const { lineno } = require("../utils/util");

const __line = lineno(__filename);

module.exports = function mapPolymorphic(models, polymorphicModel, polyAttribKey, polyAttrib) {
    // get the polymorphic attribute's key
    const polymorphicModelID = polymorphicModel.identity;

    const { polySeam } = sails.config.deeporm;

    // We have to find if they are a model linked to this key
    _.forIn(models, (model) => {
        // sails.log.debug(`${__line()} examining model: `);
        // console.dir(model, {depth: null});

        // go thru all attributes of this model
        _.forIn(model.attributes, (attrib, attribKey) => {
            // is this model's attribute referring to the polymorphic model's id and via its polymorphic key?
            if (
                attrib.hasOwnProperty("via") &&
                attrib.via === polyAttribKey &&
                ((attrib.hasOwnProperty("model") && attrib.model === polymorphicModelID) ||
                    (attrib.hasOwnProperty("collection") &&
                        attrib.collection === polymorphicModelID))
            ) {
                let type = null;

                // sails.log.debug(`${__line()} relationship found on model: `, model.identity);

                // now create the inverse mapping polymorphically, using the type of relation required by the polymorphic attribute
                if (polyAttrib.hasOwnProperty("collection")) {
                    type = "collection";
                } else if (polyAttrib.hasOwnProperty("model")) {
                    type = "model";
                }

                if (type) {
                    // create the unique relationship
                    let relation = `${polyAttribKey}${polySeam}${model.identity}${polySeam}${attribKey}`;

                    // insert the polymorphic attribute into the polymorphic model's attributes
                    models[polymorphicModelID].attributes[relation] = _.merge(
                        { [type]: model.identity },
                        type === "collection" ? { via: attribKey } : {}
                    );
                    // sails.log.debug('ins relation in %o: %o',polymorphicModelID, models[polymorphicModelID]);

                    // store all polymorphic relations about this model somewhere
                    if (models[polymorphicModelID].hasOwnProperty("_polymorphicAssociations")) {
                        models[polymorphicModelID]._polymorphicAssociations.push(relation);
                    } else {
                        // store polymorphic association
                        models[polymorphicModelID]._polymorphicAssociations = [relation];

                        // merge in polymorphic association utilities
                        models[polymorphicModelID] = _.merge(
                            models[polymorphicModelID],
                            require("./associations-poly-utils")
                        );

                        // store the original polymorphic attribute's key
                        models[polymorphicModelID]._polymorphicAttribKey = polyAttribKey;

                        models[polymorphicModelID].isPolymorphic = true;
                    }

                    // insert the inverse of the relation in the related model. nb: this side will always be collection since it uses via
                    models[model.identity].attributes[attribKey].via = relation;

                    // break the loop and go to the next model
                    return false;
                }
                // implement some form of warning or error, the key for the relation wasn't defined at all in the attrib as expected. could leave it for waterline
            }
        });

        // make sure the isPolymorphic key is defined
        if (!model.hasOwnProperty("isPolymorphic")) {
            model.isPolymorphic = false;
        }
    });

    return models;
};
