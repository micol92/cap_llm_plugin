using {sap.tisce.demo as db} from '../db/schema';

service EmbeddingStorageService @(requires: 'any') {

  entity DocumentChunk as
    projection on db.DocumentChunk
    excluding {
      embedding
    };

  entity Files @(restrict: [{
    grant: [
      'READ',
      'WRITE',
      'UPDATE',
      'DELETE'
    ],
    where: 'createdBy = $user'
  }])                  as projection on db.Files;

  @(requires: 'any') 
  //action   storeEmbeddings(uuid : String) returns String;
  action   storeEmbeddings() returns String;

  function deleteEmbeddings()             returns String;

}
