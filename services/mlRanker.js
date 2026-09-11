const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const AI_DIR = path.join(__dirname, "..", "ai");
const MODEL_PATH = path.join(AI_DIR, "models", "match_ranker.joblib");
const PREDICT_SCRIPT = path.join(AI_DIR, "predict.py");

function modelExists() {
  return fs.existsSync(MODEL_PATH);
}

function predictMatchQuality(featureRows, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (!modelExists()) {
      const err = new Error("ML model not trained yet. Run: python3 ai/train_ranker.py");
      err.code = "MODEL_MISSING";
      return reject(err);
    }

    const python = process.env.PYTHON_BIN || "python3";
    const child = spawn(python, [PREDICT_SCRIPT, "--model", MODEL_PATH], {
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("ML prediction timed out"));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        return reject(new Error(stderr || `predict.py exited with ${code}`));
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (err) {
        reject(new Error(`Invalid ML output: ${err.message}`));
      }
    });

    child.stdin.write(JSON.stringify({ instances: featureRows }));
    child.stdin.end();
  });
}

module.exports = { modelExists, predictMatchQuality, MODEL_PATH, AI_DIR };
