const __line = Lineno(__filename);

// the workhorse of aggregatePolyPopData
const aggregatePolyPopRecord = function (deffered, rec) {
    let polyOpts = deffered._meta("polymorphic");

    // sails.log(`${__line()} - polyOpts: `);
    // console.dir(polyOpts, {depth: 2});

    // go through each association record key and push into aggregate array
    _.forEach(this._polymorphicAssociations, (ass) => {
        if (rec.hasOwnProperty(ass)) {
            if (!_.isEmpty(rec[ass])) {
                // sails.log.debug(`${__line()} res[ass]: `);
                // console.dir(rec[ass], {depth: null});

                // only keep the ones that aren't empty
                if (polyOpts.usePolyAttribKey) {
                    if (_.isUndefined(rec[this._polymorphicAttribKey])) {
                        rec[this._polymorphicAttribKey] = [];
                    }

                    rec[this._polymorphicAttribKey].push(
                        polyOpts.useModelKey ? { [this.getAssModelID(ass)]: rec[ass] } : rec[ass]
                    );
                } else {
                    // go thru all query info criterias (that's models that were polymorphically populated against the current model)
                    // for(let cri of _.find(def._meta('deep').queryInfo.criterias, { 'isPolymorphic': true }).criterias){
                    // inject each polymorphic model's records
                    // pcRec[cri.assModelID] = results[0][cri.assModelID];
                    // }
                    rec[this.getAssModelID(ass)] = rec[ass];
                }
            }

            // clean up association data from the record
            delete rec[ass];
        }
    });

    return rec;
};

// aggregate populated polymorphic attributes data into one common attribute that is determined by the polymorphic attribute key for the given record(s). eg: related
module.exports = function aggregatePolyPopData(records) {
    // check if this is a polymorphic model first; bail if not.
    if (!this._WLModel.isPolymorphic) return records;

    // bind with seam partial argument attached so that we don't have to use it each time
    let _records,
        _aggregatePolyPopRecord = _.bind(aggregatePolyPopRecord, this._WLModel, this);

    if (_.isArray(records)) {
        // console.log("handle for multiple records");
        _records = [];
        // aggregate populated polymorphic data for each record
        _.forEach(records, (rec, i) => {
            // put back in records;
            _records.push(_aggregatePolyPopRecord(rec));
        });
    } else if (_.isObject(records)) {
        // console.log("handle for single record, use with findOne records");
        _records = _aggregatePolyPopRecord(records);
    } else {
        sails.log.warn(
            `${__line()} - This should be shown, there is a bug in the hook or you passed a none record to aggregatePolyPopData`
        );
    }

    return _records;
};
