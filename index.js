const { Toolkit } = require("actions-toolkit");
const path = require("path");
const fs = require("fs");
const exec = require("child_process").exec;
const YAML = require("yaml");

Toolkit.run(async (tools) => {
  // Ensure that we have our required inputs defined
  const entrypoint = tools.inputs.main;
  if (!entrypoint) {
    tools.exit.failure("Missing input: main");
  }

  // And that the entrypoint exists
  const entrypointPath = path.join(tools.workspace, entrypoint);
  if (!fs.existsSync(entrypoint)) {
    tools.exit.failure(`Main '${entrypoint}' does not exist`);
  }

  tools.log.info(`Main ${entrypoint} detected`);

  // Run npm ci
  await new Promise((resolve, reject) => {
    exec(
      "npm ci --production",
      { cwd: tools.workspace, maxBuffer: 200 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(true);
        }
      }
    );
  });

  tools.log.complete("NPM install run");

  const { code } = await require("@zeit/ncc")(
    path.join(tools.workspace, entrypoint),
    {
      debugLog: true,
    }
  );

  tools.log.complete("Code compiled");

  const actionDef = YAML.parse(tools.getFile("action.yml"));
  actionDef.runs.using = "node12";
  actionDef.runs.main = "index.dist.js";
  delete actionDef.runs.image;

  tools.log.complete("Action YAML rewritten");

  const tree = await tools.github.git.createTree({
    ...tools.context.repo,
    tree: [
      {
        path: "action.yml",
        mode: "100644",
        type: "blob",
        content: YAML.stringify(actionDef),
        base_tree: tools.context.sha,
      },
      {
        path: "index.dist.js",
        mode: "100644",
        type: "blob",
        content: code,
        base_tree: tools.context.sha,
      },
    ],
  });

  tools.log.complete("Tree created");

  const commit = await tools.github.git.createCommit({
    ...tools.context.repo,
    message: "Automatic compilation",
    tree: tree.data.sha,
    parents: [tools.context.sha],
  });

  tools.log.complete("Commit created");

  const ref = await tools.github.git.updateRef({
    ...tools.context.repo,
    ref: `tags/${tools.context.payload.release.tag_name}`,
    force: true,
    sha: commit.data.sha,
  });

  tools.log.complete("Tag updated");

  tools.exit.success("All done");
});
