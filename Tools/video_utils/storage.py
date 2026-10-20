"""Transferências em stream entre o worker e o imageStorageService (contracts/internal-api.md).

A memória não cresce com o tamanho do vídeo: a descarga é feita por blocos e o envio usa
MultipartEncoder (requests-toolbelt), que lê o ficheiro à medida que o envia.
"""
import hashlib
import os

import requests
from requests_toolbelt import MultipartEncoder

from .errors import TaskError

IMG_STORAGE_URL = os.getenv("IMG_STORAGE_URL", "http://img_storage:11000").rstrip("/")
CHUNK = 1024 * 1024


def download(url, path, timeout_s=60):
    try:
        with requests.get(url, stream=True, timeout=timeout_s) as resp:
            resp.raise_for_status()
            with open(path, "wb") as f:
                for chunk in resp.iter_content(CHUNK):
                    f.write(chunk)
    except requests.RequestException as err:
        raise TaskError("storage_error", f"descarga da entrada falhou: {err}") from err
    return path


def sha256_of(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(CHUNK), b""):
            h.update(chunk)
    return h.hexdigest()


def upload(owner_id, project_id, stage, path, content_type="video/mp4", timeout_s=600):
    """Carrega o ficheiro e devolve a chave "<projectId>/<stage>/<uuid>.<ext>"."""
    try:
        with open(path, "rb") as f:
            form = MultipartEncoder(fields={"file": (os.path.basename(path), f, content_type)})
            resp = requests.post(
                f"{IMG_STORAGE_URL}/video/{owner_id}/{project_id}/{stage}",
                data=form,
                headers={"Content-Type": form.content_type},
                timeout=timeout_s,
            )
        resp.raise_for_status()
        return resp.json()["key"]
    except (requests.RequestException, KeyError, ValueError) as err:
        raise TaskError("storage_error", f"envio do resultado falhou: {err}") from err


def remove(owner_id, key, timeout_s=30):
    project_id, stage, name = key.split("/", 2)
    try:
        requests.delete(f"{IMG_STORAGE_URL}/delete/{owner_id}/{project_id}/{stage}/{requests.utils.quote(name)}", timeout=timeout_s)
    except requests.RequestException:
        pass
