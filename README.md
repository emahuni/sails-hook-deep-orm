# Sails-hook-deep-orm
A powerful hook that adds the much needed polymorphic associations, deep populations, inclusive population criterias and more to the Sails ORM.

[![NPM](https://nodei.co/npm/sails-hook-deep-orm.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/sails-hook-deep-orm/)


# About
This hook was developed by Emmanuel Mahuni of Emanimation Technologies for packages we intend to develop using Sails and Waterline that have a lot to do with Big Data, Deep Learning and Artificial Intelligence.

>A lot of syntax introduced by this hook is novel and should become common in ORMs as it addresses common modern data manipulation and sifting issues. It allows discovery of related data and patterns for big data management applications, which are the primary reasons why this hook exists.


# Features:
- Polymorphic Populations
>    - eg: `js let Results = await Status.find().populate('*');`
- Deep Populations
>    - eg: `js let Results = await Person.find().populate('home.occupants.statuses.*');`
- Inclusive Criteria Populations
>    - eg: `js let Results = await Person.find().populate('home.occupants&state.statuses&phones.*&network');`
- Deep Wild Object and Array Utils
>    - eg: `js sails.hooks.deeporm.wild.get(Records, "*.home.occupants.*.phones.0.number");`
- Dynamic Attribute Methods [todo]
>    - patch-in dynamic common model methods to reduce boilerplate code.




[![Donate using Liberapay](https://liberapay.com/assets/widgets/donate.svg)](https://liberapay.com/emahuni/donate)


# Installation:

Installing the hook is very simple:

```sh
npm install sails-hook-deep-orm
```

That's it.


# API

## Populate ()
The Hook patches the Sails ORM model instance method popuulate() to implement the following features and syntax changes.


### Polymorphic Associations:
If we had an app with a Status model that is reffered to by any model in the app this means our status model can belong to many unknown models.

If our app had `House`, `Person`, `Phone` and `Network` models, which were associated with the `Status` model that require back-references from the `Status` model side, then writing code for each association can be unnecessary boilerplate that lead to confusing and complex code. Besides, dynamic data associations will be very difficult to implement if not impossible for such a trivial app.

With polymorphic associations this becomes very simple and intuitive. Just create an attribute in the `Status` model that automatically reverses and points to all associations that relate with the model?


#### Model Definitions
Here is how we would define all these models:

>In our example, the `Status` model is the *polymorphic model* and the `"affiliated"` attribute in the definition below is the *polymorphic attribute*:

```js
// api/models/Status.js
module.exports = {
  attributes: {
    // ...
    affiliated: {
        collection: "*",
    },
  },
};

```

To associate any model with the `Status` model the associating models just implement a `via: "affiliated"` in their associating attribute;

>eg. for `Person` model:

```js
// api/models/Person.js
module.exports = {
  attributes: {
    // ...
    statuses: {
        collection: "status",
        via: "affiliated",
    },
  },
};

```

>eg. for `House` model:

```js
// api/models/House.js
module.exports = {
  attributes: {
    // ...
    condition: {
        collection: "status",
        via: "affiliated",
    },
  },
};

```

>eg. for `Phone` model:

```js
// api/models/Phone.js
module.exports = {
  attributes: {
    // ...
    state: {
        collection: "status",
        via: "affiliated",
    },
  },
};

```

>eg. for `Network` model:

```js
// api/models/Network.js
module.exports = {
  attributes: {
    // ...
    connectivity: {
        collection: "status",
        via: "affiliated",
    },
  },
};

```

Just that! Our `Status` model potentially belongs to all the above-mentioned models, and it doesn't have any declarative references to any of them.


#### Polymorphic Model Syntax
>- The asterix **'*'** means we don't know to whom this belongs, figure out who points here at runtime and create a reverse relationship; thus polymorphing the attribute.
- The *`affiliated`* attribute is the `Status` model's attribute that morphs its association to any model that associates any of its attributes to the `Status` model *via* this attribute.
- This **polymorphic attribute** is what makes the `Status` model a  **polymorphic model**.
- You can name the polymorphic attribute whatever you choose that makes sense to you it doesn't have to be 'affiliated'. The hook will figure it out and work with it accordingly.
- Though you can have different multiple polymorphic attributes in your app models and name them whatever you want it's preferable and recommended to use as few as one polymorphic attribute name throughout your entire application. ie: if you choose to use `"affiliated"` as your polymorphic attribute name then it is recommended that you stick with it in all your polymorphic models. The fewer they are the less likely you will get mixed up when defining your models.


#### What happens when we populate?
After adding records and doing `addToCollection` on their relatives as needed, we need to find out their associations.

#### Normal populations
To get `Status` records for any model that associates itself with `Status`, just do the normal:

```js
let results = await Person.find().populate('statuses');
// or
let results = await House.findOne().populate('condition');
```

Here we just get the normal things find returns, nothing fancy.


## Polymorphic Populations
For getting the inverse related data ie: the unknown models' records that associate with a `Status` record:

```js
let results = await Status.find(1).populate('*');
```
>- The polymorphic token **"*"** denotes that we want to use the polymorphic attribute of this model to morph it into all the several possible associations and populate those.
- This polymorphic token population is applicable to polymorphic models only.

It produces something like:
```js
[ { createdAt: 1534881259372,
    updatedAt: 1534881259372,
    id: 1,
    label: 'active',
    color: 'brown',
    affiliated:
     [ { house:
          [ { createdAt: 1534881259316,
              updatedAt: 1534881259316,
              id: 1,
              address: '2167 Ushe Rd Ruwa' },
            { createdAt: 1534881259419,
              updatedAt: 1534881259419,
              id: 3,
              address: '45 Gumba Rd, Zengeza, Chitungwiza' } ] },
       { network:
          [ { createdAt: 1534881259375,
              updatedAt: 1534881259375,
              id: 1,
              name: 'Netone' } ] },
       { person:
          [ { createdAt: 1534881259361,
              updatedAt: 1534881259462,
              id: 1,
              firstname: 'Saviour',
              lastname: 'Zugo',
              dob: 0,
              home: 1 },
            { createdAt: 1534881259423,
              updatedAt: 1534881259533,
              id: 3,
              firstname: 'Gilbert',
              lastname: 'Gerenja',
              dob: 0,
              home: 3 } ] },
       { phone:
          [ { createdAt: 1534881259379,
              updatedAt: 1534881259516,
              id: 1,
              number: '71394509',
              owner: 1,
              network: 1 } ] } ] } ]
```

Succinct, powerful and intuitive right?

#### What just happened?
>- The hook cleanups and aggregates all the populated polymorphic records into one dictionary named after the model's polymorphic attribute.
- In addition it will give you each model records' dictionary keyed with the model name.
- This behaviour can be overridden see options below.

Remember the `via:"affiliated"` part in the `House` and `Person` models? that's what you are getting there as the aggregate key `'affiliated'`:
```js
... affiliated:
         [ { house:
              [ { create...
```

>- You can use the polymorphic attribute key instead of the polymorphic token "*", they have the same effect. The following has the same effect as the above example eg: `js let results = await Status.find(1).populate('affiliated');`

### Options:
You can change the way polymorphic records are aggregated:

**Don't "usePolyAttribKey":** By default the hook aggregate all polymorphic records in a dictionary keyed by the polymorphic attribute, you can set this OFF by doing this:

```js
let results = await Status.find(1)._meta({polymorphic:{usePolyAttribKey: false}}).populate('*');
```

This causes the hook to populate polymorphic associations as follows:
```js
    ...
         number: '77542345',
         owner: 2,
         network: 3 } ] },
  { createdAt: 1534881259426,
    updatedAt: 1534881259426,
    id: 3,
    label: 'available',
    color: 'brown',
    network:
     [ { createdAt: 1534881259429,
         updatedAt: 1534881259429,
         id: 3,
         name: 'Econet' } ],
    person:
     [ { createdAt: 1534881259385,
         updatedAt: 1534881259563,
         id: 2,
         firstname: 'Itai',
         lastname: 'Garazhara',
         dob: 0,
         home: 2 } ],
    phone:
     [ { createdAt: 1534881259416,
         updatedAt: 1534881259547,
         id: 2,
         number: '733454334',
         owner: 3,
    ...
 ```

>The above was shortened for brevity. Notice the affiliated key is missing and the model identity keys are directly placed in the records.

**Don't "useModelKey":** By default the hook aggregate all polymorphic model records in a dictionary keyed by model name, you can set this OFF by doing this:

```js
let results = await Status.find(1)._meta({polymorphic:{useModelKey: false}}).populate('*');
```

Output:
```js
   ...
   number: '71394509',
           owner: 1,
           network: 1 } ] ] },
  { createdAt: 1534881259388,
    updatedAt: 1534881259388,
    id: 2,
    label: 'gone',
    color: 'brown',
    affiliated:
     [ [ { createdAt: 1534881259316,
           updatedAt: 1534881259316,
           id: 1,
           address: '2167 Ushe Rd Ruwa' } ],
       [ { createdAt: 1534881259391,
           updatedAt: 1534881259391,
           id: 2,
           name: 'Telecel' } ],
       [ { createdAt: 1534881259432,
           updatedAt: 1534881259576,
           id: 3,
           number: '77542345',
           owner: 2,
           network: 3 } ] ] },
  { createdAt: 1534881259426,
    updatedAt: 1534881259426,
    id: 3,
    label: 'available',
  ...
```
Here the model keys are not used, just the polymorphic attribute key is used.

>Note that you can't turn both of these OFF, one of them must be ON to make sure you can distinguish the records.

### Narrowing Down
Sometimes an app may contain millions of records in its datastore and data retrieval operations can take a lot of time as a result. Optimising queries can be done by specifying the model name to polymorphically morph those specific model's associations or by using subcriterias.

#### Morph To Specific Models Only
When using the polymorphic token "*", the hook populates all polymorphic associations for that model and sometimes that maybe unnecessary. You can specify which model associations it should populate by doing this:
```js
let results = await Status.find().populate('*house');
```
>- This will populate all polymorphic associations from the `House` model only.
- You can use inclusive criteria population to specify more than one. [See below for more details](#inclusive-populate-criterias)

#### Use Subcriterias
You can use subcriterias to narrow down the records to populate:
```js
let results = await Status.find(1).populate('*', {address: {contains: '11055'}});
```
>- That limits populations to records that have an address field that contains '11055' only.
- from our exemplar model definitions the only records that qualify are from the House model since it's the only one with an address attribute. Then they're filtered for their contents.

To target multiple models try to use the 'or' query:
```js
let results = await Status.find(1).populate('*', {or:[{lastname:{contains: 'Gumbo'}}, {number: '71'}]});
```
>- that should qualify the `Person` and `Phone` models.




## Deep Populations
Gives you the ability to dig deep through associations and populate the records with one call to `populate()`. This allows you to retrieve complex data without writing a lot of code.

```js
let results = await Person.find(1).populate('home.occupants.statuses.*');
```
That whole string `'home.occupants.statuses.*'` is a **deep path** and each segment is a **depth**

#### What's going to happen?
>- find will first retrieve the requested records
- deep populate splits the given path into **depths** using the deep path token **'.'**
- using the first **depth** `"home"`, populate will go through each of the retrieved records to populate the `"home"` association.
- on each of those `"home"` record(s) it will then use the next depth, `"occupants"`, to populate the `"occupants"` association.
- it'll repeat this until it can't retrieve records on a given depth or when the requested deep path is complete. eg: if `"occupants"` does not produce any records then populations end there because there's no way for it to continue.


The above example will make populate to dig through the given associations against the retrieved records to produce this:
```js
[ { createdAt: 1534881259361,
    updatedAt: 1534881259462,
    id: 1,
    firstname: 'Saviour',
    lastname: 'Zugo',
    dob: 0,
    home:
     { createdAt: 1534881259316,
       updatedAt: 1534881259316,
       id: 1,
       address: '2167 Ushe Rd Ruwa',
       occupants:
        [ { createdAt: 1534881259361,
            updatedAt: 1534881259462,
            id: 1,
            firstname: 'Saviour',
            lastname: 'Zugo',
            dob: 0,
            home: 1,
            statuses:
             [ { createdAt: 1534881259372,
                 updatedAt: 1534881259372,
                 id: 1,
                 label: 'active',
                 color: 'brown',
                 affiliated:
                  [ { house:
                       [ { createdAt: 1534881259316,
                           updatedAt: 1534881259316,
                           id: 1,
                           address: '2167 Ushe Rd Ruwa' },
                         { createdAt: 1534881259419,
                           updatedAt: 1534881259419,
                           id: 3,
                           address: '45 Gumba Rd, Zengeza, Chitungwiza' } ] },
                    { network:
                       [ { createdAt: 1534881259375,
                           updatedAt: 1534881259375,
                           id: 1,
                           name: 'Netone' } ] },
                    { person:
                       [ { createdAt: 1534881259361,
                           updatedAt: 1534881259462,
                           id: 1,
                           firstname: 'Saviour',
                           lastname: 'Zugo',
                           dob: 0,
                           home: 1 },
                         { createdAt: 1534881259423,
                           updatedAt: 1534881259533,
                           id: 3,
                           firstname: 'Gilbert',
                           lastname: 'Gerenja',
                           dob: 0,
                           home: 3 } ] },
                    { phone:
                       [ { createdAt: 1534881259379,
                           updatedAt: 1534881259516,
                           id: 1,
                           number: '71394509',
                           owner: 1,
                           network: 1 } ] } ] } ] } ] } } ]
```
#### Notes
>- Each depth is used as a criteria to populate the previous depth's records.
- It goes on as deep as needed and populates as long as there are records produced that meet the criteria.
- The deeper you go the more time it takes to execute the process, though the processing is very fast.

### Narrowing Down
You can use subcriterias to narrow down your deep populations:

#### Single Subcriteria:
```js
let results = await Person.find().populate('home.occupants.statuses.*', { id: 1 });
```
>- the subcriteria will be applied to all depths in the deep path:
  - home ⇒ {id:1}
  - occupants ⇒ {id:1}
  - statuses ⇒ {id:1}
  - \* ⇒ {id:1} *// [see explanation above](#use-subcriterias) on Use Subcriterias*


>- because of this you should make sure the subcriteria qualifies each depth otherwise a depth may mis-match on technical grounds, ie the specified attribute eg: `id`, should be present in all associations' models *[todo throw if a single criteria mismatches because of an attribute name]*

#### Multiple Subcriterias:
```js
let results = await Person.find(1).populate('home.occupants.statuses.*',
                [
                  {address:{contains:"1055"}},
                  {firstname: {contains: 'a'}},
                  {label: 'active'},
                  {or:[
                    {id: 1},
                    {firstname: { contains: 'be'}}
                  ]}
                ]
              );
```
>- the array of subcriterias is broken down into its constituents and each subcriteria applied to its corresponding depth in the deep path:
    - home ⇒ undefined *// was supposed to be {address:{contains:"1055"}} but Waterline won't apply subcriterias to model type associations because they think it doesn't make sense. They should change this, it's an unnecessary hard limit. What if those are my clear intentions to actually proceed with population only if that single record meets my query?*
    - occupants ⇒ {firstname: {contains: 'a'}}
    - statuses ⇒ {label: 'active'}
    - \* ⇒  {or:[{id: 1},{firstname: { contains: 'be'}}]} *// [See above explanation](#single-subcriteria) on Single Subcriteria*

Produces:
```js
[ { createdAt: 1534881259361,
    updatedAt: 1534881259462,
    id: 1,
    firstname: 'Saviour',
    lastname: 'Zugo',
    dob: 0,
    home:
     { createdAt: 1534881259316,
       updatedAt: 1534881259316,
       id: 1,
       address: '2167 Ushe Rd Ruwa',
       occupants:
        [ { createdAt: 1534881259361,
            updatedAt: 1534881259462,
            id: 1,
            firstname: 'Saviour',
            lastname: 'Zugo',
            dob: 0,
            home: 1,
            statuses:
             [ { createdAt: 1534881259372,
                 updatedAt: 1534881259372,
                 id: 1,
                 label: 'active',
                 color: 'brown',
                 affiliated:                                                                                                                                                                                              [ { house:
                       [ { createdAt: 1534881259316,                                                                                                                                                                               updatedAt: 1534881259316,
                           id: 1,
                           address: '2167 Ushe Rd Ruwa' } ] },
                    { network:
                       [ { createdAt: 1534881259375,
                           updatedAt: 1534881259375,
                           id: 1,
                           name: 'Netone' } ] },
                    { person:
                       [ { createdAt: 1534881259361,
                           updatedAt: 1534881259462,
                           id: 1,
                           firstname: 'Saviour',
                           lastname: 'Zugo',
                           dob: 0,
                           home: 1 },
                         { createdAt: 1534881259423,
                           updatedAt: 1534881259533,
                           id: 3,
                           firstname: 'Gilbert',
                           lastname: 'Gerenja',
                           dob: 0,
                           home: 3 } ] },
                    { phone:
                       [ { createdAt: 1534881259379,
                           updatedAt: 1534881259516,
                           id: 1,
                           number: '71394509',
                           owner: 1,
                           network: 1 } ] } ] } ] } ] } } ]
```



## Inclusive Populate Criterias
Enables you to populate more than one criteria in a single call to `populate()`.
>**Warning!** pull up your stockings and put on your thinking cap!

```js
let results = await Person.find(1).populate('home&phones&statuses');
```

The above syntax will populate all three criterias. This is similar to calling populate three times on each of those criterias. That whole string `'home&phones&statuses'` is an **inclusive criteria** that carries 3 criterias (**segments**) separated by the inclusive criteria token **"&"**.

Cool if we are still together.

#### Why Do This?
Combining the above two powerful features with this enables you to populate more than one criteria on each depth during deep populations. Without this feature there's no way of doing this in a single call:

```js
let results = await Person.find(1).populate('home.occupants&condition.statuses&phones.network&*');
```

>- Segments order doesn't matter, the hook will try combinations of each segment against the retrived records. ie: `'phones&statuses'` is the same as `'statuses&phones'`


This will populate `"occupants"` and `"condition"` associations on `"home"` records, then `"statuses"` and `"phones"` associations on `"occupants"` records. And finally `"network"` and `"polymorphic"` associations on `"statuses"` and `"phones"` records, then produce the follow results:

```js
[ { createdAt: 1534881259361,
    updatedAt: 1534881259462,
    id: 1,
    firstname: 'Saviour',
    lastname: 'Zugo',
    dob: 0,
    home:
     { createdAt: 1534881259316,
       updatedAt: 1534881259316,
       id: 1,
       address: '2167 Ushe Rd Ruwa',
       occupants:
        [ { createdAt: 1534881259361,
            updatedAt: 1534881259462,
            id: 1,
            firstname: 'Saviour',
            lastname: 'Zugo',
            dob: 0,
            home: 1,
            statuses:
             [ { createdAt: 1534881259372,
                 updatedAt: 1534881259372,
                 id: 1,
                 label: 'active',
                 color: 'brown',
                 affiliated:
                  [ { house:
                       [ { createdAt: 1534881259316,
                           updatedAt: 1534881259316,
                           id: 1,
                           address: '2167 Ushe Rd Ruwa' },
                         { createdAt: 1534881259419,
                           updatedAt: 1534881259419,
                           id: 3,
                           address: '45 Gumba Rd, Zengeza, Chitungwiza' } ] },
                    { network:
                       [ { createdAt: 1534881259375,
                           updatedAt: 1534881259375,
                           id: 1,
                           name: 'Netone' } ] },
                    { person:
                       [ { createdAt: 1534881259361,
                           updatedAt: 1534881259462,
                           id: 1,
                           firstname: 'Saviour',
                           lastname: 'Zugo',
                           dob: 0,
                           home: 1 },
                         { createdAt: 1534881259423,
                           updatedAt: 1534881259533,
                           id: 3,
                           firstname: 'Gilbert',
                           lastname: 'Gerenja',
                           dob: 0,
                           home: 3 } ] },
                    { phone:
                       [ { createdAt: 1534881259379,
                           updatedAt: 1534881259516,
                           id: 1,
                           number: '71394509',
                           owner: 1,
                           network: 1 } ] } ] } ],
            phones:
             [ { createdAt: 1534881259379,
                 updatedAt: 1534881259516,
                 id: 1,
                 number: '71394509',
                 owner: 1,
                 network:
                  { createdAt: 1534881259375,
                    updatedAt: 1534881259375,
                    id: 1,
                    name: 'Netone' } } ] } ],
       condition:
        [ { createdAt: 1534881259372,
            updatedAt: 1534881259372,
            id: 1,
            label: 'active',
            color: 'brown' },
          { createdAt: 1534881259388,
            updatedAt: 1534881259388,
            id: 2,
            label: 'gone',
            color: 'brown' } ] } } ]
```

### Gotcha
If you are keeping track on this well you should've noticed that:
>-  `"condition"` records ⇒ `Status` model - doesn't have `"phones"` nor `"statuses"`  associations
-  `"statuses"` records ⇒ `Status` model - doesn't have `"network"` association
-  and `"phones"` ⇒ Phone model - isn't a polymaphic model, therefore it won't work with `"*"`

Waterline should have thrown at us and crashed the whole process. The reason this works is because inclusive populate coerces populate to ignore any association mismatches and this feature won't work without doing this. In fact it leverages this to do what it needs to do. Take for instance the part where `"phones"` and `"statuses"` associations are invalid for `"condition"` records, but valid for `"occupants"` records.

>However, this can be a problem if the path is somehow wrong.  You've to make sure your path is correct.

### Narrowing Down With Subcriterias
The same rules for deep populations single and multiple subcriterias described above apply to inclusive criterias as well with one additional complexity; when deep populate applies a subcriteria to a depth that is an inclusive criteria then these following rules are applied:
>- if the subcriteria is an object then the same subcriteria applies to each of the inclusive criteria segments
- otherwise, as an array, it is split into its constituencies and applied to each segment accordingly.

```js
Person.find(1).populate('home.occupants&condition.statuses&phones.network&*', [
  {address: {contains: '11055'}},
  {firstname: {contains: 'a'}},
  [
    {label: 'active'},
    {number: {contains: '71'}}
  ],
  [
    {},
    {or:[
      {name: 'Netone'},
      {firstname: { contains: 'be'}}
    ]}
  ]
]);
```

Broken down to:
>- home ⇒ {address: {contains: '11055'}} *// remember this won't do anything 😧*
- occupants ⇒ {firstname: {contains: 'a'}} *// applied to both `"occupants"` and `"condition"` because it is an object*
- condition ⇒ {firstname: {contains: 'a'}} *// will never match any `"condition"` records since the model for `"condition"` association is `Status`, which doesn't have a `"firstname"` attribute*
- statuses ⇒ {label: 'active'}
- phones ⇒ {number: {contains: '71'}}
- network ⇒ undefined *// coz of `{}` so it will match anything without subcriteria restrictions*
- \* ⇒ {or:[{name: 'Netone'}, {firstname: { contains: 'be'}}]}

Results for the above:
```js
[ { createdAt: 1534881259361,
    updatedAt: 1534881259462,
    id: 1,
    firstname: 'Saviour',
    lastname: 'Zugo',
    dob: 0,
    home:
     { createdAt: 1534881259316,
       updatedAt: 1534881259316,
       id: 1,
       address: '2167 Ushe Rd Ruwa',
       occupants:
        [ { createdAt: 1534881259361,
            updatedAt: 1534881259462,
            id: 1,
            firstname: 'Saviour',
            lastname: 'Zugo',
            dob: 0,
            home: 1,
            statuses:
             [ { createdAt: 1534881259372,
                 updatedAt: 1534881259372,
                 id: 1,
                 label: 'active',
                 color: 'brown',
                 affiliated:
                  [ { network:
                       [ { createdAt: 1534881259375,
                           updatedAt: 1534881259375,
                           id: 1,
                           name: 'Netone' } ] },
                    { person:
                       [ { createdAt: 1534881259423,
                           updatedAt: 1534881259533,
                           id: 3,
                           firstname: 'Gilbert',
                           lastname: 'Gerenja',
                           dob: 0,
                           home: 3 } ] } ] } ],
            phones:
             [ { createdAt: 1534881259379,
                 updatedAt: 1534881259516,
                 id: 1,
                 number: '71394509',
                 owner: 1,
                 network:
                  { createdAt: 1534881259375,
                    updatedAt: 1534881259375,
                    id: 1,
                    name: 'Netone' } } ] } ],
       condition: [] } } ]
```



## Dynamic Attribute Methods *[Todo]*


## Dynamic Data Discovery
Notice how you can discover associated data easily allowing you or your code to do complex data connections that are not easy to accomplish without this.

Since this path is a string you can actually make code that can self-discover data by constructing a deep path and populate it. This is the basis of powerful AI and Deep learning algorithms. You don't want AI that can only dig through data the way it was coded. What you want is code that can deduce a path to dig through associations by itself and sift the data to produce meaningful associations. This is very complex to achieve if the data was being retrieved by many lines of code. With this hook, Sails can actually be used to do all this and it's all up to the engineer what the AI system should be able to pass to populate and how it is going to come up with the deep path.
## Development

Any suggestions, PRs, bug fixes, reports etc are welcome.

### Why Develop This?
I started trying out Sails about 3 weeks ago and fell in love with it on day one. At the time of writting 21 Aug 2018, it seems like the latest version of Sails, ie v1, broke a lot of things from its predecessors as the Sails Team did a rewrite of Sails and Waterline. A lot of hooks and plugins no longer work with Sails until those developers upgrade their hooks, which seems highly unlikely to happen any time soon as most of those developers seem not to maintain their hooks anymore.

### Why Not Ditch Sails?
Besides all this, these two features were still nowhere to be found in Sails via third party hooks or in its core ORM back then and even now. As a result Sails ORM is very behind on implementing certain modern ORM trends such as polymorphic associations yet Sails is very powerful, flexible, easy to use and understand. This hook is proof of that; I actually wrote the working polymorphic part of it in less than 3 days during my getting started with Sails. see my initial polymorphic package [extra-orm](https://github.com/emahuni/sails-hook-extra-orm.git).

Whatever the Sails Core team was changing seems to be over and the dust is settling. The changes that were done introduced quality code and patterns. So it's just a matter of time until features begin to match expectations.

### When Were These Some Of Features Requested?
Requests for these two features have been there for years and Developers didn't address the issues back then and those who tried were unfortunately discouraged by the lack PR merging and ended up forking to other codebases that are no longer compatible with the new version of Sails as Sails was taking a huge turn.

Regardless, deep populations and polymorphic associations are still nowhere to be found in those buggy and incompatible forks.

### Now What?
Agghhhhhh!!! So it brought me back to square one. I needed polymorphic functionality and deep populations so badly that instead of cursing the darkeness I ended up lighting the candle and implementing the damn thing myself, though yellow Sails beak ree me 😅, I managed to do it. The hope now is for this code and approach to be adopted into the Sails ORM.

### Won't This Break Sails ORM?
Therefore this hook is syntax sugar coating on Sails ORM and it doesn't change anything that Sails does except adding a new layer of functionality. In other words code written without the hook should work with the hook installed. That's the phylosophy behind how it is written.

### Testing & Examples

You can find complete examples in the [test](https://github.com/emahuni/sails-hook-deep-orm/tree/master/test/basic.js).

The tests are run using Mocha. You can install mocha `npm i -g mocha` and run the tests with `npm run test` or `mocha`

### Contributing

Please follow the [Felix's Node.js Style Guide](https://github.com/felixge/node-style-guide).

We use [semantic versioning](https://docs.npmjs.com/getting-started/semantic-versioning) for the NPM package.

### Contributors

- Author: [Emmanuel Mahuni](https://github.com/emahuni)

### License
2018 MIT

### Attributions

#### [Sails](http://github.com/balderdashy/sails)
Thanks so much Balderdashy, couldn't have done anything without the code you wrote.