const typeOf = require('type-detect');

// the workhorse of aggregatePolyPopData
const aggregatePolyPopRecord = function (rec) {
		const seam = sails.config.extraorm.seam;
		
    let aggregate = [];

    // go through each association record key and push into aggregate array
    _.forEach(this.polymorphicAssociations,  ass => {
        if(rec.hasOwnProperty(ass)){
            // only keep the ones that aren't empty
            if(typeOf(rec[ass]) === 'Array' && rec[ass].length > 0){
                aggregate.push(
                    {[ass.split(seam)[1]]: rec[ass]} // infer the related model using the given relationship string
                );
            }

            // clean up association data from the record
            // rec = _.omit(rec, ass); // somehow omit isn't working as expected becoz of seam i think
            delete rec[ass];
        }
    });

    // merge the aggregated association data into the polymorphic attribute
    rec[this.polyAttribKey] = _.union(rec[this.polyAttribKey], aggregate);

    return rec;
};



// aggregate populated polymorphic attributes data into one common attribute that is determined by the polymorphic attribute key for the given record(s). eg: related 
module.exports = function aggregatePolyPopData (records) {
    // bind with seam partial argument attached so that we don't have to use it each time
    let _records, _aggregatePolyPopRecord = _.bind(aggregatePolyPopRecord, this._WLModel);
    
    if(_.isArray(records)){
        // console.log("handle for multiple records");
        _records = [];
        // aggregate populated polymorphic data for each record
        _.forEach(records, (rec, i) => {
            // put back in records;
            _records.push (_aggregatePolyPopRecord(rec));
        });               
    } else if(_.isObject(records)) {
        // console.log("handle for single record, use with findOne records");
        _records = _aggregatePolyPopRecord(records);
    } else {
        sails.log.warn('This should be shown, there is a bug in the hook or you passed a none record to aggregatePolyPopData');
    }
    
    return _records;
}
