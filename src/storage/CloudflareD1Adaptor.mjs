/**
 * @fileOverview  Storage management methods for the "Cloudflare D1" adapter
 * @author Elias George
 * @copyright Copyright 2023, Chair of Internet Technology,
 *   Brandenburg University of Technology, Germany.
 * @license The MIT License (MIT)
 */

import { dt } from "../datatypes.mjs";

class CloudflareD1Adaptor {
  //Default database schema
  #dbName = "main";
  //Configuration file location and name
  #configFilePath = "/src/storage/";
  #configFileName = "D1Config.json";
  //Default Database URL
  #D1Url = "http://127.0.0.1:8787";
  //private variable read from configuration file
  #accountId; //Cloudflare accoud ID
  #authToken; // Cloudflare API authorization token
  #databaseUUID; // Cloudflare D1 Database UUID


  /**
   * The constructor sets the configuration file path.
   */
  constructor() {
    let rootUrl = new URL(window.location.href);
    this.#configFilePath = this.#configFilePath + this.#configFileName;
  }

  /**
   * Method to get the Cloudflare Database URL
   */
  getDbUrl() {
    return this.#D1Url;
  }

  /**
   * Method to get the Cloudflare Database UUID
   */
  async getDBUUID() {
    return JSON.stringify(this.#databaseUUID);
  }

  /**
   * Method to return the appropriate content-type based on the response header
   * @param response 
   */
  async gatherResponse(response) {
    const { headers } = response;
    const contentType = headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    } else if (contentType.includes("application/text")) {
      return response.text();
    } else if (contentType.includes("text/html")) {
      return response.text();
    } else {
      return response.text();
    }
  }

  /**
   * Initialize adaptor with required variables, read from the configuration file.
   */
  async #init() {
    try {
      await fetch(this.#configFilePath)
        .then((response) => response.json())
        .then((json) => {
          if (json.AppUrl) {
            this.#D1Url = json.AppUrl;
          }
          if (json.account_id) {
            this.#accountId = json.account_id;
          }
          if (json.Auth_token) {
            this.#authToken = json.Auth_token;
          }
          if (json.databaseUUID) {
            this.#databaseUUID = json.databaseUUID;
          }
        });
    }
    catch { (e) => console.error(e) };
  }

  /**
   * Setting up adaptor with all needed information for accessing the Cloudflare D1 database
   */
  async setup() {
    await this.#init();
  }


  /**
    * Method to set the Database UUID 
    * @param Database UUID
    */
  async setDBUUID(UUID) {
    this.#databaseUUID = UUID;
  }


  /**
  * Method to convert an JSON to JS Object
  * @param JSON
  */
  async #toJSObject(obj) {
    try {
      if (typeof obj === "object") {
        return obj;
      } else {
        return JSON.parse(obj);
      }
    } catch (e) {
      return '{"errors":' + e + '}';
    }
  }


  /**
  * Get all available Database in the user's account.
  */
  async getDatabases() {
    let requestUrl = "https://api.cloudflare.com/client/v4/accounts/" + this.#accountId + "/d1/database";
    const initH = {
      mode: "cors",
      method: "GET",
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.#authToken,
      },
    };
    try {
      let response = await fetch(requestUrl, initH);
      let data = await this.gatherResponse(response);
      return await this.#toJSObject(data);
    }
    catch (err) {
      return err
    }
  }

  /**
  * Create a new D1 Database in the user's account. 
  * After successfull database creation, the private variable #databaseUUID is updated. 
  * @param Database name
  */
  async createEmptyDb(dbName) {
    let requestUrl = "https://api.cloudflare.com/client/v4/accounts/" + this.#accountId + "/d1/database";

    const body = {
      name: dbName
    };

    const initH = {
      body: JSON.stringify(body),
      mode: "cors",
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.#authToken,
      },
    };

    try {
      let response = await fetch(requestUrl, initH);
      let data = await this.gatherResponse(response);
      let result = await this.#toJSObject(data);
      if (result.success) {
        this.#databaseUUID = result.result.uuid;
      }
      return result;
    } catch (error) {
      return error;
    }
  }

  /**
  * Delete a D1 Database in the user's account.
  * @param Database UUID (identification ID)
  */
  async deleteDatabase(dbIdentifier) {
    let requestUrl = "https://api.cloudflare.com/client/v4/accounts/" + this.#accountId + "/d1/database/" + dbIdentifier;
    const initH = {
      mode: "cors",
      method: "DELETE",
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.#authToken,
      },
    };
    try {
      let response = await fetch(requestUrl, initH);
      let data = await this.gatherResponse(response);
      return await this.#toJSObject(data);
    }
    catch (err) {
      return err
    }
  }

  /**
  * Get all available Tables in the Database (Database specified in the config file)
  */
  async getTables() {
    let requestUrl = "https://api.cloudflare.com/client/v4/accounts/" + this.#accountId + "/d1/database/" + this.#databaseUUID + "/query";

    const body =
      { "params": ["_cf_KV"], "sql": "SELECT name from sqlite_schema where type = 'table' and name NOT LIKE ?;" }
      ;

    const initH = {
      body: JSON.stringify(body),
      mode: "cors",
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.#authToken,
      },
    };

    try {
      let response = await fetch(requestUrl, initH);
      let data = await this.gatherResponse(response);
      return await this.#toJSObject(data);
    } catch (error) {
      return error;
    }
  }

  /**
  * Private method that creates the "create table" sql statement based on JS object 
  * @param JS object and table name. 
  */
  async #tblSqlBuilder(Data, tableName) {
    let pklist = [];
    let count = 0;
    let data = await this.#toJSObject(Data);
    let columns = Object.keys(data).length;
    let quary = "CREATE TABLE IF NOT EXISTS " + this.#dbName + "." + tableName + " (";
    for (let key of Object.keys(data)) {
      quary = quary + key + " " + data[key].type
      count = count + 1;
      if (data[key].isPrimaryKey) {
        pklist.push(key);
      }
      if (data[key].autoIncrement) {
        quary = quary + " AUTOINCREMENT";
      }
      if (data[key].unique) {
        quary = quary + " UNIQUE";
      }
      if (data[key].notNull) {
        quary = quary + " NOT NULL";
      }
      if (data[key].default) {
        quary = quary + " DEFAULT " + data[key].default;
      }
      if (data[key].checkExp) {
        quary = quary + " CHECK(" + data[key].checkExp + ")";
      }
      if (count < columns || pklist.length > 0) {
        quary = quary + ",";
      }
    }
    count = 0;
    quary = quary + " PRIMARY KEY(";
    for (let pks of pklist) {
      quary = quary + pks;
      if (count < pklist.length - 1) {
        quary = quary + ",";
      }
      count++;
    }
    quary = quary + ")"
    quary = quary + " );"
    return quary;
  }

  /**
  * Private method that converts a Class (Table) to a JS object.
  * The JS object is used for creating create table SQL statement.
  * @param Class which needs to be stored as an table in the database. 
  */
  async #tblC2Obj(Class) {
    let data, quary;
    let obj = "{"
    for (let colms of Object.keys(Class.properties)) {
      obj = obj + '"' + colms + '": {';
      if (dt.stringTypes.includes(Class.properties[colms].range)) {
        obj = obj + '"type":"TEXT"';
      }
      else if (dt.integerTypes.includes(Class.properties[colms].range)) {
        obj = obj + '"type":"INTEGER"';
      } else if (dt.decimalTypes.includes(Class.properties[colms].range)) {
        obj = obj + '"type":"REAL"';
      } else if (dt.otherPrimitiveTypes.includes(Class.properties[colms].range)) {
        obj = obj + '"type":"TEXT"';
      } else if (dt.JSONCollectionDataTypes.includes(Class.properties[colms].range)) {
        obj = obj + '"type":"BLOB"';
      } else {
        obj = obj + '"type":"BLOB"';
      }
      obj = obj + ",";
      if (Class.properties[colms].isIdAttribute) {
        obj = obj + '"isPrimaryKey":true';
      }
      if (obj[obj.length - 1] === ",") {
        obj = obj.substring(0, obj.length - 1);
      }
      obj = obj + "},";
    }
    if (obj[obj.length - 1] === ",") {
      obj = obj.substring(0, obj.length - 1);
    }
    obj = obj + "}";
    data = await this.#toJSObject(obj);
    return data;
  }


  /**
  * Create table method
  * @param Class that needs to stored as an table in the database
  */
  async createTable(Class) {
    let requestUrl = "https://api.cloudflare.com/client/v4/accounts/" + this.#accountId + "/d1/database/" + this.#databaseUUID + "/query";
    let cls2JS = await this.#tblC2Obj(Class)
    let sqlQuary = await this.#tblSqlBuilder(cls2JS, Class.name)
    const body =
      { "sql": sqlQuary }
      ;

    const initH = {
      body: JSON.stringify(body),
      mode: "cors",
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.#authToken,
      },
    };

    try {
      let response = await fetch(requestUrl, initH);
      let data = await this.gatherResponse(response);
      return await this.#toJSObject(data);
    } catch (error) {
      return error;
    }
  }

  /**
  * private method to convert JS object record to sql statement that needs to be inserted into the table
  * @param table name and record that needs to stored in the table
  */
  async #rec2sql(table, Data) {
    const data = await this.#toJSObject(Data);
    let quary = "INSERT INTO " + this.#dbName + "." + table + " (";
    let col = "", val = "";
    for (var key of Object.keys(data)) {
      col = col + " " + key + ",";
      if (typeof data[key] === "string") {
        val = val + ' "';
        val = val + data[key];
        val = val + '",';
      } else {
        val = val + " " + data[key] + ",";
      }
    }
    quary = quary + col;
    if (quary.endsWith(",")) {
      quary = quary.substring(0, quary.length - 1)
      quary = quary + ")";
    }
    quary = quary + " VALUES (";
    quary = quary + val;
    if (quary.endsWith(",")) {
      quary = quary.substring(0, quary.length - 1)
      quary = quary + ")";
    }
    quary = quary + ";";
    return quary;
  }

  /**
  * Method to insert record into the table.
  * @param Class to which the record belong and the record that needs to stored in the table
  */
  async add(Class, record) {
    let requestUrl = "https://api.cloudflare.com/client/v4/accounts/" + this.#accountId + "/d1/database/" + this.#databaseUUID + "/query";
    let insertSql = await this.#rec2sql(Class.name, record);
    const body =
      { "sql": insertSql }
      ;

    const initH = {
      body: JSON.stringify(body),
      mode: "cors",
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.#authToken,
      },
    };

    try {
      let response = await fetch(requestUrl, initH);
      let data = await this.gatherResponse(response);
      return await this.#toJSObject(data);
    } catch (error) {
      return error;
    }
  }

  /**
  * Method to retrieve record from the table based on criteria.
  * @param Class, id's are the where conditions along with the values.
  * The where operation performed is AND operation.
  */
  async retrieve(Class, ids, values) {
    let condition = "";
    let insertSql = "SELECT * FROM " + this.#dbName + "." + Class.name + " where ";
    if (ids.length === values.length && ids.length > 1) {
      for (let i = 0; i < ids.length; i++) {
        condition = condition + ids[i] + " = ? and ";
      }
      condition = condition.substring(0, condition.length - 5) + ";";
      insertSql = insertSql + condition;
    } else {
      insertSql = insertSql + ids + " = ?;";
      values = [values];
    }

    let requestUrl = "https://api.cloudflare.com/client/v4/accounts/" + this.#accountId + "/d1/database/" + this.#databaseUUID + "/query";
    const body =
      { "params": values, "sql": insertSql }
      ;

    const initH = {
      body: JSON.stringify(body),
      mode: "cors",
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.#authToken,
      },
    };

    try {
      let response = await fetch(requestUrl, initH);
      let data = await this.gatherResponse(response);
      return await this.#toJSObject(data);
    } catch (error) {
      return error;
    }

  }

  /**
  * Method all records from the table
  * @param Class,to which the table belong
  */
  async retrieveAll(Class) {
    let requestUrl = "https://api.cloudflare.com/client/v4/accounts/" + this.#accountId + "/d1/database/" + this.#databaseUUID + "/query";
    let insertSql = "SELECT * FROM " + this.#dbName + "." + Class.name + " ;";
    const body =
      { "sql": insertSql }
      ;

    const initH = {
      body: JSON.stringify(body),
      mode: "cors",
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.#authToken,
      },
    };

    try {
      let response = await fetch(requestUrl, initH);
      let data = await this.gatherResponse(response);
      return await this.#toJSObject(data);
    } catch (error) {
      return error;
    }
  }

  /**
  * Method to update record in the table based on criteria.
  * @param Class, id's are the where conditions along with the values.
  * Slots are the coloumn and values that need to update. its in the form of JS object.
  * The where operation performed is AND operation.
  */
  async update(Class, ids, values, slots) {
    let condition = " WHERE ";
    let updateSql = "UPDATE " + this.#dbName + "." + Class.name + " SET ";
    let setValues = "";
    slots = await this.#toJSObject(slots);
    for (var key of Object.keys(slots)) {
      setValues = setValues + key + " = ";
      if (typeof slots[key] === "string") {
        setValues = setValues + '"' + slots[key] + '"' + " , ";
      } else {
        setValues = setValues + slots[key] + " , ";
      }
    }
    setValues = setValues.substring(0, setValues.length - 2);
    updateSql = updateSql + setValues;

    if (ids.length === values.length && ids.length > 1) {
      for (let i = 0; i < ids.length; i++) {
        condition = condition + ids[i] + " = ? and ";
      }
      condition = condition.substring(0, condition.length - 5) + ";";
      updateSql = updateSql + condition;
    } else {
      updateSql = updateSql + condition + ids + " = ?;";
      values = [values];
    }

    let requestUrl = "https://api.cloudflare.com/client/v4/accounts/" + this.#accountId + "/d1/database/" + this.#databaseUUID + "/query";
    const body =
      { "params": values, "sql": updateSql }
      ;

    const initH = {
      body: JSON.stringify(body),
      mode: "cors",
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.#authToken,
      },
    };

    try {
      let response = await fetch(requestUrl, initH);
      let data = await this.gatherResponse(response);
      return await this.#toJSObject(data);
    } catch (error) {
      return error;
    }

  }

  /**
  * Method to delete record from the table based on criteria.
  * @param Class, id's are the where conditions along with the values.
  * The where operation performed is AND operation.
  */
  async destroy(Class, ids, values) {
    let condition = "";
    let deleteSql = "DELETE FROM " + this.#dbName + "." + Class.name + " where ";
    if (ids.length === values.length && ids.length > 1) {
      for (let i = 0; i < ids.length; i++) {
        condition = condition + ids[i] + " = ? and ";
      }
      condition = condition.substring(0, condition.length - 5) + ";";
      deleteSql = deleteSql + condition;
    } else {
      deleteSql = deleteSql + ids + " = ?;";
      values = [values];
    }

    let requestUrl = "https://api.cloudflare.com/client/v4/accounts/" + this.#accountId + "/d1/database/" + this.#databaseUUID + "/query";
    const body =
      { "params": values, "sql": deleteSql }
      ;

    const initH = {
      body: JSON.stringify(body),
      mode: "cors",
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.#authToken,
      },
    };

    try {
      let response = await fetch(requestUrl, initH);
      let data = await this.gatherResponse(response);
      return await this.#toJSObject(data);
    } catch (error) {
      return error;
    }

  }

  /**
  * Method to delete the table.
  * @param Class to which the table has be deleted.
  */
  async dropTable(Class) {
    let dropSql = "DROP TABLE " + Class.name + ";";
    let requestUrl = "https://api.cloudflare.com/client/v4/accounts/" + this.#accountId + "/d1/database/" + this.#databaseUUID + "/query";
    const body =
      { "sql": dropSql }
      ;

    const initH = {
      body: JSON.stringify(body),
      mode: "cors",
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.#authToken,
      },
    };

    try {
      let response = await fetch(requestUrl, initH);
      let data = await this.gatherResponse(response);
      return await this.#toJSObject(data);
    } catch (error) {
      return error;
    }
  }


}

export default CloudflareD1Adaptor;