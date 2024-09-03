const cds = require('@sap/cds')
const { INSERT, DELETE, SELECT } = cds.ql
const { TextLoader } = require('langchain/document_loaders/fs/text')
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter')
const path = require('path')
const fs = require('fs')

const config_vectorplugin = { destinationName:"GENERATIVE_AI_HUB",
  resourceGroup :"default",
  deploymentUrl: "/inference/deployments/d6d4abec97a82efa",
  modelName:"text-embedding-ada-002",
  apiVersion:"2023-05-15"} ;

// Helper method to convert embeddings to buffer for insertion
let array2VectorBuffer = (data) => {
  const sizeFloat = 4
  const sizeDimensions = 4

  const embeddingdata = data.data[0].embedding;

  const bufferSize = embeddingdata.length * sizeFloat + sizeDimensions
  //console.log("bufferSize:"+bufferSize);
  const buffer = Buffer.allocUnsafe(bufferSize)
  // write size into buffer
  buffer.writeUInt32LE(embeddingdata.length, 0)

  embeddingdata.forEach(( embedding, index) => {
    buffer.writeFloatLE(embedding, index * sizeFloat + sizeDimensions);
  })

  return buffer
}

// Helper method to delete file if it already exists
let deleteIfExists = (filePath) => {
    try {
        fs.unlink(filePath, (err) => {
        if (err) {
            if (err.code === 'ENOENT') {
            console.log('File does not exist')
            } else {
            console.error('Error deleting file:', err)
            }
        } else {
            console.log('File deleted successfully')
        }
        })
    } catch (unlinkErr) {
        console.error('Error occurred while attempting to delete file:', unlinkErr)
    }
}

module.exports = function() {

  //unit function test.
  this.on('storeEmbeddings2', async (req) => {

    //const tempval = {"data":[{"embedding":[0.013655298,-0.020068953,0.01264988,-0.007491357,-0.012906163,0.02515519],"index":0,"object":"embedding"}],"model":"ada","object":"list","usage":{"prompt_tokens":108,"total_tokens":108}}
    const tempval = {"data":[{"embedding":[0.013655298,-0.020068953,0.01264988,-0.007491357,-0.012906163,0.02515519]}]}
    //const numbers = [1, 2, 3, 4, 5];
    const tempval_json = tempval.data[0];
    console.log(tempval_json);

    //numbers.forEach((number, index) => {
    //  console.log('Index: ' + index + ' Value: ' + number);
    //});

    tempval_json.embedding.forEach((embedding,index) => {
      console.log('Index: ' + index + ' Value: ' + embedding);

    })
    return 'aaa'
  });

  this.on('storeEmbeddings', async (req) => {
    try {
      const vectorPlugin = await cds.connect.to('cap-llm-plugin')
      //console.log('DEBUG-vectorPlugin:'+vectorPlugin)

      const { DocumentChunk } = this.entities
      let textChunkEntries = []
      console.log(__dirname)
      console.log(path.resolve('codejam_roadshow_itinerary.txt'))
      const loader = new TextLoader(path.resolve('db/data/codejam_roadshow_itinerary.txt'))

      const document = await loader.load()

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 0,
        addStartIndex: true
      })
        
      const textChunks = await splitter.splitDocuments(document)
      console.log(`Documents split into ${textChunks.length} chunks.`)
      console.log('textChunks:'+textChunks)
      console.log('textChunks_pageContent:'+textChunks.pageContent)

      console.log("Generating the vector embeddings for the text chunks.")
      // For each text chunk generate the embeddings
      for (const chunk of textChunks) {

        const embedding = await vectorPlugin.getEmbedding(config_vectorplugin,chunk.pageContent)

        const entry = {
          "text_chunk": chunk.pageContent,
          "metadata_column": loader.filePath,
          "embedding": array2VectorBuffer(embedding)
        }
        console.log("DEBUG:entry:"+entry)
        textChunkEntries.push(entry)
      }

      console.log("Inserting text chunks with embeddings into db.")
      // Insert the text chunk with embeddings into db
      const insertStatus = await INSERT.into(DocumentChunk).entries(textChunkEntries)
      if (!insertStatus) {
        throw new Error("Insertion of text chunks into db failed!")
      }
      return `Embeddings stored successfully to db.`
    } catch (error) {
      // Handle any errors that occur during the execution
      console.log('Error while generating and storing vector embeddings:', error)
      throw error
    }
})

  this.on ('deleteEmbeddings', async (req) => {
    try {
      // Delete any previous records in the table
      const { DocumentChunk } = this.entities
      await DELETE.from(DocumentChunk)
      return "Success!"
    }
    catch (error) {
      // Handle any errors that occur during the execution
      console.log('Error while deleting the embeddings content in db:', error)
      throw error
    }
  })
}