"""Vista de componentes com suporte a vídeo (Cap. 8.1), a partir da Figura 1 do documento de solução
arquitetural de base (Building Block View): mesmas zonas e componentes, com o delta do vídeo a cor.

Azul: componente novo; azul-claro: componente alterado; cinzento: sem alterações. Ligações novas a azul.
O minio da baseline é o SeaweedFS no repositório atual. Gera arquitetura_componentes.svg e .png.
Uso: PYTHONPATH=<cairosvg> python3 gerar_componentes.py
"""
from pathlib import Path

HERE = Path(__file__).parent
INK, NOVO, ALT, BASE, LNOVA = "#1A1A1A", "#5BCDF8", "#BDEBFC", "#D9D9D9", "#1C7FB8"
W, H = 1700, 960
out = []


def comp(cx, cy, name, fill, w=150):
    x, y, h = cx - w / 2, cy - 20, 40
    out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{INK}" stroke-width="1"/>')
    ix, iy = x + w - 17, y + 6
    out.append(f'<rect x="{ix}" y="{iy}" width="10" height="13" fill="{fill}" stroke="{INK}" stroke-width="0.8"/>')
    for dy in (2.5, 7.5):
        out.append(f'<rect x="{ix - 3}" y="{iy + dy}" width="6" height="3" fill="{fill}" stroke="{INK}" stroke-width="0.8"/>')
    out.append(f'<text x="{cx - 6}" y="{cy - 4}" font-size="9.5" text-anchor="middle" fill="{INK}">&lt;&lt;component&gt;&gt;</text>')
    out.append(f'<text x="{cx - 6}" y="{cy + 10}" font-size="10" font-weight="bold" text-anchor="middle" fill="{INK}">{name}</text>')


def zone(x0, x1, title):
    out.append(f'<rect x="{x0}" y="22" width="40" height="18" fill="white" stroke="{INK}" stroke-width="1"/>')
    out.append(f'<rect x="{x0}" y="40" width="{x1 - x0}" height="{H - 55}" fill="none" stroke="{INK}" stroke-width="1"/>')
    out.append(f'<text x="{(x0 + x1) / 2}" y="54" font-size="10.5" text-anchor="middle" fill="{INK}">{title}</text>')


def line(points, label=None, at=None, nova=False, anchor="middle"):
    color = LNOVA if nova else INK
    pts = " ".join(f"{px},{py}" for px, py in points)
    width = 1.6 if nova else 1
    out.append(f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="{width}" marker-end="url(#{"an" if nova else "a"})"/>')
    if label:
        out.append(f'<text x="{at[0]}" y="{at[1]}" font-size="9.5" text-anchor="{anchor}" fill="{color}">{label}</text>')


# Zonas da baseline
for x0, x1, t in [(10, 210, "Client"), (210, 430, "Edge / Entry"), (430, 650, "UI + Gateways"),
                  (650, 900, "Core Services"), (900, 1220, "Infra / Data"), (1220, 1690, "Tools / Workers")]:
    zone(x0, x1, t)

# Componentes
comp(110, 400, "Browser", BASE)
comp(320, 400, "nginx", ALT)
comp(540, 140, "frontend", ALT)
comp(540, 400, "api_gateway", ALT)
comp(540, 850, "ws_gateway", ALT)
comp(775, 230, "img_storage", ALT)
comp(775, 400, "projects", ALT)
comp(775, 540, "users", ALT)
comp(775, 680, "subscriptions", BASE)
comp(1080, 140, "rabbitmq", ALT, w=190)
comp(1080, 230, "seaweedfs (ex-minio)", BASE, w=190)
comp(1080, 400, "projects_mongoDB", BASE, w=190)
comp(1080, 540, "users_mongoDB", BASE, w=190)
comp(1080, 680, "subscriptions_mongoDB", BASE, w=190)
comp(1080, 790, "mongo-backup", BASE, w=190)
comp(1080, 890, "generative-mock", BASE, w=190)

# Ferramentas de vídeo (novas), num pacote dentro de Tools / Workers
out.append(f'<rect x="1240" y="88" width="150" height="18" fill="{NOVO}" stroke="{INK}" stroke-width="1"/>')
out.append(f'<text x="1248" y="101" font-size="10.5" font-weight="bold" fill="{INK}">Ferramentas de vídeo</text>')
out.append(f'<rect x="1240" y="106" width="440" height="244" fill="white" stroke="{INK}" stroke-width="1"/>')
for i, name in enumerate(["video_trim_worker", "video_convert_worker", "video_filter_worker",
                          "video_detect_worker", "video_speed_worker", "video_noop_worker"]):
    comp(1350 + (i % 2) * 220, 145 + (i // 2) * 75, name, NOVO, w=200)
out.append(f'<text x="1460" y="340" font-size="9.5" text-anchor="middle" fill="{INK}">todos usam a biblioteca video_utils (FFmpeg, ciclo de vida da tarefa)</text>')

# Ferramentas de imagem da baseline
comp(1340, 430, "watermark_tool_ms", BASE, w=190)
comp(1340, 510, "generic_tool_worker", BASE, w=190)
comp(1340, 590, "expand_ai_tool", BASE, w=190)

# Ligações da baseline
line([(185, 400), (245, 400)], "HTTPS", (215, 394))
line([(360, 380), (360, 140), (465, 140)], "/", (380, 270))
line([(395, 400), (465, 400)], "/api-gateway/", (430, 394))
line([(540, 160), (540, 380)], "REST (via nginx /api-gateway/)", (548, 270), anchor="start")
line([(320, 420), (320, 760), (540, 760), (540, 830)], "/socket.io (proxy)", (430, 754))
line([(110, 420), (110, 860), (465, 860)], "WebSocket/Socket.IO", (290, 854))
line([(290, 380), (290, 68), (975, 68), (975, 222), (985, 222)], "/s3/ + /s3-console/", (470, 78))
line([(615, 405), (700, 405)], "REST", (657, 399))
line([(595, 420), (595, 545), (700, 545)], "REST", (657, 539))
line([(575, 420), (575, 685), (700, 685)], "REST", (657, 679))
line([(775, 380), (775, 250)], "REST (internal)", (783, 320), anchor="start")
line([(850, 232), (985, 232)], "S3 API", (875, 226))
line([(850, 410), (950, 410), (950, 242), (985, 242)], "S3 API", (958, 300), anchor="start")
line([(850, 386), (920, 386), (920, 140), (985, 140)], "AMQP", (925, 134), anchor="start")
line([(850, 420), (985, 420)], "MongoDB", (917, 432))
line([(850, 540), (985, 540)], "MongoDB", (917, 534))
line([(850, 680), (985, 680)], "MongoDB", (917, 674))
line([(615, 845), (1205, 845), (1205, 156), (1175, 156)], "AMQP (ws_queue)", (1000, 839))
for y in (400, 540, 680):
    line([(1175, 790), (1188, 790), (1188, y + 8), (1175, y + 8)])
out.append(f'<text x="1150" y="745" font-size="9.5" text-anchor="middle" fill="{INK}">mongodump</text>')
for y in (430, 510, 590):
    out.append(f'<polyline points="1245,{y} 1228,{y}" fill="none" stroke="{INK}" stroke-width="1"/>')
line([(1228, 590), (1228, 128), (1175, 128)], "AMQP", (1236, 470), anchor="start")
line([(1340, 610), (1340, 895), (1175, 895)], "HTTP (GEN_EXPAND_URL)", (1348, 760), anchor="start")

# Ligações novas (vídeo)
line([(1240, 146), (1175, 146)], "AMQP", (1186, 172), nova=True)
line([(1600, 106), (1600, 80), (775, 80), (775, 210)], "HTTPS (vídeos)", (1100, 75), nova=True)
line([(1630, 106), (1630, 95), (680, 95), (680, 390), (700, 390)], "HTTPS (estado da tarefa)", (1100, 108), nova=True)
line([(800, 420), (800, 520)], "HTTPS (quota)", (808, 475), nova=True, anchor="start")
line([(1240, 238), (1175, 238)], nova=True)
out.append(f'<text x="1172" y="265" font-size="9.5" text-anchor="end" fill="{LNOVA}">HTTP (URL assinado)</text>')

# Nota (estilo VP)
nx, ny, nw, nh = 230, 880, 190, 64
out.append(f'<path d="M{nx},{ny} H{nx + nw - 12} L{nx + nw},{ny + 12} V{ny + nh} H{nx} Z" fill="{NOVO}" stroke="{INK}" stroke-width="1"/>')
out.append(f'<path d="M{nx + nw - 12},{ny} V{ny + 12} H{nx + nw}" fill="none" stroke="{INK}" stroke-width="1"/>')
for i, t in enumerate(["Azul: componente novo.", "Azul-claro: alterado.", "Cinzento: sem alterações.", "Linhas azuis: ligações novas."]):
    out.append(f'<text x="{nx + 8}" y="{ny + 16 + i * 13}" font-size="10" fill="{INK}">{t}</text>')

svg = (
    f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" '
    'font-family="DejaVu Sans, Dialog, Arial, sans-serif">\n<defs>'
    f'<marker id="a" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0 L9,4 L0,8" fill="none" stroke="{INK}" stroke-width="1"/></marker>'
    f'<marker id="an" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0 L9,4 L0,8" fill="none" stroke="{LNOVA}" stroke-width="1.2"/></marker>'
    f'</defs>\n<rect width="{W}" height="{H}" fill="white"/>\n' + "\n".join(out) + "\n</svg>\n"
)
(HERE / "arquitetura_componentes.svg").write_text(svg, encoding="utf-8")
import cairosvg

cairosvg.svg2png(bytestring=svg.encode(), write_to=str(HERE / "arquitetura_componentes.png"), output_width=W * 2)
print("gerados: arquitetura_componentes.svg e .png")
