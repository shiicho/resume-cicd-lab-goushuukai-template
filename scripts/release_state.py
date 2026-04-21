#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import pathlib
import subprocess
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]
DELIVERY_PATH = ROOT / "deploy" / "shared" / "delivery.json"
STATIC_DIR = ROOT / "deploy" / "static"
ECS_DIR = ROOT / "deploy" / "ecs"
ENVIRONMENTS = ("development", "staging", "production")


def read_json(path: pathlib.Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def read_json_at_git_ref(path: pathlib.Path, git_ref: str) -> dict:
    relative_path = path.relative_to(ROOT).as_posix()
    result = subprocess.run(
        ["git", "show", f"{git_ref}:{relative_path}"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=True,
    )
    return json.loads(result.stdout)


def write_json(path: pathlib.Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def env_path(kind: str, env_name: str) -> pathlib.Path:
    if env_name not in ENVIRONMENTS:
        raise ValueError(f"Unknown environment: {env_name}")
    base = STATIC_DIR if kind == "static" else ECS_DIR
    return base / env_name


def static_site_path(env_name: str) -> pathlib.Path:
    return env_path("static", env_name) / "site.json"


def ecs_task_path(env_name: str) -> pathlib.Path:
    return env_path("ecs", env_name) / "task-definition.json"


def ecs_service_path(env_name: str) -> pathlib.Path:
    return env_path("ecs", env_name) / "service.json"


def read_delivery() -> dict:
    return read_json(DELIVERY_PATH)


def read_static_site(env_name: str, git_ref: str | None = None) -> dict:
    path = static_site_path(env_name)
    return read_json_at_git_ref(path, git_ref) if git_ref else read_json(path)


def read_ecs_task(env_name: str, git_ref: str | None = None) -> dict:
    path = ecs_task_path(env_name)
    return read_json_at_git_ref(path, git_ref) if git_ref else read_json(path)


def read_ecs_service(env_name: str, git_ref: str | None = None) -> dict:
    path = ecs_service_path(env_name)
    return read_json_at_git_ref(path, git_ref) if git_ref else read_json(path)


def get_container(task_definition: dict) -> dict:
    containers = task_definition.get("containerDefinitions", [])
    require(bool(containers), "task-definition.json must contain at least one container definition")
    return containers[0]


def get_env_var(container: dict, name: str) -> dict:
    for entry in container.get("environment", []):
        if entry.get("name") == name:
            return entry
    raise ValueError(f"Missing environment variable {name}")


def load_release_snapshot(env_name: str, git_ref: str | None = None) -> dict:
    site = read_static_site(env_name, git_ref)
    task = read_ecs_task(env_name, git_ref)
    container = get_container(task)
    delivery = read_delivery()
    return {
        "environment": env_name,
        "version": site["release"]["version"],
        "gitSha": site["release"]["gitSha"],
        "artifactBucket": site.get("artifactBucket", delivery["artifactBucket"]),
        "artifactKey": site["artifactKey"],
        "image": container["image"],
        "appVersion": get_env_var(container, "APP_VERSION")["value"],
        "appCommitSha": get_env_var(container, "APP_COMMIT_SHA")["value"],
    }


def update_release(env_name: str, version: str, git_sha: str, image_repo: str, image_digest: str, artifact_bucket: str, artifact_key: str) -> None:
    site_path = static_site_path(env_name)
    task_path = ecs_task_path(env_name)

    site = read_json(site_path)
    site["artifactBucket"] = artifact_bucket
    site["artifactKey"] = artifact_key
    site.setdefault("release", {})
    site["release"]["version"] = version
    site["release"]["gitSha"] = git_sha
    write_json(site_path, site)

    task = read_json(task_path)
    container = get_container(task)
    container["image"] = f"{image_repo}@{image_digest}"
    get_env_var(container, "APP_VERSION")["value"] = version
    get_env_var(container, "APP_COMMIT_SHA")["value"] = git_sha
    write_json(task_path, task)


def apply_release_snapshot(snapshot: dict, target_env: str) -> None:
    target_site_path = static_site_path(target_env)
    target_site = read_json(target_site_path)
    target_site["artifactBucket"] = snapshot["artifactBucket"]
    target_site["artifactKey"] = snapshot["artifactKey"]
    target_site["release"] = {
        "version": snapshot["version"],
        "gitSha": snapshot["gitSha"],
    }
    write_json(target_site_path, target_site)

    target_task_path = ecs_task_path(target_env)
    target_task = read_json(target_task_path)
    target_container = get_container(target_task)
    target_container["image"] = snapshot["image"]
    get_env_var(target_container, "APP_VERSION")["value"] = snapshot["appVersion"]
    get_env_var(target_container, "APP_COMMIT_SHA")["value"] = snapshot["appCommitSha"]
    write_json(target_task_path, target_task)


def promote_release(source_env: str, target_env: str) -> None:
    apply_release_snapshot(load_release_snapshot(source_env), target_env)


def resolve_field(data: dict, field: str):
    value = data
    for part in field.split("."):
        if isinstance(value, list):
            value = value[int(part)]
        else:
            value = value[part]
    return value


def show_field(kind: str, env_name: str | None, field: str) -> str:
    if kind == "delivery":
        data = read_delivery()
    elif kind == "static":
        require(bool(env_name), "--env is required for kind=static")
        data = read_static_site(env_name)
    elif kind == "ecs-task":
        require(bool(env_name), "--env is required for kind=ecs-task")
        data = read_ecs_task(env_name)
    elif kind == "ecs-service":
        require(bool(env_name), "--env is required for kind=ecs-service")
        data = read_ecs_service(env_name)
    else:
        raise ValueError(f"Unknown kind: {kind}")
    value = resolve_field(data, field)
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    return str(value)


BOOTSTRAP_ACCOUNT_ID = "123456789012"  # bootstrap-state marker (AWS docs' fake account)


def is_bootstrap_state(site: dict) -> bool:
    """True if this env's manifest still holds bootstrap-template values.

    An env is at bootstrap state until `setup_repo.py apply --scope <env>` has
    run for it — before that, staging/production deploy/*.json keep the
    placeholder account ID and an empty CloudFront distribution. Validating
    cross-env references would falsely fail (staging's artifactBucket still
    points at 123456789012 while shared/delivery.json has the real account).
    """
    return (
        BOOTSTRAP_ACCOUNT_ID in site.get("artifactBucket", "")
        or not site.get("cloudFrontDistributionId")
    )


def validate() -> None:
    delivery = read_delivery()
    require(delivery.get("artifactBucket"), "deploy/shared/delivery.json missing artifactBucket")
    require(delivery.get("ecrRepositoryName"), "deploy/shared/delivery.json missing ecrRepositoryName")
    require(delivery.get("ecrRepositoryUri"), "deploy/shared/delivery.json missing ecrRepositoryUri")
    require(delivery.get("cloudFormationStack"), "deploy/shared/delivery.json missing cloudFormationStack")

    for env_name in ENVIRONMENTS:
        site = read_static_site(env_name)
        require(site["environment"] == env_name, f"static/{env_name}/site.json environment mismatch")
        if is_bootstrap_state(site):
            # env is not yet scoped (setup_repo.py apply hasn't run for it).
            # Skip cross-env consistency checks; keep only the structural shape.
            continue
        require("artifactBucket" in site and site["artifactBucket"], f"static/{env_name}/site.json missing artifactBucket")
        require(site["artifactBucket"] == delivery["artifactBucket"], f"static/{env_name}/site.json artifactBucket must match shared delivery.json")
        require("artifactKey" in site and site["artifactKey"], f"static/{env_name}/site.json missing artifactKey")
        require("siteBucket" in site and site["siteBucket"], f"static/{env_name}/site.json missing siteBucket")
        require("release" in site, f"static/{env_name}/site.json missing release block")
        require(site["release"].get("version"), f"static/{env_name}/site.json missing release.version")
        require(site["release"].get("gitSha"), f"static/{env_name}/site.json missing release.gitSha")
        require(site.get("cloudFormationStack"), f"static/{env_name}/site.json missing cloudFormationStack")

        service = read_ecs_service(env_name)
        require(service["environment"] == env_name, f"ecs/{env_name}/service.json environment mismatch")
        require(service.get("cluster"), f"ecs/{env_name}/service.json missing cluster")
        require(service.get("service"), f"ecs/{env_name}/service.json missing service")
        require(service.get("cloudFormationStack"), f"ecs/{env_name}/service.json missing cloudFormationStack")

        task = read_ecs_task(env_name)
        require(task.get("family"), f"ecs/{env_name}/task-definition.json missing family")
        container = get_container(task)
        require(container.get("image"), f"ecs/{env_name}/task-definition.json missing image")
        require("@sha256:" in container["image"], f"ecs/{env_name}/task-definition.json image must be digest pinned")
        require(get_env_var(container, "APP_ENV")["value"] == env_name, f"ecs/{env_name}/task-definition.json APP_ENV mismatch")
        require(get_env_var(container, "APP_VERSION")["value"], f"ecs/{env_name}/task-definition.json missing APP_VERSION")
        require(get_env_var(container, "APP_COMMIT_SHA")["value"], f"ecs/{env_name}/task-definition.json missing APP_COMMIT_SHA")


def main() -> int:
    parser = argparse.ArgumentParser(description="Manage dual-target release state for S3 and ECS")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("validate")

    update_parser = subparsers.add_parser("update")
    update_parser.add_argument("--env", required=True)
    update_parser.add_argument("--version", required=True)
    update_parser.add_argument("--git-sha", required=True)
    update_parser.add_argument("--image-repo", required=True)
    update_parser.add_argument("--image-digest", required=True)
    update_parser.add_argument("--artifact-bucket", required=True)
    update_parser.add_argument("--artifact-key", required=True)

    promote_parser = subparsers.add_parser("promote")
    promote_parser.add_argument("--source-env", required=True)
    promote_parser.add_argument("--target-env", required=True)

    show_parser = subparsers.add_parser("show")
    show_parser.add_argument("--kind", required=True, choices=("delivery", "static", "ecs-task", "ecs-service"))
    show_parser.add_argument("--env")
    show_parser.add_argument("--field", required=True)

    args = parser.parse_args()

    try:
        if args.command == "validate":
            validate()
        elif args.command == "update":
            update_release(
                env_name=args.env,
                version=args.version,
                git_sha=args.git_sha,
                image_repo=args.image_repo,
                image_digest=args.image_digest,
                artifact_bucket=args.artifact_bucket,
                artifact_key=args.artifact_key,
            )
        elif args.command == "promote":
            promote_release(args.source_env, args.target_env)
        else:
            sys.stdout.write(show_field(args.kind, args.env, args.field))
    except (ValueError, KeyError, IndexError, json.JSONDecodeError, subprocess.CalledProcessError) as exc:
        sys.stderr.write(f"{exc}\n")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
