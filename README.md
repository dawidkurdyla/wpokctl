# wpokctl — WPOK Command Line Interface

A small, practical CLI for submitting and watching tasks on the **WPOK** platform — a serverless scientific‑computing layer built on **Kubernetes worker pools** (RabbitMQ for dispatch, Redis for state, KEDA for autoscaling). The CLI is a thin wrapper over **@wpok/client-lib** and focuses on DX: *create tasks (single/batch), optionally wait, or watch later*.

> Design: the **client** only writes a task message to Redis and publishes its `taskId` to an existing AMQP queue; **workers** actually pull inputs (e.g., from S3/MinIO), run your code, and push results.

---

## Requirements

* Node.js **18+**
* Reachable **Redis** and **RabbitMQ**
* Optional: **S3/MinIO** credentials if your manifests use `spec.io` and you plan batches (the worker also needs them at runtime)

---

## Install

```bash
# Clone & install
git clone https://github.com/dawidkurdyla/wpokctl
cd wpokctl
npm i

# Link locally so `wpokctl` is on PATH
npm link
# (or run directly without linking)
node bin/wpokctl.js --help
```

> For local development against an unpublished client‑lib, set `WPOK_CLIENT_LIB` to a resolvable module path (see **Dev**).

---

## Configuration

Connection endpoints are provided via **environment variables**:

* `REDIS_URL`  — e.g. `redis://127.0.0.1:6379`
* `RABBIT_URL` — e.g. `amqp://user:pass@127.0.0.1:5672`

S3/MinIO (used when planning batches from object storage, and by workers):

* `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`/`AWS_DEFAULT_REGION`
* `WPOK_S3_ENDPOINT` (e.g. `http://127.0.0.1:9000` for MinIO)
* `WPOK_S3_FORCE_PATH_STYLE=1` (required for MinIO)

---

## Commands

```
wpokctl <command> [options]
```

### `tasks create` (alias: `c`)

Create **one task** or a **batch** from a manifest file.

```
wpokctl tasks create -f <manifest.yaml> [--batch] [--wait]
                     [--timeout <sec>] [--fail-fast]
```

**Options**

* `-f, --file <path>` (required) — YAML/JSON manifest
* `--batch` — submit a batch (auto‑planned from `spec.io` by the client‑lib)
* `--wait` — block until completion (single → `waitForTask`, batch → `waitForMany`)
* `--timeout <sec>` — stop waiting after N seconds (0 = no timeout)
* `--fail-fast` — with `--wait` on batch: resolve early with state `FAILED` on first non‑zero exit code

**Behavior**

* Manifest is loaded and validated against the schema (`assertValidManifest`).
* A `TaskClient` is created from `REDIS_URL` and `RABBIT_URL`.
* **Single**: one task message is stored at `<taskId>_msg`, the `taskId` is published to AMQP (`spec.taskType`), and added to `work:<workId>:tasks`.
* **Batch**: tasks are auto‑planned from `spec.io` and published; result is `{ workId, tasks: string[] }`.
* With `--wait`, the command waits and sets process exit codes (see **Exit codes**).

**Examples**

```bash
# Single task, then wait for completion (use env for endpoints)
REDIS_URL=redis://127.0.0.1:6379 \
RABBIT_URL=amqp://user:pass@127.0.0.1:5672 \
wpokctl tasks create -f task.yaml --wait --timeout 600

# Batch: auto‑plan from S3 inputs declared in the manifest
wpokctl tasks create -f task.yaml --batch

# Batch + fail‑fast waiting
wpokctl tasks create -f task.yaml --batch --wait --fail-fast --timeout 1800
```

---

### `tasks watch`

Wait for a **single task** to finish and print its exit code.

```
wpokctl tasks watch <taskId> [--timeout <sec>]
```

**Behavior**

* Resolves immediately if the exit code is already present in Redis; otherwise waits until completion or timeout.
* Uses the work ID inferred from the `taskId` to wire up the client.

**Example**

```bash
wpokctl tasks watch wf:demo-work:task:1711111111111-ab12cd34 --timeout 120
```

---

### `work watch`

Observe all tasks that belong to a **work** (snapshot semantics: tasks present when the command starts).

```
wpokctl work watch <workId> [--timeout <sec>] [--idle <sec>] [--json]
```

**Options**

* `--timeout <sec>` — stop after this overall time
* `--idle <sec>` — stop if no new completions for this long
* `--json` — stream JSON events (`{"type":"task:done",...}` and `{"type":"progress",...}`)

**Behavior**

* Prints human‑readable progress by default (`done: <taskId> (code=<n>)`, `progress: x/y`).
* When `--json` is set, emits one JSON object per line with `type: 'task:done' | 'progress'`.
* Exits with status summarizing failures/timeouts (see **Exit codes**).

**Example**

```bash
wpokctl work watch demo-work --timeout 1800 --idle 300 --json
```

---

## Manifests (summary)

A minimal task manifest resembles:

```yaml
apiVersion: v1
kind: Task
metadata:
  name: my-task
  workId: demo-work
spec:
  taskType: test.imgproc.s
  executable: python3
  args: ["/usr/local/bin/dumb_compute.py","--in_dir","__INPUT_DIR__","--out_dir","__OUTPUT_DIR__"]
  work_dir: /work_dir
  input_dir: /work_dir
  output_dir: /work_dir
  io:
    inputs:
      - type: s3
        url: s3://datasets/demo/
        recursive: true
        include: ["**/*.jpg","**/*.png"]
    output:
      type: s3
      url: s3://results/demo/
      overwrite: false
      layout: "{stem}.jpg"
```

> The CLI delegates planning/submission to **@wpok/client-lib**. Data transfer happens on the **worker**.

---

## Exit codes

* **0** — success
* **2** — at least one task finished with a **non‑zero** exit code (single or batch fail‑fast)
* **124** — timeout (`tasks watch`, `tasks create --wait --timeout`, `work watch --timeout/--idle`)

---

## Development

The CLI loads the client library via CommonJS **require** under the module name `@wpok/client-lib`. For local testing against a checkout (without publishing to npm), point the loader to a path:

```bash
# In your shell (example path)
export WPOK_CLIENT_LIB="/absolute/path/to/wpok-client-lib/index.js"

# Then run the CLI from this repo
node bin/wpokctl.js tasks create -f examples/task.yaml
```

Project scripts:

```bash
npm run lint     # if configured
npm run format   # if configured
```

---

## License

See `package.json`.
