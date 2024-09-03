using { sap.advocates.demo as db } from '../db/schema2';

service EmbeddingStorageService2 @(requires:'any') {
    entity DocumentChunk as projection on db.DocumentChunk excluding { embedding };

    function storeEmbeddings() returns String;
    function deleteEmbeddings() returns String;
    function storeEmbeddings2() returns String;

}