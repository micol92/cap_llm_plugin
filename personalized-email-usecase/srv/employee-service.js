const cds = require('@sap/cds')
const getPersonalizedEmail = require('./ai-core-service')

module.exports = cds.service.impl(function () {


  this.on('runAnonymization', async req => {
    const {
      Employee
    } = cds.entities;
    let { id } = req.data;
    //const actualData  = SELECT.;
    let actualData  = await SELECT.from (Employee,id)


    if (!actualData) return req.error (404, `Employee #${id} doesn't exist`)

    console.log('Debug:actualData.id:'+actualData.id);
    console.log('Debug:actualData.SSN:'+actualData.region);
    console.log('Debug:actualData.region:'+actualData.ssn);

    //Retrieve the anonymized data from HANA Cloud
    const anonymizer = await cds.connect.to("cap-llm-plugin");
    let anonymizedEmployees = await anonymizer.getAnonymizedData("EmployeeService.Employee", [id]);

    //For each of the requested employees, generate the persoanlized email by passing the anonymized data to LLM. Then, replace the anonymized data with actaul employee data.
    const stringData = JSON.stringify(anonymizedEmployees);
    let personalizedLlmResponse = await getPersonalizedEmail(stringData);

    //console.log("DEBUG:personalizedLlmResponse:"+personalizedLlmResponse);

    //console.log('personalizedres-1:'+personalizedLlmResponse);
    for (const [key, value] of Object.entries(actualData)) { personalizedLlmResponse = personalizedLlmResponse.replaceAll(`"` + key.toUpperCase() + `"`, value) }
    //console.log('DEBUG:actualData-2:'+personalizedLlmResponse);

      const n = await UPDATE(Employee).set({
        ID: actualData.id,
        REGION: actualData.region,
        TLEVEL: actualData.tlevel,
        GENDER: actualData.gender,
        AGE: actualData.age,
        SSN: actualData.ssn,
        PERSONALIZEDEMAIL: personalizedLlmResponse
      }).where({
        ID: actualData.id
      });
      n > 0 || req.error(404);  
  
      return personalizedLlmResponse;

  })



  this.after('READ', 'Employee', async function (data) {
    const {
      Employee
    } = cds.entities;
    
    if (Object.keys(data).length === 4) {
      const actualData = data[1];
      console.log('Debug:'+actualData.id);

      //Retrieve the anonymized data from HANA Cloud
      const anonymizer = await cds.connect.to("cap-llm-plugin");
      let anonymizedEmployees = await anonymizer.getAnonymizedData("EmployeeService.Employee", [actualData.id]);

      //For each of the requested employees, generate the persoanlized email by passing the anonymized data to LLM. Then, replace the anonymized data with actaul employee data.
      const stringData = JSON.stringify(anonymizedEmployees);
      let personalizedLlmResponse = await getPersonalizedEmail(stringData);
      //console.log('personalizedres-1:'+personalizedLlmResponse);
      for (const [key, value] of Object.entries(actualData)) { personalizedLlmResponse = personalizedLlmResponse.replaceAll(`"` + key.toUpperCase() + `"`, value) }
      //console.log('personalizedres-2:'+personalizedLlmResponse);

        const n = await UPDATE(Employee).set({
          ID: actualData.id,
          REGION: actualData.region,
          TLEVEL: actualData.tlevel,
          GENDER: actualData.gender,
          AGE: actualData.age,
          SSN: actualData.ssn,
          PERSONALIZEDEMAIL: personalizedLlmResponse
        }).where({
          ID: actualData.id
        });
        n > 0 || req.error(404);
    }
  })

})
