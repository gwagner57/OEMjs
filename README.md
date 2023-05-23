# OEMjs
## A Low-Code Business App Framework

OEMjs implements the ***Object Event Modeling*** paradigm for model-based business application engineering, based on the ideas of the MVC architecure paradigm, the [Onion Architecture](http://jeffreypalermo.com/blog/the-onion-architecture-part-1/) metaphor, and the [Event Modeling](https://eventmodeling.org/posts/what-is-event-modeling/) approach. See also [Object Event Modeling for DES and IS Engineering](https://ceur-ws.org/Vol-3211/CR_099.pdf). 

OEMjs allows defining 

1. **enumerations**;
2. **business object classes**, **business event classes** and **business activity classes** (and class hierarchies) with semantic meta-data 
   (e.g., for *declarative constraint validation*);
3. **storage adapters** that facilitate switching from one storage technology (such as IndexedDB) 
   to another one (such as Google FireStore or CloudFlare D1);
4. **view models** for model-based user interface code generation.

## Use Case 1: Enumerations

<details><summary>Handling Enumerations and Enumeration Attributes</summary>
   
### Defining an Enumeration

    const WeatherStateEL = new eNUMERATION ("WeatherStateEL", 
        ["sunny", "partly cloudy", "cloudy", "cloudy with rain", "rainy"]);

### Using an Enumeration as the Range of an Attribute

    class Weather extends bUSINESSoBJECT {
      constructor (ws, t) {
        this.weatherState = ws;
        this.temperature = t;
      }
    }
    Weather.properties = {
      "weatherState": {range: WeatherStateEL, label: "Weather conditions"},
      "temperature": {range: "Decimal", label: "Temperature"}
    }

### Using Enumeration Literals

Recall that *enumeration literals* are constants that stand for a positive integer (the *enumeration index*). 

For instance, the enum literal `WeatherStateEL.SUNNY` stands for the enum index 1. 
In program code, we do not use the enum index, but rather the enum literal. For instance, 

    var theWeather = new Weather( WeatherStateEL.SUNNY, 30)

### Looping over an Enumeration

We loop over the enumeration `WeatherStateEL` with a `for` loop counting from 1 to `WeatherStateEL.MAX`:

    for (let weatherState = 1; weatherState <= WeatherStateEL.MAX; weatherState++) {
      switch (weatherState) {
      case WeatherStateEL.SUNNY: 
        ...
        break;
      case WeatherStateEL.PARTLY_CLOUDY: 
        ...
        break;
      }
    }
</details>
   
## Use Case 2: Declarative Constraint Valdiation

<details><summary>Define Constraints in the Model and Validate Them in the View and Storage</summary>

OEMjs allows defining property constraints for a business object class:

    class Book extends bUSINESSoBJECT {
      constructor ({isbn, title, year, edition}) {
        super( isbn); 
        this.title = title;
        this.year = year;
        if (edition) this.edition = edition;
      }
    }
    Book.properties = {
      "isbn": {range:"NonEmptyString", isIdAttribute: true, label:"ISBN", pattern:/\b\d{9}(\d|X)\b/,
            patternMessage:"The ISBN must be a 10-digit string or a 9-digit string followed by 'X'!"},
      "title": {range:"NonEmptyString", min: 2, max: 50}, 
      "year": {range:"Integer", min: 1459, max: util.nextYear()},
      "edition": {range:"PositiveInteger", optional: true}
    }

Suitable *range constraints* can be defined by using one of the supported range keywords listed below.

<ul>
<li>"String", "NonEmptyString", "Identifier", "Email", "URL", "PhoneNumber"</li>
<li>"Integer", "PositiveInteger", "NonNegativeInteger", "AutoNumber"</li>
<li>"Decimal", "Number", "Percent", "ClosedUnitInterval", "OpenUnitInterval"</li>
<li>"Boolean"</li>
<li>"DateTime", "Date"</li>
</ul>
    
The constraints defined for a property in a business object class can be checked on input/change 
and before submit in an HTML form and, in addition, before commit in the `add` and `update` methods 
of a storage manager, using the generic validation method `bUSINESSoBJECT.check`, as shown in the following example:

<pre>
const formEl = document.querySelector("#Book-Create > form");
// loop over Book.properties and add event listeners for validation on input
for (const propName of Object.keys( Book.properties)) {
  const propDecl = Book.properties[propName];
  formEl[propName].addEventListener("input", function () {
    var errMsg = bUSINESSoBJECT.check( propName, propDecl, formEl[propName].value).message;
    formEl[propName].setCustomValidity( errMsg);
  });
});
</pre>
</details>

## Use Case 3: Storage Adapters

<details><summary>Flexible Data Storage Management with Storage Adapters</summary>
   
OEMjs comes with a sTORAGEmANAGER class and two storage adapters for using `localStorage` or `ìndexedDB`. 

A storage manager works like a wrapper of the methods of an adapter. The storage manager methods invoke corresponding methods of its adapter. The following code example shows how to use a storage manager for invoking a data retrieval operation on a model class `Book`:

    const storageAdapter = {name:"IndexedDB", dbName:"Test"};
    const storageManager = new sTORAGEmANAGER( storageAdapter);
    await books = storageManager.retrieveAll( Book); 

Since the IndexedDB technology is much more powerful, it is normally preferred for local data storage. However, older browsers (such as IE 9) may not support it. In this case we can easily fall back to LocalStorage in the followig way:

    const storageAdapter = {dbName:"Test"},
          storageManager = null;
    if (!("indexedDB" in window)) {
      console.log("This browser doesn't support IndexedDB. Falling back to LocalStorage.");
      storageAdapter.name = "LocalStorage";
    } else {
      storageAdapter.name = "IndexedDB";
    }
    storageManager = new sTORAGEmANAGER( storageAdapter);

</details>
