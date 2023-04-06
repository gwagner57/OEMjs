# OEMjs
A JS library for defining 

1. enumerations;
2. business object and business event classes (and class hierarchies) with semantic meta-data 
   (e.g., for declarative constraint validation);
3. storage adapters that facilitate switching from one storage technology (such as IndexedDB) 
   to another one (such as MySQL);
4. view models for model-based user interfaces.

## Use Case 1: Handling Enumerations and Enumeration Attributes

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
      "weatherState": {range: **WeatherStateEL**, label: "Weather conditions"},
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

## Use Case 2: Declarative Constraint Valdiation

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
    
The constraints defined for a property in a business object class can be checked in an HTML form on input/change events 
and on submit events and, in addition, before commit in the `add` and `update` methods 
of a storage manager, using the generic validation method `bUSINESSoBJECT.check`, as shown in the following example:

<pre>
const formEl = document.querySelector("#Book-Create > form");
// loop over Book.properties and add event listeners for validation on input
for (const propName of Object.keys( Book.properties)) {
  const propDeclaration = Book.properties[propName];
  formEl[propName].addEventListener("input", function () {
    const val = formEl[propName].value;
    const errMsg = bUSINESSoBJECT.check( propName, propDeclaration, val).message;
    formEl[propName].setCustomValidity( errMsg);
  });
});
</pre>

## Use Case 3: Flexible Data Storage Management with Storage Adapters

OEMjs comes with a sTORAGEmANAGER class and two storage adapters for using *LocalStorage* or *IndexedDB*. 

A storage manager works like a wrapper of the methods of an adapter. The storage manager methods invoke corresponding methods of its adapter. The following code example shows how to use a storage manager for invoking a data retrieval operation on a model class `Book`:

    const storageAdapter = {name:"IndexedDB", dbName:"Test"};
    const storageManager = new sTORAGEmANAGER( storageAdapter);
    await books = storageManager.retrieveAll( Book); 


