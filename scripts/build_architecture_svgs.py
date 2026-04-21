#!/usr/bin/env python3
"""Build consistent architecture SVGs for the resume project portfolio.

Each of the 5 projects from the resume gets its own SVG, styled with the
official AWS 2026 category colors and a uniform visual language:

  - Services: rounded tile with colored header, service name, and a simple
    geometric glyph hinting at the shape of the AWS icon.
  - Boundary groups: VPC, Region, AZ, subnets — matching AWS reference style.
  - Arrows: straight polylines with labelled mid-sections.

Output: /app/public/architecture/pj{1..5}.svg
"""

from __future__ import annotations

import dataclasses
import html
import pathlib
import textwrap
from typing import Iterable

OUT_DIR = pathlib.Path(__file__).resolve().parents[1] / "app" / "public" / "architecture"

# ---------------------------------------------------------------------------
# AWS brand colors (from skill reference: aws-colors.md, 2026-01-30 pack)
# ---------------------------------------------------------------------------

CATEGORY_COLORS = {
    "compute": "#ED7100",
    "containers": "#ED7100",
    "storage": "#7AA116",
    "database": "#C925D1",
    "networking": "#8C4FFF",
    "security": "#DD344C",
    "integration": "#E7157B",
    "migration": "#01A88D",
    "management": "#E7157B",
    "devtools": "#C925D1",
    "general": "#232F3E",
    "finops": "#277116",
}

GROUP_STYLES = {
    "aws_cloud": {"stroke": "#232F3E", "dash": "0", "fill": "none"},
    "region": {"stroke": "#00A4A6", "dash": "6 4", "fill": "none"},
    "vpc": {"stroke": "#8C4FFF", "dash": "0", "fill": "none"},
    "az": {"stroke": "#00A4A6", "dash": "5 3", "fill": "none"},
    "public_subnet": {"stroke": "#7AA116", "dash": "0", "fill": "#F2F6E8"},
    "private_subnet": {"stroke": "#00A4A6", "dash": "0", "fill": "#E6F2F8"},
    "on_prem": {"stroke": "#7D8998", "dash": "4 3", "fill": "#F7F8FA"},
    "external": {"stroke": "#475569", "dash": "4 3", "fill": "#F8FAFC"},
    "cicd": {"stroke": "#0F172A", "dash": "0", "fill": "#F1F5F9"},
    "logical": {"stroke": "#334155", "dash": "0", "fill": "#F8FAFC"},
}

# ---------------------------------------------------------------------------
# SVG helpers
# ---------------------------------------------------------------------------


@dataclasses.dataclass
class Service:
    """A single labelled AWS service tile."""

    id: str
    x: int
    y: int
    label: str
    category: str
    glyph: str = "rect"  # icon key → ICON_MAP → AWS SVG
    sublabel: str | None = None
    width: int = 108
    height: int = 82

    @property
    def cx(self) -> int:
        return self.x + self.width // 2

    @property
    def cy(self) -> int:
        return self.y + self.height // 2

    @property
    def left(self) -> int:
        return self.x

    @property
    def right(self) -> int:
        return self.x + self.width

    @property
    def top(self) -> int:
        return self.y

    @property
    def bottom(self) -> int:
        return self.y + self.height


@dataclasses.dataclass
class Group:
    id: str
    x: int
    y: int
    w: int
    h: int
    label: str
    kind: str  # key into GROUP_STYLES


@dataclasses.dataclass
class Arrow:
    src: str  # service id or (x,y) tuple serialized as "x,y"
    dst: str
    label: str | None = None
    kind: str = "solid"  # "solid" | "dashed"
    color: str = "#334155"
    bend: str | None = None  # "right" | "down" | None (elbow direction)


@dataclasses.dataclass
class Note:
    x: int
    y: int
    text: str
    anchor: str = "start"  # "start" | "middle" | "end"
    size: int = 11
    color: str = "#475569"
    weight: str = "500"


def render_group(g: Group) -> str:
    st = GROUP_STYLES[g.kind]
    dash = st["dash"]
    dash_attr = f' stroke-dasharray="{dash}"' if dash != "0" else ""
    label_fill = st["stroke"]
    return textwrap.dedent(
        f"""
        <g id="{g.id}">
          <rect x="{g.x}" y="{g.y}" width="{g.w}" height="{g.h}" rx="10" ry="10"
                fill="{st['fill']}" stroke="{st['stroke']}" stroke-width="1.4"{dash_attr}/>
          <g transform="translate({g.x + 12}, {g.y + 18})">
            <text x="0" y="0" font-family="Inter, system-ui, sans-serif"
                  font-size="11" font-weight="700" fill="{label_fill}"
                  letter-spacing="0.5">{html.escape(g.label)}</text>
          </g>
        </g>
        """
    ).strip()


# Mapping from glyph key → actual AWS icon SVG file (under /architecture/icons/)
ICON_MAP = {
    "alb": "alb.svg",
    "vpc": "vpc.svg",
    "igw": "igw.svg",
    "nat": "nat.svg",
    "route53": "route53.svg",
    "ec2": "ec2.svg",
    "lambda": "lambda.svg",
    "fargate": "fargate.svg",
    "ecs": "ecs.svg",
    "ecr": "ecr.svg",
    "s3": "s3.svg",
    "rds": "rds.svg",
    "sns": "sns.svg",
    "eventbridge": "eventbridge.svg",
    "cloudwatch": "cloudwatch.svg",
    "cloudformation": "cloudformation.svg",
    "ssm": "ssm.svg",
    "iam": "iam.svg",
    "kms": "kms.svg",
    "transfer": "transfer.svg",
    "user": "user.svg",
    "users": "users.svg",
    "github": "github.svg",
    "server": "server.svg",
    "window": "window.svg",
    "db": "db.svg",
    "spring": "spring.svg",
    "code": "code.svg",
    "vpce": "vpce.svg",
    "sqs": "sqs.svg",
    "glacier": "glacier.svg",
}

ICON_DIR = OUT_DIR / "icons"
ICON_SIZE = 36  # rendered size inside each tile
ICON_TOP_PAD = 6  # top padding inside tile before icon starts
_ICON_CACHE: dict[str, tuple[str, float, float]] = {}  # name -> (inner_svg, vb_w, vb_h)


def _load_icon(icon_file: str) -> tuple[str, float, float] | None:
    """Read the raw AWS icon SVG and return (inner_body, viewBox_w, viewBox_h).

    Strips the outer <svg> wrapper so we can embed the body inside our generator
    output at arbitrary coordinates/sizes via a nested <svg> or transformed <g>.
    """
    if icon_file in _ICON_CACHE:
        return _ICON_CACHE[icon_file]
    path = ICON_DIR / icon_file
    if not path.exists():
        return None
    raw = path.read_text(encoding="utf-8")
    # Strip XML preamble
    if raw.lstrip().startswith("<?xml"):
        raw = raw[raw.index("?>") + 2:]
    # Locate the root <svg ...> tag and its matching close
    import re

    m = re.search(r"<svg\b([^>]*)>", raw, re.DOTALL)
    if not m:
        return None
    attrs = m.group(1)
    # Pull viewBox values; fall back to width/height or 64/64
    vb_match = re.search(r'viewBox\s*=\s*"([^"]+)"', attrs)
    if vb_match:
        parts = vb_match.group(1).strip().split()
        vb_w = float(parts[2])
        vb_h = float(parts[3])
    else:
        w = re.search(r'\bwidth\s*=\s*"([\d.]+)', attrs)
        h = re.search(r'\bheight\s*=\s*"([\d.]+)', attrs)
        vb_w = float(w.group(1)) if w else 64.0
        vb_h = float(h.group(1)) if h else 64.0
    # Grab body between opening <svg> and trailing </svg>
    start = m.end()
    end = raw.rfind("</svg>")
    if end == -1:
        return None
    body = raw[start:end].strip()
    _ICON_CACHE[icon_file] = (body, vb_w, vb_h)
    return _ICON_CACHE[icon_file]


def render_service(s: Service) -> str:
    icon_file = ICON_MAP.get(s.glyph)
    sub = ""
    if s.sublabel:
        sub = (
            f'<text x="{s.width // 2}" y="{s.height + 18}" text-anchor="middle" '
            f'font-family="Inter, system-ui, sans-serif" font-size="10" '
            f'fill="#64748B" font-weight="500">{html.escape(s.sublabel)}</text>'
        )
    icon_svg = ""
    if icon_file:
        loaded = _load_icon(icon_file)
        if loaded is not None:
            body, vb_w, vb_h = loaded
            icon_x = (s.width - ICON_SIZE) // 2
            clip_id = f"clip-{s.id}"
            # Explicit clipPath + nested <svg> so no icon content can bleed outside the tile.
            icon_svg = (
                f'<defs><clipPath id="{clip_id}">'
                f'<rect x="{icon_x}" y="{ICON_TOP_PAD}" width="{ICON_SIZE}" height="{ICON_SIZE}"/>'
                f'</clipPath></defs>'
                f'<g clip-path="url(#{clip_id})">'
                f'<svg x="{icon_x}" y="{ICON_TOP_PAD}" width="{ICON_SIZE}" height="{ICON_SIZE}" '
                f'viewBox="0 0 {vb_w} {vb_h}" preserveAspectRatio="xMidYMid meet" '
                f'overflow="hidden">'
                f"{body}</svg></g>"
            )
    color = CATEGORY_COLORS.get(s.category, "#94A3B8")
    return textwrap.dedent(
        f"""
        <g id="svc-{s.id}" transform="translate({s.x}, {s.y})">
          <rect x="0" y="0" width="{s.width}" height="{s.height}" rx="10" ry="10"
                fill="#ffffff" stroke="#CBD5E1" stroke-width="1"/>
          {icon_svg}
          <rect x="8" y="{s.height - 4}" width="{s.width - 16}" height="3"
                rx="1.5" ry="1.5" fill="{color}"/>
          <text x="{s.width // 2}" y="{s.height - 8}" text-anchor="middle"
                font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="700"
                fill="#1E293B">{html.escape(s.label)}</text>
          {sub}
        </g>
        """
    ).strip()


def render_note(n: Note) -> str:
    return (
        f'<text x="{n.x}" y="{n.y}" text-anchor="{n.anchor}" '
        f'font-family="Inter, system-ui, sans-serif" font-size="{n.size}" '
        f'fill="{n.color}" font-weight="{n.weight}">{html.escape(n.text)}</text>'
    )


def _anchor(service_map: dict[str, Service], ref: str, side: str | None = None) -> tuple[int, int]:
    """Return the point on a service edge closest to `side`. ref may be 'id' or 'x,y'."""
    if "," in ref and ref not in service_map:
        x, y = ref.split(",")
        return int(x), int(y)
    s = service_map[ref]
    side = side or "auto"
    if side == "right":
        return s.right, s.cy
    if side == "left":
        return s.left, s.cy
    if side == "top":
        return s.cx, s.top
    if side == "bottom":
        return s.cx, s.bottom
    return s.cx, s.cy


def render_arrow(a: Arrow, service_map: dict[str, Service]) -> str:
    # Heuristic: pick anchor sides based on geometric relationship
    def pick_sides(src: Service | tuple, dst: Service | tuple) -> tuple[str, str]:
        sx, sy = (src.cx, src.cy) if isinstance(src, Service) else src
        dx, dy = (dst.cx, dst.cy) if isinstance(dst, Service) else dst
        dx_delta = dx - sx
        dy_delta = dy - sy
        if abs(dx_delta) >= abs(dy_delta):
            if dx_delta >= 0:
                return "right", "left"
            return "left", "right"
        if dy_delta >= 0:
            return "bottom", "top"
        return "top", "bottom"

    src_obj: Service | tuple
    dst_obj: Service | tuple

    if a.src in service_map:
        src_obj = service_map[a.src]
    else:
        x, y = a.src.split(",")
        src_obj = (int(x), int(y))
    if a.dst in service_map:
        dst_obj = service_map[a.dst]
    else:
        x, y = a.dst.split(",")
        dst_obj = (int(x), int(y))

    s_side, d_side = pick_sides(src_obj, dst_obj)

    src_point = _anchor(service_map, a.src, s_side)
    dst_point = _anchor(service_map, a.dst, d_side)

    dash = ' stroke-dasharray="5 4"' if a.kind == "dashed" else ""
    # elbow routing: L-shape when the two sides are non-opposite
    sx, sy = src_point
    dx, dy = dst_point

    if s_side in ("right", "left") and d_side in ("top", "bottom"):
        path = f"M {sx} {sy} H {dx} V {dy}"
    elif s_side in ("top", "bottom") and d_side in ("right", "left"):
        path = f"M {sx} {sy} V {dy} H {dx}"
    else:
        path = f"M {sx} {sy} L {dx} {dy}"

    mid_x = (sx + dx) // 2
    mid_y = (sy + dy) // 2
    label_svg = ""
    if a.label:
        label_svg = (
            f'<rect x="{mid_x - 4 * len(a.label) - 4}" y="{mid_y - 10}" width="{8 * len(a.label) + 8}" height="16" rx="4" fill="#ffffff" stroke="#E2E8F0" stroke-width="0.8"/>'
            f'<text x="{mid_x}" y="{mid_y + 2}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="10" fill="#334155" font-weight="600">{html.escape(a.label)}</text>'
        )
    return (
        f'<path d="{path}" fill="none" stroke="{a.color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"{dash} marker-end="url(#arrowhead)"/>'
        + label_svg
    )


DEFS = """
<defs>
  <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="strokeWidth">
    <path d="M0 0 L10 5 L0 10 z" fill="#334155"/>
  </marker>
</defs>
"""


def wrap_svg(viewbox: str, body: str, bg: bool = False) -> str:
    bg_rect = ""
    if bg:
        bg_rect = '<rect width="100%" height="100%" fill="#FDFEFF"/>'
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" role="img"'
        f' aria-labelledby="title desc" preserveAspectRatio="xMidYMid meet">\n'
        f"{DEFS}{bg_rect}\n{body}\n</svg>"
    )


def compose(
    title: str,
    desc: str,
    groups: Iterable[Group],
    services: Iterable[Service],
    arrows: Iterable[Arrow],
    notes: Iterable[Note],
    viewbox: str = "0 0 1240 760",
) -> str:
    svc_list = list(services)
    service_map = {s.id: s for s in svc_list}
    body_parts = [
        f'<title id="title">{html.escape(title)}</title>',
        f'<desc id="desc">{html.escape(desc)}</desc>',
    ]
    body_parts.extend(render_group(g) for g in groups)
    body_parts.extend(render_service(s) for s in svc_list)
    body_parts.extend(render_arrow(a, service_map) for a in arrows)
    body_parts.extend(render_note(n) for n in notes)
    return wrap_svg(viewbox, "\n".join(body_parts))


# ---------------------------------------------------------------------------
# PJ1 — EC site foundation
# ---------------------------------------------------------------------------


def build_pj1() -> str:
    # 3-tier AWS EC foundation: external actors × 3 lanes × Region/VPC × AZ columns × shared services
    groups = [
        Group("external", 20, 70, 220, 680, "INTERNET / ACTORS", "external"),
        Group("cloud", 270, 70, 1110, 840, "AWS Cloud — ap-northeast-1", "aws_cloud"),
        Group("region", 290, 110, 1070, 780, "Region", "region"),
        Group("vpc", 310, 150, 1030, 560, "VPC  10.0.0.0/16", "vpc"),
        Group("pub-a", 340, 290, 490, 110, "Public subnet — AZ 1a  10.0.0.0/24", "public_subnet"),
        Group("pub-c", 845, 290, 475, 110, "Public subnet — AZ 1c  10.0.1.0/24", "public_subnet"),
        Group("priv-app-a", 340, 430, 490, 120, "Private subnet — App 1a  10.0.10.0/24", "private_subnet"),
        Group("priv-app-c", 845, 430, 475, 120, "Private subnet — App 1c  10.0.11.0/24", "private_subnet"),
        Group("priv-db-a", 340, 570, 490, 120, "Private subnet — DB 1a  10.0.20.0/24", "private_subnet"),
        Group("priv-db-c", 845, 570, 475, 120, "Private subnet — DB 1c  10.0.21.0/24", "private_subnet"),
        Group("platform", 290, 740, 1070, 150, "Shared platform & governance", "az"),
    ]
    services = [
        # External — three distinct actor types
        Service("user", 60, 130, "Internet User", "general", "users", sublabel="EC customer"),
        Service("r53", 60, 280, "Route 53", "networking", "route53", sublabel="Hosted Zone"),
        Service("dev", 60, 440, "Developer", "general", "user", sublabel="CFN deploy"),
        Service("ops", 60, 590, "Ops", "general", "user", sublabel="alert triage"),
        # Edge inside VPC
        Service("igw", 360, 180, "Internet GW", "networking", "igw"),
        Service("alb", 820, 180, "ALB", "networking", "alb", sublabel="ACM, :443, multi-AZ"),
        # Public subnets — NAT GW per AZ
        Service("nat-a", 480, 305, "NAT GW", "networking", "nat", sublabel="AZ 1a"),
        Service("nat-c", 980, 305, "NAT GW", "networking", "nat", sublabel="AZ 1c"),
        # App tier EC2 + Nginx
        Service("ec2-a", 480, 445, "EC2 + Nginx", "compute", "ec2", sublabel="AL 2023 · SG"),
        Service("ec2-c", 980, 445, "EC2 + Nginx", "compute", "ec2", sublabel="AL 2023 · SG"),
        # S3 Gateway VPC Endpoint (private path EC2→S3)
        Service("vpce-s3", 1220, 445, "S3 VPC Endpoint", "networking", "vpce", sublabel="gateway"),
        # DB tier RDS
        Service("rds-a", 480, 585, "RDS MySQL", "database", "rds", sublabel="Primary · KMS"),
        Service("rds-c", 980, 585, "RDS MySQL", "database", "rds", sublabel="Standby · Multi-AZ"),
        # Shared platform row (100-wide tiles to fit 7 services)
        Service("s3", 315, 760, "S3", "storage", "s3", sublabel="assets/logs", width=100),
        Service("cw", 435, 760, "CloudWatch", "management", "cloudwatch", sublabel="Logs/Alarm", width=100),
        Service("sns", 555, 760, "SNS topic", "integration", "sns", sublabel="ops-alerts", width=100),
        Service("ssm-sess", 675, 760, "SSM Session", "management", "ssm", sublabel="bastion-less", width=100),
        Service("ssm-param", 795, 760, "SSM Param", "management", "ssm", sublabel="DB secrets", width=100),
        Service("iam", 915, 760, "IAM Role", "security", "iam", sublabel="least-priv", width=100),
        Service("cfn", 1035, 760, "CloudFormation", "management", "cloudformation", sublabel="IaC", width=100),
    ]
    arrows = [
        Arrow("user", "r53", "DNS"),
        Arrow("r53", "alb", "A record"),
        Arrow("igw", "alb"),
        Arrow("alb", "ec2-a"),
        Arrow("alb", "ec2-c"),
        Arrow("ec2-a", "rds-a", "3306"),
        Arrow("ec2-c", "rds-c", "3306"),
        Arrow("rds-a", "rds-c", "replica", kind="dashed"),
        Arrow("nat-a", "igw", kind="dashed"),
        Arrow("ec2-a", "vpce-s3", kind="dashed"),
        Arrow("vpce-s3", "s3", kind="dashed"),
        Arrow("ec2-a", "cw", kind="dashed"),
        Arrow("ec2-c", "cw", kind="dashed"),
        Arrow("cw", "sns", "alarm"),
        Arrow("sns", "ops", "email", kind="dashed"),
        Arrow("ec2-a", "ssm-param", "get", kind="dashed"),
        Arrow("dev", "cfn", "deploy", kind="dashed"),
        Arrow("dev", "ssm-sess", "session", kind="dashed"),
        Arrow("cfn", "1340,700", "provision", kind="dashed"),
    ]
    notes = [
        Note(700, 48, "PJ1 — EC-site foundation (3-tier AWS)", size=18, weight="700",
             color="#1E293B", anchor="middle"),
        Note(700, 928, "Route 53 → ALB (multi-AZ) → EC2 → RDS primary/standby · S3 via VPC Endpoint · CW→SNS → Ops · CFN provisions · SSM for params & session",
             size=11, weight="500", color="#64748B", anchor="middle"),
    ]
    return compose(
        "PJ1 — EC site foundation",
        "Three-tier AWS architecture: ALB→EC2(Nginx)→RDS Multi-AZ, with S3 via VPC Endpoint, CloudWatch/SNS ops alerting, SSM Session/Parameter Store, provisioned by CloudFormation.",
        groups,
        services,
        arrows,
        notes,
        viewbox="0 0 1400 950",
    )


# ---------------------------------------------------------------------------
# PJ2 — Monitoring & Job Platform
# ---------------------------------------------------------------------------


def build_pj2() -> str:
    groups = [
        Group("actors", 20, 140, 180, 520, "Actors", "external"),
        Group("cloud", 220, 60, 1260, 720, "AWS Cloud — ap-northeast-1", "aws_cloud"),
        Group("region", 240, 100, 1230, 670, "Region", "region"),
        Group("vpc", 260, 140, 490, 520, "VPC (monitored workload)", "vpc"),
        Group("priv", 280, 200, 450, 300, "Private subnet", "private_subnet"),
        Group("obs", 780, 140, 330, 490, "Observability", "az"),
        Group("jobs", 1130, 140, 330, 490, "Job orchestration", "az"),
        Group("store", 260, 540, 490, 120, "Durable storage", "az"),
        Group("govern", 780, 650, 680, 110, "Notification & governance", "az"),
    ]
    services = [
        # External actors
        Service("ops", 40, 230, "運用担当", "general", "user", sublabel="alert triage"),
        Service("jobowner", 40, 410, "ジョブオーナー", "general", "user", sublabel="register / review"),
        # Monitored EC2 fleet
        Service("ec2-1", 300, 240, "EC2 Workload A", "compute", "ec2", sublabel="RHEL"),
        Service("ec2-2", 430, 240, "EC2 Workload B", "compute", "ec2", sublabel="RHEL"),
        Service("ec2-3", 560, 240, "EC2 Workload C", "compute", "ec2", sublabel="RHEL"),
        Service("ec2-4", 300, 380, "EC2 Workload D", "compute", "ec2", sublabel="RHEL"),
        Service("ec2-5", 430, 380, "EC2 Workload E", "compute", "ec2", sublabel="RHEL"),
        Service("ec2-6", 560, 380, "EC2 Workload F", "compute", "ec2", sublabel="RHEL"),
        # Observability (5 tiles)
        Service("cw-metrics", 800, 200, "CW Metrics", "management", "cloudwatch"),
        Service("cw-logs", 970, 200, "CW Logs", "management", "cloudwatch"),
        Service("metric-filter", 800, 340, "Metric Filter", "management", "cloudwatch", sublabel="log→metric"),
        Service("cw-alarm", 970, 340, "CW Alarm", "management", "cloudwatch", sublabel="thresholds"),
        Service("dashboards", 885, 480, "Dashboards", "management", "cloudwatch", sublabel="per-workload"),
        # Jobs (6 tiles)
        Service("eb", 1150, 200, "EventBridge", "integration", "eventbridge", sublabel="cron rules"),
        Service("lambda", 1320, 200, "Lambda", "compute", "lambda", sublabel="job runner"),
        Service("lambda-logs", 1150, 340, "Lambda Logs", "management", "cloudwatch", sublabel="per-function"),
        Service("dlq", 1320, 340, "DLQ (SQS)", "integration", "sqs", sublabel="retry failure"),
        Service("ssm", 1150, 480, "SSM Parameter", "management", "ssm", sublabel="config"),
        Service("iam-role", 1320, 480, "IAM Role", "security", "iam", sublabel="least-priv"),
        # Durable storage
        Service("s3-archive", 300, 580, "S3 log archive", "storage", "s3", sublabel="Glacier lifecycle"),
        # Notification & governance
        Service("sns", 810, 690, "SNS Topic", "integration", "sns", sublabel="ops-alerts"),
        Service("email", 970, 690, "Email", "general", "user"),
        Service("kms", 1130, 690, "KMS", "security", "kms", sublabel="Log Group encrypt"),
        Service("cfn", 1300, 690, "CloudFormation", "management", "cloudformation"),
    ]
    arrows = [
        Arrow("ec2-1", "cw-metrics", "agent", kind="dashed"),
        Arrow("ec2-3", "cw-logs", kind="dashed"),
        Arrow("ec2-6", "cw-logs", kind="dashed"),
        Arrow("cw-logs", "metric-filter", kind="dashed"),
        Arrow("metric-filter", "cw-alarm"),
        Arrow("cw-metrics", "cw-alarm"),
        Arrow("cw-alarm", "sns", "alert"),
        Arrow("sns", "email"),
        Arrow("email", "ops", kind="dashed"),
        Arrow("jobowner", "eb", "register", kind="dashed"),
        Arrow("eb", "lambda", "invoke"),
        Arrow("lambda", "lambda-logs", kind="dashed"),
        Arrow("lambda", "dlq", "fail→retry", kind="dashed"),
        Arrow("lambda", "ssm", "get", kind="dashed"),
        Arrow("lambda", "iam-role", "assume", kind="dashed"),
        Arrow("cw-logs", "s3-archive", "export"),
        Arrow("lambda-logs", "s3-archive", kind="dashed"),
        Arrow("kms", "cw-logs", "encrypt", kind="dashed"),
        Arrow("cfn", "eb", "provision", kind="dashed"),
        Arrow("cfn", "cw-alarm", "provision", kind="dashed"),
    ]
    notes = [
        Note(720, 45, "PJ2 — Monitoring & Job Platform", size=18, weight="700", color="#1E293B", anchor="middle"),
        Note(720, 788, "6 RHEL workloads · CW Metrics/Logs → Metric Filter → Alarm → SNS email · EventBridge → Lambda (DLQ on fail) · KMS-encrypted log groups",
             size=11, weight="500", color="#64748B", anchor="middle"),
    ]
    return compose(
        "PJ2 — Monitoring & Job Platform",
        "CloudWatch Agent fans metrics/logs from six RHEL workloads into Metric Filters, Alarms, and Dashboards; EventBridge rules drive Lambda jobs with DLQ safety net; all archived to S3 with KMS-encrypted log groups.",
        groups,
        services,
        arrows,
        notes,
        viewbox="0 0 1500 810",
    )


# ---------------------------------------------------------------------------
# PJ3 — Container platform with GitHub Actions CI/CD
# ---------------------------------------------------------------------------


def build_pj3() -> str:
    groups = [
        Group("dev", 20, 60, 320, 680, "Developer / GitHub", "cicd"),
        Group("cloud", 360, 60, 1020, 680, "AWS Cloud — ap-northeast-1", "aws_cloud"),
        Group("region", 380, 100, 990, 630, "Region", "region"),
        Group("vpc", 400, 220, 560, 510, "VPC", "vpc"),
        Group("pub", 420, 260, 520, 110, "Public subnet  10.0.0.0/24", "public_subnet"),
        Group("priv", 420, 400, 520, 310, "Private subnet — Fargate tasks  10.0.10.0/24", "private_subnet"),
        Group("registry", 980, 220, 380, 240, "Image + Config", "az"),
        Group("obs", 980, 480, 380, 250, "Ops & Notification", "az"),
    ]
    services = [
        # Dev side
        Service("dev", 60, 180, "Developer", "general", "user"),
        Service("repo", 60, 320, "GitHub Repo", "devtools", "github"),
        Service("gha", 210, 320, "GHA Runner", "devtools", "code", sublabel="build / test / push"),
        Service("oidc", 60, 460, "GitHub OIDC", "security", "iam", sublabel="token"),
        Service("iam-role", 210, 460, "IAM Role", "security", "iam", sublabel="deploy"),
        # AWS side
        Service("r53", 395, 135, "Route 53", "networking", "route53"),
        # Public subnet
        Service("alb", 440, 280, "ALB + ACM", "networking", "alb", sublabel=":443 · multi-AZ"),
        Service("nat", 640, 280, "NAT GW", "networking", "nat", sublabel="egress only"),
        Service("igw", 820, 280, "Internet GW", "networking", "igw"),
        # Private subnet (Fargate tasks)
        Service("ecs-svc", 440, 430, "ECS Service", "containers", "ecs", sublabel="desiredCount=2"),
        Service("taskdef", 440, 560, "TaskDef", "containers", "fargate", sublabel="revision n"),
        Service("task-1", 600, 430, "Fargate Task", "containers", "fargate", sublabel="AZ 1a"),
        Service("task-2", 740, 430, "Fargate Task", "containers", "fargate", sublabel="AZ 1c"),
        Service("nginx", 600, 560, "Nginx", "compute", "server", sublabel="sidecar"),
        Service("app", 740, 560, "App", "compute", "ec2", sublabel="container"),
        # Image + Config
        Service("ecr", 1000, 265, "ECR", "containers", "ecr", sublabel="image repo"),
        Service("artifact", 1140, 265, "S3 Artifact", "storage", "s3", sublabel="build output"),
        Service("ssm", 1000, 380, "SSM Parameter", "management", "ssm", sublabel="config / secret"),
        # Ops & Notification
        Service("cw-logs", 1000, 520, "CW Logs", "management", "cloudwatch", sublabel="/ecs/app"),
        Service("cw-alarm", 1140, 520, "CW Alarm", "management", "cloudwatch", sublabel="5xx / CPU"),
        Service("sns", 1000, 640, "SNS Topic", "integration", "sns", sublabel="ops-alerts"),
        Service("cfn", 1140, 640, "CloudFormation", "management", "cloudformation"),
    ]
    arrows = [
        Arrow("dev", "repo", "push"),
        Arrow("repo", "gha", "trigger"),
        Arrow("gha", "oidc", "exchange", kind="dashed"),
        Arrow("oidc", "iam-role", "assume", kind="dashed"),
        Arrow("gha", "ecr", "docker push"),
        Arrow("gha", "artifact", "upload", kind="dashed"),
        Arrow("gha", "taskdef", "register", kind="dashed"),
        Arrow("gha", "ecs-svc", "update-service"),
        Arrow("taskdef", "ecs-svc", "ref", kind="dashed"),
        Arrow("r53", "alb", "DNS"),
        Arrow("igw", "alb"),
        Arrow("alb", "task-1", "HTTPS"),
        Arrow("alb", "task-2", "HTTPS"),
        Arrow("task-1", "ecr", "pull", kind="dashed"),
        Arrow("task-2", "ecr", "pull", kind="dashed"),
        Arrow("task-1", "ssm", "config", kind="dashed"),
        Arrow("task-1", "nat", kind="dashed"),
        Arrow("nat", "igw", kind="dashed"),
        Arrow("task-1", "cw-logs", "logs", kind="dashed"),
        Arrow("task-2", "cw-logs", "logs", kind="dashed"),
        Arrow("cw-logs", "cw-alarm"),
        Arrow("cw-alarm", "sns", "alert"),
        Arrow("cfn", "ecs-svc", "provision", kind="dashed"),
    ]
    notes = [
        Note(720, 45, "PJ3 — Container platform · GitHub Actions CI/CD", size=18, weight="700", color="#1E293B", anchor="middle"),
        Note(720, 770, "OIDC federation · GHA → ECR + S3 Artifact · RegisterTaskDef → UpdateService · Route 53 → ALB → Fargate (NAT for egress) · CW Alarm → SNS",
             size=11, weight="500", color="#64748B", anchor="middle"),
    ]
    return compose(
        "PJ3 — Container platform with GitHub Actions CI/CD",
        "GitHub Actions builds container images → pushes to ECR + uploads artifacts to S3 → registers new TaskDef revision → updates ECS service; traffic flows Route 53 → ALB → Fargate tasks, egress via NAT, monitored by CloudWatch.",
        groups,
        services,
        arrows,
        notes,
        viewbox="0 0 1400 800",
    )


# ---------------------------------------------------------------------------
# PJ4 — File integration platform
# ---------------------------------------------------------------------------


def build_pj4() -> str:
    groups = [
        Group("external", 20, 60, 220, 420, "External partner", "external"),
        Group("onprem", 20, 500, 220, 220, "Test / validation", "on_prem"),
        Group("cloud", 260, 60, 1200, 720, "AWS Cloud — ap-northeast-1", "aws_cloud"),
        Group("region", 280, 100, 1170, 670, "Region", "region"),
        Group("vpc", 300, 140, 560, 620, "VPC", "vpc"),
        Group("priv", 320, 200, 520, 540, "Private subnet (interface endpoints)", "private_subnet"),
        Group("s3zone", 880, 140, 570, 280, "Storage (S3 + KMS + lifecycle)", "az"),
        Group("logs", 880, 440, 570, 160, "Log streams", "az"),
        Group("ops", 880, 620, 570, 140, "Ops & Notification", "az"),
    ]
    services = [
        # External partner
        Service("partner", 40, 150, "Partner System", "general", "server", sublabel="external"),
        Service("sftp-client", 40, 300, "SFTP Client", "general", "window", sublabel="CLI"),
        Service("ops", 40, 410, "Ops", "general", "user", sublabel="alert triage"),
        # On-prem (test)
        Service("win", 40, 570, "Windows Server", "general", "window", sublabel="send/receive test"),
        # VPC — Transfer Family + Lambda + endpoints
        Service("tf", 340, 260, "Transfer Family", "migration", "transfer", sublabel="SFTP endpoint"),
        Service("vpce-s3", 500, 260, "VPC Endpoint S3", "networking", "vpce", sublabel="interface"),
        Service("vpce-kms", 660, 260, "VPC Endpoint KMS", "networking", "vpce", sublabel="interface"),
        Service("lambda", 340, 410, "Lambda", "compute", "lambda", sublabel="post-process"),
        Service("dlq", 500, 410, "DLQ (SQS)", "integration", "sqs", sublabel="retry failure"),
        Service("iam-role", 660, 410, "IAM Role", "security", "iam", sublabel="least-priv"),
        Service("sftp-log", 340, 560, "SFTP Audit", "management", "cloudwatch", sublabel="TF access log"),
        Service("lambda-log", 500, 560, "Lambda Logs", "management", "cloudwatch", sublabel="/aws/lambda"),
        Service("param", 660, 560, "SSM Param", "management", "ssm", sublabel="bucket / keys"),
        # Storage
        Service("s3-landing", 900, 210, "S3 Landing", "storage", "s3", sublabel="raw uploads"),
        Service("s3-active", 1060, 210, "S3 Active", "storage", "s3", sublabel="post-processed"),
        Service("kms", 1230, 210, "KMS CMK", "security", "kms", sublabel="SSE-KMS"),
        Service("glacier", 900, 330, "S3 Glacier", "storage", "glacier", sublabel="lifecycle"),
        Service("s3-notify", 1060, 330, "S3 Event", "integration", "eventbridge", sublabel="ObjectCreated"),
        # Log streams
        Service("cw-alarm", 900, 490, "CW Alarm", "management", "cloudwatch", sublabel="thresholds"),
        Service("metric-filter", 1070, 490, "Metric Filter", "management", "cloudwatch", sublabel="log→metric"),
        Service("s3-log-archive", 1240, 490, "S3 Log Archive", "storage", "s3", sublabel="long-term"),
        # Ops
        Service("sns", 900, 670, "SNS Topic", "integration", "sns", sublabel="ops-alerts"),
        Service("email", 1060, 670, "Ops Email", "general", "user"),
        Service("cfn", 1240, 670, "CloudFormation", "management", "cloudformation"),
    ]
    arrows = [
        Arrow("partner", "tf", "SFTP"),
        Arrow("sftp-client", "tf", "SFTP test", kind="dashed"),
        Arrow("win", "tf", "SFTP test", kind="dashed"),
        Arrow("tf", "s3-landing", "store"),
        Arrow("tf", "sftp-log", kind="dashed"),
        Arrow("s3-landing", "kms", "encrypt", kind="dashed"),
        Arrow("s3-active", "kms", "encrypt", kind="dashed"),
        Arrow("s3-landing", "s3-notify"),
        Arrow("s3-notify", "lambda", "trigger"),
        Arrow("lambda", "s3-active", "post-process"),
        Arrow("lambda", "dlq", "fail→retry", kind="dashed"),
        Arrow("lambda", "vpce-s3", "private", kind="dashed"),
        Arrow("lambda", "vpce-kms", "private", kind="dashed"),
        Arrow("vpce-s3", "s3-landing", kind="dashed"),
        Arrow("vpce-kms", "kms", kind="dashed"),
        Arrow("lambda", "iam-role", "assume", kind="dashed"),
        Arrow("lambda", "param", "get", kind="dashed"),
        Arrow("lambda", "lambda-log", kind="dashed"),
        Arrow("s3-landing", "glacier", "lifecycle", kind="dashed"),
        Arrow("sftp-log", "metric-filter", kind="dashed"),
        Arrow("lambda-log", "metric-filter", kind="dashed"),
        Arrow("metric-filter", "cw-alarm"),
        Arrow("sftp-log", "s3-log-archive", "export", kind="dashed"),
        Arrow("lambda-log", "s3-log-archive", kind="dashed"),
        Arrow("cw-alarm", "sns", "alert"),
        Arrow("sns", "email"),
        Arrow("email", "ops", kind="dashed"),
        Arrow("cfn", "tf", "provision", kind="dashed"),
    ]
    notes = [
        Note(740, 45, "PJ4 — File integration via Transfer Family + Lambda", size=18, weight="700", color="#1E293B", anchor="middle"),
        Note(740, 812, "SFTP → Landing bucket (KMS) → S3 Event → Lambda → Active bucket · DLQ on retry failure · Private access via VPC Endpoints (S3 + KMS) · Logs → Metric Filter → Alarm → SNS",
             size=11, weight="500", color="#64748B", anchor="middle"),
    ]
    return compose(
        "PJ4 — File integration platform",
        "External partner SFTP uploads land KMS-encrypted in the S3 landing bucket; S3 Event triggers Lambda post-processing into the active bucket with DLQ safety net; all access via private VPC Endpoints (S3 + KMS); separate log streams for SFTP audit and Lambda, monitored via Metric Filter → Alarm → SNS.",
        groups,
        services,
        arrows,
        notes,
        viewbox="0 0 1480 840",
    )


# ---------------------------------------------------------------------------
# PJ5 — Sales management system (Java / Spring Boot, logical layered)
# ---------------------------------------------------------------------------


def build_pj5() -> str:
    groups = [
        Group("client", 30, 70, 230, 760, "Client tier", "logical"),
        Group("access", 280, 70, 180, 760, "Access tier", "logical"),
        Group("app", 480, 70, 320, 760, "Application tier (Spring Boot)", "logical"),
        Group("data", 820, 70, 280, 760, "Data tier (MySQL / Oracle)", "logical"),
        Group("devbuild", 1120, 70, 260, 380, "Dev & Build", "logical"),
        Group("testqa", 1120, 470, 260, 360, "Test / QA", "logical"),
        Group("opsfeedback", 1400, 70, 180, 760, "Ops feedback loop", "logical"),
    ]
    services = [
        # Client tier (4 actors)
        Service("users", 50, 160, "Internal Users", "general", "users", sublabel="sales team"),
        Service("admin", 50, 290, "Admin", "general", "user", sublabel="super-user"),
        Service("browser", 50, 420, "Browser", "general", "window", sublabel="JSP page"),
        Service("opsteam", 50, 720, "Ops team", "general", "user", sublabel="incident resp."),
        # Access tier
        Service("lb", 300, 170, "Load Balancer", "networking", "alb", sublabel="internal"),
        Service("auth", 300, 310, "Auth", "security", "iam", sublabel="LDAP / AD"),
        # App tier — two sub-columns
        Service("controller", 500, 170, "Controller", "compute", "spring", sublabel="Spring MVC"),
        Service("service", 500, 290, "Service Layer", "compute", "spring", sublabel="business logic"),
        Service("dao", 500, 410, "DAO / Repository", "compute", "spring", sublabel="SQL dispatch"),
        Service("batch", 500, 530, "Batch Job", "compute", "spring", sublabel="scheduled"),
        Service("applog", 500, 650, "App Log", "management", "cloudwatch", sublabel="file + rotate"),
        Service("jvm", 650, 170, "JVM", "compute", "ec2", sublabel="Java 11"),
        Service("war", 650, 290, "Sales WAR", "compute", "server", sublabel="deploy unit"),
        Service("config", 650, 410, "Config", "management", "ssm", sublabel="properties"),
        Service("schema", 650, 530, "Schema DDL", "storage", "s3", sublabel="under Git"),
        Service("api", 650, 650, "Internal API", "compute", "spring", sublabel="JSON / REST"),
        # Data tier — two sub-cols
        Service("db-primary", 840, 170, "Primary DB", "database", "db", sublabel="MySQL / Oracle"),
        Service("db-replica", 840, 290, "Read Replica", "database", "db", sublabel="reporting"),
        Service("db-readonly", 840, 410, "Read-only", "database", "db", sublabel="read traffic"),
        Service("db-backup", 990, 170, "DB Backup", "database", "db", sublabel="nightly dump"),
        Service("db-test", 990, 290, "DB Test", "database", "db", sublabel="test fixture"),
        Service("db-archive", 990, 410, "Archive", "storage", "glacier", sublabel="long-term"),
        # Dev & Build
        Service("ide", 1140, 170, "Eclipse / IntelliJ", "devtools", "code", sublabel="local dev"),
        Service("git", 1140, 290, "Git repo", "devtools", "github", sublabel="source control"),
        Service("ci", 1260, 170, "CI server", "devtools", "code", sublabel="build pipeline"),
        Service("artifact", 1260, 290, "Artifact Repo", "storage", "s3", sublabel="WAR archive"),
        Service("release", 1140, 410, "Release", "devtools", "code", sublabel="staging → prod"),
        # Test / QA
        Service("junit", 1140, 560, "JUnit", "devtools", "code", sublabel="unit test"),
        Service("integration", 1140, 680, "Integration", "devtools", "code", sublabel="IT env"),
        Service("testdata", 1260, 560, "Test Data", "storage", "s3", sublabel="fixtures"),
        Service("coverage", 1260, 680, "Coverage", "devtools", "code", sublabel="JaCoCo"),
        # Ops feedback loop
        Service("bugs", 1420, 170, "Bug Tracker", "devtools", "code", sublabel="Redmine / Jira"),
        Service("maint", 1420, 310, "Bug fix", "management", "ssm", sublabel="log diagnosis"),
        Service("hotfix", 1420, 450, "Hotfix patch", "devtools", "code", sublabel="urgent"),
    ]
    arrows = [
        Arrow("users", "browser"),
        Arrow("admin", "browser", kind="dashed"),
        Arrow("browser", "lb", "HTTP"),
        Arrow("lb", "auth", kind="dashed"),
        Arrow("lb", "controller", "HTTP"),
        Arrow("controller", "service"),
        Arrow("service", "dao"),
        Arrow("service", "batch", "schedule", kind="dashed"),
        Arrow("dao", "db-primary", "JDBC"),
        Arrow("dao", "db-readonly", "read", kind="dashed"),
        Arrow("batch", "db-primary", "JDBC"),
        Arrow("db-primary", "db-replica", "replica", kind="dashed"),
        Arrow("db-primary", "db-backup", "dump", kind="dashed"),
        Arrow("db-backup", "db-archive", "lifecycle", kind="dashed"),
        Arrow("service", "applog", kind="dashed"),
        Arrow("war", "jvm", "deploy", kind="dashed"),
        Arrow("config", "service", kind="dashed"),
        Arrow("api", "service", kind="dashed"),
        Arrow("schema", "db-primary", "DDL", kind="dashed"),
        Arrow("ide", "git", "push"),
        Arrow("git", "ci", "trigger"),
        Arrow("ci", "junit", "run", kind="dashed"),
        Arrow("ci", "coverage", kind="dashed"),
        Arrow("ci", "artifact", "publish"),
        Arrow("artifact", "war", "deploy", kind="dashed"),
        Arrow("junit", "integration", kind="dashed"),
        Arrow("integration", "db-test", "fixture", kind="dashed"),
        Arrow("testdata", "integration", kind="dashed"),
        Arrow("ci", "release"),
        Arrow("release", "war", kind="dashed"),
        Arrow("bugs", "maint", "assign"),
        Arrow("maint", "applog", "inspect", kind="dashed"),
        Arrow("maint", "hotfix", kind="dashed"),
        Arrow("hotfix", "git", "commit", kind="dashed"),
        Arrow("opsteam", "bugs", "report", kind="dashed"),
    ]
    notes = [
        Note(790, 45, "PJ5 — Sales management system (Java / Spring Boot)", size=18, weight="700", color="#1E293B", anchor="middle"),
        Note(790, 862, "Users/Admin → LB → Auth → Controller → Service → DAO → MySQL/Oracle (primary / replica / read-only / backup / test / archive) · CI (JUnit + Coverage) → Artifact → Release · Ops → Bug Tracker → Fix → Hotfix loop",
             size=11, weight="500", color="#64748B", anchor="middle"),
    ]
    return compose(
        "PJ5 — Sales management system",
        "Layered Java/Spring Boot internal business app with full dev/test/release pipeline: Users/Admin → LB → Auth → Spring (Controller/Service/DAO/Batch) → RDBMS, with CI (JUnit + Coverage + Artifact) → Release and a bug-fix → hotfix feedback loop.",
        groups,
        services,
        arrows,
        notes,
        viewbox="0 0 1620 910",
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    builders = {
        "pj1.svg": build_pj1,
        "pj2.svg": build_pj2,
        "pj3.svg": build_pj3,
        "pj4.svg": build_pj4,
        "pj5.svg": build_pj5,
    }
    for name, build in builders.items():
        path = OUT_DIR / name
        path.write_text(build(), encoding="utf-8")
        print(f"wrote {path.relative_to(OUT_DIR.parent.parent.parent)}  ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
