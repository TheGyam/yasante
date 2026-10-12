#!/usr/bin/env node
// Hands one task file to Codex or Gemini on this machine.
//
//   node scripts/agent-task.mjs tasks/012-diary-repeat-badge.md
//
// The agent works in its own git worktree beside this checkout (../yasante-agents/),
// so your checkout is untouched and Codex and Gemini can run at the same time.
// When it finishes, its branch is pushed and a draft PR is opened for Claude to review.
// Codex and Gemini use whatever login their CLI already has (ChatGPT / Google account).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const AGENTS = {
  codex: prompt => ['codex', ['exec', '--full-auto', prompt]],
  gemini: prompt => ['gemini', ['--yolo', '-p', prompt]],
};

function fail(message) {
  console.error(`agent-task: ${message}`);
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  // Windows finds codex.cmd / gemini.cmd only through the shell, which then needs the quoting.
  const windows = process.platform === 'win32';
  const argv = windows
    ? args.map(a => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a))
    : args;
  const result = spawnSync(cmd, argv, { stdio: 'inherit', shell: windows, ...opts });
  return result.status === 0;
}

function out(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  return result.status === 0 ? result.stdout.trim() : null;
}

const task = process.argv[2];
if (!task) fail('usage: node scripts/agent-task.mjs tasks/<id>-<slug>.md');

const root = out('git', ['rev-parse', '--show-toplevel']);
if (!root) fail('run this inside the repo');
const taskPath = path.join(root, task);
if (!existsSync(taskPath)) fail(`no such task file: ${task}`);

const text = readFileSync(taskPath, 'utf8');
const field = name => (text.match(new RegExp(`^${name}:\\s*([^\\s#]+)`, 'm')) || [])[1];
const agent = field('assignee');
const branch = field('branch');
const id = field('id');
const title = (text.match(/^# (.+)$/m) || [])[1] || task;

if (!AGENTS[agent]) fail(`${task} is assigned to "${agent}", not codex or gemini`);
if (field('status') !== 'ready') fail(`${task} is not status: ready`);
if (!branch || !branch.startsWith(`agent/${agent}/`))
  fail(`branch must start with agent/${agent}/`);

// The task file must already be on master, so the agent's branch starts from it.
if (!run('git', ['fetch', 'origin', 'master'], { cwd: root })) fail('git fetch failed');
if (out('git', ['cat-file', '-e', `origin/master:${task}`], { cwd: root }) === null) {
  fail(`${task} is not on origin/master yet; commit and push it first`);
}

const worktree = path.join(path.dirname(root), 'yasante-agents', branch.replace(/\//g, '-'));
if (existsSync(worktree))
  fail(`${worktree} already exists; remove it with "git worktree remove" first`);
if (!run('git', ['worktree', 'add', '-b', branch, worktree, 'origin/master'], { cwd: root })) {
  fail('could not create the worktree (does the branch already exist?)');
}

console.log(`\n${agent} is working on ${task} in ${worktree}\n`);
const prompt = `You are an implementer on this repo. Follow AGENTS.md exactly. Your task is ${task}.`;
const [cmd, args] = AGENTS[agent](prompt);
if (!run(cmd, args, { cwd: worktree }))
  console.error(`\n${agent} exited with an error; committing whatever it left.`);

run('git', ['add', '-A'], { cwd: worktree });
if (out('git', ['diff', '--cached', '--quiet'], { cwd: worktree }) === null) {
  run('git', ['commit', '-m', `chore(agent): ${agent} works on ${task}`], { cwd: worktree });
}
if (out('git', ['rev-list', '--count', 'origin/master..HEAD'], { cwd: worktree }) === '0') {
  fail(`${agent} changed nothing`);
}
if (!run('git', ['push', '-u', 'origin', branch], { cwd: worktree })) fail('push failed');

const body = `Implements \`${task}\`, done by **${agent}**. Waiting on Claude's review against the task's acceptance criteria.`;
if (
  !run(
    'gh',
    [
      'pr',
      'create',
      '--draft',
      '--base',
      'master',
      '--head',
      branch,
      '--title',
      `[${id}] ${title}`,
      '--body',
      body,
    ],
    { cwd: worktree }
  )
) {
  console.log(`\nPushed ${branch}. Open a draft PR for it on GitHub (gh isn't set up here).`);
}
