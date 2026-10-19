const s3 = require("./s3Client");

// Presigned URL reachable only inside the Docker network (http://seaweedfs:9000/...),
// for services that download the image themselves.
// opts.expires (segundos, por omissão 60 min) e opts.downloadName (força o descarregamento com esse nome)
// são usados pelos vídeos (REQ-VID-COM-030, REQ-VID-COM-050); as imagens mantêm o comportamento anterior.
async function getInternalUrl(userId, projectId, stage, imageName, opts = {}) {
  const params = {
    Bucket: `user-${userId}`,
    Key: `${projectId}/${stage}/${imageName}`,
    Expires: opts.expires || 60 * 60,
  };
  if (opts.downloadName) {
    const name = String(opts.downloadName);
    const ascii = name.normalize("NFD").replace(/[^\x20-\x7e]/g, "").replace(/["\\]/g, "_") || "video";
    params.ResponseContentDisposition = `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
  }

  try {
    return await s3.getSignedUrlPromise("getObject", params);
  } catch (error) {
    console.error("Erro ao gerar URL presignada:", error.message);
    throw error;
  }
}

// Same presigned URL with the host rewritten to the nginx /s3 proxy path, so the
// browser can load it. The signature lives in the path and query, which are unchanged.
async function getPublicUrl(userId, projectId, stage, imageName, opts = {}) {
  const url = await getInternalUrl(userId, projectId, stage, imageName, opts);
  const internal = `http://${process.env.S3_ENDPOINT || "seaweedfs:9000"}`;
  return url.replace(internal, process.env.FRONTEND_URL + "/s3");
}

module.exports = { getInternalUrl, getPublicUrl };
