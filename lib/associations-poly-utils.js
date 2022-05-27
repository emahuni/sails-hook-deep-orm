module.exports = {
  // get the polymorphic associations of this model
  getPolyAsses() {
    return this._polymorphicAssociations;
  },

  /** get the polymorphic association aliases that are related to the given model/modelID */
  getPolyAssAliasesToThat(model) {
    if (!(model = this.assureModelObj(model))) return [];

    return this._polymorphicAssociations.filter((assAlias) => {
      // get association
      let ass = this.getAssDetails(assAlias);

      return ass[ass.type] === model.identity;
    });
  },

  /** get polymorphic associations details that are related to the given model/modelID */
  getPolyAssDetailsToThat(model) {
    if (_.isString(model) && model.includes('*')) {
      model = model.substr(1);
    }

    return this.getPolyAssAliasesToThat(model).map((pAssA) =>
      this.getAssDetails(pAssA)
    );
  },
};
