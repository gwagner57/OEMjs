import People from "./People.mjs";

class LibraryEmployee extends People {
  constructor({ employeeId, name, birthDate, department }) {
    super({ id: employeeId, name: name, birthDate: birthDate });
    if (department) this.department = department;
  }
}

LibraryEmployee.properties = {
  "department": { range: "String", optional: true, label: "Department", min: 3, max: 50}
}
LibraryEmployee.setup();

export default LibraryEmployee;
