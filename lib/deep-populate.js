const __line = Lineno (__filename);
const utils = sails.hooks.deeporm.utils;

/////////////////////////////////
// populate the given record's next criteria until we run out of next criterias
const popRecsNextCri = async function (argins) {
		// sails.log(`${__line()} - argins: `);
		// console.dir(argins, {depth: 3});
		argins.initialSubcriteria  = _.cloneDeep(argins.subcriteria);
		argins.initialNextSubcriteria  = _.cloneDeep(argins.nextSubcriteria);
		
		let promises = [];
		// only try to populate the next if we havea criteria to populate
		if(argins.criteria){
				if(typeOf(argins.records) === 'array'){
						// go thru each record. nb: using for... in so that i maintain the pointer to the record being processed
						// ... for later modification
						for(let recI in argins.records) {
								argins.record = argins.records[recI];
								promises.push(singleRecPopNextCri (argins));
								
								// sails.log(`${__line()} rec ended`.padEnd(200, '~') + '\n');
						}
						
						return Promise.all(promises);
				} else {
						argins.record = argins.records;
						return singleRecPopNextCri (argins);
				}
		}

		// sails.log(`${__line()} depth ended`.padEnd(100, '-') + '\n');
		
		return false;
};


//////////////////////////////////////////////////////////////
const singleRecPopNextCri = function (argins) {
		// sails.log(`${__line()} - argins: `);
		// console.dir(argins, {depth: 5});
		// sails.log(`${__line()} - argins record: `);
		// console.dir(argins.record, {depth: 5});

		// MAKE THIS PART ASYNC FOR EFFICIENCY, BY COLLECTING PROMISES AND RESOLVING THEM AFTER THE LOOP
		let promises = [];

		
		// go thru each previous query criteria
		for(let prevCri of argins.prevQueryInfo.criterias) {
				// argins.nextSubcriteria = _.cloneDeep(argins.initialNextSubcriteria);
				// sails.log(`${__line()} - prevCri: `, prevCri);
				
				// if this previous criteria was a poly attrib key, then we have more to do coz there were several criterias done for this one
				if(prevCri.wasPolymorphic){
						// go thru each criteria
						for(let pCri of prevCri.criterias){
								//argins.nextSubcriteria = _.cloneDeep(argins.initialNextSubcriteria);
								// sails.log.debug(`${__line()} - pCri: `);
								// console.dir(pCri, {depth: 2});

								argins.currentModel = pCri.assModel; // get the model of the ass
								argins.currentModelID = pCri.assModelID;
								// sails.log.debug(`${__line()} - argins.currentModelID: `, argins.currentModelID);

								let polyAttribKeyModelRecs;

								// choose between the two presentation options. The checking makes sure we don't hit an error on undefined 
								if(argins.polymorphic.usePolyAttribKey && argins.record[pCri.model._polymorphicAttribKey]){
										// sails.log.debug(`${__line()} - argins.record: %s, \npCri.model._polymorphicAttribKey: %s, \nargins.currentModelID: %s`, argins.record, pCri.model._polymorphicAttribKey, argins.currentModelID);
										// sails.log.debug(`${__line()} - _.find(argins.record[pCri.model._polymorphicAttribKey], argins.currentModelID): `, _.find(argins.record[pCri.model._polymorphicAttribKey], argins.currentModelID));
										polyAttribKeyModelRecs = argins.polymorphic.useModelKey ?  _.find(argins.record[pCri.model._polymorphicAttribKey], argins.currentModelID)[argins.currentModelID] : argins.record[pCri.model._polymorphicAttribKey]; // TODO: find a way to identify the models that are spread onto the attrib key without their model ID.
								} else {
										polyAttribKeyModelRecs = argins.record[argins.currentModelID];
								}
								
								// sails.log.debug(`${__line()} - polyAttribKeyModelRecs: `, polyAttribKeyModelRecs);
								// if there is no hit with the required data then go on to the next
								if(!polyAttribKeyModelRecs) {
										continue;
								}
								
								// sails.log(`${__line()} - argins criteria: `, argins.criteria);

								// go into next depth and populate into the prev criteria record(s) for each model
								// get the records for this prev criteria polymorphic model
								promises.push(nextDepth(polyAttribKeyModelRecs, argins));
								
						}
				} else {
						// get the model that is associated with the model that was used in the query thru the used criteria
						argins.currentModel = prevCri.assModel;
						argins.currentModelID = prevCri.assModelID; // store the model id for better debugging, later
						// sails.log(`${__line()} - currentModel: `, argins.currentModel.identity);

						// if the record is undefined then ignore it and continue to the next one
						if (!argins.record[prevCri.criteria]) {
								continue;
						}
						
						// go into next depth and populate into the prev criteria record(s)
						promises.push(nextDepth(argins.record[prevCri.criteria], argins));
				}

				argins.subcriteria = _.cloneDeep(argins.initialSubcriteria);
				argins.nextSubcriteria = _.cloneDeep(argins.initialNextSubcriteria);
				// sails.log(`${__line()} prev Criteria done`.padEnd(200, '_') + '\n');
		}

		return Promise.all(promises);
};


//////////////////////////////////////////////////////////// nextDepth
const nextDepth = function (prevCriRecs, argins){
		// sails.log(`${__line()} - prevCriRecs: `);
		// console.dir(prevCriRecs, {depth: 2});
		// sails.log(`${__line()} - argins: `);
		// console.dir(argins, {depth: 2});

		// was it a collection of records (an array)?
		if(typeOf(prevCriRecs) === 'array'){
				let promises = [];
				// go thru each of these previous cri records
				for(let pcRec of prevCriRecs){
						// populate the next criteria into it and injecting association when ready
						promises.push(popPrevCriRecAss(pcRec, argins));
				}

				// create a grand promise that we watch for resolutions
				return Promise.all(promises).then(r => {
						// sails.log(`${__line()} - NextDepth Promise resolutions: `)
						// console.dir(r, {depth: null});
						return r;
				});
		} else {
				// work with the single record by populating it and injecting association when ready
				return popPrevCriRecAss (prevCriRecs, argins);
		}
};


//////////////////////////////////////////////////////////// popPrevCriRecAss
// populate the given previous criteria record association and return the promise (it doesn't wait for resolutions)
// this function will automatically inject the results when they resolve.
const popPrevCriRecAss = async function (pcRec, argins){
		// sails.log(`popPrevCriRecAss ${__line()} - argins: `);
		// console.dir(argins, {depth: 2});
		// sails.log(`${__line()} - pcRec: `);
		// console.dir(pcRec, {depth: null});

		// retrieve and populate the next criteria record with argins data (don't wait for it)
		let def = argins.currentModel.findOne({id: pcRec.id});

		
		// set the polymorphic records presentation options
		def._meta({ polymorphic:  argins.polymorphic }) ;
		
		def._meta({'populationType': 'deep-stage-2'});
		def.populate(argins.criteria, argins.subcriteria);

		// console.log(`${__line()} deffered deep query info: `)
		// console.dir( def._meta('deep').queryInfo, {depth: 4});
		
		// the reason we are doing this instead of catching a populate error is coz we want to give the algorithm a chance to ignore some populations on certain models as the deep population syntax dictates
		// check if the population was done (if prevQueryInfo criterias is empty then nothing happened)
		if(def._meta('deep').queryInfo.criterias.length <= 0) {
				// sails.log.warn(chalk`{keyword('orange') ${__line()} - popPrevCriRecAss couldn't populate: '${argins.criteria}' on model '${argins.currentModelID}'! {italic.green it's normal if the population is inclusive and you know you don't care about non-hits for specific model that don't have that particular association.} deep-path-cul-de-sac _________________________________}`);
				// sails.log.error(err);
				// sails.log.debug(`${__line()} rejection argins: `);
				// console.dir(argins, {depth: 3});
				// sails.log.debug(`${__line()} rejection deep info: `);
				// console.dir(def._meta('deep').queryInfo, {depth: 3});
				
				// promisify it so that we end this deffered. I don't know how to cancel a deffered or even if it can be cancelled at all.
				await def; // just do it, though for nothing, ahhhh but why (hair pulling and all happening here, almost went for therapy)
				// I am just going to hack in soon by seeing what exec is doing, do it and then bypass the handling of the exec _handleExec blah blah >:(
				return false;
		}

		
		// now let the flow go on, but wait for the actual db processing it, inject the record and try to go deeper into the population path
		return def.then(results => {
				// sails.log(''.padEnd(100, '_') + '\n');
				// sails.log.debug(chalk`${__line()} {cyan.bold.underline popPrevCriRecAss() promise resolution} \n- {bold previous criteria rec} {italic (the one with the criteria being populated)}: \n`, pcRec);
				// sails.log(chalk`${__line()} - {bold Population results} {dim '%s'}: \n`, argins.criteria, results);

				// sails.log.debug(`${__line()} deffered: `)
				// console.dir(def, {depth: 4});
				// sails.log(`${__line()} - argins: `);
				// console.dir(argins, {depth: 2});

				// The previous mergeRecData function was troublesome for nothing. This does the same thing, wish i had realised this earlier!
				// The problem was on just assigning results to pcRec would break the link to the javascript ealier obj of pcRec. So I had to do it manually.
				pcRec = _.merge(pcRec, results);

				// sails.log(chalk`${__line()} {blue.bold.underline final Record:} - {dim '%s'} \n`, argins.criteria, pcRec);

				// sails.log(`${__line()} \ndeep-path-cul-de-sac`.padEnd(100, '_') + '\n');
				
				////////////////////////////////////////////////// conclusion
				
				// now push for the next records population, like the initial, but this time from internal
				let _argins = {
						nextCriteria: _.clone(argins.nextCriteria), // clone the current position of our deep criteria path
						nextSubcriteria: _.clone(argins.nextSubcriteria), 
						prevQueryInfo: def._meta('deep').queryInfo, // use the recent population's query info
				};


				// Keep the polymorphic options
				_argins.polymorphic = def._meta('polymorphic');
				
				_argins.criteria = _argins.nextCriteria && _argins.nextCriteria.shift(); // get and remove the first subscriteria
				_argins.subcriteria = typeOf(_argins.nextSubcriteria) === 'array' ? _argins.nextSubcriteria.shift() : _argins.nextSubcriteria; // get and remove the first subscriteria if it is an array, otherwise it's just applying to all criterias

				// sails.log.debug(chalk`${__line()} {underline next depth subcriteria:} \n%s, \n{underline nextSubcriteria:} \n%s`, _argins.subcriteria, _argins.nextSubcriteria);
				
				// _argins.records = pcRec[argins.criteria];
				_argins.records = pcRec;
				
				// console.log(`${__line()}  `);
				// console.dir(def, {depth: 2});

				// redo the cycle again so that we go deeper into the population path
				return popRecsNextCri(_argins);
		}).catch((err)=>{
				// TODO: use flaverr to rethrow this error
				sails.log.error(chalk`{red ${__line()} - couldn't populate: '${argins.criteria}' on model '${argins.currentModelID}'! }`, err);

				return err;
		});

};





module.exports = {
		popRecsNextCri,
		singleRecPopNextCri,
		nextDepth,
		popPrevCriRecAss,
}
