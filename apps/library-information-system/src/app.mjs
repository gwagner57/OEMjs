import sTORAGEmANAGER from "../../../src/storage/sTORAGEmANAGER.mjs"
import LibraryUser from "./data-classes/LibraryUser.mjs"

const app = {
  title: "Library Information System",
  storageManager: new sTORAGEmANAGER({ adapterName: "IndexedDB", dbName: "LIS", createLog: true, validateBeforeSave: true }),
  validateOnInput: true,
  createTestDate: async function () {
  },
  clearDatabase: async function () {

  }
}

export default app;