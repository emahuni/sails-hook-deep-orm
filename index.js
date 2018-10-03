const _typeOf = require ('type-detect');
global.typeOf = (v)=>{
		return _typeOf(v).toLowerCase();
};


const path = require('path');
global.Lineno = (fn)=>{
		let l = new (require('lineno'))(fn);
		return () =>chalk`{gray.bold ${path.basename(l.filename)} @${l.get()}}`; 
};
global.chalk = require('chalk');


const polymorphicPatch = require('./lib/polymorphic-patch');
const patchModelMethods = require('./lib/patch-model-methods');



module.exports = function definePolymorphicHook (sails) {		
    // keep the original function
    const loadModels = sails.hooks.moduleloader.loadModels;

		const utils = require('dot-wild');
		utils.filter = (data, path) => data.filter(d => utils.has(d, path));
		
    return {
				configure: function(){
						// console.dir(sails.config);
				},
				
				defaults: {
						__configKey__: {
								// tokens used in a populate path
								tokens: {
										poly: '*',
										deep: '.',
										incl: '&',
								},
								polySeam: '-_-', // plymorphic seam used to concatenate the polymorphic attribute key, model name and association attribute
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
										sails.log.info('DEEP-ORM - Patching loadModels with deep orm logic...');
                    models = polymorphicPatch(models);
                    
                    // call the actual cb which is in normal sails pipeline
                    return cb2(err, models);
                });
            }   

            sails.on('hook:orm:loaded', function (){
                sails.log.info('DEEP-ORM - Patching model methods with deep orm logic...');

                patchModelMethods(sails.models);
                
                // Then call cb() to finish patching
                return cb();
            });

        },

				utils,
    };
}
