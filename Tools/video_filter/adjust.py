"""Ajustes de um fotograma (spec 004, T007; REQ-VID-FLT-006, FLT-007; research F1 a F3).

Reproduz as fórmulas de PIL.ImageEnhance usadas por Tools/brightness, Tools/contrast e
Tools/saturation, pela ordem Brightness → Contrast → Color, seguidas da tonalidade do estilo.
ImageEnhance faz cada ajuste com Image.blend(degenerada, imagem, fator), isto é,
`trunc(d + f·(v − d))` cortado a 0..255, com:
- Brightness: d = 0;
- Contrast: d = média da imagem em tons de cinzento (L), arredondada;
- Color: d = a própria imagem em tons de cinzento.

Brightness e Contrast são iguais em cada canal, por isso aplicam-se com uma tabela (Image.point), que
dá exatamente os mesmos valores com uma fração do tempo. Color é uma combinação linear dos canais e
aplica-se com uma matriz (Image.convert), composta com a da tonalidade quando não há cortes entre as
duas; difere de ImageEnhance no arredondamento (≤ 1 nível). O teste FLT-007 compara com ImageEnhance.
Medido em 1080p com 1 vCPU: ≈ 116 ms com ImageEnhance → ≈ 30 ms por fotograma (FLT-008).
Um fator igual a 1 não altera a imagem e é saltado.
"""
import struct

from PIL import ImageStat

# Matriz sépia clássica (linhas R, G, B)
_SEPIA = (
    (0.393, 0.769, 0.189),
    (0.349, 0.686, 0.168),
    (0.272, 0.534, 0.131),
)
_IDENTITY = ((1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0))
# Pesos de convert("L") da PIL (ITU-R 601-2)
_LUMA = (0.299, 0.587, 0.114)


def _mix(rows, amount):
    """amount·rows + (1 − amount)·identidade."""
    return tuple(tuple(amount * rows[i][j] + (1 - amount) * _IDENTITY[i][j] for j in range(3)) for i in range(3))


# Valores de "tint" aceites por projects/video/tools/filter.js
TINTS = {
    "sepia": _mix(_SEPIA, 1.0),
    "sepia30": _mix(_SEPIA, 0.3),
}


def to_factor(value):
    """Escala −100..+100 → fator da PIL (A18): −100 → 0, 0 → 1, +100 → 2."""
    return 1 + value / 100


def factors(params):
    """(f_b, f_c, f_s, tint) a partir dos parâmetros da tarefa."""
    return (
        to_factor(int(params.get("brightness", 0))),
        to_factor(int(params.get("contrast", 0))),
        to_factor(int(params.get("saturation", 0))),
        params.get("tint"),
    )


def _f32(x):
    return struct.unpack("f", struct.pack("f", x))[0]


def _blend_lut(degenerate, factor):
    """Tabela de Image.blend(degenerada constante, imagem, fator) para os três canais.

    Image.blend calcula em float de 32 bits (libImaging/Blend.c); as contas são feitas com a mesma
    precisão para os valores truncados coincidirem.
    """
    alpha = _f32(factor)
    lut = []
    for v in range(256):
        t = _f32(degenerate + _f32(alpha * (v - degenerate)))
        lut.append(0 if t <= 0 else 255 if t >= 255 else int(t))
    return lut * 3


def _saturation(fs):
    """Matriz de ImageEnhance.Color: fs·v + (1 − fs)·L."""
    return tuple(tuple(fs * (i == j) + (1 - fs) * _LUMA[j] for j in range(3)) for i in range(3))


def _compose(a, b):
    """a·b (aplicar b e depois a)."""
    return tuple(tuple(sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)) for i in range(3))


def _convert(img, rows):
    return img.convert("RGB", tuple(v for row in rows for v in (*row, 0.0)))


def apply(img, fb=1.0, fc=1.0, fs=1.0, tint=None):
    """Aplica os ajustes a uma imagem RGB e devolve a nova imagem."""
    if tint is not None and tint not in TINTS:
        raise ValueError(f"tonalidade desconhecida: {tint}")
    if fb != 1:
        img = img.point(_blend_lut(0, fb))
    if fc != 1:
        mean = int(ImageStat.Stat(img.convert("L")).mean[0] + 0.5)
        img = img.point(_blend_lut(mean, fc))
    matrices = []
    if fs != 1:
        matrices.append(_saturation(fs))
    if tint is not None:
        matrices.append(TINTS[tint])
    # Com fs ≤ 1 a saturação não sai de 0..255 e as duas matrizes podem juntar-se numa só passagem
    if len(matrices) == 2 and fs <= 1:
        matrices = [_compose(matrices[1], matrices[0])]
    for rows in matrices:
        img = _convert(img, rows)
    return img
