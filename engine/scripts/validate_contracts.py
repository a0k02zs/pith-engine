"""Check that the engine contracts are valid and agree with each other.

Run: python engine/scripts/validate_contracts.py
Optional: pass workflow definition files to validate them against the engine schema.
"""
import glob
import json
import os
import sys

import yaml
from jsonschema import Draft202012Validator

ROOT = os.path.join(os.path.dirname(__file__), "..")
errors = []


def load(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return json.load(f)


# 1. Every JSON schema is a valid draft 2020-12 schema.
schemas = {}
for path in sorted(glob.glob(os.path.join(ROOT, "contracts/schemas/*.json"))):
    name = os.path.basename(path)
    with open(path, encoding="utf-8") as f:
        schema = json.load(f)
    try:
        Draft202012Validator.check_schema(schema)
        schemas[name] = schema
    except Exception as e:  # noqa: BLE001
        errors.append(f"{name}: invalid schema: {e}")

# 2. The OpenAPI file parses and every $ref to ./schemas exists.
with open(os.path.join(ROOT, "contracts/openapi.yaml"), encoding="utf-8") as f:
    openapi = yaml.safe_load(f)
for ref in set(__import__("re").findall(r"\./schemas/([\w-]+\.json)", open(os.path.join(ROOT, "contracts/openapi.yaml")).read())):
    if ref not in schemas:
        errors.append(f"openapi.yaml: $ref to missing schema {ref}")

# 3. Enums and the workflow schema agree.
enums = load("contracts/enums.json")
wf = schemas.get("workflow-definition.json", {})
step = wf.get("properties", {}).get("steps", {}).get("items", {}).get("properties", {})
if step:
    if sorted(step["type"]["enum"]) != sorted(enums["step_types"]):
        errors.append("workflow-definition.json step types differ from enums.step_types")
    if sorted(step["tool"]["properties"]["risk"]["enum"]) != sorted(enums["tool_risks"]):
        errors.append("workflow-definition.json tool risks differ from enums.tool_risks")
if set(enums["tool_risks"]) != set(enums["tool_risk_meaning"]):
    errors.append("enums.tool_risks and enums.tool_risk_meaning list different risks")
for unit in set(v for k, v in enums["kpis"].items() if not k.startswith("$")):
    if unit not in {"money", "count", "ratio", "number"}:
        errors.append(f"enums.kpis: unknown unit {unit}")

# 4. Compliance rules: unique ids per market, known severities, eligible bases are known codes.
rules = load("specs/compliance-rules.json")
bases = set(enums["consent_bases"])


def check_rules(where, items):
    for r in items:
        if r.get("severity") not in {"info", "warn", "block"}:
            errors.append(f"{where}: rule {r.get('id')} has severity {r.get('severity')}")
        if not r.get("id") or not r.get("message"):
            errors.append(f"{where}: rule without id or message")


check_rules("global", rules["global"])
gids = [r["id"] for r in rules["global"]]
if len(gids) != len(set(gids)):
    errors.append("global rules have duplicate ids")
for mk, m in rules["markets"].items():
    check_rules(mk, m.get("rules", []))
    ids = [r["id"] for r in m.get("rules", [])]
    if len(ids) != len(set(ids)):
        errors.append(f"{mk}: duplicate rule ids")
    for sd, s in m.get("subdivisions", {}).items():
        check_rules(sd, s.get("rules", []))
    if "inherits" in m and m["inherits"] not in rules["markets"]:
        errors.append(f"{mk}: inherits unknown entry {m['inherits']}")
    for ch, v in m.get("eligible_bases", {}).items():
        lists = v.values() if isinstance(v, dict) else [v]
        for lst in lists:
            for b in lst:
                if b not in bases:
                    errors.append(f"{mk}.eligible_bases.{ch}: unknown basis {b}")

# 5. Every market in the launch groups resolves to rules (direct entry or group default).
for group, codes in enums["market_groups"].items():
    for c in codes:
        if c not in rules["markets"] and not (group == "EU" and "EU_DEFAULT" in rules["markets"]):
            errors.append(f"market {c} ({group}) has no rules entry")

# 6. Optional: validate workflow definition files passed on the command line.
validator = Draft202012Validator(wf) if wf else None
for path in sys.argv[1:]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    docs = data if isinstance(data, list) else data.get("workflows", [data])
    for d in docs:
        for e in validator.iter_errors(d):
            errors.append(f"{path} {d.get('id')}: {e.message}")

if errors:
    print("\n".join(errors))
    sys.exit(1)
print(f"ok: {len(schemas)} schemas, {len(openapi['paths'])} API paths, "
      f"{sum(len(m.get('rules', [])) for m in rules['markets'].values()) + len(rules['global'])} rules, "
      f"{len([k for k in enums['kpis'] if not k.startswith('$')])} KPI codes")
