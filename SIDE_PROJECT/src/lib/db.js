import { openDB } from 'idb';

const DB_NAME = 'GeminiRAG_DB';
const DB_VERSION = 2; // Bump to v2 for categories

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      if (!db.objectStoreNames.contains('documents')) {
        db.createObjectStore('documents', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('chunks')) {
        const chunkStore = db.createObjectStore('chunks', { keyPath: 'id', autoIncrement: true });
        chunkStore.createIndex('docId', 'docId', { unique: false });
      }
      // Migration for v2: ensure category exists if updating existing docs
      if (oldVersion < 2) {
        const docStore = transaction.objectStore('documents');
        docStore.openCursor().then(function cursorIterate(cursor) {
          if (!cursor) return;
          const doc = cursor.value;
          if (!doc.category) {
            doc.category = '未分類';
            cursor.update(doc);
          }
          cursor.continue().then(cursorIterate);
        });
      }
    },
  });
};

export const saveDocument = async (name, category = '未分類', chunks) => {
  const db = await initDB();
  const tx = db.transaction(['documents', 'chunks'], 'readwrite');
  
  const docId = await tx.objectStore('documents').add({
    name,
    category,
    timestamp: new Date(),
    chunkCount: chunks.length
  });

  const chunkStore = tx.objectStore('chunks');
  for (const chunk of chunks) {
    await chunkStore.add({
      docId,
      content: chunk.content,
      embedding: chunk.embedding,
      metadata: chunk.metadata
    });
  }

  await tx.done;
  return docId;
};

export const getAllDocuments = async () => {
  const db = await initDB();
  return db.getAll('documents');
};

export const clearAllData = async () => {
  const db = await initDB();
  const tx = db.transaction(['documents', 'chunks'], 'readwrite');
  await tx.objectStore('documents').clear();
  await tx.objectStore('chunks').clear();
  await tx.done;
};

export const deleteDocument = async (docId) => {
  const db = await initDB();
  const tx = db.transaction(['documents', 'chunks'], 'readwrite');
  
  // 1. Delete document meta
  await tx.objectStore('documents').delete(docId);
  
  // 2. Delete all related chunks
  // Since 'chunks' store has an index on 'docId', we can use it to find chunks but standard IDB `delete` 
  // only works on primary keys. We have to find keys first.
  const chunkStore = tx.objectStore('chunks');
  const index = chunkStore.index('docId');
  let cursor = await index.openCursor(IDBKeyRange.only(docId));
  
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  
  await tx.done;
};

export const deleteCategory = async (categoryName) => {
  const db = await initDB();
  const allDocs = await db.getAll('documents');
  const targetDocs = allDocs.filter(d => (d.category || '未分類') === categoryName);
  
  for (const doc of targetDocs) {
    await deleteDocument(doc.id);
  }
};

export const updateCategory = async (oldName, newName) => {
  const db = await initDB();
  const tx = db.transaction('documents', 'readwrite');
  const store = tx.objectStore('documents');
  
  let cursor = await store.openCursor();
  while (cursor) {
    const doc = cursor.value;
    if ((doc.category || '未分類') === oldName) {
      doc.category = newName;
      cursor.update(doc);
    }
    cursor = await cursor.continue();
  }
  await tx.done;
};

export const searchChunks = async (queryEmbedding, filterDocIds = null, limit = 5) => {
  const db = await initDB();
  let chunks = await db.getAll('chunks');
  
  // Filter by docIds if provided
  if (filterDocIds && filterDocIds.length > 0) {
    chunks = chunks.filter(chunk => filterDocIds.includes(chunk.docId));
  }

  // 計算相似度並排序
  const results = chunks.map(chunk => ({
    ...chunk,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));

  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
};

// 向量數學：餘弦相似度
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
