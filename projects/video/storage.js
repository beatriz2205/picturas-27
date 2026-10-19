// Acesso ao imageStorageService para vídeos (specs/000-video-common/contracts/internal-api.md).
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const { URL_EXPIRES_S } = require("../config/video");

const IMG_STORAGE = process.env.IMG_STORAGE_URL || "http://img_storage:11000";

function splitKey(key) {
  // <projectId>/<stage>/<name>
  const [projectId, stage, ...rest] = String(key).split("/");
  return { projectId, stage, name: rest.join("/") };
}

// Envia um ficheiro do disco em stream (D5): a memória não cresce com o tamanho do vídeo.
async function uploadFile(ownerId, projectId, stage, filePath, contentType) {
  const form = new FormData();
  const { size } = await fs.promises.stat(filePath);
  form.append("file", fs.createReadStream(filePath), { filename: "upload", contentType, knownLength: size });

  const resp = await axios.post(`${IMG_STORAGE}/video/${ownerId}/${projectId}/${stage}`, form, {
    headers: form.getHeaders({ "Content-Length": form.getLengthSync() }),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
  return resp.data.key;
}

async function url(access, ownerId, key, { expiresS = URL_EXPIRES_S, downloadName } = {}) {
  const { projectId, stage, name } = splitKey(key);
  const resp = await axios.get(`${IMG_STORAGE}/image/${access}/${ownerId}/${projectId}/${stage}/${encodeURIComponent(name)}`, {
    params: { expires: expiresS, ...(downloadName ? { download: downloadName } : {}) },
  });
  return resp.data.url;
}

const publicUrl = (ownerId, key, opts) => url("public", ownerId, key, opts);
const internalUrl = (ownerId, key, opts) => url("internal", ownerId, key, opts);

async function remove(ownerId, key) {
  const { projectId, stage, name } = splitKey(key);
  await axios.delete(`${IMG_STORAGE}/delete/${ownerId}/${projectId}/${stage}/${encodeURIComponent(name)}`);
}

async function health() {
  try {
    await axios.get(`${IMG_STORAGE}/health`, { timeout: 1500 });
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = { uploadFile, publicUrl, internalUrl, remove, health, splitKey };
