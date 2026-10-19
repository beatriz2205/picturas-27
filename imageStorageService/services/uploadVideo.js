const fs = require("fs");
const s3 = require("./s3Client");
const createBucket = require("./createBucket");
const { v4: uuidv4 } = require("uuid");

// Envia um vídeo do disco para o SeaweedFS em multipart, sem o carregar em memória
// (specs/000-video-common/research.md, D5).
async function uploadVideo(userId, projectId, stage, filePath, contentType, ext) {
  const bucketName = `user-${userId}`;
  await createBucket(bucketName);

  const key = `${projectId}/${stage}/${uuidv4()}.${ext}`;
  await s3
    .upload(
      { Bucket: bucketName, Key: key, Body: fs.createReadStream(filePath), ContentType: contentType },
      { partSize: 10 * 1024 * 1024, queueSize: 4 }
    )
    .promise();

  return { key };
}

module.exports = uploadVideo;
