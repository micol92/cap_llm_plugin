using { sap.cap as cap } from '../db/schema';
service EmployeeService @(requires:'any') {
  entity Employee as projection on cap.Employee;

  action   runAnonymization(id : Integer) returns String;

}