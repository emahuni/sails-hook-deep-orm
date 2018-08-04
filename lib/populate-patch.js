

module.exports =  function populatePatch (criteria, subcriteria, models){
		const seam = sails.config.extraorm.seam;
		
    //console.log('popPoly arg: %o, \n\nthis: %o', arg, this);
    // test to see if subcriteria was ommitted
    if (_.isArray(subcriteria) || _.isString(subcriteria)){
        models = subcriteria;
        subcriteria = undefined;
    }

    let populated = false;

    if(criteria.indexOf('*') >= 0 ){
        // console.log('populating all polymorphic attributes');
        _.forEach(this._WLModel.polymorphicAssociations, ass => {
            // check if the requested models wasn't defined (we want all polymorphics) or matches the one defined in ass
            if(!models || (_.isString(models) && models.toLowerCase() === ass.split(seam)[1].toLowerCase()) || (_.isArray(models) && _.includes(models, ass.split(seam)[1]))) {
                this._populate(ass, subcriteria); // populate this association
                populated = true;
            } 
        });

        if (!populated) {
            sails.log.error(`\n\nOne or more of the requested polymorphic model associations: %o wasn't defined on the model: '%s'. This must have been a typo. check your code where you are requesting a specific polymorphic associations of: %o.`, models, this._WLModel.identity, models);
        }
    } else {
        // run normal populate
        this._populate(criteria, subcriteria);
    }
    
    return this;
}

