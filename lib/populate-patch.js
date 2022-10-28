/* eslint-disable no-restricted-syntax */
/* eslint-disable no-underscore-dangle */
const chalk = require("chalk");
const { lineno, typeOf } = require("../utils/util");
const { popRecsNextCri } = require("./deep-populate");

const __line = lineno(__filename);

module.exports = function populatePatch(criteria, subcriteria) {
    const { tokens } = sails.config.deeporm;

    let inferedPopType = this.inferPopType(criteria, this._WLModel);

    // sails.log.debug(`${__line()} - deffered: `);
    // console.dir(this, {depth: 3});

    // let inferedPopTypePrint = this._WLModel.hasAssAlias(criteria) ? chalk.keyword('teal').bold(inferedPopType.padEnd(12)) :  chalk.redBright.bold(inferedPopType.padEnd(12));
    // let modelPrint = this._WLModel.hasAssAlias(criteria) ? chalk.keyword('teal')(this._WLModel.identity) : (inferedPopType === 'normal' ? chalk.redBright.bold(this._WLModel.identity) : chalk.red.dim(this._WLModel.identity));
    // let criteriaPrint = this._WLModel.hasAssAlias(criteria) ? chalk.green(criteria) : (inferedPopType === 'normal' ? chalk.redBright.bold(criteria) : chalk.red.dim(criteria));
    // let subcriteriaPrint = subcriteria && inferedPopType === 'normal' ? chalk.green(subcriteria) : (inferedPopType === 'normal' ? chalk.grey(subcriteria) : chalk.grey.dim(subcriteria));
    // let ch = inferedPopType === 'normal' ? chalk : chalk.dim;
    // sails.log.debug(ch(`${__line()} - inferedPopType: ${inferedPopTypePrint}  model: '${ modelPrint.padEnd(15) }', criteria: '${ criteriaPrint }', subcriteria: '${ subcriteriaPrint }': `));

    // sails.log.debug(`${__line()} - meta polymorphic: `);
    // console.dir(this._meta('polymorphic'));

    // let's check usePolyAttribKey and useModelKey, they shouldn't be both false
    if (!this._meta("polymorphic").usePolyAttribKey && !this._meta("polymorphic").useModelKey) {
        // warn about wrong flags
        sails.log.warn(
            chalk`{keyword('orange') ${__line()} 'usePolyAttribKey' and 'useModelKey' cannot be both false; setting 'usePolyAttribKey' to true.}`
        );
        this._meta("polymorphic").usePolyAttribKey = true;
    }

    // switch to the infered population type
    switch (inferedPopType) {
        case "deep": {
            // sails.log.debug(`running deep populate...: %o`, criteria);

            // remove the deep populate path separator if it is the first char
            if (criteria.startsWith(tokens.deep)) {
                // TODO warn about it
                criteria = criteria.substr(1);
            }

            let argins = {}; // begin a new cache of options and inputs
            argins.nextCriteria = criteria.split(tokens.deep); // split up the criteria into an array
            argins.criteria = argins.nextCriteria.shift(); // get and remove the first criteria

            // split the subcriteria if it is an array, this simply means we want subcriteria for each path
            argins.nextSubcriteria = subcriteria;
            if (typeOf(subcriteria) === "array") {
                argins.subcriteria = argins.nextSubcriteria.shift(); // get and remove the first subcriteria
            } else {
                argins.subcriteria = subcriteria;
            }
            // sails.log.debug(chalk`${__line()} {underline initial subcriteria:} \n%s, \n{underline nextSubcriteria:} \n%s`, argins.subcriteria, argins.nextSubcriteria);

            // argins.currentModel = this._WLModel;

            // notify of the type of population just before we use populate. up there we may want to check from wherence this came.
            this._meta({ populationType: "deep" });

            // populate the initial criteria and execute the deffered obj and return results so we do the next criteria using results we need to do this before going to any depth coz of the records. every depth is based on the records.
            return this.populate(argins.criteria, argins.subcriteria).then(async (recs) => {
                // sails.log.debug(`${__line()} - this recs: `);
                // console.dir(recs, {depth: null});

                // sails.log.debug(`${__line()} - deep queryinfo: `);
                // console.dir(this._meta('deep').queryInfo, {depth: 3, color:true});

                // cut the next criteria and subcriteria
                argins.criteria = argins.nextCriteria && argins.nextCriteria.shift();
                argins.subcriteria =
                    typeOf(argins.nextSubcriteria) === "array"
                        ? argins.nextSubcriteria.shift()
                        : argins.nextSubcriteria;
                // sails.log.debug(chalk`${__line()} {underline initial deep subcriteria:} \n%s, \n{underline nextSubcriteria:} \n%s`, argins.subcriteria, argins.nextSubcriteria);

                // get the initial population's previous criterias
                argins.prevQueryInfo = this._meta("deep").queryInfo;
                // argins.prevSubcriterias = this._meta('deep').prevSubcriterias;

                // Keep the polymorphic options
                argins.polymorphic = this._meta("polymorphic");

                // set the initial records to start from
                argins.records = recs;

                // wait for all deep populations to be done
                await popRecsNextCri(argins);

                // sails.log.debug('deepPop @103 - no nextCriteria returning this recs: %o', recs);

                // return the deep populated records
                return recs;
            });
        }

        case "inclusive": {
            //  is this an inclusive population

            // sails.log.debug(`running deep populate...: %o`, criteria);
            let criterias = criteria.split(tokens.incl); // split up the criteria
            let nextSubcriteria = subcriteria;

            for (let cri of criterias) {
                this._meta({ populationType: "inclusive" });

                // let scri = undefined;

                // // sails.log.debug(`${__line()} - inclusive populate criterias: %s => cri: %s `, criterias, cri);

                // what tha hell was i doing, this statement should just come like that. agggghhhhh!
                // split the subcriteria if it is an array, this simply means we want subcriteria for each segment
                let scri =
                    typeOf(nextSubcriteria) === "array" ? nextSubcriteria.shift() : nextSubcriteria;
                // sails.log.debug(chalk`${__line()} {underline inclusive subcriteria:} \n%s, \n{underline nextSubcriteria:} \n%s`, scri, nextSubcriteria);

                // sails.log.debug(`${__line()} - Populating inclusive association: `, cri, scri);

                // populate the criteria
                this.populate(cri, scri);
            }

            return this;
        }

        case "polymorphic": {
            // is this a polymorphic populate?
            // sails.log.debug(`running polymorphic populate...: %o`, criteria);

            // remove the first asterix if there, we don't need it anymore (don't touch any later ones)
            if (criteria.startsWith(tokens.poly)) criteria = criteria.substr(1);

            let nextSubcriteria = subcriteria;

            // split the criteria specific models separated by ampersand (this separates multiple specific models)
            let specificModelsIDs = criteria.split(tokens.poly); // array of specific models to populate. empty for all
            // prettier-ignore
            let all = (specificModelsIDs[0] === "" || criteria === this._WLModel._polymorphicAttribKey || _.isEmpty(specificModelsIDs));

            // if specificModels is empty or criteria is the poly attrib key then we want all models associated with this polymorphic model
            if (all) specificModelsIDs = this._WLModel.getAssedModelsIDs();

            // sails.log.debug(`${__line()} - specificModelsIDs: %o`, specificModelsIDs);

            // now go thru each of the defined polymorphic associations in the polymorphic model
            for (let modelID of specificModelsIDs) {
                // sails.log.debug(`${__line()} - ModelID: %o`, modelID);
                let cri;

                // split the subcriteria if it is an array, this simply means we want subcriteria for each segment
                let scri =
                    typeOf(nextSubcriteria) === "array" ? nextSubcriteria.shift() : nextSubcriteria;
                // sails.log.debug(chalk`${__line()} {underline polymorphic subcriteria:} \n%s, \n{underline nextSubcriteria:} \n%s`, scri, nextSubcriteria);

                // skip this one if this is not a polymorphic model
                if (!this._WLModel.isPolymorphic) continue;

                // get the model's associations and collapse it into a string. if it has more than one element then it will be an inclusive population
                if ((cri = this._WLModel.getPolyAssAliasesToThat(modelID).join(tokens.incl))) {
                    this._meta({ populationType: "polymorphic" });

                    // sails.log.debug(`${__line()} - Populating ${all ? 'all':'specific model'} polymorphic association - model: %s, criteria: %s, subcriteria: %s`, modelID, cri, scri);

                    // do the actual population of the polymorphic association
                    this.populate(cri, scri); // populate this association
                }
                // sails.log.debug(`${__line()} - cri: %o`, cri);
            }

            return this;
        }

        default: {
            // by default the kind of populate is normal
            if (!this._meta("populationType")) this._meta({ populationType: "normal" });

            // run normal populate
            // sails.log.debug(`running normal populate...: %o from pop type: %o`, criteria, this._meta('populationType'));
            // sails.log.debug(`${__line()} - deffered: `);
            // console.dir(this._meta('deep'), {depth: 2});

            let criteriaInfo = {
                modelID: this._WLModel.identity,
                criteria,
                subcriteria,
                wlQueryInfo: this._wlQueryInfo,
                model: this._WLModel,
                assModel: this._WLModel.getAssModel(criteria),
                assModelID: this._WLModel.getAssModelID(criteria),
            };

            // add population query to metadata for later referal
            const pushQueryInfo = (ci) => {
                this._meta("deep").queryInfo.inferedPopType = inferedPopType;
                this._meta("deep").queryInfo.criterias.push(ci);
            };

            // reject the unknown population (use of common code)
            // the reason is it's expected that some association may not exist against the model being populated using deep populate, poly populate or inclusive populate.
            // Therefore, we don't want the algorithm to abort the other associations
            // eg: home&occupants&statuses - home might not exist on the house model, but does on the person model. Therefore if there was going to be an error catching
            // in deep populate then the other two associations will never be done since they are coming from polymorphic or inclusive or deep-stage-2. So we need to
            const rejectUnknownAssPop = () => {
                this._meta({ cancelled: true });
                // sails.log.warn(chalk`{keyword('orange') ${__line()} - association '${criteria}' not found on Model '${criteriaInfo.modelID}}'`);
                return this;
            };

            // some population types can bring incorrect criteria against the model as they are inclusive or polymorphic in nature, so check if the criteria is a true association on the model before populating
            if (!this._WLModel.hasAssAlias(criteria)) {
                return rejectUnknownAssPop();
            }

            // sails.log.debug(chalk`{green ${__line()} - populating using populateType: ${this._meta('populationType')} - criteria: '${criteria}' on model: '${this._WLModel.identity}'}`);

            // check where this population is coming from and sanitize accordingly
            switch (this._meta("populationType")) {
                case "polymorphic":
                    {
                        let entry = _.find(this._meta("deep").queryInfo.criterias, {
                            wasPolymorphic: true,
                        });

                        if (!entry) {
                            // create the first entry and flag it as polymorphic
                            pushQueryInfo({
                                wasPolymorphic: true,
                                criterias: [criteriaInfo],
                            });
                            // sails.log.debug(`${__line()} - pushed new query info`);
                        } else {
                            // just add this one the already existing list of polymorphic models for this deffered
                            entry.criterias.push(criteriaInfo);
                        }
                    }
                    break;

                case "deep-stage-2":
                    // do stuff that pertain to deep-stage-2
                    pushQueryInfo(criteriaInfo);
                    break;

                case "inclusive":
                    // do stuff that pertains to inclusive
                    pushQueryInfo(criteriaInfo);
                    break;

                default:
                    // do stuff for normal population type
                    pushQueryInfo(criteriaInfo);
                    break;
            }

            // now do the population
            return this._populate(criteria, subcriteria);
        } // end case default
    }
};
