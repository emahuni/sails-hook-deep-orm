# Sails-hook-extra-orm

[![NPM](https://nodei.co/npm/sails-hook-extra-orm.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/sails-hook-extra-orm/)

Hook to add extra orm functionality to the default Sails ORM until these features are implemented in the core.

## Features:
- Polymorphic associations
- Deep Populates [todo]
- Dynamic Attribute Mehods [todo]

[![Donate using Liberapay](https://liberapay.com/assets/widgets/donate.svg)](https://liberapay.com/emahuni/donate)

## Installation:

Installing the hook is very simple in sails.

```sh
npm install --save sails-hook-extra-orm
```

That's it.

## Usage

### Polymorphic Associations:

If we had a big app with a Status model that is reffered to by any model in the app this means our status model can belong to many uknown models.
If our app had House and Person models that require back-references(many-many).

#### Normal associations without polymorphism

We create the following models:

```js
// api/models/House.js
module.exports = {
  attributes: {
    // ...

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    state: {
        collection: "status",
        via: "house_state",
    },
  },
};

```

```js
// api/models/Person.js
module.exports = {
  attributes: {
    // ...

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    statuses: {
        collection: "status",
        via: "person_statuses",
    },
  },
};

```
and you have to write the relationships in the Status model:

```js
// api/models/Status.js
module.exports = {
  attributes: {
    // ...

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    house_state: {
        model: "person",
    },
    
    person_statuses: {
        collection: "person",
        via: "statuses",
    },
  },
};

```

Each time we refer to the status model with a `via` key we have to write the inverse relationship in the Status model otherwise Waterline will throw at us. For example, if we had additional kid, shop, family and community models in our app that associate themselves with the status model, in addition to the above the following is what you should write in the status model without polymorphic associations:

```js
// api/models/Status.js
module.exports = {
  attributes: {
    // ...

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    // ...
    
    kid_status: {
        collection: "kid",
        via: "status",
    },

    shops: {
        collection: "shop",
        via: "status",
    },

    family: {
        model: "family",
    },

    community: {
        model: "community",
    },

    // ... and so on
  },
};

```
For many reasons this is a source of confusion and blotting of code, which makes it very hard to mentain and reason about. Especially in this case, a status isn't something you would want to blot like that. Those relationships have nothing to do with each other and the resulting data will just look ugly and blotted:

```js
let statuses = await Status.find().sort('label DESC').populateAll();
console.log(statuses);
// [   house_state: [],
//     person_statuses: 
//      [ { createdAt: 1532942470430,
//          updatedAt: 1532942470430,
//          id: 1,
//          firstname: 'Boydho',
//          lastname: 'Zhangazha',
//          dob: 0 } ],
//     kid_status: [],
//     shops: [],
//     family: [],
//     community: [],
//     createdAt: 1532942612156,
//     updatedAt: 1532942612156,
//     id: 1,
//     label: 'active',
//     color: 'green' } ]
```

It's only better if we didn't want to know what status belongs to.

#### Using polymorphic associations

With polymorphic associations this becomes very simple. Just create an attribute in the status model that automatically reverses and points to all associations that associate with the model? Here is how:

```js
// api/models/Status.js
module.exports = {
  attributes: {
    // ...

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    affiliated: {
        collection: "*",
    },
  },
};

```

Just that! Our Status model belongs to all the abovementioned models including both Person and House models, but it doesn't have any declarative reference to any of them.

The asterix means we don't know to whom this belongs, figure out who points here at runtime and create a reverse relationship; thus polymorphing the attribute. The `affiliated` key is the polymorphic attribute that morphs according to associations, and this model becomes a polymorphic model. You can name the polymorphic attribute whatever you choose that makes sense to you it doesn't have to be 'affiliated'. The hook will figure it out and work with it accordingly.

In the other associating  models: just put `via: 'affiliated'` instead; eg. for Person model:

```js
// api/models/Person.js
module.exports = {
  attributes: {
    // ...

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    statuses: {
        collection: "status",
        via: "affiliated",
    },
  },
};

```

##### What happens when we populate?
After adding records and doing `addToCollection` on their reletives, we need to find out their associations.

To get status records for any model that associates itself with status, just do the normal (for brevity we will stick with House and Person models):

```js
let statuses await Person.find().populate('statuses');
// or
let state await House.findOne().populate('state');
```

Here we just get the normal things find returns, nothing fancy.

For getting the inverse related data ie: the unknown models' records that associate with this status record:

```js
let affiliates = await Status.find().sort('label DESC').populate('*');
console.log(affiliates);
// [ { createdAt: 1532942612454,
//     updatedAt: 1532942612454,
//     id: 2,
//     label: 'inactive',
//     color: 'grey',
//     affiliated: [],
//   },
//   { createdAt: 1532942612156,
//     updatedAt: 1532942612156,
//     id: 1,
//     label: 'active',
//     color: 'green',
//     affiliated: [ { person: [ {
//          createdAt: 1532942470430,
//          updatedAt: 1532942470430,
//          id: 1,
//          firstname: 'Boydho',
//          lastname: 'Zhangazha',
//          dob: 0 } ]
//      } ]
// } ]
```

Clean and intuitive right?

The hook cleanups and aggregates all the populated polymorphic records into one dictionary keyed by the polymorphic attribute name. In addition it will give you each affiliated record dictionary keyed with the model name in the aggregation. Remember the `via:"affiliated"` part in the House and Person models? that's what you are getting there as the aggregate key.

### Deep Populates


### Dynamic Attribute Mehods


## Testing & Examples

You can find a complete hook example in the [test folder](https://github.com/emahuni/sails-hook-extra-orm/tree/master/test/).

## API:

The hook wraps model methods and model instance methods so that it can get the polymorphic records and manipulate the results. Every other method has not changed except for populate which takes additional syntax. This is only available on polymorphic models only.

### populate method

Populate is where the hook gets the associated model records and cleans up.

#####  populate('*')

Get all polymorphic associated records regardless of the model(s) it is associated with, ie: it populates every polymorphic relashionship automatically more like populateAll, but for polymorphic associations only. Meaning if you had any other associations defined in status that were not polymorphic, they don't get populated.

##### populate('*', models)

- models: string or array of polymorphic models to populate. Why models, we are being virgue about the association. We don't know much about the relationships just that certain models are associated with it. So this is a way of cutting on processing and database queries when populating for specific models we know are associated with this polymorphic model and just want those.

You can pass a model name eg: `'person'` as a string or you can pass an array of models eg: `['person', 'house']`

eg:
```js
  await Status.find().populate('*', ['house', 'family']);
```
looking at the full imaginary app above, the example will leave out other polymorphic relationships from other models, eg: kid, person, community... and return only house and family polymorphic records related to this status record.


##### populate('*', subcriteria, [models])

- subcriteria: normal waterline subcriteria, see waterline subcriteria for more details in sails documentation under reference.

eg:

```js
  await Status.find().populate('*', {firstname: 'Boydho'});
```
- models: optional specific models to populate, see above.

## Development

### Contributing
  
Please follow the [Felix's Node.js Style Guide](https://github.com/felixge/node-style-guide).

We use [semantic versioning](https://docs.npmjs.com/getting-started/semantic-versioning) for the NPM package.

### Contributors

- Author: [Emmanuel Mahuni](https://github.com/emahuni)


