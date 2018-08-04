
const mapPolymorphic = require('./map-polymorphic');



/**
* build polymorphic relationships within the passed models object
*
**/
module.exports = function polymorphicPatch (models) {
    // go thru all given models to map them out
    _.forIn(models, model =>{
        // go thru the given model to see if it has any polymorphic definition
        _.forIn(model.attributes, (attrib, attribKey) => {
            // see if this attribute is a definition of a polymorphic association
            if ((attrib.hasOwnProperty('collection') && attrib.collection === '*') || (attrib.hasOwnProperty('model') && attrib.model === '*')) {
                
                // this model attribute is a polymorphic attribute, map its relationships
                mapPolymorphic(models, model, attribKey, attrib);

                // remove the polymorphic key so it doesn't crash waterline since we are done with it.
                delete model.attributes[attribKey];
            }
            
        });                     // model.attriibutes
    });                         // models
            
    return models;
}
