const polymorphicPatch = require('./lib/polymorphic-patch');
const patchModelMethods = require('./lib/patch-model-methods');

module.exports = function definePolymorphicHook (sails) {		
    // keep the original function
    const loadModels = sails.hooks.moduleloader.loadModels;

		
    return {
				defaults: {
						// save the combination of chars that is used to seperate polymorphicAssociationsKey, model and association attribute
						__configKey__: {
								seam: '-_-',
						}
				},
				
        initialize: function(cb) {
            // monkey patch the load models function
            sails.hooks.moduleloader.loadModels = function (cb2) {
                // call the original function to do its thing and our patch as the callback function
                loadModels(function(err, models){
                    if (err){
                        return cb2(err, models);
                    }

                    // modify the models according to polymorphic rules
                    // send raw model objects for polymorphic relashionships injection
										sails.log.info('EXTRA-ORM - Patching loadModels with polymorphic logic...');
                    models = polymorphicPatch(models);
                    
                    // call the actual cb which is in normal sails pipeline
                    return cb2(err, models);
                });
            }

            

            sails.on('hook:orm:loaded', function (){
                sails.log.info('EXTRA-ORM - Patching model methods...');

                patchModelMethods(sails.models);
                
                // Then call cb() to finish patching
                return cb();
            });

        },
    };
}
