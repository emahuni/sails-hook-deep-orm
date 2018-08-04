

module.exports = function mapPolymorphic (models, polymorphicModel, polyAttribKey, polyAttrib) {
    // get the polymorphic attribute's key
    const polymorphicModelID = polymorphicModel.identity;
		
		const seam = sails.config.extraorm.seam;

      // We have to find if they are a model linked to this key
    _.forIn(models, model => {
          // go thru all attributes of this model
        _.forIn(model.attributes, (attrib, attribKey) => {
                  // is this model's attribute referring to the polymorphic model's id and via its polymorphic key?
            if (attrib.hasOwnProperty('via') && attrib.via === polyAttribKey &&
                ((attrib.hasOwnProperty('model') && attrib.model === polymorphicModelID) ||
                 attrib.hasOwnProperty('collection') && attrib.collection === polymorphicModelID)) {
                    let type = null;

                    // now create the inverse mapping polymorphically, using the type of relation required by the polymorphic attribute 
                    if (polyAttrib.hasOwnProperty('collection')) {
                        type = 'collection';
                    } else if (polyAttrib.hasOwnProperty('model')) {
                        type = 'model';
                    }

                    if (type) {
                        // create the unique relationship
                        let relation = `${polyAttribKey}${seam}${model.identity}${seam}${attribKey}`;
                        
                        // insert the polymorphic attribute into the polymorphic model's attributes 
                        models[polymorphicModelID].attributes[relation] = _.merge({ [type]: model.identity }, type === 'collection' ? {via: attribKey}: {});
                        // sails.log.debug('ins relation in %o: %o',polymorphicModelID, models[polymorphicModelID]);

                        // store all polymorphic relations about this model somewhere
                        if(models[polymorphicModelID].hasOwnProperty('polymorphicAssociations')){
                            models[polymorphicModelID].polymorphicAssociations.push(relation);
                        } else {
                            models[polymorphicModelID].polymorphicAssociations = [relation];
                        }

                        // store the original polymorphic attribute's key
                        if(!models[polymorphicModelID].hasOwnProperty('polyAttribKey')){
                            models[polymorphicModelID].polyAttribKey = polyAttribKey;
                        }

                        // insert the inverse of the relation in the related model. nb: this side will always be collection since it uses via
                        models[model.identity].attributes[attribKey].via = relation;

                        // break the loop and go to the next model
                        return false;
                    }  else {
                        // implement some form of warning or error, the key for the relation wasn't defined at all in the attrib as expected. could leave it for waterline
                    }
                }
          });
    });


    return models;
}
