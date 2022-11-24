import { expect } from "chai";
import path from "path";
import sTORAGEmANAGER_Firestore from "../src/storage/sTORAGEmANAGER_Firestore.mjs";
import eNUMERATION from "../src/eNUMERATION.mjs";
import dt from "../src/datatypes.mjs";
import bUSINESSoBJECT from "../src/bUSINESSoBJECT.mjs";
import { URL } from "url";

const BookCategoryEL = new eNUMERATION("BookCategoryEL", ["novel", "biography",
    "textbook", "other"]);

class Publisher extends bUSINESSoBJECT {
    constructor({ name, address }) {
        super(name);
        this.address = address;
    }
}
Publisher.properties = {
    "name": { range: "NonEmptyString", isIdAttribute: true, min: 2, max: 20 },
    "address": { range: "NonEmptyString", min: 5, max: 50 },
}
Publisher.setup();

class Book extends bUSINESSoBJECT {
    constructor({ isbn, title, year, publisher, edition, category }) {
        super(isbn);
        this.title = title;
        this.year = year;
        if (publisher) this.publisher = publisher;
        if (edition) this.edition = edition;
        if (category) this.category = category;
    }
}
Book.properties = {
    "isbn": {
        range: "NonEmptyString", isIdAttribute: true, label: "ISBN", pattern: /\b\d{9}(\d|X)\b/,
        patternMessage: "The ISBN must be a 10-digit string or a 9-digit string followed by 'X'!"
    },
    "title": { range: "NonEmptyString", min: 2, max: 50 },
    "year": { range: "Integer", min: 1459, max: () => (new Date()).getFullYear() + 1 },
    "publisher": { range: "Publisher", optional: true },
    "edition": { range: "PositiveInteger", optional: true },
    "category": { range: BookCategoryEL, optional: true }
}
Book.setup();

// Read secret properties from environment variables


const filePath = new URL("../firestore_config.json", import.meta.url);
const storeMan = new sTORAGEmANAGER_Firestore({
    dbName: "TestSuite01", configPath: filePath,
    createLog: true, validateBeforeSave: true
});

const classes = Object.keys(dt.classes).map(className => dt.classes[className]).
    filter(c => !c.isAbstract && !c.isComplexDatatype);

const b1 = new Book({ isbn: "1234567890", title: "A novel", year: 2022, category: BookCategoryEL.NOVEL });
const p1 = new Publisher({ name: "Springer", address: "Berlin, Germany" });
// a book object with a publisher object reference
const b2 = new Book({
    isbn: "123456789X", title: "Textbook 1", year: 2021,
    category: BookCategoryEL.TEXTBOOK, publisher: p1
});
// a book object with a publisher ID reference
const b3 = new Book({
    isbn: "123123123X", title: "Textbook 2", year: 2021,
    category: BookCategoryEL.TEXTBOOK, publisher: "Springer"
});

describe("sTORAGEmANAGER Firestore tests", () => {
    before(() => {
        try {
            storeMan.setup();
            console.log("Firestore Setup done");
        } catch (error) {
            console.error(error);
        }
    });

    describe("Create Database", () => {
        it("Create DB", () => {
            expect(() => storeMan.createEmptyDb(storeMan.dbName, Book)).to.not.throw(Error);
        });
    });
    describe("Handling records", () => {
        const docRef = storeMan.add(storeMan.dbName, b1, Book);
        it("Add single record", async () => {
            expect(() => storeMan.add(storeMan.dbName, p1, Publisher)).to.not.throw(Error);
            expect(await docRef.id).to.be.a('string');
        });
        it("retrieve", async () => {
            let all = await storeMan.retrieve(storeMan.dbName, Book, await docRef.id);
            expect(all).to.be.an('object');
        });
        it("retrieveAll", async () => {
            let all = await storeMan.retrieveAll(storeMan.dbName, Book);
            expect(all).to.be.an('object');
        });
    });

    describe("Delete records", () => {
        const docPromise = storeMan.add(storeMan.dbName, b1, Book);
        it("destroy", async () => {
            expect(await docPromise.id).to.be.a('string');
            expect(() => storeMan.destroy(storeman.dbName, Book, docPromise.id)).to.be.not.throw(Error);
        });
        it("clearTable", () => {
            expect(() => storeMan.clearTable(storeman.dbName, Book)).to.be.not.throw(Error);
        })
    });


    after(() => {
        storeMan.quit();
    })
});