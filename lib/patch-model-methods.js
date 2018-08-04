

const populatePatch = require('./populate-patch');
const aggregatePolyPopData = require('./aggregate-poly-pop-data');


// INSTANCE METHODS PATCHES


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
const execPatch =  function (cb) {    
    // run the default log
    this._exec((err, results, args)=>{
        this.aggregatePolyPopData(results);

        cb(err, results, args);
    });
};



// wrap and bind instance methods to deffered obj
const patchInstanceMethods = function (deffered){
    deffered._populate = deffered.populate;
    deffered.populate = _.bind(populatePatch, deffered);

    deffered.aggregatePolyPopData = _.bind(aggregatePolyPopData, deffered);

    deffered._exec =  deffered.exec;
    deffered.exec = _.bind(execPatch, deffered);
};






module.exports = function patchModelMethods  (models) {
    // go thru all given models to map them out
    _.forIn(models, model =>{
        // patch model methods
        model._find = model.find;
        model.find = _.bind(findPatch, model);
        
        model._findOne = model.findOne;
        model.findOne = _.bind(findOnePatch, model)

        model._findOneCreate = model.findOneCreate;
        model.findOneCreate = _.bind(findOneCreatePatch, model);

        model._stream = model.stream;
        model.stream = _.bind(streamPatch, model);
    });                         // models
            
    return models;
}
