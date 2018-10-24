const Sails = require('sails').Sails;
const chai = require('chai');
const expect = chai.expect;
const nodeUtil = require('util');
const chalk = require('chalk');

let __line = new require('lineno')(__filename).get;

describe('Basic tests ::', function() {
    // Before running any tests, attempt to lift Sails
    before(function (done) {
        // Hook will timeout in 10 seconds
        this.timeout(11000);

        // change the working dir to test so we load test app
        process.chdir('./test/app');
        
        // Attempt to lift sails
        Sails().load({
						port: 1300,
            hooks: {
                // Load the hook before sails orm
                "deeporm": require('../'),

                // the following should be loaded only after our hook
                "orm": require('sails-hook-orm'),
            },
            log: {
                level: "debug"
            },
            
            models: {
                migrate: "drop",
            },
            
        },function (err, _sails) {
            if (err) return done(err);
            
            global.sails = _sails;
            global.log = sails.log;
            // log =  console;

						global.utils = sails.hooks.deeporm.utils;

            // console.log('models: %o', sails.models);
            return done();
        });
    });

    // After tests are complete, lower Sails
    after(function (done) {
        // Lower Sails (if it successfully lifted)
        if (sails) {
            return sails.lower(done);
        }

        // Otherwise just return
        return done();
    });

    // Test that Sails can lift with the hook in place
    it(`@${__line()} doesn\'t crash Sails`, async function() {
        return true;
    });

    context('Polymorphic Tests ::', async function () {
        var people, houses, statuses, sharedResults;
        
        before('load seeds', async function () {
            // Great care should be taken when altering the seeds, tests are highly dependant on them.
						// If altered, all passing tests should pass as they did before the alteration.
						
            // create people
            people = await Person.createEach([
                {id: 1, firstname: 'Tendai', lastname: 'Mahobho'},
                {id: 2, firstname: 'Boydho', lastname: 'Zugo'},
                {id: 3, firstname: 'Nyarai', lastname: 'Chengetwa'},  // this is the only one who is homeless :D
                {id: 4, firstname: 'Pericle', lastname: 'Ncube'},
            ]).fetch();

            // create houses
            houses = await House.createEach([
                {id: 1, address: '11055 St Mary\'s'},
                {id: 2, address: '2123 Gaydon Borrowdale'},
                {id: 3, address: '15 Chaza Harare'}, // only one without anybody home
                {id: 4, address: '1443 Murombedzi'},
            ]).fetch();

            // create statuses
            statuses = await Status.createEach([
                {id: 1, label: 'Dead', color: 'yellow'},
                {id: 2, label: 'Inactive', color: 'black'},
                {id: 3, label: 'Zero', color: 'white'},
                {id: 4, label: 'Full', color: 'blue' },
                {id: 5, label: 'Dangerous', color: 'red' }, // unused
            ]).fetch();

						// associate the records

						// for testing mostly polymorphic associations
						await Person.addToCollection(1, 'statuses', 3);
						await Person.addToCollection(1, 'statuses', 1); // 2nd status for same person. using same id to make sure we have one id thru
						
						await Person.addToCollection(3, 'statuses', 3);
						await Person.addToCollection(4, 'statuses', 2);
						await House.addToCollection(3, 'states', 2);
            await House.addToCollection(2, 'states', 3);

						// give these people houses to leave, just leave one homeless
						await House.addToCollection(1, 'occupants', 1); // using same id to make sure we have one id thru
            await House.addToCollection(2, 'occupants', 4);
            await House.addToCollection(1, 'states', 1);
						
						// for testing mostly deep populate
						await House.addToCollection(4, 'occupants', 2);
						await House.addToCollection(4, 'states', 4);
						await Person.addToCollection(2, 'statuses', 4);
        });


				///////////////////////////////////////////////
				context(`Hook Utils`, function (){
						let data;
						before(`hook utils prep`, async function (){
								data = require('./fixtures/recs-glob');
						});
						
						context(`filter()`, function (){
								it(`@${__line()} filters out the records that don't have the full path #`, async function (){
										let results = utils.filter(data, 'affiliated.*.house.*.occupants');

										// console.debug(`${__line()} test results: `);
										// console.dir(results, {depth: null});

										expect(results).to.be.an('array').that.has.lengthOf.above(0);
										
										for(let r of results) {
												//console.dir(r);
												expect(utils.has(r, 'affiliated.*.house.*.occupants')).to.be.true;
										};
								});
								
						});
				});

				
				context('Patched orm models polymorphism successfully ::', function (){
						context ('Status - the model with polymorphic attribute', function (){
								// Status is the only one with a polymorphic attribute, so it's the only one that should have the following in this test app:
								it(`@${__line()} has polymorphic associations defined`, async function (){
										expect(Status._polymorphicAssociations, 'no polymorphic associations exists, hook ran after orm or it didn\' run properly').to.be.an('array');
								});

								it(`@${__line()} has polymorphic attribute key`, async function (){
										expect(Status._polymorphicAttribKey,'attribute that morphs according to associations has not been defined').to.be.a('string');
								});

								it(`@${__line()} has isPolymorphic attribute key`, async function (){
										expect(Status.isPolymorphic,'attribute that flags whether this is a polymorphic model or not  has not been defined').to.be.a('boolean');
								});

								it(`@${__line()} has polymorphic attributes patched in`, async function (){
										expect(Status.attributes, 'No polymorphed attributes according to expected associations').to.be.an('object').that.includes.all.keys(Status._polymorphicAssociations);
								});
						});
				});


				////////////////////////////////////////////////////////////////
				context(`Test patched model methods - Normal usage#: `, function (){
						context(`find #: `, function (){
								it(`@${__line()} creates an association between people[0] => statuses[2] and successfully uses find...then`, function (done){ 
										// now assert it
										Person.find(1).populate('statuses').then(r=>{
												
												// log.debug('test result:');
												// console.dir(r, {depth: null});
																	
												expect(r[0].statuses).to.be.an('array').that.has.lengthOf(2);
												done();
										}).catch(log.error);
								});
								
								it(`@${__line()} successfully uses await, query modifiers and populate() consecutively`, async function (){
										// should sort the statuses in reverse order on the name key
										let awaitedResult = await Person.find().sort('lastname DESC').populate('home').populate('statuses');

										// log.debug('test result:');
										// console.dir(awaitedResult, {depth: null});
										
										// the sort should have worked, if status Zero is coming on result 0
										expect(awaitedResult[0].lastname).to.be.equal('Zugo');
										expect(awaitedResult[0].home).to.be.an('object').that.is.not.empty;
										expect(awaitedResult[0].statuses).to.be.an('array').that.is.not.empty;
										
								});

								it(`@${__line()} Can be restricted by subcriteria { id: 3 }`, async function (){
										// this means that it will find all statuses, but only populate the models with specific id
										let results = await Person.find().populate('statuses', { id: 3 });
										
										// log.debug(`@${__line()} Test result:`);
										// console.dir(results, {depth: null});
										
										expect(results).to.be.an('array').that.has.lengthOf.above(0);
										
										// get each id of the records with statuses population; thus filtering out the others that don't have
										let ars_ids = utils.get(results, '*.statuses.*.id');
										expect(ars_ids).to.be.an('array').that.has.lengthOf.above(0);
										// go thru each one
										for (let ar_id of ars_ids){
												// each id should be the statuses 2 id
												expect(ar_id).to.be.equal(3);
										}
								});
						});

						
						context(`findONE #: `, function (){
								it(`@${__line()} can findOne and populate  associations:`, async function (){
										
										let r = await Person.findOne({ id: 2 }).populate('statuses');

										// log.debug('findOne and association result: ');
										// console.dir(r, {depth: null});
																
										expect(r).to.be.an('object');
										expect(r.statuses).to.be.lengthOf.above(0);
								});
								
						});

						// Can't populate findOrCreate but test to ensure nothing breaks 

						context(`findOrCreate #: `, function (){
							it(`@${__line()} can findOrCreate with Person already existing:`, async function (){
									
									let r = await Person.findOrCreate({ id: 2 }, {
										firstname: 'Test',
										lastname: 'User'
									});
								
									expect(r).to.be.an('object');
									expect(r.statuses).to.be.lengthOf.above(0);
							});

							it(`@${__line()} can findOrCreate with Person created new:`, async function (){
									
								let r = await Person.findOrCreate({ id: 999 }, {
									firstname: 'Test',
									lastname: 'User'
								});
				
								expect(r).to.be.an('object');
								expect(r.firstName).to.be.equal('Test')
								expect(r.lastname).to.be.equal('User')
						});
							
					});

						
						context(`stream #: `, function (){
								it(`@${__line()} can stream and populate all  associations on model using populateAll():`, async function (){
										
										let results = [];
										await Person.stream().populateAll().eachRecord((rec, next)=>{
												results.push(rec);

												next();
										});

										// log.debug('stream polymorphic association result: ');
										// console.dir(results, {depth: null});
										
										expect(results).to.be.an('array');
										// these records are of all people, most don't have a home. therefore, seek the first one with a home and test that
										expect(utils.filter(results, 'home.createdAt')[0].home).to.be.an('object').that.is.not.empty;
										expect(utils.get(results, '*.statuses')[0]).to.be.an('array').that.is.not.empty;
								});
								
						});
				});


				////////////////////////////////////////
				context(`Test patched model instance methods #: `, function (){
						context(`Populate #`, function () {

								///////////////////////////////////////////////////////////
								context(`Polymorphic Population Tests #`, function (){
										it(`@${__line()} Can populate all polymorphic associations between houses[3] <= statuses[3] and people[1] <= statuses[3] - using '*'`, async function (){
												
												// polymorphic methods are only found on polymorphic models chete
												let r = await Status.find(4).populate('*');
												
												// log.debug(`@${__line()} test result:`);
												// console.dir(r, {depth: null});
												
												// 'affiliated' is the polymorphic association key defined in the statuses model. see statuses model definition in test/app/api/models/Statuses.js
												expect(r[0].affiliated).to.be.an('array').that.has.lengthOf(2);
												expect(_.find(r[0].affiliated, 'house').house).to.be.an('array').that.has.lengthOf.above(0);
												expect(_.find(r[0].affiliated, 'person').person).to.be.an('array').that.has.lengthOf.above(0);
										});


										it(`@${__line()} Can populate all polymorphic associations between houses[3] <= statuses[3] and people[1] <= statuses[3] - using 'affiliated'`, async function (){
												// polymorphic methods are only found on polymorphic models chete
												let r = await Status.find(4).populate('affiliated');
												
												// log.debug(`@${__line()} test result:`);
												// console.dir(r, {depth: null});
												
												// 'affiliated' is the polymorphic association key defined in the statuses model. see statuses model definition in test/app/api/models/Statuses.js
												expect(r[0].affiliated).to.be.an('array').that.has.lengthOf(2);
												expect(_.find(r[0].affiliated, 'house').house).to.be.an('array').that.has.lengthOf.above(0);
												expect(_.find(r[0].affiliated, 'person').person).to.be.an('array').that.has.lengthOf.above(0);
										});
										

										it(`@${__line()} Populates a specific model's polymorphic association(s) only: - *house`, async function (){
												
												let r = await Status.findOne(2).populate('*house');

												// log.debug(`@${__line()} test result:`);
												// console.dir(r, {depth: null});
																								
												
												expect(r).to.be.an('object');
												expect(r.affiliated).to.be.an('array').that.has.lengthOf(1);
												expect(r.affiliated[0].house).to.be.an('array').that.is.not.empty;
										});

										
										///////////////////////////////////////////////////////
										context(`Polymorphic Subcriteria Restraint #`, function (){
												it(`@${__line()} Can populate all polymorphic associations (*) restricted by subcriteria: { id: 2 }`, async function (){
														// this means that it will find all statuses, but only populate the models with specific id (2, even if this isn't a house model)
														let results = await Status.find().populate('*', { id: 2 });
														
														// log.debug(`@${__line()} Test result:`);
														// console.dir(results, {depth: null});
														
														// 'affiliated' is the polymorphic association key defined in the statuses model. see statuses model definition in test/app/api/models/Statuses.js
														expect(results).to.be.an('array').that.has.lengthOf.above(0);
														
														// get each id of the records with affiliated population; thus filtering out the others that don't have
														let ars_ids = utils.get(results, '*.affiliated.*.*.*.id');
														expect(ars_ids).to.be.an('array').that.has.lengthOf.above(0);
														// go thru each one
														for (let ar_id of ars_ids){
																// each id should be the houses 1 id
																expect(ar_id).to.be.equal(2);
														}
												});
												
												it(`@${__line()} Populates a specific (*person) model's polymorphic association(s) only restricted by subcriteria: { id: 3 } `, async function (){
														// this means that it will find all statuses, but only populate the specific person model with id 3
														let results = await Status.find().populate('*person', { id: 3 });
	
														// log.debug(`@${__line()} Test result:`);
														// console.dir(results, {depth: null});
														
														// 'affiliated' is the polymorphic association key defined in the statuses model. see statuses model definition in test/app/api/models/Statuses.js
														expect(results).to.be.an('array').that.has.lengthOf.above(0);
														
														// get each id of the records with affiliated population; thus filtering out the others that don't have
														let ars_ids = utils.get(results, '*.affiliated.*.*.*.id');
														expect(ars_ids).to.be.an('array').that.has.lengthOf.above(0);
														// go thru each one
														for (let ar_id of ars_ids){
																// each id should be the people 2 id
																expect(ar_id).to.be.equal(3);
														}
												});

										});										
						
										///////////////////////////////////////////////////////
										context(`Polymorphic Records presentation options ::`, function () {	
												it(`@${__line()} Respects 'usePolyAttribKey: false' meta option - pop: Status.*person ::`, async function (){
														
														let r = await Status.find({id: 2})._meta({ polymorphic: { usePolyAttribKey: false } }).populate('*person');

														// log.debug('test result:');
														// console.dir(r, {depth: null});
														
														expect(r).to.be.an('array');
														
														expect(r[0].affiliated).to.be.undefined;
														expect(r[0].person).to.be.an('array').that.has.lengthOf.above(0);
														
												});
												
												it(`@${__line()} Respects 'useModelKey: false' meta option - pop: Status.*person ::`, async function (){
														
														let r = await Status.find({id: 2})._meta({ polymorphic: { useModelKey: false } }).populate('*person');

														// log.debug('test result:');
														// console.dir(r, {depth: null});
														
														expect(r).to.be.an('array');
														
														expect(r[0].affiliated).to.be.an('array').that.has.lengthOf.above(0);
														expect(_.find(r[0].affiliated, 'person')).to.be.undefined;
														
												});
												
												it(`@${__line()} Corrects 'usePolyAttribKey & useModelKey: false' meta options (both cannot be false) - pop: Status.*person ::`, async function (){
														// get the deffered obj
														let def = Status.find({id: 2});

														// log.debug(`@${__line()} deffered: `);
														// console.dir(def, {depth: 3});
														
														// populate and get results
														let r = await def._meta({ polymorphic: { usePolyAttribKey: false, useModelKey: false } }).populate('*person');
		
														// log.debug('test result:');
														// console.dir(r, {depth: null});
														
														// test the deffered meta opts
														expect(def._meta('polymorphic').usePolyAttribKey).to.be.true;
														expect(def._meta('polymorphic').useModelKey).to.be.false;
														
														expect(r).to.be.an('array');

														expect(r[0].affiliated).to.be.an('array').that.has.lengthOf.above(0);
														expect(_.find(r[0].affiliated, 'person')).to.be.undefined;
												});
												
										});


								});



								////////////////////////////////////////////////////////
								context (`Inclusive Population Tests #`, function () {
										it(`@${__line()} Populates Person.home&statuses (inclusive population) ::`, async function (){		
												let r = await Person.find({id: 2}).populate('home&statuses');

												// log.debug('inclusive test result:');
												// console.dir(r, {depth: null});
																	
												expect(r).to.be.an('array');
												
												expect(r[0].home).to.be.an('object').that.is.ok;
												expect(r[0].statuses).to.be.an('array').that.has.lengthOf.above(0);
									
										});
						
										it(`@${__line()} Populates Status.*person&*house (inclusive models polymorphic population) ::`, async function (){
												let r = await Status.find({id: 2}).populate('*person&*house');

												// log.debug('test result:');
												// console.dir(r, {depth: null});
																	
												expect(r).to.be.an('array');
												
												expect(_.find(r[0].affiliated, 'person').person).to.be.an('array').that.has.lengthOf.above(0);
												expect(_.find(r[0].affiliated, 'house').house).to.be.an('array').that.has.lengthOf.above(0);
									
										});

										///////////////////////////////////////////////////////
										context(`Inclusive Subcriteria Restraint #`, function (){
												it(`@${__line()} Applies subcriteria to all inclusive population associations (home&statuses) since an obj was passed: { id: 2 }`, async function (){
														// this means that it will find all statuses, but only populate the models with specific id (2, even if this isn't a house model)
														let results = await Person.find().populate('home&statuses', { id: 2 });
														
														// log.debug(`@${__line()} Test result:`);
														// console.dir(results, {depth: null});
														
														expect(results).to.be.an('array').that.has.lengthOf.above(0);
														
														let ars = utils.get(results, '*.home');
														// log.debug(`@${__line()} ars:`);
														// console.dir(ars, {depth: null});
														expect(ars).to.be.an('array').that.has.lengthOf.above(0);
														// go thru each one
														for (let ar of ars){
																if(!ar) continue;
																// each id should be the houses 1 id
																expect(ar).to.be.an('object').that.is.not.empty;
														}
														
														let ars_ids = utils.get(results, '*.statuses.*.id');
														expect(ars_ids).to.be.an('array').that.has.lengthOf.above(0);
														// go thru each one
														for (let ar_id of ars_ids){
																// each id should be the houses 1 id
																expect(ar_id).to.be.equal(2);
														}
												});
												
												it(`@${__line()} Populates specific (*person&*house) models' polymorphic association(s) only, and restricts by subcriteria a single: { id: 3 } `, async function (){
														// this means that it will find all statuses, but only populate the specific person model with id 3
														let results = await Status.find().populate('*person&*house', { id: 3 });
														
														// log.debug(`@${__line()} Test result:`);
														// console.dir(results, {depth: null});
														
														// 'affiliated' is the polymorphic association key defined in the statuses model. see statuses model definition in test/app/api/models/Statuses.js
														expect(results).to.be.an('array').that.has.lengthOf.above(0);
														
														// get each id of the records with affiliated population; thus filtering out the others that don't have
														let ars_ids = utils.get(results, '*.affiliated.*.*.*.id');
														// log.debug(`@${__line()} ars_ids:`);
														// console.dir(ars_ids, {depth: null});
														expect(ars_ids).to.be.an('array').that.has.lengthOf.above(0);
														// go thru each one
														for (let ar_id of ars_ids){
																// each id should be the people 2 id
																expect(ar_id).to.be.equal(3);
														}
												});

												it(`@${__line()} Populates specific (*person&*house) models' polymorphic association(s) only, restricts by subcriteria multiple criterias: [{ id: 3 }, {id: 4 }] `, async function (){
														// this means that it will find all statuses, but only populate the specific person model with id 3
														let results = await Status.find().populate('*person&*house',  [{ id: 3 }, {id: 4 }]);
														
														// log.debug(`@${__line()} Test result:`);
														// console.dir(results, {depth: null});
														
														// 'affiliated' is the polymorphic association key defined in the statuses model. see statuses model definition in test/app/api/models/Statuses.js
														expect(results).to.be.an('array').that.has.lengthOf.above(0);
														
														// get each id of the records with affiliated -> person population; thus filtering out the others that don't have
														let ars_ids = utils.get(results, '*.affiliated.*.person.*.id');
														// log.debug(`@${__line()} ars_ids:`);
														// console.dir(ars_ids, {depth: null});
														expect(ars_ids).to.be.an('array').that.has.lengthOf.above(0);
														// go thru each one
														for (let ar_id of ars_ids){
																// each id should be the people 2 id
																expect(ar_id).to.be.equal(3);
														}
														
														// get each id of the records with affiliated -> house population; thus filtering out the others that don't have
														ars_ids = utils.get(results, '*.affiliated.*.house.*.id');
														// log.debug(`@${__line()} ars_ids:`);
														// console.dir(ars_ids, {depth: null});
														expect(ars_ids).to.be.an('array').that.has.lengthOf.above(0);
														// go thru each one
														for (let ar_id of ars_ids){
																// each id should be the people 2 id
																expect(ar_id).to.be.equal(4);
														}
												});
												
												it(`@${__line()} Populates specific (*person&*house) models' polymorphic association(s) only, restricts by subcriteria multiple criterias: [{ id: 3 }, {}] `, async function (){
														// this means that it will find all statuses, but only populate the specific person model with id 3
														let results = await Status.find().populate('*person&*house',  [{ id: 3 }, {}]);
														
														// log.debug(`@${__line()} Test result:`);
														// console.dir(results, {depth: null});
														
														// 'affiliated' is the polymorphic association key defined in the statuses model. see statuses model definition in test/app/api/models/Statuses.js
														expect(results).to.be.an('array').that.has.lengthOf.above(0);
														
														// get each id of the records with affiliated -> person population; thus filtering out the others that don't have
														let ars_ids = utils.get(results, '*.affiliated.*.person.*.id');
														// log.debug(`@${__line()} ars_ids:`);
														// console.dir(ars_ids, {depth: null});
														expect(ars_ids).to.be.an('array').that.has.lengthOf.above(0);
														// go thru each one
														for (let ar_id of ars_ids){
																// each id should be the people 2 id
																expect(ar_id).to.be.equal(3);
														}
														
														// get each id of the records with affiliated -> house population; thus filtering out the others that don't have
														ars_ids = utils.get(results, '*.affiliated.*.house.*.id');
														// log.debug(`@${__line()} ars_ids:`);
														// console.dir(ars_ids, {depth: null});
														expect(ars_ids).to.be.an('array').that.has.lengthOf.above(1);
												});

										});										
										

										
								});


								

								//////////////////////////////////////////////////////////
								context(`Deep Population Tests #`, function (){
										
										it(`@${__line()} Deep Populates Person.home.states (normal associations) ::`, async function (){
												
												let r = await Person.find(2).populate('home.states');

												// log.debug('deep populate result:');
												// console.dir(r, {depth: null});
												
												expect(r).to.be.an('array');
												expect(r[0].home.states).to.be.an('array').that.has.lengthOf.above(0);
										});

										it(`@${__line()} Deep Populates Person.home.occupants.home.states (normal associations, 4 stages deep and cyclic - infinitely deep posible) ::`, async function (){
												
												let results = await Person.find(2).populate('home.occupants.home.states');

												// log.debug('deep populate result:');
												// console.dir(results, {depth: null});
												
												expect(results).to.be.an('array');
												expect(results[0].home.occupants[0].home.states).to.be.an('array').that.has.lengthOf.above(0);
										});

										
										//////////////////////////////////////////////////////////////////////
										context(`Deep Inclusive populations #`, function (){
												it(`@${__line()} Deep Populates Person.home&statuses.states&occupants.statuses&home.states (normal associations, tokenized - infinitely deep posible) ::`, async function (){
														
														let r = await Person.find(2).populate('home&statuses.states&occupants.statuses&home.states');

														// log.debug('deep populate result:');
														// console.dir(r, {depth: null});
														
														expect(r).to.be.an('array');
														expect(r[0].statuses).to.be.an('array').that.has.lengthOf.above(0);
														expect(r[0].home.states).to.be.an('array').that.has.lengthOf.above(0);
														expect(r[0].home.occupants[0].statuses).to.be.an('array').that.has.lengthOf.above(0);
														expect(r[0].home.occupants[0].home.states).to.be.an('array').that.has.lengthOf.above(0);
												});
										});

								
										//////////////////////////////////////////////////////////////////////
										context(`Deep Polymorphic Populations #`, function (){
												it(`@${__line()} Deep Populates Person.statuses.* (normal associations -> all polymorphs) ::`, async function (){
														
														let results = await Person.find(2).populate('statuses.*');

														// log.debug('deep populate result:');
														// console.dir(results, {depth: null});
														
														expect(results).to.be.an('array');
														expect(results[0].statuses[0].affiliated).to.be.an('array').that.has.lengthOf.above(0);
												});
												
												
												it(`@${__line()} Deep Populates Person.statuses.*.home (normal associations -> all polymorphs -> normal) ::`, async function (){
														
														let r = await Person.find(2).populate('statuses.*.home');

														// log.debug('deep populate result:');
														// console.dir(r, {depth: null});
														
														expect(r).to.be.an('array');
														expect(_.find(r[0].statuses[0].affiliated, 'house').house).to.be.an('array').that.has.lengthOf.above(0);
														expect(_.find(r[0].statuses[0].affiliated, 'person').person[0].home).to.be.an('object').that.is.ok;
														
												});
												
												
												it(`@${__line()} Deep Populates Person.statuses.*house.states (normal associations -> specific model polymorph -> normal) ::`, async function (){
														
														let results = await Person.find(2).populate('statuses.*house.states');

														// log.debug('test result:');
														// console.dir(results, {depth: null});
														
														expect(results).to.be.an('array');
														expect(_.find(results[0].statuses[0].affiliated, 'house').house[0].states).to.be.an('array').that.has.lengthOf.above(0);
												});
												

												it(`@${__line()} Deep Populates Person.statuses.*person.home (normal associations -> specific multi-models polymorph -> multi-normal) ::`, async function (){
														
														let r = await Person.find(2).populate('statuses.*person.home');

														// log.debug('deep populate result:');
														// console.dir(r, {depth: null});
														
														expect(r).to.be.an('array');
														expect(_.find(r[0].statuses[0].affiliated, 'person').person[0].home).to.be.an('object').that.includes.all.keys(['createdAt']);
												});
												
												
												
												it(`@${__line()} Try to Deep Populate unrelated data but don't crush the hook Status.*house.occupants.statuses (status 5 has no person or house association) ::`, async function (){
														// this status isn't associated with any house or person. it shouldn't crush the hook
														let results = await Status.find(5).populate('*house.occupants.statuses');

														// log.debug('deep populate result:');
														// console.dir(results, {depth: null});
														
														expect(results).to.be.an('array');
														expect(_.find(results[0].affiliated, 'house')).to.be.undefined;
												});


												it(`@${__line()} Deep Populates Person.home.states.affiliated (normal associations -> morphed attrib (all polymorphs)) ::`, async function (){
														
														let r = await Person.find(2).populate('home.states.affiliated');

														// log.debug('deep populate result:');
														// console.dir(r, {depth: null});
														
														expect(r).to.be.an('array');
														expect(_.find(r[0].home.states[0].affiliated, 'house').house).to.be.an('array').that.has.lengthOf.above(0);
														expect(_.find(r[0].home.states[0].affiliated, 'person').person).to.be.an('array').that.has.lengthOf.above(0);

												});
												

												// do a complete cyclic deep populate
												it(`@${__line()} Deep Populates Person.home.states.affiliated.home (normal associations -> morphed attrib (all polymorphs) -> normal) ::`, async function (){
														let r = await Person.find(2).populate('home.states.affiliated.home');

														// log.debug('deep populate result:');
														// console.dir(r, {depth: null});
														
														expect(r).to.be.an('array');
														expect(_.find(r[0].home.states[0].affiliated, 'house').house).to.be.an('array').that.has.lengthOf.above(0);
														expect(_.find(r[0].home.states[0].affiliated, 'person').person[0].home).to.be.an('object').that.includes.all.keys(['createdAt']);

												});

												// do a complete cyclic deep populate
												it(`@${__line()} Deep Populates Person.home.states.affiliated.home&occupants (normal associations -> morphed attrib (all polymorphs) -> multi-normal) ::`, async function (){
														let r = await Person.find(2).populate('home.states.affiliated.home&occupants');

														// log.debug('deep populate result:');
														// console.dir(r, {depth: null});
														
														expect(r).to.be.an('array');
														expect(_.find(r[0].home.states[0].affiliated, 'house').house).to.be.an('array').that.has.lengthOf.above(0);
														expect(_.find(r[0].home.states[0].affiliated, 'house').house[0].occupants).to.be.an('array').that.has.lengthOf.above(0);
														expect(_.find(r[0].home.states[0].affiliated, 'person').person[0].home).to.be.an('object').that.includes.all.keys(['createdAt']);

												});

												
												//////////////////////////////////////////////////////////////////////
												context(`Deep Inclusive Polymorphic Populations #`, function (){
														
														it(`@${__line()} Deep Populates Person.statuses.*house.states&occupants (normal associations -> specific model polymorph -> normal) ::`, async function (){
																
																let r = await Person.find(2).populate('statuses.*house.states&occupants');

																// log.debug('test result:');
																// console.dir(r, {depth: null});
																
																expect(r).to.be.an('array');
																expect(_.find(r[0].statuses[0].affiliated, 'house').house[0].states).to.be.an('array').that.has.lengthOf.above(0);
																expect(_.find(r[0].statuses[0].affiliated, 'house').house[0].occupants).to.be.an('array').that.has.lengthOf.above(0);
														});
														
														it(`@${__line()} Deep Populates Person.statuses.*house&*person (normal associations -> specific multi-models polymorph) ::`, async function (){
																
																let r = await Person.find(2).populate('statuses.*house&*person');

																// log.debug('deep populate result:');
																// console.dir(r, {depth: null});
																
																expect(r).to.be.an('array');
																expect(_.find(r[0].statuses[0].affiliated, 'house').house).to.be.an('array').that.has.lengthOf.above(0);
																expect(_.find(r[0].statuses[0].affiliated, 'person').person).to.be.an('array').that.has.lengthOf.above(0);
														});

														
														
														it(`@${__line()} Deep Populates Person.statuses.*house&*person.home&occupants (normal associations -> specific multi-models polymorph -> multi-normal) ::`, async function (){
																
																let r = await Person.find(2).populate('statuses.*house&*person.home&occupants');

																// log.debug('deep populate result:');
																// console.dir(r, {depth: null});
																
																expect(r).to.be.an('array');
																expect(_.find(r[0].statuses[0].affiliated, 'house').house[0].occupants).to.be.an('array').that.has.lengthOf.above(0);
																expect(_.find(r[0].statuses[0].affiliated, 'person').person[0].home).to.be.an('object').that.includes.all.keys(['createdAt']);
														});
														
														it(`@${__line()} handles Deep Population with missing segment (throws for it) 'Person.home&statuses.*house.statuses&*' ::`, async function (){
																let results = await Person.find().populate('home&statuses.*house.statuses&*');

																// log.debug('deep populate result:');
																// console.dir(results, {depth: null});
																
																expect(results).to.be.an('array');

																let filter;
																expect(utils.filter(results, 'home.createdAt')).to.be.an('array').that.is.not.empty;
																expect(filter = utils.filter(results, 'statuses.*.*.*.house')).to.be.an('array').that.is.not.empty;
																
																// statuses and * are void since we don't have such on house model, therefore the whole filter should be void;
																filter = utils.filter(results, 'statuses.*.*.*.house.*.statuses');
																filter = filter.concat(filter, utils.filter(results, 'statuses.*.*.*.house.*.affiliated'))
																// log.debug(`${__line()} filter:\n`, filter);
																expect(filter).to.be.empty;
																
														});
														
														it(`@${__line()} handles Complex Deep Populations 'Person.home&statuses.*house&occupants&states' ::`, async function (){
																let results = await Person.find().populate('home&statuses.*house&occupants&states');

																// log.debug('deep populate result:');
																// console.dir(results, {depth: null});
																
																expect(results).to.be.an('array');

																let filter;
																// check on status
																expect(filter = utils.filter(results, 'statuses.*.*.*.house')).to.be.an('array').that.is.not.empty;
																// log.debug(`${__line()} filter:\n`, filter);

																// check on home
																expect(utils.filter(results, 'home.createdAt')).to.be.an('array').that.is.not.empty;
																
																// now get second segment criterias for home
																filter = utils.get(results, '*.home.occupants.*.createdAt');
																// log.debug(`${__line()} filter:\n`, filter);
																expect(filter).to.be.an('array').that.is.not.empty;

																filter = utils.get(results, '*.home.states.*.createdAt');
																// log.debug(`${__line()} filter:\n`, filter);
																expect(filter).to.be.an('array').that.is.not.empty;
														});
														
														it(`@${__line()} handles Complex Deep Populations 'Person.home&statuses.*house&occupants&states.statuses&*' ::`, async function (){
																let results = await Person.find().populate('home&statuses.*house&occupants&states.statuses&*');

																// log.debug('deep populate result:');
																// console.dir(results, {depth: null});
																
																expect(results).to.be.an('array');

																let filter;
																expect(utils.filter(results, 'home.createdAt')).to.be.an('array').that.is.not.empty;
																expect(filter = utils.filter(results, 'statuses.*.*.*.house')).to.be.an('array').that.is.not.empty;
																
																// statuses and * are void since we don't have such on house model, therefore the whole filter should be void;
																filter = utils.filter(results, 'statuses.*.*.*.house.*.statuses');
																filter = filter.concat(filter, utils.filter(results, 'statuses.*.*.*.house.*.affiliated'))
																// log.debug(`${__line()} filter:\n`, filter);
																expect(filter).to.be.empty;
																
														});
														
												});

										}); // deep polyphormic populates


										///////////////////////////////////////////////////////
										context(`Deep Subcriteria Restraint #`, function (){
												it(`@${__line()} Applies subcriteria to all deep populations (home.occupants.statuses) since an obj was passed: { id: 1 }`, async function (){
														let results, id = 1;
														// inspection (comment the next 3 lines)
														// results = await Person.find().populate('home.occupants.statuses');														
														// log.debug(`@${__line()} Inspection result (subcriteria: {} ): \n`, results);
														
														// this means that it will find all peoplse, but only populate the models with specific id
														results = await Person.find().populate('home.occupants.statuses', { id });
														
														// log.debug(`@${__line()} Test result (subcriteria: { id: %s } ): \n`, id, results);
														
														// home should be more than 1
														// home should be any id since it is a model and not a collection. Waterline doesn't apply subcriterias to models association types. this should be changed.
														expect(utils.get(results, '*.home.createdAt')).to.be.an('array').that.has.lengthOf.above(1);
																
														getAssertPropsHas(results, '*.home.occupants.*.id', id);
														getAssertPropsHas(results, '*.home.occupants.*.statuses.*.id', id);
												});
												
												it(`@${__line()} Applies subcriteria: { id: 1 } to every criteria in deep inclusive polymorphic population "home&statuses.*house&occupants&states.statuses&*"`, async function (){
														let results, id = 1;
														// inspection (comment the next 3 lines)
														// results = await Person.find().populate('home&statuses.*house&occupants&states.statuses&*');
														// log.debug(`@${__line()} Inspection result (subcriteria: { } ): \n`, results);
														
														// this means that it will find all peoplse, but only populate the models with specific id = 1
														results = await Person.find().populate('home&statuses.*house&occupants&states.statuses&*', { id });
														
														// log.debug(`@${__line()} Test result (subcriteria: { id: %s } ): \n`, id, results);
														
														expect(results).to.be.an('array').that.has.lengthOf.above(0);
														
														// home should be any id since it is a model and not a collection. Waterline doesn't apply subcriterias to models association types. this should be changed.
														expect(utils.get(results, '*.home.createdAt')).to.be.an('array').that.is.not.empty;
																
														// go in for occupants
														getAssertPropsHas(results, '*.home.occupants.*.id', id);
														getAssertPropsHas(results, '*.home.occupants.*.statuses.*.id', id);
														// go in for (pindira ;D) home states
														getAssertPropsHas(results, '*.home.states.*.id', id);
														getAssertPropsHas(results, '*.home.states.*.affiliated.*.*.*.id', id);
														
														// go in for (pindira ;D) person statuses
														getAssertPropsHas(results, '*.statuses.*.id', id);
														getAssertPropsHas(results, '*.statuses.*.affiliated.*.house.*.id', id);

												});

												it(`@${__line()} Populates specific (*person&*house) models' polymorphic association(s) only, restricts by subcriterias: [{ id: 3 }, {id: 4 }] `, async function (){
														// this means that it will find all statuses, but only populate the specific person model with id 3
														let results;

														results = await Status.find().populate('*person&*house',  [{ id: 3 }, {id: 4 }]);
														
														// log.debug(`@${__line()} Test result: \n`, results);
														
														// get each id of the records with affiliated -> person population; thus filtering out the others that don't have
														getAssertPropsHas(results, `*.affiliated.*.person.*.id`, 3);
														getAssertPropsHas(results, `*.affiliated.*.house.*.id`, 4);
												});
												
												it(`@${__line()} Populates specific (*person&*house) models' polymorphic association(s) only, restricts by subcriteria multiple criterias: [{ id: 3 }, {}] `, async function (){
														// this means that it will find all statuses, but only populate the specific person model with id 3
														let results = await Status.find().populate('*person&*house',  [{ id: 3 }, {}]);
														
														// log.debug(`@${__line()} Test result:\n`, results);
														
														// get each id of the records with affiliated -> person population; thus filtering out the others that don't have
														getAssertPropsHas(results, '*.affiliated.*.person.*.id', 3);
														// just assert it to be ok
														getAssertPropsHas(results, '*.affiliated.*.house.*.id');
														
												});

																								
												it(chalk`@${__line()} Applies complex multi-subcriteria: \n{cyan.dim [[\{ address: \{ contains: '11055' \} \}, \{ color: 'blue'\}],[\{ address: \{ endsWith: 'Murombedzi'\} \}, \{ lastname: 'Mahobho' \}, \{ label: 'Dead' \}], [\{\}, \{ or : [ \{ firstname: 'Tendai' \}, \{ address: \{ contains: '11055' \} \} ] \}]]} \n{grey to each corresponding criteria in deep inclusive polymorphic population segments} \n{cyan.dim home&statuses.*house&occupants&states.statuses&*}`, async function (){
														let results, id = 1;
														// inspection (comment the next 3 lines)
														// results = await Person.find().populate('home&statuses.*house&occupants&states.statuses&*');
														// log.debug(`@${__line()} Inspection result (subcriteria: { } ): \n`, results);
														
														// this means that it will find all peoplse, but only populate the models with specific id = 1
														results = await Person.find().populate('home&statuses.*house&occupants&states.statuses&*', [[{ address: { contains: '11055' } }, { color: 'blue'}],[{ address: { endsWith: 'Murombedzi'} }, { lastname: 'Mahobho' }, { label: 'Dead' }], [{}, { or : [ { firstname: 'Tendai'}, {address: {contains: '11055'} } ]}]]);

														// let d = nodeUtil.inspect.defaultOptions.depth;
														// nodeUtil.inspect.defaultOptions.depth = null;
														// log.debug(`@${__line()} Test result (subcriteria: { id: %s } ): \n`, id, results);
														// nodeUtil.inspect.defaultOptions.depth = d;
														
														expect(results).to.be.an('array').that.has.lengthOf.above(0);
														
														// home should be any id since it is a model and not a collection. Waterline doesn't apply subcriterias to models association types. this should be changed.
														expect(utils.get(results, '*.home.createdAt')).to.be.an('array').that.is.not.empty;

														// pindira home; remember that home is singular so no subcriteria was ever used
														// getAssertPropsContains(results, '*.home.address', '11055');
														// pindira home occupants
														getAssertPropsContains(results, '*.home.occupants.*.lastname', 'Mahobho');
														getAssertPropsHas(results, '*.home.occupants.*.statuses');
														// go in for (pindira ;D) home states
														getAssertPropsHas(results, '*.home.states.*.label', 'Dead');
														getAssertPropsHas(results, '*.home.states.*.affiliated.*.house.*.id', 1);
														getAssertPropsHas(results, '*.home.states.*.affiliated.*.person.*.id', 1);
														
														// go in for (pindira ;D) statuses
														getAssertPropsHas(results, '*.statuses.*.color', 'blue');
														getAssertPropsContains(results, '*.statuses.*.affiliated.*.house.*.address', 'Murombedzi');

												});


										});										
										

																				
								}); // deep populations

								
						});
				});

        
    });
});




/**
 * assert the given properties are all equal to the control
 * @param {array} ids
 * @param {number} id
 */
function getAssertPropsHas(data, path, control){
		expect(data, 'given data array is empty!').to.be.an('array').that.has.lengthOf.above(0);
		
		let props = utils.get(data, path);
		// log(`${__line()} '${path}' gathered properties: `, props);
		
		expect(props, chalk`\n'${path}' props isn't an array or it is empty! \n{green.italic (the given path could be wrong and not getting the expected properties or the actual records don't exist. check path and fixtures.)}\nGiven data: \n${data}\n`).to.be.an('array').that.has.lengthOf.above(0);

		// go thru each one
		for (let prop of props){
				if (control) {
						// prop should be same as the control
						expect(prop, `'${path}' property ${prop} isn't equal to ${control}!`).to.be.equal(control);
				} else {
						expect(prop, `'${path}' property ${prop} isn't ok!`).to.be.ok;
				}
		}
}


/**
 * assert the given properties are all equal to the control
 */
function getAssertPropsHas(data, path, control){
		expect(data, 'given data array is empty!').to.be.an('array').that.has.lengthOf.above(0);
		
		let props = utils.get(data, path);
		// log(`${__line()} '${path}' gathered properties: `, props);
		
		expect(props, chalk`\n'${path}' props isn't an array or it is empty! \n{green.italic (the given path could be wrong and not getting the expected properties or the actual records don't exist. check path and fixtures.)}\nGiven data: \n${data}\n`).to.be.an('array').that.has.lengthOf.above(0);

		// go thru each one
		for (let prop of props){
				if (control) {
						// prop should be same as the control
						expect(prop, `'${path}' property ${prop} isn't equal to ${control}!`).to.be.equal(control);
				} else {
						expect(prop, `'${path}' property ${prop} isn't ok!`).to.be.ok;
				}
		}
}


/**
 * assert the given properties contains the control
 */
function getAssertPropsContains(data, path, control){
		expect(data, 'given data array is empty!').to.be.an('array').that.has.lengthOf.above(0);
		
		let props = utils.get(data, path);
		// log(`${__line()} '${path}' gathered properties: `, props);
		
		expect(props, chalk`\n'${path}' props isn't an array or it is empty! \n{green.italic (the given path could be wrong and not getting the expected properties or the actual records don't exist. check path and fixtures.)}\nGiven data: \n${nodeUtil.format(data)}\n`).to.be.an('array').that.has.lengthOf.above(0);

		// go thru each one
		for (let prop of props){
				if (control) {
						// prop should be same as the control
						expect(prop, `'${path}' property ${prop} doesn't contain ${control}!`).to.contain(control);
				} else {
						expect(prop, `'${path}' property ${prop} isn't ok!`).to.be.ok;
				}
		}
}
