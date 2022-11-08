/**
 * Enumeration
 * @class
 */
qz.IsoLanguageCodeEL = new eNUMERATION("IsoLanguageCodeEL", {
  "en": "English",
  "es": "Spanish",
  "fr": "French",
  "de": "German"
});
/**
 * Object type
 * @class
 */
qz.TextItem = new cLASS({
  Name: "TextItem",
  primaryKey: ["textItemNo", "language"],
  properties: {
    "textItemNo": {range:"PositiveInteger", label:"Text item number"},
    "language": {range:"IsoLanguageCodeEL"},
    "text": {range:"String"}
  }
});
qz.TextItem.idCounter = 0;